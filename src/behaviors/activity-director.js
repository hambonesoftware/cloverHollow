import {findPedestrianRoute} from '../world/navigation.js';
import {OCCUPATIONS} from '../occupations/index.js';
const length=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const phases=['resting','delivery','working','shopping','socializing','attending_event','returning_home'];
// Existing town workers have established homes and jobs. Prefer their own
// workplace over the first arbitrary matching station in a new district.
const HOME_STATIONS=Object.freeze({
  mayor:'mayor',pip:'bakery',bruno:'furniture',dot:'old-town-post',
  biscuit:'old-town-post',fennel:'old-town-library',hazel:'old-town-florist',
  clover:'orchard',reed:'creek',mabel:'general'
});
export function timePhase(daySeconds){
 const t=((daySeconds%1320)+1320)%1320;
 if(t<170||t>=1190)return 'resting';
 if(t<300)return 'delivery';
 if(t<660)return 'working';
 if(t<850)return 'shopping';
 if(t<975)return 'socializing';
 if(t<1100)return 'attending_event';
 return 'returning_home';
}
export function createActivityDirector(graph,actors){
 let stations=[],occupied=new Map(),lastSocial=new Map();
 const isRoute=(route)=>Array.isArray(route)&&route.length>0;
 function setActivityAnchors(anchors=[]){
  if(!Array.isArray(anchors))throw new TypeError('Activity anchors must be an array');
  const valid=[],ids=new Set();
  for(const a of anchors){
   if(!a||typeof a.id!=='string'||ids.has(a.id)||typeof a.siteId!=='string'||
     typeof a.role!=='string'||!Number.isFinite(a.x)||!Number.isFinite(a.z)||
     !Number.isInteger(a.capacity)||a.capacity<1||a.capacity>12||
     !Number.isFinite(a.facing??0))continue;
   ids.add(a.id);
   if(!actors.some(actor=>isRoute(findPedestrianRoute(graph,[actor.x,actor.z],[a.x,a.z]))))continue;
   valid.push({...a});
  }
  // A new district registration must not leave stale station assignments.
  for(const actor of actors){actor.stationId=null;actor.station=null;}
  stations=valid;occupied=new Map();return valid.length;
 }
 function release(actor){if(actor.stationId){occupied.get(actor.stationId)?.delete(actor.id);actor.stationId=null;}}
 function assign(actor){
  const role=OCCUPATIONS[actor.occupation]?.station;
  if(!role)return null;
  for(const station of stations){
   if(station.role!==role)continue;
   const users=occupied.get(station.id)||new Set();
   if(users.size>=station.capacity)continue;
   const route=findPedestrianRoute(graph,[actor.x,actor.z],[station.x,station.z]);
   if(!isRoute(route))continue;
   release(actor);users.add(actor.id);occupied.set(station.id,users);
   actor.stationId=station.id;actor.station=station;return station;
  }
  return null;
 }
 function update(actor,daySeconds,dt){
  const phase=timePhase(daySeconds);
  if(actor._directorPhase!==phase){release(actor);actor._directorPhase=phase;actor._socialUntil=0;}
  const occupation=OCCUPATIONS[actor.occupation]||OCCUPATIONS.resident;
  if(phase==='working'||phase==='delivery'){
   if(!actor.stationId)assign(actor);
   const s=actor.station;
   if(s&&length([actor.x,actor.z],[s.x,s.z])<.7&&!actor.moving){
    actor.pose=s.pose||occupation.pose;actor.heldProp=occupation.prop;actor.activity=s.activity||'working';
   }else{
    actor.pose=actor.moving?'walking':occupation.pose;
    actor.heldProp=actor.moving&&phase==='delivery'?occupation.prop:null;
   }
  }else{
   release(actor);actor.station=null;
   actor.pose=actor.moving?'walking':phase==='attending_event'?'applauding':phase==='socializing'?'greeting':phase==='shopping'?'browsing':'idle';
   actor.heldProp=null;
  }
  if(actor.moving){actor.pose='walking';actor.activity=actor.intention==='returning_home'?'returning_home':'walking';}
 }
 function socialize(daySeconds){
  const time=Number.isFinite(daySeconds)?daySeconds:0;
  for(let i=0;i<actors.length;i++){
   const a=actors[i];if(!a.visible||a.moving||a.activity==='resting'||a.stationId)continue;
   for(let j=i+1;j<actors.length;j++){
    const b=actors[j];if(!b.visible||b.moving||b.stationId||length([a.x,a.z],[b.x,b.z])>2.7)continue;
    const key=[a.id,b.id].join('|');
    if(time-(lastSocial.get(key)??-1000)<125)continue;
    if((Math.floor(time/11)+i*3+j*7)%9!==0)continue;
    lastSocial.set(key,time);a.pose='talking';b.pose='greeting';
    a.lookTarget={x:b.x,z:b.z};b.lookTarget={x:a.x,z:a.z};
    a.socialPartner=b.id;b.socialPartner=a.id;return;
   }
  }
 }
 return {setActivityAnchors,update,socialize,get stations(){return stations.map(s=>({...s}));},get occupancy(){return [...occupied].map(([id,users])=>({id,count:users.size}));}};
}
