import * as THREE from 'three';
import {applyGraphicsQuality,selectGraphicsQuality,createFrameProfiler} from './performance/graphics-quality.js';
import { createTown } from './town.js';
import {createTownSoundscape} from './audio/town-soundscape.js';
import { makePerson, animatePerson, updateCharacterAnimation, furniture as buildFurniture } from './art.js';
import { createMovementController } from './input/movement.js';
import { createCameraRig } from './camera/camera-rig.js';
import { LOTS, ROOM } from './rules.js';
import { GameViewModel } from './viewmodels/game-view-model.js';
import { DecoratingViewModel } from './viewmodels/decorating-view-model.js';
import { browserStorage } from './persistence/save-store.js';
import { AppUI } from './ui/app-ui.js';
import { dialogueFor } from './story/dialogue.js';
import { describeDistrictAction } from './city/district-interactions.js';
import { ACTIVITY_DEFINITIONS, startActivity, advanceActivity, activityPrompt, cancelActivity, restartActivity } from './activities/entertainment/index.js';
import { isWalkable } from './interiors/placement-logic.js';

const canvas = document.querySelector('#world');
const uiRoot = document.querySelector('#game-ui');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0xc8dfda);
const graphicsMode=selectGraphicsQuality({memory:navigator.deviceMemory??4,coarse:matchMedia('(pointer:coarse)').matches});

const game = new GameViewModel({ storage: browserStorage() });
const decorating = new DecoratingViewModel(game);
const outside = new THREE.Scene();
const inside = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, .08, 250);
const cameraRig = createCameraRig(camera);
applyGraphicsQuality(renderer,camera,graphicsMode,window.devicePixelRatio||1);
const graphicsProfiler=createFrameProfiler(renderer);
const soundscape=createTownSoundscape(window);
let lastFrameDelta=1/60;
const townMovement = createMovementController({walkSpeed:6.2,runSpeed:8.3});
const homeMovement = createMovementController({walkSpeed:3.3,runSpeed:4.6});
const town = createTown(outside,{quality:graphicsMode,gifts:game.state.gifts});
const indoorPlayer = makePerson('kid', { shirt: 0x7aaf96, hair: 0x634f4e, trousers: 0x6a91a4 });
indoorPlayer.position.set(0, 0, 2.1);
inside.add(indoorPlayer);

