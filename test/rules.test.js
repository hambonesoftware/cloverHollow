import test from 'node:test';
import assert from 'node:assert/strict';
import { canPlace, footprint, initialSave, loadSave, saveGame, unusedFurniture, STARTER_PLACEMENTS } from '../src/rules.js';

test('starter inventory owns the starter placements and spare furniture', () => {
  const s = initialSave();
  assert.equal(unusedFurniture(s, 'bed'), 0);
  assert.equal(unusedFurniture(s, 'chair'), 2);
  assert.equal(s.deed, null);
  assert.equal(s.petals, 165);
});
test('furniture rotates and preserves dimensions', () => {
  assert.deepEqual(footprint({ type: 'bed', r: 1 }), { w: 2.7, d: 2.1 });
});
test('room bounds, door threshold, and collisions are enforced', () => {
  assert.equal(canPlace({ type: 'chair', x: 0, z: 0, r: 0 }, STARTER_PLACEMENTS), true);
  assert.equal(canPlace({ type: 'chair', x: 0, z: 3.5, r: 0 }, STARTER_PLACEMENTS), false);
  assert.equal(canPlace({ type: 'chair', x: 6, z: 0, r: 0 }, STARTER_PLACEMENTS), false);
  assert.equal(canPlace({ type: 'chair', x: -2.75, z: -2.25, r: 0 }, STARTER_PLACEMENTS), false);
  assert.equal(canPlace({ type: 'chair', x: 0, z: 0, r: 0 }, STARTER_PLACEMENTS), true);
});
test('save persistence works under the Clover Hollow key', () => {
  const db = new Map();
  const storage = { getItem: k => db.get(k) ?? null, setItem: (k,v) => db.set(k,v) };
  const s = initialSave();
  s.deed = 1; s.placements.push({ id: 'added', type: 'chair', x: 1, z: 1, r: 0 });
  assert.equal(saveGame(storage,s), true);
  const loaded = loadSave(storage);
  assert.equal(loaded.deed, 1);
  assert.equal(loaded.placements.at(-1).type, 'chair');
});
