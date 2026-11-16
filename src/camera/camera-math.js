const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
// Lower, closer framing lets the player read faces, shop windows and carts.
export const OUTDOOR_CAMERA=Object.freeze({yaw:.635,pitch:.47,distance:17.2,zoom:1});
export function storybookStreetFraming(x,z){
  const market=Math.max(0,1-Math.hypot(x+32,z+88)/55);
  const square=Math.max(0,1-Math.hypot(x,z-4)/37);
  return 1-.12*Math.max(market,square);
}
export const INDOOR_CAMERA=Object.freeze({yaw:.71,pitch:.62,distance:18.5,zoom:1});
export function fitDistance(base,aspect,mode='town') {
  const a=clamp(Number.isFinite(aspect)?aspect:1,.35,3);
  // Portrait gameplay must not pull the camera so far away that our
  // 2-unit-tall characters become miniature dots on an iPhone.
  const reference=mode==='home'?.90:.62;
  const curve=mode==='home'?.60:.34;
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
