// Optional procedural ambience. No asset downloads, autoplay or external audio.
// AudioContext is created only after the player explicitly enables sound.
const clamp=v=>Math.max(0,Math.min(1,v));
const near=(x,z,px,pz,r)=>clamp(1-Math.hypot(x-px,z-pz)/r);
export function sampleTownSound(x=0,z=0,seconds=0){
  const t=((Number.isFinite(seconds)?seconds:0)%1320+1320)%1320;
  const evening=clamp((t-890)/145);
  const morning=clamp((t-130)/90);
  const night=Math.max(evening,1-morning);
  return {
    market:Math.max(near(x,z,-32,-88,49),near(x,z,0,4,45))*(1-night*.70),
    brook:near(x,z,56,20,44),
    birds:(1-night)*(.48+near(x,z,-55,47,58)*.52),
    crickets:night*(.34+near(x,z,32,-104,64)*.45),
    night
  };
}
export function createTownSoundscape(root=typeof window==='undefined'?null:window){
  let context=null,master=null,marketGain=null,waterGain=null;
  let enabled=false,elapsed=0,lastBell=-1;
  const voices=[];
  function makeNoise(gain,frequency,filterType='lowpass'){
    const length=Math.floor(context.sampleRate*1.8);
    const buffer=context.createBuffer(1,length,context.sampleRate);
    const data=buffer.getChannelData(0);
    // Stable pseudo-random sequence avoids allocating noise every frame.
    let seed=1367;
    for(let i=0;i<length;i++){
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      data[i]=(seed/2147483648-1);
    }
    const src=context.createBufferSource();src.buffer=buffer;src.loop=true;
    const filter=context.createBiquadFilter();filter.type=filterType;filter.frequency.value=frequency;
    const volume=context.createGain();volume.gain.value=0;
    src.connect(filter).connect(volume).connect(master);src.start();
    voices.push(src);
    return volume;
  }
  function init(){
    if(context)return true;
    const Audio=root?.AudioContext||root?.webkitAudioContext;
    if(!Audio)return false;
    context=new Audio();
    master=context.createGain();master.gain.value=.45;master.connect(context.destination);
    marketGain=makeNoise(.01,460,'bandpass');
    waterGain=makeNoise(.01,340,'lowpass');
    return true;
  }
  function chirp(freq=940,length=.13,level=.017){
    if(!enabled||!context||context.state!=='running')return;
    const at=context.currentTime;
    const osc=context.createOscillator(),gain=context.createGain();
    osc.type='sine';
    osc.frequency.setValueAtTime(freq,at);
    osc.frequency.exponentialRampToValueAtTime(freq*1.3,at+length*.5);
    osc.frequency.exponentialRampToValueAtTime(freq*.88,at+length);
    gain.gain.setValueAtTime(.0001,at);
    gain.gain.exponentialRampToValueAtTime(Math.max(.0002,level),at+.018);
    gain.gain.exponentialRampToValueAtTime(.0001,at+length);
    osc.connect(gain).connect(master);osc.start(at);osc.stop(at+length+.02);
    osc.onended=()=>{osc.disconnect();gain.disconnect();};
  }
  function toggle(on){
    if(!on){
      enabled=false;
      if(context?.state==='running')context.suspend().catch(()=>{});
      return false;
    }
    try{
      if(!init())return false;
      enabled=true;
      // Called in the click handler; resume on the actual user gesture.
      context.resume().catch(()=>{enabled=false;});
      return true;
    }catch{enabled=false;return false;}
  }
  function update(dt,position,daySeconds,outdoors=true){
    if(!enabled||!context)return;
    const x=position?.x??0,z=position?.z??0,mix=sampleTownSound(x,z,daySeconds);
    const t=context.currentTime;
    marketGain.gain.setTargetAtTime(outdoors ? .012*mix.market : 0,t,.4);
    waterGain.gain.setTargetAtTime(outdoors ? .018*mix.brook : 0,t,.4);
    if(!outdoors||context.state!=='running')return;
    elapsed+=Math.max(0,Math.min(.1,dt));
    // Occasional quiet birdsong and evening insects. No runaway timers.
    if(elapsed>12){
      elapsed=0;
      const chance=mix.crickets>mix.birds?mix.crickets:mix.birds;
      if(chance>.12){
        const freq=mix.crickets>mix.birds?1420:860;
        chirp(freq,.13,.008+.012*chance);
        if(mix.birds>.5)chirp(freq*1.18,.085,.008*chance);
      }
    }
    const bell=Math.floor(daySeconds/330);
    if(lastBell<0)lastBell=bell;
    if(bell!==lastBell){
      lastBell=bell;
      if(mix.market>.18){
        chirp(520,.9,.028);
        chirp(780,.7,.012);
      }
    }
  }
  return {toggle,update,get enabled(){return enabled;},dispose(){
    enabled=false;
    for(const source of voices)try{source.stop();}catch{}
    voices.length=0;
    context?.close().catch(()=>{});
  }};
}
