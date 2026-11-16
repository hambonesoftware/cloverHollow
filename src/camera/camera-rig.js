import * as THREE from 'three';
import { OUTDOOR_CAMERA, INDOOR_CAMERA, fitDistance, constrainCamera, cameraOffset, storybookStreetFraming } from './camera-math.js';

/**
 * Third-person village camera and open-front dollhouse camera.
 * Camera state is independent of save data and character motion. Orbit is
 * limited inside so the open-front view never swings behind the walls.
 */
export function createCameraRig(camera){
  const views={
    town:{...OUTDOOR_CAMERA},
    home:{...INDOOR_CAMERA}
  };
  const currentLook=new THREE.Vector3();
  const desiredLook=new THREE.Vector3();
  const desiredPos=new THREE.Vector3();
  let mode='town',ready=false;
  let focus=null;
  function profile(){return views[mode];}
  function setMode(value,{snap=true}={}){
    mode=value==='home'?'home':'town';
    if(snap){ready=false;focus=null;}
  }
  function orbit(dx,dy){
    const p=profile();
    const next=constrainCamera(p.yaw-dx*.0065,p.pitch+dy*.004,p.zoom,mode);
    p.yaw=next.yaw;p.pitch=next.pitch;
  }
  function zoom(factor){
    const p=profile();
    p.zoom=constrainCamera(p.yaw,p.pitch,p.zoom*factor,mode).zoom;
  }
  // Briefly favor an action or character after the player interacts.
  // The player remains near the center and retains full orbit control.
  function focusOn(x,z,duration=1.7){
    if(mode!=='town'||!Number.isFinite(x)||!Number.isFinite(z))return;
    focus={x,z,time:Math.max(0,Math.min(duration,4)),duration:Math.max(.01,duration)};
  }
  function update(dt,target,{walkable=null}={}){
    const p=profile();
    // Intimate market framing is spatial, smooth and still respects user zoom.
    const framing=mode==='town'?storybookStreetFraming(target.x,target.z):1;
    const dist=fitDistance(p.distance,camera.aspect,mode)*p.zoom*framing;
    const originY=mode==='home'?1.40:1.50;
    const lead=mode==='town'?.9:0;
    const focusWeight=focus&&mode==='town'?Math.min(.24,focus.time/focus.duration*.24):0;
    const centerX=mode==='home'?0:target.x-Math.sin(p.yaw)*lead;
    const centerZ=mode==='home'?0:target.z-Math.cos(p.yaw)*lead;
    desiredLook.set(centerX+(focus?focus.x-target.x:0)*focusWeight,originY,
      centerZ+(focus?focus.z-target.z:0)*focusWeight);
    if(focus){
      focus.time-=Math.max(0,Math.min(dt,.08));
      if(focus.time<=0)focus=null;
    }
    const offset=cameraOffset(p.yaw,p.pitch,dist);
    desiredPos.set(desiredLook.x+offset.x,desiredLook.y+offset.y,desiredLook.z+offset.z);
    // Probe the horizontal camera ray to reduce harsh building occlusion.
    if(mode==='town'&&typeof walkable==='function'){
      for(let n=1;n<=15;n++){
        const t=n/15;
        const px=desiredLook.x+offset.x*t,pz=desiredLook.z+offset.z*t;
        if(t>.20&&!walkable(px,pz)){
          const safe=Math.max(.30,(n-1)/15);
          desiredPos.set(
            desiredLook.x+offset.x*safe,
            desiredLook.y+offset.y*safe,
            desiredLook.z+offset.z*safe
          );
          break;
        }
      }
    }
    const alpha=1-Math.exp(-6.3*Math.min(Math.max(dt,0),.07));
    if(!ready){
      camera.position.copy(desiredPos);
      currentLook.copy(desiredLook);
      ready=true;
    }else{
      camera.position.lerp(desiredPos,alpha);
      currentLook.lerp(desiredLook,alpha);
    }
    camera.lookAt(currentLook);
  }
  return {
    setMode,orbit,zoom,focusOn,update,
    get yaw(){return profile().yaw;},
    get mode(){return mode;},
    get state(){return{...profile()};},
    reset(){views.town={...OUTDOOR_CAMERA};views.home={...INDOOR_CAMERA};ready=false;}
  };
}
