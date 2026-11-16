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
  function profile(){return views[mode];}
  function setMode(value,{snap=true}={}){
    mode=value==='home'?'home':'town';
    if(snap)ready=false;
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
  function update(dt,target,{walkable=null}={}){
    const p=profile();
    // Intimate market framing is spatial, smooth and still respects user zoom.
    const framing=mode==='town'?storybookStreetFraming(target.x,target.z):1;
    const dist=fitDistance(p.distance,camera.aspect,mode)*p.zoom*framing;
    const originY=mode==='home'?1.40:1.25;
    desiredLook.set(mode==='home'?0:target.x,originY,mode==='home'?0:target.z);
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
    setMode,orbit,zoom,update,
    get yaw(){return profile().yaw;},
    get mode(){return mode;},
    get state(){return{...profile()};},
    reset(){views.town={...OUTDOOR_CAMERA};views.home={...INDOOR_CAMERA};ready=false;}
  };
}
