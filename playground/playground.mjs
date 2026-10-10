import { generateMaze, compareSearches } from './maze.mjs';
import { createFlock, stepFlock, orderParameter, FIXED_DT } from './boids.mjs';
import { createBoard, legalMoves, playMove, getCell, gameStatus } from './connect4.mjs';

const $ = id => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let activeTab = 'maze';
let maze, searches, mazeCursor = 0, mazePlaying = false;
let flock, flockPlaying = false, flockAccumulator = 0;
let board = createBoard(), gameMoves = [], human = 0, thinking = false, gameError = false, worker = null, requestId = 0;

function canvasContext(canvas) {
  const bounds = canvas.getBoundingClientRect(), ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, bounds.width), height = Math.max(1, bounds.height);
  const w = Math.round(width * ratio), h = Math.round(height * ratio);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  const context = canvas.getContext('2d');
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  return { context, width, height };
}

function drawMaze(name) {
  const canvas = $(`maze-${name}`), { context: ctx, width, height } = canvasContext(canvas);
  ctx.fillStyle = '#14171d'; ctx.fillRect(0, 0, width, height);
  const padding = width * 0.04, unit = (width - 2 * padding) / (maze.width * 2 + 1);
  const rect = (row, col, color) => { ctx.fillStyle = color; ctx.fillRect(padding + col * unit, padding + row * unit, unit + 0.25, unit + 0.25); };
  const cell = (index, color) => rect(2 * Math.floor(index / maze.width) + 1, 2 * (index % maze.width) + 1, color);
  const edge = (a, b, color) => rect(Math.floor(a / maze.width) + Math.floor(b / maze.width) + 1, a % maze.width + b % maze.width + 1, color);
  for (let a = 0; a < maze.adjacency.length; a++) {
    cell(a, '#323a45');
    for (const b of maze.adjacency[a]) if (b > a) edge(a, b, '#323a45');
  }
  const result = searches[name], visible = new Set(result.expanded.slice(0, Math.floor(mazeCursor)));
  for (const a of visible) { cell(a, '#3d9cda'); for (const b of maze.adjacency[a]) if (visible.has(b)) edge(a, b, '#3d9cda'); }
  if (mazeCursor >= result.expanded.length) {
    for (let i = 0; i < result.path.length; i++) { cell(result.path[i], '#efc879'); if (i) edge(result.path[i - 1], result.path[i], '#efc879'); }
  }
  cell(maze.start, '#f3f7fa'); cell(maze.goal, '#f3f7fa');
  $(`maze-${name}-stats`).textContent = `${result.expanded.length} explored · ${result.path.length ? `${result.path.length - 1} steps` : 'no route'}`;
  canvas.setAttribute('aria-label', `${name === 'astar' ? 'A-star' : name} search. ${result.expanded.length} cells explored; ${result.path.length ? result.path.length - 1 + ' steps in the shortest route' : 'no route exists'}.`);
}

function drawAllMazes() { if (maze && activeTab === 'maze') for (const name of ['bfs', 'dijkstra', 'astar']) drawMaze(name); }
function mazeMaximum() { return Math.max(...Object.values(searches).map(result => result.expanded.length)); }
function updateMazeButton() { $('maze-play').textContent = mazePlaying ? 'Pause searches' : mazeCursor >= mazeMaximum() ? 'Replay searches' : mazeCursor > 0 ? 'Resume searches' : 'Compare searches'; }
function regenerateMaze() {
  mazePlaying = false; mazeCursor = 0;
  maze = generateMaze({ algorithm: $('maze-generator').value, size: Number($('maze-size').value), seed: $('maze-seed').value, loops: Number($('maze-loops').value) / 100 });
  searches = compareSearches(maze); drawAllMazes(); updateMazeButton();
  $('maze-status').textContent = `${maze.width} by ${maze.height} maze ready. Press Compare searches to replay their explored cells.`;
}
$('maze-controls').addEventListener('submit', event => { event.preventDefault(); regenerateMaze(); });
$('maze-loops').addEventListener('input', () => { $('maze-loops-value').textContent = `${$('maze-loops').value}%`; });
$('maze-speed').addEventListener('input', () => { $('maze-speed-value').textContent = `${$('maze-speed').value} cells/s`; });
$('maze-play').addEventListener('click', () => {
  if (mazeCursor >= mazeMaximum()) mazeCursor = 0;
  mazePlaying = !mazePlaying; updateMazeButton();
  $('maze-status').textContent = mazePlaying ? 'Playing actual search order. Change playback speed at any time.' : 'Search playback paused.';
});
$('maze-reset').addEventListener('click', () => { mazePlaying = false; mazeCursor = 0; updateMazeButton(); drawAllMazes(); $('maze-status').textContent = 'Playback reset. The maze is unchanged.'; });

