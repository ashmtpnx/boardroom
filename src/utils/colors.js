// Palette used for user avatars / presence dots.
export const USER_COLORS = [
  '#1a73e8', '#ea4335', '#34a853', '#fbbc04',
  '#a142f4', '#00acc1', '#ff7043', '#9e9d24',
];

const ADJECTIVES = ['Swift', 'Bright', 'Calm', 'Bold', 'Keen', 'Quiet', 'Brave', 'Lucky', 'Clever', 'Sunny'];
const ANIMALS = ['Otter', 'Falcon', 'Lynx', 'Heron', 'Fox', 'Panda', 'Koala', 'Wolf', 'Robin', 'Orca'];

function hashString(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Deterministic color from a seed (so the same user id always maps to the same color).
export function pickColor(seed = '') {
  return USER_COLORS[hashString(String(seed)) % USER_COLORS.length];
}

// Friendly random display name for the zero-config mock user.
export function randomName() {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${a} ${n}`;
}

// First-letter avatar initials.
export function initials(name = '?') {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
