import * as THREE from 'three';
const presets={
 plaster:[0xf0dfc8,.96,0],timber:[0x987251,.84,0],shingles:[0x9d7790,.88,0],
 mossStone:[0x9eae99,.97,0],cobblestone:[0xc4b7a1,.96,0],
 awning:[0xdca4a1,1,0],clothing:[0x92ac9d,1,0],glass:[0x9acbd1,.24,.05],
 window:[0xffd39b,.32,0],polishedWood:[0xad7b54,.43,0],
 foliage:[0x7ca77b,1,0],flowers:[0xeab4c6,.9,0],
 water:[0x7ab8c3,.25,.1],brass:[0xd9b36d,.32,.55],lantern:[0xffce88,.42,0]
};
export const STORYBOOK_PRESETS=Object.freeze(Object.fromEntries(Object.entries(presets).map(([k,v])=>[k,Object.freeze({color:v[0],roughness:v[1],metalness:v[2]})])));
const cache=new Map();
export function storybookMaterial(name,{color,quality='medium',variant=0}={}){
  const p=STORYBOOK_PRESETS[name];if(!p)throw new RangeError('Unknown storybook material '+name);
  const key=[name,color??p.color,quality,variant].join(':');
  if(cache.has(key))return cache.get(key);
  const tint=new THREE.Color(color??p.color);
  tint.offsetHSL(Math.sin(variant*17.13)*.012,0,Math.sin(variant*11.3)*.025);
  const material=new THREE.MeshStandardMaterial({color:tint,roughness:p.roughness,metalness:quality==='low'?0:p.metalness,
    emissive:name==='window'||name==='lantern'?tint:new THREE.Color(0),
    emissiveIntensity:name==='window'||name==='lantern'?.18:0,
    transparent:name==='glass'||name==='water',opacity:name==='glass'?.78:name==='water'?.88:1});
  cache.set(key,material);return material;
}
export function setEmissiveEvening(material,night){
  if(!material?.isMeshStandardMaterial)return;
  material.emissiveIntensity=Math.max(0,Math.min(1,night))*.65+.12;
}
