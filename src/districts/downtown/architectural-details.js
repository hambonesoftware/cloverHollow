import * as THREE from 'three';
import { approvedSwoopHeight } from '../../architecture/approved-cottage.js';
import { roundedBox, fairyMaterial } from '../../visual/gfx.js';
import { createDowntownProp } from '../../props/downtown/index.js';

const materials=new Map();
const material=c=>{if(!materials.has(c))materials.set(c,fairyMaterial(c));return materials.get(c);};
function box(root,w,h,d,c,x,y,z){const o=new THREE.Mesh(roundedBox(w,h,d,.045,2),material(c));o.position.set(x,y,z);o.castShadow=false;root.add(o);return o;}
function orb(root,r,c,x,y,z,sx=1,sy=1,sz=1){const o=new THREE.Mesh(new THREE.SphereGeometry(r,12,8),material(c));o.position.set(x,y,z);o.scale.set(sx,sy,sz);root.add(o);return o;}
function addProp(root,type,x,y,z,seed,quality,scale=1){
 const p=createDowntownProp(type,{seed,quality});p.position.set(x,y,z);p.scale.setScalar(scale);root.add(p);return p;
}
const identities={
 bakery:{props:['bread-basket','bread-basket','shop-counter','delivery-wagon'],accent:0xd88f89,role:'baker',pose:'serving'},
 'post-office':{props:['mailbox','postal-cart','parcel-stack','parcel-stack'],accent:0x9b7386,role:'postal-worker',pose:'sorting-mail'},
 florist:{props:['flower-bucket','flower-bucket','flower-trellis','stone-planter'],accent:0xb38bb2,role:'florist',pose:'arranging-flowers'},
 furniture:{props:['garden-bench','cafe-chair','toolbox','display-shelf'],accent:0xa88365,role:'carpenter',pose:'working'},
 'general-goods':{props:['produce-crate','wooden-barrel','shopping-basket','display-shelf'],accent:0x8aa8a1,role:'shopkeeper',pose:'stocking-shelves'},
 cafe:{props:['cafe-table','cafe-chair','cafe-chair','notice-board'],accent:0xc6a47e,role:'barista',pose:'serving'},
 tailor:{props:['dress-mannequin','dress-mannequin','shop-banner','display-shelf'],accent:0xa69ac6,role:'tailor',pose:'arranging-display'},
 bookshop:{props:['book-display','book-display','notice-board','garden-bench'],accent:0x849cb0,role:'bookseller',pose:'stocking-shelves'},
 library:{props:['book-display','book-display','garden-bench','notice-board'],accent:0x859f99,role:'librarian',pose:'reading'},
 'town-hall':{props:['notice-board','shop-banner','garden-bench','stone-planter'],accent:0xb98f77,role:'clerk',pose:'reading-notices'},
 'mayor-office':{props:['notice-board','stone-planter','shop-banner','garden-bench'],accent:0x8ca58d,role:'clerk',pose:'reading-notices'},
 'community-center':{props:['notice-board','garden-bench','shop-banner','flower-bucket'],accent:0xd1a581,role:'host',pose:'socializing'}
};
const defaultIdentity={props:['display-shelf','stone-planter','notice-board','shopping-basket'],accent:0xa6a6a0,role:'merchant',pose:'working'};
function station(site,suffix,role,pose,x,z,activity='working',capacity=1){
 return {id:site.id+':'+suffix,siteId:site.id,role,x,z,facing:Math.PI,capacity,pose,activity};
}
/**
 * Decorative frontage outside the approved cottage's actual roof and walls.
 * Roof cornices and dormer curves use the *same exported mathematical sweep*
 * as the approved geometry; never add a second unrelated roof shell.
 */
