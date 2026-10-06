import { createRng, shuffle } from './random.mjs';

function neighbors(cell, width, height) {
  const row = Math.floor(cell / width), col = cell % width;
  return [[row + 1, col], [row - 1, col], [row, col + 1], [row, col - 1]]
    .filter(([r, c]) => r >= 0 && r < height && c >= 0 && c < width)
    .map(([r, c]) => r * width + c);
}

export function generateMaze({ size = 25, algorithm = 'dfs', seed = 0, loops = 0 } = {}) {
  if (!Number.isInteger(size) || size < 1 || size > 80) throw new RangeError('Size must be an integer from 1 to 80.');
  if (!['dfs', 'kruskal'].includes(algorithm)) throw new RangeError('Unknown maze generator.');
  if (!Number.isFinite(loops) || loops < 0 || loops > 1) throw new RangeError('Loops must be between 0 and 1.');
  const random = createRng(seed), count = size * size;
  const adjacency = Array.from({ length: count }, () => []);
  const connect = (a, b) => { adjacency[a].push(b); adjacency[b].push(a); };
  const edges = [];
  for (let a = 0; a < count; a++) for (const b of neighbors(a, size, size)) if (b > a) edges.push([a, b]);
  if (algorithm === 'dfs') {
    const visited = new Set([0]), stack = [0];
    while (stack.length) {
      const a = stack.at(-1), options = neighbors(a, size, size).filter(b => !visited.has(b));
      if (!options.length) { stack.pop(); continue; }
      const b = options[Math.floor(random() * options.length)];
      connect(a, b); visited.add(b); stack.push(b);
    }
  } else {
    const parent = Array.from({ length: count }, (_, i) => i);
    const find = a => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    for (const [a, b] of shuffle([...edges], random)) {
      const ra = find(a), rb = find(b);
      if (ra !== rb) { parent[ra] = rb; connect(a, b); }
    }
  }
  const walls = shuffle(edges.filter(([a, b]) => !adjacency[a].includes(b)), random);
  for (const [a, b] of walls.slice(0, Math.floor(walls.length * loops))) connect(a, b);
  return { width: size, height: size, adjacency, start: 0, goal: count - 1 };
}

class Heap {
  items = [];
  before(a, b) { return a.f < b.f || (a.f === b.f && (a.g > b.g || (a.g === b.g && a.id < b.id))); }
  push(item) {
    let i = this.items.push(item) - 1;
    while (i) {
      const p = (i - 1) >> 1;
      if (!this.before(item, this.items[p])) break;
      this.items[i] = this.items[p]; i = p;
    }
    this.items[i] = item;
  }
  pop() {
    const first = this.items[0], last = this.items.pop();
    if (this.items.length) {
      let i = 0;
      while (2 * i + 1 < this.items.length) {
        let c = 2 * i + 1;
        if (c + 1 < this.items.length && this.before(this.items[c + 1], this.items[c])) c++;
        if (!this.before(this.items[c], last)) break;
        this.items[i] = this.items[c]; i = c;
      }
      this.items[i] = last;
    }
    return first;
  }
}

export function searchMaze(maze, algorithm = 'bfs', start = maze.start, goal = maze.goal) {
  if (!['bfs', 'dijkstra', 'astar'].includes(algorithm)) throw new RangeError('Unknown search algorithm.');
  const { width, adjacency } = maze, count = adjacency.length;
  if (![start, goal].every(v => Number.isInteger(v) && v >= 0 && v < count)) throw new RangeError('Start and goal must be valid cells.');
  const previous = Array(count).fill(-1), distances = Array(count).fill(Infinity), expanded = [];
  distances[start] = 0;
  const heuristic = a => algorithm === 'astar' ? Math.abs(a % width - goal % width) + Math.abs(Math.floor(a / width) - Math.floor(goal / width)) : 0;
  const queue = [start], heap = new Heap(), done = new Set();
  let cursor = 0, id = 0;
  heap.push({ cell: start, f: heuristic(start), g: 0, id: id++ });
  while (algorithm === 'bfs' ? cursor < queue.length : heap.items.length) {
    const cell = algorithm === 'bfs' ? queue[cursor++] : heap.pop().cell;
    if (done.has(cell)) continue;
    done.add(cell); expanded.push(cell);
    if (cell === goal) break;
    for (const next of adjacency[cell]) {
      const distance = distances[cell] + 1;
      if (distance >= distances[next]) continue;
      distances[next] = distance; previous[next] = cell;
      if (algorithm === 'bfs') queue.push(next);
      else heap.push({ cell: next, g: distance, f: distance + heuristic(next), id: id++ });
    }
  }
  if (!done.has(goal)) return { path: [], expanded };
  const path = [goal];
  while (path.at(-1) !== start) path.push(previous[path.at(-1)]);
  return { path: path.reverse(), expanded };
}

export function compareSearches(maze) {
  return Object.fromEntries(['bfs', 'dijkstra', 'astar'].map(name => [name, searchMaze(maze, name)]));
}
