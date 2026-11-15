import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStick,screenToWorld,targetSpeed,createMovementController } from './movement.js';
import { constrainCamera,fitDistance,cameraOffset } from '../camera/camera-math.js';

test('true analog speed scales with thumb displacement',()=>{
  const tiny=normalizeStick(.19,0),half=normalizeStick(.55,0),full=normalizeStick(1,0);
  assert.ok(tiny.magnitude>0&&tiny.magnitude<half.magnitude);
  assert.ok(targetSpeed(tiny.magnitude)<targetSpeed(half.magnitude));
  assert.ok(targetSpeed(half.magnitude)<targetSpeed(full.magnitude));
  assert.deepEqual(normalizeStick(.05,.05),{x:0,y:0,magnitude:0});
});
test('input rotates relative to the camera view',()=>{
  const up=screenToWorld(0,-1,Math.PI/2);
  assert.ok(Math.abs(up.x+1)<1e-9);
  assert.ok(Math.abs(up.z)<1e-9);
});
test('acceleration and deceleration are smooth but responsive',()=>{
  const c=createMovementController();
  let p={x:0,z:0};
  let first=c.step({x:1,y:0,cameraYaw:0},1/60,p);
  assert.ok(first.speed>0&&first.speed<6.1);
  p=first.position;
  for(let i=0;i<24;i++)p=c.step({x:1,y:0,cameraYaw:0},1/60,p).position;
  const moving=c.state.speed;
  assert.ok(moving>first.speed);
  const release=c.step({x:0,y:0,cameraYaw:0},1/60,p);
  assert.ok(release.speed<moving&&release.speed>0);
  p=release.position;
  for(let i=0;i<60;i++)p=c.step({x:0,y:0},1/60,p).position;
  assert.ok(c.state.speed<.03);
});
test('axis sliding respects solid obstacles',()=>{
  const c=createMovementController();
  let p={x:0,z:0};
  const pass=(x,z)=>x<=.6;
  for(let i=0;i<50;i++)p=c.step({x:1,y:1,cameraYaw:0},1/60,p,pass).position;
  assert.ok(p.x<=.6+1e-8);
  assert.ok(p.z>.8,'should slide along blocked x wall');
});
test('variable FPS reaches approximately same position',()=>{
  const a=createMovementController(),b=createMovementController();
  let p={x:0,z:0},q={x:0,z:0};
  for(let i=0;i<120;i++)p=a.step({x:0,y:-1},1/60,p).position;
  for(let i=0;i<60;i++)q=b.step({x:0,y:-1},1/30,q).position;
  assert.ok(Math.abs(p.z-q.z)<.14);
});
test('indoor camera preserves open two-wall viewing quadrant',()=>{
  const c=constrainCamera(-10,-1,8,'home');
  assert.ok(c.yaw>=.38&&c.yaw<=1.2);
  assert.ok(c.pitch>=.38&&c.zoom<=1.85);
  assert.ok(fitDistance(18.5,.45,'home')>fitDistance(18.5,1.5,'home'));
  const o=cameraOffset(.5,.6,12);
  assert.ok(o.x>0&&o.y>0&&o.z>0);
});
