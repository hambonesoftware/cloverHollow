import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createStreetLife,sampleStreetStory} from './street-life.js';
import {DISTRICT_SITES,DISTRICT_PATHS} from '../world/district-plan.js';
import {BUILDINGS,PATH_SEGMENTS,PLACES,createOutdoorCollision} from '../world/layout.js';
import {createPedestrianGraph,findPedestrianRoute,isRouteClear} from '../world/navigation.js';

test('street stories are deterministic, cycle daily, and change by time of day',()=>{
  assert.deepEqual(sampleStreetStory(420),sampleStreetStory(420+1320));
  const morning=sampleStreetStory(420),afternoon=sampleStreetStory(620),evening=sampleStreetStory(990);
  assert.ok(morning.marketOpen&&morning.morningDelivery&&morning.bakeryRush);
  assert.ok(!morning.fallenParcels&&!morning.rehearsal);
  assert.ok(afternoon.fallenParcels&&!afternoon.morningDelivery);
  assert.ok(evening.rehearsal&&evening.lanterns>.5);
});
test('scene mounts animated vignettes and can be disposed safely',()=>{
  for(const quality of ['low','medium','high']){
    const scene=new THREE.Scene(),life=createStreetLife(scene,{quality});
    assert.ok(scene.children.includes(life.root));
    assert.equal(life.vignetteCount,5);
    assert.ok(life.root.children.length>=5);
    const keepsake=life.root.getObjectByName('Housewarming keepsake');
    assert.ok(keepsake&&!keepsake.visible);
    life.update(1/60,420,{housewarming:true,conversations:{Pip:4}});
    assert.ok(keepsake.visible,'past housewarming remains visible in the public square');
    assert.doesNotThrow(()=>life.update(1/60,620));
    assert.doesNotThrow(()=>life.update(1/60,990));
    life.dispose();
    assert.ok(!scene.children.includes(life.root));
  }
});
test('two-sided Old Market has angled, reachable pedestrian links',()=>{
  const shops=DISTRICT_SITES.filter(site=>site.district==='downtown');
  const opposing=shops.filter(site=>site.facing==='south');
  assert.equal(opposing.length,4);
  assert.ok(opposing.every(s=>s.entrance[1]<s.z));
  assert.ok(shops.some(s=>s.facing==='north'));
  assert.ok(DISTRICT_PATHS.some(([x0,z0,x1,z1])=>x0!==x1&&z0!==z1));
  const {walkable}=createOutdoorCollision();
  const graph=createPedestrianGraph(PATH_SEGMENTS,walkable);
  for(const site of shops){
    const route=findPedestrianRoute(graph,PLACES.square,site.entrance);
    assert.ok(route&&route.length>1,'route to '+site.id);
    assert.ok(isRouteClear(route,walkable),'unsafe walk to '+site.id);
  }
  for(const building of BUILDINGS)assert.ok(walkable(...building.entrance),building.id);
});