// A temporary adapter keeps this PR independently playable while the separate
// dollhouse feature branch is developed. The imported factory takes precedence.
function createFallbackDollhouse(scene) {
  scene.background = new THREE.Color(0xf6e5c9);
  const group = new THREE.Group();
  scene.add(new THREE.HemisphereLight(0xfff3de, 0xb5a49c, 2.1));
  const light = new THREE.DirectionalLight(0xffe9c2, 2.2);
  light.position.set(-6, 14, 9);
  scene.add(light);
  scene.add(group);
  const wood = new THREE.MeshStandardMaterial({ color: 0xdab98c, roughness: .95 });
  const plaster = new THREE.MeshStandardMaterial({ color: 0xe8e0c5, roughness: .95 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xfff7e2, roughness: .86 });
  const ground = new THREE.Mesh(new THREE.BoxGeometry(ROOM.width, .2, ROOM.depth), wood);
  ground.position.y = -.13;
  group.add(ground);
  const rear = new THREE.Mesh(new THREE.BoxGeometry(ROOM.width, ROOM.wall, .16), plaster);
  rear.position.set(0, ROOM.wall / 2, -ROOM.depth / 2);
  const left = new THREE.Mesh(new THREE.BoxGeometry(.16, ROOM.wall, ROOM.depth), plaster);
  left.position.set(-ROOM.width / 2, ROOM.wall / 2, 0);
  group.add(rear, left);
  for (const [x, z, w, d] of [[0,-3.89,ROOM.width,.14],[-4.39,0,.14,ROOM.depth]]) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(w,.2,d),trim);
    base.position.set(x,.15,z); group.add(base);
  }
  for (const [x,y,z,rotation] of [[-1.8,2.3,-3.86,0],[-4.4,2.3,1.2,Math.PI/2]]) {
    const windowFrame = new THREE.Mesh(new THREE.BoxGeometry(1.5,1.45,.1),trim);
    windowFrame.position.set(x,y,z);windowFrame.rotation.y=rotation;group.add(windowFrame);
    const glass=new THREE.Mesh(new THREE.BoxGeometry(1.24,1.2,.12),
      new THREE.MeshStandardMaterial({color:0x9ecfdb,roughness:.22,transparent:true,opacity:.87}));
    glass.position.set(x,y,z+.015);glass.rotation.y=rotation;group.add(glass);
    const cross=new THREE.Mesh(new THREE.BoxGeometry(.09,1.32,.14),trim);
    cross.position.set(x,y,z+.07);cross.rotation.y=rotation;group.add(cross);
  }
  const items = new Map();
  let ghost = null;
  const floorPlane = new THREE.Plane(new THREE.Vector3(0,1,0),0);
  function floorPosition(activeRaycaster) {
    const hit = new THREE.Vector3();
    return activeRaycaster.ray.intersectPlane(floorPlane,hit) ? { x:hit.x, z:hit.z } : null;
  }
  function sync(placements) {
    const current = new Set((placements ?? []).map(p=>p.id));
    for (const [id, object] of items) if (!current.has(id)) {
      group.remove(object);items.delete(id);
    }
    for (const p of placements ?? []) {
      const previous = items.get(p.id);
      if (previous?.userData.type !== p.type) {
        if (previous) group.remove(previous);
        const object = buildFurniture(p.type);
        object.userData.type=p.type;
        object.traverse(child => {child.userData.furnitureId = p.id;});
        group.add(object);items.set(p.id,object);
      }
      const model=items.get(p.id);
      model.position.set(p.x,0,p.z);
      model.rotation.y=p.r*Math.PI/2;
    }
  }
  function clearPreview() {
    if (!ghost) return;
    group.remove(ghost);
    ghost.traverse(object => {
      if (!object.isMesh) return;
      object.geometry?.dispose();
      if (Array.isArray(object.material)) object.material.forEach(m => m.dispose());
      else object.material?.dispose();
    });
    ghost=null;
  }
  function preview(candidate) {
    clearPreview();
    if (!candidate) return;
    ghost=buildFurniture(candidate.type);
    ghost.position.set(candidate.x,.035,candidate.z);
    ghost.rotation.y=candidate.r*Math.PI/2;
    ghost.traverse(object => {
      if (!object.isMesh) return;
      object.material=object.material.clone();
      object.material.transparent=true;
      object.material.opacity=.48;
      object.material.color.set(candidate.valid ? 0x76d9a4 : 0xe99685);
      object.castShadow=false;
    });
    group.add(ghost);
  }
  function pickFurniture(activeRaycaster) {
    const hits=activeRaycaster.intersectObjects([...items.values()],true);
    return hits[0]?.object.userData.furnitureId ?? null;
  }
  return { setVisible(visible){group.visible=visible;}, sync, preview, clearPreview, pickFurniture, floorPosition };
}

let dollhouse;
let fallbackRoom = false;
try {
  const interiorModule = await import('./interiors/dollhouse.js');
  if (typeof interiorModule.createDollhouse !== 'function') throw new Error('Missing createDollhouse(scene)');
  dollhouse = interiorModule.createDollhouse(inside);
} catch (error) {
  console.warn('Dollhouse branch is not integrated yet; using temporary room adapter.', error);
  dollhouse = createFallbackDollhouse(inside);
  fallbackRoom = true;
}

let currentState = game.state;
let currentScene = null;
let playerPosition = { ...currentState.town };
let placementsKey = '';
let lastDeed = undefined;
let ui;
let activeFestivalGame = null;

function positionHomeCamera() {
  // Preserve the open-front two-wall viewing quadrant while allowing user zoom.
  cameraRig.setMode('home',{snap:true});
  cameraRig.update(1/60,{x:0,z:0});
}

function updateScene(state) {
  currentState = state;
  if (state.deed !== lastDeed) {
    town.useLot?.(state.deed);
    lastDeed = state.deed;
  }
  const nextKey=JSON.stringify(state.placements);
  if (nextKey !== placementsKey) {
    dollhouse.sync(state.placements, state);
    placementsKey=nextKey;
  }
  if (state.scene === currentScene) return;
  currentScene = state.scene;
  dollhouse.setVisible?.(state.scene === 'home');
  if (state.scene === 'home') {
    indoorPlayer.position.set(0,0,2.1);
    homeMovement.reset();
    positionHomeCamera();
    if (ui && state.story.homeVisits > 0 && !state.story.housewarming) ui.showHousewarming();
  } else {
    playerPosition = { ...state.town };
    town.player.position.set(playerPosition.x,0,playerPosition.z);
    townMovement.reset();
    cameraRig.setMode('town',{snap:true});
    cameraRig.update(1/60,playerPosition,{walkable:town.walkable});
  }
}

