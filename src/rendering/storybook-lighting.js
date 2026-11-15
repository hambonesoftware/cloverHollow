import * as THREE from 'three';
export const DAY_LENGTH=1320;
const clamp=v=>Math.min(1,Math.max(0,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const KEYS=[
 {t:0,sky:0x36455f,fog:0x5c6d85,sun:0xffc9a3,intensity:.28,ambient:.95,night:1},
 {t:.18,sky:0xb9d8d8,fog:0xc6dcd0,sun:0xffdbad,intensity:1.7,ambient:1.6,night:.1},
 {t:.43,sky:0xc3e5e9,fog:0xc4ded5,sun:0xfff0d4,intensity:2.2,ambient:1.65,night:0},
 {t:.68,sky:0xf2c4a9,fog:0xd8b9ae,sun:0xffb879,intensity:1.45,ambient:1.32,night:.18},
 {t:.83,sky:0x6d829b,fog:0x8295a3,sun:0xffc69b,intensity:.55,ambient:1.08,night:.85},
 {t:1,sky:0x36455f,fog:0x5c6d85,sun:0xffc9a3,intensity:.28,ambient:.95,night:1}
];
const color=(a,b,t)=>new THREE.Color(a).lerp(new THREE.Color(b),t);
export function sampleStorybookDay(seconds,{overcast=0}={}){
 const t=((seconds%DAY_LENGTH)+DAY_LENGTH)%DAY_LENGTH/DAY_LENGTH;
 let i=0;while(i<KEYS.length-2&&t>KEYS[i+1].t)i++;
 const a=KEYS[i],b=KEYS[i+1],f=smooth(a.t,b.t,t),blend=(k)=>a[k]+(b[k]-a[k])*f;
 const sky=color(a.sky,b.sky,f),fog=color(a.fog,b.fog,f),sunColor=color(a.sun,b.sun,f);
 const cloud=clamp(overcast);
 return {sky:sky.lerp(new THREE.Color(0xb6c3c9),cloud*.35),fog:fog.lerp(new THREE.Color(0xb7c5c9),cloud*.28),
 sunColor,intensity:blend('intensity')*(1-cloud*.55),ambient:blend('ambient')*(1-cloud*.12),
 night:blend('night'),sunAngle:t*Math.PI*2};
}
export function createStorybookLighting(scene,{quality='medium'}={}){
 const ambient=new THREE.HemisphereLight(0xffeedb,0x8aa5a2,1.5);
 const sun=new THREE.DirectionalLight(0xffe6c8,2);
 sun.position.set(-35,64,35);sun.castShadow=quality!=='low';
 const map=quality==='high'?2048:quality==='medium'?1024:512;
 sun.shadow.mapSize.set(map,map);
 Object.assign(sun.shadow.camera,{left:-95,right:95,top:95,bottom:-135,near:1,far:160});
 sun.shadow.camera.updateProjectionMatrix();sun.shadow.normalBias=.035;
 scene.add(ambient,sun);
 if(!scene.fog)scene.fog=new THREE.Fog(0xc5d8d8,95,235);
 function update(seconds,options){
  const state=sampleStorybookDay(seconds,options);
  if(!scene.background?.isColor)scene.background=new THREE.Color();
  scene.background.copy(state.sky);scene.fog.color.copy(state.fog);
  ambient.intensity=state.ambient;sun.intensity=state.intensity;sun.color.copy(state.sunColor);
  sun.position.set(-35+Math.sin(state.sunAngle)*17,60,35+Math.cos(state.sunAngle)*17);
  return state;
 }
 return {ambient,sun,update,dispose(){scene.remove(ambient,sun);}};
}
