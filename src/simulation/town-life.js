import { BUILDINGS, PLAZA_SOCIAL_SPOTS, PLACES } from '../world/layout.js';
import { findPedestrianRoute } from '../world/navigation.js';

/**
 * Pure town-life model. No Three.js, DOM, storage, UI or inventory dependency.
 * Residents are the established Willowbend cast, including their character voice.
 * Keeping their names stable preserves interactions provided by the game layer.
 */
const home=(id)=>BUILDINGS.find(b=>b.id===id).entrance;
export const RESIDENTS=Object.freeze([
  {id:'mayor',name:'Mayor Thistle',kind:'hedgehog',shirt:0x6d9685,home:home('mayor'),
    work:PLACES.mayor,outing:PLACES.square,
    lines:['Welcome to Clover Hollow. Every door has a story.','The village ledger is old, but there is always room for another name.','A good town is built one neighbor at a time.']},
  {id:'mabel',name:'Mabel',kind:'cat',shirt:0xc58d9f,home:home('mabel'),
    work:PLACES.market,outing:PLACES.orchard,
    lines:['I remember when the lanterns lit every lane.','Make yourself at home. I truly mean that.','Some mornings, the town smells like butter and rain.']},
  {id:'pip',name:'Pip',kind:'bunny',shirt:0xe2aa83,home:home('pip'),
    work:PLACES.bakery,outing:PLACES.orchard,
    lines:['The cinnamon buns are almost ready!','I saved you the pastry with the extra icing.','Clover says my apple tart is dangerously good.']},
  {id:'bruno',name:'Bruno',kind:'bear',shirt:0x789d89,home:home('bruno'),
    work:PLACES.furniture,outing:PLACES.woods,
    lines:['I made that table myself. Want to see the grain?','Ask for help if the furniture is heavy.','There is nothing like a properly fitted door.']},
  {id:'dot',name:'Dot',kind:'duck',shirt:0x96b4c9,home:home('dot'),
    work:PLACES.general,outing:PLACES.pond,
    lines:['The creek is full of little silver fish.','Something glimmered near the old tree last night.','Come by for tea when it rains.']},
  {id:'biscuit',name:'Biscuit',kind:'dog',shirt:0xcf9e7b,home:home('biscuit'),
    work:PLACES.general,outing:PLACES.north,
    lines:['Race you to the fountain!','I found a shiny button, but it might be a pebble.','The square is best when everybody is here.']},
  {id:'fennel',name:'Fennel',kind:'frog',shirt:0xac98bc,home:home('fennel'),
    work:PLACES.woods,outing:PLACES.pond,
    lines:['Echo Cave remembers more than it tells.','I found a stone shaped exactly like a boot.','Do you think lanterns can have memories?']},
  {id:'hazel',name:'Hazel',kind:'cat',shirt:0xb7a077,home:home('hazel'),
    work:PLACES.marketEast,outing:PLACES.orchard,
    lines:['Those bluebells would look lovely on your windowsill.','Every table needs flowers.','The market is liveliest on sunny mornings.']},
  {id:'clover',name:'Clover',kind:'bunny',shirt:0x9bb37b,home:home('clover'),
    work:PLACES.orchard,outing:PLACES.bakery,
    lines:['The orchard is finally in bloom.','Pip and I are having an apple-pie competition.','Bring a friend for cider.']},
  {id:'reed',name:'Reed',kind:'frog',shirt:0x7caaa5,home:home('reed'),
    work:PLACES.pond,outing:PLACES.creek,
    lines:['The pond is peaceful if you sit long enough.','I fixed the little footbridge this morning.','The reeds are where the frogs sing.']}
].map(row=>Object.freeze(row)));

export const DAY_LENGTH=1320;
export const ACTIVITIES=Object.freeze(['resting','walking','working','shopping','socializing','returning_home','waiting','attending_event','delivery']);

/** Time-of-day is expressed in existing Clover Hollow 22-minute day seconds. */
export function getScheduleActivity(daySeconds,ordinal=0){
  const time=((daySeconds+ordinal%4*13)%DAY_LENGTH+DAY_LENGTH)%DAY_LENGTH;
  if(time<170||time>=1190)return 'resting';
  if(time<225)return 'delivery';
  if(time<300)return 'walking';
  if(time<570)return 'working';
  if(time<735)return 'shopping';
  if(time<915)return 'socializing';
  if(time<1060)return 'attending_event';
  return 'returning_home';
}
const CLOSE=.18;
function samePosition(a,b){return !!a&&Math.hypot(a[0]-b[0],a[1]-b[1])<.01;}

