const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export const OUTDOOR_CAMERA=Object.freeze({yaw:.635,pitch:.55,distance:27.5,zoom:1});
export const INDOOR_CAMERA=Object.freeze({yaw:.71,pitch:.62,distance:18.5,zoom:1});
export function fitDistance(base,aspect,mode='town') {
  const a=clamp(Number.isFinite(aspect)?aspect:1,.35,3);
  const reference=mode==='home'?.90:.70;
  const curve=mode==='home'?.60:.50;
  return base*Math.max(1,Math.pow(reference/a,curve));
}
export function constrainCamera(yaw,pitch,zoom,mode='town') {
  const h=mode==='home';
  return {
    yaw:h?clamp(yaw,.38,1.2):yaw,
    pitch:clamp(pitch,h?.38:.25,h?.92:1.05),
    zoom:clamp(zoom,h?.62:.60,h?1.85:1.75)
  };
}
export function cameraOffset(yaw,pitch,distance) {
  return {
    x:Math.sin(yaw)*Math.cos(pitch)*distance,
    y:Math.sin(pitch)*distance,
    z:Math.cos(yaw)*Math.cos(pitch)*distance
  };
}
