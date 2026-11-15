import test from 'node:test';
import assert from 'node:assert/strict';
import {startActivity,advanceActivity,activityPrompt,cancelActivity,restartActivity,completeActivity} from './index.js';
import {DAY_SECONDS,getEntertainmentEvents,eveningFactor,attendancePoints} from '../../events/entertainment/index.js';
for(const kind of ['ring-toss','firefly-rhythm','theater-encore']){
  test(kind+' completes and awards a keepsake',()=>{
    let state=startActivity(kind,{seed:7});
    while(state.status==='active')state=advanceActivity(state,activityPrompt(state).target);
    assert.equal(state.status,'complete');
    assert.ok(state.reward);
    assert.equal(state.history.length,state.round);
    assert.equal(advanceActivity(state,0),state);
  });
  test(kind+' cancels and restarts safely',()=>{
    const state=startActivity(kind);
    const cancelled=cancelActivity(state);
    assert.equal(cancelled.status,'cancelled');
    assert.equal(advanceActivity(cancelled,0),cancelled);
    assert.equal(restartActivity(cancelled).status,'active');
    assert.equal(completeActivity(state).status,'complete');
  });
}
test('event schedules rotate and repeat across a 22-minute day',()=>{
  assert.equal(DAY_SECONDS,1320);
  assert.notEqual(getEntertainmentEvents(400,0)[0].begin,getEntertainmentEvents(400,1)[0].begin);
  assert.deepEqual(getEntertainmentEvents(0,0),getEntertainmentEvents(1320,0));
  assert.ok(eveningFactor(1100)>eveningFactor(300));
});
test('attendance coordinates stay attached to the site',()=>{
  const pts=attendancePoints({id:'test',x:20,z:30,w:12,d:10},{id:'show'},8);
  assert.equal(pts.length,8);
  assert.ok(pts.every(p=>p.siteId==='test'&&p.x>15&&p.x<25));
});
