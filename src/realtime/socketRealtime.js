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
  // Resolves once the server acks `room:join`, so callers can await readiness
  // before emitting (fixes the race where `rt` arrived before the server had set
  // `socket.data.roomId`).
  let readyResolve = null;
  let readyPromise = null;

  return {
    id: senderId,

    connect(roomId, user, options = {}) {
      const url = resolveRelayUrl(import.meta.env.VITE_SOCKET_URL);
      // Websocket-first for low-latency sync: on Render's free tier HTTP polling
      // adds a request/response round-trip to every event, which is the main
      // source of "changes show up late". We still list polling as a fallback so
      // the connection survives the ~50s cold start (socket.io keeps retrying,
      // falling back to polling if the websocket handshake can't complete yet).
      socket = io(url, {
        forceNew: true,
        transports: ['websocket', 'polling'],
        query: { roomId, senderId },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 60000,
      });

      readyPromise = new Promise((resolve) => { readyResolve = resolve; });

      const joinRoom = () => {
        socket?.emit(
          'room:join',
          {
            roomId,
            user,
            senderId,
            password: options.password,
            initialName: options.initialName,
            initialPassword: options.initialPassword,
          },
          (res) => {
            if (res && res.ok === false && res.error === 'PASSWORD_REQUIRED') {
              options.onPasswordRequired?.({
                roomName: res.roomName || roomId,
                adminName: res.adminName || 'Room Admin',
              });
              return;
            }
            if (res?.settings) {
              options.onSettings?.(res.settings);
            }
            readyResolve?.();
          }
        );
      };

      socket.on('connect', joinRoom);
      socket.on('disconnect', (reason) => {
        if (reason === 'io server disconnect' || reason === 'transport close') {
          setTimeout(() => socket?.connect(), 1000);
        }
      });
      // Also trigger immediately in case of rapid buffering / synchronous ready
      joinRoom();

      socket.on('rt', (env) => {
        if (!env) return;
        if (env.event === 'room:settings') {
          options.onSettings?.(env.payload);
        }
        if (env.sender === senderId && env.event !== 'room:settings') return;
        const set = handlers.get(env.event);
        if (set) set.forEach((fn) => fn(env.payload, { sender: env.sender }));
      });
    },


    updateRoomSettings({ name, password }) {
      return new Promise((resolve) => {
        if (!socket) return resolve({ ok: false });
        socket.emit('room:settings:update', { name, password }, (res) => {
          resolve(res || { ok: false });
        });
      });
    },

    emit(event, payload) {
      socket?.emit('rt', { event, payload, sender: senderId });
    },

    // Emit and resolve once the server confirms receipt (socket.io ack), or after
    // `timeout` ms as a backstop. Guarantees event delivery even across cold starts.
    emitAck(event, payload, timeout = 15000) {
      return new Promise((resolve) => {
        if (!socket) return resolve({ ok: false });
        let settled = false;
        const finish = (result) => { if (!settled) { settled = true; resolve(result); } };

        const doEmit = () => {
          if (!socket) return finish({ ok: false });
          socket.timeout(timeout).emit('rt', { event, payload, sender: senderId }, (err, res) => {
            finish(err ? { ok: false } : (res || { ok: true }));
          });
        };

        if (socket.connected) {
          doEmit();
        } else {
          socket.once('connect', doEmit);
          setTimeout(() => finish({ ok: false }), timeout);
        }
      });
    },

    // Wait until the server has acked room:join. Safe to call multiple times.
    whenReady() {
      return readyPromise || Promise.resolve();
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

    off(event, handler) {
      if (handler) {
        handlers.get(event)?.delete(handler);
      } else {
        handlers.delete(event);
      }
    },


    disconnect() {
      socket?.disconnect();
      socket = null;
      handlers.clear();
      readyPromise = null;
      readyResolve = null;
    },
  };
}

