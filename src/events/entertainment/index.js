// Game day is 22 real minutes. All times below are game-day seconds (0..1320).
export const DAY_SECONDS=22*60;
export const SHOWS=Object.freeze([
  {id:'moonbeam-matinee',siteKind:'theater',label:'Moonbeam Matinee',start:360,duration:140},
  {id:'firefly-concert',siteKind:'music',label:'Firefly Concert',start:780,duration:180},
  {id:'lantern-celebration',siteKind:'festival',label:'Lantern Lighting',start:1020,duration:200}
]);
export function getEntertainmentEvents(daySeconds,day=0){
  const t=((daySeconds%DAY_SECONDS)+DAY_SECONDS)%DAY_SECONDS;
  return SHOWS.map(show=>{
    const offset=(day%3)*35,begin=(show.start+offset)%DAY_SECONDS;
    const elapsed=(t-begin+DAY_SECONDS)%DAY_SECONDS;
    const active=elapsed<show.duration;
    return {...show,begin,active,remaining:active?show.duration-elapsed:0,theme:['fireflies','moonflowers','starlight'][((day%3)+3)%3]};
  });
}
export function eveningFactor(daySeconds){
  const t=((daySeconds%DAY_SECONDS)+DAY_SECONDS)%DAY_SECONDS;
  const smooth=v=>{v=Math.max(0,Math.min(1,v));return v*v*(3-2*v);};
  return smooth((t-780)/210)*(1-smooth((t-1260)/60));
}
export function attendancePoints(site,event,count=7){
  const out=[],n=Math.max(0,Math.min(30,count));
  for(let i=0;i<n;i++){
    const col=i%4,row=Math.floor(i/4);
    out.push({siteId:site.id,eventId:event.id,x:site.x+(col-1.5)*Math.min(1.15,site.w/5),z:site.z+Math.min(site.d*.24,1.5)+row*.75});
  }
  return out;
}
