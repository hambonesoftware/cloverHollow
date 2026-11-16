import * as THREE from 'three';
import {makePerson,updateCharacterAnimation} from '../art.js';

export const MOONRING_REWARD='Moonring ribbon';
export const MOONRING_BOOTH=Object.freeze({x:40,z:-105});
export const MOONRING_OFFSETS=Object.freeze([-1.45,0,1.45]);
export const MOONRING_SEQUENCE=Object.freeze([1,2,0,1,2]);
const clamp=(v,a=-1,b=1)=>Math.max(a,Math.min(b,v));
const distance=(x,z)=>Math.hypot(x-MOONRING_BOOTH.x,z-(MOONRING_BOOTH.z+1.4));

/**
 * Physics-inspired ring toss controls; the player is aiming a visible ring,
 * not choosing an answer from a dialog. No inventory cost or grinding.
 */
export function createMoonringRules(){
  let mode='idle',round=0,score=0,aim=0,flight=0,landing=0;
  let event=null;
  const outcomes=[];
  function currentTarget(){return MOONRING_SEQUENCE[Math.min(round,MOONRING_SEQUENCE.length-1)];}
  function state(){return {mode,active:mode==='aiming'||mode==='flying',
    round,rounds:5,score,aim,flight,landing,target:currentTarget(),
    outcomes:[...outcomes]};}
  function start(){
    mode='aiming';round=0;score=0;aim=0;flight=0;landing=0;
    event={kind:'start',text:'Moonring Toss! Drag to aim, then release. Land three rings to win the ribbon.'};
    outcomes.length=0;return state();
  }
  function setAim(value){
    if(mode!=='aiming')return false;
    aim=clamp(Number.isFinite(value)?value:0);
    return true;
  }
  function throwRing(){
    if(mode!=='aiming')return false;
    flight=0;landing=aim*1.85;mode='flying';return true;
  }
  function tick(dt){
    if(mode!=='flying')return;
    flight+=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.12))/1.02;
    if(flight<1)return;
    flight=1;
    const target=MOONRING_OFFSETS[currentTarget()];
    const hit=Math.abs(landing-target)<=.51;
    outcomes.push({round,target,landing,hit});
    if(hit)score++;
    round++;
    if(round>=5){
      mode='finished';
      event={kind:'finish',
        text:score>=3?`Lovely throw! ${score} rings landed. The Moonring ribbon is yours!`:
          `${score} of 5 landed. The festival is always happy to let you try again.`,
        reward:score>=3?MOONRING_REWARD:null};
    }else{
      mode='aiming';aim=0;
      event={kind:hit?'hit':'miss',text:hit?'A perfect little ring!':'So close! Try the glowing peg again.'};
    }
  }
  function takeEvent(){const next=event;event=null;return next;}
  function cancel(){mode='idle';event=null;}
  function prompt(x,z){
    if(mode==='aiming'||mode==='flying'){
      return {title:`Moonring Toss · ${Math.min(round+1,5)} / 5`,
        subtitle:`Score ${score} · aim for the glowing peg · swipe to throw`,
        action:mode==='aiming'?'interact':null,target:'toss',progress:score};
    }
    if(mode==='idle'&&distance(x,z)<4){
      return {title:'Try Moonring Toss',subtitle:'A real 3D carnival game · no ticket required',
        action:'interact',target:'toss',progress:0};
    }
    if(mode==='finished'&&distance(x,z)<4){
      return {title:'Play Moonring Toss again',
        subtitle:`Your last score: ${score}/5`,action:'interact',target:'toss',progress:score};
    }
    return null;
  }
  function interact(x,z){
    if(mode==='aiming')return throwRing()?'throw':null;
    if(mode==='flying')return null;
    if(distance(x,z)<4){start();return 'start';}
    return null;
  }
  return {state,start,setAim,throwRing,tick,takeEvent,cancel,prompt,interact};
}

/**
 * World-space stand, pegs and thrown ring. Scene objects are updated from
 * the immutable-looking pure game state, keeping UI and scoring independent.
 */
