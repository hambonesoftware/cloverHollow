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
export function dialogueFor(name, visits = 0) {
  const lines = NEIGHBOR_LINES[name] ?? ['It is lovely to see a new face in Clover Hollow.'];
  return lines[Math.max(0, visits) % lines.length];
}
