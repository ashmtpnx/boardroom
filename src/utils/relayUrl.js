// Single source of truth for the realtime/relay server URL.
//
// History bug this guards against: a stale Render dashboard override once pinned
// VITE_SOCKET_URL to "boardroom-server.onrender.com" — a placeholder host that
// was NEVER a real service — which silently broke all cross-device sync (rooms,
// presence, friend lookup, DMs) because every client dialed a dead address.
//
// So we don't trust an env value blindly: a known-dead host is ignored, and when
// no usable override exists we fall back to the real relay in production builds
// (and localhost in dev). This means the app connects correctly even if the
// deployed env var is missing or wrong.
const DEAD_HOSTS = ['boardroom-server.onrender.com'];
const PROD_RELAY = 'https://boardroom-server-ak8i.onrender.com';
const DEV_RELAY = 'http://localhost:3001';

// Return the first candidate that's non-empty and not a known-dead host, else the
// environment-appropriate default. Pass env values in priority order.
export function resolveRelayUrl(...candidates) {
  for (const c of candidates) {
    const v = (c || '').trim().replace(/\/$/, '');
    if (v && !DEAD_HOSTS.some((h) => v.includes(h))) return v;
  }
  return import.meta.env.PROD ? PROD_RELAY : DEV_RELAY;
}
