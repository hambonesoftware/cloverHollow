import * as THREE from 'three';
import { roundedBox, fairyMaterial } from '../../visual/gfx.js';

/** Twenty-eight silhouette-distinct, deterministic, small-town prop models. */
export const PROP_TYPES=Object.freeze([
 'market-stall','produce-crate','bread-basket','flower-bucket','shop-counter',
 'display-shelf','shopping-basket','garden-bench','cafe-table','cafe-chair',
 'delivery-wagon','postal-cart','mailbox','parcel-stack','wooden-barrel',
 'hanging-sign','decorative-clock','stone-planter','notice-board','shop-banner',
 'window-merchandise','dress-mannequin','street-lantern','wooden-railing',
 'fountain','awning-support','toolbox','book-display','flower-trellis','chimney-pot'
]);
const cache=new Map();
function material(c){if(!cache.has(c))cache.set(c,fairyMaterial(c));return cache.get(c);}
function box(g,w,h,d,c,x=0,y=0,z=0){
 const m=new THREE.Mesh(roundedBox(w,h,d,Math.min(.08,w*.2,h*.2,d*.2),2),material(c));
 m.position.set(x,y,z);m.castShadow=false;g.add(m);return m;
}
function ball(g,r,c,x,y,z,sx=1,sy=1,sz=1){
 const m=new THREE.Mesh(new THREE.SphereGeometry(r,10,7),material(c));
 m.position.set(x,y,z);m.scale.set(sx,sy,sz);g.add(m);return m;
}
function cylinder(g,r,h,c,x,y,z,segments=12){
 const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r*.88,h,segments),material(c));
 m.position.set(x,y,z);g.add(m);return m;
}
function ring(g,r,t,c,x,y,z){
 const m=new THREE.Mesh(new THREE.TorusGeometry(r,t,6,16),material(c));
 m.position.set(x,y,z);g.add(m);return m;
}
function seeded(s){let x=2166136261;for(const c of String(s))x=Math.imul(x^c.charCodeAt(0),16777619);return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};}
const wood=0x987256,cream=0xf4dfba,metal=0x756c66,leaf=0x78a57e;
function basket(g,x=0,z=0){const b=cylinder(g,.38,.32,0xb88d61,x,.3,z,10);b.scale.z=.7;ring(g,.36,.045,wood,x,.5,z);ring(g,.32,.05,wood,x,.77,z);}
function flowers(g,x,z,rng,n=6){for(let i=0;i<n;i++){const a=i*2.399,r=.12+.20*rng();box(g,.025,.36,.025,leaf,x+Math.cos(a)*r,.62,z+Math.sin(a)*r);ball(g,.105,[0xf3a9b8,0xf7d48d,0xc5a8df][i%3],x+Math.cos(a)*r,.85+rng()*.1,z+Math.sin(a)*r);}}
function wheel(g,x,z){const m=cylinder(g,.29,.10,wood,x,.29,z,12);m.rotation.z=Math.PI/2;ring(g,.24,.04,metal,x+.07,.29,z);}
export function createDowntownProp(type,{seed=1,quality='medium'}={}){
 if(!PROP_TYPES.includes(type))throw new RangeError('Unknown downtown prop '+type);
 const rng=seeded(type+':'+seed),g=new THREE.Group();g.name='Downtown prop: '+type;
 const fine=quality!=='low';
 switch(type){
 case 'market-stall':box(g,2.5,.16,1.5,wood,0,1.1,0);for(const x of [-1.1,1.1])box(g,.10,2.3,.1,wood,x,1.2,-.6);for(let i=0;i<6;i++)box(g,.42,.12,1.85,i%2?cream:0xc77f86,-1.04+i*.42,2.38,0);break;
 case 'produce-crate':box(g,.9,.1,.75,wood,0,.1,0);for(const x of [-.4,.4])box(g,.08,.5,.75,wood,x,.3,0);for(let i=0;i<8;i++)ball(g,.13,i%2?0xd5b95e:0xb85f53,(i%4-1.5)*.18,.38,Math.floor(i/4)*.3-.15);break;
 case 'bread-basket':basket(g);for(let i=0;i<4;i++)ball(g,.2,0xd6a66b,(i-1.5)*.16,.61,0,1,.55,.7);break;
 case 'flower-bucket':cylinder(g,.31,.65,0x899ba0,0,.35,0);flowers(g,0,0,rng,8);break;
 case 'shop-counter':box(g,1.8,.18,.8,cream,0,1.05,0);for(const x of [-.8,.8])box(g,.12,.95,.75,wood,x,.52,0);box(g,1.7,.32,.12,wood,0,.78,.35);break;
 case 'display-shelf':for(let j=0;j<3;j++)box(g,1.65,.1,.48,wood,0,.45+j*.55,0);for(const x of [-.72,.72])box(g,.1,1.65,.5,wood,x,.85,0);break;
 case 'shopping-basket':basket(g);break;
 case 'garden-bench':box(g,1.8,.13,.55,wood,0,.75,0);box(g,1.8,.65,.12,wood,0,1.03,-.24);for(const x of [-.72,.72])box(g,.1,.72,.1,metal,x,.37,0);break;
 case 'cafe-table':cylinder(g,.08,.9,metal,0,.45,0);cylinder(g,.66,.1,cream,0,.95,0);cylinder(g,.35,.08,metal,0,.08,0);break;
 case 'cafe-chair':box(g,.65,.1,.6,wood,0,.55,0);box(g,.65,.8,.1,wood,0,.97,-.25);for(const x of [-.24,.24])for(const z of [-.22,.22])box(g,.06,.55,.06,metal,x,.28,z);break;
 case 'delivery-wagon':box(g,2.1,.22,1.05,wood,0,.8,0);for(const x of [-.8,.8])for(const z of [-.5,.5])wheel(g,x,z);box(g,.15,.15,1.2,wood,0,.75,1.05);break;
 case 'postal-cart':box(g,1.25,.12,.8,wood,0,.78,0);for(const x of [-.5,.5])wheel(g,x,.4);box(g,.08,1.0,.08,metal,-.6,1.15,-.4);box(g,.08,1.0,.08,metal,.6,1.15,-.4);break;
 case 'mailbox':cylinder(g,.07,1.2,metal,0,.6,0);box(g,.76,.67,.46,0xa75b65,0,1.35,0);ball(g,.37,0xa75b65,0,1.65,0,1,.55,.7);box(g,.48,.035,.06,cream,0,1.44,.27);break;
 case 'parcel-stack':for(let i=0;i<4;i++){const x=(i%2-.5)*.5;box(g,.55,.35,.5,0xcba77b,x,.19+Math.floor(i/2)*.36,0);box(g,.05,.36,.52,cream,x,.19+Math.floor(i/2)*.36,0);}break;
 case 'wooden-barrel':cylinder(g,.42,.95,wood,0,.49,0);for(const y of [.17,.79])ring(g,.39,.05,metal,0,y,0).rotation.x=Math.PI/2;break;
 case 'hanging-sign':box(g,.12,1.4,.12,wood,-.65,1.8,0);box(g,1.3,.1,.1,wood,0,2.4,0);box(g,1.0,.65,.1,cream,.05,1.8,0);break;
 case 'decorative-clock':cylinder(g,.7,.13,wood,0,1.0,0).rotation.x=Math.PI/2;ring(g,.64,.08,cream,0,1, .1);box(g,.07,.4,.06,metal,0,1.12,.18);box(g,.3,.07,.06,metal,.1,1,.18);break;
 case 'stone-planter':box(g,1.2,.55,.75,0xc5b8a6,0,.29,0);flowers(g,0,0,rng);break;
 case 'notice-board':for(const x of [-.7,.7])box(g,.1,1.6,.1,wood,x,.8,0);box(g,1.65,1.0,.12,wood,0,1.45,0);for(let i=0;i<3;i++)box(g,.4,.56,.025,[cream,0xe7a6b6,0xa6c7bf][i],-.52+i*.52,1.45,.09);break;
 case 'shop-banner':box(g,.07,2.4,.07,wood,0,1.2,0);box(g,1.2,.09,.09,wood,.55,2.25,0);box(g,.9,1.15,.07,0xb87d91,.65,1.56,0);break;
 case 'window-merchandise':box(g,1.6,.12,.48,wood,0,.4,0);for(let i=0;i<4;i++)ball(g,.17,[0xd6a56e,0xb3b7cc,0xc8a27b][i%3],(i-1.5)*.38,.61,0,1,.75,.7);break;
 case 'dress-mannequin':cylinder(g,.06,.85,metal,0,.48,0);ball(g,.18,cream,0,1.83,0);ball(g,.44,0xc48fa5,0,1.23,0,.7,1,.55);break;
 case 'street-lantern':cylinder(g,.08,2.5,metal,0,1.25,0);box(g,.58,.7,.58,cream,0,2.75,0);box(g,.75,.12,.75,wood,0,3.16,0);break;
 case 'wooden-railing':for(const x of [-.8,0,.8])box(g,.12,1.15,.12,wood,x,.58,0);box(g,1.8,.12,.14,wood,0,1.1,0);break;
 case 'fountain':cylinder(g,1.1,.32,0xbcb5a5,0,.16,0,20);cylinder(g,.85,.04,0x7cb4c2,0,.35,0,20);cylinder(g,.12,1.3,0xbcb5a5,0,.88,0);ball(g,.35,0xa5d2df,0,1.65,0);break;
 case 'awning-support':for(const x of [-.9,.9])box(g,.07,2.1,.07,wood,x,1.05,0);box(g,2.1,.1,1.0,0xd49b9c,0,2.18,-.25);break;
 case 'toolbox':box(g,.9,.5,.5,0x9c6753,0,.35,0);ring(g,.25,.045,metal,0,.73,0);for(let i=0;i<3;i++)box(g,.08,.7,.08,metal,(i-1)*.22,.9,0);break;
 case 'book-display':box(g,1.3,.12,.55,wood,0,.35,0);for(let i=0;i<8;i++)box(g,.12,.4+rng()*.3,.35,[0xa66d7b,0x7d9a8b,0xd7b17e][i%3],-.53+i*.15,.65,0);break;
 case 'flower-trellis':for(const x of [-.6,.6])box(g,.08,2.6,.08,wood,x,1.3,0);for(let i=0;i<5;i++)box(g,1.3,.07,.08,wood,0,.5+i*.46,0);flowers(g,-.4,0,rng);flowers(g,.4,0,rng);break;
 case 'chimney-pot':cylinder(g,.32,.9,0xb88775,0,.45,0);ring(g,.32,.09,0xc7a58b,0,.88,0).rotation.x=Math.PI/2;break;
 }
 if(fine&&['bread-basket','produce-crate','flower-bucket','stone-planter'].includes(type))ball(g,.07,0xf8d99a,.2,.9,.1);
 g.userData={propType:type,seed:String(seed)};return g;
}
export function getDowntownPropTypes(){return PROP_TYPES;}
