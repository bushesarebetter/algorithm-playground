import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const files = ['index.html', 'styles.css', 'app.mjs', 'visuals.mjs', 'playground/index.html',
  'playground/playground.css', 'playground/playground.mjs', 'playground/random.mjs',
  'playground/maze.mjs', 'playground/boids.mjs', 'playground/connect4.mjs', 'playground/connect4-worker.mjs'];
const builder = await readFile(new URL('../scripts/build.mjs', import.meta.url));
const server = await readFile(new URL('../scripts/serve.py', import.meta.url));

async function fixture() {
  const base = await mkdtemp(path.join(tmpdir(), 'playground-packaging-')), root = path.join(base, 'site');
  const put = async (name, value = 'fixture') => { const target = path.join(root, name); await mkdir(path.dirname(target), { recursive: true }); await writeFile(target, value); };
  for (const file of files) await put(file);
  await put('scripts/build.mjs', builder); await put('scripts/serve.py', server);
  await put('assets/public.png'); await put('assets/fourier.json', '{}'); await put('assets/fonts/OFL.txt');
  await put('assets/plates/cover.png'); await put('assets/plates/cover.png.json', '{"prompt":"private fixture"}');
  await put('assets/provenance.json', '{"preparation":"fixture"}'); await put('assets/private/no.png');
  await put('assets/reports/no.png'); await put('assets/.hidden.png'); await put('.git/config', 'private fixture');
  await put('tests/private.test.mjs'); await put('reports/report.html');
  await writeFile(path.join(base, 'outside.txt'), 'outside fixture');
  return { base, root, put };
}

const runBuild = root => spawnSync(process.execPath, ['scripts/build.mjs'], { cwd: root, encoding: 'utf8', timeout: 10000 });
const missing = async file => { await assert.rejects(access(file), { code: 'ENOENT' }); };

test('build copies only runtime files, media, data and font license', async () => {
  const { base, root } = await fixture();
  try {
    const result = runBuild(root); assert.equal(result.status, 0, result.stderr);
    for (const file of [...files, 'assets/public.png', 'assets/fourier.json', 'assets/fonts/OFL.txt', 'assets/plates/cover.png', '.nojekyll']) await access(path.join(root, 'dist', file));
    for (const file of ['.git/config', 'scripts/build.mjs', 'tests/private.test.mjs', 'reports/report.html',
      'assets/private/no.png', 'assets/reports/no.png', 'assets/.hidden.png', 'assets/provenance.json', 'assets/plates/cover.png.json']) await missing(path.join(root, 'dist', file));
  } finally { await rm(base, { recursive: true, force: true }); }
});

test('an incomplete source tree preserves the previous build', async () => {
  const { base, root, put } = await fixture();
  try {
    await put('dist/previous.txt', 'keep me'); await rm(path.join(root, 'app.mjs'));
    const result = runBuild(root); assert.equal(result.status, 1); assert.match(result.stderr, /app\.mjs/);
    assert.equal(await readFile(path.join(root, 'dist/previous.txt'), 'utf8'), 'keep me');
  } finally { await rm(base, { recursive: true, force: true }); }
});

test('build refuses a dist file instead of deleting an unexpected target', async () => {
  const { base, root, put } = await fixture();
  try {
    await put('dist', 'unexpected file');
    const result = runBuild(root); assert.equal(result.status, 1); assert.match(result.stderr, /real dist directory/);
    assert.equal(await readFile(path.join(root, 'dist'), 'utf8'), 'unexpected file');
  } finally { await rm(base, { recursive: true, force: true }); }
});

test('local preview uses JavaScript MIME and denies private paths, metadata and traversal', async () => {
  const { base, root } = await fixture();
  const child = spawn(process.env.PYTHON || 'python', ['scripts/serve.py', '--port', '0'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  const closed = new Promise(resolve => child.once('close', resolve));
  let timer;
  try {
    const port = await new Promise((resolve, reject) => {
      let output = '';
      timer = setTimeout(() => reject(new Error('Preview server did not start within 10 seconds.')), 10000);
      child.once('error', reject);
      child.stdout.on('data', data => { output += data; const match = output.match(/127\.0\.0\.1:(\d+)\//); if (match) resolve(Number(match[1])); });
    });
    const baseUrl = `http://127.0.0.1:${port}`;
    const module = await fetch(`${baseUrl}/playground/maze.mjs`);
    assert.equal(module.status, 200); assert.match(module.headers.get('content-type'), /^text\/javascript/);
    assert.equal((await fetch(`${baseUrl}/playground/`)).status, 200);
    assert.equal((await fetch(`${baseUrl}/assets/fourier.json`)).status, 200);
    for (const route of ['/.git/config', '/scripts/serve.py', '/assets/provenance.json', '/assets/plates/cover.png.json',
      '/assets/private/no.png', '/assets/', '/..%2Foutside.txt']) assert.equal((await fetch(baseUrl + route)).status, 404, route);
  } finally {
    clearTimeout(timer); child.kill(); await closed; await rm(base, { recursive: true, force: true });
  }
});
