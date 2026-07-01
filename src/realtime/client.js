// Holds the single active realtime client so both the Redux middleware and the
// Fabric canvas hook can reach it without prop-drilling. Set once on connect.
let client = null;

export function setRealtimeClient(c) {
  client = c;
}

export function getRealtimeClient() {
  return client;
}
