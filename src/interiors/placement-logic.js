import { FURNITURE, ROOM, footprint } from '../rules.js';

export const GRID_STEP = 0.25;
export const CHARACTER_RADIUS = 0.34;
export const normalizeTurn = value => ((Math.trunc(Number(value) || 0) % 4) + 4) % 4;
const finite = value => Number.isFinite(value);
export function snap(value, increment = GRID_STEP) {
  if (!finite(value) || !finite(increment) || increment <= 0) {
    throw new TypeError('snap requires finite coordinates and a positive increment');
  }
  return Math.round(value / increment) * increment;
}
export function snapPosition(point, increment = GRID_STEP) {
  return { x: snap(point.x, increment), z: snap(point.z, increment) };
}
export function moveCandidate(placement, point, increment = GRID_STEP) {
  return { ...placement, ...snapPosition(point, increment), r: normalizeTurn(placement.r) };
}
export function rotateCandidate(placement, direction = 1) {
  return { ...placement, r: normalizeTurn(placement.r + direction) };
}
export function isWalkable(x, z, placements = [], radius = CHARACTER_RADIUS, room = ROOM) {
  if (!finite(x) || !finite(z) || !finite(radius) || radius < 0) return false;
  if (x < -room.width / 2 + radius || x > room.width / 2 - radius ||
      z < -room.depth / 2 + radius || z > room.depth / 2 - radius) return false;
  for (const p of placements) {
    const item = FURNITURE[p.type];
    if (!item || item.floor || item.tabletop) continue;
    const d = footprint(p);
    if (!d) continue;
    // Rounded avatar against axis-aligned rotated footprints.
    const nearX = Math.max(p.x - d.w / 2, Math.min(x, p.x + d.w / 2));
    const nearZ = Math.max(p.z - d.d / 2, Math.min(z, p.z + d.d / 2));
    if ((x - nearX) ** 2 + (z - nearZ) ** 2 < radius ** 2) return false;
  }
  return true;
}
/**
 * Small-room A* routing. Routes around furniture, never through it.
 * The clicked goal is approximated by the closest reachable grid cell if blocked.
 * Pure function: suitable for browser use and Node's built-in test runner.
 */
export function findWalkPath(start, goal, placements = [], {
  room = ROOM, radius = CHARACTER_RADIUS, step = 0.4
} = {}) {
  if (!start || !goal || !finite(start.x) || !finite(start.z) ||
      !finite(goal.x) || !finite(goal.z) || !finite(step) || step <= 0) return [];
  const minX = -room.width / 2 + radius;
  const minZ = -room.depth / 2 + radius;
  const cols = Math.floor((room.width - 2 * radius) / step) + 1;
  const rows = Math.floor((room.depth - 2 * radius) / step) + 1;
  const total = cols * rows;
  if (total <= 0 || total > 10000) return [];
  const coords = index => ({ x: minX + (index % cols) * step,
    z: minZ + Math.floor(index / cols) * step });
  const valid = Array.from({ length: total }, (_, index) => {
    const { x, z } = coords(index);
    return isWalkable(x, z, placements, radius, room);
  });
  const closestIndex = point => {
    let best = -1, distance = Infinity;
    for (let i = 0; i < total; i++) {
      if (!valid[i]) continue;
      const p = coords(i), d = (p.x - point.x) ** 2 + (p.z - point.z) ** 2;
      if (d < distance) { best = i; distance = d; }
    }
    return best;
  };
  const source = closestIndex(start), target = closestIndex(goal);
  if (source < 0 || target < 0) return [];
  if (source === target) return [coords(target)];
  const cameFrom = new Int32Array(total).fill(-1);
  const g = new Float64Array(total).fill(Infinity);
  const f = new Float64Array(total).fill(Infinity);
  const open = new Set([source]), closed = new Set();
  const heuristic = (a, b) => {
    const p = coords(a), q = coords(b);
    return Math.hypot(p.x - q.x, p.z - q.z);
  };
  g[source] = 0;
  f[source] = heuristic(source, target);
  const directions = [[0, 1], [1, 0], [0, -1], [-1, 0],
    [1, 1], [-1, 1], [1, -1], [-1, -1]];
  while (open.size) {
    let current = -1, score = Infinity;
    for (const i of open) if (f[i] < score) { current = i; score = f[i]; }
    if (current === target) {
      const result = [];
      let node = target;
      while (node !== source && node !== -1) {
        result.push(coords(node));
        node = cameFrom[node];
      }
      result.reverse();
      return result;
    }
    open.delete(current);
    closed.add(current);
    const cx = current % cols, cz = Math.floor(current / cols);
    for (const [dx, dz] of directions) {
      const nx = cx + dx, nz = cz + dz;
      if (nx < 0 || nx >= cols || nz < 0 || nz >= rows) continue;
      const next = nz * cols + nx;
      if (!valid[next] || closed.has(next)) continue;
      if (dx && dz && (!valid[cz * cols + nx] || !valid[nz * cols + cx])) continue;
      const trial = g[current] + (dx && dz ? Math.SQRT2 : 1) * step;
      if (trial >= g[next]) continue;
      cameFrom[next] = current;
      g[next] = trial;
      f[next] = trial + heuristic(next, target);
      open.add(next);
    }
  }
  return [];
}
