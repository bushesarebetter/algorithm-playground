import { createRng } from './random.mjs';

export const FIXED_DT = 0.04;
export const wrapDelta = (value, size) => ((value + size / 2) % size + size) % size - size / 2;

function limit(vx, vy, minimum, maximum) {
  const speed = Math.hypot(vx, vy), target = Math.max(minimum, Math.min(maximum, speed));
  return speed > 1e-9 ? [vx / speed * target, vy / speed * target] : [target, 0];
}

export function createFlock({ count = 120, size = 60, seed = 0, predator = false } = {}) {
  if (!Number.isInteger(count) || count < 1 || count > 300) throw new RangeError('Boid count must be from 1 to 300.');
  if (!Number.isFinite(size) || size <= 0) throw new RangeError('World size must be positive.');
  const random = createRng(seed), positions = [], velocities = [];
  for (let i = 0; i < count; i++) {
    positions.push([random() * size, random() * size]);
    const angle = random() * 2 * Math.PI, speed = 0.3 + random() * 0.7;
    velocities.push([Math.cos(angle) * speed, Math.sin(angle) * speed]);
  }
  return { positions, velocities, size, predator: predator ? [random() * size, random() * size] : null, predatorVelocity: [0, 0], time: 0 };
}

export function stepFlock(state, { separation = 0.08, alignment = 0.05, cohesion = 0.005, predator = state.predator !== null } = {}) {
  if (![separation, alignment, cohesion].every(v => Number.isFinite(v) && v >= 0 && v <= 1)) throw new RangeError('Steering weights must be from 0 to 1.');
  const { positions, velocities, size } = state;
  let hunter = predator ? [...(state.predator || [size / 2, size / 2])] : null;
  let hunterVelocity = [...state.predatorVelocity];
  if (hunter) {
    let target, distance = Infinity;
    for (const p of positions) {
      const d = [wrapDelta(p[0] - hunter[0], size), wrapDelta(p[1] - hunter[1], size)];
      const norm = Math.hypot(...d);
      if (norm < distance) { distance = norm; target = d; }
    }
    const desired = target.map(v => v / Math.max(distance, 1e-9) * 0.9);
    hunterVelocity = limit(hunterVelocity[0] + 0.1 * (desired[0] - hunterVelocity[0]), hunterVelocity[1] + 0.1 * (desired[1] - hunterVelocity[1]), 0, 0.9);
    hunter = hunter.map((v, k) => (v + hunterVelocity[k] + size) % size);
  }
  const nextPositions = [], nextVelocities = [];
  for (let i = 0; i < positions.length; i++) {
    let neighbors = 0, vx = 0, vy = 0, dx = 0, dy = 0, sx = 0, sy = 0;
    for (let j = 0; j < positions.length; j++) {
      if (i === j) continue;
      const x = wrapDelta(positions[j][0] - positions[i][0], size), y = wrapDelta(positions[j][1] - positions[i][1], size), d2 = x * x + y * y;
      if (d2 < 25) { neighbors++; vx += velocities[j][0]; vy += velocities[j][1]; dx += x; dy += y; }
      if (d2 < 4) { sx -= x / Math.max(d2, 1e-9); sy -= y / Math.max(d2, 1e-9); }
    }
    let ax = separation * sx, ay = separation * sy;
    if (neighbors) { ax += alignment * (vx / neighbors - velocities[i][0]) + cohesion * dx / neighbors; ay += alignment * (vy / neighbors - velocities[i][1]) + cohesion * dy / neighbors; }
    if (hunter) {
      const x = wrapDelta(positions[i][0] - hunter[0], size), y = wrapDelta(positions[i][1] - hunter[1], size), d2 = x * x + y * y;
      if (d2 < 100) { ax += 1.5 * x / Math.max(d2, 1e-18); ay += 1.5 * y / Math.max(d2, 1e-18); }
    }
    const velocity = limit(velocities[i][0] + ax, velocities[i][1] + ay, 0.3, 1);
    nextVelocities.push(velocity);
    nextPositions.push(positions[i].map((v, k) => (v + velocity[k] + size) % size));
  }
  return { ...state, positions: nextPositions, velocities: nextVelocities, predator: hunter, predatorVelocity: hunterVelocity, time: state.time + FIXED_DT };
}

export function orderParameter(state) {
  let x = 0, y = 0;
  for (const velocity of state.velocities) { const speed = Math.hypot(...velocity); if (speed) { x += velocity[0] / speed; y += velocity[1] / speed; } }
  return Math.min(1, Math.hypot(x, y) / state.velocities.length);
}
