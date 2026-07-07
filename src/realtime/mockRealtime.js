import { uid } from '../utils/ids';

// Cross-tab realtime via the BroadcastChannel API. Every browser tab open on the
// same room shares one channel; each message is tagged with a sender id so a tab
// ignores its own echoes. This makes the whole app feel collaborative with zero
// server — open two tabs on the same URL and watch them sync. Pass 2 swaps this
// for socketRealtime.js behind the identical interface.
export function createMockRealtime() {
  const senderId = uid('peer');
  const handlers = new Map(); // event -> Set<fn>
  let channel = null;

  const deliver = (event, payload, meta) => {
    const set = handlers.get(event);
    if (set) set.forEach((fn) => fn(payload, meta));
  };

  return {
    id: senderId,

    connect(roomId) {
      channel = new BroadcastChannel(`boardroom:${roomId}`);
      channel.onmessage = (e) => {
        const data = e.data || {};
        if (data.sender === senderId) return; // ignore our own echoes
        deliver(data.event, data.payload, { sender: data.sender });
      };
    },

    emit(event, payload) {
      if (!channel) return;
      channel.postMessage({ event, payload, sender: senderId });
    },

    // No server queue in the BroadcastChannel transport — events are delivered
    // live to open tabs only, so there's nothing to acknowledge. No-op for
    // interface parity with the socket transport.
    ack() {},

    on(event, handler) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(handler);
      return () => handlers.get(event)?.delete(handler);
    },

    disconnect() {
      channel?.close();
      channel = null;
      handlers.clear();
    },
  };
}
