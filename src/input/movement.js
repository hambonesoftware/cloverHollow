/**
 * Clover Hollow movement model.
 *
 * Controller math and collision policy are deliberately independent of Three.js,
 * browser events, the scene graph and the MVVM save state. A caller owns the
 * world-space position and provides a walkable(x,z) function.
 */
const clamp = (x,min,max) => Math.max(min, Math.min(max,x));
const lerp = (a,b,t) => a + (b-a)*t;
const shortestAngle = (a,b) => Math.atan2(Math.sin(b-a),Math.cos(b-a));
const finite = v => Number.isFinite(v) ? v : 0;

export function normalizeStick(x,y,deadzone=0.10) {
  const px=finite(x),py=finite(y),dead=clamp(deadzone,0,.8);
  const len=Math.hypot(px,py);
  if(len<=dead)return{x:0,y:0,magnitude:0};
  const magnitude=clamp((Math.min(1,len)-dead)/(1-dead),0,1);
  return{x:px/len*magnitude,y:py/len*magnitude,magnitude};
}

/** Screen-right / screen-down axes become world x/z using camera yaw. */
export function screenToWorld(x,y,yaw=0) {
  const c=Math.cos(yaw),s=Math.sin(yaw);
  return{x:x*c+y*s,z:-x*s+y*c};
}

/**
 * Supports both walking and running at different analog deflections.
 * Speed is zero at rest; a tiny joystick nudge never gives full walking speed.
 */
export function targetSpeed(magnitude,{walkSpeed=6.1,runSpeed=8.5}={}) {
  const a=clamp(magnitude,0,1);
  const t=clamp((a-.70)/.30,0,1);
  const run=t*t*(3-2*t);
  return (walkSpeed+(runSpeed-walkSpeed)*run)*a;
}

/**
 * Smooth first-order acceleration in world units/sec, independent of render FPS.
 * Collision checks run in substeps to prevent skipping narrow obstacles.
 */
export function createMovementController({
  walkSpeed=6.1,runSpeed=8.5,deadzone=.10,
  acceleration=12,deceleration=18,turning=13,maxStep=.22
}={}) {
  let vx=0,vz=0,heading=0,speed=0;
  const settings={walkSpeed,runSpeed,deadzone,acceleration,deceleration,turning,maxStep};
  function reset(newHeading=heading) {
    vx=0;vz=0;speed=0;heading=finite(newHeading);
  }
  function step(input, dt, position, walkable=()=>true) {
    const delta=clamp(finite(dt),0,.07);
    const axes=normalizeStick(input?.x??0,input?.y??0,settings.deadzone);
    const world=screenToWorld(axes.x,axes.y,finite(input?.cameraYaw));
    const desiredSpeed=targetSpeed(axes.magnitude,settings);
    const desiredX=axes.magnitude>0 ? world.x/axes.magnitude*desiredSpeed : 0;
    const desiredZ=axes.magnitude>0 ? world.z/axes.magnitude*desiredSpeed : 0;
    const response=axes.magnitude>0 ? settings.acceleration : settings.deceleration;
    const mix=1-Math.exp(-response*delta);
    vx=lerp(vx,desiredX,mix);
    vz=lerp(vz,desiredZ,mix);
    if(Math.hypot(vx,vz)<.016){vx=0;vz=0;}
    const startX=finite(position?.x),startZ=finite(position?.z);
    let x=startX,z=startZ;
    const distance=Math.hypot(vx*delta,vz*delta);
    const steps=Math.max(1,Math.ceil(distance/settings.maxStep));
    for(let i=0;i<steps;i++) {
      const nx=x+vx*delta/steps,nz=z+vz*delta/steps;
      if(walkable(nx,nz)){x=nx;z=nz;}
      else if(walkable(nx,z)){x=nx;}
      else if(walkable(x,nz)){z=nz;}
    }
    const actualVx=delta>0?(x-startX)/delta:0;
    const actualVz=delta>0?(z-startZ)/delta:0;
    speed=Math.hypot(actualVx,actualVz);
    if(speed>.08){
      const goal=Math.atan2(actualVx,actualVz);
      heading+=shortestAngle(heading,goal)*(1-Math.exp(-settings.turning*delta));
    }
    return {
      position:{x,z},
      velocity:{x:actualVx,z:actualVz},
      heading,
      speed,
      moving:speed>.08,
      magnitude:axes.magnitude,
      running:speed>walkSpeed*.92
    };
  }
  return {
    step,reset,
    get state(){return{vx,vz,heading,speed};}
  };
}
