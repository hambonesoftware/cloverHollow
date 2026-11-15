import test from 'node:test';
import assert from 'node:assert/strict';
import { designBuilding, FAMILIES, seeded, validateEntrances } from './design.js';
import { BUILDINGS, PATH_SEGMENTS, createOutdoorCollision } from '../world/layout.js';
import { LOTS } from '../rules.js';

test('four procedural architectural families remain available',()=>{
  assert.deepEqual(FAMILIES,['storybook','toadstool','moonspire','hobbit']);
  const b=BUILDINGS[0];
  for(const family of FAMILIES){
    const plan=designBuilding(b,{family,seed:'same-seed'});
    assert.equal(plan.family,family);
    assert.ok(plan.wallHeight>=2.7);
    assert.ok(plan.roofOverhang<=.55);
  }
});
test('seeded designs are byte-for-byte deterministic',()=>{
  for(const b of BUILDINGS){
    const first=designBuilding(b,{seed:'storybook:'+b.id});
    assert.deepEqual(first,designBuilding(b,{seed:'storybook:'+b.id}));
  }
  const r1=seeded('moss'),r2=seeded('moss');
  assert.deepEqual(Array.from({length:20},()=>r1()),Array.from({length:20},()=>r2()));
});
test('seed changes architectural details without changing gameplay footprint',()=>{
  const b=BUILDINGS.find(b=>b.kind==='lot');
  const a=designBuilding(b,{seed:'one'}),c=designBuilding(b,{seed:'two'});
  assert.notEqual(a.detailSeed,c.detailSeed);
  for(const key of ['id','x','z','w','d'])assert.equal(a[key],c[key]);
  assert.deepEqual(a.entrance,c.entrance);
});
test('all building identities, positions and entrances remain unchanged',()=>{
  const plans=BUILDINGS.map(b=>designBuilding(b));
  assert.equal(validateEntrances(BUILDINGS,plans),true);
  assert.equal(BUILDINGS.filter(b=>b.kind==='lot').length,3);
  LOTS.forEach((lot,i)=>{
    const b=BUILDINGS.find(b=>b.id==='lot-'+i);
    assert.equal(b.x,lot.x);
    assert.equal(b.z,lot.z);
    assert.equal(b.lotIndex,i);
    assert.deepEqual(b.entrance,[lot.x,lot.z+5]);
  });
});
test('invalid dimensions, families and overhangs are rejected',()=>{
  const b=BUILDINGS[0];
  assert.throws(()=>designBuilding({...b,w:0}),RangeError);
  assert.throws(()=>designBuilding({...b,entrance:[Infinity,0]}),RangeError);
  assert.throws(()=>designBuilding(b,{family:'castle'}),RangeError);
  assert.throws(()=>designBuilding(b,{roofOverhang:5}),RangeError);
  assert.throws(()=>designBuilding(b,{roofCurvature:0}),RangeError);
});
test('doorway approach points remain walkable with unchanged navigation footprints',()=>{
  const {walkable}=createOutdoorCollision();
  for(const b of BUILDINGS){
    assert.equal(walkable(...b.entrance),true,'blocked entrance: '+b.id);
  }
  assert.ok(PATH_SEGMENTS.length>20);
});
