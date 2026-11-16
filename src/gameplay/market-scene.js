import * as THREE from 'three';
import {makePerson,updateCharacterAnimation} from '../art.js';
import {createMarketAdventure,MARKET_STAGE} from './market-adventure.js';

/**
 * One authored playable vignette, mounted in the real outdoor Three.js world.
 * Keeps its rules pure and its meshes independent of buildings and collision.
 * No invisible interaction overlays or full-screen menus are required.
 */
export function createPlayableMarket(scene,{player,quality='medium',gifts={}}={}){
  const adventure=createMarketAdventure({gifts});
  const root=new THREE.Group();root.name='Playable Market - Apple Cart Rescue';
  scene.add(root);
  const mats=new Map(),geometries=new Map(),textures=[];
  function mat(color,metalness=0,roughness=.83){
    const key=`${color}:${metalness}:${roughness}`;
    if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,metalness,roughness}));
    return mats.get(key);
  }
  function geom(key,create){
    if(!geometries.has(key))geometries.set(key,create());
    return geometries.get(key);
  }
  function block(g,w,h,d,c,x=0,y=0,z=0,r=0){
    const mesh=new THREE.Mesh(geom(`b:${w}:${h}:${d}`,()=>new THREE.BoxGeometry(w,h,d)),mat(c));
    mesh.position.set(x,y,z);mesh.rotation.y=r;g.add(mesh);return mesh;
  }
  function ball(g,r,c,x=0,y=0,z=0,sx=1,sy=1,sz=1){
    const mesh=new THREE.Mesh(geom(`s:${r}`,()=>new THREE.SphereGeometry(r,12,9)),mat(c));
    mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);g.add(mesh);return mesh;
  }
  function ring(g,r,t,c,x=0,y=0,z=0){
    const mesh=new THREE.Mesh(geom(`r:${r}:${t}`,()=>new THREE.TorusGeometry(r,t,6,24)),mat(c));
    mesh.position.set(x,y,z);g.add(mesh);return mesh;
  }
  function billboard(g,label,{color='#614c3c',bg='#fff0c9',scale=1}={}){
    if(typeof document==='undefined')return new THREE.Group();
    const canvas=document.createElement('canvas');
    canvas.width=512;canvas.height=128;
    const ctx=canvas.getContext('2d');
    if(!ctx)return new THREE.Group();
    ctx.fillStyle=bg;ctx.beginPath();
    ctx.roundRect(4,5,504,118,30);ctx.fill();
    ctx.strokeStyle='#976a58';ctx.lineWidth=8;ctx.stroke();
    ctx.font='bold 43px Trebuchet MS, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle=color;ctx.fillText(label,256,65,474);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({
      map:texture,transparent:true,depthWrite:false,depthTest:true
    }));
    sprite.scale.set(3.6*scale,.9*scale,1);g.add(sprite);return sprite;
  }
  function marker(g,color=0xffd48e){
    const halo=ring(g,.56,.08,color,0,.10,0);halo.rotation.x=Math.PI/2;
    const gem=new THREE.Group();g.add(gem);
    const shape=new THREE.Mesh(geom('gem',()=>new THREE.OctahedronGeometry(.24)),mat(color));
    gem.add(shape);gem.position.y=2.05;
    return {halo,gem};
  }
  function apple(parent,x=0,y=0,z=0){
    const group=new THREE.Group();group.position.set(x,y,z);parent.add(group);
    ball(group,.34,0xd85c55,0,.36,0,1,.93,.95);
    ball(group,.24,0xe98263,-.07,.46,.12,.45,.36,.4);
    block(group,.075,.23,.07,0x80634d,.05,.75,0,-.28);
    const leaf=ball(group,.15,0x74ad75,.21,.76,0,.95,.3,.57);leaf.rotation.z=.45;
    return group;
  }
  function board(g,position,label){
    const plaque=billboard(g,label,{scale:.9});plaque.position.set(0,3.35,0);
    g.position.set(position.x,0,position.z);
  }
  const cart=new THREE.Group();cart.name='Apple cart';root.add(cart);
  const cp=MARKET_STAGE.cart;cart.position.set(cp.x,0,cp.z);
  // Three readable silhouette layers: wheels, cart body and striped sunshade.
  block(cart,2.45,.19,1.32,0x967152,0,.92,0);
  block(cart,2.5,.42,.11,0xb1865e,0,1.22,-.61);
  for(const x of [-1.14,1.14])block(cart,.13,.45,1.25,0x916b51,x,1.16,0);
  const wheelGeo=geom('wheel',()=>new THREE.CylinderGeometry(.4,.4,.15,16));
  for(const x of [-.9,.9]){
    const w=new THREE.Mesh(wheelGeo,mat(0x6b5846));w.rotation.z=Math.PI/2;
    w.position.set(x,.49,.62);cart.add(w);
    ball(cart,.12,0xd8bb91,x+.09,.49,.62);
  }
  for(const x of [-1.06,1.06]){
    block(cart,.10,2.48,.11,0x8b6b50,x,1.85,-.57);
    block(cart,.10,2.48,.11,0x8b6b50,x,1.85,.57);
  }
  for(let i=0;i<6;i++)block(cart,.42,.15,1.65,i%2?0xf8e2b2:0xd58f86,
    -1.02+i*.41,3.06,-.02);
  const cartCaption=billboard(cart,'TILLY\'S APPLES',{scale:1.03});
  cartCaption.position.set(0,3.95,0);
  const cartMark=marker(cart,0xffd28e);
  // A small fox courier visibly waves as the player approaches.
  const courier=makePerson('fox',{shirt:0x8ba3ad,trousers:0x9b795d});
  courier.name='Tilly the courier';courier.position.set(cp.x+2.15,0,cp.z-.55);
  courier.rotation.y=-.8;root.add(courier);
  const basketRoot=new THREE.Group();basketRoot.name='Delivery basket';
  basketRoot.position.set(MARKET_STAGE.basket.x,0,MARKET_STAGE.basket.z);root.add(basketRoot);
  block(basketRoot,1.23,.40,.91,0x9a7654,0,.31,0);
  block(basketRoot,1.35,.12,1.02,0xc69b6c,0,.58,0);
  const basketSign=billboard(basketRoot,'APPLE BASKET',{scale:.72});basketSign.position.y=2.25;
  const basketMark=marker(basketRoot,0xffd38c);
  const appleGroups=MARKET_STAGE.apples.map((p,i)=>{
    const group=new THREE.Group();group.name='Catchable apple '+(i+1);
    root.add(group);apple(group,0,0,0);return group;
  });
  const appleMarks=MARKET_STAGE.apples.map((_,i)=>{
    const markRoot=new THREE.Group();root.add(markRoot);
    const m=marker(markRoot,0xffed9a);
    return {root:markRoot,...m};
  });
  // The completion display is a *visible* consequence in the 3D street.
  const celebration=new THREE.Group();celebration.name='Market rescue celebration';
  celebration.position.set(cp.x,0,cp.z);root.add(celebration);
  for(let i=0;i<7;i++){
    const x=(i-3)*.39;
    const flag=block(celebration,.31,.53,.07,
      [0xe69d9f,0xe9cc88,0xa5c4a6][i%3],x,4.55,0);
    flag.rotation.z=i%2?.15:-.15;
  }
  const thanks=billboard(celebration,'THANK YOU, HELPER!',{bg:'#ffe4a9',scale:1.08});
  thanks.position.set(0,5.33,0);
  const secretRoot=new THREE.Group();secretRoot.name='Creekside discovery';
  secretRoot.position.set(MARKET_STAGE.secret.x,0,MARKET_STAGE.secret.z);root.add(secretRoot);
  const rock=ball(secretRoot,.75,0x9faca1,0,.28,0,1.2,.47,.82);
  rock.rotation.y=.5;
  for(let i=0;i<4;i++){
    const a=(Math.PI*2*i)/4;
    const leaf=ball(secretRoot,.24,0x64ae76,Math.cos(a)*.19,.66,Math.sin(a)*.19,.9,.34,.8);
    leaf.rotation.y=a;
  }
  ball(secretRoot,.10,0xf4d78e,0,.72,0);
  const secretMark=marker(secretRoot,0xd9f3a5);
  const raycastGroups=new Map([
    ['cart',cart],['basket',basketRoot],['secret',secretRoot],
    ...appleGroups.map((group,i)=>['apple-'+i,group])
  ]);
  function pick(ray){
    const candidates=adventure.targets().map(t=>({id:t.id,group:raycastGroups.get(t.id)})).filter(t=>t.group?.visible);
    let best=null;
    for(const item of candidates){
      const hits=ray.intersectObjects([item.group],true);
      if(hits.length&&(!best||hits[0].distance<best.distance)){
        best={id:item.id,distance:hits[0].distance};
      }
    }
    return best?.id??null;
  }
  let elapsed=0;
  function update(dt=0){
    const step=Math.max(0,Math.min(dt,.1));
    elapsed+=step;adventure.tick(step);
    const state=adventure.state();
    const active=state.phase==='started';
    const nearby=player?Math.hypot(player.position.x-cp.x,player.position.z-cp.z)<13:false;
    cartMark.gem.visible=state.phase==='idle';
    cartMark.gem.position.y=2.25+Math.sin(elapsed*2.4)*.2;
    cartMark.gem.rotation.y+=step*1.2;
    cart.rotation.z=active?-.085*Math.min(1,state.elapsed/.9):0;
    const basketReady=active&&state.carrying!==null;
    basketMark.gem.visible=basketReady;
    basketMark.halo.visible=basketReady;
    basketMark.gem.position.y=1.80+Math.sin(elapsed*3)*.18;
    cartCaption.visible=state.phase!=='completed';
    celebration.visible=state.phase==='completed';
    basketSign.visible=active;
    appleGroups.forEach((g,i)=>{
      const taken=state.collected[i],carried=state.carrying===i;
      const end=MARKET_STAGE.apples[i];
      g.visible=active&&!taken;
      const mark=appleMarks[i];
      mark.root.visible=active&&!taken&&!carried;
      if(carried&&player){
        const hand=new THREE.Vector3(.53,1.05,.43);
        player.updateMatrixWorld(true);player.localToWorld(hand);
        g.position.copy(hand);
        g.rotation.set(0,elapsed*1.6,0);
      }else{
        const f=Math.min(1,state.elapsed/(1.05+i*.10));
        const eased=1-Math.pow(1-f,2);
        g.position.set(cp.x+(end.x-cp.x)*eased,
          Math.abs(Math.sin(f*Math.PI*3))*.55*(1-f)+Math.sin(elapsed*2+i)*.045,
          cp.z+(end.z-cp.z)*eased);
        g.rotation.set(0,elapsed*.6,i*2.2+f*Math.PI*2);
      }
      mark.root.position.set(g.position.x,0,g.position.z);
      mark.gem.position.y=1.26+Math.sin(elapsed*3+i)*.2;
      mark.gem.rotation.y+=step*1.9;
    });
    secretRoot.visible=!state.found;
    secretMark.gem.position.y=1.45+Math.sin(elapsed*1.9)*.16;
    secretMark.gem.rotation.y+=step*.9;
    const rig=courier.userData?.rig;
    updateCharacterAnimation(courier,step,{velocity:{x:0,z:0},talking:nearby});
    if(rig?.arms?.[0])rig.arms[0].rotation.z+=Math.sin(elapsed*3)*.27;
    courier.rotation.y=-.8+Math.sin(elapsed*.6)*.12;
  }
  update(0);
  return {
    root,adventure,update,pick,
    nearest:(x,z,options)=>adventure.nearest(x,z,options),
    prompt:(x,z)=>adventure.prompt(x,z),
    interact:(x,z,options)=>adventure.interact(x,z,options),
    inspect:()=>adventure.state(),
    dispose(){
      scene.remove(root);
      for(const g of geometries.values())g.dispose();
      for(const m of mats.values())m.dispose();
      for(const t of textures)t.dispose();
    }
  };
}
