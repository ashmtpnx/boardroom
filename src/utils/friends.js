// A local address book of collaborators. There's no server-side user directory,
// so friends live in localStorage on this device. Each: { id, account, name, color, photoURL }.
import { uid } from './ids';
import { pickColor } from './colors';
import { normalizeAccountId } from './accountId';

const KEY = 'boardroom:friends';

export function getFriends() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function persist(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return list;
}

export function addFriend({ name, color, photoURL = null, account = null }) {
  const clean = (name || '').trim();
  if (!clean) return getFriends();
  const friend = {
    id: uid('friend'),
    account: account || null,
    name: clean,
    color: color || pickColor(account || clean),
    photoURL,
  };
  return persist([...getFriends(), friend]);
}

// Add a friend by their shareable account id (e.g. "BR-4K7P-2QX9").
// Returns { ok, list, error }. Validates the id and prevents duplicates.
export function addFriendByAccountId(input, name) {
  const account = normalizeAccountId(input);
  if (!account) return { ok: false, list: getFriends(), error: 'That account ID doesn’t look right.' };
  const list = getFriends();
  if (list.some((f) => f.account === account)) {
    return { ok: false, list, error: 'That friend is already in your list.' };
  }
  const label = (name || '').trim() || account;
  const next = persist([
    ...list,
    { id: uid('friend'), account, name: label, color: pickColor(account), photoURL: null },
  ]);
  return { ok: true, list: next, error: null };
}

export function updateFriend(id, patch) {
  return persist(getFriends().map((f) => (f.id === id ? { ...f, ...patch } : f)));
}

export function removeFriend(id) {
  return persist(getFriends().filter((f) => f.id !== id));
}