function leave() {
  decorating.cancel();
  dollhouse.clearPreview?.();
  game.leaveHome();
  ui.toast('Back into the fresh Clover Hollow air!');
}

function interactWorld(targetId=null) {
  if(currentState.scene!=='town'||ui.blocksMovement)return false;
  const result=town.playableMarket.interact(playerPosition.x,playerPosition.z,
    targetId?{id:targetId}:{});
  if(!result)return false;
  if(result.reward){
    const saved=game.awardKeepsake(result.reward);
    if(saved.ok&&!saved.value.alreadyOwned) {
      ui.toast('A new keepsake is yours! '+result.text);
    }else ui.toast(result.text);
  }else ui.toast(result.text);
  ui.setWorldPrompt(town.playableMarket.prompt(playerPosition.x,playerPosition.z),true);
  cameraRig.focusOn?.(playerPosition.x+1.4,playerPosition.z+1.8,1.7);
  return true;
}
function interact() {
  if (ui.blocksMovement) return;
  if (currentState.scene === 'home') { leave(); return; }
  if(interactWorld())return;
  const x = playerPosition.x, z = playerPosition.z;
  const distances = [];
  for (const place of town.focusables ?? []) {
    const distance = Math.hypot(place.x-x,place.z-z);
    if (distance < (place.r ?? 3.6) + 1.15)
      distances.push({ distance, kind:'place', entry:place });
  }
  for (const actor of town.actors ?? []) {
    if (!actor.name || !actor.model || actor.model.visible === false) continue;
    const distance = Math.hypot(actor.model.position.x-x,actor.model.position.z-z);
    if (distance < 3.1)
      distances.push({ distance:distance+.25, kind:'actor', entry:actor });
  }
  distances.sort((a,b)=>a.distance-b.distance);
  // Standing on a doorstep should activate that destination, even when an
  // NPC happens to walk past the door at the same moment. Away from doors,
  // the nearest neighbor remains the primary interaction target.
  const doorstep=distances.find(item=>item.kind==='place'&&item.distance<1.9);
  const closest=doorstep??distances[0];
  if (!closest) {ui.toast('Walk a little closer to a neighbor or doorway.');return;}
  const target=closest.entry;
  if (closest.kind === 'actor') {
    if (target.name === 'Mayor Thistle' && currentState.deed === null) { ui.showLots();return; }
    const visits=currentState.story.conversations[target.name] ?? 0;
    game.talkTo(target.name);
    ui.showDialogue(target.name,dialogueFor(target.name,visits));
    return;
  }
  if (target.district && target.id !== 'mayor') {
    if (target.actions.length) ui.openDistrict(target.name,target.actions);
    else ui.showDialogue(target.name,'The neighborhood looks splendid. Enjoy the little sights and sounds along the street.');
    return;
  }
  if (target.id === 'mayor') {
    if (currentState.deed === null) ui.showLots();
    else if (target.actions.length) ui.openDistrict("Mayor Thistle's Office",target.actions);
    else {
      const visits=currentState.story.conversations['Mayor Thistle'] ?? 0;
      game.talkTo('Mayor Thistle');
      ui.showDialogue('Mayor Thistle',dialogueFor('Mayor Thistle',visits));
    }
  } else if (target.id === 'furniture') {
    ui.openShop();
  } else if (target.id?.startsWith('lot-')) {
    const index=Number(target.id.slice(4));
    if (currentState.deed === index) {
      const result=game.enterHome();
      if (!result.ok) ui.toast(result.reason);
    } else if (currentState.deed === null) {
      ui.showDialogue('Mayor Thistle','A lovely cottage, yes? Meet me at the hall and we will make your choice official.');
    } else {
      ui.toast('That cottage belongs to another neighbor. Yours is in '+LOTS[currentState.deed].name+'.');
    }
  } else if (target.id === 'bakery') {
    ui.showDialogue('Pip','Something smells delicious! The apple pastries are just cooling on the windowsill.');
  } else if (target.id === 'general') {
    ui.showDialogue('Mabel','We are stocking up for the next village market. Come back and see the new wares!');
  } else {
    ui.toast('What a charming corner of town!');
  }
}

