// End-to-end smoke test for the relay. Boots the server in-process and drives it
// with two socket.io clients, asserting relay + board replay + presence-leave.
// Run: node test.mjs   (from the server/ dir)
import { spawn } from 'node:child_process';
import sioClient from '../node_modules/socket.io-client/dist/socket.io.js';
const io = sioClient.io || sioClient;

const PORT = 3199;
const URL = `http://localhost:${PORT}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const once = (sock, event, pred = () => true) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), 3000);
    sock.on(event, (env) => {
      if (!pred(env)) return;
      clearTimeout(t);
      resolve(env);
    });
  });

const results = [];
const check = (name, cond) => {
  results.push({ name, ok: !!cond });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
};

const srv = spawn('node', ['index.js'], { env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });

try {
  await wait(700); // let the server bind

  // --- Client A joins and draws an object ---
  const a = io(URL, { transports: ['websocket'], query: { roomId: 'r1', senderId: 'A' } });
  await once(a, 'connect');
  a.emit('room:join', { roomId: 'r1', user: { id: 'ua', name: 'Alice' }, senderId: 'A' });
  await wait(150);
  a.emit('rt', { event: 'object:add', payload: { json: { id: 'obj1', type: 'rect' } }, sender: 'A' });
  await wait(150);

  // --- Client B joins late: must receive the existing board (obj1) as a replay ---
  const b = io(URL, { transports: ['websocket'], query: { roomId: 'r1', senderId: 'B' } });
  await once(b, 'connect');
  const replayP = once(b, 'rt', (e) => e.event === 'object:add' && e.payload?.json?.id === 'obj1');
  b.emit('room:join', { roomId: 'r1', user: { id: 'ub', name: 'Bob' }, senderId: 'B' });
  const replay = await replayP;
  check('late joiner receives board snapshot', replay?.payload?.json?.id === 'obj1');

  // --- Live relay A -> B (chat) ---
  const chatP = once(b, 'rt', (e) => e.event === 'chat:message');
  a.emit('rt', { event: 'chat:message', payload: { id: 'm1', text: 'hi' }, sender: 'A' });
  const chat = await chatP;
  check('live chat relays to peer', chat?.payload?.text === 'hi');

  // --- Sender does not receive its own echo ---
  let selfEcho = false;
  a.on('rt', (e) => { if (e.event === 'chat:message' && e.payload?.id === 'm2') selfEcho = true; });
  a.emit('rt', { event: 'chat:message', payload: { id: 'm2', text: 'echo?' }, sender: 'A' });
  await wait(250);
  check('sender gets no echo of its own event', selfEcho === false);

  // --- Presence leave on disconnect ---
  const leaveP = once(b, 'rt', (e) => e.event === 'presence:leave');
  a.disconnect();
  const leave = await leaveP;
  check('disconnect emits presence:leave with user id', leave?.payload?.id === 'ua');

  b.disconnect();
} catch (err) {
  check(`unexpected error: ${err.message}`, false);
} finally {
  srv.kill();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}
