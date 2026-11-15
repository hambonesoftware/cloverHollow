import test from 'node:test';
import assert from 'node:assert/strict';
import {describeDistrictAction,MINI_GAMES} from './district-interactions.js';
import {DISTRICT_SITES,SCENIC_ENTERTAINMENT_SITES} from '../world/district-plan.js';
import * as THREE from 'three';
import {createEntertainmentDistrict} from '../districts/entertainment/index.js';
import {serviceActions} from '../services/downtown/index.js';
import {startActivity,advanceActivity,activityPrompt} from '../activities/entertainment/index.js';

test('downtown district contains its own Town Hall, Post Office and Community Hall',()=>{
  assert.ok(DISTRICT_SITES.some(s=>s.kind==='town-hall'));
  assert.ok(DISTRICT_SITES.some(s=>s.kind==='post'));
  assert.ok(DISTRICT_SITES.some(s=>s.kind==='community-center'));
});
test('every civic service action has a defined player-facing outcome',()=>{
  const kinds=['town-hall','mayor-office','post-office','library','community-center',
    'florist','cafe','bakery','furniture','general-goods','clinic','records'];
  for(const kind of kinds){
    const actions=serviceActions(kind);
    assert.ok(actions.length>0,'Missing actions: '+kind);
    for(const {action} of actions){
      const result=describeDistrictAction(action);
      assert.ok(['activity','shop','dialogue'].includes(result.type),action);
      if(result.type==='dialogue')assert.ok(result.speaker&&result.line);
    }
  }
});
test('all three mini-games launch and can earn keepsakes',()=>{
  for(const action of MINI_GAMES){
    assert.equal(describeDistrictAction(action).type,'activity');
    let state=startActivity(action,{seed:29});
    while(state.status==='active')state=advanceActivity(state,activityPrompt(state).target);
    assert.equal(state.status,'complete');
    assert.ok(state.reward);
  }
});

test('every reserved Lantern Quarter venue including cafe and public gardens is rendered and interactive',()=>{
  const sites=[...DISTRICT_SITES.filter(s=>s.district==='entertainment'),...SCENIC_ENTERTAINMENT_SITES];
  const scene=new THREE.Scene();
  const district=createEntertainmentDistrict(scene,{sites,quality:'low'});
  assert.equal(district.root.children.length,sites.length,'no invisible collidable venues');
  for(const site of sites){
    assert.ok(district.root.children.some(group=>group.name===site.name),site.id+' has no model');
    assert.ok(district.interactables.some(action=>action.siteId===site.id),site.id+' has no action');
  }
  assert.ok(district.interactables.some(action=>action.action==='visit-cafe'));
  assert.ok(district.interactables.some(action=>action.action==='visit-garden'));
  assert.ok(district.interactables.some(action=>action.siteId==='festival-green'&&action.action==='ring-toss'));
  district.update(.016,1060);
  district.dispose();
  assert.ok(!scene.children.includes(district.root));
});