function flockParameters() { return { separation: Number($('boids-separation').value), alignment: Number($('boids-alignment').value), cohesion: Number($('boids-cohesion').value), predator: $('boids-predator').checked }; }
function drawFlock() {
  if (!flock || activeTab !== 'boids') return;
  const { context: ctx, width, height } = canvasContext($('boids-canvas'));
  ctx.fillStyle = '#121820'; ctx.fillRect(0, 0, width, height);
  const scale = width / flock.size;
  const bird = (position, velocity, color, length) => {
    ctx.save(); ctx.translate(position[0] * scale, position[1] * scale); ctx.rotate(Math.atan2(velocity[1], velocity[0]));
    ctx.beginPath(); ctx.moveTo(length, 0); ctx.lineTo(-length * 0.65, length * 0.5); ctx.lineTo(-length * 0.3, 0); ctx.lineTo(-length * 0.65, -length * 0.5); ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.restore();
  };
  for (let i = 0; i < flock.positions.length; i++) bird(flock.positions[i], flock.velocities[i], '#8bd0f4', Math.max(3.5, width * 0.0075));
  if (flock.predator) bird(flock.predator, flock.predatorVelocity, '#ff9e70', Math.max(7, width * 0.014));
  $('boids-order').textContent = orderParameter(flock).toFixed(2);
  $('boids-time').textContent = `${flock.time.toFixed(2)} s simulated`;
}
function updateFlockButtons() { $('boids-play').textContent = flockPlaying ? 'Pause flock' : 'Play flock'; $('boids-step').disabled = flockPlaying; }
function resetFlock() {
  flockPlaying = false; flockAccumulator = 0;
  flock = createFlock({ count: Number($('boids-count').value), seed: $('boids-seed').value, predator: $('boids-predator').checked });
  drawFlock(); updateFlockButtons();
  $('boids-status').textContent = reducedMotion.matches ? 'Reduced motion is enabled. The flock is paused; Play and Single step remain available.' : 'Flock reset and paused. Press Play or Single step.';
}
for (const name of ['separation', 'alignment', 'cohesion']) $(`boids-${name}`).addEventListener('input', () => { $(`boids-${name}-value`).textContent = Number($(`boids-${name}`).value).toFixed(3); });
$('boids-count').addEventListener('input', () => { $('boids-count-value').textContent = $('boids-count').value; });
$('boids-count').addEventListener('change', resetFlock);
$('boids-seed').addEventListener('change', resetFlock);
$('boids-predator').addEventListener('change', () => { flock = { ...flock, predator: $('boids-predator').checked ? [flock.size / 2, flock.size / 2] : null, predatorVelocity: [0, 0] }; drawFlock(); });
$('boids-play').addEventListener('click', () => { flockPlaying = !flockPlaying; flockAccumulator = 0; updateFlockButtons(); $('boids-status').textContent = flockPlaying ? 'Flock running. Steering weights update live.' : 'Flock paused.'; });
$('boids-step').addEventListener('click', () => { flock = stepFlock(flock, flockParameters()); drawFlock(); $('boids-status').textContent = `Advanced one fixed step to ${flock.time.toFixed(2)} simulated seconds.`; });
$('boids-reset').addEventListener('click', resetFlock);

