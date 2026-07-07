// Swappable realtime transport.
//   "socket" (default) uses socket.io against the relay for true cross-device sync
//           — friend requests, notifications, and DMs reach other machines, not
//           just other tabs. This is what makes the app work "on all devices".
//   "mock"  uses the BroadcastChannel API for serverless cross-TAB sync on one
//           device — handy for local development with no relay running.
// Both expose: connect(roomId, user), emit(event, payload), on(event, handler),
// disconnect(). `on` returns an unsubscribe function.
export async function createRealtime() {
  const mode = import.meta.env.VITE_REALTIME || 'socket';
  if (mode === 'mock') {
    const m = await import('./mockRealtime');
    return m.createMockRealtime();
  }
  const m = await import('./socketRealtime');
  return m.createSocketRealtime();
}
