import test from 'node:test';
import assert from 'node:assert/strict';
import {OUTDOOR_CAMERA,storybookStreetFraming} from './camera-math.js';

test('the Old Market has more intimate framing without changing player zoom',()=>{
  assert.ok(OUTDOOR_CAMERA.distance<27.5);
  assert.ok(storybookStreetFraming(-32,-88)<storybookStreetFraming(-80,70));
  assert.ok(storybookStreetFraming(-32,-88)>.8);
  assert.equal(storybookStreetFraming(-100,100),1);
});
