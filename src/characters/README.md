# Clover Hollow living citizens v2

Branch based on shared integration SHA `9f82a3ea4b2c288a17c6d88a6332c25d1fdb4cc9`.

## Existing API compatibility

`makePerson(kind, colors)`, `animatePerson(group,time,moving,phase)`, and `updateCharacterAnimation(group,dt,state)` remain available. `createNpcSimulation(graph,{visitorCount:16})` still returns `actors,residents,visitors,advance`. The old constructor default remains 5 for compatibility with existing call sites; passing 16 is supported.

## New optional integration

```js
import {equipOccupation,setHeldProp} from './characters/outfits.js';
import {applyActorVisualState} from './characters/animation.js';
const simulation=createNpcSimulation(pedestrianGraph,{visitorCount:16});
simulation.setActivityAnchors([
  {id:'old-town-post:sorting-counter',siteId:'old-town-post',
   role:'postal-worker',x:12,z:8,facing:0,capacity:1,
   pose:'sorting-mail',activity:'working'}
]);
for(const actor of simulation.actors){
 const group=makePerson(actor.kind,{shirt:actor.shirt});
 equipOccupation(group,actor.occupation);
 // Per frame after simulation.advance(dt,daySeconds):
 group.position.set(actor.x,0,actor.z);
 setHeldProp(group,actor.heldProp);
 applyActorVisualState(group,actor,dt);
}
```

Existing `town.js` still invokes the legacy animation adapter, so advanced occupational poses and attached props require Worker 3 to adopt the optional visual bridge. This worker deliberately did not edit `town.js`. The simulation itself is wired into existing actor records and routing.

Stations are optional, validated, checked for pedestrian reachability, and capacity-limited. Without stations, residents follow their original route/schedule. Stations should be on reachable pedestrian paths, not behind closed doors. No direct localStorage/save mutation. Occupations use stable named IDs.

**Known gaps:** The source has procedural Three.js meshes, not Blender GLBs. Some poses are stylized joint gestures rather than authored animation clips. Existing game shell cannot yet show outfit props or custom gestures without integration. Actual browser gameplay screenshots and mobile frame measurements have not been captured. Tests are included but have not been executed in this environment. The supplied tests use a minimal mock graph; full path tests should use the real graph factory and obstacle layout. Station assignments currently select by role, not site-specific job preference. Social interactions are opportunistic and do not pause navigation for a timed conversation. Additional tuning is required before claiming final visual acceptance.
