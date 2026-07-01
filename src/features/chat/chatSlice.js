import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  messages: [], // { id, userId, name, color, text, ts }
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Dispatched by the local user. The realtime middleware broadcasts it to
    // peers; the reducer also appends it so the sender sees it immediately.
    sendMessage: (s, a) => { s.messages.push(a.payload); },
    // Dispatched by the realtime middleware when a peer's message arrives.
    messageReceived: (s, a) => {
      if (s.messages.some((m) => m.id === a.payload.id)) return;
      s.messages.push(a.payload);
    },
    clearChat: (s) => { s.messages = []; },
  },
});

export const { sendMessage, messageReceived, clearChat } = chatSlice.actions;
export default chatSlice.reducer;
