import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentUser: null, // { id, name, color, photoURL, provider }
  roomId: null,
  status: 'connecting', // connecting | connected | leaving
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setUser: (s, a) => { s.currentUser = a.payload; },
    setRoomId: (s, a) => { s.roomId = a.payload; },
    // Marker action: dispatched once the realtime client is connected. The
    // realtime middleware listens for it to subscribe to incoming events and
    // announce presence.
    realtimeConnected: (s) => { s.status = 'connected'; },
    // Marker action: dispatched on tab close so the middleware can emit a leave.
    leaving: (s) => { s.status = 'leaving'; },
  },
});

export const { setUser, setRoomId, realtimeConnected, leaving } = sessionSlice.actions;
export default sessionSlice.reducer;
