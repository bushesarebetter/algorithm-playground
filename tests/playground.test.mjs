import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { createRng } from '../playground/random.mjs';
import { generateMaze, searchMaze, compareSearches } from '../playground/maze.mjs';
import { createFlock, stepFlock, orderParameter, wrapDelta, FIXED_DT } from '../playground/boids.mjs';
import { createBoard, playMove, getCell, legalMoves, hasWon, gameStatus, chooseMove } from '../playground/connect4.mjs';
import { handleSearch } from '../playground/connect4-worker.mjs';

test('seeded random numbers replay and stay in range', () => {
  const a = createRng('lab'), b = createRng('lab'), c = createRng('another');
  const values = Array.from({ length: 100 }, () => a());
  assert.deepEqual(values, Array.from({ length: 100 }, () => b()));
  assert.notDeepEqual(values, Array.from({ length: 100 }, () => c()));
  assert.ok(values.every(v => v >= 0 && v < 1));
});

for (const algorithm of ['dfs', 'kruskal']) {
  test(`${algorithm} mazes are deterministic connected spanning trees`, () => {
    for (let seed = 0; seed < 5; seed++) {
      const maze = generateMaze({ algorithm, size: 18, seed });
      assert.deepEqual(maze, generateMaze({ algorithm, size: 18, seed }));
      assert.equal(maze.adjacency.reduce((sum, list) => sum + list.length, 0) / 2, 18 * 18 - 1);
      assert.equal(searchMaze(maze, 'bfs', 0, 0).path.length, 1);
      const seen = new Set([0]), stack = [0];
      while (stack.length) for (const neighbor of maze.adjacency[stack.pop()]) if (!seen.has(neighbor)) { seen.add(neighbor); stack.push(neighbor); }
      assert.equal(seen.size, 18 * 18);
      for (let cell = 0; cell < maze.adjacency.length; cell++) for (const neighbor of maze.adjacency[cell]) {
        assert.ok(maze.adjacency[neighbor].includes(cell));
        assert.equal(Math.abs(cell % 18 - neighbor % 18) + Math.abs(Math.floor(cell / 18) - Math.floor(neighbor / 18)), 1);
      }
    }
  });
  test(`${algorithm} search algorithms agree on cyclic mazes`, () => {
    const maze = generateMaze({ algorithm, size: 22, seed: 17, loops: 0.25 });
    const results = compareSearches(maze);
    assert.equal(results.bfs.path.length, results.dijkstra.path.length);
    assert.equal(results.bfs.path.length, results.astar.path.length);
    for (const { path, expanded } of Object.values(results)) {
      assert.equal(path[0], maze.start); assert.equal(path.at(-1), maze.goal);
      assert.equal(new Set(expanded).size, expanded.length);
      for (let i = 1; i < path.length; i++) assert.ok(maze.adjacency[path[i - 1]].includes(path[i]));
    }
  });
}

test('maze search handles one cell, disconnected goals and invalid controls', () => {
  for (const algorithm of ['bfs', 'dijkstra', 'astar']) {
    assert.deepEqual(searchMaze(generateMaze({ size: 1 }), algorithm), { path: [0], expanded: [0] });
    assert.deepEqual(searchMaze({ width: 2, adjacency: [[], []], start: 0, goal: 1 }, algorithm), { path: [], expanded: [0] });
  }
  assert.throws(() => generateMaze({ size: 0 }), RangeError);
  assert.throws(() => generateMaze({ algorithm: 'unknown' }), RangeError);
  assert.throws(() => generateMaze({ loops: -1 }), RangeError);
  assert.throws(() => searchMaze(generateMaze(), 'unknown'), RangeError);
});

test('boids preserve state, seed replay and fixed simulation time', () => {
  const a = createFlock({ count: 20, seed: 12, predator: true }), before = structuredClone(a);
  assert.deepEqual(a, createFlock({ count: 20, seed: 12, predator: true }));
  const next = stepFlock(a);
  assert.deepEqual(a, before); assert.notDeepEqual(a.positions, next.positions);
  assert.equal(next.time, FIXED_DT); assert.deepEqual(next, stepFlock(a));
  assert.equal(wrapDelta(49, 50), -1); assert.equal(wrapDelta(-49, 50), 1);
});

test('boids remain finite, wrapped and speed-limited even at coincident positions', () => {
  let state = createFlock({ count: 24, seed: 2, predator: true });
  state.positions[1] = [...state.positions[0]];
  for (let step = 0; step < 100; step++) {
    state = stepFlock(state);
    assert.ok(state.positions.flat().every(v => Number.isFinite(v) && v >= 0 && v < state.size));
    assert.ok(state.velocities.every(v => Math.hypot(...v) >= 0.3 - 1e-12 && Math.hypot(...v) <= 1 + 1e-12));
    assert.ok(Number.isFinite(orderParameter(state)));
  }
  assert.equal(stepFlock(state, { predator: false }).predator, null);
  assert.ok(stepFlock(createFlock(), { predator: true }).predator);
  assert.throws(() => createFlock({ count: 301 }), RangeError);
  assert.throws(() => stepFlock(state, { alignment: NaN }), RangeError);
});

test('alignment alone increases flock order', () => {
  let state = createFlock({ count: 100, size: 35, seed: 0 });
  const initial = orderParameter(state);
  for (let i = 0; i < 300; i++) state = stepFlock(state, { separation: 0, cohesion: 0, alignment: 0.1 });
  assert.ok(orderParameter(state) > initial + 0.5);
});