function updateFestivalGame(){
  if(!activeFestivalGame)return;
  const def=ACTIVITY_DEFINITIONS[activeFestivalGame.kind];
  ui.showActivity({
    state:activeFestivalGame,label:def.label,rounds:def.rounds,
    prompt:activityPrompt(activeFestivalGame)
  });
}
function onDistrictAction(option){
  const action=option?.action;
  if(!action)return;
  if(action==='mayor.deed'&&currentState.deed===null){ui.showLots();return;}
  const result=describeDistrictAction(action);
  if(result.type==='shop'){ui.openShop();return;}
  if(result.type==='activity'){
    activeFestivalGame=startActivity(result.kind,{seed:Math.floor(currentState.daySeconds/15)+17});
    updateFestivalGame();
    return;
  }
  if(result.reward){
    const saved=game.awardKeepsake(result.reward);
    if(saved.ok&&!saved.value.alreadyOwned)ui.toast('New keepsake added to your satchel!');
  }
  ui.showDialogue(result.speaker,result.line);
}
function onActivityChoice(index){
  if(!activeFestivalGame||activeFestivalGame.status!=='active')return;
  const prompt=activityPrompt(activeFestivalGame);
  const value=prompt.type==='aim'?index/4:prompt.type==='beat'?index/3:index;
  activeFestivalGame=advanceActivity(activeFestivalGame,value);
  if(activeFestivalGame.reward)game.awardKeepsake(activeFestivalGame.reward);
  updateFestivalGame();
}
function onActivityCancel(){
  if(activeFestivalGame)activeFestivalGame=cancelActivity(activeFestivalGame);
  activeFestivalGame=null;
}
function onActivityRestart(){
  if(activeFestivalGame){activeFestivalGame=restartActivity(activeFestivalGame);updateFestivalGame();}
}

ui = new AppUI(uiRoot,game,decorating,{
  interact,leave,onDistrictAction,onActivityChoice,onActivityCancel,onActivityRestart,
  onSoundToggle:enabled=>soundscape.toggle(enabled)
});
game.subscribe(updateScene);
if (currentState.scene === 'home' && currentState.story.homeVisits > 0 &&
    !currentState.story.housewarming) ui.showHousewarming();
if (fallbackRoom) ui.toast('Preview room active. The full dollhouse module will arrive with its feature branch.');
// Browser-only integration probes are never exposed during normal play.
// They let CI exercise the complete town/deed/interior/save path without a
// brittle multi-minute keyboard walk across an actively simulated village.
if (new URLSearchParams(location.search).has('integration-test')) {
  window.__cloverTest = {
    state: () => game.state,
    marketState: () => town.playableMarket.inspect(),
    marketPrompt: () => town.playableMarket.prompt(playerPosition.x,playerPosition.z),
    marketInteract: (id=null) => interactWorld(id),
    townPosition(x, z) {
      if (currentState.scene !== 'town' || !town.walkable(x, z)) return false;
      playerPosition = { x, z };
      town.player.position.set(x, 0, z);
      game.setTownPosition(x, z);
      return true;
    },
    previewAt: (x, z) => decorating.preview(x, z),
    currentScene: () => currentScene,
    actorCount: () => town.actors.length,
    worldVisuals: () => town.visualDiagnostics(),
    npcState: id => town.getNpcState(id),
    districts: () => ({
      downtown:town.districts.downtown.interactables.length,
      entertainment:town.districts.entertainment.interactables.length,
      sites:town.districtSites.map(site=>({id:site.id,entrance:[...site.entrance],district:site.district}))
    }),
    festivalGame: () => activeFestivalGame,
    festivalPrompt: () => activeFestivalGame&&activeFestivalGame.status==='active'?activityPrompt(activeFestivalGame):null,
    camera: () => cameraRig.state,
    graphics: () => graphicsProfiler.sample(lastFrameDelta,currentScene==='home'?inside:outside,graphicsMode),
    playerPosition: () => ({ ...playerPosition }),
    rotateCamera: (dx,dy) => cameraRig.orbit(dx,dy),
    zoomCamera: factor => cameraRig.zoom(factor),
    roomFurnitureCount: () => dollhouse.root
      ?.getObjectByName('Furniture • synchronized placements')?.children.length ?? 0,
    testFloorHit() {
      camera.updateMatrixWorld(true);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(0, 0), camera);
      return dollhouse.floorPosition(ray);
    }
  };
}