export function createMoonringBooth(scene,{quality='medium'}={}){
  const rules=createMoonringRules();
  const root=new THREE.Group();root.name='Playable Moonring Toss Booth';
  root.position.set(MOONRING_BOOTH.x,0,MOONRING_BOOTH.z);scene.add(root);
  const geometries=[],materials=[],textures=[];
  function mesh(geo,color,{emissive=0}={}){
    const material=new THREE.MeshStandardMaterial({
      color,metalness:.02,roughness:.68,emissive,emissiveIntensity:.45
    });
    const m=new THREE.Mesh(geo,material);geometries.push(geo);materials.push(material);
    return m;
  }
  function box(w,h,d,c,x,y,z){
    const m=mesh(new THREE.BoxGeometry(w,h,d),c);m.position.set(x,y,z);root.add(m);return m;
  }
  function sphere(r,c,x,y,z,sx=1,sy=1,sz=1,glow=0){
    const m=mesh(new THREE.SphereGeometry(r,12,8),c,{emissive:glow});
    m.position.set(x,y,z);m.scale.set(sx,sy,sz);root.add(m);return m;
  }
  box(5.4,.18,3.3,0x97785c,0,.25,0);
  box(4.85,.16,3.0,0xc3a47d,0,.42,0);
  for(const x of [-2.35,2.35]){
    box(.13,2.9,.12,0x8f7054,x,1.78,-1.2);
    sphere(.24,0xffd093,x,3.27,-1.2,1,1,1,0xffa661);
  }
  for(let i=0;i<7;i++){
    const flag=box(.52,.12,1.85,i%2?0xf9e1b9:0xd89ab0,-2.07+i*.69,3.23,-1.10);
    flag.rotation.x=-.11;
  }
  // A recognizable pavilion sign, readable even through the default camera.
  if(typeof document!=='undefined'){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
    const context=canvas.getContext('2d');
    if(context){
      context.fillStyle='#ffebc1';context.beginPath();
      context.roundRect(4,6,504,116,27);context.fill();
      context.strokeStyle='#a7796c';context.lineWidth=9;context.stroke();
      context.textAlign='center';context.textBaseline='middle';
      context.font='bold 47px Trebuchet MS, sans-serif';
      context.fillStyle='#6d5773';context.fillText('MOONRING TOSS',256,64,472);
      const texture=new THREE.CanvasTexture(canvas);
      texture.colorSpace=THREE.SRGBColorSpace;textures.push(texture);
      const banner=new THREE.Sprite(new THREE.SpriteMaterial({
        map:texture,transparent:true,depthWrite:false
      }));
      banner.position.set(0,4.07,-1.1);banner.scale.set(4.5,1.13,1);root.add(banner);
    }
  }
  const host=makePerson('mouse',{shirt:0x9c7cb0,trousers:0x8e7765});
  host.name='Moonring festival host';
  host.position.set(-3.05,0,1.04);host.rotation.y=.45;root.add(host);
  const pegs=[];
  for(let i=0;i<3;i++){
    const x=MOONRING_OFFSETS[i];
    box(.52,.15,.52,0x826c57,x,.53,-.75);
    const peg=mesh(new THREE.CylinderGeometry(.13,.18,1.05,12),0xf9dfab);
    peg.position.set(x,1.10,-.75);root.add(peg);
    const light=sphere(.18,0xffebb7,x,1.75,-.75,1,1,1,0xffbc64);
    pegs.push({peg,light});
  }
  const starting=sphere(.55,0x6f9989,0,.52,1.08,1,.16,.60);
  const cursor=sphere(.18,0xffdba1,0,1.25,1.08,1,.52,1,0xffbe6b);
  const ring=mesh(new THREE.TorusGeometry(.40,.092,8,22),0xf4cf77);
  ring.rotation.x=Math.PI/2;ring.position.set(0,1.55,1.05);root.add(ring);
  const outcomeRings=Array.from({length:5},()=>{
    const m=mesh(new THREE.TorusGeometry(.40,.084,7,22),0xd9b86c);
    m.rotation.x=Math.PI/2;root.add(m);return m;
  });
  // Nonblocking little flowerpots frame the booth on both sides.
  for(const side of [-1,1]){
    box(.55,.46,.55,0x9f8266,side*3,.29,-.9);
    for(let k=0;k<3;k++){
      const p=sphere(.25,k%2?0xe2a2b0:0xf5d19c,side*3+(k-1)*.19,.69,-.9,.75,1,.7);
      p.rotation.z=.25*(k-1);
    }
  }
  let elapsed=0;
  function update(dt){
    elapsed+=Math.max(0,Math.min(.1,dt));
    rules.tick(dt);
    const state=rules.state();
    root.visible=true;
    updateCharacterAnimation(host,Math.max(0,Math.min(.08,dt)),{
      velocity:{x:0,z:0},talking:state.active
    });
    const arms=host.userData?.rig?.arms;
    if(arms?.[0]&&state.mode==='finished')
      arms[0].rotation.z+=Math.sin(elapsed*6)*.21;
    pegs.forEach(({light},i)=>{
      const chosen=i===state.target;
      light.visible=chosen||state.mode==='idle';
      light.scale.setScalar(chosen?1+.17*Math.sin(elapsed*5):.48);
    });
    const aiming=state.mode==='aiming';
    cursor.visible=aiming;
    cursor.position.x=state.aim*1.85;
    cursor.position.y=1.36+Math.sin(elapsed*3)*.14;
    ring.visible=aiming||state.mode==='flying';
    if(aiming){
      ring.position.set(state.aim*.40,1.12,1.1);
      ring.rotation.set(Math.PI/2,0,Math.sin(elapsed*3)*.08);
    }else if(state.mode==='flying'){
      const t=state.flight;
      ring.position.set(state.landing*t,1.05+Math.sin(Math.PI*t)*2.0,1.1-1.85*t);
      ring.rotation.set(Math.PI/2+Math.sin(t*Math.PI)*.18,t*5,0);
    }
    for(let i=0;i<outcomeRings.length;i++){
      const item=state.outcomes[i],model=outcomeRings[i];
      model.visible=Boolean(item);
      if(item){
        model.position.set(item.landing,.92+i*.025,-.75);
        model.rotation.x=Math.PI/2;
      }
    }
  }
  update(0);
  function pick(ray){
    const objects=[starting,...pegs.map(p=>p.peg),...pegs.map(p=>p.light),ring];
    return ray.intersectObjects(objects,false).length>0;
  }
  return {
    root,rules,update,pick,
    prompt:(x,z)=>rules.prompt(x,z),
    interact:(x,z)=>rules.interact(x,z),
    inspect:()=>rules.state(),
    dispose(){scene.remove(root);geometries.forEach(g=>g.dispose());
      materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}
  };
}
