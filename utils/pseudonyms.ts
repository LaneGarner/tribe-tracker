const ADJECTIVES = [
  'Bold', 'Brave', 'Bright', 'Calm', 'Clever', 'Cool', 'Cosmic', 'Crisp',
  'Daring', 'Dawn', 'Deep', 'Eager', 'Echo', 'Ember', 'Epic', 'Fair',
  'Fearless', 'Fierce', 'Flash', 'Fleet', 'Free', 'Fresh', 'Frost', 'Gentle',
  'Ghost', 'Glow', 'Golden', 'Grand', 'Happy', 'Hardy', 'Haze', 'Hollow',
  'Honest', 'Humble', 'Iron', 'Ivory', 'Jade', 'Keen', 'Kind', 'Light',
  'Lime', 'Lofty', 'Lone', 'Loyal', 'Lucky', 'Luna', 'Maple', 'Mellow',
  'Misty', 'Moss', 'Mystic', 'Noble', 'Nova', 'Opal', 'Pacific', 'Pearl',
  'Pine', 'Plum', 'Proud', 'Pure', 'Quick', 'Quiet', 'Radiant', 'Rapid',
  'Reef', 'Ridge', 'Sage', 'Sandy', 'Serene', 'Shadow', 'Sharp', 'Silent',
  'Silver', 'Sky', 'Slate', 'Smooth', 'Solar', 'Spark', 'Steady', 'Stone',
  'Storm', 'Summit', 'Swift', 'Terra', 'Tide', 'Timber', 'True', 'Velvet',
  'Vivid', 'Warm', 'Wild', 'Willow', 'Wise', 'Zen',
];

const ANIMALS = [
  'Badger', 'Bear', 'Bison', 'Bobcat', 'Butterfly', 'Cardinal', 'Cheetah',
  'Condor', 'Coral', 'Cougar', 'Crane', 'Crow', 'Deer', 'Dolphin', 'Dove',
  'Eagle', 'Elk', 'Falcon', 'Finch', 'Firefly', 'Fox', 'Frog', 'Gazelle',
  'Gecko', 'Goose', 'Griffin', 'Hare', 'Hawk', 'Heron', 'Horse', 'Hummingbird',
  'Ibis', 'Jaguar', 'Jay', 'Kestrel', 'Kingfisher', 'Koala', 'Lark', 'Leopard',
  'Lion', 'Llama', 'Lynx', 'Macaw', 'Mantis', 'Marten', 'Moose', 'Moth',
  'Narwhal', 'Newt', 'Nightingale', 'Ocelot', 'Oriole', 'Osprey', 'Otter',
  'Owl', 'Panther', 'Parrot', 'Pelican', 'Penguin', 'Phoenix', 'Puma',
  'Quail', 'Rabbit', 'Raven', 'Robin', 'Salmon', 'Seahorse', 'Seal', 'Sparrow',
  'Stag', 'Starling', 'Stork', 'Swan', 'Tern', 'Thrush', 'Tiger', 'Toucan',
  'Turtle', 'Viper', 'Walrus', 'Whale', 'Wolf', 'Wren',
];

export const ANONYMOUS_PHOTO_SENTINEL = '__anonymous__';

export function generatePseudonym(existingNames: string[]): string {
  const existing = new Set(existingNames);
  let attempts = 0;

  while (attempts < 20) {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    const name = `${adj} ${animal}`;

    if (!existing.has(name)) {
      return name;
    }
    attempts++;
  }

  // Fallback: append a number
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj} ${animal} ${Math.floor(Math.random() * 99) + 1}`;
}
