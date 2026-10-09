import { createRng } from './random.mjs';

export const WIDTH = 7, HEIGHT = 6;
const ORDER = [3, 2, 4, 1, 5, 0, 6], WIN = 1000, INF = 1e9;
const FULL = Array.from({ length: WIDTH }, (_, col) => 63n << BigInt(col * 7)).reduce((a, b) => a | b, 0n);
const CENTER = 63n << 21n;

export function hasWon(bits) {
  for (const shift of [1n, 7n, 6n, 8n]) { const pair = bits & (bits >> shift); if (pair & (pair >> (2n * shift))) return true; }
  return false;
}

function threats(bits) {
  let result = (bits << 1n) & (bits << 2n) & (bits << 3n);
  for (const shift of [7n, 6n, 8n]) {
    const left = (bits << shift) & (bits << (2n * shift)), right = (bits >> shift) & (bits >> (2n * shift));
    result |= (left & (bits << (3n * shift))) | (left & (bits >> shift)) | (right & (bits << shift)) | (right & (bits >> (3n * shift)));
  }
  return result & FULL;
}

function clone(board) { return { bb: [...board.bb], heights: [...board.heights], moves: board.moves, lastMove: board.lastMove }; }
function push(board, column) { board.bb[board.moves & 1] |= 1n << BigInt(board.heights[column]++); board.moves++; }
function pop(board, column) { board.moves--; board.bb[board.moves & 1] ^= 1n << BigInt(--board.heights[column]); }
function lastWon(board) { return board.moves > 0 && hasWon(board.bb[(board.moves - 1) & 1]); }
export function legalMoves(board) { return ORDER.filter(column => board.heights[column] < column * 7 + HEIGHT); }

export function createBoard(moves = []) {
  const board = { bb: [0n, 0n], heights: Array.from({ length: WIDTH }, (_, c) => c * 7), moves: 0, lastMove: null };
  for (const column of moves) {
    if (!Number.isInteger(column) || column < 0 || column >= WIDTH || !legalMoves(board).includes(column) || lastWon(board)) throw new RangeError('Illegal move history.');
    push(board, column); board.lastMove = column;
  }
  return board;
}

export function playMove(board, column) {
  if (!Number.isInteger(column) || !legalMoves(board).includes(column) || lastWon(board)) throw new RangeError('That column cannot be played.');
  const next = clone(board); push(next, column); next.lastMove = column; return next;
}

export function getCell(board, row, column) {
  if (!Number.isInteger(row) || row < 0 || row >= HEIGHT || !Number.isInteger(column) || column < 0 || column >= WIDTH) throw new RangeError('Invalid board cell.');
  const bit = 1n << BigInt(column * 7 + row);
  return board.bb[0] & bit ? 0 : board.bb[1] & bit ? 1 : null;
}

export function gameStatus(board) {
  if (lastWon(board)) {
    const winner = (board.moves - 1) & 1, cells = new Map();
    for (let row = 0; row < HEIGHT; row++) for (let col = 0; col < WIDTH; col++) for (const [dr, dc] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      const line = Array.from({ length: 4 }, (_, i) => [row + dr * i, col + dc * i]);
      if (line.every(([r, c]) => r >= 0 && r < HEIGHT && c >= 0 && c < WIDTH && getCell(board, r, c) === winner)) for (const cell of line) cells.set(cell.join(','), cell);
    }
    return { state: 'won', winner, winningCells: [...cells.values()] };
  }
  return { state: board.moves === 42 ? 'draw' : 'playing', winner: null, winningCells: [] };
}

function countBits(bits) { let count = 0; while (bits) { bits &= bits - 1n; count++; } return count; }
function evaluate(board) {
  const me = board.bb[board.moves & 1], opponent = board.bb[(board.moves + 1) & 1], empty = FULL & ~(me | opponent);
  return 4 * (countBits(threats(me) & empty) - countBits(threats(opponent) & empty)) + countBits(me & CENTER) - countBits(opponent & CENTER);
}

class SearchTimeout extends Error {}

