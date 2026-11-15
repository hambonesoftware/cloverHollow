// Pure, immutable, persistence-free entertainment activities.
export const ACTIVITY_DEFINITIONS=Object.freeze({
  'ring-toss':Object.freeze({label:'Moonring Toss',rounds:5,threshold:3,reward:'Moonring ribbon'}),
  'firefly-rhythm':Object.freeze({label:'Firefly Rhythm',rounds:6,threshold:4,reward:'Firefly melody pin'}),
  'theater-encore':Object.freeze({label:'Moonbeam Encore',rounds:3,threshold:2,reward:'Moonbeam playbill'})
});
export function startActivity(kind,{seed=1}={}){
  const def=ACTIVITY_DEFINITIONS[kind];
  if(!def)throw new RangeError('Unknown entertainment activity: '+kind);
  return {kind,status:'active',round:0,score:0,seed:seed>>>0,history:[],reward:null};
}
export function activityPrompt(state){
  if(state.status!=='active')return null;
  const index=state.round;
  if(state.kind==='ring-toss')return {type:'aim',target:((state.seed+index*7)%5)/4,hint:'Aim for the glowing wooden peg'};
  if(state.kind==='firefly-rhythm')return {type:'beat',target:((state.seed+index*3)%4)/3,hint:'Tap when the firefly reaches the glowing note'};
  return {type:'choice',target:(state.seed+index)%3,hint:'Choose the next gesture for the play'};
}
export function advanceActivity(state,input){
  if(state.status!=='active')return state;
  const prompt=activityPrompt(state),def=ACTIVITY_DEFINITIONS[state.kind];
  const value=typeof input==='number'?input:Number(input?.value);
  const hit=Number.isFinite(value)&&(prompt.type==='choice'?Math.round(value)===prompt.target:Math.abs(value-prompt.target)<=.19);
  const round=state.round+1,score=state.score+(hit?1:0);
  const complete=round>=def.rounds;
  return {...state,round,score,history:[...state.history,{target:prompt.target,value,hit}],status:complete?'complete':'active',reward:complete&&score>=def.threshold?def.reward:null};
}
export function completeActivity(state){
  if(state.status!=='active')return state;
  const def=ACTIVITY_DEFINITIONS[state.kind];
  return {...state,status:'complete',reward:state.score>=def.threshold?def.reward:null};
}
export function cancelActivity(state){return state.status==='active'?{...state,status:'cancelled',reward:null}:state;}
export function restartActivity(state){return startActivity(state.kind,{seed:state.seed});}
