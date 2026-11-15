import * as THREE from 'three';
import { FURNITURE, STARTER_PLACEMENTS, initialSave, unusedFurniture,
  canPlace as ruleCanPlace } from '../rules.js';
import { createDollhouse } from './dollhouse.js';
import { createPlacementController } from './placement-controller.js';
import { createRoomWalker } from './room-walker.js';
import { isWalkable } from './placement-logic.js';

// Standalone development harness. This object stands in for the game's
// ViewModel: it owns inventory, placements and commit/retrieve decisions.
// Neither createDollhouse nor its input controller mutates this object directly.
const state = initialSave();
const canvas = document.getElementById('scene');
const stage = document.querySelector('.stage');
const inventory = document.getElementById('inventory');
const status = document.getElementById('status');
const tip = document.getElementById('tip');
const modeButton = document.getElementById('mode');
const toolbar = document.querySelector('.toolbar');
const palette = document.querySelector('.palette');
const buttons = Object.fromEntries(
  ['move', 'rotate', 'place', 'retrieve', 'cancel']
    .map(key => [key, document.getElementById(key)])
);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd6e5d8);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const camera = new THREE.OrthographicCamera(-8, 8, 8, -8, 0.1, 120);
camera.position.set(12.5, 14.7, 18);
camera.lookAt(0, 1.55, -0.1);
const house = createDollhouse(scene);
house.setVisible(true);
house.sync(state.placements);
let decorating = true;
let serial = 0;

function message(text) { status.textContent = text; }
function resize() {
  const width = Math.max(1, stage.clientWidth);
  const height = Math.max(1, stage.clientHeight);
  const aspect = width / height;
  // Frame the miniature in landscape, portrait and short iPhone landscape.
  const visibleWidth = aspect < 0.85 ? 16 : 16.4;
  const visibleHeight = Math.max(12.7, visibleWidth / aspect);
  camera.left = -visibleHeight * aspect / 2;
  camera.right = visibleHeight * aspect / 2;
  camera.top = visibleHeight / 2;
  camera.bottom = -visibleHeight / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}
new ResizeObserver(resize).observe(stage);
window.addEventListener('resize', resize);
resize();

const walker = createRoomWalker({
  dollhouse: house, camera, element: canvas,
  getPlacements: () => state.placements,
  onMessage: message
});
walker.setEnabled(false);

function validate(candidate, other, ignoreId) {
  if (!ruleCanPlace(candidate, other, ignoreId)) return false;
  const next = other.filter(p => p.id !== ignoreId);
  next.push(candidate);
  // Do not drop an object directly on the character's feet.
  return isWalkable(walker.player.position.x, walker.player.position.z, next);
}
function drawInventory() {
  inventory.replaceChildren();
  for (const [type, info] of Object.entries(FURNITURE)) {
    const available = unusedFurniture(state, type);
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'item';
    item.disabled = !decorating || available === 0;
    item.title = info.description + (available ? '' : ' (all copies are placed)');
    item.setAttribute('aria-label',
      info.name + ', ' + available + ' available, ' + info.category);
    const emoji = document.createElement('span');
    emoji.className = 'emoji';
    emoji.setAttribute('aria-hidden', 'true');
    emoji.textContent = info.emoji;
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = info.name;
    const count = document.createElement('span');
    count.className = 'count';
    count.textContent = String(available);
    item.append(emoji, name, count);
    item.addEventListener('click', () => editor.startPlacing(type));
    inventory.append(item);
  }
}
function drawToolbar(edited) {
  const enabled = edited.enabled;
  buttons.move.disabled = !enabled || !edited.selectedId;
  buttons.rotate.disabled = !enabled || (!edited.candidate && !edited.selectedId);
  buttons.place.disabled = !enabled || !edited.candidate;
  buttons.retrieve.disabled = !enabled || !edited.selectedId;
  buttons.cancel.disabled = !enabled || (!edited.candidate && !edited.selectedId);
  if (edited.candidate) {
    buttons.place.title = edited.valid ? 'Place furniture here (Enter)' :
      'Invalid location: move until the preview turns green';
  } else {
    buttons.place.title = 'Choose an item or select placed furniture';
  }
}
const editor = createPlacementController({
  dollhouse: house, camera, element: canvas,
  getPlacements: () => state.placements,
  canPlace: validate,
  idFactory: () => 'decor-' + ++serial,
  onStateChange: drawToolbar,
  onMessage: message,
  onCommit(candidate, replacingId) {
    if (!validate(candidate, state.placements, replacingId)) return false;
    if (replacingId) {
      const found = state.placements.findIndex(p => p.id === replacingId);
      if (found < 0) return false;
      state.placements = state.placements.map(p =>
        p.id === replacingId ? { ...candidate } : p);
    } else {
      if (unusedFurniture(state, candidate.type) < 1) return false;
      state.placements = [...state.placements, { ...candidate }];
    }
    house.sync(state.placements);
    drawInventory();
    return true;
  },
  onRetrieve(id) {
    if (!state.placements.some(p => p.id === id)) return false;
    state.placements = state.placements.filter(p => p.id !== id);
    // Ownership is inventory[type] (total owned), not the number in the room.
    house.sync(state.placements);
    drawInventory();
    return true;
  }
});

buttons.move.addEventListener('click', () => {
  const id = editor.getState().selectedId;
  if (id) editor.startMoving(id);
});
buttons.rotate.addEventListener('click', () => editor.rotate());
buttons.place.addEventListener('click', () => editor.place());
buttons.retrieve.addEventListener('click', () => editor.retrieve());
buttons.cancel.addEventListener('click', () => {
  editor.cancel();
  message('No worries! Nothing was changed.');
});
document.getElementById('reset').addEventListener('click', () => {
  editor.cancel();
  state.placements = STARTER_PLACEMENTS.map(p => ({ ...p }));
  house.sync(state.placements);
  drawInventory();
  message('Your cottage is back to its welcoming starter arrangement.');
});
modeButton.addEventListener('click', () => {
  decorating = !decorating;
  editor.setEnabled(decorating);
  walker.setEnabled(!decorating);
  modeButton.classList.toggle('walk', !decorating);
  modeButton.setAttribute('aria-pressed', String(decorating));
  modeButton.textContent = decorating ? '✦ Decorating' : '♧ Walking';
  toolbar.style.display = decorating ? '' : 'none';
  palette.style.display = decorating ? '' : 'none';
  tip.textContent = decorating
    ? 'Tap furniture to decorate · Drag to move · R to rotate'
    : 'Tap the floor to walk around your cottage';
  drawInventory();
  resize();
  message(decorating
    ? 'Pick a treasure to decorate your little home.'
    : 'Explore your home! Tap the floor to walk there.');
});
drawInventory();
drawToolbar(editor.getState());

const clock = new THREE.Clock();
let elapsed = 0;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.06);
  elapsed += dt;
  walker.update(dt, elapsed);
  renderer.render(scene, camera);
}
animate();
