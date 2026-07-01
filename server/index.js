import 'dotenv/config';
import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import {
  applyCanvasEvent,
  getBoardSnapshot,
  addMember,
  removeMember,
  roomStats,
} from './rooms.js';
import { registerUser, lookupUser, directoryStats } from './directory.js';
import { normalizeAccountId } from './accountId.js';

const PORT = Number(process.env.PORT) || 3001;
const ORIGIN = process.env.CORS_ORIGIN || '*';
const origins = ORIGIN === '*' ? true : ORIGIN.split(',').map((s) => s.trim());

const app = express();
app.use(cors({ origin: origins }));
app.use(express.json({ limit: '256kb' })); // photoURL data-URLs can be largish

// Lightweight health/stats endpoint — handy for uptime checks and debugging.
app.get('/health', (_req, res) => {
  res.json({ ok: true, ...roomStats(), ...directoryStats(), uptime: process.uptime() });
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
const CANVAS_EVENTS = new Set(['object:add', 'object:modify', 'object:remove', 'canvas:clear']);

io.on('connection', (socket) => {
  // Client joins exactly one room (room id = URL hash on the frontend).
  socket.on('room:join', ({ roomId, user, senderId }) => {
    if (!roomId || !senderId) return;
    socket.data = { roomId, senderId, user: user || null };
    socket.join(roomId); 
    addMember(roomId, senderId, user);

    // Replay the current board so a late joiner sees everything already drawn.
    // Sent only to this socket; sender="server" so it isn't echo-filtered.
    for (const json of getBoardSnapshot(roomId)) {
      socket.emit('rt', { event: 'object:add', payload: { json }, sender: 'server' });
    }
  });

  // Generic relay: fold canvas state, then forward to everyone else in the room.
  socket.on('rt', (env) => {
    const { roomId } = socket.data || {};
    if (!roomId || !env || !env.event) return;
    if (CANVAS_EVENTS.has(env.event)) applyCanvasEvent(roomId, env.event, env.payload);
    socket.to(roomId).emit('rt', env);
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
