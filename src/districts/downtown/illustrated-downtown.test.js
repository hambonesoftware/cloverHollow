import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createDowntownDistrict } from './index.js';
import { createDowntownProp, PROP_TYPES } from '../../props/downtown/index.js';
import { DISTRICT_SITES } from '../../world/district-plan.js';

const sites=DISTRICT_SITES.filter(s=>s.district==='downtown');
test('at least 25 distinct seeded prop archetypes are constructible',()=>{
 assert.ok(PROP_TYPES.length>=25);
 assert.equal(new Set(PROP_TYPES).size,PROP_TYPES.length);
 for(const type of PROP_TYPES){
  const a=createDowntownProp(type,{seed:'repeat',quality:'low'});
  const b=createDowntownProp(type,{seed:'repeat',quality:'low'});
  assert.ok(a.children.length>0,type);
  assert.equal(a.children.length,b.children.length,type);
  assert.deepEqual(a.children.map(o=>o.position.toArray()),b.children.map(o=>o.position.toArray()),type);
 }
});
test('all district identities, entrances, service actions and activity stations survive',()=>{
 const scene=new THREE.Scene();
 const snapshot=sites.map(s=>[s.id,s.x,s.z,...s.entrance]);
 const district=createDowntownDistrict(scene,{sites,seed:17,quality:'low'});
 assert.equal(district.root.parent,scene);
 assert.equal(district.root.children.length,sites.length);
 assert.deepEqual(sites.map(s=>[s.id,s.x,s.z,...s.entrance]),snapshot);
 for(const site of sites){
  assert.ok(district.root.children.some(o=>o.userData.siteId===site.id));
  assert.ok(district.interactables.some(a=>a.siteId===site.id));
  assert.ok(district.activityAnchors.some(a=>a.siteId===site.id));
  for(const a of district.activityAnchors.filter(a=>a.siteId===site.id)){
   assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.z));
   assert.ok(a.capacity>=1&&a.role&&a.pose&&a.activity);
   assert.ok(a.z>=site.z+site.d/2+1.5);
  }
 }
 district.update(.016,500);
 district.dispose();district.dispose();
 assert.equal(district.root.parent,null);
});
test('low, medium, high construct and preserve identical service ids',()=>{
 const result=[];
 for(const quality of ['low','medium','high']){
  const scene=new THREE.Scene();
  const district=createDowntownDistrict(scene,{sites,seed:'illustrated',quality});
  result.push(district.interactables.map(i=>i.id));
  assert.ok(district.activityAnchors.length>=sites.length*2);
  district.dispose();
 }
 assert.deepEqual(result[0],result[1]);assert.deepEqual(result[1],result[2]);
});
