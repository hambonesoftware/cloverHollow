import * as THREE from 'three';
import { createChibi } from '../characters/chibi.js';
import { updateCharacterAnimation } from '../characters/animation.js';

/**
 * Optional comparison scene for a developer's existing Three.js renderer.
 * Both sides are rendered by the same camera and lighting. No external URLs.
 * createCharacterComparison(scene) returns { update(dt), dispose() }.
 */
export function createCharacterComparison(scene){
  const root=new THREE.Group();scene.add(root);
  const skin=0xf2c9a7,shirt=0x83b6a3;
  function primitive(kind){
    const g=new THREE.Group();
    const mat=c=>new THREE.MeshToonMaterial({color:c});
    function ball(r,c,x,y,z,sx=1,sy=1,sz=1){
      const mesh=new THREE.Mesh(new THREE.SphereGeometry(r,12,9),mat(c));
      mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);g.add(mesh);
    }
    ball(.58,skin,0,1.54,0);ball(.4,shirt,0,.8,0,1,1.1,.88);
    for(const side of [-1,1]){
      ball(.14,0x668b8b,side*.19,.32,0);
      ball(.16,0x644f50,side*.19,.09,.1,1,.65,1.3);
      ball(.16,shirt,side*.39,.88,0);
      ball(.065,0x453742,side*.235,1.57,.54);
    }
    if(kind==='bunny')for(const side of [-1,1])ball(.18,skin,side*.25,2.23,0,.7,2.6,.8);
    return g;
  }
  const labels=[];
  for(const [i,kind] of ['kid','cat','bunny','bear','duck','frog','dog','hedgehog'].entries()){
    const x=(i%4-1.5)*3.2,z=Math.floor(i/4)*3.5;
    const old=primitive(kind);old.position.set(x-9,0,z);root.add(old);
    const modern=createChibi(kind);modern.position.set(x+9,0,z);root.add(modern);
    labels.push(modern);
  }
  return {
    root,oldSideX:-9,newSideX:9,
    update(dt){for(const c of labels)updateCharacterAnimation(c,dt,{velocity:{x:0,z:1.5}});},
    dispose(){root.removeFromParent();root.traverse(o=>{if(o.isMesh&&!o.userData.isOutline){
      // Shared geometry/material resources are managed globally; do not dispose them here.
    }});}
  };
}
