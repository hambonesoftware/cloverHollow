import * as THREE from 'three';
import { DISTRICTS, DISTRICT_PATHS, DISTRICT_LANDMARKS, DISTRICT_PUBLIC_SPOTS } from '../world/district-plan.js';

const mats=new Map();
const mat=(color)=>{if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:.85}));return mats.get(color);};
function block(root,w,h,d,color,x,y,z) {
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));
  m.position.set(x,y,z);m.receiveShadow=true;root.add(m);return m;
}
function sphere(root,r,color,x,y,z) {
  const m=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),mat(color));
  m.position.set(x,y,z);root.add(m);return m;
}
function lantern(root,x,z,color=0xffce89) {
  block(root,.14,2.5,.14,0x78634d,x,1.25,z);
  block(root,.75,.12,.75,0x69533f,x,2.52,z);
  block(root,.53,.62,.53,0xf6dfad,x,2.92,z);
  sphere(root,.19,color,x,2.92,z);
  block(root,.7,.12,.7,0x69533f,x,3.29,z);
}
function planter(root,x,z) {
  block(root,1.3,.45,.7,0xb6a28c,x,.23,z);
  for(let i=0;i<5;i++)sphere(root,.2,[0x87b17d,0xf0b0bd,0xf5d48c][i%3],
    x+(i-2)*.22,.59,z+(i%2?-.13:.13));
}
function bench(root,x,z) {
  block(root,1.9,.18,.58,0x997758,x,.72,z);
  block(root,1.9,.55,.13,0x997758,x,1.05,z-.25);
  for(const dx of [-.74,.74])block(root,.14,.64,.14,0x685344,x+dx,.34,z);
}
function path(root,segment,wide) {
  const [x0,z0,x1,z1]=segment;
  const w=(x0===x1?(wide?4.3:2.3):Math.abs(x1-x0)+(wide?4.3:2.3));
  const d=(z0===z1?(wide?4.3:2.3):Math.abs(z1-z0)+(wide?4.3:2.3));
  const x=(x0+x1)/2,z=(z0+z1)/2;
  block(root,w+.5,.035,d+.5,0x9b9b86,x,-.052,z);
  block(root,w,.02,d,wide?0xd8bfa0:0xcbb9a5,x,-.026,z);
}
export function createCityInfrastructure(scene,{quality='mobile'}={}) {
  const root=new THREE.Group();root.name='Clover Hollow public infrastructure';
  scene.add(root);
  for(let i=0;i<DISTRICT_PATHS.length;i++)path(root,DISTRICT_PATHS[i],i<16);
  // Plazas sit on circulation edges but never create solid blockers.
  block(root,24,.026,9,0xe0c9aa,-32,-.012,-60);
  block(root,27,.026,9,0xbdb1b1,31,-.012,-102);
  for(const landmark of DISTRICT_LANDMARKS){
    if(landmark.kind==='fountain'){
      const rim=new THREE.Mesh(new THREE.TorusGeometry(1.75,.24,8,28),mat(0xb4aca2));
      rim.rotation.x=Math.PI/2;rim.position.set(landmark.x,.18,landmark.z);root.add(rim);
      const pool=new THREE.Mesh(new THREE.CircleGeometry(1.55,28),mat(0x80c1d2));
      pool.rotation.x=-Math.PI/2;pool.position.set(landmark.x,.08,landmark.z);root.add(pool);
      sphere(root,.28,0xc5c5ae,landmark.x,.54,landmark.z);
    }else if(landmark.kind==='garden'){
      for(const dx of [-8,8])for(const dz of [-2,2])planter(root,landmark.x+dx,landmark.z+dz);
    }
  }
  for(let i=0;i<DISTRICT_PUBLIC_SPOTS.length;i++){
    const [x,z]=DISTRICT_PUBLIC_SPOTS[i];
    if(i!==3)bench(root,x+4,z+2.6);
    planter(root,x-4,z+2.8);
  }
  for(const [x,z] of [[-69,-70],[-50,-70],[-31,-70],[-10,-70],[7,-70],
    [-69,-94],[-50,-94],[-31,-94],[-10,-94],[7,-94],
    [12,-84],[31,-84],[52,-84],[12,-112],[31,-112],[52,-112],
    [12,-132],[31,-132],[52,-132]]){
    lantern(root,x,z,z< -82&&x>10?0xffa86c:0xffdf9c);
  }
  // Decorative banners hang overhead rather than blocking pedestrian routes.
  if(quality!=='low'){
    for(const z of [-88,-108,-128]){
      for(let i=0;i<5;i++){
        const x=16+i*8;
        const flag=block(root,.9,.55,.08,[0xe6a7b4,0xf1d59d,0x9fbcb2][i%3],
          x,4.3,z);
        flag.rotation.z=(i%2?1:-1)*.14;
      }
    }
  }
  return {root,dispose(){root.traverse(obj=>{
    if(obj.geometry)obj.geometry.dispose();
  });scene.remove(root);}};
}
