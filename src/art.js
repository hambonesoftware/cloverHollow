import * as THREE from 'three';

// Original procedural art, tuned to the proportions of Willowbend's chibi characters.
export function material(color, options={}) { return new THREE.MeshToonMaterial({ color, ...options }); }
export function box(w,h,d,color,x=0,y=0,z=0) {
  const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),typeof color==='number'?material(color):color);
  o.position.set(x,y,z); o.castShadow=h>.35; o.receiveShadow=true; return o;
}
export function sphere(r,color,x=0,y=0,z=0) {
  const o=new THREE.Mesh(new THREE.SphereGeometry(r,16,12),material(color));
  o.position.set(x,y,z);o.castShadow=true;return o;
}
export function cylinder(rt,rb,h,color,x=0,y=0,z=0,sides=10) {
  const o=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,sides),material(color));
  o.position.set(x,y,z);o.castShadow=true;return o;
}
export function cone(r,h,color,x=0,y=0,z=0,sides=10) {
  return cylinder(0,r,h,color,x,y,z,sides);
}
export function flat(w,d,color,x=0,y=0,z=0) {
  const o=new THREE.Mesh(new THREE.PlaneGeometry(w,d),material(color,{side:THREE.DoubleSide}));
  o.rotation.x=-Math.PI/2;o.position.set(x,y,z);o.receiveShadow=true;return o;
}
export function sign(text,width=5) {
  const c=document.createElement('canvas');c.width=512;c.height=112;
  const p=c.getContext('2d');
  p.fillStyle='#fff0cc';p.beginPath();p.roundRect(7,6,498,100,32);p.fill();
  p.strokeStyle='#b38c6d';p.lineWidth=6;p.stroke();
  p.fillStyle='#5d463a';p.textAlign='center';p.textBaseline='middle';
  p.font='bold 42px system-ui';p.fillText(text,256,57,466);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true}));
  s.scale.set(width,width*112/512,1);return s;
}
export function makePerson(kind='kid',colors={}) {
  const g=new THREE.Group();
  const skin=colors.skin??(kind==='frog'?0x9cc898:kind==='bear'?0xb18b6d:kind==='duck'?0xffedc7:0xf5cba9);
  const shirt=colors.shirt??0x83b6a3,hair=colors.hair??0x66524d;
  g.add(sphere(.58,skin,0,1.54,0));
  const torso=sphere(.4,shirt,0,.8,0);torso.scale.set(1,1.1,.88);g.add(torso);
  const legs=[],arms=[];
  for(const side of [-1,1]){
    const l=new THREE.Group();l.position.set(side*.19,.48,0);
    l.add(cylinder(.12,.13,.4,colors.trousers??0x668b8b,0,-.2,0));
    const boot=sphere(.16,0x644f50,0,-.39,.1);boot.scale.set(1,.65,1.3);l.add(boot);g.add(l);legs.push(l);
    const a=new THREE.Group();a.position.set(side*.39,1.04,0);
    const sleeve=sphere(.16,shirt,0,-.16,0);sleeve.scale.set(.8,1.45,.82);
    a.add(sleeve,sphere(.12,skin,0,-.35,.03));g.add(a);arms.push(a);
    const eye=sphere(.065,0x453742,side*.235,1.57,.54);eye.scale.z=.6;g.add(eye);
    g.add(sphere(.025,0xffffff,side*.235+.02,1.595,.574));
    const blush=sphere(.105,0xe9a4a7,side*.4,1.38,.47);blush.scale.set(1,.55,.25);g.add(blush);
  }
  const smile=new THREE.Mesh(new THREE.TorusGeometry(.052,.015,5,12,Math.PI),material(0x704b50));
  smile.rotation.z=Math.PI;smile.position.set(0,1.38,.59);g.add(smile);
  if(kind==='kid'){
    const cap=sphere(.61,hair,0,1.91,-.06);cap.scale.set(1.03,.55,1.05);g.add(cap);
    for(const s of [-1,1])g.add(sphere(.18,hair,s*.43,1.91,.07));
  }
  if(kind==='bunny')for(const s of [-1,1]){
    const e=sphere(.18,skin,s*.25,2.23,-.03);e.scale.set(.7,2.6,.8);e.rotation.z=-s*.2;g.add(e);
  }
  if(kind==='cat')for(const s of [-1,1]){
    const e=cone(.26,.5,skin,s*.39,2.16,-.05,4);e.rotation.y=Math.PI/4;g.add(e);
  }
  if(kind==='bear')for(const s of [-1,1])g.add(sphere(.2,skin,s*.45,1.99,-.06));
  if(kind==='frog')for(const s of [-1,1])g.add(sphere(.2,skin,s*.4,1.97,-.05));
  if(kind==='duck'){const bill=sphere(.21,0xf0b16a,0,1.41,.56);bill.scale.set(1.2,.46,1.2);g.add(bill);}
  if(kind==='dog')for(const s of [-1,1]){
    const ear=sphere(.24,0x9a745e,s*.52,1.86,-.06);ear.scale.set(.68,1.45,.65);ear.rotation.z=-s*.32;g.add(ear);
  }
  if(kind==='hedgehog'){
    for(let n=0;n<13;n++){
      const a=(n/12-.5)*Math.PI*1.25;
      const spike=cone(.13,.4,0x886b5b,Math.sin(a)*.5,1.67+Math.cos(a)*.41,-.35,5);
      spike.rotation.z=-a;g.add(spike);
    }
    for(const s of [-1,1]){
      const lens=new THREE.Mesh(new THREE.TorusGeometry(.16,.023,6,17),material(0xb38d5d));
      lens.position.set(s*.23,1.58,.593);g.add(lens);
    }
    g.add(box(.13,.03,.03,0xb38d5d,0,1.58,.59));
  }
  g.userData.legs=legs;g.userData.arms=arms;
  return g;
}
export function animatePerson(g,time,moving=false,phase=0){
  const swing=moving?Math.sin(time*8+phase)*.42:0;
  g.userData.legs[0].rotation.x=swing;g.userData.legs[1].rotation.x=-swing;
  g.userData.arms[0].rotation.x=-swing*.7;g.userData.arms[1].rotation.x=swing*.7;
  g.rotation.z=Math.sin(time*1.6+phase)*(moving?.02:.008);
}
export function tree(x,z,scale=1,color=0x85b680) {
  const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);
  g.add(cylinder(.28,.35,2.3,0x987455,0,1.15,0));
  for(const [dx,dy,dz,r] of [[0,3.2,0,1.38],[-.9,2.85,.1,1.05],[.85,2.95,0,1.1],[.12,3.83,-.4,.94]])
    g.add(sphere(r,color,dx,dy,dz));
  return g;
}
export function flower(x,z,color=0xe8a0ae){
  const g=new THREE.Group();g.position.set(x,0,z);
  g.add(cylinder(.025,.025,.38,0x77a875,0,.19,0,6));
  const petal=sphere(.16,color,0,.42,0);petal.scale.set(1,.7,1);g.add(petal);
  g.add(sphere(.065,0xffe4a0,0,.46,.02));return g;
}
export function gardenBench(x,z,r=0) {
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=r;
  g.add(box(2,.15,.7,0xb98962,0,.67,0));
  g.add(box(2,.78,.14,0xb98962,0,1.08,-.32));
  for(const a of [-.79,.79])g.add(box(.13,.62,.59,0x76655b,a,.31,0));return g;
}
export function lampPost(x,z) {
  const g=new THREE.Group();g.position.set(x,0,z);
  g.add(cylinder(.06,.09,3.1,0x6f665d,0,1.55,0,9));
  g.add(sphere(.3,0xffe2a1,0,3.12,0));
  g.add(cone(.42,.32,0x55847b,0,3.44,0,8));return g;
}
export function building({x,z,w=8,d=7,wall=0xffe9cd,roof=0xc98572,name='',shop=false}) {
  const g=new THREE.Group();g.position.set(x,0,z);
  g.add(box(w+.35,.35,d+.35,0xc6b8a2,0,.18,0));
  g.add(box(w,3.75,d,wall,0,2.05,0));
  const roofMesh=cone(Math.max(w,d)*.73,2.8,roof,0,5.13,0,4);
  roofMesh.rotation.y=Math.PI/4;roofMesh.scale.z=d/w;g.add(roofMesh);
  g.add(box(1.4,2.36,.12,0xffe9cb,0,1.3,d/2+.07));
  g.add(box(1.15,2.02,.14,shop?0xa5b4a4:0x8caea5,0,1.28,d/2+.17));
  g.add(sphere(.08,0xffd57f,.4,1.3,d/2+.28));
  g.add(box(2.05,.18,.66,0xc6af8f,0,.13,d/2+.46));
  for(const sx of [-1,1]){
    const px=sx*(w/2-1.45);
    g.add(box(1.25,1.38,.12,0xfff0d7,px,2.45,d/2+.1));
    g.add(box(1.01,1.12,.14,0x91c1c6,px,2.45,d/2+.2));
    g.add(box(.12,1.14,.17,0xfff2d7,px,2.45,d/2+.29));
    g.add(box(1.06,.12,.17,0xfff2d7,px,2.45,d/2+.28));
    g.add(box(1.44,.2,.53,0xb68966,px,1.74,d/2+.38));
    for(let j=-1;j<=1;j++)g.add(sphere(.18,j===0?0xf5cd82:0xe797a6,px+j*.36,1.99,d/2+.49));
  }
  if(name){
    const board=sign(name,Math.max(3.1,Math.min(5.6,w*.7)));
    board.position.set(0,4.13,d/2+.22);g.add(board);
  }
  return g;
}
export function furniture(type) {
  const g=new THREE.Group();const wood=0xb88865,cream=0xffefcc,teal=0x8db3a3;
  switch(type){
    case 'bed':
      g.add(box(2.1,.35,2.65,wood,0,.45,0),box(2,.29,2.38,cream,0,.78,0));
      g.add(box(2.1,1.14,.17,wood,0,.86,-1.25),box(1.98,.14,1.38,0xa1b6d7,0,.97,.55));
      for(const sx of [-.48,.48])g.add(box(.77,.18,.53,0xffffff,sx,.99,-.66));break;
    case 'sofa':
      g.add(box(2.6,.48,1.16,0x70988b,0,.5,0),box(2.6,.96,.3,0x70988b,0,1,-.44));
      for(const sx of [-1.18,1.18])g.add(box(.24,.79,1.11,0x628779,sx,.79,0));
      for(const sx of [-.54,.54])g.add(box(.96,.23,.76,0x96b5a5,sx,.81,.14));break;
    case 'table':
      g.add(box(1.7,.17,1.5,0xd1a476,0,1.26,0));
      for(const sx of [-.67,.67])for(const sz of [-.56,.56])g.add(box(.14,1.2,.14,wood,sx,.61,sz));break;
    case 'chair':
      g.add(box(.85,.16,.82,0xd2aa83,0,.78,0),box(.85,1,.13,wood,0,1.27,-.34));
      for(const sx of [-.31,.31])for(const sz of [-.29,.29])g.add(box(.11,.77,.11,wood,sx,.39,sz));break;
    case 'shelf':
      for(const sx of [-.59,.59])g.add(box(.13,2.52,.56,wood,sx,1.26,0));
      for(const y of [.12,.83,1.55,2.3])g.add(box(1.35,.13,.56,wood,0,y,0));
      for(const [x,c] of [[-.42,0xe99b8e],[-.19,0x9eb6cd],[.05,0xe9c67f],[.3,0xa8b48a]])g.add(box(.18,.48,.34,c,x,1.85,0));break;
    case 'lamp':
      g.add(cylinder(.24,.3,.16,wood,0,.08,0),cylinder(.055,.055,1.32,wood,0,.8,0),cone(.49,.72,0xffd899,0,1.51,0));break;
    case 'plant':
      g.add(cone(.4,.78,0xc78e77,0,.4,0));
      for(const [x,z,r] of [[0,0,.48],[-.26,.1,.34],[.22,-.12,.32]])g.add(sphere(r,0x78aa7b,x,1.03+(r-.3)*.7,z));break;
    case 'dresser':
      g.add(box(1.5,1.54,.7,wood,0,.77,0));
      for(const y of [.43,.9,1.33]){g.add(box(1.26,.3,.045,0xe0b88a,0,y,.37),sphere(.05,0xffdb94,0,y,.42));}break;
    case 'rug':{
      const m=new THREE.Mesh(new THREE.CylinderGeometry(1.15,1.15,.045,28),material(0xe2b8a6));
      m.scale.z=1;m.position.y=.035;g.add(m);
      for(let i=0;i<10;i++){const a=i*Math.PI/5;g.add(sphere(.16,0xffe8c3,Math.cos(a)*.76,.068,Math.sin(a)*.76));}
      break;
    }
    case 'teapot':
      g.add(sphere(.25,0xe9af9c,0,.22,0));
      g.add(cylinder(.11,.11,.08,0xf6dcc5,0,.47,0));
      g.add(sphere(.075,0xc88585,0,.54,0));
      const handle=new THREE.Mesh(new THREE.TorusGeometry(.17,.055,8,14),material(0xe9af9c));
      handle.position.set(.3,.29,0);g.add(handle);
      g.add(cone(.13,.38,0xe9af9c,-.33,.3,0,9));break;
    case 'stool':
      g.add(cylinder(.43,.43,.18,wood,0,.68,0));
      for(let i=0;i<3;i++){const a=i*Math.PI*2/3;g.add(box(.1,.68,.1,wood,Math.cos(a)*.27,.34,Math.sin(a)*.27));}break;
    case 'clock':
      g.add(box(.75,1.14,.42,wood,0,.64,0));
      const face=new THREE.Mesh(new THREE.CircleGeometry(.29,24),material(cream));
      face.position.set(0,.78,.24);g.add(face);
      g.add(box(.03,.22,.03,0x69574f,0,.84,.29),box(.16,.03,.03,0x69574f,.08,.78,.3));break;
  }
  g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  return g;
}
