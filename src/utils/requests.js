// Friend requests — the consent handshake in front of the friends address book.
//
// Adding someone no longer drops them straight into your friends list; instead a
// request travels to their inbox (see utils/inbox.js) and they must accept. This
// module is the local, per-device record of that handshake:
//   - outgoing: requests I've sent and am waiting on
//   - incoming: requests others have sent me, awaiting my accept/decline
//
// Both live in localStorage (like friends.js / dm.js) and are keyed by the other
// person's shareable account tag, so a pair can only ever have one pending request
// in each direction. Writes fire a same-tab window event because the native
// 'storage' event only reaches *other* tabs — components listen for both.
import { normalizeAccountId } from './accountId';

const IN_KEY = 'boardroom:friendRequests:in';
const OUT_KEY = 'boardroom:friendRequests:out';

// Broadcast a change to listeners in this same tab. Other tabs get the native
// 'storage' event for free; this covers the tab that made the change.
export const REQUESTS_EVENT = 'boardroom:requests-changed';
function announce() {
  try {
    window.dispatchEvent(new CustomEvent(REQUESTS_EVENT));
  } catch {
    /* SSR / no window — ignore */
  }
}

function read(key) {
  try {
    const list = JSON.parse(localStorage.getItem(key));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function write(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    /* ignore quota errors */
  }
  announce();
  return list;
}

// ---- incoming (requests I've received) ----

export function getIncoming() {
  return read(IN_KEY);
}

export function hasIncoming(tag) {
  const t = normalizeAccountId(tag);
  return !!t && getIncoming().some((r) => r.fromTag === t);
}

// Upsert an incoming request, keyed by sender tag (newest metadata wins).
export function addIncoming({ fromTag, name, color = null, photoURL = null }) {
  const tag = normalizeAccountId(fromTag);
  if (!tag) return getIncoming();
  const rest = getIncoming().filter((r) => r.fromTag !== tag);
  const req = { fromTag: tag, name: name || tag, color, photoURL, ts: Date.now() };
  return write(IN_KEY, [req, ...rest]);
}

export function removeIncoming(tag) {
  const t = normalizeAccountId(tag);
  if (!t) return getIncoming();
  return write(IN_KEY, getIncoming().filter((r) => r.fromTag !== t));
}

// ---- outgoing (requests I've sent) ----

export function getOutgoing() {
  const list = read(OUT_KEY);
  const cleaned = list.filter((r) => {
    const t = r.toTag || '';
    return !t.startsWith('BR-ALEX') && !t.startsWith('BR-SARA') && !t.startsWith('BR-MARK') && !t.startsWith('BR-ELEN') && !t.startsWith('BR-DEVIN');
  });
  if (cleaned.length !== list.length) {
    try { localStorage.setItem(OUT_KEY, JSON.stringify(cleaned)); } catch {}
  }
  return cleaned;
}

export function hasOutgoing(tag) {
  const t = normalizeAccountId(tag);
  return !!t && getOutgoing().some((r) => r.toTag === t);
}

export function addOutgoing({ toTag, name, color = null, photoURL = null }) {
  const tag = normalizeAccountId(toTag);
  if (!tag) return getOutgoing();
  const rest = getOutgoing().filter((r) => r.toTag !== tag);
  const req = { toTag: tag, name: name || tag, color, photoURL, ts: Date.now() };
  return write(OUT_KEY, [req, ...rest]);
}

export function removeOutgoing(tag) {
  const t = normalizeAccountId(tag);
  if (!t) return getOutgoing();
  return write(OUT_KEY, getOutgoing().filter((r) => r.toTag !== t));
}

// Forget any pending request in either direction with this tag — used when the
// relationship resolves (accepted, declined, or the friend is removed).
export function clearRequestsWith(tag) {
  const t = normalizeAccountId(tag);
  if (!t) return;
  const nextIn = getIncoming().filter((r) => r.fromTag !== t);
  const nextOut = getOutgoing().filter((r) => r.toTag !== t);
  write(IN_KEY, nextIn);
  write(OUT_KEY, nextOut);
}
