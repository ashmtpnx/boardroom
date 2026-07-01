import { configureStore } from '@reduxjs/toolkit';
import canvasReducer from '../features/canvas/canvasSlice';
import chatReducer from '../features/chat/chatSlice';
import peopleReducer from '../features/people/peopleSlice';
import sessionReducer from '../features/session/sessionSlice';
import uiReducer from '../features/ui/uiSlice';
import { realtimeMiddleware } from '../realtime/realtimeMiddleware';

export const store = configureStore({
  reducer: {
    canvas: canvasReducer,
    chat: chatReducer,
    people: peopleReducer,
    session: sessionReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(realtimeMiddleware),
});
