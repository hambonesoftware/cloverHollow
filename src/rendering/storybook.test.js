import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {STORYBOOK_PRESETS,storybookMaterial} from './storybook-materials.js';
import {DAY_LENGTH,sampleStorybookDay,createStorybookLighting} from './storybook-lighting.js';
import {GRAPHICS_QUALITY,selectGraphicsQuality,createFrameProfiler} from '../performance/graphics-quality.js';
import {createStorybookAtmosphere} from '../atmosphere/storybook-atmosphere.js';
test('fifteen shared storybook material presets exist',()=>{
 assert.equal(Object.keys(STORYBOOK_PRESETS).length,15);
 for(const name of Object.keys(STORYBOOK_PRESETS))assert.ok(storybookMaterial(name).isMeshStandardMaterial);
 assert.equal(storybookMaterial('timber'),storybookMaterial('timber'));
});
test('continuous 22-minute cycle wraps and lights nighttime safely',()=>{
 assert.equal(DAY_LENGTH,1320);
 assert.equal(sampleStorybookDay(0).night,sampleStorybookDay(1320).night);
 assert.ok(sampleStorybookDay(1090).night>sampleStorybookDay(570).night);
 for(let t=0;t<1320;t+=5){
  const s=sampleStorybookDay(t);
  assert.ok(s.intensity>=0&&s.ambient>.2);
 }
});
test('scene lighting and atmosphere mount and dispose',()=>{
 const scene=new THREE.Scene();
 const lighting=createStorybookLighting(scene,{quality:'low'});
 const atmosphere=createStorybookAtmosphere(scene,{quality:'low',walkable:()=>true});
 assert.ok(lighting.update(900).night>=0);
 atmosphere.update(.016,1);
 assert.ok(atmosphere.root.parent===scene);
 atmosphere.dispose();lighting.dispose();
 assert.ok(!scene.children.includes(atmosphere.root));
 assert.ok(!scene.children.includes(lighting.sun));
});
test('quality modes remain deterministic and support older phones',()=>{
 assert.deepEqual(Object.keys(GRAPHICS_QUALITY),['low','medium','high']);
 assert.equal(selectGraphicsQuality({memory:2}),'low');
 assert.equal(selectGraphicsQuality({memory:8,coarse:false}),'high');
 assert.ok(GRAPHICS_QUALITY.low.dpr<GRAPHICS_QUALITY.high.dpr);
});
test('frame instrumentation reports render stats',()=>{
 const renderer={info:{render:{calls:3,triangles:500},memory:{textures:2,geometries:4}},domElement:{width:400,height:300}};
 const profiler=createFrameProfiler(renderer);
 const data=profiler.sample(.033,new THREE.Scene(),'low');
 assert.ok(data.fps>29&&data.fps<31);
 assert.equal(data.drawCalls,3);assert.deepEqual(data.resolution,[400,300]);
});
