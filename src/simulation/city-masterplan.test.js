import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILDINGS, PATH_SEGMENTS, PLACES, createOutdoorCollision } from '../world/layout.js';
import { DISTRICTS, DISTRICT_SITES, DISTRICT_PATHS, WORLD_BOUNDS } from '../world/district-plan.js';
import { createPedestrianGraph, findPedestrianRoute, isRouteClear } from '../world/navigation.js';
import { RESIDENTS, ACTIVITIES, createNpcSimulation } from './town-life.js';
import { LOTS } from '../rules.js';

const overlap=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2+.6&&
  Math.abs(a.z-b.z)<(a.d+b.d)/2+.6;
test('district registry is immutable, unique and nonoverlapping',()=>{
  assert.ok(Object.isFrozen(DISTRICTS));
  assert.ok(Object.isFrozen(DISTRICT_SITES));
  assert.ok(DISTRICT_SITES.length>=12);
  const ids=new Set();
  for(const site of DISTRICT_SITES){
    assert.ok(Object.isFrozen(site)&&Object.isFrozen(site.entrance));
    assert.ok(['downtown','entertainment'].includes(site.district));
    assert.ok(!ids.has(site.id),site.id);ids.add(site.id);
    assert.ok(site.seed&&site.kind&&site.name);
    assert.deepEqual(site.entrance,[site.x,site.z+site.d/2+1.5]);
    assert.ok(site.x-site.w/2>=WORLD_BOUNDS.minX&&site.x+site.w/2<=WORLD_BOUNDS.maxX);
    assert.ok(site.z-site.d/2>=WORLD_BOUNDS.minZ&&site.z+site.d/2<=WORLD_BOUNDS.maxZ);
    for(const other of BUILDINGS)if(other.id!==site.id)
      assert.ok(!overlap(site,other),site.id+' overlaps '+other.id);
  }
});
test('original player lots and named neighbors are unchanged',()=>{
  LOTS.forEach((lot,i)=>{
    const b=BUILDINGS.find(b=>b.id==='lot-'+i);
    assert.deepEqual([b.x,b.z,b.lotIndex],[lot.x,lot.z,i]);
  });
  for(const id of ['mayor','mabel','bruno','pip','dot','fennel','hazel','clover','reed','biscuit'])
    assert.ok(RESIDENTS.some(n=>n.id===id));
});
test('every old and new doorway is connected by collision-safe walking route',()=>{
  const {walkable}=createOutdoorCollision();
  const graph=createPedestrianGraph(PATH_SEGMENTS,walkable);
  assert.ok(graph.nodes.size>250);
  for(const b of BUILDINGS){
    assert.ok(walkable(...b.entrance),'door blocked: '+b.id);
    const route=findPedestrianRoute(graph,PLACES.square,b.entrance);
    assert.ok(route&&route.length>1,'unreachable: '+b.id);
    assert.ok(isRouteClear(route,walkable),'unsafe route: '+b.id);
  }
  assert.ok(DISTRICT_PATHS.length>25);
});
test('simulated visitors use districts without crossing obstacles',()=>{
  const {walkable}=createOutdoorCollision();
  const graph=createPedestrianGraph(PATH_SEGMENTS,walkable);
  const simulation=createNpcSimulation(graph,{visitorCount:16});
  assert.equal(simulation.visitors.length,16);
  for(const activity of ['delivery','shopping','socializing','attending_event','returning_home'])
    assert.ok(ACTIVITIES.includes(activity));
  for(const time of [250,420,650,790,1010]){
    for(let i=0;i<100;i++)simulation.advance(.1,time+i*.2);
    for(const actor of simulation.actors){
      if(!actor.visible)continue;
      assert.ok(walkable(actor.x,actor.z),'actor blocked: '+actor.id);
      if(actor.route.length)assert.ok(isRouteClear(actor.route,walkable),actor.id+' route blocked');
    }
  }
});
