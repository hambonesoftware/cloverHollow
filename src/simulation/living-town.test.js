import test from 'node:test';
import assert from 'node:assert/strict';
import { LOTS } from '../rules.js';
import { BUILDINGS, PATH_SEGMENTS, PLACES, createOutdoorCollision } from '../world/layout.js';
import { createPedestrianGraph, findPedestrianRoute, isRouteClear } from '../world/navigation.js';
import { RESIDENTS, ACTIVITIES, DAY_LENGTH, createNpcSimulation, getScheduleActivity } from './town-life.js';

const {walkable}=createOutdoorCollision();
const graph=createPedestrianGraph(PATH_SEGMENTS,walkable);

test('all building and player-lot entrances are accessible from the square',()=>{
  for(const building of BUILDINGS){
    assert.ok(walkable(...building.entrance),`${building.id} entrance blocked`);
    const route=findPedestrianRoute(graph,PLACES.square,building.entrance);
    assert.ok(route,`no public route to ${building.id}`);
    assert.ok(isRouteClear(route,walkable),`route intersects an obstacle: ${building.id}`);
    assert.deepEqual([route.at(-1).x,route.at(-1).z],building.entrance);
  }
});

test('navigation avoids the well, house footprints and water',()=>{
  assert.equal(walkable(0,4),false,'the plaza well is not walkable');
  assert.equal(walkable(0,-25),false,'mayor interior is not walkable');
  assert.equal(walkable(66,35),false,'the stream is not a sidewalk');
  const route=findPedestrianRoute(graph,PLACES.market,PLACES.plazaEast);
  assert.ok(isRouteClear(route,walkable));
  assert.ok(route.length>=3,'walk around the well rather than walking through it');
});

test('routes are deterministic across repeated calls',()=>{
  const a=findPedestrianRoute(graph,[-55,-9],[52,23]);
  const b=findPedestrianRoute(graph,[-55,-9],[52,23]);
  assert.deepEqual(a,b);
});

test('house-plot identity is stable and does not mutate rules data',()=>{
  assert.equal(BUILDINGS.filter(b=>b.kind==='lot').length,LOTS.length);
  for(let i=0;i<LOTS.length;i++){
    const building=BUILDINGS.find(b=>b.id===`lot-${i}`);
    assert.equal(building.lotIndex,i);
    assert.equal(building.x,LOTS[i].x);
    assert.equal(building.z,LOTS[i].z);
    assert.deepEqual(building.entrance,[LOTS[i].x,LOTS[i].z+5]);
    assert.equal(Object.hasOwn(LOTS[i],'tag'),false,'renderer must not write to the rules data');
  }
});

test('residents keep Willowbend identities and cover every daily activity',()=>{
  assert.deepEqual(RESIDENTS.map(v=>v.name),[
    'Mayor Thistle','Mabel','Pip','Bruno','Dot','Biscuit','Fennel','Hazel','Clover','Reed'
  ]);
  const encountered=new Set();
  for(let t=0;t<DAY_LENGTH;t+=10)encountered.add(getScheduleActivity(t));
  // 'waiting' is an ambient visitor behavior, not an assigned resident shift.
  for(const activity of ACTIVITIES.filter(activity=>activity!=='waiting'))
    assert.ok(encountered.has(activity),activity);
  assert.ok(ACTIVITIES.includes('waiting'),'expanded visitors can pause at venues');
});

test('a simulated day follows clear routes without cutting through buildings',()=>{
  const sim=createNpcSimulation(graph);
  assert.equal(sim.residents.length,10);
  assert.equal(sim.visitors.length,5);
  for(const tick of [200,380,630,850,990,1140,1270]){
    for(let j=0;j<320;j++){
      sim.advance(.1,tick);
      for(const actor of sim.actors){
        assert.ok(walkable(actor.x,actor.z),`${actor.name} at blocked position ${actor.x},${actor.z}`);
        assert.equal(actor.routeError??null,null,`unreachable destination for ${actor.name}`);
      }
    }
  }
  assert.ok(sim.residents.every(a=>ACTIVITIES.includes(a.intention)));
  assert.ok(sim.visitors.every(a=>a.visible===false),'visitors retire at night');
});

test('visitor budget is capped and does not persist state',()=>{
  const sim=createNpcSimulation(graph,{visitorCount:100});
  // A higher explicit budget is allowed, while the default remains five.
  assert.equal(sim.visitors.length,24);
  assert.equal(createNpcSimulation(graph).visitors.length,5);
  sim.advance(.1,500);
  assert.ok(sim.visitors.some(v=>v.visible));
  sim.advance(.1,1220);
  assert.ok(sim.visitors.every(v=>!v.visible));
});
