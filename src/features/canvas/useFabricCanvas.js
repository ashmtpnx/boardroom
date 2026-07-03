import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Canvas,
  Point,
  PencilBrush,
  SprayBrush,
  CircleBrush,
  FabricImage,
  util,
} from 'fabric';
import { setTool, setZoom } from './canvasSlice';
import { TOOLS, BRUSHES } from './tools';
import { createRect, createCircle, createTriangle, createText, createSticky } from './fabricFactories';
import { setCanvasApi } from './canvasApi';
import { getRealtimeClient } from '../../realtime/client';
import { EVENTS } from '../../realtime/events';
import { uid } from '../../utils/ids';

const SHAPE_TOOLS = [TOOLS.RECT, TOOLS.CIRCLE, TOOLS.TRIANGLE];
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 5;

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Owns the imperative Fabric canvas instance and wires it to Redux tool state and
// the realtime sync layer. Event handlers are attached once and read the latest
// tool/style values from refs, so we never re-bind listeners on every change.
export function useFabricCanvas({ canvasElRef, containerRef }) {
  const dispatch = useDispatch();
  const tool = useSelector((s) => s.canvas.activeTool);
  const strokeColor = useSelector((s) => s.canvas.strokeColor);
  const fillColor = useSelector((s) => s.canvas.fillColor);
  const stickyColor = useSelector((s) => s.canvas.stickyColor);
  const brushType = useSelector((s) => s.canvas.brushType);
  const lineWidth = useSelector((s) => s.canvas.lineWidth);
  const connected = useSelector((s) => s.session.status === 'connected');

  const fcRef = useRef(null);
  const styleRef = useRef({ tool, strokeColor, fillColor, stickyColor, brushType, lineWidth });
  const rtRef = useRef(null);
  const applyingRemote = useRef(false); // guard so applying a remote change doesn't re-broadcast
  const draftRef = useRef(null); // in-progress shape being drag-drawn
  const panRef = useRef({ active: false, lastX: 0, lastY: 0, space: false });

  // Keep latest tool/style readable inside the stable event handlers.
  useEffect(() => {
    styleRef.current = { tool, strokeColor, fillColor, stickyColor, brushType, lineWidth };
  }, [tool, strokeColor, fillColor, stickyColor, brushType, lineWidth]);

  // ---------------------------------------------------------------- init (once)
  useEffect(() => {
    const el = canvasElRef.current;
    const container = containerRef.current;
    if (!el || !container) return undefined;

    const canvas = new Canvas(el, {
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
      selection: true,
      stopContextMenu: true,
      fireRightClick: false,
    });
    fcRef.current = canvas;

    const resize = () => {
      canvas.setDimensions({ width: container.clientWidth, height: container.clientHeight });
      canvas.requestRenderAll();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const scenePoint = (e) => (canvas.getScenePoint ? canvas.getScenePoint(e) : canvas.getPointer(e));

    // ---- broadcast local changes to peers ----
    canvas.on('object:added', (e) => {
      const obj = e.target;
      if (!obj || applyingRemote.current || obj.__suppressSync) return;
      if (!obj.id) obj.set('id', uid(obj.type || 'obj'));
      rtRef.current?.emit(EVENTS.OBJECT_ADD, { json: obj.toObject(['id']) });
    });
    canvas.on('object:modified', (e) => {
      const obj = e.target;
      if (!obj || applyingRemote.current) return;
      rtRef.current?.emit(EVENTS.OBJECT_MODIFY, { json: obj.toObject(['id']) });
    });
    canvas.on('object:removed', (e) => {
      const obj = e.target;
      if (!obj || applyingRemote.current) return;
      rtRef.current?.emit(EVENTS.OBJECT_REMOVE, { id: obj.id });
    });
    // Live-sync text as it's typed.
    canvas.on('text:changed', (e) => {
      const obj = e.target;
      if (!obj || applyingRemote.current) return;
      rtRef.current?.emit(EVENTS.OBJECT_MODIFY, { json: obj.toObject(['id']) });
    });

    // ---- pointer: shapes / sticky / text / eraser / pan ----
    canvas.on('mouse:down', (opt) => {
      const { tool: t, strokeColor: sc, fillColor: fc, stickyColor: stc, lineWidth: lw } = styleRef.current;

      if (t === TOOLS.PAN || panRef.current.space) {
        panRef.current.active = true;
        canvas.selection = false;
        panRef.current.lastX = opt.e.clientX;
        panRef.current.lastY = opt.e.clientY;
        canvas.setCursor('grabbing');
        return;
      }

      if (t === TOOLS.ERASER) {
        if (opt.target) {
          canvas.remove(opt.target);
          canvas.requestRenderAll();
        }
        return;
      }

      const p = scenePoint(opt.e);

      if (t === TOOLS.STICKY) {
        const s = createSticky({ left: p.x, top: p.y, color: stc });
        canvas.add(s);
        // Stay on the sticky tool so several notes can be dropped in a row.
        return;
      }
      if (t === TOOLS.TEXT) {
        const txt = createText({ left: p.x, top: p.y, fill: sc });
        canvas.add(txt);
        canvas.setActiveObject(txt);
        txt.enterEditing?.();
        dispatch(setTool(TOOLS.SELECT));
        return;
      }
      if (SHAPE_TOOLS.includes(t)) {
        const base = { left: p.x, top: p.y, strokeColor: sc, fillColor: fc, lineWidth: lw };
        const obj = t === TOOLS.RECT ? createRect(base) : t === TOOLS.CIRCLE ? createCircle(base) : createTriangle(base);
        obj.__suppressSync = true; // don't broadcast the 1px starting shape
        canvas.add(obj);
        draftRef.current = { obj, startX: p.x, startY: p.y, type: t };
      }
    });

    canvas.on('mouse:move', (opt) => {
      if (panRef.current.active) {
        const vpt = canvas.viewportTransform;
        vpt[4] += opt.e.clientX - panRef.current.lastX;
        vpt[5] += opt.e.clientY - panRef.current.lastY;
        canvas.setViewportTransform(vpt);
        panRef.current.lastX = opt.e.clientX;
        panRef.current.lastY = opt.e.clientY;
        return;
      }
      const draft = draftRef.current;
      if (!draft) return;
      const p = scenePoint(opt.e);
      const w = Math.abs(p.x - draft.startX);
      const h = Math.abs(p.y - draft.startY);
      const left = Math.min(p.x, draft.startX);
      const top = Math.min(p.y, draft.startY);
      if (draft.type === TOOLS.CIRCLE) {
        draft.obj.set({ left, top, radius: Math.max(w, h) / 2 });
      } else {
        draft.obj.set({ left, top, width: Math.max(w, 1), height: Math.max(h, 1) });
      }
      draft.obj.setCoords();
      canvas.requestRenderAll();
    });

    canvas.on('mouse:up', () => {
      if (panRef.current.active) {
        panRef.current.active = false;
        canvas.selection = styleRef.current.tool === TOOLS.SELECT;
        return;
      }
      const draft = draftRef.current;
      if (!draft) return;
      draftRef.current = null;
      const { obj } = draft;
      const tooSmall =
        obj.radius !== undefined ? obj.radius < 2 : obj.width < 3 && obj.height < 3;
      if (tooSmall) {
        canvas.remove(obj); // discard accidental click without drag
      } else {
        obj.__suppressSync = false;
        obj.setCoords();
        rtRef.current?.emit(EVENTS.OBJECT_ADD, { json: obj.toObject(['id']) });
      }
      // Stay on the active shape tool so several shapes can be drawn in a row;
      // switch to the Select tool manually to move/resize them.
      canvas.requestRenderAll();
    });

    // ---- wheel zoom (infinite canvas) ----
    canvas.on('mouse:wheel', (opt) => {
      opt.e.preventDefault();
      opt.e.stopPropagation();
      let zoom = canvas.getZoom() * 0.999 ** opt.e.deltaY;
      zoom = Math.min(Math.max(zoom, ZOOM_MIN), ZOOM_MAX);
      canvas.zoomToPoint(new Point(opt.e.offsetX, opt.e.offsetY), zoom);
      dispatch(setZoom(zoom));
    });

    // ---- keyboard: delete selection / hold-space to pan ----
    const onKeyDown = (e) => {
      const c = fcRef.current;
      if (!c) return;
      const tag = (e.target && e.target.tagName) || '';
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || c.getActiveObject()?.isEditing;
      if (e.code === 'Space' && !typing) {
        e.preventDefault();
        panRef.current.space = true;
        c.defaultCursor = 'grab';
        c.setCursor('grab');
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !typing) {
        const active = c.getActiveObject();
        if (!active) return;
        e.preventDefault();
        c.getActiveObjects().forEach((o) => c.remove(o));
        c.discardActiveObject();
        c.requestRenderAll();
      }
    };
    const onKeyUp = (e) => {
      if (e.code !== 'Space') return;
      panRef.current.space = false;
      const c = fcRef.current;
      if (c) {
        c.defaultCursor = 'default';
        c.setCursor('default');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // ---- imperative API for sibling components ----
    const addImageFile = async (file, viewportPoint) => {
      if (!file || !file.type?.startsWith('image/')) return;
      const dataUrl = await readFileAsDataURL(file);
      const img = await FabricImage.fromURL(dataUrl);
      const scale = Math.min(1, 360 / Math.max(img.width, img.height));
      img.scale(scale);
      let left = canvas.getWidth() / 2;
      let top = canvas.getHeight() / 2;
      if (viewportPoint) {
        const vpt = canvas.viewportTransform;
        left = (viewportPoint.x - vpt[4]) / vpt[0];
        top = (viewportPoint.y - vpt[5]) / vpt[3];
      }
      img.set({ left, top, originX: 'center', originY: 'center', id: uid('image') });
      canvas.add(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
    };

    const clearCanvas = () => {
      canvas.remove(...canvas.getObjects());
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      rtRef.current?.emit(EVENTS.CANVAS_CLEAR, {});
    };

    const zoomBy = (factor) => {
      let zoom = Math.min(Math.max(canvas.getZoom() * factor, ZOOM_MIN), ZOOM_MAX);
      canvas.zoomToPoint(new Point(canvas.getWidth() / 2, canvas.getHeight() / 2), zoom);
      dispatch(setZoom(zoom));
    };

    const resetView = () => {
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      dispatch(setZoom(1));
    };

    setCanvasApi({ getCanvas: () => fcRef.current, addImageFile, clearCanvas, zoomBy, resetView });

    return () => {
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      setCanvasApi(null);
      canvas.dispose();
      fcRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ------------------------------------------------ apply tool mode on changes
  useEffect(() => {
    const canvas = fcRef.current;
    if (!canvas) return;

    const isDraw = tool === TOOLS.DRAW;
    canvas.isDrawingMode = isDraw;
    if (isDraw) {
      let brush;
      if (brushType === BRUSHES.SPRAY) brush = new SprayBrush(canvas);
      else if (brushType === BRUSHES.CIRCLE) brush = new CircleBrush(canvas);
      else brush = new PencilBrush(canvas);
      brush.color = strokeColor;
      brush.width = lineWidth;
      canvas.freeDrawingBrush = brush;
    }

    canvas.selection = tool === TOOLS.SELECT;
    // In creation tools, ignore existing objects so clicks always start a new one.
    canvas.skipTargetFind = ![TOOLS.SELECT, TOOLS.ERASER].includes(tool);
    canvas.defaultCursor =
      tool === TOOLS.PAN
        ? 'grab'
        : tool === TOOLS.ERASER
          ? 'not-allowed'
          : SHAPE_TOOLS.includes(tool) || tool === TOOLS.STICKY || tool === TOOLS.TEXT
            ? 'crosshair'
            : 'default';
    canvas.requestRenderAll();
  }, [tool, strokeColor, fillColor, brushType, lineWidth]);

  // ----------------------------------- subscribe to remote object events
  useEffect(() => {
    if (!connected) return undefined;
    const canvas = fcRef.current;
    const rt = getRealtimeClient();
    if (!canvas || !rt) return undefined;
    rtRef.current = rt;

    const findById = (id) => canvas.getObjects().find((o) => o.id === id);

    const applyModify = ({ json }) => {
      if (!json) return;
      const target = findById(json.id);
      if (!target) return applyAdd({ json });
      applyingRemote.current = true;
      target.set(json);
      if (typeof target.initDimensions === 'function') target.initDimensions();
      target.setCoords();
      canvas.requestRenderAll();
      applyingRemote.current = false;
      return undefined;
    };
    const applyAdd = async ({ json }) => {
      if (!json) return;
      if (findById(json.id)) {
        applyModify({ json });
        return;
      }
      const [obj] = await util.enlivenObjects([json]);
      if (!obj) return;
      obj.set('id', json.id);
      applyingRemote.current = true;
      canvas.add(obj);
      canvas.requestRenderAll();
      applyingRemote.current = false;
    };
    const applyRemove = ({ id }) => {
      const target = findById(id);
      if (!target) return;
      applyingRemote.current = true;
      canvas.remove(target);
      canvas.requestRenderAll();
      applyingRemote.current = false;
    };
    const applyClear = () => {
      applyingRemote.current = true;
      canvas.remove(...canvas.getObjects());
      canvas.requestRenderAll();
      applyingRemote.current = false;
    };

    const unsubs = [
      rt.on(EVENTS.OBJECT_ADD, applyAdd),
      rt.on(EVENTS.OBJECT_MODIFY, applyModify),
      rt.on(EVENTS.OBJECT_REMOVE, applyRemove),
      rt.on(EVENTS.CANVAS_CLEAR, applyClear),
    ];
    return () => {
      unsubs.forEach((u) => u && u());
      rtRef.current = null;
    };
  }, [connected]);
}
