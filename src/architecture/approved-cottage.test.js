import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { BUILDINGS, createOutdoorCollision } from '../world/layout.js';
import { designBuilding } from './design.js';
import { createFairyBuilding } from './generator.js';
import { approvedSwoopHeight } from './approved-cottage.js';

const cottage=BUILDINGS.find(b=>b.id==='lot-0');
const workshop=BUILDINGS.find(b=>b.id==='bruno');

function find(root,name){
  const result=root.getObjectByName(name);
  assert.ok(result,'Expected generated object: '+name);
  return result;
}
function sampleColor(mesh,index){
  const c=new THREE.Color();
  mesh.getColorAt(index,c);
  return c;
}

test('roof profile is the original approved curved prototype, not two flat pitched slabs',()=>{
  const plan=designBuilding(cottage,{family:'storybook',seed:'approved-prototype'});
  const width=plan.w+2*(.37+plan.roofOverhang*.76);
  const base=plan.wallHeight+.54;
  const rise=3.18*plan.roofCurvature;
  const y=x=>approvedSwoopHeight(x,0,width,rise,base);
  const center=y(0),quarter=y(width*.25),eave=y(width*.5);
  assert.ok(center>quarter&&quarter>eave,'organic sweeping gable must curve');
  assert.ok(center-eave>2,'roof must have a whimsical oversized silhouette');
  assert.ok(Math.abs(approvedSwoopHeight(0,0,width,rise,base)-(base+rise))<1e-9);
});
test('actual runtime factory builds approved roof, roof-following house and arched door',()=>{
  const result=createFairyBuilding(cottage,{
    family:'storybook',seed:'approved-prototype',
    palette:{roof:0xb67d98,wall:0xf0dfc9}
  });
  assert.ok(result instanceof THREE.Group);
  assert.equal(result.userData.buildingId,cottage.id);
  assert.deepEqual(result.userData.entrance,[...cottage.entrance]);
  assert.deepEqual(result.userData.collisionFootprint,{
    x:cottage.x,z:cottage.z,w:cottage.w,d:cottage.d
  });
  const roof=find(result,'Approved fairy swoop • continuous curved roof');
  const body=find(result,'Roof-following cottage shell');
  const door=find(result,'Approved cottage arched doorway');
  assert.ok(roof.geometry.isBufferGeometry);
  assert.ok(body.geometry.isExtrudeGeometry);
  assert.ok(door.geometry.isExtrudeGeometry);
  body.geometry.computeBoundingBox();
  assert.ok(body.geometry.boundingBox.max.y>4);
  assert.equal(roof.userData.approvedPrototype,'sweepHeight');
});
test('shingles use seeded multi-tonal roof color, never cream facade trim',()=>{
  const plan=designBuilding(workshop,{family:'storybook',seed:'roof-palette',
    palette:{roof:0xb67d98,trim:0xffefcf}});
  const house=createFairyBuilding(workshop,{family:'storybook',seed:'roof-palette',
    palette:plan.palette});
  const shingles=find(house,'Approved fairy roof • colored curved shingles');
  assert.ok(shingles instanceof THREE.InstancedMesh);
  assert.ok(shingles.count>=150);
  assert.ok(shingles.instanceColor,'per shingle color values must be present');
  const colors=[sampleColor(shingles,0),sampleColor(shingles,1),sampleColor(shingles,4)];
  assert.ok(colors.some((c,i)=>i>0&&c.distanceTo(colors[0])>.005),
    'per tile colors should vary');
  const average=colors.reduce((acc,c)=>acc.add(c),new THREE.Color(0)).multiplyScalar(1/colors.length);
  assert.ok(average.distanceTo(new THREE.Color(0xb67d98))<
    average.distanceTo(new THREE.Color(0xffefcf)),
    'roof should resemble the original rose/purple palette, not cream shingles');
});
test('moonspire shares identical roof algorithm and grows a curled tower into it',()=>{
  const house=createFairyBuilding(cottage,{family:'moonspire',seed:'moonspire-approved'});
  const roof=find(house,'Approved fairy swoop • continuous curved roof');
  const tower=find(house,'Approved prototype • crooked Moonspire');
  assert.ok(roof&&tower);
  assert.equal(roof.userData.approvedPrototype,'sweepHeight');
  tower.geometry.computeBoundingBox();
  assert.ok(tower.geometry.boundingBox.max.y>8);
});
test('town route, door location and seeded architecture are unchanged',()=>{
  const {walkable}=createOutdoorCollision();
  assert.equal(walkable(...cottage.entrance),true);
  const a=createFairyBuilding(cottage,{family:'storybook',seed:'deterministic'});
  const b=createFairyBuilding(cottage,{family:'storybook',seed:'deterministic'});
  const ga=find(a,'Approved fairy swoop • continuous curved roof').geometry;
  const gb=find(b,'Approved fairy swoop • continuous curved roof').geometry;
  assert.deepEqual(Array.from(ga.attributes.position.array),
    Array.from(gb.attributes.position.array));
  const ca=find(a,'Approved fairy roof • colored curved shingles').instanceColor.array;
  const cb=find(b,'Approved fairy roof • colored curved shingles').instanceColor.array;
  assert.deepEqual(Array.from(ca),Array.from(cb));
});
