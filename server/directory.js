// In-memory public user directory, keyed by shareable account tag.
//
// This is the minimal server-side piece that makes "add friend by account ID"
// real: clients register a *public* profile (no email, no raw id), and anyone
// who knows the tag can resolve it to that profile. Like rooms.js this is
// intentionally ephemeral — swap the Map for Redis/a DB for durability.
import { accountId } from './accountId.js';

const byTag = new Map(); // tag -> { account, name, color, photoURL, updatedAt }

// Upsert the caller's public card. Derives the tag from their raw id so a client
// can't claim someone else's tag. Returns the stored public profile.
export function registerUser({ id, name, color, photoURL }, now = Date.now()) {
  if (!id) return null;
  const account = accountId(id);
  const profile = {
    account,
    name: String(name || 'User').slice(0, 60),
    color: color || null,
    photoURL: typeof photoURL === 'string' ? photoURL : null,
    updatedAt: now,
  };
  byTag.set(account, profile);
  return profile;
}

// Resolve a (already-normalized) tag to a public profile, or null if unknown.
export function lookupUser(tag) {
  return byTag.get(tag) || null;
}

export function directoryStats() {
  return { users: byTag.size };
}
