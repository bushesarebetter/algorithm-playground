import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { lstat, mkdir, readdir, realpath, rm, copyFile, writeFile } from 'node:fs/promises';

const root = await realpath(fileURLToPath(new URL('../', import.meta.url)));
const destination = path.join(root, 'dist');
const runtime = [
  'index.html', 'styles.css', 'app.mjs', 'visuals.mjs',
  'playground/index.html', 'playground/playground.css', 'playground/playground.mjs',
  'playground/random.mjs', 'playground/maze.mjs', 'playground/boids.mjs',
  'playground/connect4.mjs', 'playground/connect4-worker.mjs',
];
const assetExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg', '.ttf', '.otf', '.woff', '.woff2']);
const excluded = new Set(['node_modules', 'mocks', 'reports', 'private', 'tests', 'scripts']);

async function checkedFile(relative) {
  const source = path.join(root, relative), resolved = await realpath(source);
  const inside = path.relative(root, resolved);
  if (inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside)) throw new Error(`Source escapes site directory: ${relative}`);
  for (let current = source; current !== root; current = path.dirname(current)) {
    if ((await lstat(current)).isSymbolicLink()) throw new Error(`Symbolic links are not packaged: ${relative}`);
  }
  if (!(await lstat(source)).isFile()) throw new Error(`Expected a regular file: ${relative}`);
}

async function collectAssets(relative = 'assets') {
  for (const entry of await readdir(path.join(root, relative), { withFileTypes: true })) {
    if (entry.name.startsWith('.') || excluded.has(entry.name.toLowerCase())) continue;
    const name = `${relative}/${entry.name}`;
    if (entry.isSymbolicLink()) throw new Error(`Symbolic links are not packaged: ${name}`);
    if (entry.isDirectory()) { await collectAssets(name); continue; }
    const allowed = assetExtensions.has(path.extname(entry.name).toLowerCase()) || name === 'assets/fourier.json' || name === 'assets/fonts/OFL.txt';
    if (entry.isFile() && allowed) runtime.push(name);
  }
}

try {
  await collectAssets();
  for (const relative of runtime) await checkedFile(relative);
  // Preflight precedes deletion: an incomplete source tree cannot erase a prior build.
  if (path.relative(root, destination) !== 'dist') throw new Error('Unsafe build destination.');
  const existing = await lstat(destination).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink())) throw new Error('Build destination must be a real dist directory.');
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  for (const relative of runtime) {
    const target = path.join(destination, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(root, relative), target);
  }
  await writeFile(path.join(destination, '.nojekyll'), '');
  console.log(`Built ${runtime.length} runtime files into dist/. Tests, source tools, Git metadata and image-generation records are excluded.`);
} catch (error) {
  console.error(`Build failed: ${error.message}`);
  process.exitCode = 1;
}
