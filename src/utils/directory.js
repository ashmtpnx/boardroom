// Talks to the server-side user directory (server/directory.js).
//
// This is what turns "add friend by account ID" from a local, unverified guess
// into a real lookup. When no server is configured the calls fail soft so the
// app still works offline against localStorage alone.
import { normalizeAccountId } from './accountId';
import { publishLocal, lookupLocal } from './localDirectory';
import { resolveRelayUrl } from './relayUrl';

// Directory shares the realtime host by default; override with VITE_API_URL.
// resolveRelayUrl filters out the known-dead placeholder host and supplies the
// right default per environment, so friend lookup can't be pinned to a dead relay.
function apiBase() {
  return resolveRelayUrl(import.meta.env.VITE_API_URL, import.meta.env.VITE_SOCKET_URL);
}

// Publish our public card so others can find us by our tag. Best-effort: a
// failure here never blocks sign-in. Returns the server's tag, or null offline.
export async function registerSelf(user) {
  if (!user?.id) return null;
  // Always publish to the device-local directory first, so the friends feature
  // works even with no server (the default mock setup). The server call below is
  // a best-effort upgrade for cross-device lookups.
  publishLocal(user);
  try {
    const res = await fetch(`${apiBase()}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: user.id,
        name: user.name,
        color: user.color,
        photoURL: user.photoURL || null,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.account || null;
  } catch {
    return null; // no server / offline — fine
  }
}

// Resolve a tag to a public profile. Returns:
//   { ok: true, profile }            — found
//   { ok: false, reason: 'invalid' } — not a well-formed tag
//   { ok: false, reason: 'notfound' }— valid tag, nobody owns it
//   { ok: false, reason: 'offline' } — couldn't reach the directory
export async function lookupAccount(input) {
  const tag = normalizeAccountId(input);
  if (!tag) return { ok: false, reason: 'invalid' };

  // Device-local directory first — this is what makes the feature work without a
  // server. A locally-known profile is authoritative for same-device collaborators.
  const local = lookupLocal(tag);
  if (local) return { ok: true, profile: local, tag };

  // Otherwise try the server directory (cross-device), failing soft when offline.
  try {
    const res = await fetch(`${apiBase()}/users/${encodeURIComponent(tag)}`);
    if (res.status === 404) return { ok: false, reason: 'notfound', tag };
    if (!res.ok) return { ok: false, reason: 'offline', tag };
    return { ok: true, profile: await res.json(), tag };
  } catch {
    return { ok: false, reason: 'offline', tag };
  }
}
