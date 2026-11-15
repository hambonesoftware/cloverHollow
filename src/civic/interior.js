import * as THREE from 'three';
import {roundedBox,fairyMaterial} from '../visual/gfx.js';
const palette={wall:0xf6e8d1,wood:0x916f59,stone:0xc8b7a4,books:[0xa87577,0x77998c,0xcaa36c,0x8c8eb2]};
function part(root,w,h,d,color,x,y,z){const m=new THREE.Mesh(roundedBox(w,h,d,.035,2),fairyMaterial(color));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;}
/** Open front and right side, rear and left walls; unobstructed central walkway. */
export function createCivicInterior({kind='library',w=7,d=6,seed=1}={}){
  const root=new THREE.Group();root.name='Walk-in '+kind+' dollhouse interior';
  part(root,w,.15,d,palette.stone,0,.075,0);
  part(root,w,3.1,.13,palette.wall,0,1.55,-d/2+.06);
  part(root,.13,3.1,d,palette.wall,-w/2+.06,1.55,0);
  const shelves=kind==='library'||kind==='post-office'||kind==='mayor-office';
  if(shelves)for(let s=0;s<2;s++){
    const x=-w/2+.62+s*1.4;
    part(root,1.1,2.1,.35,palette.wood,x,1.18,-d/2+.43);
    for(let j=0;j<3;j++){
      part(root,1.0,.07,.42,0xd5ad7c,x,.55+j*.62,-d/2+.17);
      for(let k=0;k<5;k++)part(root,.12,.32+(k%3)*.06,.20,
        palette.books[(k+j+s)%4],x-.38+k*.19,.78+j*.62,-d/2+.15);
    }
  }
  part(root,Math.min(w*.52,3.2),.19,.9,palette.wood,w*.15,.95,-d*.18);
  for(const x of [-.95,.95])part(root,.13,.82,.72,palette.wood,w*.15+x*.65,.49,-d*.18);
  part(root,1.25,.12,.8,0xcda97f,w*.20,.52,d*.19);
  for(const x of [-.43,.43])part(root,.12,.47,.65,palette.wood,w*.20+x,.26,d*.19);
  root.userData={walkable:true,entrance:{x:0,z:d/2},openSides:['front','right'],kind};
  return root;
}
