import * as THREE from 'three';
import { FURNITURE, ROOM, footprint } from '../rules.js';
import { furniture as makeFurniture } from '../art.js';
import { decorateFairyRoom } from './fairy-details.js';

const COLORS = Object.freeze({
  wall: 0xffead6, wallSide: 0xf2dcc8, wood: 0xb87b55, trim: 0xfff7e8,
  glass: 0xb6e4e2, brass: 0xd5ac65, floor: [0xd5a777, 0xc99b6f, 0xdfb487]
});
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.82, ...extra });
const box = (w, h, d, color, x = 0, y = 0, z = 0, extra = {}) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, extra));
  mesh.position.set(x, y, z);
  mesh.castShadow = h > 0.4;
  mesh.receiveShadow = true;
  return mesh;
};
function cleanup(object) {
  object.traverse(child => {
    if (!child.isMesh) return;
    child.geometry?.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const material of materials) material?.dispose();
  });
}
function windowFrame(root, axis, at, center, openingWidth, lower, upper) {
  const height = upper - lower, middle = (lower + upper) / 2;
  const back = axis === 'x';
  const pane = box(back ? openingWidth : 0.045, height,
    back ? 0.045 : openingWidth, COLORS.glass,
    back ? center : at, middle, back ? at : center,
    { transparent: true, opacity: 0.57, metalness: 0.02, roughness: 0.22, depthWrite: false });
  root.add(pane);
  const edge = 0.11;
  const makeRail = (length, vertical, offset, y) => {
    const mesh = back
      ? box(vertical ? edge : length, vertical ? height + edge : edge, 0.22, COLORS.trim,
        center + (vertical ? offset : 0), vertical ? middle : y, at + 0.12)
      : box(0.22, vertical ? height + edge : edge, vertical ? edge : length, COLORS.trim,
        at + 0.12, vertical ? middle : y, center + (vertical ? offset : 0));
    root.add(mesh);
  };
  for (const side of [-1, 1]) makeRail(0, true, side * openingWidth / 2, 0);
  makeRail(openingWidth + edge, false, 0, lower);
  makeRail(openingWidth + edge, false, 0, upper);
  makeRail(openingWidth, false, 0, middle);
  const muntin = back
    ? box(0.075, height, 0.12, COLORS.trim, center, middle, at + 0.14)
    : box(0.12, height, 0.075, COLORS.trim, at + 0.14, middle, center);
  root.add(muntin);
  root.add(back
    ? box(openingWidth + 0.36, 0.1, 0.42, 0xe0b68c, center, lower - 0.08, at + 0.23)
    : box(0.42, 0.1, openingWidth + 0.36, 0xe0b68c, at + 0.23, lower - 0.08, center));
  // Short gathered curtains leave the panes and room naturally visible.
  for (const side of [-1, 1]) {
    const curtain = back
      ? box(0.22, height * 0.75, 0.09, 0xe9b4a8,
        center + side * (openingWidth / 2 - 0.12), upper - height * 0.375, at + 0.24)
      : box(0.09, height * 0.75, 0.22, 0xe9b4a8,
        at + 0.24, upper - height * 0.375, center + side * (openingWidth / 2 - 0.12));
    curtain.castShadow = false;
    root.add(curtain);
  }
}
function addWallWithWindows(root, axis, length, fixed, windows, color, height) {
  const back = axis === 'x';
  const lower = 1.48, upper = 3.02, thickness = 0.17;
  const wallSection = (start, end, midY, h) => {
    if (end - start <= 0.0001 || h <= 0) return;
    root.add(back
      ? box(end - start, h, thickness, color, (start + end) / 2, midY, fixed)
      : box(thickness, h, end - start, color, fixed, midY, (start + end) / 2));
  };
  let start = -length / 2;
  for (const window of [...windows].sort((a, b) => a.center - b.center)) {
    const left = window.center - window.width / 2;
    const right = window.center + window.width / 2;
    wallSection(start, left, height / 2, height);
    wallSection(left, right, lower / 2, lower);
    wallSection(left, right, (upper + height) / 2, height - upper);
    windowFrame(root, axis, fixed, window.center, window.width, lower, upper);
    start = right;
  }
  wallSection(start, length / 2, height / 2, height);
  // Chair rail, baseboard and crown moulding establish miniature scale.
  root.add(back
    ? box(length, 0.17, 0.28, COLORS.trim, 0, 0.19, fixed + 0.17)
    : box(0.28, 0.17, length, COLORS.trim, fixed + 0.17, 0.19, 0));
  root.add(back
    ? box(length, 0.13, 0.29, COLORS.trim, 0, height - 0.09, fixed + 0.17)
    : box(0.29, 0.13, length, COLORS.trim, fixed + 0.17, height - 0.09, 0));
}
function surfaceHeight(placement, placements) {
  if (!FURNITURE[placement.type]?.tabletop) return 0;
  const supports = { table: 1.35, dresser: 1.55 };
  let best = 0;
  for (const other of placements) {
    if (other.id === placement.id || supports[other.type] === undefined) continue;
    const d = footprint(other);
    if (d && Math.abs(placement.x - other.x) < d.w / 2 - 0.08 &&
      Math.abs(placement.z - other.z) < d.d / 2 - 0.08) {
      best = Math.max(best, supports[other.type]);
    }
  }
  return best;
}
function makeDecoratedFurniture(type) {
  const model = makeFurniture(type);
  // Keep the catalog's authored dimensions. Scaling these models makes the
  // player look like a giant and invalidates the rule engine's footprints.
  model.traverse(node => { if (node.isMesh) { node.castShadow = true; node.receiveShadow = true; } });
  return model;
}

