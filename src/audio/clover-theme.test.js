import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleCloverTheme} from './clover-theme.js';

test('Clover Hollow has a distinctive, deterministic original melody',()=>{
 const notes=Array.from({length:16},(_,i)=>sampleCloverTheme(i,{market:1}));
 assert.equal(notes.filter(Boolean).length,14);
 assert.deepEqual(sampleCloverTheme(0,{market:1}),sampleCloverTheme(16,{market:1}));
 assert.ok(notes.every(n=>!n||Number.isFinite(n.frequency)&&n.level>.001));
 assert.equal(sampleCloverTheme(-1),null);
});
test('the same melody changes instrumentation after dark',()=>{
 const day=sampleCloverTheme(0,{market:1,night:0});
 const night=sampleCloverTheme(0,{market:0,night:1});
 assert.equal(day.type,'triangle');
 assert.equal(night.type,'sine');
 assert.ok(night.frequency<day.frequency);
 assert.ok(night.level<day.level);
 assert.ok(day.harmony>0);
});
