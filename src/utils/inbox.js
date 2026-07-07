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

// Fire-and-forget a single event at someone's inbox. Opens a short-lived
// connection, emits, and closes it a beat later (giving the transport time to
// flush). Best-effort: resolves regardless so the UI flow never blocks on it.
export async function sendToInbox(targetTag, event, payload, me = null) {
  const roomId = inboxRoomId(targetTag);
  if (!roomId) return false;
  try {
    const rt = await createRealtime();
    rt.connect(roomId, me);
    rt.emit(event, payload);
    // Let the emit flush before tearing the channel down. socket.io needs the
    // round-trip; BroadcastChannel is synchronous but a small delay is harmless.
    setTimeout(() => rt.disconnect?.(), 600);
    return true;
  } catch {
    return false;
  }
}
