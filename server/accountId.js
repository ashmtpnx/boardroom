// Server-side copy of the account-id derivation. MUST stay byte-for-byte
// compatible with src/utils/accountId.js so a tag computed here matches the one
// shown in the browser — the same raw id always maps to the same "BR-XXXX-XXXX".
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PREFIX = 'BR';
const BODY_LEN = 8;

function hash32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function accountId(rawId = '') {
  const seed = String(rawId);
  let body = '';
  for (let i = 0; i < BODY_LEN; i++) {
    body += ALPHABET[hash32(`${seed}#${i}`) % ALPHABET.length];
  }
  return `${PREFIX}-${body.slice(0, 4)}-${body.slice(4, 8)}`;
}

// Canonicalize a pasted/typed tag, or return null if it isn't a valid id.
export function normalizeAccountId(input = '') {
  let s = String(input).toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (s.startsWith(PREFIX)) s = s.slice(PREFIX.length);
  if (s.length !== BODY_LEN) return null;
  for (const ch of s) {
    if (!ALPHABET.includes(ch)) return null;
  }
  return `${PREFIX}-${s.slice(0, 4)}-${s.slice(4, 8)}`;
}
