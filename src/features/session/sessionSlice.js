import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentUser: null, // { id, name, color, photoURL, provider }
  roomId: null,
  status: 'connecting', // connecting | connected | leaving | password_required
  roomSettings: {
    name: '',
    hasPassword: false,
    adminId: null,
    adminName: '',
  },
  passwordRequired: false,
  passwordError: null,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setUser: (s, a) => { s.currentUser = a.payload; },
    setRoomId: (s, a) => { 
      s.roomId = a.payload;
      s.passwordRequired = false;
      s.passwordError = null;
    },
    setRoomSettings: (s, a) => {
      s.roomSettings = { ...s.roomSettings, ...a.payload };
      if (a.payload.name || a.payload.adminId) {
        s.passwordRequired = false;
        s.passwordError = null;
      }
    },
    setPasswordRequired: (s, a) => {
      s.status = 'password_required';
      s.passwordRequired = true;
      s.passwordError = a.payload?.error || null;
      if (a.payload?.roomName) s.roomSettings.name = a.payload.roomName;
      if (a.payload?.adminName) s.roomSettings.adminName = a.payload.adminName;
    },
    clearPasswordRequired: (s) => {
      s.passwordRequired = false;
      s.passwordError = null;
      s.status = 'connecting';
    },
    // Marker action: dispatched once the realtime client is connected. The
    // realtime middleware listens for it to subscribe to incoming events and
    // announce presence.
    realtimeConnected: (s) => { s.status = 'connected'; s.passwordRequired = false; },
    // Marker action: dispatched on tab close so the middleware can emit a leave.
    leaving: (s) => { s.status = 'leaving'; },
  },
});

export const { setUser, setRoomId, setRoomSettings, setPasswordRequired, clearPasswordRequired, realtimeConnected, leaving } = sessionSlice.actions;
export default sessionSlice.reducer;
