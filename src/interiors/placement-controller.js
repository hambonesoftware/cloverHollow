import * as THREE from 'three';
import { FURNITURE } from '../rules.js';
import { GRID_STEP, moveCandidate, rotateCandidate } from './placement-logic.js';

/**
 * Input adapter for the dollhouse View. This manages transient editing state,
 * never inventory, saved placements, ownership or persistence.
 *
 * Mandatory integrations:
 *   getPlacements(): Placement[]
 *   canPlace(candidate, placements, ignoreId): boolean (use rules.js)
 *   onCommit(candidate, replacingId): boolean | void
 *   onRetrieve(id): boolean | void
 *
 * Call dollhouse.sync(viewModel.placements) from those callbacks. Return false
 * to reject a mutation (e.g. the last owned chair is already in the room).
 */
export function createPlacementController({
  dollhouse, camera, element, getPlacements, canPlace,
  onCommit, onRetrieve, onStateChange = () => {}, onMessage = () => {},
  idFactory
}) {
  if (!dollhouse || !camera || !element || typeof getPlacements !== 'function' ||
      typeof canPlace !== 'function' || typeof onCommit !== 'function' ||
      typeof onRetrieve !== 'function') {
    throw new TypeError('createPlacementController requires a view, camera, canvas and ViewModel callbacks');
  }
  let enabled = true;
  let candidate = null;
  let replacingId = null;
  let selectedId = null;
  let valid = false;
  let counter = 0;
  let down = null;
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();

  const state = () => ({
    enabled, candidate: candidate ? { ...candidate } : null,
    replacingId, selectedId, valid
  });
  const notify = () => onStateChange(state());
  const say = message => { onMessage(message); notify(); };
  const placements = () => getPlacements() ?? [];
  const evaluate = () => {
    if (!candidate) { valid = false; dollhouse.clearPreview(); notify(); return; }
    valid = Boolean(canPlace(candidate, placements(), replacingId));
    dollhouse.preview(candidate, valid);
    notify();
  };
  const rayFrom = event => {
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1,
      -(event.clientY - rect.top) / rect.height * 2 + 1);
    camera.updateMatrixWorld();
    raycaster.setFromCamera(pointer, camera);
    return raycaster;
  };
  function cancel() {
    candidate = null;
    replacingId = null;
    selectedId = null;
    down = null;
    valid = false;
    dollhouse.clearPreview();
    notify();
  }
  function startPlacing(type) {
    if (!enabled || !FURNITURE[type]) return false;
    const id = String(idFactory ? idFactory(type) : 'room-draft-' + ++counter);
    candidate = { id, type, x: 0, z: 0.5, r: 0 };
    replacingId = null;
    selectedId = null;
    evaluate();
    say('Choose a spot for ' + FURNITURE[type].name + '. Tap to place, or rotate it.');
    element.focus({ preventScroll: true });
    return true;
  }
  function startMoving(id) {
    if (!enabled) return false;
    const placement = placements().find(p => p.id === id);
    if (!placement) return false;
    candidate = { ...placement };
    replacingId = placement.id;
    selectedId = placement.id;
    evaluate();
    say('Moving ' + FURNITURE[placement.type].name + '. Drag, rotate, or store it.');
    return true;
  }
  function select(id) {
    if (!enabled) return false;
    const exists = placements().some(p => p.id === id);
    if (!exists) return false;
    cancel();
    selectedId = id;
    say('Furniture selected. Choose Move or Store, or tap another item.');
    return true;
  }
  function reposition(point) {
    if (!enabled || !candidate || !point) return false;
    candidate = moveCandidate(candidate, point);
    evaluate();
    return true;
  }
  function rotate(direction = 1) {
    if (!enabled) return false;
    if (!candidate && selectedId) startMoving(selectedId);
    if (!candidate) return false;
    candidate = rotateCandidate(candidate, direction);
    evaluate();
    return true;
  }
  function nudge(dx, dz) {
    if (!enabled) return false;
    if (!candidate && selectedId) startMoving(selectedId);
    if (!candidate) return false;
    return reposition({ x: candidate.x + dx * GRID_STEP,
      z: candidate.z + dz * GRID_STEP });
  }
  function place() {
    if (!enabled || !candidate) return false;
    evaluate();
    if (!valid) {
      say('That spot is occupied or too close to the doorway. Try the green squares.');
      return false;
    }
    const accepted = onCommit({ ...candidate }, replacingId);
    if (accepted === false) {
      say('That item is not available to place right now.');
      return false;
    }
    const name = FURNITURE[candidate.type]?.name ?? 'Furniture';
    cancel();
    say(name + ' looks lovely there!');
    return true;
  }
  function retrieve() {
    if (!enabled) return false;
    const id = replacingId ?? selectedId;
    if (!id) return false;
    const accepted = onRetrieve(id);
    if (accepted === false) {
      say('Could not put that item away.');
      return false;
    }
    cancel();
    say('Stored safely! The item is still yours.');
    return true;
  }
  function pointerDown(event) {
    if (!enabled || event.button > 0) return;
    const ray = rayFrom(event);
    if (!ray) return;
    const hit = !candidate ? dollhouse.pickFurniture(ray) : null;
    down = { id: event.pointerId, x: event.clientX, y: event.clientY,
      picked: Boolean(hit), moved: false };
    if (hit) startMoving(hit.id);
    const p = dollhouse.floorPosition(ray);
    if (p && !hit) reposition(p);
    element.setPointerCapture?.(event.pointerId);
    element.focus({ preventScroll: true });
    event.preventDefault();
  }
  function pointerMove(event) {
    if (!enabled || !candidate) return;
    if (down && down.id !== event.pointerId) return;
    if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) {
      down.moved = true;
    }
    const ray = rayFrom(event);
    const position = ray && dollhouse.floorPosition(ray);
    if (position) reposition(position);
    if (down) event.preventDefault();
  }
  function pointerUp(event) {
    if (!enabled || !down || down.id !== event.pointerId) return;
    const gesture = down;
    down = null;
    if (element.hasPointerCapture?.(event.pointerId)) element.releasePointerCapture(event.pointerId);
    const ray = rayFrom(event);
    const position = ray && dollhouse.floorPosition(ray);
    // A tap on existing furniture selects it. A drag moves it.
    if (gesture.picked && !gesture.moved) {
      selectedId = replacingId;
      notify();
      return;
    }
    if (position && candidate) reposition(position);
    if (candidate && (gesture.moved || !gesture.picked)) place();
    event.preventDefault();
  }
  function pointerCancel() {
    down = null;
    if (candidate) evaluate();
  }
  function keyDown(event) {
    if (!enabled || event.altKey || event.metaKey || event.ctrlKey) return;
    if (event.target instanceof HTMLElement &&
        /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
    let handled = true;
    switch (event.key) {
      case 'Escape': cancel(); break;
      case 'r': case 'R': rotate(); break;
      case 'Enter': case ' ': place(); break;
      case 'Backspace': case 'Delete': retrieve(); break;
      case 'ArrowUp': nudge(0, -1); break;
      case 'ArrowDown': nudge(0, 1); break;
      case 'ArrowLeft': nudge(-1, 0); break;
      case 'ArrowRight': nudge(1, 0); break;
      default: handled = false;
    }
    if (handled && (candidate || selectedId || event.key === 'Escape')) event.preventDefault();
  }
  function setEnabled(value) {
    const next = Boolean(value);
    if (!next) cancel();
    enabled = next;
    notify();
  }
  function destroy() {
    element.removeEventListener('pointerdown', pointerDown);
    element.removeEventListener('pointermove', pointerMove);
    element.removeEventListener('pointerup', pointerUp);
    element.removeEventListener('pointercancel', pointerCancel);
    window.removeEventListener('keydown', keyDown);
    cancel();
  }
  if (element.tabIndex < 0) element.tabIndex = 0;
  element.style.touchAction = 'none';
  element.addEventListener('pointerdown', pointerDown);
  element.addEventListener('pointermove', pointerMove);
  element.addEventListener('pointerup', pointerUp);
  element.addEventListener('pointercancel', pointerCancel);
  window.addEventListener('keydown', keyDown);
  notify();

  return { startPlacing, startMoving, select, reposition, rotate, nudge,
    place, retrieve, cancel, setEnabled, getState: state, destroy };
}