function canvasPoint(event) {
  const bounds=canvas.getBoundingClientRect();
  return new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1,
    -(event.clientY-bounds.top)/bounds.height*2+1);
}
function floorFromPointer(pointer) {
  const ray=new THREE.Raycaster();
  ray.setFromCamera(pointer,camera);
  try {
    const result=dollhouse.floorPosition?.(ray);
    if (result && Number.isFinite(result.x) && Number.isFinite(result.z)) return result;
  } catch (error) { console.warn('Dollhouse floorPosition adapter', error); }
  // World-space y=0 intersects the fallback room if the adapter is unavailable.
  const intersection=new THREE.Vector3();
  return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),0),intersection)
    ? {x:intersection.x,z:intersection.z} : null;
}
function syncPreview(candidate) {
  if (candidate) dollhouse.preview?.(candidate, candidate.valid);
  else dollhouse.clearPreview?.();
}
// Orbit gestures are scoped to the scene canvas and never steal furniture placement
// taps or UI interactions. A quick tap selects furniture; a drag rotates the view.
const cameraPointers = new Map();
let pinchDistance = null;
canvas.addEventListener('pointerdown', event => {
  if (ui.blocksMovement || ui.isDecorating) {
    if (currentState.scene === 'home' && ui.isDecorating && !ui.blocksMovement) {
      const floor=floorFromPointer(canvasPoint(event));
      if(floor)decorating.preview(floor.x,floor.z);
    }
    return;
  }
  cameraPointers.set(event.pointerId,{
    x:event.clientX,y:event.clientY,
    startX:event.clientX,startY:event.clientY,moved:false
  });
  try {canvas.setPointerCapture(event.pointerId);}catch {}
});
canvas.addEventListener('pointermove', event => {
  if (currentState.scene === 'home' && ui.isDecorating && !ui.blocksMovement) {
    const position=floorFromPointer(canvasPoint(event));
    if(position)decorating.preview(position.x,position.z);
    return;
  }
  const p=cameraPointers.get(event.pointerId);
  if(!p)return;
  const deltaX=event.clientX-p.x,deltaY=event.clientY-p.y;
  p.x=event.clientX;p.y=event.clientY;
  if(Math.hypot(p.x-p.startX,p.y-p.startY)>6)p.moved=true;
  if(cameraPointers.size===2) {
    const points=[...cameraPointers.values()];
    const distance=Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
    if(pinchDistance!==null&&distance>10)cameraRig.zoom(pinchDistance/distance);
    pinchDistance=distance;
  }else if(p.moved) {
    cameraRig.orbit(deltaX,deltaY);
  }
});
canvas.addEventListener('wheel',event=>{
  if(ui.blocksMovement||ui.isDecorating)return;
  event.preventDefault();
  cameraRig.zoom(Math.exp(event.deltaY*.001));
},{passive:false});
function releaseCameraPointer(event) {
  const p=cameraPointers.get(event.pointerId);
  if(!p)return;
  const tap=!p.moved&&cameraPointers.size===1;
  cameraPointers.delete(event.pointerId);
  if(cameraPointers.size<2)pinchDistance=null;
  if(event.type!=='pointerup'||!tap||ui.blocksMovement||ui.isDecorating)return;
  const ray=new THREE.Raycaster();
  ray.setFromCamera(canvasPoint(event),camera);
  if(currentState.scene==='town'){
    const picked=town.playableMarket.pick(ray);
    if(picked){
      if(!interactWorld(picked))ui.toast('Walk a little closer, then tap the object or press Talk.');
    }
    return;
  }
  if(currentState.scene!=='home')return;
  let picked=null;
  try {picked=dollhouse.pickFurniture?.(ray);} catch(error){console.warn('Dollhouse picking',error);}
  const id=typeof picked==='string'?picked:(picked?.id??picked?.userData?.furnitureId??null);
  if(id&&decorating.selectPlaced(id)) {
    ui.panel='decorate';
    ui.toast('Tap an open spot to rearrange your furniture.');
    ui.render();
  }
}
canvas.addEventListener('pointerup',releaseCameraPointer);
canvas.addEventListener('pointercancel',releaseCameraPointer);
canvas.addEventListener('lostpointercapture',releaseCameraPointer);
decorating.subscribe(value => {
  if (!value.mode) dollhouse.clearPreview?.();
  else if (value.candidate) syncPreview(value.candidate);
});

