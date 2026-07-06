import { io } from 'socket.io-client';
import { uid } from '../utils/ids';
import { resolveRelayUrl } from '../utils/relayUrl';

// Pass-2 transport. Mirrors the mock interface using socket.io for true
// cross-machine sync. Inert until a server exists and VITE_REALTIME=socket.
//
// Expected server contract: clients join a room, then the server relays every
// { event, payload, sender } envelope to the *other* members of that room.
export function createSocketRealtime() {
  const senderId = uid('peer');
  const handlers = new Map();
  let socket = null;

  return {
    id: senderId,

    connect(roomId, user) {
      const url = resolveRelayUrl(import.meta.env.VITE_SOCKET_URL);
      // Start with HTTP long-polling and upgrade to websocket. Polling-first is
      // more robust behind proxies/free hosts (e.g. Render) that need the initial
      // handshake for sticky routing, and it survives the ~50s cold start when the
      // relay was asleep — socket.io keeps retrying until the server wakes.
      socket = io(url, {
        transports: ['polling', 'websocket'],
        query: { roomId, senderId },
        reconnectionAttempts: Infinity,
        timeout: 60000,
      });
      socket.emit('room:join', { roomId, user, senderId });
      socket.on('rt', (env) => {
        if (!env || env.sender === senderId) return;
        const set = handlers.get(env.event);
        if (set) set.forEach((fn) => fn(env.payload, { sender: env.sender }));
      });
    },

    emit(event, payload) {
      socket?.emit('rt', { event, payload, sender: senderId });
    },

    on(event, handler) {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event).add(handler);
      return () => handlers.get(event)?.delete(handler);
    },

    disconnect() {
      socket?.disconnect();
      socket = null;
      handlers.clear();
    },
  };
}