function drawGame() {
  if (activeTab !== 'connect-four') return;
  const { context: ctx, width, height } = canvasContext($('connect4-canvas'));
  ctx.fillStyle = '#151d27'; ctx.fillRect(0, 0, width, height);
  const padding = 20, step = (width - padding * 2) / 7, offsetY = (height - step * 6) / 2;
  const status = gameStatus(board), winning = new Set(status.winningCells.map(cell => cell.join(',')));
  const colors = ['#83caef', '#fba472'];
  for (let row = 0; row < 6; row++) for (let col = 0; col < 7; col++) {
    const value = getCell(board, row, col), x = padding + step * (col + 0.5), y = offsetY + step * (5 - row + 0.5);
    ctx.beginPath(); ctx.arc(x, y, step * 0.37, 0, Math.PI * 2); ctx.fillStyle = value === null ? '#283444' : colors[value]; ctx.fill();
    if (winning.has([row, col].join(','))) { ctx.strokeStyle = '#fff1c2'; ctx.lineWidth = Math.max(2, step * 0.035); ctx.stroke(); }
  }
  const columns = [];
  for (let col = 0; col < 7; col++) { const rows = []; for (let row = 0; row < 6; row++) rows.push(getCell(board, row, col) === null ? 'empty' : getCell(board, row, col) === human ? 'your piece' : 'AI piece'); columns.push(`Column ${col + 1}, bottom to top: ${rows.join(', ')}.`); }
  $('board-description').textContent = columns.join(' ');
}
function refreshGame() {
  const status = gameStatus(board), available = legalMoves(board), yourTurn = (board.moves & 1) === human;
  for (const button of document.querySelectorAll('[data-column]')) button.disabled = thinking || gameError || !yourTurn || status.state !== 'playing' || !available.includes(Number(button.dataset.column));
  $('human-piece').style.background = human === 0 ? '#83caef' : '#fba472'; $('ai-piece').style.background = human === 0 ? '#fba472' : '#83caef';
  if (status.state === 'won') $('game-status').textContent = status.winner === human ? 'You win. Four in a row.' : 'The AI wins. Try another game.';
  else if (status.state === 'draw') $('game-status').textContent = 'A full board. This game is a draw.';
  else if (!gameError) $('game-status').textContent = thinking ? `${$('game-algorithm').value === 'mcts' ? 'MCTS' : 'Alpha-beta'} is thinking…` : yourTurn ? 'Your turn. Choose a column.' : 'AI turn. Return to this tab to continue.';
  $('game-retry').hidden = !gameError; drawGame();
}
function cancelSearch() { requestId++; if (worker) worker.terminate(); worker = null; thinking = false; }
function searchFailure(message) { cancelSearch(); gameError = true; $('game-status').textContent = `${message} Retry the move or start a new game.`; refreshGame(); }
function requestAiMove() {
  if (activeTab !== 'connect-four' || document.hidden || thinking || gameStatus(board).state !== 'playing' || (board.moves & 1) === human) return;
  cancelSearch(); gameError = false; thinking = true;
  const thisRequest = requestId;
  const settings = { easy: { depth: 3, iterations: 350, timeMs: 200 }, balanced: { depth: 5, iterations: 1400, timeMs: 500 }, hard: { depth: 8, iterations: 4000, timeMs: 1000 } }[$('game-difficulty').value];
  try {
    worker = new Worker(new URL('./connect4-worker.mjs', import.meta.url), { type: 'module' });
    worker.onmessage = event => {
      if (thisRequest !== requestId || event.data.requestId !== thisRequest) return;
      if (event.data.type === 'error') { searchFailure('The AI could not finish its search.'); return; }
      const result = event.data.result;
      if (!result || !legalMoves(board).includes(result.column)) { searchFailure('The AI returned an invalid move.'); return; }
      cancelSearch(); board = playMove(board, result.column); gameMoves.push(result.column);
      const detail = result.iterations ? `${result.iterations} rollouts · ${result.nodes} tree nodes` : result.depth ? `Depth ${result.depth} · ${result.nodes} search nodes` : result.timedOut ? 'Time limit reached' : 'Immediate win or block';
      $('game-search').textContent = `${detail} · ${result.elapsedMs.toFixed(1)} ms${result.timedOut ? ' · time limit reached' : ''}.`;
      refreshGame();
    };
    worker.onerror = event => { event.preventDefault(); if (thisRequest === requestId) searchFailure('The background search is unavailable.'); };
    worker.postMessage({ type: 'search', requestId: thisRequest, moves: [...gameMoves], options: { ...settings, algorithm: $('game-algorithm').value, seed: gameMoves.join(',') } });
    refreshGame();
  } catch { searchFailure('This browser could not start the background search.'); }
}
function humanMove(column) {
  if (activeTab !== 'connect-four' || thinking || gameError || (board.moves & 1) !== human || gameStatus(board).state !== 'playing') return;
  if (!legalMoves(board).includes(column)) { $('game-status').textContent = `Column ${column + 1} is full. Choose another column.`; return; }
  board = playMove(board, column); gameMoves.push(column); refreshGame(); requestAiMove();
}
function restartGame() { cancelSearch(); board = createBoard(); gameMoves = []; gameError = false; human = $('game-first').value === 'human' ? 0 : 1; $('game-search').textContent = 'Search runs in a background worker.'; refreshGame(); requestAiMove(); }
for (const button of document.querySelectorAll('[data-column]')) button.addEventListener('click', () => humanMove(Number(button.dataset.column)));
$('connect4-canvas').addEventListener('click', event => { const bounds = event.currentTarget.getBoundingClientRect(); const column = Math.floor((event.clientX - bounds.left - 20) / ((bounds.width - 40) / 7)); if (column >= 0 && column < 7) humanMove(column); });
$('game-restart').addEventListener('click', restartGame);
$('game-first').addEventListener('change', restartGame);
$('game-retry').addEventListener('click', () => { gameError = false; requestAiMove(); });
document.addEventListener('keydown', event => { if (activeTab !== 'connect-four' || event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input,select,textarea,[contenteditable=true]')) return; if (/^[1-7]$/.test(event.key)) { event.preventDefault(); humanMove(Number(event.key) - 1); } });

function pauseAnimations() {
  if (mazePlaying) $('maze-status').textContent = 'Search playback paused. Press Resume searches to continue.';
  if (flockPlaying) $('boids-status').textContent = 'Flock paused. Press Play to resume.';
  mazePlaying = false; flockPlaying = false; flockAccumulator = 0; updateMazeButton(); updateFlockButtons();
}
function selectTab(name, focus = false) {
  if (!['maze', 'boids', 'connect-four'].includes(name)) return;
  pauseAnimations(); if (activeTab === 'connect-four' && name !== activeTab) cancelSearch();
  activeTab = name;
  for (const button of document.querySelectorAll('[data-tab]')) { const selected = button.dataset.tab === name; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; $(`panel-${button.dataset.tab}`).hidden = !selected; if (selected && focus) button.focus(); }
  history.replaceState(null, '', `#${name}`);
  drawAllMazes(); drawFlock(); refreshGame(); if (name === 'connect-four' && !gameError) requestAiMove();
}
const tabs = [...document.querySelectorAll('[data-tab]')];
for (const button of tabs) {
  button.addEventListener('click', () => selectTab(button.dataset.tab));
  button.addEventListener('keydown', event => { let index = tabs.indexOf(button); if (event.key === 'ArrowRight') index = (index + 1) % tabs.length; else if (event.key === 'ArrowLeft') index = (index + tabs.length - 1) % tabs.length; else if (event.key === 'Home') index = 0; else if (event.key === 'End') index = tabs.length - 1; else return; event.preventDefault(); selectTab(tabs[index].dataset.tab, true); });
}
document.addEventListener('visibilitychange', () => { if (document.hidden) { pauseAnimations(); if (thinking) { cancelSearch(); refreshGame(); } if (activeTab === 'boids') $('boids-status').textContent = 'Paused while this page is hidden. Press Play to resume.'; } else if (activeTab === 'connect-four' && !gameError) requestAiMove(); });
reducedMotion.addEventListener('change', event => { if (event.matches) { pauseAnimations(); $('boids-status').textContent = 'Reduced motion is enabled. The flock is paused; Play and Single step remain available.'; } });
window.addEventListener('resize', () => { drawAllMazes(); drawFlock(); drawGame(); });

let previous = performance.now();
function frame(now) {
  const elapsed = Math.min((now - previous) / 1000, 0.1); previous = now;
  if (!document.hidden && activeTab === 'maze' && mazePlaying) {
    mazeCursor = Math.min(mazeMaximum(), mazeCursor + Number($('maze-speed').value) * elapsed); drawAllMazes();
    if (mazeCursor >= mazeMaximum()) { mazePlaying = false; updateMazeButton(); $('maze-status').textContent = 'Searches complete. Explored-cell counts and shortest routes are shown above.'; }
  }
  if (!document.hidden && activeTab === 'boids' && flockPlaying) {
    flockAccumulator += elapsed; let steps = 0;
    while (flockAccumulator >= FIXED_DT && steps < 3) { flock = stepFlock(flock, flockParameters()); flockAccumulator -= FIXED_DT; steps++; }
    if (steps) drawFlock();
  }
  requestAnimationFrame(frame);
}
regenerateMaze(); resetFlock(); restartGame(); selectTab(location.hash.slice(1) || 'maze'); requestAnimationFrame(frame);
