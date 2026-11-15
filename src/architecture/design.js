import * as THREE from 'three';

/** Seeded, side-effect-free design metadata. Renderers use only this plan. */
export const FAMILIES=Object.freeze(['storybook','toadstool','moonspire','hobbit']);
export function hashSeed(value) {
  let h=2166136261;
  for(const char of String(value)) {h^=char.charCodeAt(0);h=Math.imul(h,16777619);}
  return h>>>0;
}
export function seeded(seed) {
  let s=hashSeed(seed)||1;
  return ()=>{s=(s+0x6d2b79f5)|0;let t=Math.imul(s^(s>>>15),1|s);
    t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};
}
export function designBuilding(b, options={}) {
  if(!b||!Number.isFinite(b.w)||!Number.isFinite(b.d)||b.w<5||b.d<5||
    !Number.isFinite(b.x)||!Number.isFinite(b.z)||
    !Array.isArray(b.entrance)||b.entrance.length!==2||
    !b.entrance.every(Number.isFinite))throw new RangeError('Invalid building footprint or entrance');
  const seed=options.seed??b.id;
  const rand=seeded(seed);
  const family=options.family??(['civic','bakery','furniture','shop'].includes(b.kind)?
    ({civic:'moonspire',bakery:'storybook',furniture:'storybook',shop:'toadstool'}[b.kind]):
    FAMILIES[hashSeed(b.id)%4]);
  if(!FAMILIES.includes(family))throw new RangeError('Unknown architectural family');
  const roofCurvature=options.roofCurvature??(.75+rand()*.32);
  const roofOverhang=options.roofOverhang??(.28+rand()*.15);
  if(!Number.isFinite(roofCurvature)||roofCurvature<.15||roofCurvature>2||
     !Number.isFinite(roofOverhang)||roofOverhang<0||roofOverhang>.55)throw new RangeError('Invalid roof parameters');
  const wallHeight=options.wallHeight??(3.35+rand()*.28);
  if(!Number.isFinite(wallHeight)||wallHeight<2.7||wallHeight>5.8)throw new RangeError('Invalid wall height');
  const palette={wall:b.wall??0xf5e2c8,roof:b.roof??0x8ea38c,
    timber:0x80634f,stone:0xb6ad9b,trim:0xffefcf,foliage:0x7b9b65,...options.palette};
  return Object.freeze({
    id:b.id,kind:b.kind,family,seed:String(seed),w:b.w,d:b.d,x:b.x,z:b.z,
    entrance:[...b.entrance],wallHeight,roofCurvature,roofOverhang,
    palette:Object.freeze(palette),garden:options.garden??b.kind!=='civic',
    windowCount:options.windows??2,door:options.door??'arched',
    asymmetry:(rand()-.5)*.26,detailSeed:hashSeed(seed+':details')
  });
}
export function validateEntrances(definitions,plans) {
  return definitions.every((b,i)=>plans[i].id===b.id&&
    plans[i].x===b.x&&plans[i].z===b.z&&
    plans[i].entrance[0]===b.entrance[0]&&plans[i].entrance[1]===b.entrance[1]&&
    plans[i].w===b.w&&plans[i].d===b.d);
}
