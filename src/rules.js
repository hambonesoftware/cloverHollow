// Game state, house placement, and data. No browser/Three.js dependencies.
export const SAVE_KEY = 'clover-hollow-v1';
export const ROOM = Object.freeze({ width: 9, depth: 8, wall: 4 });
export const LOTS = Object.freeze([
  { name: 'South Meadow', x: 8, z: 34, roof: 0x8caf92, note: 'Sunny windows and neighbors near the square.' },
  { name: 'Brookside', x: 35, z: 30, roof: 0x8ba9cb, note: 'Quiet creek views and bluebells at your door.' },
  { name: 'Orchard Row', x: -33, z: 33, roof: 0xd9a16e, note: 'Apple trees and a cozy lane for evening walks.' }
]);
export const FURNITURE = Object.freeze({
  bed:       { name: 'Moonbeam Bed', description: 'A quilt the color of a late summer sky.', emoji: '🛏️', w: 2.1, d: 2.7, price: 45, category: 'Comfort' },
  sofa:      { name: 'Moss Velvet Sofa', description: 'Soft enough to lose an afternoon in.', emoji: '🛋️', w: 2.6, d: 1.2, price: 40, category: 'Comfort' },
  table:     { name: 'Honeywood Table', description: 'Bruno sanded every corner by hand.', emoji: '🪵', w: 1.7, d: 1.5, price: 24, category: 'Furniture' },
  chair:     { name: 'Clover Chair', description: 'Just the right place for a cup of tea.', emoji: '🪑', w: .85, d: .9, price: 12, category: 'Furniture' },
  shelf:     { name: 'Storybook Shelf', description: 'An empty shelf is a story waiting to happen.', emoji: '📚', w: 1.35, d: .55, price: 28, category: 'Furniture' },
  lamp:      { name: 'Firefly Lamp', description: 'Its glow feels like a friendly little secret.', emoji: '🏮', w: .65, d: .65, price: 19, category: 'Decor' },
  plant:     { name: 'Potted Bluebells', description: 'Hazel says they like company.', emoji: '🪴', w: .75, d: .75, price: 11, category: 'Decor' },
  dresser:   { name: 'Berrywood Dresser', description: 'Drawers for all the things worth keeping.', emoji: '🗄️', w: 1.5, d: .7, price: 32, category: 'Furniture' },
  rug:       { name: 'Daisy Circle Rug', description: 'A small meadow for your floor.', emoji: '🌼', w: 2.3, d: 2.3, price: 18, category: 'Decor', floor: true },
  teapot:    { name: 'Pip’s Teapot', description: 'Always ready for a surprise guest.', emoji: '🫖', w: .5, d: .5, price: 14, category: 'Decor', tabletop: true },
  stool:     { name: 'Garden Stool', description: 'A little perch for quiet mornings.', emoji: '🌿', w: .7, d: .7, price: 10, category: 'Furniture' },
  clock:     { name: 'Applewood Clock', description: 'The ticking sounds like happy footsteps.', emoji: '🕰️', w: .8, d: .5, price: 22, category: 'Decor' }
});
export const STARTING_FURNITURE = Object.freeze({ bed: 1, sofa: 1, table: 1, chair: 2, lamp: 1, plant: 1, rug: 1, shelf: 1, teapot: 1 });
export const STARTER_PLACEMENTS = Object.freeze([
  { id: 'starter-bed', type: 'bed', x: -2.75, z: -2.25, r: 0 },
  { id: 'starter-sofa', type: 'sofa', x: 2.55, z: -2.65, r: 0 },
  { id: 'starter-lamp', type: 'lamp', x: 3.6, z: -.65, r: 0 },
  { id: 'starter-rug', type: 'rug', x: 0, z: .6, r: 0 }
]);
export function initialSave() {
  return { version: 1, deed: null, petals: 165, gifts: {}, inventory: { ...STARTING_FURNITURE },
    placements: STARTER_PLACEMENTS.map(p => ({ ...p })), town: { x: 1.5, z: 8.5 },
    daySeconds: 110, greeting: false, outfit: 'Mint' };
}
export function loadSave(storage) {
  try {
    const data = JSON.parse(storage.getItem(SAVE_KEY));
    if (data && data.version === 1) {
      const fallback = initialSave();
      const legal = new Set(Object.keys(FURNITURE));
      return { ...fallback, ...data,
        inventory: { ...fallback.inventory, ...data.inventory },
        town: { ...fallback.town, ...data.town },
        gifts: data.gifts && typeof data.gifts === 'object' ? data.gifts : {},
        placements: Array.isArray(data.placements) ? data.placements.filter(p => legal.has(p.type) && Number.isFinite(p.x) && Number.isFinite(p.z)) : fallback.placements
      };
    }
  } catch {}
  return initialSave();
}
export function saveGame(storage, state) {
  try { storage.setItem(SAVE_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}
export function footprint(p) {
  const f = FURNITURE[p.type];
  if (!f) return null;
  const turn = ((p.r ?? 0) % 4 + 4) % 4;
  return { w: turn % 2 ? f.d : f.w, d: turn % 2 ? f.w : f.d };
}
export function canPlace(candidate, others, ignoreId = null) {
  const f = FURNITURE[candidate.type], dim = footprint(candidate);
  if (!dim || !Number.isFinite(candidate.x) || !Number.isFinite(candidate.z)) return false;
  const outer = .27;
  if (candidate.x - dim.w / 2 < -ROOM.width / 2 + outer ||
      candidate.x + dim.w / 2 > ROOM.width / 2 - outer ||
      candidate.z - dim.d / 2 < -ROOM.depth / 2 + outer ||
      candidate.z + dim.d / 2 > ROOM.depth / 2 - outer) return false;
  // The walk-in threshold at the front of the dollhouse must stay clear.
  if (!f.floor && Math.abs(candidate.x) < 1.2 + dim.w / 2 && candidate.z + dim.d / 2 > 2.65) return false;
  for (const other of others) {
    if (other.id === ignoreId) continue;
    const of = FURNITURE[other.type];
    if (!of || f.floor || of.floor || f.tabletop || of.tabletop) continue;
    const a = footprint(other);
    if (Math.abs(candidate.x - other.x) < (dim.w + a.w) / 2 + .08 &&
        Math.abs(candidate.z - other.z) < (dim.d + a.d) / 2 + .08) return false;
  }
  return true;
}
export function unusedFurniture(state, type) {
  return Math.max(0, (state.inventory[type] ?? 0) - state.placements.filter(p => p.type === type).length);
}
