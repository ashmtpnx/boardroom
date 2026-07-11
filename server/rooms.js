// In-memory room state. Each room keeps:
//   - objects: Map<id, json>  the live canvas (so late joiners get a full board)
//   - members: Map<senderId, user>  who is present (for disconnect cleanup)
//
// This is intentionally ephemeral — restart the server and rooms reset. Swap this
// module for a Redis/DB-backed store if you need durability across restarts.

const rooms = new Map(); // roomId -> { objects: Map, members: Map, pages: Array }

function getRoom(roomId) {
  let room = rooms.get(roomId);
  if (!room) {
    room = { objects: new Map(), members: new Map(), pages: [{ id: 'page-1', title: 'Page 1' }] };
    rooms.set(roomId, room);
  }
  return room;
}

// Fold a relayed canvas event into the stored board so we can replay it later.
export function applyCanvasEvent(roomId, event, payload) {
  const room = getRoom(roomId);
  const objects = room.objects;
  switch (event) {
    case 'object:add':
    case 'object:modify': {
      const json = payload?.json;
      if (json?.id) objects.set(json.id, json);
      break;
    }
    case 'object:remove': {
      if (payload?.id) objects.delete(payload.id);
      break;
    }
    case 'canvas:clear': {
      const pageId = payload?.pageId;
      if (pageId) {
        for (const [key, val] of objects.entries()) {
          if ((val.pageId || 'page-1') === pageId) {
            objects.delete(key);
          }
        }
      } else {
        objects.clear();
      }
      break;
    }
    case 'page:list': {
      if (Array.isArray(payload?.pages) && payload.pages.length > 0) {
        room.pages = payload.pages;
      }
      break;
    }
    default:
      break;
  }
}

// Snapshot of every object in a room, oldest first — replayed to a joining client.
export function getBoardSnapshot(roomId) {
  return [...getRoom(roomId).objects.values()];
}

export function getRoomPages(roomId) {
  return getRoom(roomId).pages;
}

export function addMember(roomId, senderId, user) {
  getRoom(roomId).members.set(senderId, user || null);
}

export function removeMember(roomId, senderId) {
  const room = rooms.get(roomId);
  if (!room) return null;
  const user = room.members.get(senderId) || null;
  room.members.delete(senderId);
  // Drop empty rooms so memory doesn't grow without bound.
  if (room.members.size === 0) rooms.delete(roomId);
  return user;
}

export function roomStats() {
  return {
    rooms: rooms.size,
    members: [...rooms.values()].reduce((n, r) => n + r.members.size, 0),
  };
}
