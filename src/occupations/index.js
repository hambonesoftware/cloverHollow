export const OCCUPATIONS=Object.freeze({
 mayor:{prop:'ledger',pose:'reading',station:'clerk',color:0x9b8a65},
 postmaster:{prop:'letter-stack',pose:'sorting-mail',station:'postal-worker',color:0x668da5},
 'mail-carrier':{prop:'mailbag',pose:'delivering-parcels',station:'postal-worker',color:0x668da5},
 baker:{prop:'pastry-tray',pose:'baking',station:'baker',color:0xd69b79},
 carpenter:{prop:'hammer',pose:'hammering',station:'carpenter',color:0x9e785a},
 florist:{prop:'flower-basket',pose:'gardening',station:'florist',color:0xb48aa6},
 shopkeeper:{prop:'parcel',pose:'restocking',station:'shopkeeper',color:0x9eaa8b},
 librarian:{prop:'book',pose:'reading',station:'librarian',color:0x8c9eb8},
 'cafe-server':{prop:'teacup',pose:'serving',station:'barista',color:0xc6a17c},
 maintenance:{prop:'broom',pose:'sweeping',station:'maintenance',color:0x8b9e7a},
 musician:{prop:'lute',pose:'performing-music',station:'performer',color:0xa991bc},
 performer:{prop:'mask',pose:'performing-music',station:'performer',color:0xc788a3},
 gardener:{prop:'watering-can',pose:'gardening',station:'gardener',color:0x85a783},
 resident:{prop:null,pose:'idle',station:null,color:0xa8a1a0}
});
export const NAMED_OCCUPATIONS=Object.freeze({mayor:'mayor',mabel:'shopkeeper',pip:'baker',bruno:'carpenter',dot:'postmaster',biscuit:'mail-carrier',fennel:'librarian',hazel:'florist',clover:'gardener',reed:'maintenance'});
export function occupationFor(actor){return NAMED_OCCUPATIONS[actor.id]||(['cafe-server','tailor','musician','performer','shopkeeper','resident'][actor.ordinal%6]||'resident');}
