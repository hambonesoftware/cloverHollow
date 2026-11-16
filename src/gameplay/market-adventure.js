/**
 * A small, authored, replayable-looking adventure inside the existing village.
 * Entirely deterministic and renderer-free. Completion is remembered through the
 * established keepsake inventory (no saved-game schema migration).
 */
export const APPLE_REWARD='Apple Cart Rescue Ribbon';
export const HIDDEN_REWARD='The Creekside Four-Leaf Clover';
export const MARKET_STAGE=Object.freeze({
  cart:Object.freeze({x:12,z:17}),
  basket:Object.freeze({x:6,z:17}),
  apples:Object.freeze([
    Object.freeze({x:16,z:18}),
    Object.freeze({x:14,z:23}),
    Object.freeze({x:10,z:26})
  ]),
  secret:Object.freeze({x:49,z:17})
});
const sq=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const range=(v)=>Math.max(0,Math.min(.12,Number.isFinite(v)?v:0));
const target=(id,point,range=2.6,label='',hint='')=>({id,x:point.x,z:point.z,range,label,hint});

export function createMarketAdventure({gifts={}}={}){
  let phase=(gifts?.[APPLE_REWARD]??0)>0?'completed':'idle';
  let found=(gifts?.[HIDDEN_REWARD]??0)>0;
  let elapsed=0;
  let carrying=null;
  let delivered=phase==='completed'?3:0;
  const collected=[false,false,false];
  const notices=[];
  const emit=(kind,text,reward=null)=>({kind,text,reward,phase,delivered,carrying,found});

  function activeTargets(){
    const results=[];
    if(phase==='idle'){
      results.push(target('cart',MARKET_STAGE.cart,3.25,'Help with the apple cart','Tilly has a runaway delivery!'));
    } else if(phase==='started'){
      if(carrying!==null){
        results.push(target('basket',MARKET_STAGE.basket,2.75,'Place apple in the basket',
          `Apples returned: ${delivered} / 3`));
      }else{
        for(let i=0;i<collected.length;i++){
          if(collected[i])continue;
          results.push(target('apple-'+i,MARKET_STAGE.apples[i],2.55,'Pick up runaway apple',
            `Find the apples · ${delivered} / 3 back in the basket`));
        }
      }
    } else if(phase==='completed'){
      results.push(target('cart',MARKET_STAGE.cart,2.9,'Say hello to Tilly',
        'You rescued the delivery!'));
    }
    if(!found)results.push(target('secret',MARKET_STAGE.secret,2.8,
      'Inspect the shimmering clover','A curious glimmer beside the creek'));
    return results;
  }
  function nearest(x,z,{limit=Infinity,id=null}={}){
    if(!Number.isFinite(x)||!Number.isFinite(z))return null;
    const pos={x,z};
    return activeTargets()
      .filter(t=>!id||t.id===id)
      .map(t=>({...t,distance:sq(pos,t)}))
      .filter(t=>t.distance<=limit)
      .sort((a,b)=>a.distance-b.distance)[0]??null;
  }
  function prompt(x,z){
    const near=nearest(x,z,{limit:3.4});
    if(near&&near.distance<=near.range)return {
      title:near.label,subtitle:near.hint,action:'interact',target:near.id,progress:delivered
    };
    if(sq({x,z},MARKET_STAGE.cart)<22&&phase!=='completed')return {
      title:phase==='idle'?'A delivery is in trouble!':'Help collect the runaway apples',
      subtitle:phase==='idle'?'Look for the red cart by the market stalls':
        carrying!==null?'Bring the apple to Tilly’s basket':`${delivered}/3 returned · follow the glowing apples`,
      action:null,target:null,progress:delivered
    };
    if(sq({x,z},MARKET_STAGE.secret)<11&&!found)return {
      title:'Something glimmers by the creek',
      subtitle:'Look for the clover tucked near the reeds',action:null,target:null,progress:0
    };
    return null;
  }
  function interact(x,z,{id=null}={}){
    const near=nearest(x,z,{id,limit:3.25});
    if(!near||near.distance>near.range)return null;
    if(near.id==='secret'){
      found=true;notices.push('A tiny four-leaf clover! You found a secret.');
      return emit('secret','A rare four-leaf clover! The creek remembers your discovery.',HIDDEN_REWARD);
    }
    if(near.id==='cart'&&phase==='idle'){
      phase='started';elapsed=0;
      notices.push('Oh no! Apples are rolling away!');
      return emit('start','Tilly: Oh, my apples! Could you catch all three before Pip needs them?');
    }
    if(near.id==='cart'&&phase==='completed'){
      return emit('thanks','Tilly: You saved the delivery! Pip still talks about it.');
    }
    if(near.id.startsWith('apple-')&&phase==='started'&&carrying===null){
      if(elapsed<.8)return emit('wait','The apples are still rolling!');
      const index=Number(near.id.slice(6));
      if(!Number.isInteger(index)||collected[index])return null;
      carrying=index;
      return emit('pickup','Apple caught! Carry it back to Tilly’s basket.');
    }
    if(near.id==='basket'&&carrying!==null&&phase==='started'){
      collected[carrying]=true;carrying=null;delivered++;
      if(delivered===3){
        phase='completed';
        notices.push('The whole village cheers!');
        return emit('complete','Tilly: You did it! The market saved the apple pies. Here’s a ribbon for you!',APPLE_REWARD);
      }
      return emit('deliver',`Tilly: Thank you! ${3-delivered} more apple${3-delivered===1?'':'s'} to catch.`);
    }
    return null;
  }
  function tick(dt){elapsed+=range(dt);}
  function state(){return {phase,elapsed,carrying,delivered,found,collected:[...collected],notices:[...notices]};}
  return {nearest,prompt,interact,tick,state,targets:activeTargets};
}