export function decorateDowntownBuilding(group,site,kind,{seed=1,quality='medium',roofParameters}={}){
 const identity=identities[kind]||defaultIdentity;
 const front=site.d/2;
 const w=site.w;
 const q=quality==='low'?0:quality==='high'?2:1;
 const stations=[];
 const z=front+.24;
 // Three-layer commercial window bays with visible merchandise.
 for(const side of [-1,1]){
  const x=side*w*.285;
  const bayW=Math.min(2.15,w*.25);
  box(group,bayW,1.9,.13,0x806b5a,x,1.72,z+.07);
  box(group,bayW-.20,1.63,.07,0xb5d5cf,x,1.77,z+.17);
  box(group,bayW-.26,.065,.12,0xffecd2,x,1.8,z+.25);
  box(group,.07,1.63,.13,0xffecd2,x,1.76,z+.25);
  box(group,bayW+.22,.14,.43,0xb99c7e,x,.82,z+.25);
  box(group,bayW+.17,.14,.43,0xb99c7e,x,2.68,z+.25);
  // Merchandise sits inside the window and reads from the street.
  const display=addProp(group,identity.props[side<0?0:1],x,.65,z+.36,seed+':window:'+side,quality,.65);
  display.userData.shopWindow=true;
  if(q>0){
   for(const edge of [-1,1])box(group,.10,1.75,.12,0x9c785d,x+edge*bayW*.48,1.76,z+.26);
   orb(group,.14,identity.accent,x,2.65,z+.4);
  }
 }
 // Timber-and-stone base, continuous shop fascia, and asymmetrical cornice.
 box(group,w-.5,.19,.21,0xa28b77,0,.34,z);
 box(group,w-.6,.18,.30,0x926d58,0,3.02,z+.06);
 box(group,w-.5,.23,.39,identity.accent,0,3.32,z+.13);
 for(const x of [-w*.45,w*.45]){
  box(group,.18,2.6,.25,0x916d58,x,1.65,z+.14);
  if(q>0)box(group,.28,.15,.33,0xe7d6b5,x,2.94,z+.16);
 }
 // Roof-following carved cornice: same approved roof profile.
 if(roofParameters){
  const {width,rise,base}=roofParameters;
  const points=[];
  for(let i=0;i<=24;i++){
   const x=-Math.min(w*.48,width*.48)+Math.min(w*.96,width*.96)*i/24;
   points.push(new THREE.Vector3(x,approvedSwoopHeight(x,front,width,rise,base)-.12,z-.18));
  }
  const curve=new THREE.CatmullRomCurve3(points);
  const trim=new THREE.Mesh(new THREE.TubeGeometry(curve,36,.09,6,false),material(0xf5d8ad));
  trim.castShadow=false;group.add(trim);
 }
 // A readable shopfront canopy with striped cloth, hem, and timber brackets.
 if(!['town-hall','mayor-office','library'].includes(kind)){
  const count=Math.max(6,Math.round(w/.6));
  const canopyW=Math.min(w*.82,7);
  for(let i=0;i<count;i++){
   const x=-canopyW/2+(i+.5)*canopyW/count;
   box(group,canopyW/count*.99,.09,1.12,i%2?0xf8e9d1:identity.accent,x,3.16,z+.83).rotation.x=-.12;
   orb(group,.085,i%2?0xf8e9d1:identity.accent,x,3.02,z+1.43);
  }
  for(const x of [-canopyW*.49,canopyW*.49])box(group,.09,1.9,.09,0x97765c,x,2.15,z+1.36);
 }
 // Props are set to either side of the door and kept outside the navigation
 // threshold; the central entrance x=site.x remains unobstructed.
 const offsets=[-w*.39,-w*.24,w*.24,w*.39];
 const distance=site.d/2+.60;
 for(let i=0;i<4;i++){
  const type=identity.props[i];
  const scale=i===3?.72:.65;
  addProp(group,type,offsets[i],0,distance+(i%2)*.15,seed+':'+site.id+':'+i,quality,scale);
 }
 if(q>0){
  addProp(group,'hanging-sign',w*.45,0,front+.2,seed+':sign',quality,.7);
  for(const x of [-w*.44,w*.44])addProp(group,'stone-planter',x,0,front+.55,seed+':flower:'+x,quality,.65);
 }
 if(q>1){
  // Upper-floor apartment details and balconies without extra roof shells.
  for(const x of [-w*.25,w*.25]){
   box(group,1.55,.14,.65,0x947259,x,4.05,front+.42);
   for(let i=0;i<5;i++)box(group,.065,.58,.08,0x967a63,x-.65+i*.325,4.4,front+.70);
   box(group,1.55,.10,.10,0x967a63,x,4.70,front+.70);
  }
 }
 // Anchors on existing frontage sidewalks, not inside collision footprints.
 const entranceZ=Array.isArray(site.entrance)?site.entrance[1]:site.z+site.d/2+1.5;
 const approachX=Array.isArray(site.entrance)?site.entrance[0]:site.x;
 stations.push(station(site,'service',identity.role,identity.pose,approachX,entranceZ));
 const streetSide=site.facing==='south'?-1:1;
 stations.push(station(site,'delivery',kind==='post-office'?'postal-worker':'courier',
   'delivering-parcels',approachX,entranceZ+streetSide*1.1));
 return stations;
}
