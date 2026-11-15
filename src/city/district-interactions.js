/**
 * Pure dialogue/keepsake routing for the connected civic and entertainment
 * district actions. UI and Three.js state are deliberately elsewhere.
 */
export const CIVIC_INTERACTIONS=Object.freeze({
  'town-hall.calendar':{speaker:'Clover Hollow Town Hall',line:'The village calendar lists the Moonbeam Matinee, Firefly Concert, and Lantern Lighting. Each returns every village day.'},
  'town-hall.meeting':{speaker:'Town Clerk',line:'Pull up a chair! Today the neighbors are deciding where the next flowerbeds will bloom.'},
  'notice.read':{speaker:'Village Notice Board',line:'Market mornings, library afternoons, and lantern-lit evenings. Everyone is invited to bring a little joy.'},
  'mayor.appointment':{speaker:'Mayor Thistle',line:'Our doors are always open. I shall put the kettle on and fetch the village map.'},
  'mayor.ledger':{speaker:'Village Property Ledger',line:'Your cottage remains yours. The village keeps every deed safe and every homecoming remembered.'},
  'mayor.deed':{speaker:'Mayor Thistle',line:'A real home begins with a real welcome. Your deed is recorded in the village ledger.'},
  'mail.inbox':{speaker:'Clover Hollow Post Office',line:'A letter from Mabel! “The village feels a little warmer now that you are here.”',reward:'Mabel’s Friendly Letter'},
  'mail.send':{speaker:'Clover Hollow Post Office',line:'Your cheerful postcard is on its way! The postmaster tied it with a tiny bow.',reward:'Clover Postmark'},
  'mail.gifts':{speaker:'Clover Hollow Post Office',line:'A small housewarming parcel arrived for you. It was wrapped in green paper and sweet-smelling twine.',reward:'Hedgerow Parcel Ribbon'},
  'library.read':{speaker:'Whispering Library',line:'A reading nook awaits! This book tells of a cottage that grew around an ancient cherry tree.'},
  'library.history':{speaker:'Whispering Library',line:'Clover Hollow once lit every window on Lantern Night to guide wandering neighbors home.',reward:'Clover Hollow History Page'},
  'library.archive':{speaker:'Village Archivist',line:'Inside the old archive, someone left a carefully pressed four-leaf clover between two pages.',reward:'Founding Day Bookmark'},
  'community.events':{speaker:'Community Hall',line:'Neighbors meet here for music practice, craft afternoons, and planning the next village celebration.'},
  'clinic.visit':{speaker:'Clover Clinic',line:'The clinic smells of chamomile tea and fresh flowers. The staff send you out with a friendly wave.'},
  'records.browse':{speaker:'Old Town Records',line:'The oldest records show the first bridge, bakery, and lantern festival. Every house has a story.'},
  'shop.bakery':{speaker:'Pip’s Bakery',line:'The cinnamon buns are ready, and the berry tarts are cooling in the window.'},
  'shop.general':{speaker:'General Goods',line:'An assortment of baskets, ribbons, seeds and daily essentials fills the shelves.'},
  'shop.florist':{speaker:'Bluebell Florist',line:'A bouquet of tiny moonflowers is waiting in the window.',reward:'Bluebell Bouquet'},
  'shop.cafe':{speaker:'Honeycup Tea Room',line:'A warm mug of honey tea and a quiet table by the window—what a lovely afternoon.'},
  'shop.tailor':{speaker:'Town Tailor',line:'The tailor has laid out moss-green scarves and tiny jackets with brass buttons.'},
  'shop.bookshop':{speaker:'Bookshop',line:'Every shelf seems to hide a different miniature adventure.'},
  'shop.market':{speaker:'Market Stalls',line:'The stalls are full of flowers, trinkets, pastries, and cheerful conversation.'},
  'visit-cafe':{speaker:'Moonmilk Cafe',line:'The moonberry cream is fresh, and a little terrace table is waiting under the lanterns.'},
  'visit-garden':{speaker:'Starlight Gardens',line:'The lanterns glow softly above the flowers. Fireflies drift between the benches.'},
  'visit-promenade':{speaker:'Lantern Promenade',line:'Paper lanterns sway over the cobblestones. The theater and music hall are only a little walk away.'}
});
export const MINI_GAMES=Object.freeze(['ring-toss','firefly-rhythm','theater-encore']);
export function describeDistrictAction(action){
  if(MINI_GAMES.includes(action))return {type:'activity',kind:action};
  if(action==='shop.furniture')return {type:'shop'};
  if(Object.hasOwn(CIVIC_INTERACTIONS,action)){
    return {type:'dialogue',...CIVIC_INTERACTIONS[action]};
  }
  return {type:'dialogue',speaker:'Clover Hollow',line:'A lovely place to explore. There is always something new around the corner.'};
}
