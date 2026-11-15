import * as THREE from 'three';
import { createTown } from './town.js';
import { makePerson, animatePerson, furniture as buildFurniture } from './art.js';
import { LOTS, ROOM } from './rules.js';
import { GameViewModel } from './viewmodels/game-view-model.js';
import { DecoratingViewModel } from './viewmodels/decorating-view-model.js';
import { browserStorage } from './persistence/save-store.js';
import { AppUI } from './ui/app-ui.js';
import { dialogueFor } from './story/dialogue.js';

const canvas = document.querySelector('#world');
const uiRoot = document.querySelector('#game-ui');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0xc8dfda);

const game = new GameViewModel({ storage: browserStorage() });
const decorating = new DecoratingViewModel(game);
const outside = new THREE.Scene();
const inside = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, .08, 250);
const town = createTown(outside);
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
    camera.position.set(10.8,10.5,12.9);
    camera.lookAt(0,1.2,0);
    if (ui && state.story.homeVisits > 0 && !state.story.housewarming) ui.showHousewarming();
  } else {
    playerPosition = { ...state.town };
    town.player.position.set(playerPosition.x,0,playerPosition.z);
    camera.position.set(playerPosition.x+18,19,playerPosition.z+24);
    camera.lookAt(playerPosition.x,1.2,playerPosition.z);
  }
}

function leave() {
  decorating.cancel();
  dollhouse.clearPreview?.();
  game.leaveHome();
  ui.toast('Back into the fresh Clover Hollow air!');
}

function interact() {
  if (ui.blocksMovement) return;
  if (currentState.scene === 'home') { leave(); return; }
  const x = playerPosition.x, z = playerPosition.z;
  const distances = [];
  for (const place of town.focusables ?? []) {
    const distance = Math.hypot(place.x-x,place.z-z);
    if (distance < (place.r ?? 3.6) + 1.15)
      distances.push({ distance, kind:'place', entry:place });
  }
  for (const actor of town.actors ?? []) {
    if (!actor.name || !actor.model) continue;
    const distance = Math.hypot(actor.model.position.x-x,actor.model.position.z-z);
    if (distance < 3.1)
      distances.push({ distance:distance+.25, kind:'actor', entry:actor });
  }
  distances.sort((a,b)=>a.distance-b.distance);
  const closest=distances[0];
  if (!closest) {ui.toast('Walk a little closer to a neighbor or doorway.');return;}
  const target=closest.entry;
  if (closest.kind === 'actor') {
    if (target.name === 'Mayor Thistle' && currentState.deed === null) { ui.showLots();return; }
    const visits=currentState.story.conversations[target.name] ?? 0;
    game.talkTo(target.name);
    ui.showDialogue(target.name,dialogueFor(target.name,visits));
    return;
  }
  if (target.id === 'mayor') {
    if (currentState.deed === null) ui.showLots();
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

ui = new AppUI(uiRoot,game,decorating,{ interact, leave });
game.subscribe(updateScene);
if (fallbackRoom) ui.toast('Preview room active. The full dollhouse module will arrive with its feature branch.');

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
canvas.addEventListener('pointermove', event => {
  if (currentState.scene !== 'home' || !ui.isDecorating || ui.blocksMovement) return;
  const point=floorFromPointer(canvasPoint(event));
  if (point) decorating.preview(point.x,point.z);
});
canvas.addEventListener('pointerdown', event => {
  if (currentState.scene !== 'home' || ui.blocksMovement) return;
  const point=canvasPoint(event);
  if (ui.isDecorating) {
    const floor=floorFromPointer(point);
    if (floor) decorating.preview(floor.x,floor.z);
    return;
  }
  let picked;
  const ray=new THREE.Raycaster();
  ray.setFromCamera(point,camera);
  try { picked=dollhouse.pickFurniture?.(ray); }
  catch (error) { console.warn('Dollhouse pickFurniture adapter',error); }
  const id=typeof picked==='string' ? picked :
    (picked?.id ?? picked?.userData?.furnitureId ?? null);
  if (id && decorating.selectPlaced(id)) {
    ui.panel='decorate';
    ui.toast('Tap an open spot to rearrange your furniture.');
    ui.render();
  }
});
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
}
window.addEventListener('resize',resize);
resize();

const clock=new THREE.Clock();
let walkAnimation=0;
let saveClock=0;
let dayClock=0;
function animate() {
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(), .05);
  walkAnimation+=dt;
  let dx=0,dz=0;
  if (held.has('KeyA') || held.has('ArrowLeft')) dx--;
  if (held.has('KeyD') || held.has('ArrowRight')) dx++;
  if (held.has('KeyW') || held.has('ArrowUp')) dz--;
  if (held.has('KeyS') || held.has('ArrowDown')) dz++;
  dx+=ui.axes.x; dz+=ui.axes.y;
  const length=Math.hypot(dx,dz);
  const walking=length>.13 && !ui.blocksMovement && !ui.isDecorating;
  if (walking) { dx/=length;dz/=length; }
  if (currentState.scene === 'town') {
    if (walking) {
      const speed=6.5;
      const nx=playerPosition.x+dx*speed*dt;
      const nz=playerPosition.z+dz*speed*dt;
      if (!town.walkable || town.walkable(nx,nz)) {
        playerPosition.x=nx;playerPosition.z=nz;
      } else if (town.walkable(nx,playerPosition.z)) playerPosition.x=nx;
      else if (town.walkable(playerPosition.x,nz)) playerPosition.z=nz;
      town.player.rotation.y=Math.atan2(dx,dz);
    }
    town.player.position.set(playerPosition.x,0,playerPosition.z);
    animatePerson(town.player,walkAnimation,walking);
    town.update?.(dt,walkAnimation,currentState.daySeconds);
    const target=new THREE.Vector3(playerPosition.x+17,18,playerPosition.z+23);
    camera.position.lerp(target,Math.min(1,dt*4));
    camera.lookAt(playerPosition.x,1.1,playerPosition.z);
    saveClock+=dt;
    if (saveClock>=.75) { saveClock=0;game.setTownPosition(playerPosition.x,playerPosition.z); }
  } else {
    if (walking) {
      indoorPlayer.position.x=THREE.MathUtils.clamp(indoorPlayer.position.x+dx*3.8*dt,-3.75,3.75);
      indoorPlayer.position.z=THREE.MathUtils.clamp(indoorPlayer.position.z+dz*3.8*dt,-3.2,3.1);
      indoorPlayer.rotation.y=Math.atan2(dx,dz);
    }
    animatePerson(indoorPlayer,walkAnimation,walking);
  }
  dayClock+=dt;
  if (dayClock>=2) {game.advanceDay(dayClock);dayClock=0;}
  renderer.render(currentScene==='home'?inside:outside,camera);
}
animate();
