// Event names exchanged over the realtime transport. The same set is used by the
// mock (BroadcastChannel) and the socket.io transport, so swapping is transparent.
export const EVENTS = {
  // Canvas object sync (payload: { json } or { id })
  OBJECT_ADD: 'object:add',
  OBJECT_MODIFY: 'object:modify',
  OBJECT_REMOVE: 'object:remove',
  CANVAS_CLEAR: 'canvas:clear',
  // Chat (payload: message object)
  CHAT_MESSAGE: 'chat:message',
  // One-to-one friend direct message (payload: message object), sent on a
  // per-pair channel so it never mixes with a board's group chat.
  DM_MESSAGE: 'dm:message',
  // "Friend is typing" ping (payload: { userId, name }). Fired while composing;
  // the receiver shows an indicator that auto-expires if no ping follows.
  DM_TYPING: 'dm:typing',
  // Presence (payload: user object)
  PRESENCE_JOIN: 'presence:join', // "I just arrived"
  PRESENCE_SYNC: 'presence:sync', // "here's who I am" (reply to a join)
  PRESENCE_LEAVE: 'presence:leave',
};
