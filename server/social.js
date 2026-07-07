// Durable social state: direct-message threads and per-user inbox queues.
//
// This is the piece that makes chat work "end to end" across devices and time:
// the canvas already replays on join (rooms.js), and this mirrors that idea for
// the two social channels that otherwise lose data when the recipient is offline.
//
//   DM threads   dm-<A>__<B>  -> full message history, replayed to any joiner so a
//                second device (or a reload) sees the whole conversation.
//   Inbox queues inbox-<TAG>  -> friend-request / accept / decline events that
//                wait in a queue until the recipient connects AND acknowledges
//                them, so a request sent while they're offline still arrives.
//
// Intentionally in-memory (like rooms.js): restart resets it. Swap for Redis/DB
// if you need durability across server restarts. Both stores are bounded so a
// long-lived process can't grow without limit.
import { randomUUID } from 'node:crypto';

const DM_PREFIX = 'dm-';
const INBOX_PREFIX = 'inbox-';

const MAX_DM_MESSAGES = 5000; // per thread; oldest fall off
const MAX_INBOX_EVENTS = 200; // per user; oldest fall off

const dmThreads = new Map(); // roomId -> Map<msgId, msg>
const inboxQueues = new Map(); // roomId -> Map<eventId, { event, payload }>

export const isDmRoom = (roomId) => typeof roomId === 'string' && roomId.startsWith(DM_PREFIX);
export const isInboxRoom = (roomId) => typeof roomId === 'string' && roomId.startsWith(INBOX_PREFIX);

// ---- direct-message threads ----

// Record a relayed DM. De-duplicated by the client-supplied message id so a
// resend (or a message the sender also stored locally) never doubles up.
export function storeDm(roomId, msg) {
  if (!msg || !msg.id) return;
  let thread = dmThreads.get(roomId);
  if (!thread) {
    thread = new Map();
    dmThreads.set(roomId, thread);
  }
  if (thread.has(msg.id)) return;
  thread.set(msg.id, msg);
  // Trim oldest if we've blown past the cap (Map preserves insertion order).
  if (thread.size > MAX_DM_MESSAGES) {
    const overflow = thread.size - MAX_DM_MESSAGES;
    const it = thread.keys();
    for (let i = 0; i < overflow; i++) thread.delete(it.next().value);
  }
}

// Every stored message for a thread, oldest first — replayed to a joining client.
export function getDmHistory(roomId) {
  const thread = dmThreads.get(roomId);
  return thread ? [...thread.values()] : [];
}

// ---- inbox queues (offline-durable friend-request handshake) ----

// Queue an inbox event for later delivery. Returns the assigned event id so the
// caller can attach it to the relayed envelope (the recipient acks by that id).
export function enqueueInbox(roomId, event, payload) {
  let queue = inboxQueues.get(roomId);
  if (!queue) {
    queue = new Map();
    inboxQueues.set(roomId, queue);
  }
  const eventId = randomUUID();
  queue.set(eventId, { event, payload });
  if (queue.size > MAX_INBOX_EVENTS) {
    const it = queue.keys();
    queue.delete(it.next().value);
  }
  return eventId;
}

// Pending events for a user, oldest first. Each carries its eventId so the client
// can acknowledge it once handled.
export function getInboxQueue(roomId) {
  const queue = inboxQueues.get(roomId);
  if (!queue) return [];
  return [...queue.entries()].map(([eventId, e]) => ({ eventId, ...e }));
}

// Drop acknowledged events. Called after the recipient has processed them, so
// they aren't re-delivered on the next reconnect.
export function ackInbox(roomId, eventIds) {
  const queue = inboxQueues.get(roomId);
  if (!queue || !Array.isArray(eventIds)) return;
  for (const id of eventIds) queue.delete(id);
  if (queue.size === 0) inboxQueues.delete(roomId);
}

export function socialStats() {
  return {
    dmThreads: dmThreads.size,
    inboxQueues: inboxQueues.size,
  };
}
