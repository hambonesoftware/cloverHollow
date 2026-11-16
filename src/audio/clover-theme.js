/**
 * Clover Hollow's original eight-beat miniature theme.
 *
 * This score is written for this game, not sampled or adapted from another
 * soundtrack. It changes instrumentation by neighborhood and hour, but always
 * shares a recognizable melodic signature. Playback is optional and opt-in.
 */
const notes=Object.freeze([0,2,4,7,5,4,2,null,3,5,7,9,7,4,2,null]);
const intervals=Object.freeze([0,2,4,5,7,9,11,12,14,16,17,19]);
const clamp=value=>Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
export function sampleCloverTheme(step,{night=0,market=0,brook=0,birds=0}={}){
  if(!Number.isInteger(step)||step<0)return null;
  const note=notes[step%notes.length];
  if(note===null)return null;
  const phase=step%notes.length;
  // F major, a quietly rising motif with an answering lower phrase.
  const semitone=intervals[note]??note;
  const warm=clamp(market),dark=clamp(night),water=clamp(brook);
  const octave=dark>0.6?-12:0;
  const base=261.626*Math.pow(2,(semitone+octave)/12);
  return Object.freeze({
    frequency:Number(base.toFixed(3)),
    duration:phase%4===3?.78:.50,
    type:dark>.5?'sine':warm>.26?'triangle':'sine',
    level:(dark>.5?.014:.020)*(water>.5?.82:1),
    // Quiet answering chime every fourth note in the market.
    harmony:phase%4===0&&warm>.4?Number((base*.5).toFixed(3)):null
  });
}
