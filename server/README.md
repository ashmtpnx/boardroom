# BOARDROOM — Relay Server (Pass 2)

Node + [Socket.io](https://socket.io) room-based relay that syncs BOARDROOM across
**different machines** (Pass 1 only synced across tabs via BroadcastChannel).

It is a thin, stateless-by-default relay: clients join a room (room id = the URL
hash) and every `rt` envelope is forwarded to the *other* members of that room.
On top of the relay it adds two conveniences:

- **Board replay** — the current canvas is kept in memory per room, so a client
  that joins late immediately receives every object already on the board.
- **Presence cleanup** — when a socket drops, the server emits `presence:leave`
  for that user, so peers' People panels stay accurate even if the browser never
  fired `beforeunload`.

State is in-memory and ephemeral — restart resets all rooms. See `rooms.js` for the
seam to swap in Redis/a database if you need durability.

## Run it
```bash
cd server
npm install
npm start          # or: npm run dev  (auto-restart on change)
# BOARDROOM relay listening on http://localhost:3001
```

Then point the frontend at it — from the **repo root**, create `.env`:
```
VITE_REALTIME=socket
VITE_SOCKET_URL=http://localhost:3001
```
and run `npm run dev`. Open the room link on two different machines (or browsers)
and drawing, chat, and presence sync live.

## Config
Copy `.env.example` to `.env` (all optional):

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3001` | Port the relay listens on (match `VITE_SOCKET_URL`). |
| `CORS_ORIGIN` | `*` | Allowed browser origin(s), comma-separated. Set to your deployed frontend URL in production. |

## Endpoints
- `GET /health` → `{ ok, rooms, members, uptime }` — health/stats probe.
- Socket.io namespace `/`:
  - `room:join` `{ roomId, user, senderId }` — join a room; triggers board replay.
  - `rt` `{ event, payload, sender }` — relayed to the rest of the room.

## Protocol
The `rt` envelope mirrors the frontend transport exactly (see
`src/realtime/events.js`). Events: `object:add` · `object:modify` · `object:remove`
· `canvas:clear` · `chat:message` · `presence:join` · `presence:sync` ·
`presence:leave`. The server folds the four `object:*`/`canvas:clear` events into
room state for replay; everything else is relayed untouched.

## Test
```bash
node test.mjs     # in-process smoke test: relay, board replay, presence-leave
```
