import * as THREE from 'three';
import { LOTS } from './rules.js';
import { box, sphere, cylinder, flat, sign, makePerson, animatePerson, tree, flower, gardenBench, lampPost } from './art.js';
import { createFairyBuilding } from './architecture/generator.js';
import { createFairyLandscape } from './environment/landscape.js';
import { BUILDINGS, PATH_SEGMENTS, PLACES, createOutdoorCollision } from './world/layout.js';
import { createPedestrianGraph, findPedestrianRoute } from './world/navigation.js';
import { createNpcSimulation, DAY_LENGTH } from './simulation/town-life.js';
import { DISTRICT_SITES, WORLD_BOUNDS } from './world/district-plan.js';
import { createCityInfrastructure } from './city/infrastructure.js';

const rnd=n=>{const s=Math.sin(n*127.1+31.7)*43758.5453;return s-Math.floor(s);};
const color={grass:0xa8cda0,road:0xe9d6b4,roadEdge:0x91b29b,wood:0xb18c6c};
const asPoint=([x,z])=>({x,z});

/**
 * Clover Hollow's outdoor Three.js view / world adapter.
 * UI and persistence belong to other layers, never to this module.
 * Existing interface: player, actors, focusables, buildings, walkable,
 * update(dt, elapsedSeconds, daySeconds), useLot(index|null), locations.
 *
 * Additional API:
 *   getNearestBuilding(x,z,radius=3.5) -> focusable or null
 *   getNearestInteractable(x,z,radius=3.5) -> same
 *   getPlayerLot(deed?) -> {id,index,entrance, ...} or null
 *   getNpcState(id) -> current plain simulation snapshot or null
 *   findRoute([x,z],[x,z]) -> navigation waypoints or null
 *   updateNpcSimulation(dt,daySeconds) -> update the pure model ONLY.
 *   pedestrianGraph -> reusable navigation graph (read-only by convention)
 * The optional deed to getPlayerLot overrides the value passed to useLot.
 */
