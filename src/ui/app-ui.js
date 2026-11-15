import { FURNITURE, LOTS, unusedFurniture } from '../rules.js';
import { WELCOME, CEREMONY, HOUSEWARMING } from '../story/dialogue.js';

const escapeHtml = text => String(text).replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const button = (label, action, primary = false, disabled = false) =>
  `<button class="button ${primary ? 'primary' : ''}" data-action="${escapeHtml(action)}" ${disabled ? 'disabled' : ''}>${escapeHtml(label)}</button>`;

export class AppUI {
  constructor(root, game, decorating, actions) {
    this.root = root;
    this.game = game;
    this.decorating = decorating;
    this.actions = actions;
    this.panel = null;
    this.tab = 'furniture';
    this.axes = { x: 0, y: 0 };
    this.modal = !game.state.greeting ? 'welcome' : game.state.deed === null ? 'lots' : null;
    this.dialogue = null;
    this.toastTimer = null;
    root.innerHTML = `
      <div class="hud"><div class="brand" id="brand"></div><div class="status" id="status"></div></div>
      <nav class="toolbar" id="toolbar" aria-label="Game actions"></nav>
      <div id="panel-host"></div><div id="modal-host"></div>
      <div id="decor-host"></div><div class="hint" id="hint"></div>
      <div class="move-zone" id="move-zone" aria-label="Touch area for movement">
        <div class="joystick" id="joystick" aria-label="Floating movement joystick">
          <div class="joystick-knob" id="joystick-knob"></div>
        </div>
      </div>
      <button class="interact-touch" data-action="interact" aria-label="Interact">TALK<br>✦</button>
      <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>`;
    root.addEventListener('click', event => {
      const control = event.target.closest('button[data-action]');
      if (!control || control.disabled) return;
      this._act(control.dataset.action);
    });
    this._bindJoystick();
    this.unsubscribeGame = game.subscribe(() => this.render());
    this.unsubscribeDecor = decorating.subscribe(() => this.render());
    this.render();
  }
  _bindJoystick() {
    const zone=this.root.querySelector('#move-zone');
    const base=this.root.querySelector('#joystick');
    const knob=this.root.querySelector('#joystick-knob');
    let activePointer=null;
    const reset=()=>{
      this.axes={x:0,y:0};
      knob.style.left='50%';
      knob.style.top='50%';
      zone.classList.remove('active');
    };
    const update=event=>{
      const bounds=base.getBoundingClientRect();
      const radius=bounds.width/2;
      const max=radius*.69;
      let dx=event.clientX-(bounds.left+radius);
      let dy=event.clientY-(bounds.top+radius);
      const length=Math.hypot(dx,dy);
      if(length>max){dx*=max/length;dy*=max/length;}
      this.axes={x:dx/max,y:dy/max};
      knob.style.left='calc(50% + '+dx+'px)';
      knob.style.top='calc(50% + '+dy+'px)';
    };
    zone.addEventListener('pointerdown',event=>{
      event.preventDefault();
      if(activePointer!==null)return;
      activePointer=event.pointerId;
      zone.setPointerCapture(event.pointerId);
      const bounds=zone.getBoundingClientRect();
      const half=base.offsetWidth/2;
      const x=Math.min(bounds.width-half,Math.max(half,event.clientX-bounds.left));
      const y=Math.min(bounds.height-half,Math.max(half,event.clientY-bounds.top));
      base.style.left=x+'px';
      base.style.top=y+'px';
      zone.classList.add('active');
      update(event);
    });
    zone.addEventListener('pointermove',event=>{
      if(activePointer===event.pointerId)update(event);
    });
    const release=event=>{
      if(activePointer!==event.pointerId)return;
      activePointer=null;
      reset();
    };
    zone.addEventListener('pointerup',release);
    zone.addEventListener('pointercancel',release);
    zone.addEventListener('lostpointercapture',release);
    window.addEventListener('blur',reset);
  }
  _act(action) {
    if (action === 'interact') { this.actions.interact(); return; }
    if (action === 'leave') { this.actions.leave(); return; }
    if (action === 'close' || action === 'dismiss') {
      this.modal = null;
      this.panel = null;
      this.render();
      return;
    }
    if (action === 'help') { this.modal = 'help'; this.render(); return; }
    if (action === 'welcome') { this.game.welcome(); this.modal = 'lots'; this.render(); return; }
    if (action === 'lots') { this.modal = 'lots'; this.render(); return; }
    if (action.startsWith('lot:')) {
      const result = this.game.chooseLot(Number(action.slice(4)));
      if (!result.ok) this.toast(result.reason);
      else { this.modal = 'ceremony'; this.render(); }
      return;
    }
    if (action === 'celebrate') {
      const result = this.game.celebrateHousewarming();
      if (!result.ok) this.toast(result.reason);
      this.modal = null; this.render(); return;
    }
    if (action === 'inventory' || action === 'decorate' || action === 'shop') {
      this.panel = this.panel === action ? null : action;
      this.modal = null;
      this.render();
      return;
    }
    if (action.startsWith('tab:')) { this.tab = action.slice(4); this.render(); return; }
    if (action.startsWith('buy:')) {
      const result = this.game.buyFurniture(action.slice(4));
      this.toast(result.ok ? 'Wrapped up with care! Added to your belongings.' : result.reason);
      return;
    }
    if (action.startsWith('place:')) {
      if (this.game.state.scene !== 'home') { this.toast('Visit your cottage to decorate.'); return; }
      if (!this.decorating.selectFromInventory(action.slice(6))) {
        this.toast('That item is already placed.');
        return;
      }
      this.panel = 'decorate'; this.render();
      this.toast('Tap a place on the floor, then choose Place.');
      return;
    }
    if (action.startsWith('move:')) {
      if (this.decorating.selectPlaced(action.slice(5))) {
        this.panel = 'decorate';
        this.toast('Tap a new spot, then choose Place.');
      }
      return;
    }
    if (action === 'rotate') { this.decorating.rotate(); return; }
    if (action === 'confirm') {
      const result = this.decorating.confirm();
      this.toast(result.ok ? 'Just right! Your cottage has been updated.' : result.reason);
      return;
    }
    if (action === 'store') {
      const result = this.decorating.store();
      this.toast(result.ok ? 'Safely stored in your belongings.' : result.reason);
      return;
    }
    if (action === 'cancel') { this.decorating.cancel(); return; }
  }
  toast(message) {
    const el = this.root.querySelector('#toast');
    el.textContent = message;
    el.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
  }
  showWelcome() { this.modal = 'welcome'; this.render(); }
  showLots() { this.modal = 'lots'; this.render(); }
  openShop() { this.panel = 'shop'; this.modal = null; this.render(); }
  showDialogue(speaker, line) {
    this.dialogue = { speaker, line };
    this.modal = 'dialogue';
    this.render();
  }
  showHousewarming() {
    if (!this.game.state.story.housewarming && this.game.state.story.homeVisits > 0) {
      this.modal = 'housewarming';
      this.render();
    }
  }
  get blocksMovement() { return this.modal !== null; }
  get isDecorating() { return this.game.state.scene === 'home' && this.decorating.state.mode !== null; }
  dismiss() {
    if (this.modal) this.modal = null;
    else if (this.decorating.state.mode) this.decorating.cancel();
    else this.panel = null;
    this.render();
  }
  _window(title, content) {
    return `<section class="window" aria-label="${escapeHtml(title)}"><header><h2>${escapeHtml(title)}</h2>${button('✕', 'close')}</header>${content}</section>`;
  }
  _itemCard(type, info, context, state) {
    const owned = state.inventory[type] ?? 0;
    const spare = unusedFurniture(state, type);
    const useButton = context === 'shop'
      ? button(`Buy · ${info.price} ✿`, `buy:${type}`, false, state.petals < info.price)
      : context === 'home' ? button('Place', `place:${type}`, false, spare === 0) : '';
    const countText = context === 'shop' ? `Owned: ${owned}` : `In storage: ${spare} / ${owned}`;
    return `<article class="item">
      <span class="icon-art">${info.emoji}</span>
      <strong>${escapeHtml(info.name)}</strong>
      <p>${escapeHtml(info.description)}</p>
      <small>${escapeHtml(info.category)} · ${countText}</small>
      <div>${useButton}</div>
    </article>`;
  }
  _panel(state, decorating) {
    if (this.panel === 'shop') {
      return this._window('Little Oak Furnishings', `<p class="muted">Bruno picks every piece for a cozy new beginning. Your purse has <b>${state.petals} petals</b>.</p>
        <div class="inventory-grid">${Object.entries(FURNITURE).map(([type, info]) => this._itemCard(type, info, 'shop', state)).join('')}</div>`);
    }
    if (this.panel === 'inventory') {
      let contents = '';
      if (this.tab === 'furniture') {
        contents = `<div class="inventory-grid">${Object.entries(FURNITURE).filter(([type]) => (state.inventory[type] ?? 0) > 0)
          .map(([type, info]) => this._itemCard(type, info, state.scene === 'home' ? 'home' : 'view', state)).join('')}</div>`;
      } else {
        const entries = Object.entries(this.tab === 'keepsakes' ? state.gifts : state.supplies);
        contents = entries.length ? `<div class="scroll-list">${entries.map(([name, count]) =>
          `<div class="item"><span>🎀</span><strong>${escapeHtml(name)}</strong><small>×${count}</small></div>`).join('')}</div>`
          : '<p class="muted">New treasures will appear here as your story grows.</p>';
      }
      return this._window('Your Satchel', `
        <div class="tabs">${['furniture', 'keepsakes', 'supplies'].map(name =>
          `<button data-action="tab:${name}" class="${name === this.tab ? 'active' : ''}">${escapeHtml(name[0].toUpperCase() + name.slice(1))}</button>`).join('')}</div>
        ${contents}`);
    }
    if (this.panel === 'decorate') {
      const active = decorating.mode ? `<p class="muted">✦ ${decorating.mode === 'move' ? 'Moving' : 'Placing'} ${escapeHtml(FURNITURE[decorating.type]?.name ?? '')}. ${decorating.candidate ? (decorating.candidate.valid ? 'This spot is lovely!' : 'Try another spot.') : 'Tap the floor to preview.'}</p>` : '';
      return this._window('Make It Yours', `
        <p class="muted">Choose furniture from your satchel or tap a piece already in the room to move it. Snap to the floor grid and rotate in quarter turns.</p>
        ${active}
        <h3>Furniture in storage</h3>
        <div class="scroll-list">${Object.entries(FURNITURE).filter(([type]) => unusedFurniture(state, type) > 0).map(([type, info]) =>
          `<div class="item"><span>${info.emoji}</span><strong>${escapeHtml(info.name)} ×${unusedFurniture(state, type)}</strong>${button('Place', `place:${type}`)}</div>`).join('') || '<p class="muted">Everything you own is currently placed.</p>'}</div>
        <h3>Inside your cottage</h3>
        <div class="scroll-list">${state.placements.map(p =>
          `<div class="item"><span>${FURNITURE[p.type]?.emoji ?? '🪑'}</span><strong>${escapeHtml(FURNITURE[p.type]?.name ?? p.type)}</strong>${button('Move', `move:${p.id}`)}</div>`).join('')}</div>`);
    }
    return '';
  }
  _dialog(state) {
    if (!this.modal) return '';
    let speaker = '', title = '', body = '', footer = '', extra = '';
    if (this.modal === 'welcome') {
      ({ speaker, title, body } = WELCOME);
      footer = button('Meet the Mayor ✦', 'welcome', true);
    } else if (this.modal === 'lots') {
      speaker = 'Village Property Ledger';
      title = 'Choose a place to call home';
      body = 'Mayor Thistle has reserved three charming cottages. Your choice will be written on your deed and cannot be changed later.';
      extra = `<div class="lot-grid">${LOTS.map((lot, index) =>
        `<button class="lot-card" data-action="lot:${index}"><span class="roof" style="--roof:#${lot.roof.toString(16).padStart(6, '0')}"></span><span><b>${escapeHtml(lot.name)}</b><small>${escapeHtml(lot.note)}</small></span></button>`).join('')}</div>`;
      footer = button('Look around first', 'dismiss');
    } else if (this.modal === 'ceremony') {
      ({ speaker, title, body } = CEREMONY);
      const lot = LOTS[state.deed];
      extra = `<div class="deed-paper">CLOVER HOLLOW · OFFICIAL PROPERTY DEED<strong>${escapeHtml(lot.name)}</strong><small>Registered in the Village Ledger</small></div>`;
      footer = button('Begin Your New Life ✦', 'dismiss', true);
    } else if (this.modal === 'housewarming') {
      ({ speaker, title, body } = HOUSEWARMING);
      footer = button('Celebrate Together ♥', 'celebrate', true);
    } else if (this.modal === 'dialogue') {
      speaker = this.dialogue?.speaker ?? 'Neighbor';
      title = 'A little conversation';
      body = this.dialogue?.line ?? 'Hello!';
      footer = button('Lovely to see you!', 'dismiss', true);
    } else if (this.modal === 'help') {
      speaker = 'Field Guide';
      title = 'A cozy guide to Clover Hollow';
      body = 'WASD or arrow keys: walk. E or Space: interact. I: open your satchel. Escape: close menus. On touch screens, drag the joystick and tap Talk. Visit the mayor to claim a cottage, Little Oak to buy furniture, and your front door to enter. Inside, tap Decorate or select furniture to move, rotate, and store it.';
      footer = button('Got it', 'dismiss', true);
    }
    return `<div class="backdrop"><article class="dialog" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="eyebrow">${escapeHtml(speaker)}</div><h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(body)}</p>${extra}<footer>${footer}</footer></article></div>`;
  }
  render() {
    const state = this.game.state;
    const decor = this.decorating.state;
    const home = state.scene === 'home';
    const lot = state.deed === null ? 'A home awaits' : LOTS[state.deed].name;
    this.root.querySelector('#brand').innerHTML = '<strong>✿ Clover Hollow</strong><small>A little place to belong</small>';
    this.root.querySelector('#status').innerHTML = `✿ ${state.petals} petals<small>${escapeHtml(lot)}</small>`;
    const actions = home
      ? [['Satchel', 'inventory'], ['Decorate', 'decorate'], ['Leave Cottage', 'leave']]
      : [['Talk / Enter', 'interact'], ['Satchel', 'inventory']];
    actions.push(['? Help', 'help']);
    this.root.querySelector('#toolbar').innerHTML = actions.map(([label, action]) =>
      `<button data-action="${action}" class="${this.panel === action ? 'active' : ''}">${escapeHtml(label)}</button>`).join('');
    this.root.querySelector('#hint').textContent = home
      ? decor.mode ? 'Tap to preview · Rotate · Place' : 'Drag to look · Pinch to zoom · Decorate'
      : state.deed === null ? 'Find Mayor Thistle for your cottage deed.' : 'Explore the village · Drag to look around';
    const touchAction=this.root.querySelector('.interact-touch');
    touchAction.dataset.action=home?'leave':'interact';
    touchAction.innerHTML=home?'LEAVE<span aria-hidden="true">⌂</span>':'TALK<span aria-hidden="true">✦</span>';
    this.root.querySelector('#panel-host').innerHTML = this._panel(state, decor);
    this.root.querySelector('#modal-host').innerHTML = this._dialog(state);
    this.root.querySelector('#decor-host').innerHTML = home && decor.mode
      ? `<div class="decor-actions">
        <button data-action="rotate">↻ Rotate</button>
        <button data-action="confirm" class="primary" ${!decor.candidate?.valid ? 'disabled' : ''}>✓ Place</button>
        ${decor.mode === 'move' ? '<button data-action="store">⇥ Store</button>' : ''}
        <button data-action="cancel">✕ Cancel</button></div>`
      : '';
  }
}
