export const GRAPHICS_QUALITY=Object.freeze({
 low:Object.freeze({dpr:1,shadow:512,foliage:.45,particles:.2,distance:155,post:false,animationDistance:35}),
 medium:Object.freeze({dpr:1.5,shadow:1024,foliage:.75,particles:.6,distance:210,post:false,animationDistance:65}),
 high:Object.freeze({dpr:2,shadow:2048,foliage:1,particles:1,distance:250,post:true,animationDistance:110})
});
export function selectGraphicsQuality({memory=4,coarse=false,slowFrames=0}={}){
 return slowFrames>100||memory<=2?'low':coarse||memory<=4?'medium':'high';
}
export function applyGraphicsQuality(renderer,camera,mode='medium',deviceDpr=1){
 const p=GRAPHICS_QUALITY[mode]??GRAPHICS_QUALITY.medium;
 renderer.setPixelRatio(Math.min(p.dpr,Math.max(1,deviceDpr)));
 renderer.shadowMap.enabled=mode!=='low';
 camera.far=p.distance;camera.updateProjectionMatrix();
 return p;
}
export function createFrameProfiler(renderer,{windowSize=90}={}){
 const samples=[];let frames=0;
 function sample(dt,scene,mode='medium'){
  const ms=Math.max(0,dt)*1000;
  samples.push(ms);if(samples.length>windowSize)samples.shift();frames++;
  const mean=samples.reduce((a,b)=>a+b,0)/Math.max(1,samples.length);
  let objects=0;scene?.traverse(()=>objects++);
  const info=renderer.info;
  return {fps:mean?1000/mean:0,frameMs:mean,drawCalls:info.render.calls,
   triangles:info.render.triangles,textures:info.memory.textures,geometries:info.memory.geometries,
   objects,quality:mode,resolution:[renderer.domElement.width,renderer.domElement.height],frames};
 }
 return {sample};
}