export function createTown(scene){
  scene.background=new THREE.Color(0xc9e3ea);
  scene.fog=new THREE.Fog(0xc9e3ea,105,240);
  const skyDay=new THREE.Color(0xc9e3ea),skyDusk=new THREE.Color(0xaec3d2);
  const ambient=new THREE.HemisphereLight(0xfff3e2,0x88a98e,2.05);
  scene.add(ambient);
  const sun=new THREE.DirectionalLight(0xffedce,2.35);
  sun.position.set(-35,64,35);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  Object.assign(sun.shadow.camera,{left:-100,right:100,top:100,bottom:-160,near:1,far:150});
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.normalBias=.035;scene.add(sun);

  const collision=createOutdoorCollision();
  const {walkable,obstacles}=collision;
  const pedestrianGraph=createPedestrianGraph(PATH_SEGMENTS,walkable);
  const routePoints=[...pedestrianGraph.nodes.values()];
  const findRoute=(a,b)=>findPedestrianRoute(pedestrianGraph,a,b);
  scene.add(flat(WORLD_BOUNDS.maxX-WORLD_BOUNDS.minX+18,
    WORLD_BOUNDS.maxZ-WORLD_BOUNDS.minZ+18,color.grass,0,-.09,
    (WORLD_BOUNDS.minZ+WORLD_BOUNDS.maxZ)/2));
  const cityInfrastructure=createCityInfrastructure(scene,{quality:'mobile'});

  // A gentle, readable network of village streets, local lanes and short paths.
  for(let i=0;i<PATH_SEGMENTS.length;i++){
    const [x0,z0,x1,z1]=PATH_SEGMENTS[i],wide=i<13;
    const w=(wide?5.5:1.8)+(x0===x1?0:Math.abs(x1-x0));
    const d=(wide?5.5:1.8)+(z0===z1?0:Math.abs(z1-z0));
    const cx=(x0+x1)/2,cz=(z0+z1)/2;
    scene.add(flat(w+.7,d+.7,color.roadEdge,cx,-.038,cz));
    scene.add(flat(w,d,wide?color.road:0xe8dcc4,cx,-.03,cz));
  }
  // Plaza stonework covers the roads but leaves the proper pedestrian loop.
  scene.add(flat(23,20,0xd5ba96,0,-.023,4));
  scene.add(flat(21.6,18.6,0xf0dec0,0,-.019,4));
  for(let i=-4;i<=4;i++){
    scene.add(box(.035,.012,18.3,0xe1caaa,i*2.25,-.009,4));
  }
  for(let i=-3;i<=3;i++)scene.add(box(21.2,.012,.03,0xe1caaa,0,-.008,4+i*2.3));

  // Stream, reed-fringed pond, footbridge and broad riverbank.
  scene.add(flat(13,160,0x85ac9c,66,-.06,0));
  scene.add(flat(10,160,0x80bfcc,66,-.044,0));
  scene.add(flat(7.5,160,0x6fb2c8,66,-.039,0));
  scene.add(box(22,.28,7.6,0x9a816d,65,.045,-9));
  for(let j=0;j<12;j++)scene.add(box(.16,.09,7.35,0xc5a784,54+j*2,.25,-9));
  for(const side of [-1,1]){
    scene.add(box(21,.24,.15,0x8b735e,65,1.02,-9+side*3.7));
    for(let j=0;j<6;j++)scene.add(box(.16,1.04,.16,0x8b735e,55+j*4,.53,-9+side*3.7));
  }
  scene.add(cylinder(4.15,4.3,.07,0x92b4a0,57,-.023,34,32));
  scene.add(cylinder(3.85,3.9,.09,0x7aafbb,57,.018,34,32));
  scene.add(cylinder(3.34,3.45,.055,0x6da7b7,57,.065,34,32));
  for(let i=0;i<13;i++){
    const a=i*Math.PI*2/13,r=5.4;
    const x=57+Math.cos(a)*r,z=34+Math.sin(a)*r;
    if(x<53.2)continue; // keep the pond-side walking lane wide
    scene.add(cylinder(.045,.055,.85,0x729c72,x,.43,z,5));
    scene.add(sphere(.12,0xc69e77,x,.95,z));
  }

  const buildingModels=new Map(),lotSigns=new Map();
  const buildings=BUILDINGS.map(b=>({
    id:b.id,x:b.x,z:b.entrance[1],centerZ:b.z,w:b.w,d:b.d,
    name:b.name,kind:b.kind,entrance:[...b.entrance],lotIndex:b.lotIndex??null
  }));
  for(const b of BUILDINGS){
    // District sites render with the approved procedural fairy architecture
    // until Worker 2/3 renderer modules are available. No imports required.
    const model=createFairyBuilding(b,{
      family:b.kind==='civic'?'moonspire':
        b.kind==='bakery'?'storybook':
        b.kind==='furniture'?'storybook':
        b.kind==='shop'?'toadstool':undefined,
      seed:'clover-hollow:'+b.id
    });
    scene.add(model);buildingModels.set(b.id,model);
    const front=b.z+b.d/2;
    if(b.district)continue; // district public spaces belong to city infrastructure
    scene.add(flat(2.3,1.25,0xc8a986,b.x,-.012,front+.86));
    for(const offset of [-b.w/2+.9,b.w/2-.9]){
      scene.add(box(.95,.45,.8,0xad8766,b.x+offset,.26,front+.55));
      for(let k=0;k<3;k++)scene.add(flower(b.x+offset+(k-1)*.27,front+.58,
        [0xe9999c,0xecc77c,0xddd2ec][k]));
    }
    // The new generator owns the integrated roof and storefront facade.
    // Avoid old floating awnings, roof slabs and column assemblies.
    if(b.kind==='home'||b.kind==='lot'){
      // Garden fences stop short of entrances and stay decorative.
      if(b.kind==='lot'){
        const available=sign('AVAILABLE HOME',4.2);
        available.position.set(b.x,2.9,front+2.8);scene.add(available);
        const owned=sign('YOUR HOME',3.8);
        owned.position.set(b.x,2.9,front+2.8);owned.visible=false;scene.add(owned);
        lotSigns.set(b.lotIndex,{available,owned});
      }
    }
  }

  // An active civic square: the well is a landmark, not a teleport target.
  const well=new THREE.Group();well.position.set(0,0,4);
  well.add(cylinder(2.1,2.35,.83,0xb9a48e,0,.42,0,14));
  well.add(cylinder(1.6,1.6,.12,0x73a9ba,0,.89,0,18));
  well.add(cylinder(.13,.13,2.8,0x97765b,-1.5,2.17,0),
           cylinder(.13,.13,2.8,0x97765b,1.5,2.17,0));
  well.add(box(3.5,.22,.22,0xa17e60,0,3.59,0));
  const placard=sign('CLOVER HOLLOW',5.4);placard.position.y=4.19;well.add(placard);scene.add(well);
  for(const [x,z,r] of [[-11,7,Math.PI/2],[11,7,-Math.PI/2],
    [-12,15,.25],[12,15,-.25],[-10,-5,2.5],[10,-5,-2.5],
    [-46,48,.2],[22,27,0]])scene.add(gardenBench(x,z,r));
  for(const [x,z] of [[-14,-8],[14,-8],[-14,19],[14,19],[-30,25],[28,25],
    [-45,-9],[46,-9],[-40,45],[21,46],[-8,47],[39,46],[-10,61],[17,61]])
    scene.add(lampPost(x,z));

  // Colorful working-market stalls; leave pedestrian paths open on all sides.
  for(const [x,z,c] of [[-15,4,0xe7a1aa],[15,4,0xecc985],
    [-15,13,0x8fb7a6],[15,13,0xafb0d4]]){
    const stall=new THREE.Group();stall.position.set(x,0,z);
    stall.add(box(4.05,.19,2.1,0xb98b65,0,1.12,0));
    for(const dx of [-1.8,1.8])stall.add(box(.13,2.35,.14,0x947457,dx,1.32,0));
    stall.add(box(4.55,.2,2.8,c,0,2.63,0));
    for(let k=0;k<5;k++)stall.add(sphere(.25,k%2?0xe59b8d:0xdcc276,
      (k-2)*.68,1.43,.12));
    scene.add(stall);
  }
  // A small rustic garden near the orchard, adjacent to Clover's lane.
  for(let row=0;row<3;row++){
    scene.add(box(4.6,.16,1.12,0x94765b,-61,.05,53+row*2.1));
    for(let k=-2;k<=2;k++)scene.add(sphere(.31,
      row===0?0x82b77c:row===1?0xd99b83:0xc5b78b,
      -61+k*.85,.42,53+row*2.1));
  }
  for(let i=0;i<11;i++){
    const x=-74+i*2.6,z=40+(i%3)*2.2;
    if(!walkable(x,z))continue;
    scene.add(tree(x,z,.77+rnd(i)*.16,0x81b284));
    for(let k=0;k<3;k++)scene.add(sphere(.17,0xce887c,
      x+(rnd(i*5+k)-.5)*1.8,2.6+rnd(i*9+k),z+(rnd(i*7+k)-.5)*1.9));
  }

  // Instanced silhouettes provide a fuller tree line for only a few draw calls.
  const foliage=[];
  for(let i=0;i<420&&foliage.length<122;i++){
    const x=-78+rnd(i*17+3)*158,z=-63+rnd(i*13+21)*137;
    if(Math.abs(x)<21&&z> -25&&z<23)continue;
    if(Math.abs(x+61)<20&&z>31&&z<60)continue; // intentional orchard clearing
    if(!walkable(x,z))continue;
    if(routePoints.some(p=>Math.hypot(x-p.x,z-p.z)<3.8))continue;
    if(obstacles.some(b=>Math.abs(x-b.x)<b.w/2+4.4&&Math.abs(z-b.z)<b.d/2+4.4))continue;
    foliage.push({x,z,s:.7+rnd(i+7)*.65,t:i%3});
  }
  const trunkGeo=new THREE.CylinderGeometry(.22,.32,2.25,7);
  const crownGeo=new THREE.IcosahedronGeometry(1,1);
  const leafColors=[0x82ab76,0x94ba84,0x84b0a3];
  const trunkMat=new THREE.MeshToonMaterial({color:0x94745a});
  const trunkMesh=new THREE.InstancedMesh(trunkGeo,trunkMat,foliage.length);
  const leaves=leafColors.map(c=>new THREE.InstancedMesh(crownGeo,new THREE.MeshToonMaterial({color:c}),
    foliage.filter(p=>leafColors[p.t]===c).length));
  const dummy=new THREE.Object3D(),counts=[0,0,0];
  foliage.forEach((p,i)=>{
    dummy.position.set(p.x,1.12*p.s,p.z);dummy.rotation.set(0,rnd(i+4)*6,0);
    dummy.scale.setScalar(p.s);dummy.updateMatrix();trunkMesh.setMatrixAt(i,dummy.matrix);
    const k=p.t;
    dummy.position.set(p.x,3.02*p.s,p.z);
    dummy.rotation.set(0,rnd(i)*Math.PI*2,0);
    dummy.scale.set(1.48*p.s,1.19*p.s,1.35*p.s);dummy.updateMatrix();
    leaves[k].setMatrixAt(counts[k]++,dummy.matrix);
  });
  trunkMesh.instanceMatrix.needsUpdate=true;trunkMesh.castShadow=false;scene.add(trunkMesh);
  leaves.forEach(l=>{l.instanceMatrix.needsUpdate=true;l.castShadow=false;scene.add(l);});

  // Flower drifts in verges, with no obstruction of doors or route lines.
  for(let i=0;i<175;i++){
    const x=-76+rnd(i*31+9)*149,z=-60+rnd(i*29+14)*132;
    if(!walkable(x,z))continue;
    if(routePoints.some(p=>Math.hypot(x-p.x,z-p.z)<2.5))continue;
    if(obstacles.some(b=>Math.abs(x-b.x)<b.w/2+1.5&&Math.abs(z-b.z)<b.d/2+1.5))continue;
    scene.add(flower(x,z,[0xf0a8bd,0xf2d180,0xdfd7ef][i%3]));
  }

  // New batched foliage and low garden detailing obey the existing walkable
  // function; neither collision footprints nor pedestrian routes are changed.
  const landscape=createFairyLandscape(scene,{
    buildings:BUILDINGS,walkable,routePoints,seed:'clover-hollow-landscape-v1'
  });

  const player=makePerson('kid',{shirt:0x7aaf96,hair:0x634f4e,trousers:0x6a91a4});
  scene.add(player);
  const simulation=createNpcSimulation(pedestrianGraph,{visitorCount:16});
  const actorModels=new Map();
  const actors=simulation.actors.map(data=>{
    const model=makePerson(data.kind,{shirt:data.shirt,skin:data.kind==='cat'?0xf4c7a6:undefined});
    model.position.set(data.x,0,data.z);model.visible=data.visible;
    scene.add(model);actorModels.set(data.id,model);
    return {...data,model};
  });

  const focusables=BUILDINGS.map(b=>({
    id:b.id,x:b.entrance[0],z:b.entrance[1],r:b.kind==='lot'?3.4:3.2,
    name:b.name,kind:b.kind,lotIndex:b.lotIndex??null,
    entrance:[...b.entrance]
  }));
  function getNearestBuilding(x,z,radius=3.5){
    let closest=null,best=radius;
    for(const point of focusables){
      const d=Math.hypot(point.x-x,point.z-z);
      if(d<best&&d<=point.r+.5){closest=point;best=d;}
    }
    return closest;
  }
  let selectedDeed=null;
  function useLot(deed){
    const valid=Number.isInteger(deed)&&deed>=0&&deed<LOTS.length?deed:null;
    selectedDeed=valid;
    for(const [i,tags] of lotSigns){
      tags.available.visible=valid===null;
      tags.owned.visible=valid===i;
    }
  }
  function getPlayerLot(deed=selectedDeed){
    if(!Number.isInteger(deed)||deed<0||deed>=LOTS.length)return null;
    const b=BUILDINGS.find(item=>item.lotIndex===deed);
    return {id:b.id,index:deed,x:b.x,z:b.z,entrance:[...b.entrance],
      name:b.name,roof:b.roof};
  }
  const getNpcState=id=>{
    const npc=simulation.actors.find(a=>a.id===id||a.name===id);
    return npc?{id:npc.id,name:npc.name,x:npc.x,z:npc.z,activity:npc.activity,
      intention:npc.intention,target:[...npc.target],visible:npc.visible,
      moving:npc.moving,routeError:npc.routeError??null}:null;
  };
  const updateNpcSimulation=(dt,daySeconds)=>simulation.advance(dt,daySeconds);
  function update(dt,t=0,daySeconds=0){
    simulation.advance(dt,daySeconds);
    for(let i=0;i<simulation.actors.length;i++){
      const data=simulation.actors[i],view=actors[i],model=actorModels.get(data.id);
      view.x=data.x;view.z=data.z;view.target=data.target;
      view.activity=data.activity;view.intention=data.intention;
      view.visible=data.visible;view.moving=data.moving;
      model.visible=data.visible;
      if(!data.visible)continue;
      model.position.set(data.x,0,data.z);
      if(Number.isFinite(data.heading))model.rotation.y=data.heading;
      animatePerson(model,t,data.moving,data.phase);
    }
    const fraction=((daySeconds%DAY_LENGTH)+DAY_LENGTH)%DAY_LENGTH/DAY_LENGTH;
    const bright=Math.max(.28,Math.min(1,Math.sin(Math.PI*(fraction*.9+.07))*1.2));
    ambient.intensity=1.1+bright*.95;sun.intensity=.65+bright*1.75;
    scene.background.copy(skyDusk).lerp(skyDay,bright);
    scene.fog.color.copy(scene.background);
  }
  useLot(null);
  return {scene,player,actors,focusables,buildings,walkable,update,useLot,
    locations:PLACES,obstacles,pedestrianGraph,findRoute,landscape,
    cityInfrastructure,districtSites:DISTRICT_SITES,
    getNearestBuilding,getNearestInteractable:getNearestBuilding,
    getPlayerLot,getNpcState,updateNpcSimulation};
}
