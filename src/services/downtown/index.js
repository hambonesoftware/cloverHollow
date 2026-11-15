/** Pure, persistence-free downtown service descriptors. Shell owns all state. */
export const DOWNTOWN_KINDS=Object.freeze({
  townHall:'town-hall',mayor:'mayor-office',post:'post-office',library:'library',
  community:'community-center',bakery:'bakery',furniture:'furniture',
  general:'general-goods',florist:'florist',cafe:'cafe',tailor:'tailor',
  bookshop:'bookshop',market:'market'
});
const catalog={
  'town-hall':[['town-hall.calendar','View town calendar'],['town-hall.meeting','Attend public meeting'],['notice.read','Read public notices']],
  'mayor-office':[['mayor.appointment','Request an appointment'],['mayor.ledger','Review property ledger'],['mayor.deed','Speak about the deed']],
  'post-office':[['mail.inbox','Collect letters and parcels'],['mail.send','Write a friendly letter'],['mail.gifts','Collect villagers’ gifts']],
  library:[['library.read','Browse books'],['library.history','Explore local history'],['library.archive','Visit the archive']],
  'community-center':[['notice.read','Read public notices'],['community.events','See neighborhood activities']],
  bakery:[['shop.bakery','Browse baked goods']],
  furniture:[['shop.furniture','Browse furniture']],
  'general-goods':[['shop.general','Browse general goods']],
  florist:[['shop.florist','Browse flowers']],
  cafe:[['shop.cafe','Order tea and treats']],
  tailor:[['shop.tailor','Browse outfits']],
  bookshop:[['shop.bookshop','Browse books and stationery']],
  market:[['shop.market','Browse weekend stalls']]
};
export function serviceActions(kind){return (catalog[kind]||[]).map(([action,label])=>({action,label}));}
export function describeService(kind,context={}){
  const actions=serviceActions(kind);
  return {kind,actions,context:{...context},requiresPersistence:false};
}
export function validateDowntownAction(kind,action){return serviceActions(kind).some(a=>a.action===action);}
export function noticeBoard(notices=[]){return {kind:'notice-board',items:notices.map(n=>({...n})),actions:serviceActions('town-hall').filter(a=>a.action==='notice.read')};}
export function townCalendar(events=[]){return {kind:'calendar',events:events.map(e=>({...e}))};}
export function mailService({letters=[],parcels=[],gifts=[]}={}){return {letters:[...letters],parcels:[...parcels],gifts:[...gifts],actions:serviceActions('post-office')};}
export function mayorService({deedStatus='unchanged',appointments=[]}={}){return {deedStatus,appointments:[...appointments],actions:serviceActions('mayor-office')};}
export function libraryService({books=[],history=[]}={}){return {books:[...books],history:[...history],actions:serviceActions('library')};}
