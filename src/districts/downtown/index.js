import * as THREE from 'three';
import {buildApprovedCottage} from '../../architecture/approved-cottage.js';
import {roundedBox,fairyMaterial} from '../../visual/gfx.js';
import {createCivicInterior} from '../../civic/interior.js';
import {serviceActions} from '../../services/downtown/index.js';
const colors=[
 {wall:0xf6dfc2,roof:0xb66e76,trim:0xffedcc,timber:0x8c6452,stone:0xc8b6a1,foliage:0x79a78a},
 {wall:0xe2e9d3,roof:0x718f8d,trim:0xffe9bd,timber:0x906b57,stone:0xcbb7a0,foliage:0x7ca47e},
 {wall:0xf0d8d9,roof:0x887ca4,trim:0xfff1d5,timber:0x8c6759,stone:0xbeb6b0,foliage:0x79a78a},
 {wall:0xe4e3f0,roof:0xc28c63,trim:0xffeac7,timber:0x866453,stone:0xc9b4a0,foliage:0x79a78a}
];
const aliases={'town-hall':'town-hall','townHall':'town-hall',mayor:'mayor-office','mayor-office':'mayor-office',post:'post-office','post-office':'post-office',library:'library',community:'community-center','community-center':'community-center',bakery:'bakery',furniture:'furniture',general:'general-goods','general-goods':'general-goods',flower:'florist',florist:'florist',cafe:'cafe',tailor:'tailor',bookshop:'bookshop',market:'market'};
const civic=new Set(['town-hall','mayor-office','post-office','library','community-center']);
function hash(value){let h=2166136261;for(const c of String(value)){h=Math.imul(h^c.charCodeAt(0),16777619);}return h>>>0;}
function random(seed){let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function block(root,w,h,d,color,x,y,z){const o=new THREE.Mesh(roundedBox(Math.max(.03,w),Math.max(.03,h),Math.max(.03,d),.04,2),fairyMaterial(color));o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;root.add(o);return o;}
function orb(root,r,color,x,y,z){const o=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),fairyMaterial(color));o.position.set(x,y,z);root.add(o);return o;}
function clock(root,x,y,z){
 const face=new THREE.Mesh(new THREE.CircleGeometry(.72,32),fairyMaterial(0xffe8c2));face.position.set(x,y,z);root.add(face);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(.73,.09,8,32),fairyMaterial(0xb99565));rim.position.set(x,y,z+.035);root.add(rim);
 block(root,.065,.51,.06,0x625049,x,y+.18,z+.06);block(root,.37,.065,.06,0x625049,x+.13,y,z+.07);
}
function sign(root,name,w,z){ // physical signboard; host may add localized text via UI
 block(root,Math.min(w*.75,4.6),.56,.17,0x87604d,0,3.66,z);
 for(const x of [-Math.min(w*.32,1.9),Math.min(w*.32,1.9)])orb(root,.10,0xf5cf88,x,3.66,z+.12);
 root.userData.signText=name;
}
function awning(root,w,z,rng){
 const count=Math.max(4,Math.floor(w/.65)),strip=w/count;
 for(let i=0;i<count;i++){
  const c=i%2?0xf7e6c9:0xa3b9ac;
  block(root,strip*.98,.12,1.06,c,-w/2+strip*(i+.5),3.24,z+.53).rotation.x=-.10;
  orb(root,.085,c,-w/2+strip*(i+.5),3.08,z+1.05);
 }
 for(const x of [-w*.47,w*.47])block(root,.065,2.7,.065,0x866858,x,1.5,z+1.05);
}
function balconies(root,w,z,rng){
 for(const x of [-w*.27,w*.27]){
  block(root,Math.min(w*.36,2.1),.15,.78,0x9c765a,x,4.22,z+.33);
  for(let k=0;k<5;k++)block(root,.055,.65,.055,0x8b6557,x-.72+k*.36,4.6,z+.65);
  block(root,1.65,.08,.10,0x8b6557,x,4.96,z+.65);
  for(let k=0;k<3;k++)orb(root,.14,[0xeaa3b5,0xf4d68d,0xb3c6e6][k],x-.44+k*.44,4.37,z+.67);
 }
}
function landmark(root,kind,w,d,palette,rng){
 const front=d/2;
 if(kind==='town-hall'){
  const tx=-w*.29;
  block(root,2.25,5.8,2.35,palette.stone,tx,5.3,-d*.14);
  block(root,2.7,.30,2.65,palette.timber,tx,8.28,-d*.14);
  // Continuous tapering tower roof, echoing approved swoop rather than a detached cone.
  const vertices=[],indices=[],rings=14,steps=20;
  for(let i=0;i<=rings;i++){const t=i/rings;for(let j=0;j<=steps;j++){const a=j*Math.PI*2/steps;const r=1.65*(1-t)+.04;vertices.push(tx+Math.cos(a)*r+.24*t*t,8.36+3.0*t,-d*.14+Math.sin(a)*r);}}
  for(let i=0;i<rings;i++)for(let j=0;j<steps;j++){const a=i*(steps+1)+j,b=a+steps+1;indices.push(a,b,a+1,b,b+1,a+1);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();
  const roof=new THREE.Mesh(g,fairyMaterial(palette.roof,{side:THREE.DoubleSide}));roof.castShadow=true;root.add(roof);
  clock(root,tx,7.2,-d*.14+1.22);
  for(let i=0;i<3;i++)block(root,3.5+i*.45,.15,.55,palette.stone,0,.11+i*.15,front+.6+i*.42);
 }else if(kind==='post-office'){
  block(root,.95,1.4,.75,0x9c5c62,w*.43,.75,front+.7);
  block(root,1.13,.18,.9,0xf2d6a7,w*.43,1.5,front+.7);
  block(root,.62,.06,.08,0x483d44,w*.43,1.08,front+1.12);
 }else if(kind==='library'){
  for(let i=0;i<3;i++){const x=-w*.28+i*w*.28;block(root,.32,1.7,.24,0xb89169,x,4.0,front+.25);}
 }else if(kind==='mayor-office'){
  orb(root,.36,0xd3ae76,0,4.02,front+.36);
  for(let i=0;i<5;i++)orb(root,.16,0xb18b71,Math.cos(i*1.25)*.48,4.02+Math.sin(i*1.25)*.48,front+.35);
 }else if(kind==='community-center'){
  block(root,2.7,1.4,.16,0x9d795c,w*.3,1.8,front+.28);
  for(let i=0;i<4;i++)block(root,.42,.54,.04,[0xf4c5a5,0xd8e7bf,0xb9c9e7][i%3],w*.3-.78+i*.52,1.84,front+.39);
 }
}
function market(root,w,d,rng){
 for(let i=0;i<Math.min(4,Math.max(1,Math.floor(w/2.8)));i++){
  const x=-w/2+1.4+i*2.8;
  block(root,2.15,.16,1.3,0xa47a57,x,1.05,0);
  for(const side of [-1,1])block(root,.09,2.4,.09,0x856b56,x+side*.95,1.2,-.48);
  for(let k=0;k<4;k++)block(root,.53,.12,1.6,k%2?0xf8e2bd:0xc98d9c,x-.80+k*.53,2.48,-.06);
  for(let j=0;j<6;j++)orb(root,.14,[0xe8a4a4,0xd8c16f,0x9abda0][j%3],x-.65+(j%3)*.55,1.25,-.3+Math.floor(j/3)*.55);
 }
}
export function createDowntownDistrict(scene,{sites=[],seed=1,quality='medium'}={}){
 if(!scene||typeof scene.add!=='function')throw new TypeError('Three.js scene required');
 if(!Array.isArray(sites))throw new TypeError('sites must be an array');
 const root=new THREE.Group();root.name='Clover Square downtown';scene.add(root);
 const interactables=[],animated=[],ids=new Set();
 for(const site of sites){
  if(!site||typeof site.id!=='string'||!Number.isFinite(site.x)||!Number.isFinite(site.z)||!(site.w>0)||!(site.d>0))throw new TypeError('Invalid downtown site');
  if(ids.has(site.id))throw new Error('Duplicate downtown site '+site.id);ids.add(site.id);
  const kind=aliases[site.kind]||site.kind;
  const rng=random(hash(site.seed??seed)^hash(site.id)),palette=colors[Math.floor(rng()*colors.length)];
  const g=new THREE.Group();g.name=site.name||site.id;g.position.set(site.x,0,site.z);g.userData={siteId:site.id,kind,entrance:site.entrance,footprint:{w:site.w,d:site.d}};root.add(g);
  const w=Math.max(5.5,site.w-.25),d=Math.max(5.5,site.d-.25),front=d/2;
  if(kind==='market')market(g,w,d,rng);
  else{
   // Exact approved source implementation, including its roof profile and instanced curved shingles.
   const p={w,d,wallHeight:civic.has(kind)?4.7:4.25,roofOverhang:.3+rng()*.22,roofCurvature:.78+rng()*.28,palette};
   buildApprovedCottage(g,p,rng,{moonspire:kind==='town-hall'||kind==='library'});
   if(!civic.has(kind))awning(g,Math.min(w*.7,5),front+.4,rng);
   if(['bakery','cafe','tailor','bookshop','florist','furniture','general-goods'].includes(kind))balconies(g,w,front+.08,rng);
   landmark(g,kind,w,d,palette,rng);
   sign(g,site.name||site.id,w,front+.64);
   if(civic.has(kind)){
    const room=createCivicInterior({kind,w:Math.min(w-1,8),d:Math.min(d-1,7),seed:site.seed??seed});
    // Exposed public dollhouse behind front entrance, available for a dedicated interior view.
    room.position.set(0,0,-d*.12);room.visible=false;room.userData.toggleForInteriorView=true;g.add(room);
    g.userData.interior=room;
   }
  }
  const entrance=site.entrance&&typeof site.entrance==='object'?site.entrance:null;
  const ix=Number.isFinite(entrance?.x)?entrance.x:site.x;
  const iz=Number.isFinite(entrance?.z)?entrance.z:site.z+site.d/2+.9;
  for(const {action,label} of serviceActions(kind))interactables.push({id:site.id+':'+action,siteId:site.id,kind,label,x:ix,z:iz,radius:2.2,action});
  if(kind==='town-hall')animated.push({root:g,clock:true});
 }
 let disposed=false;
 return {root,interactables,update(dt,daySeconds){if(disposed)return;for(const item of animated)item.root.userData.daySeconds=daySeconds;},
  dispose(){if(disposed)return;disposed=true;scene.remove(root);root.clear(); // Geometry and materials may be shared by the approved generator caches.}};
}
