/**
 * Authoritative immutable reservations for the Living Town expansion.
 * Existing village coordinates and IDs are NEVER reallocated.
 * New districts extend south of the original z=-68 boundary, with the
 * downtown core nearer the old Mayor's Hall and Lantern Quarter southeast.
 */
const site=(id,district,x,z,w,d,name,kind,seed=id,facing='north')=>Object.freeze({
  id,district,x,z,w,d,name,kind,facing,
  entrance:Object.freeze([x,z+(facing==='south'?-d/2-1.5:d/2+1.5)]),seed
});
export const WORLD_BOUNDS=Object.freeze({minX:-92,maxX:92,minZ:-143,maxZ:82});
export const DISTRICTS=Object.freeze({
  downtown:Object.freeze({
    id:'downtown',name:'Clover Square & Old Town',
    bounds:Object.freeze({minX:-72,maxX:10,minZ:-112,maxZ:-48}),
    center:Object.freeze([-31,-80]),palette:'honey-cobblestone',
    landmarks:Object.freeze(['old-town-clock','civic-garden','merchant-arcade'])
  }),
  entertainment:Object.freeze({
    id:'entertainment',name:'Lantern Quarter',
    bounds:Object.freeze({minX:14,maxX:59,minZ:-132,maxZ:-65}),
    center:Object.freeze([36,-100]),palette:'glowing-lanterns',
    landmarks:Object.freeze(['lantern-fountain','festival-green','moonlight-stage'])
  })
});
export const DISTRICT_SITES=Object.freeze([
  site('old-town-post','downtown',-60,-77,12,9,'Clover Post Office','post','old-town-post','south'),
  site('old-town-library','downtown',-41,-77,13,10,'Whispering Library','library','old-town-library','south'),
  site('old-town-teahouse','downtown',-22,-78,11,9,'Honeycup Tea Room','cafe','old-town-teahouse','south'),
  site('old-town-florist','downtown',-4,-76,10,9,'Bluebell Florist','florist','old-town-florist','south'),
  site('old-town-guild','downtown',-59,-101,13,10,'Clover Community Hall','community-center'),
  site('old-town-clinic','downtown',-39,-102,12,10,'Clover Clinic','clinic'),
  site('old-town-courthouse','downtown',-19,-103,13,10,'Old Town Records','records'),
  site('old-town-clock','downtown',-2,-101,10,10,'Clover Hollow Town Hall','town-hall'),
  site('lantern-theatre','entertainment',21,-90,12,10,'Starlight Theatre','theatre'),
  site('lantern-arcade','entertainment',40,-90,12,10,'Firefly Arcade','arcade'),
  site('lantern-cafe','entertainment',21,-118,12,10,'Moonmilk Cafe','cafe'),
  site('lantern-music','entertainment',40,-118,12,10,'Cricket Music Hall','music')
]);
/**
 * Public entertainment lawns are interactive scenery, not buildings.
 * They must NOT be appended to BUILDINGS: doing so would turn the central
 * festival promenade into a collision obstacle and break NPC navigation.
 * The festival stage sits to one side of the pedestrian through-route.
 */
export const SCENIC_ENTERTAINMENT_SITES=Object.freeze([
  site('festival-green','entertainment',31,-102,14,9,
    'Lantern Festival Green','festival'),
  site('starlight-gardens','entertainment',20,-136,11,7,
    'Starlight Gardens','garden')
]);
export const DISTRICT_LANDMARKS=Object.freeze([
  Object.freeze({id:'civic-garden',district:'downtown',x:-32,z:-62,kind:'garden'}),
  Object.freeze({id:'merchant-arcade',district:'downtown',x:-32,z:-87,kind:'promenade'}),
  Object.freeze({id:'lantern-fountain',district:'entertainment',x:31,z:-76,kind:'fountain'}),
  Object.freeze({id:'festival-green',district:'entertainment',x:31,z:-105,kind:'festival'}),
  Object.freeze({id:'moonlight-stage',district:'entertainment',x:52,z:-130,kind:'stage'})
]);
/** Axis-aligned paths; all endpoints are integers for one-unit graph sampling. */
export const DISTRICT_PATHS=Object.freeze([
  // Connection to the old southern market street and Mayor's Hall.
  [-55,-40,-55,-60],[-55,-60,9,-60],[9,-60,9,-9],
  // The broad Old Town merchant spine, frontage walks and cross streets.
  [-69,-70,7,-70],[-69,-94,7,-94],[-69,-112,7,-112],
  [-69,-70,-69,-112],[-50,-60,-50,-112],
  [-31,-60,-31,-112],[-10,-60,-10,-112],[7,-60,7,-112],
  // Door approach branches from the north-facing storefronts.
  [-59,-70,-59,-70],[-40,-70,-40,-70],[-21,-70,-21,-70],[-4,-70,-4,-70],
  [-59,-94,-59,-94],[-39,-94,-39,-94],[-19,-94,-19,-94],[-2,-94,-2,-94],
  // A slightly winding market lane joins opposing shopfronts. The bent
  // centerline deliberately breaks the rigid two-row commercial grid.
  [-69,-89,-51,-87],[-51,-87,-31,-90],[-31,-90,-11,-87],[-11,-87,7,-89],
  [-60,-83,-60,-89],[-41,-84,-41,-88],[-22,-84,-22,-89],[-4,-82,-4,-88],
  // A readable promenade between downtown and Lantern Quarter.
  [7,-60,31,-60],[31,-60,31,-70],[7,-94,31,-94],
  [31,-70,31,-132],[12,-84,52,-84],[12,-112,52,-112],
  [12,-132,52,-132],[12,-84,12,-132],[52,-84,52,-132],
  // Lantern venue door thresholds.
  [21,-84,21,-84],[40,-84,40,-84],
  [21,-112,21,-112],[40,-112,40,-112],
  // Alley shortcuts and waterfront loop.
  [-69,-82,-55,-82],[-40,-82,-21,-82],[-4,-82,7,-82],
  [12,-102,52,-102],[31,-132,52,-132]
].map(row=>Object.freeze(row)));
export const DISTRICT_PLACES=Object.freeze({
  oldTown:Object.freeze([-40,-70]),civicGarden:Object.freeze([-32,-60]),
  merchantArcade:Object.freeze([-21,-94]),clocktower:Object.freeze([-2,-94]),
  lanternPromenade:Object.freeze([31,-70]),lanternFountain:Object.freeze([31,-84]),
  festivalGreen:Object.freeze([31,-102]),moonlightStage:Object.freeze([52,-132]),
  theatre:Object.freeze([21,-84]),arcade:Object.freeze([40,-84]),
  musicHall:Object.freeze([40,-112]),moonmilk:Object.freeze([21,-112])
});
export const DISTRICT_PUBLIC_SPOTS=Object.freeze([
  Object.freeze([-32,-60]),Object.freeze([-21,-94]),Object.freeze([-40,-94]),
  Object.freeze([31,-70]),Object.freeze([31,-102]),Object.freeze([52,-132])
]);
