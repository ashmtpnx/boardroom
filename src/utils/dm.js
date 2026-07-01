// One-to-one direct messages between friends.
//
// Like the rest of the app this is serverless by default: the realtime transport
// (mock = BroadcastChannel) syncs the two participants cross-tab on a device, and
// the thread itself is persisted to localStorage so history survives reloads.
//
// The pair share a deterministic "room" derived from both account tags, so each
// side computes the SAME channel id without any handshake: dm-BR-AAAA-BBBB__BR-CCCC-DDDD.
import { normalizeAccountId } from './accountId';

const PREFIX = 'boardroom:dm:'; // localStorage key prefix, one entry per friend
// History is kept indefinitely ("saved forever"). This very high ceiling is only a
// backstop against the localStorage quota — real threads never approach it.
const MAX = 100000;

// Deterministic, order-independent channel id for the two participants.
export function dmRoomId(tagA, tagB) {
  const a = normalizeAccountId(tagA);
  const b = normalizeAccountId(tagB);
  if (!a || !b) return null;
  return `dm-${[a, b].sort().join('__')}`;
}

function keyFor(friendTag) {
  const tag = normalizeAccountId(friendTag);
  return tag ? PREFIX + tag : null;
}

// Load the stored thread with a friend (oldest first). Empty array if none.
export function loadConversation(friendTag) {
  const key = keyFor(friendTag);
  if (!key) return [];
  try {
    const list = JSON.parse(localStorage.getItem(key));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function persist(friendTag, list) {
  const key = keyFor(friendTag);
  if (!key) return list;
  const trimmed = list.length > MAX ? list.slice(list.length - MAX) : list;
  try {
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch {
    /* ignore quota errors */
  }
  return trimmed;
}

// Append a message to a friend's thread, de-duplicating by id. Returns the new list.
export function appendMessage(friendTag, msg) {
  const list = loadConversation(friendTag);
  if (list.some((m) => m.id === msg.id)) return list;
  return persist(friendTag, [...list, msg]);
}

export function clearConversation(friendTag) {
  const key = keyFor(friendTag);
  if (key) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }
}
