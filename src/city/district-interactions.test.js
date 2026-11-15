import test from 'node:test';
import assert from 'node:assert/strict';
import {describeDistrictAction,MINI_GAMES} from './district-interactions.js';
import {DISTRICT_SITES} from '../world/district-plan.js';
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
