import * as THREE from 'three';
import {roundedBox,fairyMaterial} from '../../visual/gfx.js';
import {buildApprovedCottage} from '../../architecture/approved-cottage.js';
import {eveningFactor,getEntertainmentEvents,attendancePoints} from '../../events/entertainment/index.js';

const C={timber:0x906747,wood:0x906747,trim:0xffe2b5,stone:0xb4b1a1,roof:0x9e739c,roof2:0x668f8c,wall:0xffe7ce,glass:0xffd89a,grass:0x9fbd85,flower:0xf3b0c6,honey:0xf1c97d,blue:0x96c9d0,lantern:0xffd18c};
const mats=new Map(),geos=new Map();
function mat(color,glow=false){
  const key=color+':'+glow;
  if(!mats.has(key))mats.set(key,glow?new THREE.MeshBasicMaterial({color}):fairyMaterial(color));
  return mats.get(key);
}
function geo(key,fn){if(!geos.has(key))geos.set(key,fn());return geos.get(key);}
function put(parent,geometry,color,x=0,y=0,z=0,shadow=false){
  const m=new THREE.Mesh(geometry,mat(color));m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;parent.add(m);return m;
}
function box(g,w,h,d,c,x=0,y=0,z=0){
  return put(g,geo('b:'+w+':'+h+':'+d,()=>roundedBox(w,h,d,Math.max(.015,Math.min(.14,w*.15,h*.15,d*.15)),2)),c,x,y,z,h>.5);
}
function ball(g,r,c,x,y,z,sx=1,sy=1,sz=1){
  const m=put(g,geo('s:'+r,()=>new THREE.SphereGeometry(r,12,8)),c,x,y,z);
  m.scale.set(sx,sy,sz);return m;
}
function post(g,x,z,h=3.5){
  box(g,.18,h,.18,C.timber,x,h/2,z);ball(g,.22,C.trim,x,h,z);
}
function tube(g,points,r,c){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return put(g,new THREE.TubeGeometry(curve,Math.max(8,points.length*3),r,5,false),c);
}
function lantern(g,x,y,z,lights){
  const holder=new THREE.Group();holder.position.set(x,y,z);g.add(holder);
  ball(holder,.21,C.lantern,0,0,0,1,1.3,1);
  box(holder,.32,.07,.32,C.timber,0,.29,0);
  box(holder,.32,.07,.32,C.timber,0,-.29,0);
  lights.push(holder);return holder;
}
function stringLights(g,x1,x2,z,y,lights){
  tube(g,[[x1,y,z],[0,y-.38,z],[x2,y,z]],.024,C.timber);
  for(let i=0;i<7;i++){
    const t=(i+1)/8,x=x1+(x2-x1)*t;
    lantern(g,x,y-.28-.35*(1-Math.pow(2*t-1,2)),z,lights);
  }
}
function roof(g,w,d,h,color){
  // A continuous undulating roof sheet, not two disconnected slabs.
  const vertices=[],indices=[],nx=18,nz=10;
  for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){
    const u=i/nx,v=j/nz,x=(u-.5)*(w+.65),z=(v-.5)*(d+.7);
    vertices.push(x,h+1.45*(1-Math.pow(Math.abs(u*2-1),.82))-.16*Math.pow(Math.abs(u*2-1),10)+.08*Math.sin(z*.85)*u*(1-u),z);
  }
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
    const a=i*(nz+1)+j,b=a+nz+1;indices.push(a,b,a+1,b,b+1,a+1);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const m=put(g,geometry,color);m.material.side=THREE.DoubleSide;
  for(const edge of [-1,1]){
    const points=[];
    for(let i=0;i<=18;i++){const u=i/18,x=(u-.5)*(w+.65);points.push([x,h+1.45*(1-Math.pow(Math.abs(u*2-1),.82))-.16*Math.pow(Math.abs(u*2-1),10)+.04,edge*(d+.7)/2]);}
    tube(g,points,.085,C.trim);
  }
}
function sign(g,label,y,z,w){
  const plaque=box(g,Math.min(w*.76,5.8),.64,.18,C.timber,0,y,z);
  // Sign text is optional at runtime (server-side tests need no DOM).
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;
    const ctx=canvas.getContext('2d');
    if(ctx){ctx.fillStyle='#fff0d5';ctx.font='bold 39px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,256,48,490);
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true}));
      sprite.position.set(0,y,z+.17);sprite.scale.set(Math.min(w*.72,5.6),.82,1);g.add(sprite);
    }
  }
  return plaque;
}
function entrance(site){
  const e=site.entrance;
  if(Array.isArray(e)&&Number.isFinite(e[0])&&Number.isFinite(e[1]))return {x:e[0],z:e[1]};
  if(e&&Number.isFinite(e.x)&&Number.isFinite(e.z))return {x:e.x,z:e.z};
  return {x:site.x,z:site.z+site.d/2+1.5};
}
function building(g,site,label,roofColor,lights){
  const w=site.w,d=site.d;
  // Reuse exactly the same approved continuous, curved wall-and-roof system
  // that defines the player's cottage and downtown architecture.
  const rng=(()=>{let value=0;for(const c of String(site.seed||site.id||label))value=(Math.imul(value,31)+c.charCodeAt(0))>>>0;return()=>((value=(Math.imul(value,1664525)+1013904223)>>>0)/4294967296);})();
  const palette={wall:C.wall,roof:roofColor,trim:C.trim,timber:C.timber,stone:C.stone,foliage:C.grass};
  const style={w,d,wallHeight:3.9,roofOverhang:.36,roofCurvature:.80,palette};
  buildApprovedCottage(g,style,rng,{moonspire:label.includes('Theater')||label.includes('Music')});
  // The only new geometry on the front is venue-specific signage.
  sign(g,label,3.46,d/2+.66,w);
  for(const side of [-1,1])lantern(g,side*(w/2-.42),3.14,d/2+.58,lights);
}
function seat(g,x,y,z){
  box(g,.66,.14,.62,C.timber,x,y,z);box(g,.66,.65,.12,C.roof,x,y+.35,z-.27);
}
function stage(g,w,d,z=0){
  box(g,w,.55,d,C.timber,0,.34,z);
  for(const side of [-1,1])post(g,side*(w/2-.18),z-d/2+.15,2.8);
  tube(g,[[-w/2,2.7,z-d/2],[0,3.18,z-d/2],[w/2,2.7,z-d/2]],.14,C.trim);
}
function theater(g,site,lights){
  building(g,site,'Moonbeam Theater',C.roof,lights);
  const d=site.d,w=site.w;
  stage(g,w*.55,1.8,-d*.2);
  for(let row=0;row<3;row++)for(let col=-2;col<=2;col++)seat(g,col*Math.min(.78,w/7),.42,d*.02+row*.65);
  for(let i=-2;i<=2;i++)ball(g,.13,C.flower,i*.35,2.35,-d*.2);
  for(const s of [-1,1]){box(g,.9,1.1,.17,C.trim,s*w*.33,1.15,d/2+.3);box(g,.7,.8,.18,C.glass,s*w*.33,1.18,d/2+.4);}
}
function music(g,site,lights){
  building(g,site,'Firefly Music Hall',C.roof2,lights);
  stage(g,site.w*.62,1.75,-site.d*.19);
  for(const x of [-.8,0,.8]){
    box(g,.09,1.45,.09,C.timber,x,1.2,-site.d*.19);
    ball(g,.22,x===0?C.flower:C.honey,x,1.83,-site.d*.19);
  }
  for(let row=0;row<2;row++)for(let col=-2;col<=2;col++)seat(g,col*.78,.4,site.d*.1+row*.7);
}
function arcade(g,site,lights){
  building(g,site,'Clover Arcade',C.honey,lights);
  for(let i=0;i<4;i++){
    const x=(i-1.5)*Math.min(1.3,site.w/5),z=-site.d*.12;
    box(g,.85,1.65,.8,C.timber,x,.85,z);
    box(g,.66,.65,.08,C.blue,x,1.12,z+.43);
    box(g,.72,.14,.35,C.trim,x,.64,z+.53);
    ball(g,.075,C.flower,x-.18,.72,z+.72);
  }
  box(g,site.w*.5,.85,.75,C.wood??C.timber,0,.45,site.d*.3);
}
function cafe(g,site,lights){
  building(g,site,'Moonmilk Cafe',C.honey,lights);
  // A tiny lantern-lit terrace; keep the middle entrance clear.
  const front=site.d/2;
  for(const side of [-1,1]){
    const x=side*Math.min(3.4,site.w*.32);
    box(g,1.05,.13,1.05,C.wood,x,1.05,front+1.4);
    box(g,.14,1,.14,C.timber,x,.53,front+1.4);
    for(const dx of [-.78,.78])seat(g,x+dx,.55,front+1.45);
    ball(g,.17,C.glass,x,1.24,front+1.4);
  }
}
function festival(g,site,lights){
  box(g,site.w,.09,site.d,C.grass,0,.03,0);
  // The central promenade remains visually open for walkers and NPCs.
  // The performance stage occupies the eastern side of the public green.
  box(g,2.65,.025,site.d*.96,C.stone,0,.095,0);
  const stageWing=new THREE.Group();
  stageWing.position.x=site.w*.36;
  g.add(stageWing);
  stage(stageWing,site.w*.38,Math.min(2.4,site.d*.33),-site.d*.22);
  for(const side of [-1,1]){
    post(g,side*(site.w/2-.65),site.d*.28,3.3);
    post(g,side*(site.w/2-.65),-site.d*.28,3.3);
  }
  for(const z of [-site.d*.28,0,site.d*.28])stringLights(g,-site.w/2+.65,site.w/2-.65,z,3.5,lights);
  for(let i=0;i<12;i++){
    const x=(i%6-2.5)*(site.w/7),z=(i<6?1:-1)*(site.d/2-.5);
    ball(g,.19,i%2?C.flower:C.honey,x,.28,z);
  }
  for(const x of [-site.w*.3,site.w*.3])seat(g,x,.4,site.d*.24);
}
function garden(g,site,lights,fireflies){
  box(g,site.w,.08,site.d,C.grass,0,.02,0);
  const n=17;
  for(let i=0;i<n;i++){
    const t=i/(n-1),z=(t-.5)*site.d*.85,x=Math.sin(t*Math.PI*2)*site.w*.23;
    ball(g,.34,C.stone,x,.08,z,1,.17,.9);
  }
  for(let i=0;i<24;i++){
    const a=i*2.399,r=.8+Math.sqrt(i/24)*Math.min(site.w,site.d)*.42;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.abs(x)>site.w*.47||Math.abs(z)>site.d*.47)continue;
    ball(g,.18,i%3?C.flower:C.honey,x,.29,z);
    ball(g,.28,C.grass,x,.16,z,1.1,.6,1);
  }
  for(const x of [-site.w*.35,site.w*.35]){
    post(g,x,0,2.6);lantern(g,x,2.5,0,lights);
  }
  for(let i=0;i<Math.min(18,site.w*site.d/4);i++){
    const f=ball(g,.045,C.lantern,(Math.sin(i*14.3)*.43)*site.w,.8+(i%5)*.27,(Math.cos(i*9.1)*.43)*site.d);
    fireflies.push({mesh:f,base:f.position.clone(),phase:i*1.31});
  }
  seat(g,-site.w*.32,.4,site.d*.3);
}
function promenade(g,site,lights){
  box(g,site.w,.12,site.d,C.stone,0,.02,0);
  for(let i=0;i<5;i++){
    const z=(i-2)*site.d/6;
    for(const side of [-1,1]){
      const x=side*(site.w/2-.55);
      post(g,x,z,2.6);lantern(g,x,2.58,z,lights);
    }
  }
  for(const side of [-1,1])box(g,site.w*.22,1.35,1.1,C.timber,side*site.w*.3,.7,0);
}
function normalizeKind(kind=''){
  const k=String(kind).toLowerCase();
  if(k.includes('theat')||k.includes('moonbeam'))return 'theater';
  if(k.includes('music')||k.includes('firefly')||k.includes('concert'))return 'music';
  if(k.includes('arcade'))return 'arcade';
  if(k.includes('cafe')||k.includes('dessert')||k.includes('tea'))return 'cafe';
  if(k.includes('festival')||k.includes('green')||k.includes('amphi'))return 'festival';
  if(k.includes('garden')||k.includes('starlight'))return 'garden';
  if(k.includes('promenade')||k.includes('walk')||k.includes('lantern'))return 'promenade';
  return null;
}
export function createEntertainmentDistrict(scene,{sites=[],seed=1,quality='medium'}={}){
  const root=new THREE.Group();root.name='Lantern Quarter';scene.add(root);
  const interactables=[],lights=[],fireflies=[],venueSites=[];
  const builders={theater,music,arcade,cafe,festival,garden,promenade};
  for(const site of sites){
    const kind=normalizeKind(site.kind||site.name);
    if(!kind||![site.x,site.z,site.w,site.d].every(Number.isFinite)||site.w<3||site.d<3)continue;
    const group=new THREE.Group();group.position.set(site.x,0,site.z);group.name=site.name||kind;
    root.add(group);builders[kind](group,site,lights,fireflies);
    venueSites.push({...site,kind});
    const e=entrance(site),actions={theater:'theater-encore',music:'firefly-rhythm',arcade:'ring-toss',cafe:'visit-cafe',festival:'ring-toss',garden:'visit-garden',promenade:'visit-promenade'};
    interactables.push({id:String(site.id)+':visit',siteId:site.id,kind,label:'Visit '+(site.name||kind),x:e.x,z:e.z,radius:1.65,action:actions[kind]});
    if(kind==='arcade')interactables.push({id:String(site.id)+':rhythm',siteId:site.id,kind:'activity',label:'Play Firefly Rhythm',x:e.x+Math.min(.8,site.w*.1),z:e.z,radius:1.65,action:'firefly-rhythm'});
  }
  let clock=0;
  function update(dt,daySeconds){
    clock+=Math.max(0,Math.min(.1,dt||0));
    const night=eveningFactor(daySeconds||0);
    for(let i=0;i<lights.length;i++){
      const holder=lights[i];holder.scale.setScalar(1+night*.1);
      holder.visible=night>.02||i%3===0;
    }
    if(quality!=='low')for(const f of fireflies){
      f.mesh.position.y=f.base.y+Math.sin(clock*1.7+f.phase)*.17;
      f.mesh.position.x=f.base.x+Math.sin(clock*.65+f.phase)*.12;
      f.mesh.visible=night>.15;
    }
  }
  function dispose(){
    scene.remove(root);
    root.traverse(o=>{
      if(o.isMesh&&o.geometry&&!Array.from(geos.values()).includes(o.geometry))o.geometry.dispose();
      if(o.isSprite){o.material.map?.dispose();o.material.dispose();}
    });
    root.clear();
  }
  return {root,interactables,update,dispose,
    events:(seconds,day=0)=>getEntertainmentEvents(seconds,day),
    attendance:(siteId,seconds,day=0)=>{
      const site=venueSites.find(s=>s.id===siteId);
      if(!site)return [];
      return getEntertainmentEvents(seconds,day).filter(e=>e.active&&e.siteKind===site.kind)
        .flatMap(e=>attendancePoints(site,e));
    }
  };
}
