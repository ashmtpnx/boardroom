// The room id lives in the URL hash (#<code>), which makes every board a shareable
// link and doubles as the app's router. These helpers normalize navigation.
import { roomCode } from './ids';

// Board codes are lowercase alphanumerics + dashes (matches roomCode() output).
export function normalizeCode(raw = '') {
  return String(raw).trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
}

export function goToRoom(code) {
  const clean = normalizeCode(code);
  if (clean) window.location.hash = clean; // fires 'hashchange' -> router updates
}

export function startNewBoard() {
  goToRoom(roomCode());
}

// A shareable invite link for a brand-new board (does not navigate).
export function newBoardLink() {
  return `${window.location.origin}${window.location.pathname}#${roomCode()}`;
}

// Reserved app route for the account page (rooms never collide: codes are 6 chars).
export function goToAccount() {
  window.location.hash = 'account';
}

// Open a one-to-one chat with a friend, addressed by their account tag.
export function goToFriendChat(accountTag) {
  const tag = String(accountTag || '').trim();
  if (tag) window.location.hash = `dm/${tag}`;
}

// Return to the landing page by clearing the hash. pushState doesn't emit
// 'hashchange', so we dispatch it manually to drive the router.
export function goHome() {
  if (!window.location.hash) return;
  history.pushState(null, '', window.location.pathname + window.location.search);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}
