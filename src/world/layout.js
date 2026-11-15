import { LOTS } from '../rules.js';
import { DISTRICT_SITES, DISTRICT_PATHS, DISTRICT_PLACES, WORLD_BOUNDS, DISTRICT_PUBLIC_SPOTS } from './district-plan.js';

/**
 * Outdoor-only geometry metadata. World units follow our 2.2-unit chibi scale.
 * All facades face +Z, and entrances are in open space, 1.5 units beyond the wall.
 * IDs are stable save/UI keys; don't renumber the three player lots.
 */
const homes = [
  ['mabel', -48, -27, "Mabel's Cottage", 0xb97f93, 0xffe0ce],
  ['bruno', -43, 7, "Bruno's Workshop", 0x93a078, 0xe8debc],
  ['pip', -23, 16, "Pip's Cottage", 0xbaa5d6, 0xf6dfd6],
  ['dot', 43, 8, "Dot's Cottage", 0x7b9dbc, 0xe5f1d9],
  ['fennel', -33, -45, "Fennel's Hideaway", 0x8cad7e, 0xd9eccb],
  ['hazel', -53, 56, "Hazel's House", 0xd5a48e, 0xffe4c9],
  ['clover', -67, 29, "Clover's Farmhouse", 0xb4bc7a, 0xf7e0be],
  ['reed', 52, 56, "Reed's Cottage", 0x75a8a4, 0xe0efe2],
  ['biscuit', -8, 55, "Biscuit's House", 0xd4a174, 0xffe8cc],
];
const shops = [
  ['mayor', 0, -25, 12, 9, "MAYOR'S HALL", 0x719f99, 0xf9e8c8, 'civic'],
  ['bakery', -22, -19, 10, 9, "PIP'S BAKERY", 0xc98091, 0xffe4ce, 'bakery'],
  ['furniture', 20, -19, 11, 9, 'LITTLE OAK', 0xb28a66, 0xf5dfbe, 'furniture'],
  ['general', 39, -19, 10, 9, 'GENERAL GOODS', 0x7ba7ae, 0xe2eacb, 'shop'],
];

/** Building footprints and public doorway positions, shared by renderer and navigation. */
export const BUILDINGS = Object.freeze([
  ...shops.map(([id,x,z,w,d,name,roof,wall,kind]) => Object.freeze({
    id,x,z,w,d,name,roof,wall,kind,entrance:Object.freeze([x,z+d/2+1.5])
  })),
  ...homes.map(([id,x,z,name,roof,wall]) => Object.freeze({
    id,x,z,w:8,d:7,name,roof,wall,kind:'home',entrance:Object.freeze([x,z+5])
  })),
  ...LOTS.map((lot,i) => Object.freeze({
    id:`lot-${i}`,x:lot.x,z:lot.z,w:8,d:7,name:lot.name,
    roof:lot.roof,wall:0xffedd4,kind:'lot',lotIndex:i,
    entrance:Object.freeze([lot.x,lot.z+5])
  })),
  ...DISTRICT_SITES
]);

/**
 * One-unit-sampled paths, with intersections generated automatically.
 * Broadway, market row, orchard lane and the residential lanes form a loop.
 * Paths terminate at the OPEN side of building doorsteps: none cross footprints.
 * Rectangles [x0,z0,x1,z1] are axis aligned to keep pathfinding deterministic.
 */
export const PATH_SEGMENTS = Object.freeze([
  [-55,-9,52,-9], [-55,23,52,23], [-67,46,52,46], [-55,63,52,63],
  [-55,-40,-55,46], [-33,-40,-33,23], [-9,-9,-9,23], [9,-9,9,23],
  [0,23,0,63], [20,-9,20,63], [43,23,43,63], [52,-9,52,46],
  [-43,12,-43,63],
  // The town well occupies the center of the square; people go around it.
  [-9,-3,9,-3], [-9,13,9,13], [-5,-3,-5,13], [5,-3,5,13],
  [-9,4,-5,4], [5,4,9,4],
  // Civic and business thresholds.
  [0,-19,0,-9], [-22,-13,-22,-9], [20,-13,20,-9], [39,-13,39,-9],
  // Existing neighbors' porches.
  [-48,-22,-55,-22], [-43,12,-43,23], [-23,21,-23,23],
  [43,13,43,23], [-33,-40,-33,-35],
  [-53,61,-53,63], [-67,34,-67,46], [52,61,52,63],
  [-8,60,-8,63],
  // Three independently selectable player homes.
  [8,39,8,46], [35,35,35,46], [-33,38,-33,46],
  ...DISTRICT_PATHS
].map(segment => Object.freeze(segment)));

export const PLACES = Object.freeze({
  square:Object.freeze([-5,4]),
  plazaEast:Object.freeze([5,4]),
  mayor:Object.freeze([0,-19]),
  bakery:Object.freeze([-22,-13]),
  furniture:Object.freeze([20,-13]),
  general:Object.freeze([39,-13]),
  market:Object.freeze([-9,13]),
  marketEast:Object.freeze([9,13]),
  pond:Object.freeze([52,23]),
  orchard:Object.freeze([-55,46]),
  south:Object.freeze([0,46]),
  woods:Object.freeze([-55,-40]),
  creek:Object.freeze([52,-9]),
  north:Object.freeze([0,63]),
  ...DISTRICT_PLACES
});

export const PLAZA_SOCIAL_SPOTS = Object.freeze([
  [-5,-3],[5,-3],[-5,13],[5,13],[-9,4],[9,4],...DISTRICT_PUBLIC_SPOTS
].map(point=>Object.freeze(point)));

/** Physical blockers only. Landscaping is kept outside the pedestrian network. */
export function createOutdoorCollision(buildings=BUILDINGS) {
  const obstacles=buildings.map(({id,x,z,w,d})=>({id,x,z,w,d}));
  function walkable(x,z) {
    if (!Number.isFinite(x)||!Number.isFinite(z)||x<WORLD_BOUNDS.minX||x>WORLD_BOUNDS.maxX||z<WORLD_BOUNDS.minZ||z>WORLD_BOUNDS.maxZ) return false;
    // The river is crossed by a bridge at z=-9; the playable neighborhood stays west.
    if (x>61&&x<71&&Math.abs(z+9)>4) return false;
    if (Math.hypot(x, z-4)<2.9) return false; // plaza well
    if (Math.hypot(x-57,z-34)<4.5) return false; // lily pond
    for(const b of obstacles)
      if(Math.abs(x-b.x)<b.w/2+.6&&Math.abs(z-b.z)<b.d/2+.6) return false;
    return true;
  }
  return {obstacles,walkable};
}
