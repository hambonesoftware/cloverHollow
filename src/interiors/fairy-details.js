import * as THREE from 'three';

/**
 * Decorative room architecture for Clover Hollow's 9x8 two-wall dollhouse.
 * Does not modify furniture placements, collision footprints or ownership.
 * Geometry is lightweight and can be culled with the interior scene.
 */
const M=(color,extra={})=>new THREE.MeshStandardMaterial({
  color,roughness:.8,metalness:0,...extra
});
const MAT={
  beam:M(0xb78866),bevel:M(0xd8aa7e),trim:M(0xfff0d4),
  sage:M(0xa0bca4),leaf:M(0x749b7b),
  lilac:M(0xd2b9ce),pink:M(0xe9b1af),
  gold:M(0xd6b67c,{roughness:.52,metalness:.14}),
  canvas:M(0x9ec1ae),glass:M(0xf9dc9d,{emissive:0xe0a45c,emissiveIntensity:.23})
};
function block(root,w,h,d,mat,x,y,z){
  const item=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  item.position.set(x,y,z);item.castShadow=h>.35;item.receiveShadow=true;
  root.add(item);return item;
}
function sphere(root,r,mat,x,y,z,sx=1,sy=1,sz=1){
  const o=new THREE.Mesh(new THREE.SphereGeometry(r,10,8),mat);
  o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=false;
  root.add(o);return o;
}
function sconces(root,width,depth){
  const back=-depth/2+.25;
  for(const x of [-width*.40,width*.40]){
    block(root,.17,.55,.19,MAT.beam,x,3.12,back);
    sphere(root,.18,MAT.glass,x,3.23,back+.18,.8,1,.65);
    block(root,.38,.10,.35,MAT.gold,x,3.47,back+.14);
  }
}
function flowerBox(root,x,depth){
  const z=-depth/2+.39;
  block(root,1.55,.24,.30,MAT.beam,x,1.42,z);
  for(let j=0;j<7;j++){
    const xj=x+(j-3)*.22;
    sphere(root,.17,MAT.leaf,xj,1.63,z+.02,1,.7,.75);
    sphere(root,.09,j%3===0?MAT.lilac:MAT.pink,
      xj,1.74,z+.05,.9,.65,1);
  }
}
function landscapePrint(root,width,depth){
  const z=-depth/2+.33;
  block(root,1.10,.77,.13,MAT.beam,0,2.63,z);
  block(root,.92,.60,.14,MAT.trim,0,2.63,z+.09);
  block(root,.83,.51,.12,MAT.canvas,0,2.63,z+.19);
  sphere(root,.16,MAT.gold,.19,2.75,z+.27);
  sphere(root,.25,MAT.sage,-.24,2.45,z+.27,1,.55,.6);
  sphere(root,.18,MAT.leaf,.25,2.43,z+.27,1,.48,.5);
}
function botanicalGarland(root,width,depth,height){
  const flowerGeometry=new THREE.SphereGeometry(.08,8,6);
  const leafGeometry=new THREE.SphereGeometry(.085,8,6);
  const blossoms=[],leaves=[];
  for(let i=0;i<22;i++){
    const x=-width/2+.34+(i+.5)*(width-.68)/22;
    const y=height-.52+Math.sin(i*.86)*.11;
    blossoms.push([x,y,-depth/2+.30]);
    leaves.push([x-.11,y-.07,-depth/2+.29]);
  }
  const flowerBatch=new THREE.InstancedMesh(flowerGeometry,MAT.pink,blossoms.length);
  const leafBatch=new THREE.InstancedMesh(leafGeometry,MAT.leaf,leaves.length);
  const obj=new THREE.Object3D();
  blossoms.forEach(([x,y,z],i)=>{
    obj.position.set(x,y,z);obj.scale.set(1,.73,1);
    obj.updateMatrix();flowerBatch.setMatrixAt(i,obj.matrix);
  });
  leaves.forEach(([x,y,z],i)=>{
    obj.position.set(x,y,z);obj.scale.set(1.3,.55,.7);
    obj.updateMatrix();leafBatch.setMatrixAt(i,obj.matrix);
  });
  flowerBatch.instanceMatrix.needsUpdate=true;
  leafBatch.instanceMatrix.needsUpdate=true;
  root.add(flowerBatch,leafBatch);
}
function trimRoom(root,width,depth,height){
  const back=-depth/2+.19,left=-width/2+.19;
  // Chair rail, wainscoting, exposed corner timbers, crown molding.
  block(root,width,.075,.22,MAT.bevel,0,1.02,back);
  block(root,.22,.075,depth,MAT.bevel,left,1.02,0);
  block(root,width,.18,.24,MAT.beam,0,.25,back);
  block(root,.24,.18,depth,MAT.beam,left,.25,0);
  block(root,width,.16,.26,MAT.trim,0,height-.25,back);
  block(root,.26,.16,depth,MAT.trim,left,height-.25,0);
  for(const x of [-width/2+.11,width/2-.11]){
    block(root,.20,height,.18,MAT.beam,x,height/2,back);
  }
  for(const z of [-depth/2+.09,depth/2-.09]){
    block(root,.18,height,.20,MAT.beam,left,height/2,z);
  }
  for(let i=0;i<17;i++){
    const x=-width/2+.36+(i+.5)*(width-.72)/17;
    block(root,.035,.48,.055,MAT.bevel,x,.66,back+.08);
  }
  for(let i=0;i<14;i++){
    const z=-depth/2+.35+(i+.5)*(depth-.7)/14;
    block(root,.055,.48,.035,MAT.bevel,left+.08,.66,z);
  }
  // Tiny scalloped cornice gives a gently fairy-tale profile.
  const beads=new THREE.InstancedMesh(
    new THREE.SphereGeometry(.10,8,6),MAT.trim,26);
  const dummy=new THREE.Object3D();
  for(let i=0;i<26;i++){
    const x=-width/2+.24+(i+.5)*(width-.48)/26;
    dummy.position.set(x,height-.36,back+.13);
    dummy.scale.set(1,.6,.58);
    dummy.updateMatrix();beads.setMatrixAt(i,dummy.matrix);
  }
  beads.instanceMatrix.needsUpdate=true;
  root.add(beads);
}
export function decorateFairyRoom(root,{width=9,depth=8,height=4}={}){
  trimRoom(root,width,depth,height);
  for(const x of [-2.15,2.1])flowerBox(root,x,depth);
  landscapePrint(root,width,depth);
  botanicalGarland(root,width,depth,height);
  sconces(root,width,depth);
  return root;
}