/**
 * Presentational, stateless-with-respect-to-ownership interior scene.
 * External ViewModel provides the complete placement list on every change.
 * The returned root is available for attaching a 2.2-unit character.
 */
export function createDollhouse(scene, options = {}) {
  const width = options.width ?? ROOM.width;
  const depth = options.depth ?? ROOM.depth;
  const wallHeight = options.wallHeight ?? ROOM.wall;
  const root = new THREE.Group();
  root.name = 'Clover Hollow • dollhouse';
  root.visible = false;
  scene.add(root);

  const base = box(width + 0.34, 0.24, depth + 0.34, 0x9e755c, 0, -0.18, 0);
  root.add(base);
  root.add(box(width + 0.14, 0.06, depth + 0.14, 0xe3c99e, 0, -0.035, 0));
  const plankCount = Math.ceil(width / 0.48);
  for (let i = 0; i < plankCount; i++) {
    const plankWidth = width / plankCount - 0.015;
    root.add(box(plankWidth, 0.035, depth - 0.045,
      COLORS.floor[i % COLORS.floor.length],
      -width / 2 + width * (i + 0.5) / plankCount, -0.003, 0));
  }
  addWallWithWindows(root, 'x', width, -depth / 2,
    [{ center: -2.15, width: 1.6 }, { center: 2.1, width: 1.6 }],
    COLORS.wall, wallHeight);
  addWallWithWindows(root, 'z', depth, -width / 2,
    [{ center: -0.65, width: 1.65 }], COLORS.wallSide, wallHeight);

  // The added architecture lives on the back/left walls and does not alter
  // furniture footprints, pick rays, walking clearance, or save geometry.
  decorateFairyRoom(root,{width,depth,height:wallHeight});

  // Tiny wall ornaments: an art print and a ceiling-free pendant.
  root.add(box(0.96, 0.76, 0.085, 0xa67e67, 0.05, 2.69, -depth / 2 + 0.22));
  root.add(box(0.76, 0.57, 0.09, 0x9bbba8, 0.05, 2.69, -depth / 2 + 0.29));
  root.add(box(0.24, 0.24, 0.1, 0xffe3a0, 0.05, 2.7, -depth / 2 + 0.36));
  const ambient = new THREE.HemisphereLight(0xfff6de, 0xc7ad93, 2.0);
  root.add(ambient);
  const sunlight = new THREE.DirectionalLight(0xffdfaf, 2.2);
  sunlight.position.set(4.5, 9, 7);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.set(1024, 1024);
  sunlight.shadow.camera.left = -9; sunlight.shadow.camera.right = 9;
  sunlight.shadow.camera.top = 9; sunlight.shadow.camera.bottom = -9;
  sunlight.shadow.normalBias = 0.025;
  root.add(sunlight);
  const lamplight = new THREE.PointLight(0xffcc89, 8, 12, 2);
  lamplight.position.set(-1.2, 3.35, -0.6);
  root.add(lamplight);

  const furnitureRoot = new THREE.Group();
  furnitureRoot.name = 'Furniture • synchronized placements';
  root.add(furnitureRoot);
  const ghostRoot = new THREE.Group();
  ghostRoot.name = 'Ephemeral furniture preview';
  root.add(ghostRoot);
  const objects = new Map();
  let placements = [];
  let previewModel = null;
  let previewKind = null;
  let previewValid = null;

  function setVisible(visible) { root.visible = Boolean(visible); }
  function sync(nextPlacements) {
    if (!Array.isArray(nextPlacements)) throw new TypeError('sync expects an array of placements');
    placements = nextPlacements.filter(p =>
      p && typeof p.id === 'string' && FURNITURE[p.type] &&
      Number.isFinite(p.x) && Number.isFinite(p.z));
    const wanted = new Set(placements.map(p => p.id));
    for (const [id, entry] of objects) {
      if (wanted.has(id) && placements.find(p => p.id === id)?.type === entry.type) continue;
      furnitureRoot.remove(entry.model);
      cleanup(entry.model);
      objects.delete(id);
    }
    for (const p of placements) {
      let entry = objects.get(p.id);
      if (!entry) {
        entry = { type: p.type, model: makeDecoratedFurniture(p.type) };
        entry.model.userData.placementId = p.id;
        objects.set(p.id, entry);
        furnitureRoot.add(entry.model);
      }
      entry.model.position.set(p.x, surfaceHeight(p, placements), p.z);
      entry.model.rotation.set(0, (((p.r ?? 0) % 4 + 4) % 4) * Math.PI / 2, 0);
    }
    if (previewModel?.userData.candidate) {
      const p = previewModel.userData.candidate;
      preview(p, previewValid);
    }
  }
  function clearPreview() {
    for (const child of [...ghostRoot.children]) {
      ghostRoot.remove(child);
      cleanup(child);
    }
    previewModel = null;
    previewKind = null;
    previewValid = null;
  }
  function preview(candidate, valid) {
    if (!candidate || !FURNITURE[candidate.type]) { clearPreview(); return; }
    const dim = footprint(candidate);
    const kind = candidate.type + ':' + (((candidate.r ?? 0) % 4 + 4) % 4);
    if (kind !== previewKind) {
      clearPreview();
      previewKind = kind;
      const wrapper = new THREE.Group();
      const ghost = makeDecoratedFurniture(candidate.type);
      ghost.traverse(node => {
        if (!node.isMesh) return;
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        const ghostMaterials = materials.map(source => {
          const baseColor = source.color?.clone() ?? new THREE.Color(0xffffff);
          source.dispose();
          const ghostMaterial = new THREE.MeshBasicMaterial({
            color: baseColor, transparent: true, opacity: 0.55,
            depthWrite: false, side: THREE.DoubleSide
          });
          ghostMaterial.userData.originalColor = baseColor.getHex();
          return ghostMaterial;
        });
        node.material = ghostMaterials.length === 1 ? ghostMaterials[0] : ghostMaterials;
        node.castShadow = false; node.receiveShadow = false;
      });
      wrapper.add(ghost);
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(dim.w + 0.08, dim.d + 0.08),
        new THREE.MeshBasicMaterial({
          color: 0x78c5a2, transparent: true, opacity: 0.27,
          side: THREE.DoubleSide, depthWrite: false
        }));
      tile.rotation.x = -Math.PI / 2;
      tile.position.y = 0.045;
      tile.name = 'Placement footprint';
      wrapper.add(tile);
      wrapper.userData.ghost = ghost;
      wrapper.userData.tile = tile;
      previewModel = wrapper;
      ghostRoot.add(wrapper);
    }
    const isValid = Boolean(valid);
    previewValid = isValid;
    previewModel.userData.candidate = { ...candidate };
    previewModel.position.set(candidate.x, 0, candidate.z);
    previewModel.userData.ghost.position.y = surfaceHeight(candidate, placements);
    previewModel.userData.ghost.rotation.y = (((candidate.r ?? 0) % 4 + 4) % 4) * Math.PI / 2;
    // Purely visual feedback: the ViewModel remains the placement authority.
    previewModel.userData.tile.material.color.setHex(isValid ? 0x58c49b : 0xe97777);
    const tint = new THREE.Color(isValid ? 0x7fc7a9 : 0xeb9690);
    previewModel.userData.ghost.traverse(node => {
      if (!node.isMesh) return;
      for (const m of Array.isArray(node.material) ? node.material : [node.material]) {
        m.color.setHex(m.userData.originalColor ?? 0xffffff).lerp(tint, 0.42);
      }
    });
  }
  function pickFurniture(raycaster) {
    if (!root.visible) return null;
    root.updateWorldMatrix(true, true);
    const hits = raycaster.intersectObjects([...objects.values()].map(entry => entry.model), true);
    for (const hit of hits) {
      let node = hit.object;
      while (node && node !== furnitureRoot) {
        const id = node.userData.placementId;
        if (id) {
          const placement = placements.find(p => p.id === id);
          return placement ? { ...placement } : null;
        }
        node = node.parent;
      }
    }
    return null;
  }
  function floorPosition(raycaster) {
    if (!root.visible) return null;
    root.updateWorldMatrix(true, false);
    const origin = root.localToWorld(new THREE.Vector3());
    const normal = new THREE.Vector3(0, 1, 0)
      .transformDirection(root.matrixWorld);
    const worldHit = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(
      new THREE.Plane().setFromNormalAndCoplanarPoint(normal, origin), worldHit)) return null;
    const hit = root.worldToLocal(worldHit);
    if (Math.abs(hit.x) > width / 2 || Math.abs(hit.z) > depth / 2) return null;
    return { x: hit.x, z: hit.z };
  }
  function dispose() {
    clearPreview();
    for (const entry of objects.values()) {
      furnitureRoot.remove(entry.model);
      cleanup(entry.model);
    }
    objects.clear();
    root.traverse(object => {
      if (object.isLight) object.dispose?.();
      if (object.isMesh && !object.userData.placementId) {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) object.material.forEach(m => m.dispose());
        else object.material?.dispose();
      }
    });
    root.parent?.remove(root);
  }
  return { root, width, depth, setVisible, sync, preview, clearPreview,
    pickFurniture, floorPosition, dispose };
}
