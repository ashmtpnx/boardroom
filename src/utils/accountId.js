// Clean, human-shareable account IDs.
//
// A user's raw auth id (e.g. "user_k3f9q2a" or a Firebase uid) is ugly and not
// meant to be read aloud or typed. We derive a stable, good-looking tag from it
// instead — the SAME raw id always maps to the SAME tag, so it can be shared and
// used to add friends, but it looks like "BR-4K7P-2QX9" rather than random noise.
//
// The alphabet deliberately omits 0/1/O/I to avoid "is that a zero or an oh?"
// confusion when someone reads a code to a friend.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PREFIX = 'BR';
const BODY_LEN = 8; // two groups of four

// FNV-1a, kept in 32 bits via Math.imul. Deterministic and dependency-free.
function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Derive the display tag for a raw account/user id, e.g. "BR-4K7P-2QX9".
export function accountId(rawId = '') {
  const seed = String(rawId);
  let body = '';
  // Salt each position so we get well-mixed characters across the whole tag.
  for (let i = 0; i < BODY_LEN; i++) {
    body += ALPHABET[hash32(`${seed}#${i}`) % ALPHABET.length];
  }
  return `${PREFIX}-${body.slice(0, 4)}-${body.slice(4, 8)}`;
}

// Accept whatever a user pastes/types and return a canonical tag, or null if it
// isn't a valid account id. Tolerant of lowercase, missing dashes, and a missing
// "BR" prefix so "br4k7p2qx9", "4K7P-2QX9", and "BR-4K7P-2QX9" all work.
export function normalizeAccountId(input = '') {
  let s = String(input).toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (s.startsWith(PREFIX)) s = s.slice(PREFIX.length);
  if (s.length !== BODY_LEN) return null;
  for (const ch of s) {
    if (!ALPHABET.includes(ch)) return null;
  }
  return `${PREFIX}-${s.slice(0, 4)}-${s.slice(4, 8)}`;
}

export function isValidAccountId(input = '') {
  return normalizeAccountId(input) !== null;
}
