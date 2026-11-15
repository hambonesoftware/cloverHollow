import test from 'node:test';
import assert from 'node:assert/strict';
import { GameViewModel } from './game-view-model.js';
import { DecoratingViewModel } from './decorating-view-model.js';
import { memoryStorage } from '../persistence/save-store.js';
import { LOTS, SAVE_KEY, FURNITURE, unusedFurniture } from '../rules.js';

const setup = () => {
  const storage = memoryStorage();
  return { storage, game: new GameViewModel({ storage }) };
};

test('new arrival sees all three property choices and the registered deed never changes', () => {
  const { game } = setup();
  assert.equal(LOTS.length,3);
  assert.equal(game.state.deed,null);
  assert.equal(game.chooseLot(-1).ok,false);
  assert.equal(game.chooseLot(3).ok,false);
  assert.equal(game.chooseLot(1).ok,true);
  assert.equal(game.state.deed,1);
  assert.equal(game.state.gifts['Clover Hollow Deed'],1);
  assert.equal(game.chooseLot(2).ok,false);
  assert.equal(game.state.deed,1);
});

test('furniture purchases debit exact petals, increase ownership and reject unaffordable or invalid buys', () => {
  const { game } = setup();
  const price=FURNITURE.chair.price;
  const owned=game.state.inventory.chair;
  assert.equal(game.buyFurniture('chair').ok,true);
  assert.equal(game.state.petals,165-price);
  assert.equal(game.state.inventory.chair,owned+1);
  assert.equal(game.buyFurniture('nonexistent').ok,false);
  for (let i=0;i<30;i++) game.buyFurniture('chair');
  const before=game.state.petals;
  assert.equal(game.buyFurniture('bed').ok,false);
  assert.equal(game.state.petals,before);
});

test('observable state publishes copies and unsubscribe stops updates', () => {
  const { game } = setup();
  let calls=0;
  const stop=game.subscribe(state => {calls++;state.petals=123456;});
  assert.equal(calls,1);
  game.welcome();
  assert.equal(calls,2);
  assert.equal(game.state.petals,165);
  stop();
  game.chooseLot(0);
  assert.equal(calls,2);
});

test('place, move, rotate and store furniture without losing ownership', () => {
  const { game } = setup();
  assert.equal(game.placeFurniture('chair',0,-1,0).ok,false);
  game.chooseLot(0);
  assert.equal(game.placeFurniture('chair',0,3.6,0).ok,false);
  assert.equal(game.placeFurniture('chair',-10,0,0).ok,false);
  assert.equal(game.placeFurniture('chair',-2.75,-2.25,0).ok,false);
  const made=game.placeFurniture('chair',0,-.5,0);
  assert.equal(made.ok,true);
  const id=made.value.id;
  assert.equal(game.placeFurniture('bed',0,0,0).ok,false);
  assert.equal(game.moveFurniture(id,0,3.6,0).ok,false);
  assert.equal(game.state.placements.find(p=>p.id===id).z,-.5);
  assert.equal(game.moveFurniture(id,0,1,0).ok,true);
  assert.equal(game.rotateFurniture(id).ok,true);
  assert.equal(game.state.placements.find(p=>p.id===id).r,1);
  assert.equal(game.storeFurniture(id).ok,true);
  assert.equal(game.state.placements.some(p=>p.id===id),false);
  assert.equal(unusedFurniture(game.state,'chair'),2);
  assert.equal(game.storeFurniture(id).ok,false);
});

test('decorating ViewModel snaps previews to grid, rejects invalid spots and persists via game actions', () => {
  const { game } = setup();
  game.chooseLot(2);
  const decor=new DecoratingViewModel(game);
  assert.equal(decor.selectFromInventory('chair'),true);
  assert.equal(decor.preview(.13,.37).x,.25);
  assert.equal(decor.state.candidate.z,.25);
  assert.equal(decor.state.candidate.valid,true);
  decor.rotate();
  assert.equal(decor.state.rotation,1);
  const placed=decor.confirm();
  assert.equal(placed.ok,true);
  assert.equal(decor.state.mode,null);
  assert.equal(game.state.placements.at(-1).r,1);
  const id=placed.value.id;
  assert.equal(decor.selectPlaced(id),true);
  decor.preview(0,3.75);
  assert.equal(decor.state.candidate.valid,false);
  assert.equal(decor.confirm().ok,false);
  assert.equal(game.state.placements.some(p=>p.id===id),true);
  assert.equal(decor.store().ok,true);
  assert.equal(game.state.placements.some(p=>p.id===id),false);
});

test('save/load keeps deed, petals, furniture, location, conversations and housewarming', () => {
  const { storage, game }=setup();
  game.chooseLot(2);
  game.buyFurniture('clock');
  const placed=game.placeFurniture('clock',3,1,0);
  assert.equal(placed.ok,true);
  game.setTownPosition(12,25);
  game.talkTo('Pip');
  assert.equal(game.enterHome().ok,true);
  assert.equal(game.celebrateHousewarming().ok,true);
  const copy=new GameViewModel({storage});
  assert.equal(copy.state.deed,2);
  assert.equal(copy.state.petals,165-FURNITURE.clock.price);
  assert.equal(copy.state.placements.some(p=>p.id===placed.value.id),true);
  assert.equal(copy.state.story.conversations.Pip,1);
  assert.equal(copy.state.story.housewarming,true);
  assert.equal(copy.state.scene,'home');
  assert.equal(copy.state.gifts['Neighbors’ Housewarming Card'],1);
  copy.leaveHome();
  const returned=new GameViewModel({storage});
  assert.equal(returned.state.scene,'town');
  assert.equal(returned.state.town.x,LOTS[2].x);
  assert.equal(returned.state.town.z,LOTS[2].z+5.5);
  returned.enterHome();
  assert.equal(returned.state.story.homeVisits,2);
  assert.equal(returned.state.placements.some(p=>p.id===placed.value.id),true);
  assert.ok(storage.getItem(SAVE_KEY));
});

test('rotations must be quarter turns; overlaps, doorway and walls always use rules.js', () => {
  const { game }=setup();
  game.chooseLot(0);
  assert.equal(game.canPlaceFurniture('chair',0,0,4),false);
  assert.equal(game.canPlaceFurniture('chair',0,0,.5),false);
  assert.equal(game.canPlaceFurniture('chair',0,0,0),true);
  assert.equal(game.canPlaceFurniture('chair',0,3.4,0),false);
  assert.equal(game.canPlaceFurniture('chair',-4.5,0,0),false);
  assert.equal(game.canPlaceFurniture('chair',-2.75,-2.25,0),false);
});
