import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleTownSound,createTownSoundscape} from './town-soundscape.js';

test('soundstage shifts from market and birds to nighttime crickets',()=>{
  const market=sampleTownSound(-32,-88,420);
  const distant=sampleTownSound(-80,70,420);
  const night=sampleTownSound(31,-100,1100);
  assert.ok(market.market>distant.market);
  assert.ok(market.birds>.3);
  assert.ok(night.crickets>night.birds);
  assert.ok(night.night>.8);
  assert.deepEqual(sampleTownSound(31,-100,1100),sampleTownSound(31,-100,2420));
});
test('audio remains opt-in and gracefully handles unavailable WebAudio',()=>{
  const sound=createTownSoundscape(null);
  assert.equal(sound.enabled,false);
  assert.equal(sound.toggle(true),false);
  assert.doesNotThrow(()=>sound.update(.016,{x:0,z:4},420));
  assert.equal(sound.toggle(false),false);
  assert.doesNotThrow(()=>sound.dispose());
});