import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createChibi } from './chibi.js';
import { updateCharacterAnimation,animateLegacyCharacter } from './animation.js';
import { QUALITY,TOON_RAMP,roundedBox,capsule,chooseQuality } from '../visual/gfx.js';
const cast=['kid','hedgehog','cat','bunny','bear','duck','dog','frog'];
test('every species builds a positionable rig with recognizable anatomy',()=>{
  for(const kind of cast){
    const g=createChibi(kind);
    assert.ok(g instanceof THREE.Group);
    assert.equal(g.userData.kind,kind);
    assert.equal(g.userData.rig.eyes.length,2);
    assert.equal(g.userData.rig.arms.length,2);
    assert.equal(g.userData.rig.legs.length,2);
    assert.ok(g.userData.rig.head.position.y>1.4);
    assert.ok(g.userData.rig.head.position.y<1.7);
  }
});
test('velocity drives gait and stopping blends to idle',()=>{
  const g=createChibi('cat');
  for(let i=0;i<30;i++)updateCharacterAnimation(g,1/60,{velocity:{x:0,z:3.2}});
  assert.ok(g.userData.animation.speed>2);
  assert.ok(Math.abs(g.userData.rig.legs[0].rotation.x)>.02);
  for(let i=0;i<70;i++)updateCharacterAnimation(g,1/60,{velocity:{x:0,z:0}});
  assert.ok(g.userData.animation.speed<.01);
});
test('talking, carrying, sitting and looking are safe',()=>{
  const g=createChibi('bunny');
  for(let i=0;i<30;i++)updateCharacterAnimation(g,1/60,{
    velocity:{x:1,z:1},talking:true,carrying:true,sitting:true,lookAt:{x:4,y:2,z:4}});
  assert.ok(g.userData.animation.talk>.9);
  assert.ok(g.userData.animation.carry>.9);
  assert.ok(g.userData.animation.sit>.9);
  assert.ok(Number.isFinite(g.userData.rig.head.rotation.y));
});
test('legacy calls and graphics geometry caches stay compatible',()=>{
  const g=createChibi('hedgehog');
  assert.doesNotThrow(()=>animateLegacyCharacter(g,1,true,0));
  assert.equal(roundedBox(1,1,1),roundedBox(1,1,1));
  assert.equal(capsule(.1,.3),capsule(.1,.3));
  assert.equal(TOON_RAMP.image.width,5);
  assert.equal(chooseQuality({coarse:true}),'medium');
  assert.equal(QUALITY.low.outline,0);
});
