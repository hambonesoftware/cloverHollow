import * as THREE from 'three';
import { makePerson, animatePerson } from '../art.js';
import { findWalkPath, isWalkable } from './placement-logic.js';

/**
 * Optional lightweight navigation adapter for a 2.2-unit chibi character.
 * No inventory authority: reads the latest placement array each time it routes.
 */
export function createRoomWalker({
  dollhouse, camera, element, getPlacements,
  player = makePerson('kid', { shirt: 0x80ad9b, trousers: 0x7093ab }),
  start = { x: 0, z: 2.65 }, speed = 1.9, onMessage = () => {}
}) {
  if (!dollhouse || !camera || !element || typeof getPlacements !== 'function') {
    throw new TypeError('createRoomWalker needs a view, camera, canvas, and placements getter');
  }
  dollhouse.root.add(player);
  player.position.set(start.x, 0, start.z);
  let enabled = true;
  let path = [];
  let lastGoal = null;
  let previousLayout = '';
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  function routeTo(point) {
    if (!point) return false;
    const next = findWalkPath(
      { x: player.position.x, z: player.position.z }, point, getPlacements());
    if (!next.length) {
      onMessage('There is no clear path there yet.');
      return false;
    }
    path = next;
    lastGoal = { ...point };
    previousLayout = layoutKey();
    return true;
  }
  function layoutKey() {
    return getPlacements()
      .map(p => [p.id, p.type, p.x, p.z, p.r].join(':'))
      .join('|');
  }
  function pointerDown(event) {
    if (!enabled || event.button > 0) return;
    const rect = element.getBoundingClientRect();
    pointer.set(2 * (event.clientX - rect.left) / rect.width - 1,
      1 - 2 * (event.clientY - rect.top) / rect.height);
    camera.updateMatrixWorld();
    raycaster.setFromCamera(pointer, camera);
    const goal = dollhouse.floorPosition(raycaster);
    if (goal) routeTo(goal);
    event.preventDefault();
  }
  function update(delta, time) {
    const dt = Math.min(0.06, Math.max(0, delta));
    if (lastGoal && layoutKey() !== previousLayout) {
      const target = lastGoal;
      path = [];
      lastGoal = null;
      routeTo(target);
    }
    let moving = false;
    if (path.length) {
      const waypoint = path[0];
      const dx = waypoint.x - player.position.x;
      const dz = waypoint.z - player.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.055) path.shift();
      else {
        const stride = Math.min(distance, speed * dt);
        const x = player.position.x + dx / distance * stride;
        const z = player.position.z + dz / distance * stride;
        if (isWalkable(x, z, getPlacements())) {
          player.position.x = x;
          player.position.z = z;
          player.rotation.y = Math.atan2(dx, dz);
          moving = true;
        } else {
          // Never walk through furniture while a ViewModel synchronizes changes.
          path = [];
          onMessage('Something is blocking the way.');
        }
      }
    }
    if (!path.length) lastGoal = null;
    animatePerson(player, time, moving, 0.45);
  }
  function setEnabled(value) {
    enabled = Boolean(value);
    if (!enabled) { path = []; lastGoal = null; }
  }
  function dispose() {
    element.removeEventListener('pointerdown', pointerDown);
    dollhouse.root.remove(player);
  }
  element.addEventListener('pointerdown', pointerDown);
  return { player, routeTo, update, setEnabled, dispose };
}
