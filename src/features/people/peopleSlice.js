import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  users: [], // { id, name, color, isSelf }
};

const peopleSlice = createSlice({
  name: 'people',
  initialState,
  reducers: {
    upsertUser: (s, a) => {
      const idx = s.users.findIndex((u) => u.id === a.payload.id);
      if (idx === -1) s.users.push(a.payload);
      else s.users[idx] = { ...s.users[idx], ...a.payload };
    },
    removeUser: (s, a) => {
      s.users = s.users.filter((u) => u.id !== a.payload);
    },
    setUsers: (s, a) => { s.users = a.payload; },
  },
});

export const { upsertUser, removeUser, setUsers } = peopleSlice.actions;
export default peopleSlice.reducer;
