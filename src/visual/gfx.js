import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const PALETTE=Object.freeze({ink:0x514653,cream:0xffedcf,rose:0xd996a5,moss:0x84ab91,sky:0x93b8c9,honey:0xd8b078,wood:0x9a765a,shadow:0x6c7b86});
export const QUALITY=Object.freeze({
  low:Object.freeze({segments:10,outline:0,shadows:false,dpr:1,post:false}),
  medium:Object.freeze({segments:14,outline:0.008,shadows:true,dpr:1.5,post:false}),
  high:Object.freeze({segments:20,outline:0.012,shadows:true,dpr:2,post:true})
});
const geometryCache=new Map(),materialCache=new Map();
export function cachedGeometry(key,create){
  if(!geometryCache.has(key))geometryCache.set(key,create());
  return geometryCache.get(key);
}
export function roundedBox(w,h,d,r=Math.min(w,h,d)*.22,segments=2){
  const radius=Math.max(.001,Math.min(r,Math.min(w,h,d)/2-.001));
  return cachedGeometry(`rounded:${w}:${h}:${d}:${radius}:${segments}`,
    ()=>new RoundedBoxGeometry(w,h,d,segments,radius));
}
export function capsule(r,length,quality='medium'){
  const q=QUALITY[quality]??QUALITY.medium;
  return cachedGeometry(`capsule:${r}:${length}:${q.segments}`,
    ()=>new THREE.CapsuleGeometry(r,length,4,q.segments));
}
export const TOON_RAMP=(()=>{
  const pixels=new Uint8Array([100,100,100,255,153,153,153,255,208,208,208,255,246,246,246,255,255,255,255,255]);
  const texture=new THREE.DataTexture(pixels,5,1,THREE.RGBAFormat);
  texture.magFilter=texture.minFilter=THREE.NearestFilter;
  texture.generateMipmaps=false;texture.needsUpdate=true;return texture;
})();
export function fairyMaterial(color,options={}){
  const {rim=0,outline=0,...rest}=options;
  const key=Object.keys(rest).length||rim?null:String(color);
  if(key&&materialCache.has(key))return materialCache.get(key);
  const mat=new THREE.MeshToonMaterial({color,gradientMap:TOON_RAMP,...rest});
  if(rim>0){
    mat.onBeforeCompile=shader=>{
      shader.uniforms.fairyRimColor={value:new THREE.Color(0xc2dce7)};
      shader.uniforms.fairyRimStrength={value:Math.min(.25,rim)};
      shader.fragmentShader=shader.fragmentShader
        .replace('#include <common>','#include <common>\nuniform vec3 fairyRimColor; uniform float fairyRimStrength;')
        .replace('#include <opaque_fragment>',`outgoingLight += fairyRimColor * fairyRimStrength * pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 3.0);\n#include <opaque_fragment>`);
    };
    mat.customProgramCacheKey=()=>`fairy-rim-v1`;
  }
  if(key)materialCache.set(key,mat);
  return mat;
}
const inkCache=new Map();
function outlineMaterial(width){
  const size=Math.round(width*10000);
  if(inkCache.has(size))return inkCache.get(size);
  const mat=new THREE.MeshBasicMaterial({color:PALETTE.ink,side:THREE.BackSide,depthWrite:false});
  mat.onBeforeCompile=shader=>{
    shader.uniforms.fairyOutline={value:width};
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nuniform float fairyOutline;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed += normal * fairyOutline;');
  };
  mat.customProgramCacheKey=()=>`fairy-outline-${size}`;
  inkCache.set(size,mat);return mat;
}
export function illustratedMesh(geometry,color,{quality='medium',outline,castShadow=true,rim=.12}={}){
  const q=QUALITY[quality]??QUALITY.medium;
  const mesh=new THREE.Mesh(geometry,typeof color==='number'?fairyMaterial(color,{rim:quality==='high'?rim:0}):color);
  mesh.castShadow=castShadow;mesh.receiveShadow=true;
  const thickness=outline??q.outline;
  if(thickness>0){
    const hull=new THREE.Mesh(geometry,outlineMaterial(thickness));
    hull.userData.isOutline=true;hull.raycast=()=>{};
    mesh.add(hull);
  }
  return mesh;
}
export function addFairyLights(scene,{shadows=true}={}){
  const ambient=new THREE.HemisphereLight(0xffeddb,0x88a8ba,1.45);
  const key=new THREE.DirectionalLight(0xffe6bf,2.1);
  key.position.set(-25,45,20);key.castShadow=shadows;
  if(shadows){key.shadow.mapSize.set(1024,1024);key.shadow.normalBias=.025;}
  scene.add(ambient,key);
  return {ambient,key,dispose(){scene.remove(ambient,key);}};
}
export function configureFairyRenderer(renderer,{quality='medium',devicePixelRatio=1}={}){
  const q=QUALITY[quality]??QUALITY.medium;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.12;
  renderer.shadowMap.enabled=q.shadows;
  if(q.shadows)renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.setPixelRatio(Math.min(devicePixelRatio,q.dpr));
  return q;
}
export function chooseQuality({coarse=false,memory=4,slowFrames=0}={}){
  return slowFrames>90||memory<=2?'low':coarse||memory<=4?'medium':'high';
}
