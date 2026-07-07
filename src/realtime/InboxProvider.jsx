import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { createRealtime } from './RealtimeProvider';
import { EVENTS } from './events';
import { accountId } from '../utils/accountId';
import { addFriend, getFriends } from '../utils/friends';
import {
  addIncoming,
  removeOutgoing,
  clearRequestsWith,
} from '../utils/requests';
import { addNotification, NOTIF } from '../utils/notifications';

// Keeps the signed-in user connected to their personal inbox channel
// (`inbox-<TAG>`) for the whole session, turning incoming friend-request traffic
// into local state + notifications. Renders nothing — it's a side-effect mount in
// Root, alive on every route so requests arrive even from the home screen.
//
// The three events form the accept handshake:
//   FRIEND_REQUEST  someone wants to add me      -> store incoming + notify
//   FRIEND_ACCEPT   someone accepted my request  -> add them back + notify
//   FRIEND_DECLINE  someone declined my request  -> quietly drop the outgoing
export default function InboxProvider() {
  const me = useSelector((s) => s.session.currentUser);
  const myId = me?.id;

  useEffect(() => {
    if (!myId) return;
    const myTag = accountId(myId);
    const roomId = `inbox-${myTag}`;

    let cancelled = false;
    let rt = null;
    const offs = [];
    // Events the server delivered carry an `eventId`; track the ones we've
    // processed so a redelivery on reconnect is ignored, and acknowledge them so
    // the relay drops them from its offline queue. Guarding by id (not just the
    // localStorage upserts below) also stops a replay from re-raising the bell.
    const seen = new Set();
    const ackIfQueued = (p) => {
      if (p?.eventId && !seen.has(p.eventId)) {
        seen.add(p.eventId);
        rt?.ack?.([p.eventId]);
        return false; // first time we've seen this queued event → process it
      }
      return !!p?.eventId; // a known eventId means it's a duplicate → skip
    };

    (async () => {
      const client = await createRealtime();
      if (cancelled) { client.disconnect?.(); return; }
      client.connect(roomId, me);
      rt = client;

      // Someone wants to add me. Record the pending request and raise a bell.
      offs.push(client.on(EVENTS.FRIEND_REQUEST, (p) => {
        if (!p?.tag || ackIfQueued(p)) return;
        // Already friends? Treat their request as an implicit accept — no prompt.
        if (getFriends().some((f) => f.account === p.tag)) return;
        addIncoming({ fromTag: p.tag, name: p.name, color: p.color, photoURL: p.photoURL });
        addNotification({
          type: NOTIF.FRIEND_REQUEST,
          title: `${p.name || p.tag} sent you a friend request`,
          body: 'Tap to accept or decline.',
          tag: p.tag,
          dedupeKey: `req:${p.tag}`,
        });
      }));

      // They accepted a request I sent — add them so we can chat, clear the
      // outgoing pending state, and let me know.
      offs.push(client.on(EVENTS.FRIEND_ACCEPT, (p) => {
        if (!p?.tag || ackIfQueued(p)) return;
        if (!getFriends().some((f) => f.account === p.tag)) {
          addFriend({ name: p.name || p.tag, color: p.color, photoURL: p.photoURL, account: p.tag });
        }
        clearRequestsWith(p.tag);
        addNotification({
          type: NOTIF.REQUEST_ACCEPTED,
          title: `${p.name || p.tag} accepted your friend request`,
          body: 'You can now message each other.',
          tag: p.tag,
          dedupeKey: `acc:${p.tag}`,
        });
      }));

      // They declined — silently forget the outgoing request.
      offs.push(client.on(EVENTS.FRIEND_DECLINE, (p) => {
        if (!p?.tag || ackIfQueued(p)) return;
        removeOutgoing(p.tag);
      }));
    })();

    return () => {
      cancelled = true;
      offs.forEach((off) => off());
      rt?.disconnect?.();
    };
    // Reconnect only when the identity changes; `me` object is stable per id here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myId]);

  return null;
}