export function chooseMove(board, { algorithm = 'negamax', depth = 5, iterations = 1000, timeMs = 600, seed = 0 } = {}) {
  if (!['negamax', 'mcts'].includes(algorithm)) throw new RangeError('Unknown AI algorithm.');
  if (!Number.isInteger(depth) || depth < 1 || depth > 10 || !Number.isInteger(iterations) || iterations < 1 || iterations > 20000 || !Number.isFinite(timeMs) || timeMs < 1 || timeMs > 2000) throw new RangeError('Invalid AI search limits.');
  const started = performance.now(), deadline = started + timeMs;
  const result = { column: null, algorithm, depth: 0, nodes: 0, iterations: 0, elapsedMs: 0, timedOut: false };
  const finish = () => ({ ...result, elapsedMs: Math.round((performance.now() - started) * 100) / 100 });
  if (gameStatus(board).state !== 'playing') return finish();
  const b = clone(board), legal = legalMoves(b), player = b.moves & 1;
  result.column = legal[0];
  for (const column of legal) if (hasWon(b.bb[player] | (1n << BigInt(b.heights[column])))) { result.column = column; return finish(); }
  const danger = legal.filter(column => hasWon(b.bb[1 - player] | (1n << BigInt(b.heights[column]))));
  if (danger.length === 1) { result.column = danger[0]; return finish(); }
  const check = () => { if (performance.now() >= deadline) throw new SearchTimeout(); };
  if (algorithm === 'negamax') {
    const table = new Map();
    function search(position, remaining, alpha, beta) {
      result.nodes++;
      if (result.nodes % 32 === 0) check();
      if (position.moves === 42) return 0;
      if (!remaining) return evaluate(position);
      const key = position.bb.join(','), alpha0 = alpha, beta0 = beta, entry = table.get(key);
      if (entry && entry.depth >= remaining) {
        if (entry.flag === 'exact') return entry.score;
        if (entry.flag === 'lower') alpha = Math.max(alpha, entry.score); else beta = Math.min(beta, entry.score);
        if (alpha >= beta) return entry.score;
      }
      const moves = legalMoves(position);
      if (entry && moves.includes(entry.column)) { moves.splice(moves.indexOf(entry.column), 1); moves.unshift(entry.column); }
      let best = -INF, bestMove = moves[0];
      for (const column of moves) {
        push(position, column);
        let score;
        try { score = lastWon(position) ? WIN - position.moves : -search(position, remaining - 1, -beta, -alpha); }
        finally { pop(position, column); }
        if (score > best) { best = score; bestMove = column; }
        alpha = Math.max(alpha, score);
        if (alpha >= beta) break;
      }
      table.set(key, { depth: remaining, score: best, column: bestMove, flag: best <= alpha0 ? 'upper' : best >= beta0 ? 'lower' : 'exact' });
      return best;
    }
    try {
      for (let current = 1; current <= depth; current++) {
        check();
        const score = search(b, current, -INF, INF);
        result.column = table.get(b.bb.join(',')).column; result.depth = current;
        if (Math.abs(score) > WIN - 100) break;
      }
    } catch (error) { if (!(error instanceof SearchTimeout)) throw error; result.timedOut = true; }
  } else {
    const random = createRng(seed);
    const node = (move, parent, position) => ({ move, parent, player: (position.moves - 1) & 1, children: [], untried: lastWon(position) || position.moves === 42 ? [] : legalMoves(position), wins: 0, visits: 0 });
    const root = node(null, null, b);
    result.nodes = 1;
    for (let i = 0; i < iterations; i++) {
      if (performance.now() >= deadline) { result.timedOut = true; break; }
      let current = root, position = clone(board);
      while (!current.untried.length && current.children.length) {
        const log = Math.log(current.visits);
        current = current.children.reduce((best, child) => {
          const score = child.wins / child.visits + 1.4 * Math.sqrt(log / child.visits);
          return !best || score > best.score ? { child, score } : best;
        }, null).child;
        push(position, current.move);
      }
      if (current.untried.length) {
        const index = Math.floor(random() * current.untried.length), move = current.untried.splice(index, 1)[0];
        push(position, move);
        const child = node(move, current, position); current.children.push(child); current = child; result.nodes++;
      }
      let winner = lastWon(position) ? (position.moves - 1) & 1 : null;
      while (winner === null && position.moves < 42) {
        const moves = legalMoves(position); push(position, moves[Math.floor(random() * moves.length)]);
        if (lastWon(position)) winner = (position.moves - 1) & 1;
      }
      while (current) { current.visits++; current.wins += winner === null ? 0.5 : winner === current.player ? 1 : 0; current = current.parent; }
      result.iterations++;
    }
    if (root.children.length) result.column = root.children.reduce((a, b) => b.visits > a.visits ? b : a).move;
  }
  return finish();
}
