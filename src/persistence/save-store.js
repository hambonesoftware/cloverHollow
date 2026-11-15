import { initialSave, loadSave, saveGame } from '../rules.js';

// Browsers can deny localStorage (private mode, sandboxed iframe, quota).
export function browserStorage(root = typeof window === 'undefined' ? null : window) {
  try { return root?.localStorage ?? null; } catch { return null; }
}
export function memoryStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}
export { initialSave, loadSave, saveGame };
