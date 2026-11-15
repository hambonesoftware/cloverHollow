import test from 'node:test';
import assert from 'node:assert/strict';
import {createNpcSimulation,DAY_LENGTH} from './town-life.js';
import {timePhase} from '../behaviors/activity-director.js';
import {RESIDENTS} from './town-life.js';
import {createPedestrianGraph} from '../world/navigation.js';
import {PATH_SEGMENTS,createOutdoorCollision} from '../world/layout.js';
test('named residents preserve IDs and homes',()=>{
 assert.deepEqual(RESIDENTS.map(r=>r.id),['mayor','mabel','pip','bruno','dot','biscuit','fennel','hazel','clover','reed']);
});
test('22-minute phases transition',()=>{
 assert.equal(DAY_LENGTH,1320);
 assert.equal(timePhase(200),'delivery');assert.equal(timePhase(500),'working');
 assert.equal(timePhase(800),'shopping');assert.equal(timePhase(1000),'attending_event');
});
test('existing simulation contract and optional anchors',()=>{
 const graph=createPedestrianGraph(PATH_SEGMENTS,createOutdoorCollision().walkable);
 const sim=createNpcSimulation(graph,{visitorCount:0});
 assert.equal(sim.residents.length,10);assert.equal(sim.actors.length,10);
 assert.equal(typeof sim.advance,'function');assert.equal(typeof sim.setActivityAnchors,'function');
 assert.equal(sim.setActivityAnchors([{id:'invalid',siteId:'post',role:'postal-worker',x:NaN,z:0,capacity:1}]),0);
 assert.ok(sim.setActivityAnchors([{id:'post-office:station',siteId:'old-town-post',role:'postal-worker',x:-59,z:-70,capacity:1,facing:0,pose:'sorting-mail'}])<=1);
 sim.advance(.016,420);
 for(const actor of sim.actors){assert.equal(typeof actor.id,'string');assert.equal(typeof actor.occupation,'string');assert.ok(Number.isFinite(actor.x));}
});
