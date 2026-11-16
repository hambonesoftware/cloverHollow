export const WELCOME = {
  speaker: 'Mayor Thistle',
  title: 'A new chapter in Clover Hollow',
  body: 'Ah, there you are! Every lane in our little town leads somewhere wonderful. I have been keeping three very special homes for the next neighbor who felt that Clover Hollow could be theirs. Shall we put your name in the village ledger?'
};
export const CEREMONY = {
  speaker: 'Mayor Thistle',
  title: 'The deed ceremony',
  body: 'By the authority entrusted to me by the residents of Clover Hollow, I declare this cottage yours, with all its creaky floorboards, bright mornings, and room for memories. Keep this deed close. Welcome home!'
};
export const HOUSEWARMING = {
  speaker: 'Your new neighbors',
  title: 'A housewarming surprise!',
  body: 'A soft knock echoes through the cottage. Pip arrives with warm cookies, Hazel brings a sprig of bluebells, and Mayor Thistle hands you a card signed by the whole village. Your first home already feels a little less empty.'
};
export const NEIGHBOR_LINES = Object.freeze({
  'Mayor Thistle': [
    'The village ledger is old, but there is always room for another name.',
    'A good town is built one neighbor at a time.',
    'What a fine day to visit the square!'
  ],
  Mabel: ['I remember when the lanterns lit every lane.', 'Make yourself at home. I truly mean that.'],
  Pip: ['The cinnamon buns are almost ready!', 'I saved you the pastry with the extra icing.'],
  Bruno: ['I made that table myself. Want to see the grain?', 'Ask for help if the furniture is heavy.'],
  Dot: ['The creek is full of little silver fish.', 'Come by for tea when it rains.'],
  Biscuit: ['Race you to the fountain!', 'The square is best when everybody is here.'],
  Fennel: ['Echo Cave remembers more than it tells.', 'Do you think lanterns can have memories?'],
  Hazel: ['Those bluebells would look lovely on your windowsill.', 'Every table needs flowers.'],
  Clover: ['The orchard is finally in bloom.', 'Bring a friend for cider.'],
  Reed: ['The pond is peaceful if you sit long enough.', 'The reeds are where the frogs sing.']
});
// Dialogue should remember the player instead of looping three lines forever.
// We use the already-persisted conversation count; no save migration is needed.
const FAMILIAR_LINES=Object.freeze({
  'Mayor Thistle':['You have become a familiar face around here. The town feels richer for it.','I spotted you by the market. The neighbors have taken quite a liking to you.'],
  Mabel:['Hazel and I always save a seat when we see you coming.','I hope you can join us at the market again tomorrow.'],
  Pip:['Clover brought another basket of apples today. I saved a warm tart for you.','Did I tell you Clover insists her apple pie is better than mine?'],
  Bruno:['I repaired the old market cart. It wobbled all the way to the post office!','That little bench by the bakery was my favorite project this week.'],
  Dot:['The mail has been especially lively. Biscuit nearly sent himself in a parcel!','You should see the post office when the morning deliveries arrive.'],
  Biscuit:['Come early tomorrow; I will show you the mail cart race!','I caught Dot smiling at my new delivery hat.'],
  Fennel:['Reed and I have made a habit of watching the pond at dusk.','I think I heard the library shelves whisper your name.'],
  Hazel:['Mabel and I always end up talking far longer than we planned.','Those flowers outside the tea room are finally blooming.'],
  Clover:['Pip says the apple tart recipe is a secret, but I know better.','Have you noticed how the orchard changes when everyone comes visiting?'],
  Reed:['Fennel came by the pond again. We hardly needed to say anything.','I fixed the little creek gate this morning; you may notice the new hinge.']
});
export function dialogueFor(name, visits = 0) {
  const lines = NEIGHBOR_LINES[name] ?? ['It is lovely to see a new face in Clover Hollow.'];
  const familiar=FAMILIAR_LINES[name];
  if(visits>=3&&familiar)return familiar[(visits-3)%familiar.length];
  return lines[Math.max(0, visits) % lines.length];
}