test('Connect Four detects every win direction with high-bit positions', () => {
  for (const moves of [[0, 0, 1, 1, 2, 2, 3], [4, 5, 4, 5, 4, 5, 4], [0, 1, 1, 2, 2, 3, 2, 3, 3, 6, 3], [6, 5, 5, 4, 4, 3, 4, 3, 3, 0, 3]]) {
    const status = gameStatus(createBoard(moves));
    assert.equal(status.state, 'won'); assert.equal(status.winner, 0); assert.ok(status.winningCells.length >= 4);
  }
  assert.equal(getCell(createBoard([6]), 0, 6), 0);
  const bits = cells => cells.reduce((value, [col, row]) => value | (1n << BigInt(col * 7 + row)), 0n);
  assert.equal(hasWon(bits([[0, 3], [0, 4], [0, 5], [1, 0]])), false);
  assert.equal(hasWon(bits([[0, 3], [1, 4], [2, 5], [4, 0]])), false);
});

test('Connect Four validates moves without changing previous boards', () => {
  const board = createBoard(), next = playMove(board, 3);
  assert.equal(board.moves, 0); assert.deepEqual(board.bb, [0n, 0n]);
  assert.equal(next.moves, 1); assert.equal(getCell(next, 0, 3), 0);
  const fullColumn = createBoard([0, 0, 0, 0, 0, 0]);
  assert.ok(!legalMoves(fullColumn).includes(0));
  for (const col of [-1, 7, 0.5, 0]) assert.throws(() => playMove(fullColumn, col), RangeError);
  assert.throws(() => playMove(createBoard([0, 0, 1, 1, 2, 2, 3]), 4), RangeError);
  assert.throws(() => createBoard([0, 0, 1, 1, 2, 2, 3, 4]), RangeError);
});

for (const algorithm of ['negamax', 'mcts']) {
  test(`${algorithm} wins, blocks and leaves input unchanged`, () => {
    for (const moves of [[0, 0, 1, 1, 2, 6], [0, 6, 1, 6, 2]]) {
      const board = createBoard(moves), before = structuredClone(board);
      assert.equal(chooseMove(board, { algorithm, depth: 4, iterations: 250, timeMs: 100 }).column, 3);
      assert.deepEqual(board, before);
    }
    const board = createBoard([3, 2, 4, 3]), before = structuredClone(board);
    const result = chooseMove(board, { algorithm, depth: 4, iterations: 150, timeMs: 1000, seed: 2 });
    assert.ok(legalMoves(board).includes(result.column)); assert.deepEqual(board, before);
    assert.ok(result.nodes > 0); assert.ok(result.elapsedMs >= 0);
    if (algorithm === 'mcts') assert.equal(result.iterations, 150);
    assert.equal(chooseMove(createBoard([0, 0, 1, 1, 2, 2, 3]), { algorithm }).column, null);
  });
}

test('AI time budget returns a legal fallback and does not corrupt the board', () => {
  const board = createBoard(), before = structuredClone(board);
  const result = chooseMove(board, { depth: 10, timeMs: 1 });
  assert.ok(legalMoves(board).includes(result.column)); assert.ok(result.timedOut);
  assert.deepEqual(board, before);
  assert.throws(() => chooseMove(board, { timeMs: 10000 }), RangeError);
});

test('full drawn board is terminal', () => {
  const board = createBoard();
  for (let row = 0; row < 6; row++) for (let col = 0; col < 7; col++) board.bb[(Math.floor(col / 2) + row) % 2] |= 1n << BigInt(col * 7 + row);
  board.moves = 42; board.heights = board.heights.map(value => value + 6);
  assert.equal(gameStatus(board).state, 'draw'); assert.equal(chooseMove(board).column, null);
});

test('worker echoes request IDs for results and validation errors', () => {
  const answer = handleSearch({ type: 'search', requestId: 'game-7-turn-2', moves: [0, 0, 1, 1, 2, 6], options: { algorithm: 'negamax' } });
  assert.equal(answer.type, 'result'); assert.equal(answer.requestId, 'game-7-turn-2'); assert.equal(answer.result.column, 3);
  const error = handleSearch({ type: 'search', requestId: 99, moves: [8] });
  assert.equal(error.type, 'error'); assert.equal(error.requestId, 99); assert.match(error.error, /Illegal/);
});

test('AI worker handler completes a real background message round trip', async () => {
  const worker = new Worker(`
    const { parentPort, workerData } = require('node:worker_threads');
    import(workerData).then(({ handleSearch }) => {
      parentPort.on('message', message => parentPort.postMessage(handleSearch(message)));
      parentPort.postMessage({ type: 'ready' });
    });
  `, { eval: true, workerData: new URL('../playground/connect4-worker.mjs', import.meta.url).href });
  let timer;
  try {
    const result = await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Worker did not answer within 5 seconds.')), 5000);
      worker.on('error', reject);
      worker.on('message', answer => {
        if (answer.type === 'ready') worker.postMessage({ type: 'search', requestId: 'transport-42', moves: [3, 2], options: { depth: 3, timeMs: 100 } });
        else resolve(answer);
      });
    });
    assert.equal(result.type, 'result'); assert.equal(result.requestId, 'transport-42');
    assert.ok(legalMoves(createBoard([3, 2])).includes(result.result.column));
  } finally { clearTimeout(timer); await worker.terminate(); }
});
