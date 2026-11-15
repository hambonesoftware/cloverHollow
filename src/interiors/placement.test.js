import test from 'node:test';
import assert from 'node:assert/strict';
import { FURNITURE, ROOM, canPlace, footprint, STARTER_PLACEMENTS } from '../rules.js';
import {
  GRID_STEP, CHARACTER_RADIUS, normalizeTurn, snap, snapPosition,
  moveCandidate, rotateCandidate, isWalkable, findWalkPath
} from './placement-logic.js';

const item = (id, type, x, z, r = 0) => ({ id, type, x, z, r });

test('the furniture catalog and room size agree with the interior contract', () => {
  assert.equal(ROOM.width, 9);
  assert.equal(ROOM.depth, 8);
  assert.equal(ROOM.wall, 4);
  assert.ok(Object.keys(FURNITURE).length >= 12);
  assert.ok(STARTER_PLACEMENTS.every(p => FURNITURE[p.type]));
});

test('grid snapping handles positive, negative and fractional coordinates', () => {
  assert.equal(GRID_STEP, 0.25);
  assert.equal(snap(1.13), 1.25);
  assert.equal(snap(-1.13), -1.25);
  assert.deepEqual(snapPosition({ x: -2.13, z: 1.34 }), { x: -2.25, z: 1.25 });
  assert.throws(() => snap(Infinity), TypeError);
  assert.throws(() => snap(1, 0), TypeError);
});

test('moving keeps the original ID, furniture type, and normalized orientation', () => {
  const original = item('heirloom', 'chair', 0, 0, -1);
  const moved = moveCandidate(original, { x: 1.14, z: -1.19 });
  assert.deepEqual(moved, item('heirloom', 'chair', 1.25, -1.25, 3));
  assert.deepEqual(original, item('heirloom', 'chair', 0, 0, -1));
});

test('quarter turns are canonical and round-trip in either direction', () => {
  assert.equal(normalizeTurn(-1), 3);
  assert.equal(normalizeTurn(8), 0);
  const p = item('one', 'bed', 1, 1);
  assert.equal(rotateCandidate(p).r, 1);
  assert.equal(rotateCandidate(p, -1).r, 3);
  let spun = p;
  for (let i = 0; i < 4; i++) spun = rotateCandidate(spun);
  assert.deepEqual(spun, p);
});

test('the shared rule engine swaps footprints when rotated', () => {
  assert.deepEqual(footprint(item('one', 'bed', 0, 0, 0)), { w: 2.1, d: 2.7 });
  assert.deepEqual(footprint(item('one', 'bed', 0, 0, 1)), { w: 2.7, d: 2.1 });
});

test('placement collisions exclude the item being moved but reject other furniture', () => {
  const original = item('a', 'chair', 0, 0);
  const moved = item('a', 'chair', 0.25, 0);
  const occupied = item('b', 'chair', 0.25, 0);
  assert.equal(canPlace(moved, [original], 'a'), true);
  assert.equal(canPlace(moved, [original, occupied], 'a'), false);
});

test('invalid boundary and doorway placements stay invalid', () => {
  assert.equal(canPlace(item('a', 'sofa', 4, 0), []), false);
  assert.equal(canPlace(item('a', 'sofa', 0, 3), []), false);
  assert.equal(canPlace(item('a', 'chair', 0, 0), []), true);
});

test('a rug does not block furniture or the character', () => {
  const rug = item('rug', 'rug', 0, 0);
  assert.equal(canPlace(item('chair', 'chair', 0, 0), [rug]), true);
  assert.equal(isWalkable(0, 0, [rug]), true);
});

test('walkability rejects walls, blocked furniture, and non-finite positions', () => {
  const chair = item('chair', 'chair', 0, 0);
  assert.equal(isWalkable(0, 0, [chair]), false);
  assert.equal(isWalkable(3, 0, [chair]), true);
  assert.equal(isWalkable(ROOM.width / 2, 0), false);
  assert.equal(isWalkable(0, Infinity), false);
  assert.ok(CHARACTER_RADIUS > 0.25);
});

test('a quarter-turn changes obstacle collision just as it changes footprint', () => {
  const sofa = item('sofa', 'sofa', 0, 0, 0);
  assert.equal(isWalkable(1.4, 0, [sofa]), false);
  assert.equal(isWalkable(1.4, 0, [{ ...sofa, r: 1 }]), true);
});

test('pathfinding routes around furniture instead of crossing it', () => {
  const obstacle = item('table', 'table', 0, 0);
  const path = findWalkPath({ x: 0, z: -2.5 }, { x: 0, z: 2.5 }, [obstacle]);
  assert.ok(path.length > 0, 'a valid path should exist around the table');
  assert.ok(path.every(p => isWalkable(p.x, p.z, [obstacle])));
  assert.ok(path.some(p => Math.abs(p.x) > 1), 'route should detour around the table');
  assert.ok(Math.hypot(path.at(-1).x, path.at(-1).z - 2.5) < 0.7);
});

test('blocked goals resolve to a reachable position instead of entering furniture', () => {
  const chair = item('chair', 'chair', 0, 0);
  const path = findWalkPath({ x: 2, z: 2 }, { x: 0, z: 0 }, [chair]);
  assert.ok(path.length > 0);
  assert.ok(isWalkable(path.at(-1).x, path.at(-1).z, [chair]));
});

test('pathfinding refuses invalid inputs and supports an empty room', () => {
  assert.deepEqual(findWalkPath(null, { x: 0, z: 0 }), []);
  assert.deepEqual(findWalkPath({ x: NaN, z: 0 }, { x: 0, z: 0 }), []);
  assert.ok(findWalkPath({ x: -2, z: 0 }, { x: 2, z: 0 }).length > 0);
});
