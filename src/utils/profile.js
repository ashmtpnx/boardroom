// Per-user profile overrides — display name, avatar color, and picture — kept in
// localStorage so they survive reloads and override whatever auth hands back.
// Keyed by user id so a guest and a Google account don't share customizations.
const KEY = 'boardroom:profiles';

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage unavailable — non-critical */
  }
}

export function getProfile(id) {
  return (id && readAll()[id]) || {};
}

// Overlay the stored profile for this user on top of their base auth identity.
export function applyProfile(user) {
  if (!user) return user;
  const p = getProfile(user.id);
  return {
    ...user,
    ...(p.name ? { name: p.name } : {}),
    ...(p.color ? { color: p.color } : {}),
    ...(p.photoURL !== undefined ? { photoURL: p.photoURL } : {}),
  };
}

// Merge a patch into this user's stored profile; returns the new profile.
export function saveProfile(id, patch) {
  const data = readAll();
  data[id] = { ...(data[id] || {}), ...patch };
  writeAll(data);
  return data[id];
}

export function clearProfile(id) {
  const data = readAll();
  delete data[id];
  writeAll(data);
}
