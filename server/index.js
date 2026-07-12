import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import {
  applyCanvasEvent,
  getBoardSnapshot,
  getRoomPages,
  addMember,
  removeMember,
  roomStats,
} from './rooms.js';
import { registerUser, lookupUser, directoryStats } from './directory.js';
import { accountId, normalizeAccountId } from './accountId.js';
import {
  isDmRoom,
  isInboxRoom,
  storeDm,
  getDmHistory,
  enqueueInbox,
  getInboxQueue,
  ackInbox,
  socialStats,
  extractRecipientTag,
} from './social.js';

const PORT = Number(process.env.PORT) || 3001;
const ORIGIN = process.env.CORS_ORIGIN || '*';
const origins = ORIGIN === '*' ? true : ORIGIN.split(',').map((s) => s.trim());

const app = express();
app.use(cors({ origin: origins }));
app.use(express.json({ limit: '256kb' })); // photoURL data-URLs can be largish

// Room settings & security (roomId -> { name, password, adminId, adminName })
const roomSettings = new Map();

// Lightweight health/stats endpoint — handy for uptime checks and debugging.
app.get('/health', (_req, res) => {
  res.json({ ok: true, ...roomStats(), ...directoryStats(), ...socialStats(), protectedRooms: roomSettings.size, uptime: process.uptime() });
});

// ---- public user directory (powers "add friend by account ID") ----

// Register/refresh the caller's public card. The tag is derived server-side from
// the raw id, so a client can only ever publish under its OWN tag.
app.post('/users/register', (req, res) => {
  const profile = registerUser(req.body || {});
  if (!profile) return res.status(400).json({ error: 'Missing user id.' });
  res.json({ account: profile.account });
});

// Resolve a shareable tag to a public profile. 404 when nobody owns it yet.
app.get('/users/:tag', (req, res) => {
  const tag = normalizeAccountId(req.params.tag);
  if (!tag) return res.status(400).json({ error: 'Malformed account ID.' });
  const profile = lookupUser(tag);
  if (!profile) return res.status(404).json({ error: 'No user with that account ID.' });
  const { updatedAt, ...pub } = profile; // don't leak internal bookkeeping
  res.json(pub);
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: origins, methods: ['GET', 'POST'] },
});

// Canvas events fold into per-room state for board replay; the rest just relay.
const CANVAS_EVENTS = new Set(['object:add', 'object:modify', 'object:remove', 'canvas:clear', 'page:list']);
// DM history replays on join so a second device / reload sees the whole thread.
const DM_MESSAGE = 'dm:message';
// Inbox events are queued until the recipient connects and acknowledges them, so
// a friend request sent while they're offline still lands. Typing pings are
// transient and never persisted.
const INBOX_EVENTS = new Set(['friend:request', 'friend:accept', 'friend:decline']);

