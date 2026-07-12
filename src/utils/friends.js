// A local address book of collaborators. There's no server-side user directory,
// so friends live in localStorage on this device. Each: { id, account, name, color, photoURL }.
import { uid } from './ids';
import { pickColor } from './colors';
import { normalizeAccountId } from './accountId';
import { followAccount, addFollower } from './socialFollow';

const KEY = 'boardroom:friends';

// Fired after any write so views in THIS tab refresh (the native 'storage' event
// only reaches other tabs). The friends list is mutated from two places now —
// the Messages UI and the inbox provider on an accepted request — so a live
// signal keeps both in sync without a manual refresh call.
export const FRIENDS_EVENT = 'boardroom:friends-changed';

export function getFriends() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// Find a friend by their shareable account tag (any accepted format), or null.
export function getFriendByTag(tag) {
  const account = normalizeAccountId(tag);
  if (!account) return null;
  return getFriends().find((f) => f.account === account) || null;
}

function persist(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(FRIENDS_EVENT));
  } catch {
    /* SSR / no window — ignore */
  }
  return list;
}

export function addFriend({ name, color, photoURL = null, account = null }) {
  const clean = (name || '').trim();
  if (!clean) return getFriends();
  const normAccount = account ? normalizeAccountId(account) : null;
  // Never add the same account twice — the two call sites (Messages accept and
  // the inbox provider) can race on an accepted request.
  if (normAccount && getFriends().some((f) => f.account === normAccount)) {
    return getFriends();
  }
  const friend = {
    id: uid('friend'),
    account: normAccount,
    name: clean,
    color: color || pickColor(normAccount || clean),
    photoURL,
  };
  try {
    followAccount(friend);
    addFollower(friend);
  } catch {
    /* ignore */
  }
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
  const newFriend = { id: uid('friend'), account, name: label, color: pickColor(account), photoURL: null };
  try {
    followAccount(newFriend);
    addFollower(newFriend);
  } catch {
    /* ignore */
  }
  const next = persist([
    ...list,
    newFriend,
  ]);
  return { ok: true, list: next, error: null };
}

export function updateFriend(id, patch) {
  return persist(getFriends().map((f) => (f.id === id ? { ...f, ...patch } : f)));
}

export function removeFriend(id) {
  return persist(getFriends().filter((f) => f.id !== id));
}
