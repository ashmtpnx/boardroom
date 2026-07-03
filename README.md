# BOARDROOM

Author : Ashmeet Mahananda

A real-time collaborative whiteboard with a clean, Google Meet–inspired layout.
Infinite Fabric.js canvas, drawing tools, sticky notes, image drop, chat, and a
people panel — all syncing live.

> **Pass 1 — frontend.** The full UI works standalone. Realtime is *mocked* with the
> browser **BroadcastChannel** API, which gives you **genuine cross-tab sync with no
> server** — open the same room link in two tabs and watch drawing, objects, chat,
> and presence stay in step.
>
> **Pass 2 — server (done).** A Node + Socket.io relay in [`server/`](server/) syncs
> across **different machines**, with in-memory board replay for late joiners and
> presence cleanup on disconnect. Flip two env flags to use it (see below).

## Tech stack
- **React 18** + **Vite**
- **Redux Toolkit** for tool / chat / people / session / UI state
- **Fabric.js v7** for the canvas (source of truth for canvas objects)
- **jsPDF** (+ html2canvas dependency) for PDF export
- **lucide-react** icons
- **firebase** (Google OAuth, optional/env-gated) and **socket.io-client** (Pass 2, inert now)

## Quick start
```bash
npm install
npm run dev          # opens http://localhost:5173
```
No configuration needed — it runs with a zero-config mock user and cross-tab mock realtime.

You land on a **Google Meet–style home page**: click **New board** to start one, paste a
code to **Join**, or reopen a **recent board**. Each board is a shareable `#<code>` link.
Inside a board, the **BOARDROOM** logo and **Leave** button return you home.

To try collaboration: copy the room link (**Share** button) into a second browser tab.

## What you can do
- **Draw** freehand with Pencil / Spray / Circle brushes; pick color and line width.
- **Shapes:** drag to draw rectangles, circles, triangles.
- **Sticky notes** and **text** — double-click to edit, drag to move.
- **Drag & drop images** from your desktop straight onto the board.
- **Pan** with the Hand tool or by holding **Space**; **zoom** with the wheel or the top-bar control.
- **Delete** selected objects with Delete/Backspace; **Clear board** from the toolbar.
- **Chat** and **People** in the collapsible right sidebar.
- **Export**: *Board PDF* (canvas snapshot) and *Chat PDF* (selectable transcript).
- **Desktop-only**: phones/tablets get a friendly notice instead of the canvas.

## Project structure
```
src/
  app/store.js              Redux store
  features/
    canvas/                 Fabric integration — slice, hook, factories, tools
    chat/  people/  session/  ui/   feature slices + panels
  components/               TopBar, Toolbar/, Sidebar/, DesktopOnlyGate
  realtime/                 swappable transport (mock BroadcastChannel | socket.io) + middleware
  auth/                     swappable auth (mock | firebase Google OAuth)
  utils/                    ids, colors, deviceDetect, exportPdf
  hooks/                    useIsDesktop
```

## Architecture notes
- **Fabric owns the canvas objects.** Redux holds UI/tool/chat/people state only — we
  never mirror every Fabric object into the store. Object changes (`object:added`,
  `:modified`, `:removed`, `path:created`, text edits) are serialized and broadcast
  through the realtime seam; an `applyingRemote` guard prevents echo loops.
- **Swappable seams.** `realtime/RealtimeProvider.js` and `auth/authProvider.js` are
  factories chosen by env flag, so Pass 2 (real server) and real Google sign-in are
  config flips, not rewrites.
- **PDF export.** The board is exported via Fabric's native `canvas.toDataURL()` →
  jsPDF (more reliable for a live `<canvas>` than html2canvas). The chat transcript is
  rendered as selectable, auto-paginated text.

## Configuration (optional)
Copy `.env.example` to `.env`. All values are optional; defaults keep everything mocked.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_REALTIME` | `mock` | `mock` (BroadcastChannel) or `socket` (Pass 2 server) |
| `VITE_AUTH` | `mock` | `mock` user or `firebase` Google OAuth |
| `VITE_FIREBASE_*` | — | Firebase web config (only if `VITE_AUTH=firebase`) |
| `VITE_SOCKET_URL` | `http://localhost:3001` | Socket server (only if `VITE_REALTIME=socket`) |

## Cross-machine sync (Pass 2 server)
The relay lives in [`server/`](server/) and has its own README. Quick start:
```bash
cd server && npm install && npm start   # http://localhost:3001
```
Then, from the repo root, create `.env`:
```
VITE_REALTIME=socket
VITE_SOCKET_URL=http://localhost:3001
```
and run `npm run dev`. The room link now syncs across machines, not just tabs.
Room id = the URL hash. Board state is replayed to late joiners and presence is
cleaned up on disconnect. State is in-memory (resets on restart) — see
`server/rooms.js` for the seam to add Redis/DB persistence.

Optionally enable real Google sign-in with `VITE_AUTH=firebase`.

## Constraints
No audio/video — intentionally lightweight, canvas + chat only.
