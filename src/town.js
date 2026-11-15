import * as THREE from 'three';
import { LOTS } from './rules.js';
import { box, sphere, cylinder, flat, sign, building, makePerson, animatePerson, tree, flower, gardenBench, lampPost } from './art.js';

const rnd=(n)=>{const s=Math.sin(n*127.1+31.7)*43758.5453;return s-Math.floor(s);};
const LOCATIONS = Object.freeze({
  square: [0,4], mayor: [0,-16], bakery: [-20,-10], furniture: [20,-10],
  general: [37,-9], pond: [55,38], orchard: [-40,33], creek: [51,0],
  south: [0,30], woods: [-42,-17], market: [-10,9]
});
export function createTown(scene) {
  scene.background=new THREE.Color(0xc9e3ea);
  scene.fog=new THREE.Fog(0xc9e3ea,70,148);
  scene.add(new THREE.HemisphereLight(0xfff2db,0x83a786,2.15));
  const sun=new THREE.DirectionalLight(0xfff0ce,2.6);
  sun.position.set(-35,64,35);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left=-65;sun.shadow.camera.right=65;sun.shadow.camera.top=65;sun.shadow.camera.bottom=-65;
  sun.shadow.normalBias=.035;scene.add(sun);
  const ground=flat(182,182,0xa7c996,0,-.075,0);scene.add(ground);
  // Busy village center and paths to every neighborhood. Walkways are legible from the camera.
  const roads=[
    [0,0,8.1,130],[-13,3,92,7],[-7,29,91,6.5],[22,-12,83,6.2],
    [32,19,6,65],[-39,17,6,43],[-20,-23,6,26]
  ];
  for(const [x,z,w,d] of roads){
    scene.add(flat(w+1,d+1,0x90ab92,x,-.035,z),flat(w,d,0xe7d1a9,x,-.026,z));
  }
  const square=flat(24,20,0xe5d3aa,0,-.009,4);scene.add(square);
  scene.add(flat(21,17,0xeadab8,0,-.004,4));
  const creek=flat(12,170,0x8ec6d3,53,-.04,0);scene.add(creek);
  const stream=flat(8,170,0x70b0c5,53,-.03,0);scene.add(stream);
  scene.add(flat(19,7,0xa98a70,52,-.004,-14));
  for(let j=0;j<9;j++)scene.add(box(.12,.16,7.1,0xd3ae82,43+j*2,.05,-14));
  const buildings=[],obstacles=[];
  function addBuilding(id,x,z,w,d,label,roof,wall=0xffe7c7,kind='public'){
    const o=building({x,z,w,d,wall,roof,name:label,shop:kind!=='home'});scene.add(o);
    const entry={id,x,z: z+d/2+1.45,w,d,name:label};
    buildings.push(entry);obstacles.push({x,z,w:w+.3,d:d+.3,id});
    return o;
  }
  addBuilding('mayor',0,-21,11,8,"MAYOR'S HALL",0x7caaa2,0xf6e8c8);
  addBuilding('bakery',-21,-14,10,8,"PIP'S BAKERY",0xce8495,0xffe4ce);
  addBuilding('furniture',21,-14,11,8,'LITTLE OAK',0xb78d6c,0xf5dfbe);
  addBuilding('general',38,-13,9,8,'GENERAL GOODS',0x7ba7ae,0xe2eacb);
  addBuilding('mabel',-33,-25,8,7,"MABEL'S",0xb97f93,0xffe0ce,'home');
  addBuilding('bruno',-44,5,9,7,"BRUNO'S",0x9c9e73,0xe8debc,'home');
  addBuilding('pip',-23,17,8,7,"PIP'S",0xbaa5d6,0xf6dfd6,'home');
  addBuilding('dot',35,16,8,7,"DOT'S",0x7b9dbc,0xe5f1d9,'home');
  addBuilding('fennel',-29,-43,8,7,"FENNEL'S",0x8cad7e,0xd9eccb,'home');
  for(let i=0;i<LOTS.length;i++){
    const l=LOTS[i];
    addBuilding('lot-'+i,l.x,l.z,8,7,i===0?'SUNNY COTTAGE':i===1?'CREEK COTTAGE':'ORCHARD COTTAGE',l.roof,0xffeed3,'home');
    // A front garden makes each property feel personal.
    scene.add(box(9,.55,.19,0xc6a787,l.x,.3,l.z+5.9));
    for(const dx of [-3.1,-2.2,2.25,3.1])
      scene.add(flower(l.x+dx,l.z+5.3,dx<0?0xf0b3ad:0xffd27b));
    const tag=sign('AVAILABLE HOME',4.15);tag.position.set(l.x,2.35,l.z+6.2);tag.userData.lotTag=i;scene.add(tag);
    l.tag=tag;
  }
  // The well and its active community gathering space.
  const well=new THREE.Group();well.position.set(0,0,4);
  well.add(cylinder(2.15,2.35,.85,0xbda995,0,.43,0,12));
  well.add(cylinder(1.66,1.66,.13,0x77aabc,0,.89,0,18));
  well.add(cylinder(.15,.15,2.9,0xa07a5c,-1.55,2.2,0),cylinder(.15,.15,2.9,0xa07a5c,1.55,2.2,0));
  well.add(box(3.4,.22,.22,0xa07a5c,0,3.6,0));
  const bell=sign('CLOVER HOLLOW',6);bell.position.y=4.25;well.add(bell);scene.add(well);
  scene.add(gardenBench(-7,6,Math.PI/2),gardenBench(7,6,-Math.PI/2));
  scene.add(gardenBench(-8,12,.2),gardenBench(9,12,-.3));
  for(const [x,z] of [[-11,1],[11,1],[-12,17],[12,17],[-8,-8],[9,-8],[-20,28],[19,27],[32,25],[-35,24]])
    scene.add(lampPost(x,z));
  // Outdoor market stalls that feel occupied.
  for(const [x,z,c] of [[-12,13,0xe49da3],[-12,20,0x8db7a7],[12,20,0xedd18b]]){
    scene.add(box(4.4,.23,2.15,0xb98961,x,1.12,z));
    for(const dx of [-1.85,1.85])scene.add(box(.14,2.2,.15,0xa47958,x+dx,1.23,z));
    const canopy=box(4.8,.23,2.8,c,x,2.48,z);scene.add(canopy);
    for(let k=-1;k<=1;k++)scene.add(sphere(.3,k===0?0xf5ce73:0x9dc18d,x+k*.9,1.47,z));
  }
  // Apple orchard, decorative flower patches, carefully distributed trees.
  for(let i=0;i<20;i++){
    const x=-62+(i%5)*7+2*rnd(i);
    const z=22+Math.floor(i/5)*8+rnd(i+54);
    scene.add(tree(x,z,.75+rnd(i+8)*.22,0x8eb67e));
    for(let k=0;k<3;k++)scene.add(sphere(.2,0xdb8875,x+(rnd(i*7+k)-.5)*2,2.2+rnd(i*4+k),z+(rnd(i*9+k)-.5)*2));
  }
  for(let i=0;i<75;i++){
    const a=i*2.399,r=35+Math.sqrt(i/75)*42;
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.abs(x-53)<12||x<-29&&z>10&&z<55||Math.abs(x)<7||Math.abs(z-3)<8||Math.abs(z-29)<8)continue;
    if(buildings.some(b=>Math.hypot(b.x-x,(b.z-b.d/2-1.45)-z)<11))continue;
    scene.add(tree(x,z,.6+rnd(i+31)*.8,[0x7eaa77,0x96bb86,0x86b4a0][i%3]));
  }
  for(let i=0;i<145;i++){
    const x=(rnd(i*8+9)-.5)*130,z=(rnd(i*3+17)-.5)*116;
    if(Math.abs(x)<12&&Math.abs(z)<26||Math.abs(x-53)<9)continue;
    if(buildings.some(b=>Math.abs(b.x-x)<b.w/2+2&&Math.abs((b.z-b.d/2-1.45)-z)<b.d/2+2))continue;
    scene.add(flower(x,z,[0xf0abbd,0xf6d187,0xe8eff7][i%3]));
  }
  // Reusable character appearance; resident personalities come from the original Willowbend.
  const player=makePerson('kid',{shirt:0x7aaf96,hair:0x634f4e,trousers:0x6a91a4});
  scene.add(player);
  const cast=[
    {name:'Mayor Thistle',kind:'hedgehog',shirt:0x6d9685,home:[0,-15],work:[-2,-12],visit:[-2,5],night:[0,-15],
      lines:['Welcome to Clover Hollow. Every door has a story.','The village ledger is old, but there is always room for another name.','A good town is built one neighbor at a time.']},
    {name:'Mabel',kind:'cat',shirt:0xc58d9f,home:[-33,-18],work:[-9,10],visit:[-3,7],night:[-33,-18],
      lines:['I remember when the lanterns lit every lane.','Make yourself at home. I truly mean that.','Some mornings, the town smells like butter and rain.']},
    {name:'Pip',kind:'bunny',shirt:0xe2aa83,home:[-23,21],work:[-18,-8],visit:[-6,8],night:[-23,21],
      lines:['The cinnamon buns are almost ready!','I saved you the pastry with the extra icing.','Clover says my apple tart is dangerously good.']},
    {name:'Bruno',kind:'bear',shirt:0x789d89,home:[-44,10],work:[-14,17],visit:[3,8],night:[-44,10],
      lines:['I made that table myself. Want to see the grain?','Ask for help if the furniture is heavy.','There is nothing like a properly fitted door.']},
    {name:'Dot',kind:'duck',shirt:0x96b4c9,home:[35,21],work:[34,13],visit:[8,9],night:[35,21],
      lines:['The creek is full of little silver fish.','Something glimmered near the old tree last night.','Come by for tea when it rains.']},
    {name:'Biscuit',kind:'dog',shirt:0xcf9e7b,home:[13,22],work:[10,8],visit:[-9,12],night:[13,22],
      lines:['Race you to the fountain!','I found a shiny button, but it might be a pebble.','The square is best when everybody is here.']},
    {name:'Fennel',kind:'frog',shirt:0xac98bc,home:[-29,-38],work:[-9,-12],visit:[3,12],night:[-29,-38],
      lines:['Echo Cave remembers more than it tells.','I found a stone shaped exactly like a boot.','Do you think lanterns can have memories?']},
    {name:'Hazel',kind:'cat',shirt:0xb7a077,home:[-39,28],work:[-11,14],visit:[-4,8],night:[-39,28],
      lines:['Those bluebells would look lovely on your windowsill.','Every table needs flowers.','The market is liveliest on sunny mornings.']},
    {name:'Clover',kind:'bunny',shirt:0x9bb37b,home:[-38,29],work:[-40,28],visit:[-11,18],night:[-38,29],
      lines:['The orchard is finally in bloom.','Pip and I are having an apple-pie competition.','Bring a friend for cider.']},
    {name:'Reed',kind:'frog',shirt:0x7caaa5,home:[39,27],work:[46,34],visit:[14,17],night:[39,27],
      lines:['The pond is peaceful if you sit long enough.','I fixed the little footbridge this morning.','The reeds are where the frogs sing.']}
  ];
  const actors=cast.map((data,i)=>{
    const model=makePerson(data.kind,{shirt:data.shirt,skin:data.kind==='cat'?0xf4c7a6:undefined});
    const seed=(i*.73)+1;
    model.position.set(data.home[0]+rnd(i)*3,0,data.home[1]+rnd(i+3)*3);
    model.rotation.y=(i%5)*.8;
    scene.add(model);
    return {...data,model,x:model.position.x,z:model.position.z,target:[...data.work],phase:i*.7,seed,stopped:0};
  });
  // Populate outdoor plaza with simple lightweight visitors, not full relationship trees.
  const visitors=Array.from({length:7},(_,i)=>{
    const model=makePerson(i%3===0?'cat':i%3===1?'bunny':'kid',{shirt:[0xc9a1b6,0xa9bf80,0x8caacc,0xd7ad7d][i%4]});
    model.position.set((i%3-1)*7,0,9+Math.floor(i/3)*5);
    scene.add(model);
    return {model,x:model.position.x,z:model.position.z,target:[Math.sin(i*2)*10,7+Math.cos(i)*10],phase:i*1.6,seed:i+20,stopped:0,visitor:true};
  });
  actors.push(...visitors);
  const focusables=[
    {id:'mayor',x:0,z:-16,r:3,name:"Mayor's Hall"},
    {id:'bakery',x:-21,z:-8.2,r:3.1,name:"Pip's Bakery"},
    {id:'furniture',x:21,z:-8.2,r:3.1,name:'Little Oak Furnishings'},
    {id:'general',x:38,z:-7.2,r:3.1,name:'General Goods'},
    ...LOTS.map((l,i)=>({id:'lot-'+i,x:l.x,z:l.z+5.2,r:3.4,name:l.name}))
  ];
  function walkable(x,z){
    if(Math.abs(x)>83||Math.abs(z)>79)return false;
    if(x>48&&x<59&&Math.abs(z+14)>4.4)return false;
    for(const o of obstacles){
      if(Math.abs(x-o.x)<o.w/2+.52&&Math.abs(z-o.z)<o.d/2+.52)return false;
    }
    if(Math.hypot(x,z-4)<2.55)return false;
    return true;
  }
  function update(dt,t,daySeconds){
    const dayFraction=(daySeconds%1320)/1320;
    const phase=dayFraction<.28?'morning':dayFraction<.54?'work':dayFraction<.79?'visit':'night';
    for(let i=0;i<actors.length;i++){
      const a=actors[i];
      let goal;
      if(a.visitor){
        const k=Math.floor(daySeconds/20+a.seed)%7;
        goal=[[8,10],[-8,15],[5,0],[-5,0],[11,17],[-12,8],[0,21]][k];
      } else {
        goal=phase==='morning'?a.home:phase==='work'?a.work:phase==='visit'?a.visit:a.night;
      }
      if(Math.hypot(a.x-goal[0],a.z-goal[1])<1){
        a.stopped+=dt;
        if(a.stopped>3+a.seed%4)a.target=[goal[0]+Math.sin(t*.2+a.seed)*1.15,goal[1]+Math.cos(t*.2+a.seed)*.9];
      }else{a.target=goal;a.stopped=0;}
      const dx=a.target[0]-a.x,dz=a.target[1]-a.z,d=Math.hypot(dx,dz);
      const moving=d>.35;
      if(moving){
        const speed=a.visitor?1.0:1.3;
        const xx=a.x+dx/d*Math.min(dt*speed,d),zz=a.z+dz/d*Math.min(dt*speed,d);
        // Simple road-aware movement: prevent an NPC clipping through houses or the well.
        if(walkable(xx,zz)){a.x=xx;a.z=zz;}
        else if(walkable(xx,a.z)){a.x=xx;}
        else if(walkable(a.x,zz)){a.z=zz;}
        a.model.rotation.y=Math.atan2(dx,dz);
      }
      a.model.position.set(a.x,0,a.z);
      animatePerson(a.model,t,moving,a.phase);
    }
  }
  function useLot(deed){
    for(let i=0;i<LOTS.length;i++)LOTS[i].tag.visible=deed===null||deed===i;
    if(deed!==null){LOTS[deed].tag.material.map?.dispose?.();} // The selected house now belongs to the player.
  }
  return {scene,player,actors,focusables,buildings,walkable,update,useLot,locations:LOCATIONS};
}
