import * as THREE from 'three';
import { seeded } from '../architecture/design.js';

const mats=new Map();
function mat(color) {
  if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:.92}));
  return mats.get(color);
}
function batch(scene,geometry,color,points) {
  if(!points.length)return;
  const inst=new THREE.InstancedMesh(geometry,mat(color),points.length);
  const dummy=new THREE.Object3D();
  for(let i=0;i<points.length;i++){
    const p=points[i];
    dummy.position.set(p.x,p.y,p.z);
    dummy.rotation.set(p.rx??0,p.ry??0,p.rz??0);
    dummy.scale.set(p.sx??1,p.sy??1,p.sz??1);
    dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);
  }
  inst.instanceMatrix.needsUpdate=true;inst.castShadow=false;inst.receiveShadow=true;
  scene.add(inst);return inst;
}
function segment(scene,a,b,r,color) {
  const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b);
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r*.76,r,p.distanceTo(q),6),mat(color));
  mesh.position.copy(p).add(q).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),q.sub(p).normalize());
  scene.add(mesh);return mesh;
}
export function createFairyLandscape(scene,{buildings,walkable,routePoints=[],seed='clover-hollow'}={}) {
  const random=seeded(seed),treeTrunks=[],canopies=[[],[],[]],blooms=[[],[],[]],
    mushrooms=[],pebbles=[],hedges=[];
  const nearPath=(x,z,r)=>routePoints.some(p=>Math.hypot(x-p.x,z-p.z)<r);
  const safe=(x,z,clearance=1.3)=>walkable(x,z)&&!nearPath(x,z,clearance)&&
    !buildings.some(b=>Math.abs(x-b.x)<b.w/2+clearance&&Math.abs(z-b.z)<b.d/2+clearance);
  const identities={
    mayor:{accent:0xd6c17c},bakery:{accent:0xe7a0ac},
    furniture:{accent:0xa6bb8b},general:{accent:0x9ebdcb}
  };
  for(const b of buildings){
    const direction=b.facing==='south'?-1:1;
    const front=b.z+direction*b.d/2,door=b.entrance;
    // No decoration crosses the exact front door threshold.
    for(const side of [-1,1]){
      const x=b.x+side*(b.w/2+1.1),z=front+direction*.85;
      if(safe(x,z,.35)){
        const group=new THREE.Group();group.position.set(x,0,z);scene.add(group);
        const stem=segment(group,[0,.02,0],[0,1.55,0],.065,0x7a9463);
        for(let i=0;i<5;i++){
          const a=i*2.399,r=.22+i*.065;
          const m=new THREE.Mesh(new THREE.SphereGeometry(.32,8,6),mat([0x83ae79,0x90b987,0x709d80][i%3]));
          m.position.set(Math.sin(a)*r,.45+i*.27,Math.cos(a)*r);m.scale.set(1.2,.72,.9);group.add(m);
        }
        const flower=new THREE.Mesh(new THREE.IcosahedronGeometry(.16,0),mat(identities[b.id]?.accent??0xe7b3c3));
        flower.position.set(0,1.66,0);group.add(flower);
      }
    }
    // Footprint-exterior stepping stones are flat, nonblocking ground decals.
    for(let k=0;k<3;k++){
      const x=door[0],z=door[1]+direction*(.4+k*.62);
      if(!walkable(x,z))continue;
      pebbles.push({x,y:.018,z,sx:.45,sy:.07,sz:.31,ry:(random()-.5)*.25});
    }
    // Flowering border beyond wall corners; no fences across entrances.
    for(let j=0;j<13;j++){
      const side=j%2?-1:1,x=b.x+side*(b.w/2+.75)+(random()-.5)*.6;
      const z=b.z+(random()-.5)*(b.d+1.1);
      if(!safe(x,z,.28))continue;
      blooms[j%3].push({x,y:.3,z,sx:.14,sy:.16,sz:.14});
      hedges.push({x,y:.22,z,sx:.33,sy:.29,sz:.34});
    }
  }
  // Neighborhood trees are placed only where existing pedestrian collision
  // logic and navigation keep a generous clearance. Their crowns may overhang.
  for(let i=0;i<900;i++){
    // Plant both old and new districts. The former -62..71 range left
    // almost the entire southern commercial town empty and exposed.
    const south=i%2===0;
    const x=south?-80+random()*145:-77+random()*153;
    const z=south?-139+random()*83:-62+random()*133;
    if(!safe(x,z,3.2))continue;
    if(Math.abs(x)<16&&z>-28&&z<20)continue;
    if(random()>.24)continue;
    const s=.75+random()*.55,type=i%3;
    treeTrunks.push({x,y:1.25*s,z,sx:s,sy:s,sz:s});
    for(let k=0;k<5;k++){
      const a=k*2.399,r=k===0?0:.62+.22*random();
      canopies[type].push({x:x+Math.sin(a)*r*s,y:(2.95+.35*random())*s,z:z+Math.cos(a)*r*s,
        sx:(.84+random()*.2)*s,sy:(.76+random()*.26)*s,sz:(.8+random()*.2)*s});
    }
    // A handful of branches add depth beyond the instanced leafy canopy.
    if(i%5===0){
      segment(scene,[x,1.8*s,z],[x+.9*s,2.85*s,z+.25*s],.08*s,0x846d57);
      segment(scene,[x,1.95*s,z],[x-.72*s,2.65*s,z-.48*s],.065*s,0x846d57);
    }
    for(let k=0;k<4;k++){
      const a=random()*Math.PI*2,r=1.3+random()*1.4;
      const px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
      if(!safe(px,pz,.4))continue;
      if(k===0)mushrooms.push({x:px,y:.13,z:pz,sx:.19,sy:.14,sz:.19});
      else blooms[(i+k)%3].push({x:px,y:.18,z:pz,sx:.12,sy:.14,sz:.12});
    }
  }
  batch(scene,new THREE.CylinderGeometry(.18,.32,2.5,7),0x846b55,treeTrunks);
  [0x7caa7b,0x96b88b,0x81a9a1].forEach((color,i)=>
    batch(scene,new THREE.IcosahedronGeometry(1,1),color,canopies[i]));
  [0xe8a8bb,0xf0d18a,0xd2b6e4].forEach((color,i)=>
    batch(scene,new THREE.IcosahedronGeometry(1,0),color,blooms[i]));
  batch(scene,new THREE.DodecahedronGeometry(.45,0),0x7ca46e,hedges);
  batch(scene,new THREE.DodecahedronGeometry(.7,0),0xd2c1a4,pebbles);
  batch(scene,new THREE.SphereGeometry(1,8,6),0xd9a2a0,mushrooms);
  return {counts:{trees:treeTrunks.length,leafClusters:canopies.reduce((a,b)=>a+b.length,0),
    flowers:blooms.reduce((a,b)=>a+b.length,0),stones:pebbles.length},seed};
}
