import { createSlice } from '@reduxjs/toolkit';
import { TOOLS, BRUSHES, STICKY_COLORS } from './tools';

const initialState = {
  activeTool: TOOLS.SELECT, // select | draw | rect | circle | triangle | sticky | text | image | pan | eraser
  strokeColor: '#1a73e8',
  fillColor: 'transparent',
  stickyColor: STICKY_COLORS[0],
  brushType: BRUSHES.PENCIL, // pencil | spray | circle
  lineWidth: 4,
  zoom: 1,
};

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    setTool: (s, a) => { s.activeTool = a.payload; },
    setStrokeColor: (s, a) => { s.strokeColor = a.payload; },
    setFillColor: (s, a) => { s.fillColor = a.payload; },
    setStickyColor: (s, a) => { s.stickyColor = a.payload; },
    setBrushType: (s, a) => { s.brushType = a.payload; },
    setLineWidth: (s, a) => { s.lineWidth = a.payload; },
    setZoom: (s, a) => { s.zoom = a.payload; },
  },
});

export const {
  setTool,
  setStrokeColor,
  setFillColor,
  setStickyColor,
  setBrushType,
  setLineWidth,
  setZoom,
} = canvasSlice.actions;

export default canvasSlice.reducer;
