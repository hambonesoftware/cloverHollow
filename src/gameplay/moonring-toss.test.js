import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createMoonringRules,createMoonringBooth,MOONRING_OFFSETS,MOONRING_BOOTH,MOONRING_REWARD} from './moonring-toss.js';
import {createOutdoorCollision} from '../world/layout.js';

test('the festival booth is in accessible public space',()=>{
  assert.ok(createOutdoorCollision().walkable(MOONRING_BOOTH.x,MOONRING_BOOTH.z+1.4));
});
test('swipe-aiming a real ring across visible pegs earns a reward after five throws',()=>{
  const game=createMoonringRules();
  assert.equal(game.state().active,false);
  assert.equal(game.interact(0,0),null);
  assert.equal(game.interact(MOONRING_BOOTH.x,MOONRING_BOOTH.z+1.4),'start');
  assert.equal(game.takeEvent().kind,'start');
  for(let round=0;round<5;round++){
    const start=game.state();
    assert.equal(start.mode,'aiming');
    const aim=MOONRING_OFFSETS[start.target]/1.85;
    assert.equal(game.setAim(aim),true);
    assert.equal(game.interact(0,0),'throw','after starting, throws are controlled from the camera');
    for(let i=0;i<10;i++)game.tick(.12);
    const event=game.takeEvent();
    assert.equal(event.kind,round===4?'finish':'hit');
    assert.equal(game.state().round,round+1);
    assert.equal(game.state().score,round+1);
    if(round===4)assert.equal(event.reward,MOONRING_REWARD);
  }
  assert.equal(game.state().mode,'finished');
  assert.equal(game.state().active,false);
  assert.equal(game.interact(MOONRING_BOOTH.x,MOONRING_BOOTH.z+1.4),'start',
    'the optional carnival game can be replayed');
  game.cancel();
  assert.equal(game.state().mode,'idle');
});
test('world-space pegs, flying ring and targets are actual Three.js objects',()=>{
  const scene=new THREE.Scene(),booth=createMoonringBooth(scene,{quality:'low'});
  assert.equal(booth.root.parent,scene);
  assert.ok(booth.root.children.length>=20);
  booth.rules.start();
  assert.ok(booth.rules.setAim(.8));
  assert.ok(booth.rules.throwRing());
  booth.update(.1);
  assert.equal(booth.inspect().mode,'flying');
  assert.ok(booth.root.children.some(o=>o.geometry?.type==='TorusGeometry'&&o.visible));
  booth.dispose();
  assert.equal(booth.root.parent,null);
});