function residentDestination(person,index,daySeconds,activity){
  const day=Math.floor(daySeconds/DAY_LENGTH);
  if(activity==='resting'||activity==='returning_home')return person.home;
  if(activity==='working')return person.work;
  if(activity==='delivery')return index%2?PLACES.oldTown:PLACES.merchantArcade;
  if(activity==='attending_event')return index%2?PLACES.festivalGreen:PLACES.lanternFountain;
  if(activity==='shopping'){
    const stores=[PLACES.bakery,PLACES.general,PLACES.furniture,PLACES.oldTown,PLACES.merchantArcade,PLACES.theatre];
    return stores[(day+index)%stores.length];
  }
  if(activity==='socializing')return PLAZA_SOCIAL_SPOTS[(index+day)%PLAZA_SOCIAL_SPOTS.length];
  // Two different strolls a day: work commute, then familiar scenic destinations.
  return (daySeconds%DAY_LENGTH)<500?PLAZA_SOCIAL_SPOTS[index%PLAZA_SOCIAL_SPOTS.length]:person.outing;
}
const VISITOR_DESTINATIONS=Object.freeze([
  PLACES.market,PLACES.bakery,PLACES.furniture,PLACES.plazaEast,
  PLACES.marketEast,PLACES.general,PLACES.square,PLACES.orchard,
  PLACES.oldTown,PLACES.merchantArcade,PLACES.lanternFountain,
  PLACES.festivalGreen,PLACES.theatre,PLACES.arcade,PLACES.musicHall
]);
const VISITOR_PALETTE=[0xc9a1b6,0xa9bf80,0x8caacc,0xd7ad7d,0xb4a2c5];

/**
 * createNpcSimulation(graph, { visitorCount=5 }) returns { actors, advance }.
 * Each actor exposes id, name, x, z, activity, intention, target, moving,
 * visible and route. All positions are plain numbers: the Three.js view reads
 * these fields, but the model never touches scene objects.
 */
export function createNpcSimulation(graph,{visitorCount=5}={}){
  const residents=RESIDENTS.map((data,i)=>({
    ...data,visitor:false,ordinal:i,seed:i+1,phase:i*.7,
    x:data.home[0],z:data.home[1],target:[...data.home],route:[],
    waypoint:0,moving:false,visible:true,activity:'resting',
    intention:'resting',lastGoal:null
  }));
  const visitors=Array.from({length:Math.max(0,Math.min(24,visitorCount))},(_,i)=>{
    const start=i%3===0?[-55,-9]:i%3===1?[52,-9]:[9,-60];
    return {id:`visitor-${i}`,name:`Visitor ${i+1}`,
      kind:['cat','bunny','kid','dog','bear'][i%5],shirt:VISITOR_PALETTE[i%5],
      visitor:true,ordinal:i,seed:20+i,phase:i*1.6,home:start,
      x:start[0],z:start[1],target:[...start],route:[],waypoint:0,
      moving:false,visible:false,active:false,activity:'resting',
      intention:'resting',lastGoal:null,lines:[]};
  });
  const actors=[...residents,...visitors];
  function setGoal(a,goal){
    if(samePosition(a.lastGoal,goal))return;
    a.lastGoal=[...goal];a.target=[...goal];
    const path=findPedestrianRoute(graph,[a.x,a.z],goal);
    // Route failures are explicit, not a cue to cut through a building.
    a.route=path??[];
    a.waypoint=a.route.length>1?1:0;
    a.routeError=path?null:`No pedestrian path to ${goal.join(',')}`;
  }
  function advance(dt,daySeconds){
    const step=Math.max(0,Math.min(Number.isFinite(dt)?dt:0,.12));
    const time=Number.isFinite(daySeconds)?daySeconds:0;
    for(let i=0;i<actors.length;i++){
      const a=actors[i];
      let activity,goal;
      if(a.visitor){
        const dayTime=((time%DAY_LENGTH)+DAY_LENGTH)%DAY_LENGTH;
        const active=dayTime>=190+i%4*22&&dayTime<1130-i%5*16;
        if(!active){
          a.active=false;a.visible=false;a.moving=false;a.activity='resting';
          a.lastGoal=null;continue;
        }
        if(!a.active){
          a.active=true;a.x=a.home[0];a.z=a.home[1];a.lastGoal=null;
        }
        const stop=(Math.floor(dayTime/135)+i*3)%VISITOR_DESTINATIONS.length;
        goal=VISITOR_DESTINATIONS[stop];
        activity=dayTime>=900?'attending_event':stop%4===0?'shopping':stop%4===1?'socializing':stop%4===2?'waiting':'walking';
      }else{
        activity=getScheduleActivity(time,a.ordinal);
        goal=residentDestination(a,a.ordinal,time,activity);
      }
      a.visible=true;a.intention=activity;
      setGoal(a,goal);
      let remaining=step*(a.visitor?1.55:1.7);
      a.moving=false;
      while(remaining>0&&a.waypoint<a.route.length){
        const next=a.route[a.waypoint];
        const dx=next.x-a.x,dz=next.z-a.z;
        const length=Math.hypot(dx,dz);
        if(length<CLOSE){
          a.x=next.x;a.z=next.z;a.waypoint++;continue;
        }
        const travel=Math.min(remaining,length);
        a.x+=dx/length*travel;a.z+=dz/length*travel;
        a.heading=Math.atan2(dx,dz);
        a.moving=true;remaining-=travel;
        if(travel>=length-1e-6)a.waypoint++;
      }
      if(a.waypoint>=a.route.length)a.moving=false;
      a.activity=a.moving&&activity!=='returning_home'?'walking':activity;
      // Residents rest indoors once they reach their own front door.
      if(!a.visitor&&activity==='resting'&&!a.moving&&
        Math.hypot(a.x-a.home[0],a.z-a.home[1])<.25)a.visible=false;
    }
  }
  return {actors,residents,visitors,advance};
}
