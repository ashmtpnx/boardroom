// Lightweight unique id generator. Not cryptographically strong — fine for
// client-side object/message/peer ids.
export function uid(prefix = 'id') {
  const rand = Math.random().toString(36).slice(2, 9);
  const time = Date.now().toString(36).slice(-4);
  return prefix ? `${prefix}_${rand}${time}` : `${rand}${time}`;
}

// Short, human-shareable room code (e.g. "k3f9q2").
export function roomCode() {
  return Math.random().toString(36).slice(2, 8);
}
