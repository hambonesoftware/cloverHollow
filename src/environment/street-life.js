import * as THREE from 'three';

// Street-life vignettes are intentionally concentrated where people gather.
// Their changes are observable without opening a quest panel or collecting
// resources. They never alter collision geometry, navigation or save keys.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,t)=>{const v=clamp((t-a)/(b-a));return v*v*(3-2*v);};
const DAY=1320;

export function sampleStreetStory(seconds=0){
  const time=((Number.isFinite(seconds)?seconds:0)%DAY+DAY)%DAY;
  return Object.freeze({
    time,
    marketOpen:time>=210&&time<1020,
    morningDelivery:time>=185&&time<560,
    fallenParcels:time>=565&&time<750,
    bakeryRush:time>=310&&time<785,
    rehearsal:time>=825&&time<1135,
    lanterns:Math.max(smooth(875,1020,time),1-smooth(80,210,time))
  });
}

export function createStreetLife(scene,{quality='medium'}={}){
  const root=new THREE.Group();
  root.name='Clover Hollow - small stories unfolding';
  scene.add(root);
  const mats=new Map(),geos=new Map();
  function mat(color,emissive=0){
    const key=color+':'+emissive;
    if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({
      color,roughness:.85,emissive:emissive||0x000000,emissiveIntensity:.34
    }));
    return mats.get(key);
  }
  function geometry(key,make){
    if(!geos.has(key))geos.set(key,make());
    return geos.get(key);
  }
  function block(parent,w,h,d,color,x,y,z){
    const mesh=new THREE.Mesh(geometry('box:'+w+':'+h+':'+d,()=>new THREE.BoxGeometry(w,h,d)),mat(color));
    mesh.position.set(x,y,z);mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function orb(parent,r,color,x,y,z,scaleX=1,scaleY=1,scaleZ=1){
    const mesh=new THREE.Mesh(geometry('sphere:'+r,()=>new THREE.SphereGeometry(r,10,7)),mat(color));
    mesh.position.set(x,y,z);mesh.scale.set(scaleX,scaleY,scaleZ);parent.add(mesh);return mesh;
  }
  function wheel(parent,x,y,z){
    const disk=new THREE.Mesh(geometry('wheel',()=>new THREE.CylinderGeometry(.27,.27,.13,12)),mat(0x785e50));
    disk.rotation.z=Math.PI/2;disk.position.set(x,y,z);parent.add(disk);
    orb(parent,.09,0xe7cfa1,x+.09,y,z);
  }
  function basket(parent,x,z,color=0xb48965){
    block(parent,.78,.30,.6,color,x,.32,z);
    for(let j=0;j<6;j++)orb(parent,.14,j%2?0xa9be74:0xe4aa77,
      x+(j%3-1)*.24,.55,z+(j<3?-.16:.16));
  }
  function flowerBucket(parent,x,z){
    const stem=block(parent,.46,.66,.46,0x937b8f,x,.4,z);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      block(parent,.045,.5,.045,0x729877,x+Math.cos(a)*.19,.94,z+Math.sin(a)*.19);
      orb(parent,.14,[0xe9a0ad,0xe9cb89,0xb5a1d8][i%3],
        x+Math.cos(a)*.23,1.18,z+Math.sin(a)*.23);
    }
    return stem;
  }
  function table(parent,x,z){
    block(parent,1.34,.13,1.20,0xa27b5e,x,.90,z);
    block(parent,.15,.84,.14,0x87684f,x,.46,z);
    for(const dx of [-1.06,1.06]){
      block(parent,.56,.13,.57,0xb18a6c,x+dx,.62,z);
      block(parent,.54,.60,.10,0x95735a,x+dx,.91,z-.22);
    }
    orb(parent,.26,0xe8d3bb,x,1.06,z,.95,.22,1);
    orb(parent,.12,0xf2d9bc,x,1.21,z);
  }
  // Opposing facades create a lane where the visitor can watch the market.
  const tea=new THREE.Group();tea.position.set(-22,0,-85.8);root.add(tea);
  table(tea,-3,0);table(tea,3,.35);
  flowerBucket(tea,-5.1,1.2);
  const openSign=new THREE.Group();openSign.position.set(-16.2,1.85,-84.3);root.add(openSign);
  block(openSign,1.05,.64,.13,0x9a785b,0,0,0);
  orb(openSign,.15,0xf8d59b,0,.17,.11);
  // Mail carrier: arrivals, parcels and a tiny, short-lived mishap.
  const delivery=new THREE.Group();delivery.position.set(-62.8,0,-86);root.add(delivery);
  const cart=new THREE.Group();delivery.add(cart);
  block(cart,2,.18,1.04,0xa78060,0,.81,0);
  block(cart,2,.49,.12,0x9e745a,0,1.10,-.48);
  for(const x of [-.74,.74])for(const z of [-.47,.47])wheel(cart,x,.46,z);
  block(cart,.12,.13,1.1,0x967358,0,.75,.99);
  const parcels=[];
  for(let i=0;i<4;i++){
    const box=block(cart,.52,.34,.43,i%2?0xd9be94:0xbd9872,
      -.62+(i%2)*.92,1.10+Math.floor(i/2)*.35,0);
    parcels.push(box);
  }
  const fallen=[];
  for(let i=0;i<3;i++){
    const box=block(delivery,.49,.29,.42,0xd8b78d,
      1.7+i*.52,.18,((i%2)*.6)-.1);
    box.rotation.z=(i%2?-.25:.19);fallen.push(box);
  }
  // Pip's bakery has a changing supply of pastries, and visible chimney smoke.
  const tray=new THREE.Group();tray.position.set(-25.7,0,-12.7);root.add(tray);
  block(tray,1.55,.15,.8,0xa47c5b,0,.92,0);
  for(let i=0;i<5;i++)orb(tray,.24,0xd8a46d,(i-2)*.29,1.14,0,1,.62,1.05);
  const smoke=[];
  const smokeCount=quality==='low'?2:quality==='high'?6:4;
  for(let i=0;i<smokeCount;i++){
    const puff=orb(root,.28,0xf7ece0,-24,6.7,-20.5);
    puff.material=mat(0xe7dbcf);
    smoke.push(puff);
  }
  // The florist's display attracts a few insects that linger near the flowers.
  const florist=new THREE.Group();florist.position.set(-6.8,0,-84.5);root.add(florist);
  flowerBucket(florist,-1,0);flowerBucket(florist,.9,.4);
  const butterflies=[];
  if(quality!=='low')for(let i=0;i<3;i++){
    const bug=new THREE.Group();florist.add(bug);
    const left=orb(bug,.17,0xedc7a0,-.14,0,0,.85,1.3,.18);
    const right=orb(bug,.17,0xe7a4ba,.14,0,0,.85,1.3,.18);
    orb(bug,.045,0x8a6b5d,0,0,0);
    butterflies.push({bug,left,right,phase:i*2.1});
  }
  // At night musicians rehearse beside Lantern Quarter's green.
  const stage=new THREE.Group();stage.position.set(49,0,-129);root.add(stage);
  block(stage,3.05,.25,1.45,0x9e765b,0,.22,0);
  const musicStand=block(stage,.64,.63,.08,0x7f5d66,0,1.47,-.5);
  block(stage,.12,1.10,.12,0x8b6858,0,.81,-.5);
  const notes=[];
  if(quality!=='low')for(let i=0;i<3;i++){
    const note=orb(stage,.10,[0xf7c88f,0xc8d0eb,0xf1a6c1][i],.0,1.7,0);
    notes.push(note);
  }
  // A small physical memory of the player's first housewarming. The
  // existing save's story.housewarming flag controls this permanent bunting.
  const welcome=new THREE.Group();welcome.name='Housewarming keepsake';welcome.position.set(-10,0,11);root.add(welcome);
  for(const x of [-1.8,1.8])block(welcome,.12,2.25,.12,0x94725e,x,1.12,0);
  block(welcome,3.9,.10,.12,0x9d8067,0,2.22,0);
  for(let i=0;i<7;i++){
    const flag=block(welcome,.36,.48,.07,[0xe7a5ac,0xefce8b,0xa0c3b5][i%3],
      (i-3)*.52,1.87,0);
    flag.rotation.z=(i%2?1:-1)*.12;
  }
  const friendlyTreat=orb(tray,.22,0xf2c3a4,0,1.43,0);
  let elapsed=0;
  function update(dt=0,seconds=0,story={}){
    elapsed+=Math.max(0,Math.min(.1,dt));
    const story=sampleStreetStory(seconds);
    tea.visible=story.marketOpen;
    openSign.visible=story.marketOpen;
    delivery.visible=story.morningDelivery||story.fallenParcels;
    cart.rotation.z=story.fallenParcels?-.10:Math.sin(elapsed*1.2)*.018;
    cart.position.y=story.fallenParcels?-.05:0;
    parcels.forEach((p,i)=>{p.visible=!story.fallenParcels&&story.morningDelivery&&
      (i<(story.time>425?2:4));});
    fallen.forEach(p=>p.visible=story.fallenParcels);
    tray.visible=story.bakeryRush;
    friendlyTreat.visible=(story?.conversations?.Pip??0)>=3;
    welcome.visible=Boolean(story?.housewarming);
    smoke.forEach((p,i)=>{
      const phase=((elapsed*.23+i/smoke.length)%1+1)%1;
      p.visible=story.bakeryRush;
      p.position.set(-24+Math.sin(elapsed*.6+i)*.25+phase*.18,
        6.5+phase*2.1,-20.5+Math.cos(elapsed*.4+i)*.24);
      p.scale.setScalar(.5+phase*.85);
    });
    butterflies.forEach(({bug,left,right,phase},i)=>{
      bug.position.set(Math.sin(elapsed*.8+phase)*1.3,1.4+Math.sin(elapsed*1.1+phase)*.34,
        -.5+Math.cos(elapsed*.65+phase)*.7);
      left.scale.x=.8+Math.sin(elapsed*12+phase)*.35;
      right.scale.x=.8-Math.sin(elapsed*12+phase)*.35;
      bug.visible=story.marketOpen;
    });
    stage.visible=story.rehearsal;
    musicStand.rotation.z=Math.sin(elapsed*1.8)*.025;
    notes.forEach((note,i)=>{
      note.position.set((i-1)*.44,1.7+((elapsed*.36+i*.29)%1)*1.2,-.25);
      note.scale.setScalar(.5+(i%2)*.18);
    });
  }
  update(0,420,{});
  return {
    root,update,sample:sampleStreetStory,
    get vignetteCount(){return 5;},
    dispose(){
      scene.remove(root);
      for(const geo of geos.values())geo.dispose();
      for(const material of mats.values())material.dispose();
    }
  };
}
