import * as THREE from 'three';

const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const approach=(a,b,rate,dt)=>a+(b-a)*(1-Math.exp(-rate*dt));
const shortestAngle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
export function animationState(){
  return {speed:0,stride:0,elapsed:0,heading:0,blink:0,blinkTimer:1.7,
    expression:'neutral',talk:0,carry:0,sit:0,lookX:0,lookY:0,initialized:false};
}
/**
 * Velocity-aware rig update. velocity is in world units/second; dt in seconds.
 * No translation of root: physics remains owned by the caller.
 */
export function updateCharacterAnimation(group,dt,{
  velocity={x:0,z:0},heading=null,lookAt=null,talking=false,
  sitting=false,carrying=false,expression='neutral',runThreshold=2.5,
  pose='idle'
}={}){
  const rig=group.userData.rig;
  if(!rig)return null;
  const s=group.userData.animation??(group.userData.animation=animationState());
  const delta=clamp(Number.isFinite(dt)?dt:0,0,.1);
  const speed=clamp(Math.hypot(velocity.x||0,velocity.z||0),0,8);
  s.speed=approach(s.speed,speed,11,delta);
  const motion=clamp(s.speed/.55,0,1),running=clamp((s.speed-runThreshold)/1.4,0,1);
  s.stride+=delta*(3.4+s.speed*2.45)*motion;
  s.elapsed+=delta;
  s.talk=approach(s.talk,talking?1:0,9,delta);
  s.carry=approach(s.carry,carrying?1:0,7,delta);
  s.sit=approach(s.sit,sitting?1:0,7,delta);
  s.expression=expression;
  s.pose=pose;
  const working=['sorting-mail','baking','hammering','gardening','sweeping','reading','serving','restocking','performing-music','applauding','greeting','talking','delivering-parcels','browsing','arranging-flowers','arranging-display','stocking-shelves','reading-notices','working'].includes(pose);
  const actionPulse=Math.sin(s.elapsed*(pose==='hammering'?9:pose==='sweeping'?5:3.5));
  const desired=heading??(speed>.08?Math.atan2(velocity.x,velocity.z):group.rotation.y);
  if(!s.initialized){s.heading=group.rotation.y;s.initialized=true;}
  const turn=shortestAngle(s.heading,desired);
  s.heading+=turn*(1-Math.exp(-11*delta));
  group.rotation.y=s.heading;
  const step=Math.sin(s.stride),weight=motion*(1-s.sit);
  const bob=Math.abs(Math.sin(s.stride))*weight*(.035+running*.055);
  rig.body.position.y=bob+Math.sin(s.elapsed*2.2)*.012*(1-weight)-s.sit*.22;
  rig.body.rotation.x=weight*(.045+running*.095);
  rig.body.rotation.z=step*weight*.045+clamp(turn,-1,1)*.045;
  for(let i=0;i<2;i++){
    const sign=i===0?1:-1;
    rig.legs[i].rotation.x=step*sign*(.52+running*.36)*weight-s.sit*.85;
    rig.legs[i].rotation.z=sign*s.sit*.15;
    rig.arms[i].rotation.x=-step*sign*.48*weight+s.carry*(-.78)+s.talk*Math.sin(s.elapsed*9+i*2)*.24;
    rig.arms[i].rotation.z=sign*(.25+s.carry*.18);
    if(working&&!weight){
      if(['sorting-mail','baking','reading','serving','restocking','delivering-parcels','arranging-flowers','arranging-display','stocking-shelves','reading-notices','working'].includes(pose))rig.arms[i].rotation.x=-.75+actionPulse*.15;
      else if(['hammering','sweeping','gardening','performing-music'].includes(pose))rig.arms[i].rotation.x=-.6+actionPulse*(i===1?.55:.25);
      else if(['applauding','greeting','talking'].includes(pose))rig.arms[i].rotation.x=-.35+actionPulse*.32;
    }
  }
  const look=lookAt&&Number.isFinite(lookAt.x)&&Number.isFinite(lookAt.z)
    ?clamp(shortestAngle(s.heading,Math.atan2(lookAt.x-group.position.x,lookAt.z-group.position.z)),-.55,.55):0;
  s.lookX=approach(s.lookX,look,5,delta);
  s.lookY=approach(s.lookY,lookAt&&Number.isFinite(lookAt.y)?clamp((lookAt.y-1.5)/5,-.22,.22):0,5,delta);
  rig.head.rotation.y=s.lookX;
  rig.head.rotation.x=-weight*.06+s.lookY+Math.sin(s.elapsed*1.7)*.017;
  rig.head.rotation.z=-clamp(turn,-1,1)*.07;
  s.blinkTimer-=delta;
  if(s.blinkTimer<=0){
    s.blinkTimer=2.1+(Math.sin(s.elapsed*17)*.5+.5)*2.4;
    s.blink=.13;
  }
  s.blink=Math.max(0,s.blink-delta);
  const eyelid=s.blink>0?clamp(1-Math.abs(s.blink-.065)/.065,0,1):0;
  for(const eye of rig.eyes)eye.scale.y=1-eyelid*.92;
  if(rig.mouth)rig.mouth.scale.y=1+s.talk*(.3+.35*Math.sin(s.elapsed*12));
  for(const ear of rig.ears)ear.rotation.x=Math.sin(s.stride+ear.userData.offset)*weight*.14;
  if(rig.tail)rig.tail.rotation.y=Math.sin(s.elapsed*3.2)*(.12+.13*weight);
  return s;
}
/** Legacy adapter: old calls still work; prefer explicit velocity and dt. */
export function animateLegacyCharacter(group,time,moving=false,phase=0){
  const state=group.userData.legacyClock??{last:time};
  const dt=clamp(Number.isFinite(time-state.last)?time-state.last:0,0,.1);
  state.last=time;group.userData.legacyClock=state;
  const speed=typeof moving==='number'?Math.max(0,moving):moving?1.7:0;
  return updateCharacterAnimation(group,dt,{
    velocity:{x:Math.sin(group.rotation.y)*speed,z:Math.cos(group.rotation.y)*speed}
  });
}
export function setCharacterPose(group,pose){
  if(!group.userData.rig)return false;
  group.userData.pose={...group.userData.pose,...pose};
  return true;
}

/** Bridge from Activity Director actor metadata to the existing procedural rig. */
export function applyActorVisualState(group,actor,dt){
  return updateCharacterAnimation(group,dt,{velocity:actor.velocity||{x:0,z:0},heading:actor.heading,lookAt:actor.lookTarget,pose:actor.pose||'idle',talking:actor.pose==='talking',sitting:actor.pose==='sitting',carrying:!!actor.heldProp});
}
