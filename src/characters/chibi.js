import * as THREE from 'three';
import { capsule,roundedBox,illustratedMesh,fairyMaterial,PALETTE } from '../visual/gfx.js';
import { animationState } from './animation.js';

const SKINS={kid:0xf2c9a7,cat:0xe7bd94,bunny:0xf1dfce,bear:0xb68c68,duck:0xffe9b4,dog:0xd4b18d,frog:0x9dca9e,hedgehog:0xc9ad91};
const at=(o,x,y,z)=>{o.position.set(x,y,z);return o;};
function ell(r,color,x,y,z,sx=1,sy=1,sz=1,quality='medium'){
  const m=illustratedMesh(new THREE.SphereGeometry(r,quality==='low'?10:16,quality==='low'?8:12),color,{quality,outline:0});
  m.scale.set(sx,sy,sz);return at(m,x,y,z);
}
function shape(g,r,length,color,x,y,z,quality){
  const m=illustratedMesh(capsule(r,length,quality),color,{quality,outline:0});
  g.add(at(m,x,y,z));return m;
}
export function createChibi(kind='kid',colors={},options={}){
  const quality=options.quality??'medium',root=new THREE.Group();
  const skin=colors.skin??SKINS[kind]??SKINS.kid;
  const shirt=colors.shirt??PALETTE.moss,hair=colors.hair??0x66514b;
  const pants=colors.trousers??0x6f8b93,shoe=colors.shoes??0x6e5552;
  const body=new THREE.Group();root.add(body);
  const torso=ell(.43,shirt,0,.78,0,1,1.08,.86,quality);body.add(torso);
  const collar=ell(.24,0xffead4,0,1.095,.13,1,.25,.85,quality);body.add(collar);
  const belt=ell(.4,0xa78c72,0,.55,0,1,.13,.8,quality);body.add(belt);
  const legs=[],arms=[],eyes=[],ears=[];
  for(const side of [-1,1]){
    const leg=new THREE.Group();leg.position.set(side*.19,.48,0);
    shape(leg,.13,.2,pants,0,-.17,0,quality);
    const boot=ell(.18,shoe,0,-.37,.11,1,.7,1.45,quality);leg.add(boot);
    body.add(leg);legs.push(leg);
    const arm=new THREE.Group();arm.position.set(side*.39,1.04,0);
    const sleeve=shape(arm,.15,.21,shirt,0,-.18,0,quality);
    sleeve.rotation.z=side*.14;
    arm.add(ell(.135,skin,0,-.41,.035,1,1,1,quality));
    body.add(arm);arms.push(arm);
  }
  const head=new THREE.Group();head.position.y=1.53;body.add(head);
  head.add(ell(.62,skin,0,0,0,1.06,.98,1,quality));
  for(const side of [-1,1]){
    const eye=ell(.102,0x352e3e,side*.235,-.015,.578,1,1.32,.46,quality);
    eye.rotation.y=side*.3;head.add(eye);eyes.push(eye);
    head.add(ell(.034,0xffffff,side*.235+.027,.048,.623,1,1,.55,quality));
    head.add(ell(.019,0xffffff,side*.235-.032,-.055,.628,1,1,.5,quality));
    const brow=ell(.11,hair,side*.235,.19,.552,1,.23,.34,quality);
    brow.rotation.z=-side*.15;head.add(brow);
    head.add(ell(.11,0xe9a5a4,side*.43,-.2,.445,1,.48,.22,quality));
  }
  let mouthZ=.61;
  if(['cat','bear','dog','hedgehog'].includes(kind)){
    head.add(ell(.23,kind==='bear'?0xe6c9a5:0xffe6d2,0,-.2,.51,1.24,.7,.65,quality));
    head.add(ell(.065,0x71515b,0,-.12,.66,1.1,.65,.75,quality));
    mouthZ=.65;
  }
  if(kind==='duck'){
    head.add(ell(.22,0xe7a264,0,-.19,.59,1.35,.42,1.15,quality));
    mouthZ=.7;
  }
  const mouth=new THREE.Mesh(new THREE.TorusGeometry(.057,.015,6,12,Math.PI),fairyMaterial(0x6c4852));
  mouth.rotation.z=Math.PI;head.add(at(mouth,0,-.25,mouthZ));
  if(kind==='kid'){
    head.add(ell(.62,hair,0,.36,-.08,1.04,.55,1.03,quality));
    for(const side of [-1,0,1])head.add(ell(.2,hair,side*.3,.43,.37,1,.65,.75,quality));
  }
  if(kind==='cat'){
    for(const side of [-1,1]){
      const ear=new THREE.Group();ear.position.set(side*.4,.48,0);
      const cone=new THREE.Mesh(new THREE.ConeGeometry(.24,.47,12),fairyMaterial(skin));
      cone.rotation.z=-side*.3;ear.add(cone);
      const inside=ell(.12,0xe7a1a8,0,.04,.13,.75,1.3,.35,quality);ear.add(inside);
      head.add(ear);ears.push(ear);
    }
  }
  if(kind==='bunny'){
    for(const side of [-1,1]){
      const ear=new THREE.Group();ear.position.set(side*.24,.32,-.03);
      ear.rotation.z=side*.15;
      shape(ear,.115,.2,skin,0,.18,0,quality);
      const pink=ell(.085,0xeaaab4,0,.19,.11,.8,1.65,.4,quality);ear.add(pink);
      head.add(ear);ears.push(ear);
    }
  }
  if(kind==='bear'||kind==='frog'){
    for(const side of [-1,1]){
      head.add(ell(.2,skin,side*.46,.44,-.02,1,1,.85,quality));
      if(kind==='bear')head.add(ell(.11,0x9c6d65,side*.46,.44,.13,1,1,.4,quality));
    }
  }
  if(kind==='dog'){
    for(const side of [-1,1]){
      const ear=new THREE.Group();ear.position.set(side*.5,.26,-.02);
      ear.add(ell(.2,0x987158,0,-.24,0,.62,1.35,.78,quality));
      head.add(ear);ears.push(ear);
    }
  }
  if(kind==='hedgehog'){
    for(let i=0;i<13;i++){
      const a=(i/12-.5)*Math.PI*1.2;
      const spike=new THREE.Mesh(new THREE.ConeGeometry(.11,.38,7),fairyMaterial(0x846c60));
      spike.rotation.z=-a;head.add(at(spike,Math.sin(a)*.54,Math.cos(a)*.46,-.3));
    }
    for(const side of [-1,1]){
      const glass=new THREE.Mesh(new THREE.TorusGeometry(.16,.025,6,16),fairyMaterial(0xb78e5d));
      head.add(at(glass,side*.235,-.015,.635));
    }
    head.add(ell(.12,0xb78e5d,0,-.015,.63,1,.13,.3,quality));
  }
  if(kind==='duck')head.add(ell(.13,skin,0,.59,-.06,.65,1.25,.8,quality));
  // Personality accents, without changing the underlying species silhouette.
  if(kind==='bear'){
    const apron=illustratedMesh(roundedBox(.56,.52,.12,.09),0xe8d4a9,{quality,outline:0});
    body.add(at(apron,0,.79,.38));
  }
  if(kind==='frog'){
    const scarf=ell(.35,0xd6b3bd,0,1.13,.01,1,.2,.93,quality);body.add(scarf);
  }
  if(kind==='hedgehog'){
    const badge=ell(.12,0xe3c575,.26,.87,.35,1,.85,.35,quality);body.add(badge);
  }
  const tail=['cat','dog','bunny'].includes(kind)?new THREE.Group():null;
  if(tail){
    tail.position.set(.2,.59,-.35);
    tail.add(ell(kind==='bunny'?.16:.12,skin,0,0,-.12,1,kind==='bunny'?1:1.8,1,quality));
    body.add(tail);
  }
  const rig={body,head,legs,arms,eyes,ears,mouth,tail};
  ears.forEach((ear,i)=>{ear.userData.offset=i*1.7;});
  root.userData.rig=rig;
  root.userData.animation=animationState();
  root.userData.legs=legs;root.userData.arms=arms;
  root.userData.kind=kind;root.userData.quality=quality;
  return root;
}
