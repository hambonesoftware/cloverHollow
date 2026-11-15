import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createDowntownDistrict} from './index.js';
import {createCivicInterior} from '../../civic/interior.js';
import {serviceActions,validateDowntownAction,mailService,mayorService} from '../../services/downtown/index.js';
const kinds=['town-hall','mayor-office','post-office','library','community-center','bakery','furniture','general-goods','florist','cafe','tailor','bookshop','market'];
const sites=kinds.map((kind,i)=>({id:'downtown-'+i,district:'clover-square',x:i*15,z:0,w:10,d:9,name:kind,kind,seed:i+4}));
test('all required destinations produce site-bound action identifiers',()=>{
 const scene=new THREE.Scene();const district=createDowntownDistrict(scene,{sites,seed:43,quality:'low'});
 assert.equal(scene.children.includes(district.root),true);
 for(const site of sites){
  const group=district.root.children.find(c=>c.userData.siteId===site.id);
  assert.ok(group,site.kind);
  assert.equal(group.position.x,site.x);
  for(const action of serviceActions(site.kind))assert.ok(district.interactables.some(i=>i.siteId===site.id&&i.action===action.action));
 }
 assert.ok(district.interactables.every(i=>Number.isFinite(i.x)&&Number.isFinite(i.z)&&i.radius>0));
 district.update(.016,3600);district.dispose();district.dispose();
 assert.equal(scene.children.includes(district.root),false);
});
test('same seeds generate repeatable roof geometry and palettes',()=>{
 const a=createDowntownDistrict(new THREE.Scene(),{sites:sites.slice(0,2),seed:4});
 const b=createDowntownDistrict(new THREE.Scene(),{sites:sites.slice(0,2),seed:4});
 assert.deepEqual(a.root.children.map(c=>c.userData.kind),b.root.children.map(c=>c.userData.kind));
 assert.equal(a.root.children[0].children[0].userData.roofPalette,b.root.children[0].children[0].userData.roofPalette);
 a.dispose();b.dispose();
});
test('duplicate and malformed sites are rejected',()=>{
 assert.throws(()=>createDowntownDistrict(new THREE.Scene(),{sites:[sites[0],sites[0]]}),/Duplicate/);
 assert.throws(()=>createDowntownDistrict(new THREE.Scene(),{sites:[{id:'bad',x:0,z:0,w:0,d:3}]}),/Invalid/);
});
test('walkable open-front civic interior',()=>{
 const room=createCivicInterior({kind:'library'});
 assert.equal(room.userData.walkable,true);
 assert.ok(room.userData.openSides.includes('front'));
 assert.ok(room.children.length>10);
});
test('services are pure descriptors, not save state mutations',()=>{
 assert.equal(validateDowntownAction('post-office','mail.send'),true);
 assert.equal(validateDowntownAction('post-office','shop.furniture'),false);
 const letters=[{id:'letter-1'}];const inbox=mailService({letters});
 letters.push({id:'letter-2'});
 assert.equal(inbox.letters.length,1);
 assert.equal(mayorService({deedStatus:'unchanged'}).deedStatus,'unchanged');
});
