import * as THREE from 'three';
import { designBuilding, seeded } from './design.js';
import { buildApprovedCottage } from './approved-cottage.js';

const materialCache=new Map();
function mat(color,roughness=.87) {
  const key=color+':'+roughness;
  if(!materialCache.has(key))materialCache.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness:0}));
  return materialCache.get(key);
}
function mesh(geometry,color,parent,shadow=true) {
  const object=new THREE.Mesh(geometry,mat(color));
  object.castShadow=shadow;object.receiveShadow=true;parent.add(object);return object;
}
function cube(parent,w,h,d,color,x,y,z) {
  const m=mesh(new THREE.BoxGeometry(w,h,d),color,parent);
  m.position.set(x,y,z);return m;
}
function ball(parent,r,color,x,y,z,sx=1,sy=1,sz=1) {
  const m=mesh(new THREE.SphereGeometry(r,12,8),color,parent,false);
  m.position.set(x,y,z);m.scale.set(sx,sy,sz);return m;
}
function tube(parent,points,r,color,segments=14) {
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return mesh(new THREE.TubeGeometry(curve,segments,r,5,false),color,parent,false);
}
function surface(parent,cols,rows,point,color) {
  const verts=[],uv=[],indices=[];
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
    verts.push(...point(i/cols,j/rows));uv.push(i/cols,j/rows);
  }
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const a=j*(cols+1)+i,b=a+cols+1;
    indices.push(a,b,a+1,b,b+1,a+1);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  g.setIndex(indices);g.computeVertexNormals();
  const o=mesh(g,color,parent);o.material=mat(color).clone();o.material.side=THREE.DoubleSide;
  return o;
}
function arch(parent,w,h,depth,color,x,y,z,round=true) {
  const shape=new THREE.Shape();
  const shoulder=h-w*.46;
  shape.moveTo(-w/2,0);shape.lineTo(w/2,0);shape.lineTo(w/2,shoulder);
  if(round)shape.absarc(0,shoulder,w/2,0,Math.PI,false);
  else shape.lineTo(0,h);
  shape.lineTo(-w/2,0);
  const g=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:2,curveSegments:12});
  const o=mesh(g,color,parent);o.position.set(x,y,z);return o;
}
function window(parent,x,y,z,scale,palette,round=true) {
  arch(parent,1.05*scale,1.36*scale,.09,palette.timber,x,y,z,round);
  arch(parent,.83*scale,1.1*scale,.11,0x9ecad1,x,y+.09*scale,z+.065,round);
  cube(parent,.08*scale,1.1*scale,.13,palette.trim,x,y+.55*scale,z+.2);
  cube(parent,.9*scale,.075*scale,.15,palette.trim,x,y+.55*scale,z+.2);
  cube(parent,1.22*scale,.14*scale,.3,palette.stone,x,y-.03,z+.22);
  cube(parent,1.2*scale,.1*scale,.22,palette.timber,x,y+1.35*scale,z+.08);
}
function door(parent,z,wallHeight,palette,circular=false) {
  if(circular){
    const ring=mesh(new THREE.TorusGeometry(1.21,.19,9,36),palette.timber,parent);
    ring.position.set(0,1.56,z+.13);
    const disk=mesh(new THREE.CircleGeometry(1.15,40),0x98704b,parent);
    disk.position.set(0,1.56,z+.14);
    for(let i=-3;i<=3;i++)cube(parent,.07,2.2,.055,0x74543c,i*.29,1.56,z+.19);
    ball(parent,.105,0xe7c36d,.69,1.5,z+.26);
  }else{
    arch(parent,1.55,2.55,.14,palette.timber,0,.03,z+.09);
    arch(parent,1.25,2.35,.16,0x9b7251,0,.06,z+.2);
    for(let i=-2;i<=2;i++)cube(parent,.055,1.8,.06,0x7d573d,i*.23,1.08,z+.39);
    ball(parent,.09,0xf2d394,.39,1.23,z+.45);
  }
  cube(parent,2.1,.14,.62,palette.stone,0,.055,z+.55);
}
function chimney(parent,x,z,y,palette) {
  cube(parent,.7,1.65,.74,palette.stone,x,y,z);
  cube(parent,.95,.19,.97,palette.timber,x,y+.89,z);
  for(let k=0;k<3;k++)cube(parent,.75,.045,.78,palette.trim,x,y-.6+k*.42,z);
}
function instanced(parent,geometry,color,items,transform) {
  if(!items.length)return;
  const batch=new THREE.InstancedMesh(geometry,mat(color),items.length);
  const dummy=new THREE.Object3D();
  items.forEach((item,i)=>{dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);
    transform(dummy,item,i);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);});
  batch.instanceMatrix.needsUpdate=true;batch.castShadow=false;batch.receiveShadow=true;parent.add(batch);
}
function flowerBeds(parent,p,rng) {
  const w=p.w,d=p.d,front=d/2;
  for(const side of [-1,1]){
    const x=side*(w/2-.58);
    cube(parent,.85,.24,1.12,p.palette.stone,x,.12,front-.64);
    const flowers=[];
    for(let i=0;i<9;i++)flowers.push({x:x+(rng()-.5)*.7,z:front-.65+(rng()-.5)*.8,h:.35+rng()*.27});
    for(const f of flowers)tube(parent,[[f.x,.18,f.z],[f.x,.22+f.h*.4,f.z],[f.x,.18+f.h,f.z]],.025,p.palette.foliage,5);
    for(let i=0;i<flowers.length;i++){
      const f=flowers[i];ball(parent,.13,[0xf0a3b6,0xffd484,0xe6c9ee][i%3],f.x,.18+f.h,f.z);
    }
  }
}
function storybook(group,p,rng) {
  const {w,d,wallHeight:h,roofCurvature:c,roofOverhang:o,palette:P}=p;
  const front=d/2;
  // The front and rear walls follow the exact swept roof underside, not a box.
  const roofY=x=>h+.95+1.25*c*(1-Math.pow(Math.abs(x)/(w/2+o),1.7));
  const wallProfile=x=>roofY(x)-.1;
  // Four continuous wall faces, with front/rear gables reaching the roof skin.
  for(const x of [-w/2,w/2])surface(group,12,8,(u,v)=>{
    const z=(u-.5)*d;
    return [x,v*wallProfile(x),z];
  },P.wall);
  for(const z of [-d/2,d/2])surface(group,28,10,(u,v)=>{
    const x=(u-.5)*w;
    return [x,wallProfile(x)*v,z];
  },P.wall);
  for(const x of [-w/2,w/2])cube(group,.22,h,d,P.timber,x,h/2,0);
  for(let i=0;i<5;i++){
    const x=-w/2+i*w/4;
    for(const z of [-front,front])tube(group,[[x,0,z+.025],[x,h*.45,z+.025],[x,wallProfile(x)-.05,z+.025]],.075,P.timber,8);
  }
  // Roof is a continuous swept mesh; the eaves curl down and then up.
  const half=w/2+o;
  const roof=(x,z)=>{
    const q=Math.abs(x)/half;
    return h+.95+1.25*c*(1-Math.pow(q,1.7))-.28*Math.pow(q,8)+
      .17*Math.sin(Math.PI*z/d)*Math.pow(q,5);
  };
  surface(group,32,16,(u,v)=>{
    const x=(u-.5)*2*half,z=(v-.5)*(d+o*2);
    return [x,roof(x,z),z];
  },P.roof);
  // Shingles are batched into one instanced mesh per cottage.
  const shingles=[];
  for(let j=0;j<11;j++)for(let i=0;i<20;i++){
    const x=(-.5+(i+.5+(j%2)*.5)/20)*2*half;
    const z=-d/2-o+(j+.5)*(d+o*2)/11;
    if(Math.abs(x)>half-.08)continue;
    shingles.push({x,z,y:roof(x,z)+.055,tilt:(roof(x+.05,z)-roof(x-.05,z))/.1,scale:.8+rng()*.28});
  }
  instanced(group,new THREE.BoxGeometry(.37,.075,.5),P.trim,shingles,(dummy,s)=>{
    dummy.position.set(s.x,s.y,s.z);dummy.rotation.z=Math.atan(s.tilt);dummy.scale.set(s.scale,1,s.scale);
  });
  window(group,-w*.3,1.55,front+.07,.85,P);
  window(group,w*.3,1.55,front+.07,.85,P);
  door(group,front,h,P);
  chimney(group,-w*.31,-d*.19,roof(-w*.31,-d*.19)+.52,P);
}
function toadstool(group,p,rng) {
  const {w,d,wallHeight:h,palette:P}=p;
  const radius=Math.min(w,d)*.45;
  // Tapered, organically undulating wall flows directly into the cap's gills.
  surface(group,32,10,(u,v)=>{
    const a=u*Math.PI*2;
    const r=radius*(.91+.1*v)+.055*Math.sin(a*5+p.asymmetry);
    return [Math.sin(a)*r,v*h,Math.cos(a)*r*.9];
  },P.wall);
  const capR=radius+Math.min(.43,p.roofOverhang);
  surface(group,40,14,(u,v)=>{
    const a=u*Math.PI*2,r=v*capR;
    const wave=1+.035*Math.sin(a*7)+.02*Math.sin(a*11);
    return [Math.sin(a)*r*wave,h+.33+1.45*p.roofCurvature*(1-v*v)+.08*Math.sin(a*5)*v,Math.cos(a)*r*.9*wave];
  },P.roof);
  // Underside gills visually meet the tapered wall at the rim.
  const gillColor=0xe6c5aa;
  surface(group,40,8,(u,v)=>{
    const a=u*Math.PI*2,r=radius*.83+v*(capR-radius*.83);
    return [Math.sin(a)*r,h+.26+.12*(1-v),Math.cos(a)*r*.9];
  },gillColor);
  const gills=[];
  for(let i=0;i<32;i++){
    const a=i*Math.PI*2/32;
    gills.push({a});
  }
  for(const g of gills)tube(group,[
    [Math.sin(g.a)*radius*.88,h+.255,Math.cos(g.a)*radius*.88*.9],
    [Math.sin(g.a)*capR*.95,h+.25,Math.cos(g.a)*capR*.95*.9]
  ],.025,P.timber,3);
  // Spots sit on the cap surface rather than hovering above it.
  const spots=[];
  for(let i=0;i<29;i++){
    const a=rng()*Math.PI*2,v=.15+rng()*.73,r=v*capR;
    const y=h+.33+1.45*p.roofCurvature*(1-v*v)+.08*Math.sin(a*5)*v;
    spots.push({x:Math.sin(a)*r,y:y+.035,z:Math.cos(a)*r*.9,r:.13+rng()*.18});
  }
  instanced(group,new THREE.SphereGeometry(1,9,6),P.trim,spots,(dummy,s)=>{
    dummy.position.set(s.x,s.y,s.z);dummy.scale.set(s.r,.045,s.r);
  });
  const face=radius*.9+.045;
  window(group,-radius*.51,1.5,face*.85,.62,P);
  window(group,radius*.51,1.5,face*.85,.62,P);
  door(group,face,h,P);
}
function moonspire(group,p,rng) {
  // Main house is fully integrated swoop architecture, with a tower grafted
  // into its side wall and roof volume, not floating as a detached primitive.
  storybook(group,p,rng);
  const {w,d,wallHeight:h,palette:P}=p;
  const tx=-w*.32,tz=-d*.2,r=Math.min(w,d)*.19;
  const towerHeight=h+3.25;
  surface(group,18,12,(u,v)=>{
    const a=u*Math.PI*2,rr=r*(1-.19*v)+.035*Math.sin(a*3+v*3);
    return [tx+Math.cos(a)*rr,towerHeight*v,tz+Math.sin(a)*rr];
  },P.wall);
  for(let k=0;k<4;k++){
    const a=k*Math.PI/2;
    tube(group,[[tx+Math.cos(a)*r,0,tz+Math.sin(a)*r],
      [tx+Math.cos(a)*(r*.9),h,tz+Math.sin(a)*(r*.9)],
      [tx+Math.cos(a)*(r*.78),towerHeight,tz+Math.sin(a)*(r*.78)]],.065,P.timber,12);
  }
  surface(group,24,12,(u,v)=>{
    const a=u*Math.PI*2,radius=(1-v)*r*1.55;
    return [tx+Math.cos(a)*radius+.27*v*v,
      towerHeight+.16+v*2.25+.12*Math.sin(a*3)*Math.sin(v*Math.PI),
      tz+Math.sin(a)*radius];
  },P.roof);
  for(let i=0;i<3;i++){
    const a=(i+.25)*Math.PI*2/3;
    const x=tx+Math.sin(a)*r*.87,z=tz+Math.cos(a)*r*.87;
    const glass=ball(group,.24,0x9fd0d1,x,towerHeight*.73,z,.65,1.6,.3);
    glass.rotation.y=a;
  }
  ball(group,.22,0xe4c887,tx+.27,towerHeight+2.45,tz);
}
function hobbit(group,p,rng) {
  const {w,d,palette:P}=p,front=d/2;
  // One terrain mesh is BOTH the hillside and the grass roof.
  // Height falls smoothly to grade at the back/sides and forms an arched
  // exposed front cutaway; no rectangular house or green dome is underneath.
  const height=(x,z)=>{
    const sx=Math.max(0,1-Math.pow(Math.abs(x)/(w*.54),2));
    const sz=Math.max(0,1-Math.pow(Math.max(0,-z)/(d*.55),2));
    return .09+4.35*Math.pow(sx,.58)*Math.pow(sz,.25);
  };
  surface(group,32,22,(u,v)=>{
    const x=(u-.5)*w*1.22,z=(v-.5)*d*1.32;
    return [x,height(x,z)+.07*Math.sin(x*2.7+z*1.4),z];
  },P.foliage);
  // Front stone facade traces the exposed hillside profile exactly.
  surface(group,32,12,(u,v)=>{
    const x=(u-.5)*w;
    return [x,v*height(x,front),front+.025];
  },P.stone);
  const stones=[];
  for(let j=0;j<7;j++)for(let i=0;i<19;i++){
    const x=(i-9+(j%2)*.5)*w/19;
    const y=(j+.5)*.46;
    if(y>height(x,front)-.22||Math.abs(x)<1.38&&y<2.95)continue;
    stones.push({x,y,z:front+.13,s:.7+rng()*.4});
  }
  instanced(group,new THREE.DodecahedronGeometry(.22,0),0xd7c5a5,stones,(dummy,s)=>{
    dummy.position.set(s.x,s.y,s.z);dummy.scale.set(s.s,.65*s.s,.35*s.s);
  });
  // Timber ribs bend into the living turf.
  for(const x of [-w*.4,-w*.27,w*.27,w*.4]){
    tube(group,[[x,.2,front+.1],[x,height(x,front)*.45,front+.13],
      [x*.94,height(x,front)-.1,front+.16]],.095,P.timber,12);
  }
  door(group,front+.15,4,P,true);
  for(const x of [-w*.33,w*.33]){
    const ring=mesh(new THREE.TorusGeometry(.62,.12,8,28),P.timber,group);
    ring.position.set(x,1.68,front+.18);
    const pane=mesh(new THREE.CircleGeometry(.54,30),0x9bc9c8,group);
    pane.position.set(x,1.68,front+.2);
    cube(group,.065,1.05,.1,P.trim,x,1.68,front+.26);
  }
  chimney(group,w*.26,-d*.16,height(w*.26,-d*.16)+.65,P);
  const flowers=[];
  for(let i=0;i<34;i++){
    const x=(rng()-.5)*w*.94,z=(rng()-.5)*d*1.08;
    const y=height(x,z);
    if(y<.3)continue;
    flowers.push({x,y:y+.07,z});
  }
  instanced(group,new THREE.IcosahedronGeometry(.09,0),0xf2c5c2,flowers,(dummy,s)=>{
    dummy.position.set(s.x,s.y,s.z);dummy.scale.setScalar(.7+rng()*.65);
  });
}
export function createFairyBuilding(definition,config={}) {
  const p=designBuilding(definition,config),rng=seeded(p.detailSeed);
  const root=new THREE.Group();
  root.name='Fairy architecture: '+p.id;
  root.position.set(p.x,0,p.z);
  root.userData={buildingId:p.id,family:p.family,entrance:[...p.entrance],
    collisionFootprint:{x:p.x,z:p.z,w:p.w,d:p.d}};
  const body=new THREE.Group();root.add(body);
  // Storybook and Moonspire use the actual approved in-chat demo meshes.
  // Do not substitute the older approximation found in this file.
  if(p.family==='storybook')buildApprovedCottage(body,p,rng);
  if(p.family==='toadstool')toadstool(body,p,rng);
  if(p.family==='moonspire')buildApprovedCottage(body,p,rng,{moonspire:true});
  if(p.family==='hobbit')hobbit(body,p,rng);
  if(p.garden)flowerBeds(body,p,rng);
  return root;
}