io.on('connection', (socket) => {
  // Client joins exactly one room (room id = URL hash on the frontend).
  socket.on('room:join', ({ roomId, user, senderId, password, initialName, initialPassword }, joinAck) => {
    if (!roomId || !senderId) {
      if (typeof joinAck === 'function') joinAck({ ok: false });
      return;
    }

    let settings = roomSettings.get(roomId);
    if (!settings) {
      // First person joining or creating the room becomes Room Admin
      settings = {
        name: initialName || roomId,
        password: initialPassword || '',
        adminId: senderId,
        adminName: user?.name || 'Admin',
      };
      roomSettings.set(roomId, settings);
    } else if (initialName && settings.adminId === senderId) {
      settings.name = initialName;
      if (initialPassword !== undefined) settings.password = initialPassword;
    }

    // Check password if required and caller is not the admin
    if (settings.password && settings.password.trim() !== '' && senderId !== settings.adminId) {
      if (password !== settings.password) {
        if (typeof joinAck === 'function') {
          joinAck({
            ok: false,
            error: 'PASSWORD_REQUIRED',
            roomName: settings.name || roomId,
            adminName: settings.adminName || 'Room Admin',
          });
        }
        return; // Reject entrance — do not join socket room or send snapshot
      }
    }

    socket.data = { roomId, senderId, user: user || null };
    socket.join(roomId);
    addMember(roomId, senderId, user);

    // Send room settings to the joining socket
    const settingsPayload = {
      name: settings.name,
      hasPassword: !!(settings.password && settings.password.trim() !== ''),
      adminId: settings.adminId,
      adminName: settings.adminName,
    };
    socket.emit('rt', { event: 'room:settings', payload: settingsPayload, sender: 'server' });

    // Replay the current board so a late joiner sees everything already drawn.
    // Sent only to this socket; sender="server" so it isn't echo-filtered.
    for (const json of getBoardSnapshot(roomId)) {
      socket.emit('rt', { event: 'object:add', payload: { json }, sender: 'server' });
    }
    // Replay multi-page state
    socket.emit('rt', { event: 'page:list', payload: { pages: getRoomPages(roomId) }, sender: 'server' });

    // Replay a direct-message thread's full history — this is what makes a DM
    // conversation sync across devices, not just persist on the one that sent it.
    if (isDmRoom(roomId)) {
      for (const msg of getDmHistory(roomId)) {
        socket.emit('rt', { event: DM_MESSAGE, payload: msg, sender: 'server' });
      }
    }

    // Deliver any queued inbox events (friend requests etc.) that arrived while
    // this user was offline. Each carries its eventId; the client acks to clear.
    if (isInboxRoom(roomId)) {
      for (const { eventId, event, payload } of getInboxQueue(roomId)) {
        socket.emit('rt', { event, payload: { ...payload, eventId }, sender: 'server' });
      }
    }

    // Ack so the client knows the room is ready and it's safe to emit events.
    if (typeof joinAck === 'function') joinAck({ ok: true, settings: settingsPayload });
  });

  // Admin updates room name or entrance password
  socket.on('room:settings:update', ({ name, password }, ack) => {
    const { roomId, senderId } = socket.data || {};
    if (!roomId || !senderId) {
      if (typeof ack === 'function') ack({ ok: false });
      return;
    }
    const settings = roomSettings.get(roomId);
    if (!settings || settings.adminId !== senderId) {
      if (typeof ack === 'function') ack({ ok: false, error: 'NOT_ADMIN' });
      return;
    }
    if (name !== undefined) settings.name = String(name).trim() || roomId;
    if (password !== undefined) settings.password = String(password);

    const settingsPayload = {
      name: settings.name,
      hasPassword: !!(settings.password && settings.password.trim() !== ''),
      adminId: settings.adminId,
      adminName: settings.adminName,
    };
    io.to(roomId).emit('rt', { event: 'room:settings', payload: settingsPayload, sender: 'server' });
    if (typeof ack === 'function') ack({ ok: true, settings: settingsPayload });
  });

  // Generic relay: fold canvas state / persist social state, then forward to
  // everyone else in the room. The optional `ack` callback (socket.io) lets a
  // sender confirm the server received and stored the event before disconnecting
  // — this is what makes a transient inbox send reliable regardless of latency.
  socket.on('rt', (env, ack) => {
    const done = () => { if (typeof ack === 'function') ack({ ok: true }); };
    const { roomId } = socket.data || {};
    if (!roomId || !env || !env.event) { done(); return; }

    if (CANVAS_EVENTS.has(env.event)) {
      applyCanvasEvent(roomId, env.event, env.payload);
    } else if (env.event === DM_MESSAGE && isDmRoom(roomId)) {
      storeDm(roomId, env.payload); // durable thread for cross-device replay

      // Fan out a lightweight notification to the RECIPIENT's inbox channel so
      // InboxProvider (always connected) can surface a bell badge even when the
      // user isn't viewing the DM thread. The sender's account tag is derived
      // from their user id; extractRecipientTag gives us the other side.
      const senderUser = socket.data?.user;
      const senderTag = senderUser?.id ? accountId(senderUser.id) : null;
      const recipientTag = senderTag ? extractRecipientTag(roomId, senderTag) : null;
      if (recipientTag) {
        const inboxRoom = `inbox-${recipientTag}`;
        io.to(inboxRoom).emit('rt', {
          event: 'dm:notify',
          payload: {
            fromTag: senderTag,
            name: env.payload?.name || senderUser?.name || senderTag,
            photoURL: env.payload?.photoURL || senderUser?.photoURL || null,
            color: env.payload?.color || senderUser?.color || null,
            text: (env.payload?.text || '').slice(0, 120),
          },
          sender: 'server',
        });
      }
    } else if (INBOX_EVENTS.has(env.event) && isInboxRoom(roomId)) {
      // Queue for offline delivery and stamp the relayed copy with its id so an
      // online recipient can ack immediately (and won't get it again on rejoin).
      const eventId = enqueueInbox(roomId, env.event, env.payload);
      socket.to(roomId).emit('rt', {
        ...env,
        payload: { ...env.payload, eventId },
      });
      done();
      return;
    }

    socket.to(roomId).emit('rt', env);
    done();
  });

  // Recipient acknowledges inbox events it has processed, so they're not
  // re-delivered on the next reconnect. Uses the joined inbox room.
  socket.on('inbox:ack', ({ eventIds }) => {
    const { roomId } = socket.data || {};
    if (roomId && isInboxRoom(roomId)) ackInbox(roomId, eventIds);
  });

  // On drop, tell the room the user left — beforeunload on the client isn't reliable.
  socket.on('disconnect', () => {
    const data = socket.data || {};
    if (!data.roomId || !data.senderId) return;
    const user = removeMember(data.roomId, data.senderId);
    if (user?.id) {
      socket.to(data.roomId).emit('rt', {
        event: 'presence:leave',
        payload: { id: user.id },
        sender: data.senderId,
      });
    }
  });
});


server.listen(PORT, () => {
  console.log(`BOARDROOM relay listening on http://localhost:${PORT}  (origins: ${ORIGIN})`);
});

// Keep-alive: Render's free tier spins a web service down after ~15 min with no
// inbound requests, and cold-starting it again costs the first visitor ~50s. A
// self-ping every 10 min is itself inbound traffic, so the relay never idles out.
// Render injects RENDER_EXTERNAL_URL in production; skip this entirely in local dev.
const SELF_URL = process.env.RENDER_EXTERNAL_URL;
if (SELF_URL) {
  const PING_MS = 10 * 60 * 1000;
  setInterval(() => {
    fetch(`${SELF_URL}/health`).catch((err) => console.warn('keep-alive ping failed:', err.message));
  }, PING_MS).unref(); // don't hold the process open on shutdown
}
