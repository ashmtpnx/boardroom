// High-level friend-request actions — the single path both the send side and the
// accept side go through, so the handshake stays consistent no matter which UI
// triggers it (Messages "Add", the notification bell's Accept/Decline, etc.).
//
// It stitches together the lower-level stores:
//   requests.js       local record of pending in/out requests
//   inbox.js          delivers an event to the other person's inbox channel
//   friends.js        the accepted address book
//   notifications.js  the bell feed
//
// The wire payload always carries the SENDER's public card as { tag, name, color,
// photoURL } — that's the shape realtime/InboxProvider.jsx expects on the other
// end (it reads p.tag as "who is this from / who accepted").
import { accountId, normalizeAccountId } from './accountId';
import { EVENTS } from '../realtime/events';
import { sendToInbox } from './inbox';
import {
  addOutgoing,
  removeIncoming,
  clearRequestsWith,
  hasOutgoing,
} from './requests';
import { addFriend, getFriends } from './friends';
import { removeNotificationsByTag } from './notifications';

// My public card, used as the payload for anything I send out.
function myCard(me) {
  return {
    tag: accountId(me?.id || ''),
    name: me?.name || null,
    color: me?.color || null,
    photoURL: me?.photoURL || null,
  };
}

// Send a friend request to `targetTag`. Records it as outgoing locally and fires a
// FRIEND_REQUEST at the recipient's inbox. Returns { ok, error, alreadyFriend }.
export async function sendFriendRequest(me, targetTag, name) {
  const target = normalizeAccountId(targetTag);
  if (!target) return { ok: false, error: 'That account ID doesn’t look right.' };

  const myTag = accountId(me?.id || '');
  if (target === myTag) return { ok: false, error: 'That’s your own account ID.' };

  if (getFriends().some((f) => f.account === target)) {
    return { ok: false, error: 'You’re already connected.', alreadyFriend: true };
  }
  if (hasOutgoing(target)) {
    return { ok: false, error: 'Request already sent — waiting for them to accept.' };
  }

  // Remember who I'm reaching out to (label is best-effort; the recipient sees my
  // card, not this label).
  addOutgoing({ toTag: target, name: (name || '').trim() || target });
  await sendToInbox(target, EVENTS.FRIEND_REQUEST, myCard(me), me);
  return { ok: true, error: null };
}

// Accept an incoming request. Adds them as a friend, tells them I accepted (so
// they add me back), and clears the pending + notification state on my side.
// `req` is an incoming record: { fromTag, name, color, photoURL }.
export async function acceptRequest(me, req) {
  const fromTag = normalizeAccountId(req?.fromTag);
  if (!fromTag) return { ok: false };

  if (!getFriends().some((f) => f.account === fromTag)) {
    addFriend({ name: req.name || fromTag, color: req.color, photoURL: req.photoURL, account: fromTag });
  }
  clearRequestsWith(fromTag);              // drop any pending in/out with them
  removeNotificationsByTag(fromTag);       // the "wants to add you" row is done

  await sendToInbox(fromTag, EVENTS.FRIEND_ACCEPT, myCard(me), me);
  return { ok: true };
}

// Decline an incoming request: forget it locally, clear its notification, and let
// the sender quietly drop their outgoing pending state.
export async function declineRequest(me, req) {
  const fromTag = normalizeAccountId(req?.fromTag);
  if (!fromTag) return { ok: false };

  removeIncoming(fromTag);
  removeNotificationsByTag(fromTag);
  await sendToInbox(fromTag, EVENTS.FRIEND_DECLINE, myCard(me), me);
  return { ok: true };
}
