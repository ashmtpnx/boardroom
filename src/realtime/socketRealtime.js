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
      // Websocket-first for low-latency sync: on Render's free tier HTTP polling
      // adds a request/response round-trip to every event, which is the main
      // source of "changes show up late". We still list polling as a fallback so
      // the connection survives the ~50s cold start (socket.io keeps retrying,
      // falling back to polling if the websocket handshake can't complete yet).
      socket = io(url, {
        transports: ['websocket', 'polling'],
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

    // Acknowledge queued inbox events by id so the relay stops re-delivering them.
    ack(eventIds) {
      if (eventIds?.length) socket?.emit('inbox:ack', { eventIds });
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