const held=new Set();
window.addEventListener('keydown', event => {
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)) event.preventDefault();
  if (event.repeat && ['KeyE','KeyI','Escape','Space','KeyB'].includes(event.code)) return;
  held.add(event.code);
  if (event.code === 'KeyE' || event.code === 'Space') interact();
  if (event.code === 'KeyI') ui._act('inventory');
  if (event.code === 'KeyB' && currentState.scene === 'home') ui._act('decorate');
  if (event.code === 'KeyR' && decorating.state.mode) decorating.rotate();
  if (event.code === 'Escape') ui.dismiss();
});
window.addEventListener('keyup', event => held.delete(event.code));
window.addEventListener('blur', () => held.clear());
window.addEventListener('pagehide', () => game.persist());

function resize() {
  const w=window.innerWidth,h=window.innerHeight;
  renderer.setSize(w,h,false);
  camera.aspect=w/Math.max(1,h);
  camera.fov = w < 650 && h > w ? 49 : 42;
  camera.updateProjectionMatrix();
  // Camera rig recalculates aspect-fit smoothly on the next frame.
}
window.addEventListener('resize',resize);
resize();

const clock=new THREE.Clock();
let walkAnimation=0;
let saveClock=0;
let dayClock=0;
let promptClock=0;
function animate() {
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(), .05);
  lastFrameDelta=dt;
  walkAnimation+=dt;
  let x=0,y=0;
  if(held.has('KeyA')||held.has('ArrowLeft'))x--;
  if(held.has('KeyD')||held.has('ArrowRight'))x++;
  if(held.has('KeyW')||held.has('ArrowUp'))y--;
  if(held.has('KeyS')||held.has('ArrowDown'))y++;
  if(!ui.blocksMovement&&!ui.isDecorating){
    x+=ui.axes.x;
    y+=ui.axes.y;
  }else{
    x=0;y=0;
  }
  const input={x,y,cameraYaw:cameraRig.yaw};
  if(currentState.scene==='town'){
    const motion=townMovement.step(input,dt,playerPosition,town.walkable);
    playerPosition=motion.position;
    town.player.position.set(playerPosition.x,0,playerPosition.z);
    updateCharacterAnimation(town.player,dt,{
      velocity:motion.velocity,heading:motion.heading
    });
    town.update?.(dt,walkAnimation,currentState.daySeconds,currentState.story);
    cameraRig.update(dt,playerPosition,{walkable:town.walkable});
    promptClock+=dt;
    if(promptClock>.12){
      promptClock=0;
      ui.setWorldPrompt(town.playableMarket.prompt(playerPosition.x,playerPosition.z));
    }
    saveClock+=dt;
    if(saveClock>=.75){
      saveClock=0;
      game.setTownPosition(playerPosition.x,playerPosition.z);
    }
  }else{
    ui.setWorldPrompt(null);
    const motion=homeMovement.step(input,dt,{
      x:indoorPlayer.position.x,z:indoorPlayer.position.z
    },(px,pz)=>isWalkable(px,pz,currentState.placements));
    indoorPlayer.position.set(motion.position.x,0,motion.position.z);
    updateCharacterAnimation(indoorPlayer,dt,{
      velocity:motion.velocity,heading:motion.heading
    });
    cameraRig.update(dt,{x:0,z:0});
  }
  dayClock+=dt;
  if(dayClock>=2){game.advanceDay(dayClock);dayClock=0;}
  soundscape.update(dt,playerPosition,currentState.daySeconds,currentState.scene==='town');
  renderer.render(currentScene==='home'?inside:outside,camera);
  if(new URLSearchParams(location.search).has('integration-test')) graphicsProfiler.sample(dt,currentScene==='home'?inside:outside,graphicsMode);
}
animate();
