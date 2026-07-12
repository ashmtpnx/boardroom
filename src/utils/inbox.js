// Per-user "inbox" channels — how out-of-band social events (friend requests and
// their accept/decline replies) reach a specific person rather than a board room.
//
// Every signed-in user is a persistent member of their own inbox channel
// `inbox-<THEIR-TAG>` (see realtime/InboxProvider.jsx). To reach them, a sender
// transiently connects to that same channel, emits one event, and disconnects.
// The transport (socket relay in prod, BroadcastChannel cross-tab in dev) fans it
// out to the other members — i.e. the recipient. This mirrors dmRoomId()'s trick
// of deriving a shared channel id with no handshake.
import { createRealtime } from '../realtime/RealtimeProvider';
import { normalizeAccountId } from './accountId';

export function inboxRoomId(tag) {
  const t = normalizeAccountId(tag);
  return t ? `inbox-${t}` : null;
}

// Send a single event to someone's inbox over a short-lived connection, and only
// tear it down once the server confirms it received (and queued) the event.
//
// The previous version disconnected after a fixed 600ms, which lost the event
// whenever the socket hadn't finished connecting yet — e.g. during Render's ~50s
// cold start — so friend requests silently never arrived. Awaiting the server ack
// instead makes delivery reliable regardless of connection latency.
export async function sendToInbox(targetTag, event, payload, me = null) {
  const roomId = inboxRoomId(targetTag);
  if (!roomId) return false;
  let rt = null;
  const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(false), 2500));
  try {
    rt = await createRealtime();
    rt.connect(roomId, me);
    // Wait until the server has acked room:join or time out after 2.5s to prevent waiting glitches
    await Promise.race([rt.whenReady(), timeoutPromise]);
    // Wait for the relay to acknowledge receipt (or time out) before closing.
    const res = await Promise.race([rt.emitAck(event, payload, 2500), timeoutPromise]);
    return !!(res && res.ok);
  } catch {
    return false;
  } finally {
    // A grace period lets socket.io flush the final ack frame and any network buffers cleanly.
    if (rt) setTimeout(() => rt.disconnect?.(), 1000);
  }
}

