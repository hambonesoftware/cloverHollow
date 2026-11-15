import { LOTS, FURNITURE, initialSave, loadSave, saveGame, canPlace, unusedFurniture } from '../rules.js';

// Pure observable state: there are deliberately no browser, DOM, or Three.js imports.
const clone = value => JSON.parse(JSON.stringify(value));
const failure = reason => ({ ok: false, reason });
const success = (value = null) => ({ ok: true, value });
export class GameViewModel {
  constructor({ storage = null, state = null } = {}) {
    this.storage = storage;
    this.model = state ? clone(state) : loadSave(storage);
    this.listeners = new Set();
  }
  get state() { return clone(this.model); }
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }
  _commit() {
    saveGame(this.storage, this.model);
    const snapshot = this.state;
    for (const listener of this.listeners) listener(snapshot);
  }
  persist() { return saveGame(this.storage, this.model); }
  chooseLot(index) {
    if (!Number.isInteger(index) || index < 0 || index >= LOTS.length) return failure('Unknown property lot.');
    if (this.model.deed !== null) return failure('Your deed has already been registered.');
    this.model.deed = index;
    this.model.greeting = true;
    this.model.gifts['Clover Hollow Deed'] = 1;
    this._commit();
    return success(LOTS[index]);
  }
  welcome() {
    if (this.model.greeting) return success();
    this.model.greeting = true;
    this._commit();
    return success();
  }
  buyFurniture(type) {
    const item = FURNITURE[type];
    if (!item) return failure('Unknown furniture.');
    if (this.model.petals < item.price) return failure('Not enough petals.');
    this.model.petals -= item.price;
    this.model.inventory[type] = (this.model.inventory[type] ?? 0) + 1;
    this._commit();
    return success({ type, remaining: this.model.petals });
  }
  canPlaceFurniture(type, x, z, r = 0, ignoreId = null) {
    return Number.isInteger(r) && r >= 0 && r <= 3 &&
      canPlace({ type, x, z, r }, this.model.placements, ignoreId);
  }
  placeFurniture(type, x, z, r = 0) {
    if (this.model.deed === null) return failure('Collect your property deed first.');
    if (!FURNITURE[type]) return failure('Unknown furniture.');
    if (unusedFurniture(this.model, type) <= 0) return failure('No unplaced furniture of this type.');
    if (!this.canPlaceFurniture(type, x, z, r)) return failure('That furniture will not fit there.');
    let id;
    do { id = 'item-' + this.model.nextFurnitureId++; }
    while (this.model.placements.some(p => p.id === id));
    const placement = { id, type, x, z, r };
    this.model.placements.push(placement);
    this._commit();
    return success(clone(placement));
  }
  moveFurniture(id, x, z, r) {
    const p = this.model.placements.find(p => p.id === id);
    if (!p) return failure('Furniture not found.');
    const turn = r === undefined ? p.r : r;
    if (!this.canPlaceFurniture(p.type, x, z, turn, id)) return failure('That furniture will not fit there.');
    Object.assign(p, { x, z, r: turn });
    this._commit();
    return success(clone(p));
  }
  rotateFurniture(id) {
    const p = this.model.placements.find(p => p.id === id);
    if (!p) return failure('Furniture not found.');
    return this.moveFurniture(id, p.x, p.z, (p.r + 1) % 4);
  }
  storeFurniture(id) {
    const index = this.model.placements.findIndex(p => p.id === id);
    if (index === -1) return failure('Furniture not found.');
    const [placement] = this.model.placements.splice(index, 1);
    // Ownership remains in inventory; storing must never delete the item.
    this._commit();
    return success(clone(placement));
  }
  enterHome() {
    if (this.model.deed === null) return failure('Choose a home at the mayor’s hall first.');
    if (this.model.scene !== 'home') {
      this.model.scene = 'home';
      this.model.story.homeVisits++;
      this._commit();
    }
    return success();
  }
  leaveHome() {
    if (this.model.scene !== 'town') {
      const lot = LOTS[this.model.deed];
      this.model.town = { x: lot.x, z: lot.z + 5.5 };
      this.model.scene = 'town';
      this._commit();
    }
    return success();
  }
  celebrateHousewarming() {
    if (this.model.deed === null || this.model.story.homeVisits === 0) return failure('Visit your home first.');
    if (this.model.story.housewarming) return failure('Already celebrated.');
    this.model.story.housewarming = true;
    this.model.gifts['Neighbors’ Housewarming Card'] = 1;
    this.model.supplies['Pip’s Cookies'] = (this.model.supplies['Pip’s Cookies'] ?? 0) + 3;
    this._commit();
    return success();
  }
  awardKeepsake(name) {
    if (typeof name !== 'string' || name.trim().length===0 || name.length>80)
      return failure('Unknown keepsake.');
    // One copy per visit/activity reward, preserved in the existing gifts map.
    if ((this.model.gifts[name]??0)>0) return success({name,alreadyOwned:true});
    this.model.gifts[name]=1;
    this._commit();
    return success({name,alreadyOwned:false});
  }
  talkTo(name) {
    if (typeof name !== 'string' || !name.trim()) return failure('Unknown neighbor.');
    const counts = this.model.story.conversations;
    counts[name] = (counts[name] ?? 0) + 1;
    this._commit();
    return success(counts[name]);
  }
  setTownPosition(x, z) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return failure('Invalid position.');
    this.model.town = { x, z };
    this._commit();
    return success();
  }
  advanceDay(seconds) {
    if (!Number.isFinite(seconds) || seconds <= 0) return failure('Invalid time.');
    this.model.daySeconds = (this.model.daySeconds + seconds) % 1320;
    this._commit();
    return success();
  }
}
