// Event names exchanged over the realtime transport. The same set is used by the
// mock (BroadcastChannel) and the socket.io transport, so swapping is transparent.
export const EVENTS = {
  // Canvas object sync (payload: { json } or { id })
  OBJECT_ADD: 'object:add',
  OBJECT_MODIFY: 'object:modify',
  OBJECT_REMOVE: 'object:remove',
  CANVAS_CLEAR: 'canvas:clear',
  PAGE_LIST: 'page:list',
  // Chat (payload: message object)
  CHAT_MESSAGE: 'chat:message',
  // One-to-one friend direct message (payload: message object), sent on a
  // per-pair channel so it never mixes with a board's group chat.
  DM_MESSAGE: 'dm:message',
  // "Friend is typing" ping (payload: { userId, name }). Fired while composing;
  // the receiver shows an indicator that auto-expires if no ping follows.
  DM_TYPING: 'dm:typing',
  // Lightweight notification routed through the recipient's inbox channel when a
  // DM arrives on the server. This lets InboxProvider surface a bell notification
  // even when the user isn't viewing the DM thread. Payload: { fromTag, name, text }.
  DM_NOTIFY: 'dm:notify',
  // Friend-request handshake, delivered on a recipient's personal inbox channel
  // (see utils/inbox.js) rather than a board room. Payloads carry the sender's
  // public card { tag, name, color, photoURL } so the receiver can render it.
  FRIEND_REQUEST: 'friend:request', // "I'd like to add you"
  FRIEND_ACCEPT: 'friend:accept', // "I accepted your request"
  FRIEND_DECLINE: 'friend:decline', // "I declined your request"
  // Board / Room live interactions
  ROOM_TYPING: 'room:typing',
  ROOM_REACTION: 'room:reaction',
  // Presence (payload: user object)
  PRESENCE_JOIN: 'presence:join', // "I just arrived"
  PRESENCE_SYNC: 'presence:sync', // "here's who I am" (reply to a join)
  PRESENCE_LEAVE: 'presence:leave',
};
