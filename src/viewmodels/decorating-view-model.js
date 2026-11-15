import { FURNITURE, unusedFurniture } from '../rules.js';

const snap = value => Math.round(value * 4) / 4;
export class DecoratingViewModel {
  constructor(game) {
    this.game = game;
    this.listeners = new Set();
    this.mode = null;
    this.type = null;
    this.selectedId = null;
    this.rotation = 0;
    this.candidate = null;
  }
  get state() {
    return { mode: this.mode, type: this.type, selectedId: this.selectedId,
      rotation: this.rotation, candidate: this.candidate && { ...this.candidate } };
  }
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }
  _emit() { for (const listener of this.listeners) listener(this.state); }
  selectFromInventory(type) {
    if (!FURNITURE[type] || unusedFurniture(this.game.state, type) <= 0) return false;
    this.mode = 'place'; this.type = type; this.selectedId = null;
    this.rotation = 0; this.candidate = null; this._emit();
    return true;
  }
  selectPlaced(id) {
    const placed = this.game.state.placements.find(p => p.id === id);
    if (!placed) return false;
    this.mode = 'move'; this.type = placed.type; this.selectedId = id;
    this.rotation = placed.r;
    this.candidate = { ...placed, valid: true };
    this._emit();
    return true;
  }
  preview(x, z) {
    if (!this.mode || !Number.isFinite(x) || !Number.isFinite(z)) return null;
    x = snap(x); z = snap(z);
    const valid = this.game.canPlaceFurniture(this.type, x, z, this.rotation, this.selectedId);
    this.candidate = { id: this.selectedId, type: this.type, x, z, r: this.rotation, valid };
    this._emit();
    return this.candidate;
  }
  rotate() {
    if (!this.mode) return false;
    this.rotation = (this.rotation + 1) % 4;
    if (this.candidate) this.preview(this.candidate.x, this.candidate.z);
    else this._emit();
    return true;
  }
  confirm() {
    if (!this.candidate || !this.candidate.valid) return { ok: false, reason: 'Choose an open spot first.' };
    const { x, z, r } = this.candidate;
    const result = this.mode === 'move'
      ? this.game.moveFurniture(this.selectedId, x, z, r)
      : this.game.placeFurniture(this.type, x, z, r);
    if (result.ok) this.cancel();
    return result;
  }
  store() {
    if (this.mode !== 'move') return { ok: false, reason: 'Select placed furniture first.' };
    const result = this.game.storeFurniture(this.selectedId);
    if (result.ok) this.cancel();
    return result;
  }
  cancel() {
    this.mode = null; this.type = null; this.selectedId = null;
    this.rotation = 0; this.candidate = null;
    this._emit();
  }
}
