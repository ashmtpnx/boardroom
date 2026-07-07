// The notification feed — a single chronological log of things worth surfacing:
// friend requests received, requests accepted, and new direct messages that
// arrived while you weren't looking at that thread.
//
// Stored in localStorage like the rest of the app's social state. A bell badge
// reads unreadCount(); the Notifications page renders the list and marks it read.
// Writes fire a same-tab window event (the native 'storage' event only reaches
// other tabs), so the bell updates live.

const KEY = 'boardroom:notifications';
const MAX = 200; // keep the feed bounded; oldest fall off the end

export const NOTIFICATIONS_EVENT = 'boardroom:notifications-changed';

// Notification kinds. Kept as constants so callers don't hand-type strings.
export const NOTIF = {
  FRIEND_REQUEST: 'friend_request', // someone wants to add you (actionable)
  REQUEST_ACCEPTED: 'request_accepted', // someone accepted your request
  MESSAGE: 'message', // a new DM landed in a thread you're not viewing
};

function announce() {
  try {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_EVENT));
  } catch {
    /* SSR / no window — ignore */
  }
}

export function getNotifications() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function persist(list) {
  const trimmed = list.length > MAX ? list.slice(0, MAX) : list;
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore quota errors */
  }
  announce();
  return trimmed;
}

// Add a notification (newest first). `dedupeKey` collapses repeats: a second
// notification with the same key replaces the earlier one and bumps it to the
// top — used so a chatty friend produces one "new messages" row, not fifty.
export function addNotification({ type, title, body = '', tag = null, dedupeKey = null }) {
  const list = getNotifications();
  const filtered = dedupeKey ? list.filter((n) => n.dedupeKey !== dedupeKey) : list;
  const notif = {
    id: `ntf_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`,
    type,
    title,
    body,
    tag, // the related account tag, if any (used to deep-link into a chat/request)
    dedupeKey,
    ts: Date.now(),
    read: false,
  };
  return persist([notif, ...filtered]);
}

export function unreadCount() {
  return getNotifications().reduce((n, x) => n + (x.read ? 0 : 1), 0);
}

export function markAllRead() {
  const list = getNotifications();
  if (!list.some((n) => !n.read)) return list; // nothing to do — avoid a needless write
  return persist(list.map((n) => (n.read ? n : { ...n, read: true })));
}

export function removeNotification(id) {
  return persist(getNotifications().filter((n) => n.id !== id));
}

// Drop every notification tied to a tag — e.g. once a friend request is
// accepted/declined its "wants to add you" row is no longer actionable.
export function removeNotificationsByTag(tag, type = null) {
  if (!tag) return getNotifications();
  return persist(
    getNotifications().filter((n) => n.tag !== tag || (type && n.type !== type)),
  );
}

export function clearNotifications() {
  return persist([]);
}
