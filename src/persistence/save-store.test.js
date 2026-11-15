import test from 'node:test';
import assert from 'node:assert/strict';
import { initialSave, loadSave, saveGame, browserStorage, memoryStorage } from './save-store.js';
import { SAVE_KEY, FURNITURE } from '../rules.js';

test('Clover Hollow never writes or reads a Willowbend save', () => {
  const storage=memoryStorage();
  storage.setItem('willowbend-save-v1',JSON.stringify({deed:999,petals:9999}));
  const save=loadSave(storage);
  assert.equal(save.deed,null);
  assert.equal(save.petals,165);
  save.deed=1;
  assert.equal(saveGame(storage,save),true);
  assert.equal(JSON.parse(storage.getItem('willowbend-save-v1')).deed,999);
  assert.equal(JSON.parse(storage.getItem(SAVE_KEY)).deed,1);
});
test('loadSave gracefully recovers from corrupt JSON and unavailable storage', () => {
  const storage=memoryStorage();
  storage.setItem(SAVE_KEY,'{broken');
  assert.deepEqual(loadSave(storage),initialSave());
  assert.deepEqual(loadSave(null),initialSave());
  assert.equal(saveGame(null,initialSave()),false);
  assert.equal(saveGame({setItem(){throw Error('quota');}},initialSave()),false);
  assert.equal(browserStorage({get localStorage(){throw Error('denied');}}),null);
});
test('loading hostile or legacy-inconsistent values never manufactures free placed furniture', () => {
  const storage=memoryStorage();
  const save=initialSave();
  save.deed=7;
  save.petals=-500;
  save.inventory.chair=0;
  save.inventory.bed=0;
  save.placements=[
    {id:'a',type:'chair',x:0,z:0,r:0},
    {id:'a',type:'chair',x:1,z:0,r:0},
    {id:'b',type:'bed',x:0,z:0,r:0},
    {id:'bad',type:'not-real',x:0,z:0,r:0}
  ];
  save.story={homeVisits:-1,conversations:{Pip:2,'not valid':-99}};
  storage.setItem(SAVE_KEY,JSON.stringify(save));
  const restored=loadSave(storage);
  assert.equal(restored.deed,null);
  assert.equal(restored.petals,165);
  assert.equal(restored.placements.length,0);
  assert.equal(restored.story.homeVisits,0);
  assert.equal(restored.story.conversations.Pip,2);
  assert.equal(restored.story.conversations['not valid'],undefined);
  assert.ok(FURNITURE.chair);
});
