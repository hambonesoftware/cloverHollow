import * as THREE from 'three';
export function createStorybookAtmosphere(scene,{quality='medium',seed=19,walkable=()=>true,locations=[]}={}){
 const root=new THREE.Group();root.name='Storybook atmosphere';scene.add(root);
 const n=quality==='low'?12:quality==='medium'?35:70;
 const rng=i=>{const x=Math.sin((i+seed)*78.233)*43758.5453;return x-Math.floor(x);};
 const points=[],geometry=new THREE.SphereGeometry(.075,6,4);
 const material=new THREE.MeshBasicMaterial({color:0xffdf98,transparent:true,opacity:.7,depthWrite:false});
 for(let i=0;i<n*5&&points.length<n;i++){
  const x=-80+rng(i*3)*160,z=-145+rng(i*3+1)*215;
  if(!walkable(x,z))continue;
  if(locations.some(p=>Math.hypot(p.x-x,p.z-z)<3))continue;
  points.push({x,z,phase:rng(i*3+2)*Math.PI*2});
 }
 const mesh=new THREE.InstancedMesh(geometry,material,points.length);
 mesh.frustumCulled=false;root.add(mesh);
 const dummy=new THREE.Object3D();let elapsed=0;
 function update(dt,night=0,{reducedMotion=false}={}){
  elapsed+=Math.max(0,Math.min(.1,dt||0));
  material.opacity=.1+Math.max(0,Math.min(1,night))*.65;
  mesh.visible=night>.12;
  if(!mesh.visible)return;
  points.forEach((p,i)=>{
   dummy.position.set(p.x+(!reducedMotion?Math.sin(elapsed*.35+p.phase)*.35:0),
    1.3+(!reducedMotion?Math.sin(elapsed*1.2+p.phase)*.3:0),p.z);
   dummy.scale.setScalar(.65+.35*Math.sin(p.phase*2)**2);
   dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate=true;
 }
 return {root,update,dispose(){scene.remove(root);geometry.dispose();material.dispose();}};
}
