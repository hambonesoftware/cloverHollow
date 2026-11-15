import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createEntertainmentDistrict} from './index.js';
import {startActivity,activityPrompt,advanceActivity,cancelActivity} from '../../activities/entertainment/index.js';
const scene=new THREE.Scene();scene.background=new THREE.Color(0xa6cad0);
const camera=new THREE.PerspectiveCamera(48,innerWidth/innerHeight,.1,250);camera.position.set(29,33,39);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;document.body.prepend(renderer.domElement);
const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enableDamping=true;controls.update();
scene.add(new THREE.HemisphereLight(0xfff2d7,0x7b9ca7,2.2));
const sun=new THREE.DirectionalLight(0xffddac,2.2);sun.position.set(-22,38,24);scene.add(sun);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(120,100),new THREE.MeshLambertMaterial({color:0x89b392}));ground.rotation.x=-Math.PI/2;ground.position.y=-.1;scene.add(ground);
const defs=[['theater','Moonbeam Theater',-15,-11,11,9],['music','Firefly Music Hall',0,-11,11,9],['arcade','Clover Arcade',15,-11,11,9],['festival','Lantern Festival Green',-15,9,13,11],['garden','Starlight Gardens',1,9,13,11],['promenade','Entertainment Promenade',16,9,8,13]];
const sites=defs.map(([kind,name,x,z,w,d])=>({id:kind,district:'lantern-quarter',kind,name,x,z,w,d,entrance:{x,z:z+d/2+.9},seed:1}));
const district=createEntertainmentDistrict(scene,{sites,quality:'medium'});
const $=id=>document.getElementById(id),actions=$('actions'),status=$('status'),game=$('game');let activity=null;
for(const kind of ['ring-toss','firefly-rhythm','theater-encore']){
  const button=document.createElement('button');button.textContent={'ring-toss':'Moonring Toss','firefly-rhythm':'Firefly Rhythm','theater-encore':'Theater Encore'}[kind];
  button.onclick=()=>{activity=startActivity(kind,{seed:7});game.classList.add('active');renderActivity();};actions.append(button);
}
function renderActivity(){
  if(!activity)return;
  if(activity.status==='complete'){status.textContent=activity.reward?'You won: '+activity.reward:'Show complete!';game.classList.remove('active');return;}
  const p=activityPrompt(activity);$('prompt').textContent=p.hint+' — Round '+(activity.round+1);
  $('aim').value=50;
}
$('play').onclick=()=>{
  if(!activity)return;
  const p=activityPrompt(activity),value=p.type==='choice'?Math.round(Number($('aim').value)/50):Number($('aim').value)/100;
  activity=advanceActivity(activity,value);status.textContent=activity.history.at(-1)?.hit?'Great hit!':'Almost! Try the next round.';renderActivity();
};
$('cancel').onclick=()=>{if(activity)activity=cancelActivity(activity);game.classList.remove('active');status.textContent='Activity cancelled. Choose another whenever you like.';};
const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.1),seconds=Number($('time').value);
  district.update(dt,seconds);
  const night=seconds>=840&&seconds<=1260;
  scene.background.set(night?0x35445f:0xa6cad0);
  sun.intensity=night?.55:2.2;
  $('clock').textContent='Day '+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0')+' • '+(night?'Lantern glow':'Sunlit promenade');
  controls.update();renderer.render(scene,camera);
}
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
