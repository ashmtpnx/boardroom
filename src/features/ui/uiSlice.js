import { createSlice } from '@reduxjs/toolkit';
import { uid } from '../../utils/ids';

const initialState = {
  // Collapsed on initial load across all devices so the board/canvas gets
  // full edge-to-edge space. Users can open Group Chat or People via the right rail tabs.
  sidebarOpen: false,
  activeTab: 'chat', // chat | people
  toasts: [], // { id, text }
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (s) => { s.sidebarOpen = !s.sidebarOpen; },
    setSidebarOpen: (s, a) => { s.sidebarOpen = a.payload; },
    setActiveTab: (s, a) => { s.activeTab = a.payload; s.sidebarOpen = true; },
    pushToast: {
      reducer: (s, a) => { s.toasts.push(a.payload); },
      prepare: (text) => ({ payload: { id: uid('toast'), text } }),
    },
    dismissToast: (s, a) => { s.toasts = s.toasts.filter((t) => t.id !== a.payload); },
  },
});

export const { toggleSidebar, setSidebarOpen, setActiveTab, pushToast, dismissToast } = uiSlice.actions;
export default uiSlice.reducer;
