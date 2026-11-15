import * as THREE from 'three';
import {roundedBox,fairyMaterial} from '../visual/gfx.js';
import {OCCUPATIONS} from '../occupations/index.js';
const cache=new Map();
function mat(c){if(!cache.has(c))cache.set(c,fairyMaterial(c));return cache.get(c);}
function piece(group,w,h,d,color,x,y,z){const o=new THREE.Mesh(roundedBox(w,h,d,.06,2),mat(color));o.position.set(x,y,z);o.castShadow=true;group.add(o);return o;}
/** Outfit geometry is parented to rig bones; props are constructed once per character. */
export function equipOccupation(character,occupation='resident'){
 const rig=character.userData.rig;if(!rig)return character;
 const existing=character.userData.outfit;if(existing?.occupation===occupation)return character;
 if(existing)for(const node of existing.nodes)node.parent?.remove(node);
 const config=OCCUPATIONS[occupation]||OCCUPATIONS.resident,nodes=[];
 const apron=new THREE.Group();rig.body.add(apron);nodes.push(apron);
 piece(apron,.58,.56,.12,config.color,0,.79,.36);
 if(['mayor','postmaster','mail-carrier','baker','librarian','musician'].includes(occupation)){
  const hat=new THREE.Group();rig.head.add(hat);nodes.push(hat);
  piece(hat,.73,.16,.7,config.color,0,.66,0);
  if(occupation==='baker')piece(hat,.59,.35,.56,0xfff3db,0,.88,0);
 }
 if(['carpenter','maintenance','gardener'].includes(occupation)){
  const belt=new THREE.Group();rig.body.add(belt);nodes.push(belt);
  piece(belt,.77,.15,.65,0x795b46,0,.53,0);
  piece(belt,.23,.28,.18,0xc49b67,.31,.46,.25);
 }
 const props=new Map();
 for(const type of ['ledger','letter-stack','mailbag','pastry-tray','hammer','flower-basket','parcel','book','teacup','broom','lute','mask','watering-can']){
  const node=new THREE.Group();rig.sockets.rightHand.add(node);node.position.set(0,-.47,.16);
  const long=['broom','lute','hammer','watering-can'].includes(type);
  piece(node,long?.13:.31,long?.73:.23,.23,type==='flower-basket'?0xa97d55:type==='mailbag'?0x936b52:0xd3b184,0,-.12,.08);
  node.visible=false;nodes.push(node);props.set(type,node);
 }
 character.userData.outfit={occupation,nodes,props};
 return character;
}
export function setHeldProp(character,type=null){
 const outfit=character.userData.outfit;if(!outfit)return;
 for(const [key,node] of outfit.props)node.visible=key===type;
}
