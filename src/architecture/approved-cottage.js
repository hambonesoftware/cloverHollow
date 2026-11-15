import * as THREE from 'three';
import { roundedBox } from '../visual/gfx.js';

/**
 * Directly adapted from the approved in-chat "Fairy Cottage Workshop" Three.js
 * Swoop + Moonspire prototype. Keep the distinctive sweepHeight silhouette,
 * individual-colored shingle rows, arched door, rounded windows and details.
 *
 * Clover Hollow adapters:
 * - The dimensions come from the existing lot/building footprint.
 * - Front is always +Z; origin is the existing building center.
 * - All geometry is decorative; collision and deed metadata remain external.
 * - Repeated shingles use a single InstancedMesh per roof for mobile rendering.
 *
 * Do not replace this with a generic two-slab gabled roof. This is the
 * user-approved source of truth for the cottage's visual proportions.
 */
const mats=new Map();
function material(color,{glow=0,metalness=0}={}){
  const k=[color,glow,metalness].join('/');
  if(!mats.has(k))mats.set(k,new THREE.MeshStandardMaterial({
    color,roughness:glow?.6:.84,metalness,
    emissive:glow?color:0,emissiveIntensity:glow,side:THREE.DoubleSide
  }));
  return mats.get(k);
}
function mesh(root,geometry,color,x=0,y=0,z=0){
  const model=new THREE.Mesh(geometry,typeof color==='number'?material(color):color);
  model.position.set(x,y,z);
  model.castShadow=true;
  model.receiveShadow=true;
  root.add(model);
  return model;
}
function box(root,w,h,d,color,x=0,y=0,z=0,r=.09){
  return mesh(root,roundedBox(w,h,d,Math.min(r,w*.45,h*.45,d*.45),2),color,x,y,z);
}
function sphere(root,r,color,x=0,y=0,z=0,sx=1,sy=1,sz=1){
  const model=mesh(root,new THREE.SphereGeometry(r,12,9),color,x,y,z);
  model.scale.set(sx,sy,sz);
  model.castShadow=false;
  return model;
}
function cylinder(root,a,b,h,color,x=0,y=0,z=0,segments=12){
  return mesh(root,new THREE.CylinderGeometry(a,b,h,segments),color,x,y,z);
}
function tube(root,points,r,color){
  const curve=new THREE.CatmullRomCurve3(points.map(([x,y,z])=>new THREE.Vector3(x,y,z)));
  return mesh(root,new THREE.TubeGeometry(curve,Math.max(12,points.length*3),r,6,false),color);
}
function roofTint(p,random){
  return new THREE.Color(p.palette.roof).lerp(
    new THREE.Color(0xffe5d6),.08+.31*random()
  );
}

/**
 * Exact profile function from the in-chat prototype, parameterized solely
 * for the existing building dimensions and facade height.
 */
