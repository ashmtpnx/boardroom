import { createSlice } from '@reduxjs/toolkit';
import { TOOLS, BRUSHES, STICKY_COLORS } from './tools';

const initialState = {
  activeTool: TOOLS.SELECT, // select | draw | rect | circle | triangle | sticky | text | image | pan | eraser
  strokeColor: '#1a73e8',
  fillColor: 'transparent',
  stickyColor: STICKY_COLORS[0],
  brushType: BRUSHES.PENCIL, // pencil | spray | circle
  lineWidth: 4,
  eraserWidth: 32, // small: 16, medium: 32, large: 64, huge: 120
  zoom: 1,
  pages: [{ id: 'page-1', title: 'Page 1' }],
  currentPageId: 'page-1',
  canUndo: false,
  canRedo: false,
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
    setEraserWidth: (s, a) => { s.eraserWidth = a.payload; },
    setZoom: (s, a) => { s.zoom = a.payload; },
    setPages: (s, a) => {
      if (Array.isArray(a.payload) && a.payload.length > 0) {
        s.pages = a.payload;
        if (!s.pages.some((p) => p.id === s.currentPageId)) {
          s.currentPageId = s.pages[0].id;
        }
      }
    },
    setCurrentPageId: (s, a) => {
      if (typeof a.payload === 'string') {
        s.currentPageId = a.payload;
      }
    },
    setHistoryState: (s, a) => {
      if (a.payload) {
        if (typeof a.payload.canUndo === 'boolean') s.canUndo = a.payload.canUndo;
        if (typeof a.payload.canRedo === 'boolean') s.canRedo = a.payload.canRedo;
      }
    },
    resetCanvasState: () => initialState,
  },
});

export const {
  setTool,
  setStrokeColor,
  setFillColor,
  setStickyColor,
  setBrushType,
  setLineWidth,
  setEraserWidth,
  setZoom,
  setPages,
  setCurrentPageId,
  setHistoryState,
  resetCanvasState,
} = canvasSlice.actions;

export default canvasSlice.reducer;
