import { getRealtimeClient } from './client';
import { EVENTS } from './events';
import { messageReceived, clearChat } from '../features/chat/chatSlice';
import { upsertUser, removeUser, setUsers } from '../features/people/peopleSlice';

// Bridges Redux <-> realtime for chat and presence. (Canvas object sync is wired
// directly in useFabricCanvas, since those objects live in Fabric, not the store.)
//
// Subscriptions are (re)wired on every `realtimeConnected`, so navigating between
// boards in one session rebinds handlers to the new client and starts clean.
let unsubs = [];

function teardown() {
  unsubs.forEach((u) => u && u());
  unsubs = [];
}

export const realtimeMiddleware = (storeApi) => (next) => (action) => {
  const result = next(action);
  const rt = getRealtimeClient();

  switch (action.type) {
    // Fired once the realtime client is connected (see Board bootstrap).
    case 'session/realtimeConnected': {
      if (!rt) break;
      teardown(); // drop any handlers bound to a previous room's client

      // Fresh room: clear chat + presence carried over from a prior board.
      storeApi.dispatch(clearChat());
      storeApi.dispatch(setUsers([]));

      unsubs.push(rt.on(EVENTS.CHAT_MESSAGE, (msg) => storeApi.dispatch(messageReceived(msg))));

      unsubs.push(rt.on(EVENTS.PRESENCE_LIST, (payload) => {
        const list = payload?.users || [];
        const me = storeApi.getState().session.currentUser;
        list.forEach((u) => {
          if (u && u.id) {
            storeApi.dispatch(upsertUser({ ...u, isSelf: u.id === me?.id }));
          }
        });
      }));

      unsubs.push(rt.on(EVENTS.PRESENCE_JOIN, (peer) => {
        if (!peer || !peer.id) return;
        storeApi.dispatch(upsertUser({ ...peer, isSelf: false }));
        // Reply so the newcomer learns we're here too.
        const me = storeApi.getState().session.currentUser;
        if (me) rt.emit(EVENTS.PRESENCE_SYNC, me);
      }));
      unsubs.push(rt.on(EVENTS.PRESENCE_SYNC, (peer) => {
        if (peer && peer.id) storeApi.dispatch(upsertUser({ ...peer, isSelf: false }));
      }));
      unsubs.push(rt.on(EVENTS.PRESENCE_LEAVE, (peer) => {
        if (peer && peer.id) storeApi.dispatch(removeUser(peer.id));
      }));


      // Announce ourselves to everyone already in the room.
      const me = storeApi.getState().session.currentUser;
      if (me) {
        storeApi.dispatch(upsertUser({ ...me, isSelf: true }));
        rt.emit(EVENTS.PRESENCE_JOIN, me);
      }
      break;
    }

    // Local user sent a chat message: reducer already appended it; broadcast it.
    case 'chat/sendMessage': {
      rt?.emit(EVENTS.CHAT_MESSAGE, action.payload);
      break;
    }

    // Leaving the board (tab close or navigating home): tell peers, then unbind.
    case 'session/leaving': {
      const me = storeApi.getState().session.currentUser;
      if (rt && me) rt.emit(EVENTS.PRESENCE_LEAVE, me);
      teardown();
      break;
    }

    default:
      break;
  }

  return result;
};