export function approvedSwoopHeight(x,z,width,rise,baseHeight=4.02){
  const t=Math.min(1,Math.abs(x)/(width*.5));
  const main=rise*(1-Math.pow(t,.78));
  const edge=-.28*Math.pow(t,12);
  const wavy=.12*Math.sin(z*.9+x*.38)*t*t;
  return baseHeight+main+edge+wavy;
}
function roofParameters(p){
  const roofOverhang=.37+p.roofOverhang*.76;
  const width=p.w+2*roofOverhang;
  const depth=p.d+2*roofOverhang;
  const rise=3.18*p.roofCurvature;
  const base=p.wallHeight+.54;
  return {width,depth,rise,base,roofOverhang};
}
function roofGeometry(root,p,random){
  const P=p.palette,params=roofParameters(p);
  const {width,depth,rise,base}=params;
  const y=(x,z)=>approvedSwoopHeight(x,z,width,rise,base);
  const nx=42,nz=22,vertices=[],indices=[];
  for(let i=0;i<=nx;i++){
    const x=-width/2+width*i/nx;
    for(let j=0;j<=nz;j++){
      const z=-depth/2+depth*j/nz;
      vertices.push(x,y(x,z),z);
    }
  }
  for(let i=0;i<nx;i++)for(let j=0;j<nz;j++){
    const a=i*(nz+1)+j,b=(i+1)*(nz+1)+j;
    indices.push(a,b,a+1,b,b+1,a+1);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const roof=mesh(root,geo,P.roof);
  roof.name='Approved fairy swoop • continuous curved roof';
  roof.userData.approvedPrototype='sweepHeight';

  // Real extruded facade follows the sweep roof's underside, not a box.
  const shape=new THREE.Shape();
  const half=p.w/2;
  shape.moveTo(-half,.20);
  shape.lineTo(half,.20);
  for(let i=0;i<=48;i++){
    const x=half-i*p.w/48;
    // The shell reaches the roof underside at the front and rear.
    shape.lineTo(x,Math.min(y(x,p.d/2),y(x,-p.d/2))-.09);
  }
  shape.closePath();
  const walls=new THREE.ExtrudeGeometry(shape,{
    depth:p.d,bevelEnabled:false,steps:1,curveSegments:12
  });
  const body=mesh(root,walls,P.wall,0,0,-p.d/2);
  body.name='Roof-following cottage shell';

  // Slightly wonky trim follows the actual three-dimensional curved eaves.
  for(const z of [-depth/2,depth/2]){
    const points=[];
    for(let i=0;i<=30;i++){
      const x=-width/2+width*i/30;
      points.push([x,y(x,z)+.045,z]);
    }
    tube(root,points,.078,P.trim);
  }
  for(const x of [-width/2,width/2]){
    const points=[];
    for(let i=0;i<=14;i++){
      const z=-depth/2+depth*i/14;
      points.push([x,y(x,z)+.025,z]);
    }
    tube(root,points,.10,P.trim);
  }
  tube(root,[
    [0,y(0,-depth/2)+.06,-depth/2],
    [0,y(0,-depth*.25)+.06,-depth*.25],
    [0,y(0,0)+.06,0],
    [0,y(0,depth*.25)+.06,depth*.25],
    [0,y(0,depth/2)+.06,depth/2]
  ],.063,P.trim);

  // These tile positions and rotations preserve the original shingle method.
  // A single batch replaces hundreds of separate mobile draw calls.
  const rows=10,columns=Math.max(9,Math.round(depth/.65));
  const halfSpan=width/2-.40;
  const tileGeometry=roundedBox(halfSpan/rows*.92,.065,depth/columns*.91,.025,2);
  const tiles=new THREE.InstancedMesh(tileGeometry,material(0xffffff),rows*columns*2);
  const dummy=new THREE.Object3D();
  for(const side of [-1,1]){
    for(let row=0;row<rows;row++){
      for(let col=0;col<columns;col++){
        const index=(side===-1?0:rows*columns)+row*columns+col;
        const x=side*(.25+(row+.5)*(halfSpan-.25)/rows);
        const z=-depth/2+(col+.5+(row%2)*.26)*depth/columns;
        const slope=(y(x+.03,z)-y(x-.03,z))/.06;
        dummy.position.set(x,y(x,z)+.078,z);
        dummy.rotation.set(0,0,Math.atan(slope));
        dummy.scale.set(.94+random()*.14,1,.94+random()*.12);
        dummy.updateMatrix();
        tiles.setMatrixAt(index,dummy.matrix);
        tiles.setColorAt(index,roofTint(p,random));
      }
    }
  }
  tiles.name='Approved fairy roof • colored curved shingles';
  tiles.instanceMatrix.needsUpdate=true;
  tiles.instanceColor.needsUpdate=true;
  tiles.castShadow=false;
  tiles.receiveShadow=true;
  root.add(tiles);
  return {y,...params};
}
function flowerBoxes(group,x,y,z,p,random){
  const P=p.palette;
  box(group,1.65,.19,.42,P.timber,x,y-.86,z+.23,.05);
  box(group,1.48,.27,.32,P.stone,x,y-.97,z+.25,.045);
  for(let i=-2;i<=2;i++){
    const ox=x+i*.28;
    sphere(group,.15,P.foliage,ox,y-.80,z+.3,1.1,.62,.82);
    sphere(group,.14,i%2?0xf2b0be:0xf7d6a1,ox,y-.69+random()*.06,z+.32,.9,.78,1);
  }
}
/** Rounded window rings, cross-paned turquoise glass, and warm shutters. */
function roundWindow(group,x,y,z,p,random,r=.57){
  const P=p.palette;
  sphere(group,r*1.22,P.trim,x,y,z,1,1,.20);
  sphere(group,r,0x9bcbd1,x,y,z+.11,1,1,.22);
  box(group,.075,r*1.96,.08,P.trim,x,y,z+.25,.02);
  box(group,r*1.97,.075,.09,P.trim,x,y,z+.26,.02);
  box(group,r*2.6,.14,.41,P.timber,x,y-r-.09,z+.22,.04);
  for(const side of [-1,1]){
    box(group,.21,r*2.10,.13,P.timber,
      x+side*(r+.16),y,z+.15,.045);
    for(const dy of [-.28,.28]){
      box(group,.18,.032,.14,P.trim,
        x+side*(r+.16),y+dy,z+.24,.01);
    }
  }
  flowerBoxes(group,x,y,z,p,random);
}
/** Exact arched/beveled door profile from the approved first workshop. */
function archedDoor(group,z,p){
  const P=p.palette;
  const outer=new THREE.Shape();
  outer.moveTo(-.92,.30);
  outer.lineTo(.92,.30);
  outer.lineTo(.92,2.34);
  outer.bezierCurveTo(.92,3.45,-.92,3.45,-.92,2.34);
  outer.closePath();
  const doorShape=new THREE.Shape();
  doorShape.moveTo(-.74,.31);
  doorShape.lineTo(.74,.31);
  doorShape.lineTo(.74,2.32);
  doorShape.bezierCurveTo(.74,3.20,-.74,3.20,-.74,2.32);
  doorShape.closePath();
  const geometryOptions={
    depth:.14,bevelEnabled:true,bevelThickness:.035,
    bevelSize:.045,bevelSegments:2,steps:1,curveSegments:12
  };
  const arch=mesh(group,new THREE.ExtrudeGeometry(outer,geometryOptions),
    P.trim,0,0,z+.09);
  arch.name='Approved cottage arched doorway';
  mesh(group,new THREE.ExtrudeGeometry(doorShape,{
    ...geometryOptions,depth:.16,bevelThickness:.025,bevelSize:.026
  }),0x8da99a,0,0,z+.23);
  for(const height of [1.0,1.79,2.30]){
    box(group,1.13,.08,.055,P.timber,0,height,z+.47,.018);
  }
  sphere(group,.10,0xf4d89c,.53,1.44,z+.47);
  box(group,2.24,.18,.78,P.stone,0,.12,z+.39,.045);
  // Little wreath-shaped flowered arch.
  for(let i=0;i<9;i++){
    const a=.11*Math.PI+(.78*Math.PI*i/8);
    sphere(group,.075,i%2?0xedb1c1:0xf2d298,
      Math.cos(a)*1.04,
      2.36+Math.sin(a)*.49,z+.23);
  }
}
function addFacade(group,p,random){
  const P=p.palette;
  const z=p.d/2+.10;
  // Timbers slightly inset from corners avoid rectangular-looking edges.
  for(const side of [-1,1]){
    const x=side*(p.w/2-.18);
    box(group,.20,p.wallHeight-.15,.19,P.timber,x,
      .28+(p.wallHeight-.15)/2,z,.05).rotation.z=side*.025;
    box(group,.25,.15,1.10,P.timber,x,
      p.wallHeight-.4,z-.25,.04).rotation.z=side*.19;
  }
  box(group,p.w-.35,.16,.16,P.timber,0,.73,z+.04,.04);
  for(let i=0;i<Math.max(10,Math.round(p.w*1.8));i++){
    const x=-p.w/2+.27+(i+.5)*(p.w-.54)/Math.max(10,Math.round(p.w*1.8));
    if(Math.abs(x)<1.18)continue;
    const stone=box(group,(p.w-.54)/Math.max(10,Math.round(p.w*1.8))*.85,
      .23,.09,i%3?P.stone:0xc6a994,x,.38,z+.05,.035);
    stone.rotation.z=(random()-.5)*.06;
  }
  roundWindow(group,-p.w*.31,2.48,z+.02,p,random,.49);
  roundWindow(group,p.w*.31,2.48,z+.02,p,random,.49);
  archedDoor(group,z,p);
  // Gable oculus reads particularly well with the cottage's sweeping roof.
  const roof=roofParameters(p);
  const topY=approvedSwoopHeight(0,p.d/2,roof.width,roof.rise,roof.base);
  roundWindow(group,0,p.wallHeight+.78,z+.05,p,random,.35);
  // Flowering ivy on the left and lanterns on both sides of the front door.
  tube(group,[
    [-p.w/2+.22,.53,z+.15],
    [-p.w/2+.10,1.39,z+.19],
    [-p.w/2+.36,2.38,z+.15],
    [-p.w/2+.19,Math.min(topY-.2,3.35),z+.09]
  ],.039,P.foliage);
  for(let i=0;i<9;i++){
    const t=i/8;
    const x=-p.w/2+.22+.09*Math.sin(t*7);
    sphere(group,.14,P.foliage,x,.66+t*2.9,z+.18,1.2,.55,.65);
    if(i%2===0)sphere(group,.10,0xeeabc3,x+.13,.71+t*2.9,z+.25);
  }
  for(const side of [-1,1]){
    const x=side*Math.min(p.w*.405,p.w/2-.35);
    tube(group,[[x,3.1,z+.12],[x,2.85,z+.12]],.030,P.timber);
    sphere(group,.22,0xffdfaa,x,2.72,z+.19,.74,1,.70);
    box(group,.40,.08,.37,P.timber,x,2.95,z+.15,.03);
    box(group,.28,.07,.28,P.timber,x,2.48,z+.15,.03);
  }
}
function addCrookedChimney(group,p,roof){
  const P=p.palette;
  const x=p.w*.27,z=-p.d*.29;
  const base=roof.y(x,z);
  for(let i=0;i<4;i++){
    const part=box(group,.75,.50,.74,
      i%2?0xb88b7e:0xcda38c,x+i*.065,base+.22+i*.45,z,.075);
    part.rotation.z=i*.028;
  }
  box(group,1.0,.19,.97,P.timber,x+.22,base+2.08,z,.06);
  for(let i=0;i<3;i++){
    sphere(group,.22,0xf9f0df,
      x+.25+i*.13,base+2.48+i*.32,z-.04-i*.08,
      1.17,.68,1.0);
  }
}
/** Curled tower is fused through the main wall and roof volume. */
function addMoonspire(group,p){
  const P=p.palette;
  const tx=-p.w*.30,tz=-p.d*.16;
  const wallBase=p.wallHeight+1.15;
  const wallHeight=2.25;
  cylinder(group,1.13,1.22,wallHeight,P.wall,
    tx,wallBase,tz,16);
  for(const a of [-1,1]){
    box(group,.10,1.28,.10,P.timber,tx+a*.88,wallBase,tz+.12,.025);
  }
  const rings=16,segments=28,vertices=[],indices=[];
  const start=wallBase+.72;
  for(let i=0;i<=rings;i++){
    const t=i/rings;
    const radius=1.55*Math.pow(1-t,1.02)+.025;
    const drift=.72*t*t;
    for(let j=0;j<=segments;j++){
      const a=j*Math.PI*2/segments;
      vertices.push(tx+drift+Math.cos(a)*radius,
        start+t*4.1,tz-.23*t+Math.sin(a)*radius);
    }
  }
  for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){
    const a=i*(segments+1)+j,b=(i+1)*(segments+1)+j;
    indices.push(a,b,a+1,b,b+1,a+1);
  }
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  const spire=mesh(group,geo,P.roof);
  spire.name='Approved prototype • crooked Moonspire';
  sphere(group,.20,0xffdfa0,tx+.72,start+4.1,tz-.23,1,1.25,1);
  const ring=mesh(group,new THREE.TorusGeometry(.35,.075,8,22),
    P.trim,tx,wallBase+.5,tz+1.22);
  ring.rotation.z=Math.PI/2;
  sphere(group,.22,0xffe6b3,tx,wallBase+.5,tz+1.26);
}

/**
 * Port of the approved cottage exterior from the in-chat prototype.
 * Standalone meshes remain compatible with createFairyBuilding and town.js.
 */
export function buildApprovedCottage(group,p,random,{moonspire=false}={}){
  const roof=roofGeometry(group,p,random);
  addFacade(group,p,random);
  if(moonspire)addMoonspire(group,p);
  else addCrookedChimney(group,p,roof);
  group.userData.approvedSource='Fairy Cottage Workshop / sweepHeight';
  group.userData.roofRise=roof.rise;
  group.userData.roofPalette=p.palette.roof;
  return group;
}
