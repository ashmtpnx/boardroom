// Swappable realtime transport. The default "mock" uses the BroadcastChannel API
// for genuine cross-tab sync with no server. "socket" (Pass 2) uses socket.io.
// Both expose: connect(roomId, user), emit(event, payload), on(event, handler),
// disconnect(). `on` returns an unsubscribe function.
export async function createRealtime() {
  const mode = import.meta.env.VITE_REALTIME || 'mock';
  if (mode === 'socket') {
    const m = await import('./socketRealtime');
    return m.createSocketRealtime();
  }
  const m = await import('./mockRealtime');
  return m.createMockRealtime();
}
