// A device-local public user directory, kept in localStorage and keyed by the
// shareable account tag (e.g. "BR-4K7P-2QX9").
//
// The app's default setup is serverless (VITE_REALTIME=mock, no relay running),
// so there's no shared backend to resolve an account ID to a profile. This store
// fills that gap: every signed-in profile publishes its own public card here, and
// "add friend by account ID" reads it back. Because mock realtime is cross-tab on
// one device, two profiles signed in across tabs can find and add each other.
//
// Only public fields are stored — no email, no raw auth id.
import { accountId, normalizeAccountId } from './accountId';

const KEY = 'boardroom:directory';

function readAll() {
  try {
    const obj = JSON.parse(localStorage.getItem(KEY));
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function writeAll(obj) {
  try {
    localStorage.setItem(KEY, JSON.stringify(obj));
  } catch {
    /* ignore quota/serialization errors */
  }
}

// Publish (upsert) a user's public card. The tag is derived from their raw id,
// so a profile can only ever publish under its own tag. No-op without an id.
export function publishLocal(user) {
  if (!user?.id) return null;
  const account = accountId(user.id);
  const all = readAll();
  all[account] = {
    account,
    name: String(user.name || 'User').slice(0, 60),
    color: user.color || null,
    photoURL: typeof user.photoURL === 'string' ? user.photoURL : null,
  };
  writeAll(all);
  return account;
}

// Resolve a tag (any accepted format) to a stored public profile, or null.
export function lookupLocal(input) {
  const tag = normalizeAccountId(input);
  if (!tag) return null;
  return readAll()[tag] || null;
}
