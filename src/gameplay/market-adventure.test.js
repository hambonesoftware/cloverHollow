import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createMarketAdventure,MARKET_STAGE,APPLE_REWARD,HIDDEN_REWARD} from './market-adventure.js';
import {createPlayableMarket} from './market-scene.js';
import {createOutdoorCollision} from '../world/layout.js';

const pos=(point)=>[point.x,point.z];

test('every playable item occupies a reachable area outside all building collision',()=>{
  const {walkable}=createOutdoorCollision();
  for(const p of [MARKET_STAGE.cart,MARKET_STAGE.basket,...MARKET_STAGE.apples,MARKET_STAGE.secret]){
    assert.equal(walkable(...pos(p)),true,'item must be in navigable public space: '+JSON.stringify(p));
  }
});
test('the actual pickup/carry/return sequence creates one saved reward',()=>{
  const game=createMarketAdventure();
  assert.equal(game.state().phase,'idle');
  assert.equal(game.interact(0,0),null);
  assert.match(game.prompt(1.5,8.5)?.title??'',/delivery/i);
  assert.equal(game.interact(...pos(MARKET_STAGE.cart)).kind,'start');
  assert.equal(game.state().phase,'started');
  assert.equal(game.interact(...pos(MARKET_STAGE.apples[0])).kind,'wait');
  for(let i=0;i<10;i++)game.tick(.12);
  for(let i=0;i<3;i++){
    const apple=MARKET_STAGE.apples[i];
    assert.equal(game.interact(...pos(apple)).kind,'pickup');
    assert.equal(game.state().carrying,i);
    assert.equal(game.interact(...pos(apple)),null,'a carried apple cannot be duplicated');
    const result=game.interact(...pos(MARKET_STAGE.basket));
    assert.equal(result.kind,i<2?'deliver':'complete');
    if(i===2)assert.equal(result.reward,APPLE_REWARD);
    assert.equal(game.state().delivered,i+1);
  }
  assert.equal(game.state().phase,'completed');
  assert.equal(game.state().carrying,null);
  assert.equal(game.interact(...pos(MARKET_STAGE.cart)).kind,'thanks');
  assert.equal(game.interact(999,999),null);
});
test('a found secret never respawns after saving its keepsake',()=>{
  const game=createMarketAdventure();
  const result=game.interact(...pos(MARKET_STAGE.secret));
  assert.equal(result.reward,HIDDEN_REWARD);
  assert.equal(game.state().found,true);
  assert.equal(game.interact(...pos(MARKET_STAGE.secret)),null);
  const reloaded=createMarketAdventure({gifts:{[HIDDEN_REWARD]:1,[APPLE_REWARD]:1}});
  assert.equal(reloaded.state().phase,'completed');
  assert.equal(reloaded.state().found,true);
  assert.equal(reloaded.state().delivered,3);
});
test('market mesh groups match rules and move with game-state changes',()=>{
  const scene=new THREE.Scene(),player=new THREE.Group();
  scene.add(player);
  const market=createPlayableMarket(scene,{player,quality:'low'});
  assert.equal(market.root.parent,scene);
  assert.ok(market.root.getObjectByName('Apple cart'));
  assert.ok(market.root.getObjectByName('Delivery basket'));
  assert.ok(market.root.getObjectByName('Creekside discovery'));
  assert.equal(market.interact(...pos(MARKET_STAGE.cart)).kind,'start');
  for(let i=0;i<12;i++)market.update(.1);
  assert.equal(market.interact(...pos(MARKET_STAGE.apples[0])).kind,'pickup');
  player.position.set(6,0,17);market.update(.016);
  assert.equal(market.inspect().carrying,0);
  market.dispose();
  assert.equal(market.root.parent,null);
});
