import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  Canvas,
  Point,
  Path,
  PencilBrush,
  SprayBrush,
  CircleBrush,
  FabricImage,
  util,
} from 'fabric';
import { setTool, setZoom, setPages, setHistoryState } from './canvasSlice';
import { TOOLS, BRUSHES } from './tools';
import { createRect, createCircle, createTriangle, createText, createSticky } from './fabricFactories';
import { getTemplateSlugFromRoomCode, getTemplateStarterObjects } from './templateStarters';
import { setCanvasApi } from './canvasApi';
import { getRealtimeClient } from '../../realtime/client';
import { EVENTS } from '../../realtime/events';
import { uid } from '../../utils/ids';
import { throttleTrailing } from '../../utils/throttle';
import { incrementStat } from '../../utils/badges';

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

function pushHistory(entry, historyRef, dispatch) {
  if (!historyRef || !historyRef.current) return;
  historyRef.current.undo.push(entry);
  if (historyRef.current.undo.length > 60) historyRef.current.undo.shift();
  historyRef.current.redo = [];
  dispatch(setHistoryState({ canUndo: true, canRedo: false }));
}

// Slice freehand paths or erase targeted elements directly at (x, y) with a clean radius
function erasePortionAt(canvas, x, y, radius, styleRef, storeByPageRef, rtRef, historyRef, dispatch, undoGuard) {
  if (!canvas) return;
  const curPage = styleRef.current.currentPageId || 'page-1';
  const objects = canvas.getObjects().slice();
  let modifiedAny = false;
  const removedJsons = [];
  const addedJsons = [];

  objects.forEach((o) => {
    if (!o.id || o.__suppressSync || o.isEditing) return;

    const br = o.getBoundingRect();
    if (
      x + radius < br.left ||
      x - radius > br.left + br.width ||
      y + radius < br.top ||
      y - radius > br.top + br.height
    ) {
      return;
    }

    // 1. If it's a drawing path (fabric.Path), slice the segments precisely where cursor touches
    if (o.type === 'path' && Array.isArray(o.path)) {
      const survivingPaths = [];
      let currentSub = [];
      const matrix = o.calcTransformMatrix();
      const pathOffX = o.pathOffset?.x || 0;
      const pathOffY = o.pathOffset?.y || 0;
      let hitAnySegment = false;

      o.path.forEach((seg, idx) => {
        if (!seg || seg.length < 3) {
          if (currentSub.length > 0) currentSub.push(seg);
          return;
        }
        const sx = seg[seg.length - 2];
        const sy = seg[seg.length - 1];
        if (typeof sx !== 'number' || typeof sy !== 'number') return;

        const pt = new Point(sx - pathOffX, sy - pathOffY);
        const wPt = util.transformPoint(pt, matrix);
        const distSq = (wPt.x - x) * (wPt.x - x) + (wPt.y - y) * (wPt.y - y);

        if (distSq <= radius * radius) {
          hitAnySegment = true;
          if (currentSub.length >= 2) {
            survivingPaths.push(currentSub);
          }
          currentSub = [];
        } else {
          if (currentSub.length === 0 && idx > 0) {
            currentSub.push(['M', sx, sy]);
          } else {
            currentSub.push(seg);
          }
        }
      });

      if (currentSub.length >= 2) {
        survivingPaths.push(currentSub);
      }

      if (hitAnySegment) {
        modifiedAny = true;
        o.__sliceErasing = true;
        const oldJson = o.toObject(['id', 'pageId']);
        removedJsons.push(oldJson);
        if (o.id) storeByPageRef.current.delete(o.id);
        canvas.remove(o); // triggers object:removed -> emits OBJECT_REMOVE

        survivingPaths.forEach((sub) => {
          if (!sub || sub.length < 2) return;
          const newId = uid('path');
          const newPath = new Path(sub, {
            id: newId,
            stroke: o.stroke,
            strokeWidth: o.strokeWidth,
            fill: o.fill || null,
            strokeLineCap: o.strokeLineCap || 'round',
            strokeLineJoin: o.strokeLineJoin || 'round',
            pageId: curPage,
            selectable: true,
            evented: true,
          });
          newPath.__sliceErasing = true;
          canvas.add(newPath);
          const json = newPath.toObject(['id', 'pageId']);
          addedJsons.push(json);
          storeByPageRef.current.set(newId, json);
          rtRef.current?.emit(EVENTS.OBJECT_ADD, { json });
        });
      }
    } else {
      // 2. For non-path shapes, only erase if cursor rubs near center
      const centerDistSq = (br.left + br.width / 2 - x) ** 2 + (br.top + br.height / 2 - y) ** 2;
      const minRadiusSq = Math.min(br.width, br.height) ** 2 / 5;
      if (centerDistSq <= Math.max(radius * radius, minRadiusSq)) {
        modifiedAny = true;
        o.__sliceErasing = true;
        removedJsons.push(o.toObject(['id', 'pageId']));
        if (o.id) storeByPageRef.current.delete(o.id);
        canvas.remove(o);
      }
    }
  });

  if (modifiedAny) {
    if (historyRef && dispatch && !undoGuard?.current && (removedJsons.length > 0 || addedJsons.length > 0)) {
      pushHistory({ type: 'ERASE_PORTION', removed: removedJsons, added: addedJsons }, historyRef, dispatch);
    }
    canvas.requestRenderAll();
  }
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
  const eraserWidth = useSelector((s) => s.canvas.eraserWidth || 32);
  const currentPageId = useSelector((s) => s.canvas.currentPageId || 'page-1');
  const connected = useSelector((s) => s.session.status === 'connected');

  const fcRef = useRef(null);
  const styleRef = useRef({ tool, strokeColor, fillColor, stickyColor, brushType, lineWidth, eraserWidth, currentPageId });
  const storeByPageRef = useRef(new Map()); // id -> json
  const rtRef = useRef(null);
  const applyingRemote = useRef(false); // guard so applying a remote change doesn't re-broadcast
  const draftRef = useRef(null); // in-progress shape being drag-drawn
  const panRef = useRef({ active: false, lastX: 0, lastY: 0, space: false });
  const eraserRef = useRef({ active: false });
  const historyRef = useRef({ undo: [], redo: [] });
  const undoGuard = useRef(false);

  // Keep latest tool/style readable inside the stable event handlers.
  useEffect(() => {
    styleRef.current = { tool, strokeColor, fillColor, stickyColor, brushType, lineWidth, eraserWidth, currentPageId };
  }, [tool, strokeColor, fillColor, stickyColor, brushType, lineWidth, eraserWidth, currentPageId]);

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
    if (canvasElRef.current) canvasElRef.current.fabricCanvas = canvas;


    const resize = () => {
      canvas.setDimensions({ width: container.clientWidth, height: container.clientHeight });
      canvas.requestRenderAll();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    const getClientXY = (e) => {
      if (!e) return { x: 0, y: 0 };
      if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX || 0, y: e.touches[0].clientY || 0 };
      if (e.changedTouches && e.changedTouches.length > 0) return { x: e.changedTouches[0].clientX || 0, y: e.changedTouches[0].clientY || 0 };
      return { x: e.clientX || 0, y: e.clientY || 0 };
    };

    const scenePoint = (e) => (canvas.getScenePoint ? canvas.getScenePoint(e) : canvas.getPointer(e));

    // ---- broadcast local changes to peers ----
    // Throttled modify emitter for high-frequency streams (drag, resize, typing).
    // object:modified still fires the final authoritative state on release, so the
    // trailing edge here just keeps peers smooth mid-gesture without flooding.
    const emitModifyThrottled = throttleTrailing((obj) => {
      const curPage = styleRef.current.currentPageId || 'page-1';
      if (!obj.pageId) obj.set('pageId', curPage);
      const json = obj.toObject(['id', 'pageId']);
      storeByPageRef.current.set(json.id, json);
      rtRef.current?.emit(EVENTS.OBJECT_MODIFY, { json });
    }, 80);

    const emitCursorThrottled = throttleTrailing((x, y) => {
      rtRef.current?.emit(EVENTS.ROOM_CURSOR, { x, y });
    }, 60);


    canvas.on('object:added', (e) => {
      const obj = e.target;
      if (!obj || applyingRemote.current || obj.__suppressSync) return;
      if (!obj.id) obj.set('id', uid(obj.type || 'obj'));
      const curPage = styleRef.current.currentPageId || 'page-1';
      if (!obj.pageId) obj.set('pageId', curPage);
      const json = obj.toObject(['id', 'pageId']);
      storeByPageRef.current.set(json.id, json);
      rtRef.current?.emit(EVENTS.OBJECT_ADD, { json });
      if (!undoGuard.current && !obj.__sliceErasing) {
        pushHistory({ type: 'ADD', json }, historyRef, dispatch);
        if (obj.type === 'sticky') incrementStat('notesCreated', 1);
        if (obj.type === 'path') incrementStat('freehandUsed', 1);
      }
    });
    canvas.on('object:modified', (e) => {
      const obj = e.target;
      if (!obj || applyingRemote.current) return;
      const curPage = styleRef.current.currentPageId || 'page-1';
      if (!obj.pageId) obj.set('pageId', curPage);
      const json = obj.toObject(['id', 'pageId']);
      storeByPageRef.current.set(json.id, json);
      rtRef.current?.emit(EVENTS.OBJECT_MODIFY, { json });
      if (!undoGuard.current && obj.__beforeModifyJson) {
        pushHistory({ type: 'MODIFY', before: obj.__beforeModifyJson, after: json }, historyRef, dispatch);
        delete obj.__beforeModifyJson;
      }
    });
    canvas.on('object:removed', (e) => {
      const obj = e.target;
      if (!obj || applyingRemote.current) return;
      if (obj.id) storeByPageRef.current.delete(obj.id);
      rtRef.current?.emit(EVENTS.OBJECT_REMOVE, { id: obj.id });
      if (!undoGuard.current && !obj.__suppressSync && !obj.__sliceErasing) {
        pushHistory({ type: 'REMOVE', json: obj.toObject(['id', 'pageId']) }, historyRef, dispatch);
      }
    });
    // Stream in-progress gestures so peers see a shape move/resize/rotate live,
    // instead of it jumping only when the mouse is released. Throttled to bound
    // traffic on slow (free-tier) relays.
    const onLiveGesture = (e) => {
      const obj = e.target;
      if (!obj || applyingRemote.current || obj.__suppressSync) return;
      emitModifyThrottled(obj);
    };
    canvas.on('object:moving', onLiveGesture);
    canvas.on('object:scaling', onLiveGesture);
    canvas.on('object:rotating', onLiveGesture);
    // Live-sync text as it's typed, throttled so each keystroke isn't a full
    // object broadcast; the trailing call syncs the final text.
    const emitTextThrottled = throttleTrailing((obj) => {
      const curPage = styleRef.current.currentPageId || 'page-1';
      if (!obj.pageId) obj.set('pageId', curPage);
      const json = obj.toObject(['id', 'pageId']);
      storeByPageRef.current.set(json.id, json);
      rtRef.current?.emit(EVENTS.OBJECT_MODIFY, { json });
    }, 120);
    canvas.on('text:changed', (e) => {
      const obj = e.target;
      if (!obj || applyingRemote.current) return;
      emitTextThrottled(obj);
    });

    // ---- pointer: shapes / sticky / text / eraser / pan ----
    canvas.on('mouse:down', (opt) => {
      const { tool: t, strokeColor: sc, fillColor: fc, stickyColor: stc, lineWidth: lw, eraserWidth: ew } = styleRef.current;

      if (t === TOOLS.PAN || panRef.current.space) {
        panRef.current.active = true;
        canvas.selection = false;
        const pt = getClientXY(opt.e);
        panRef.current.lastX = pt.x;
        panRef.current.lastY = pt.y;
        canvas.setCursor('grabbing');
        return;
      }

      if (t === TOOLS.SELECT && opt.target && !opt.target.__suppressSync) {
        opt.target.__beforeModifyJson = opt.target.toObject(['id', 'pageId']);
      }

      if (t === TOOLS.ERASER) {
        eraserRef.current.active = true;
        const p = scenePoint(opt.e);
        erasePortionAt(canvas, p.x, p.y, Math.max(12, ew / 2), styleRef, storeByPageRef, rtRef, historyRef, dispatch, undoGuard);
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
      if (opt.e) {
        const sp = scenePoint(opt.e);
        if (sp) emitCursorThrottled(sp.x, sp.y);
      }
      if (styleRef.current.tool === TOOLS.ERASER && eraserRef.current.active) {

        const p = scenePoint(opt.e);
        const { eraserWidth: ew } = styleRef.current;
        erasePortionAt(canvas, p.x, p.y, Math.max(12, ew / 2), styleRef, storeByPageRef, rtRef, historyRef, dispatch, undoGuard);
        return;
      }
      if (panRef.current.active) {
        const pt = getClientXY(opt.e);
        const dx = pt.x - panRef.current.lastX;
        const dy = pt.y - panRef.current.lastY;
        if (!isNaN(dx) && !isNaN(dy) && (dx !== 0 || dy !== 0)) {
          const vpt = canvas.viewportTransform;
          vpt[4] += dx;
          vpt[5] += dy;
          canvas.setViewportTransform(vpt);
          panRef.current.lastX = pt.x;
          panRef.current.lastY = pt.y;
        }
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
      if (eraserRef.current.active) {
        eraserRef.current.active = false;
        return;
      }
      if (panRef.current.active) {
        panRef.current.active = false;
        canvas.selection = styleRef.current.tool === TOOLS.SELECT;
        canvas.setCursor(styleRef.current.tool === TOOLS.PAN || panRef.current.space ? 'grab' : 'default');
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
        const curPage = styleRef.current.currentPageId || 'page-1';
        if (!obj.pageId) obj.set('pageId', curPage);
        obj.setCoords();
        const json = obj.toObject(['id', 'pageId']);
        storeByPageRef.current.set(json.id, json);
        rtRef.current?.emit(EVENTS.OBJECT_ADD, { json });
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

    const undo = () => {
      const h = historyRef.current;
      if (!h || h.undo.length === 0) return;
      const entry = h.undo.pop();
      h.redo.push(entry);
      dispatch(setHistoryState({ canUndo: h.undo.length > 0, canRedo: h.redo.length > 0 }));

      const c = fcRef.current;
      const rt = rtRef.current;
      if (!c) return;
      undoGuard.current = true;
      applyingRemote.current = true;

      try {
        const findById = (id) => c.getObjects().find((o) => o.id === id);

        if (entry.type === 'ADD') {
          const target = findById(entry.json.id);
          if (target) {
            storeByPageRef.current.delete(entry.json.id);
            c.remove(target);
            rt?.emit(EVENTS.OBJECT_REMOVE, { id: entry.json.id });
          }
        } else if (entry.type === 'REMOVE') {
          util.enlivenObjects([entry.json]).then(([obj]) => {
            if (!obj) return;
            c.add(obj);
            const json = obj.toObject(['id', 'pageId']);
            storeByPageRef.current.set(entry.json.id, json);
            rt?.emit(EVENTS.OBJECT_ADD, { json });
            c.requestRenderAll();
          });
        } else if (entry.type === 'MODIFY') {
          const target = findById(entry.before.id);
          if (target) {
            target.set(entry.before);
            target.setCoords();
            storeByPageRef.current.set(entry.before.id, entry.before);
            rt?.emit(EVENTS.OBJECT_MODIFY, { json: entry.before });
            c.requestRenderAll();
          }
        } else if (entry.type === 'ERASE_PORTION') {
          entry.added.forEach((json) => {
            const target = findById(json.id);
            if (target) {
              storeByPageRef.current.delete(json.id);
              c.remove(target);
              rt?.emit(EVENTS.OBJECT_REMOVE, { id: json.id });
            }
          });
          util.enlivenObjects(entry.removed).then((objs) => {
            objs.forEach((obj) => {
              if (!obj) return;
              c.add(obj);
              const json = obj.toObject(['id', 'pageId']);
              storeByPageRef.current.set(json.id, json);
              rt?.emit(EVENTS.OBJECT_ADD, { json });
            });
            c.requestRenderAll();
          });
        }
      } finally {
        undoGuard.current = false;
        applyingRemote.current = false;
        c.requestRenderAll();
      }
    };

    const redo = () => {
      const h = historyRef.current;
      if (!h || h.redo.length === 0) return;
      const entry = h.redo.pop();
      h.undo.push(entry);
      dispatch(setHistoryState({ canUndo: h.undo.length > 0, canRedo: h.redo.length > 0 }));

      const c = fcRef.current;
      const rt = rtRef.current;
      if (!c) return;
      undoGuard.current = true;
      applyingRemote.current = true;

      try {
        const findById = (id) => c.getObjects().find((o) => o.id === id);

        if (entry.type === 'ADD') {
          util.enlivenObjects([entry.json]).then(([obj]) => {
            if (!obj) return;
            c.add(obj);
            const json = obj.toObject(['id', 'pageId']);
            storeByPageRef.current.set(entry.json.id, json);
            rt?.emit(EVENTS.OBJECT_ADD, { json });
            c.requestRenderAll();
          });
        } else if (entry.type === 'REMOVE') {
          const target = findById(entry.json.id);
          if (target) {
            storeByPageRef.current.delete(entry.json.id);
            c.remove(target);
            rt?.emit(EVENTS.OBJECT_REMOVE, { id: entry.json.id });
          }
        } else if (entry.type === 'MODIFY') {
          const target = findById(entry.after.id);
          if (target) {
            target.set(entry.after);
            target.setCoords();
            storeByPageRef.current.set(entry.after.id, entry.after);
            rt?.emit(EVENTS.OBJECT_MODIFY, { json: entry.after });
            c.requestRenderAll();
          }
        } else if (entry.type === 'ERASE_PORTION') {
          entry.removed.forEach((json) => {
            const target = findById(json.id);
            if (target) {
              storeByPageRef.current.delete(json.id);
              c.remove(target);
              rt?.emit(EVENTS.OBJECT_REMOVE, { id: json.id });
            }
          });
          util.enlivenObjects(entry.added).then((objs) => {
            objs.forEach((obj) => {
              if (!obj) return;
              c.add(obj);
              const json = obj.toObject(['id', 'pageId']);
              storeByPageRef.current.set(json.id, json);
              rt?.emit(EVENTS.OBJECT_ADD, { json });
            });
            c.requestRenderAll();
          });
        }
      } finally {
        undoGuard.current = false;
        applyingRemote.current = false;
        c.requestRenderAll();
      }
    };

    // ---- keyboard: delete selection / hold-space to pan / undo & redo ----
    const onKeyDown = (e) => {
      const c = fcRef.current;
      if (!c) return;
      const tag = (e.target && e.target.tagName) || '';
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || c.getActiveObject()?.isEditing;
      if (typing) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        panRef.current.space = true;
        c.defaultCursor = 'grab';
        c.setCursor('grab');
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const active = c.getActiveObject();
        if (!active) return;
        e.preventDefault();
        c.getActiveObjects().forEach((o) => {
          if (o.id) storeByPageRef.current.delete(o.id);
          c.remove(o);
          rtRef.current?.emit(EVENTS.OBJECT_REMOVE, { id: o.id });
        });
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
      const curPage = styleRef.current.currentPageId || 'page-1';
      img.set({ left, top, originX: 'center', originY: 'center', id: uid('image'), pageId: curPage });
      img.__suppressSync = true;
      canvas.add(img);
      delete img.__suppressSync;
      canvas.setActiveObject(img);
      const json = img.toObject(['id', 'pageId']);
      storeByPageRef.current.set(json.id, json);
      rtRef.current?.emit(EVENTS.OBJECT_ADD, { json });
      canvas.requestRenderAll();
    };

    const clearCanvas = () => {
      const curPage = styleRef.current.currentPageId || 'page-1';
      for (const [key, val] of storeByPageRef.current.entries()) {
        if ((val.pageId || 'page-1') === curPage) storeByPageRef.current.delete(key);
      }
      canvas.remove(...canvas.getObjects());
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      rtRef.current?.emit(EVENTS.CANVAS_CLEAR, { pageId: curPage });
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

    const addText = (text, opts = {}) => {
      if (!fcRef.current) return;
      const c = fcRef.current;
      const center = c.getVpCenter();
      const curPage = styleRef.current.currentPageId || 'page-1';
      const obj = createText({ left: center.x - 80, top: center.y - 20, fill: opts.color || '#202124' });
      if (text) obj.set('text', text);
      obj.set({ id: uid('text'), pageId: curPage });
      obj.__suppressSync = true;
      c.add(obj);
      delete obj.__suppressSync;
      c.setActiveObject(obj);
      const json = obj.toObject(['id', 'pageId']);
      storeByPageRef.current.set(json.id, json);
      rtRef.current?.emit(EVENTS.OBJECT_ADD, { json });
      c.requestRenderAll();
    };

    const addCodeNote = (text, opts = {}) => {
      if (!fcRef.current) return;
      const c = fcRef.current;
      const center = c.getVpCenter();
      const curPage = styleRef.current.currentPageId || 'page-1';
      const note = createSticky({ left: center.x - 190, top: center.y - 120, color: opts.color || '#1e293b' });
      note.set({
        id: uid('sticky'),
        pageId: curPage,
        width: 380,
        fontSize: 13,
        fill: '#f8fafc',
        fontFamily: 'Fira Code, JetBrains Mono, Consolas, monospace',
        text: text || 'Code Note',
      });
      note.__suppressSync = true;
      c.add(note);
      delete note.__suppressSync;
      c.setActiveObject(note);
      const json = note.toObject(['id', 'pageId']);
      storeByPageRef.current.set(json.id, json);
      rtRef.current?.emit(EVENTS.OBJECT_ADD, { json });
      c.requestRenderAll();
    };

    setCanvasApi({ getCanvas: () => fcRef.current, addImageFile, clearCanvas, zoomBy, resetView, undo, redo, addText, addCodeNote });




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

  // ------------------------------------------------ switch active canvas page
  useEffect(() => {
    const canvas = fcRef.current;
    if (!canvas) return;
    const curPage = currentPageId || 'page-1';

    // Save currently visible objects first right into storeByPageRef
    canvas.getObjects().forEach((o) => {
      if (o && o.id) {
        if (!o.pageId) o.set('pageId', curPage);
        storeByPageRef.current.set(o.id, o.toObject(['id', 'pageId']));
      }
    });

    applyingRemote.current = true;
    canvas.remove(...canvas.getObjects());
    canvas.discardActiveObject();

    const toLoad = [];
    for (const json of storeByPageRef.current.values()) {
      if ((json.pageId || 'page-1') === curPage) {
        toLoad.push(json);
      }
    }

    if (toLoad.length > 0) {
      util.enlivenObjects(toLoad).then((objects) => {
        if (!fcRef.current) return;
        objects.forEach((obj, idx) => {
          if (obj && toLoad[idx]) {
            obj.set('id', toLoad[idx].id);
            obj.set('pageId', toLoad[idx].pageId || 'page-1');
            fcRef.current.add(obj);
          }
        });
        fcRef.current.requestRenderAll();
        applyingRemote.current = false;
      });
    } else {
      canvas.requestRenderAll();
      applyingRemote.current = false;
    }
  }, [currentPageId]);

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
    canvas.skipTargetFind = tool !== TOOLS.SELECT;

    const targetCursor =
      tool === TOOLS.PAN
        ? 'grab'
        : tool === TOOLS.ERASER
          ? 'crosshair'
          : SHAPE_TOOLS.includes(tool) || tool === TOOLS.STICKY || tool === TOOLS.TEXT || isDraw
            ? 'crosshair'
            : 'default';

    canvas.freeDrawingCursor = 'crosshair';
    canvas.defaultCursor = targetCursor;
    canvas.hoverCursor = tool === TOOLS.PAN ? 'grab' : tool === TOOLS.SELECT ? 'move' : 'crosshair';
    canvas.moveCursor = tool === TOOLS.PAN ? 'grabbing' : 'move';
    canvas.setCursor(targetCursor);
    if (canvas.upperCanvasEl && canvas.upperCanvasEl.style) {
      canvas.upperCanvasEl.style.cursor = targetCursor;
    }
    if (canvas.lowerCanvasEl && canvas.lowerCanvasEl.style) {
      canvas.lowerCanvasEl.style.cursor = targetCursor;
    }
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
    const enliveningIds = new Set();

    let renderAf = null;
    const requestRenderDebounced = () => {
      if (!renderAf && fcRef.current) {
        renderAf = requestAnimationFrame(() => {
          renderAf = null;
          if (fcRef.current) fcRef.current.requestRenderAll();
        });
      }
    };

    const applyModify = ({ json }) => {
      if (!json) return;
      storeByPageRef.current.set(json.id, json);
      const curPage = styleRef.current.currentPageId || 'page-1';
      const objPage = json.pageId || 'page-1';
      const target = findById(json.id);
      if (objPage !== curPage) {
        if (target) {
          applyingRemote.current = true;
          canvas.remove(target);
          requestRenderDebounced();
          applyingRemote.current = false;
        }
        return undefined;
      }
      if (!target) {
        if (!enliveningIds.has(json.id)) applyAdd({ json });
        return undefined;
      }
      applyingRemote.current = true;
      target.set(json);
      if (typeof target.initDimensions === 'function') target.initDimensions();
      target.setCoords();
      requestRenderDebounced();
      applyingRemote.current = false;
      return undefined;
    };
    const applyAdd = async ({ json }) => {
      if (!json || !json.id) return;
      storeByPageRef.current.set(json.id, json);
      const curPage = styleRef.current.currentPageId || 'page-1';
      const objPage = json.pageId || 'page-1';
      if (objPage !== curPage) return;
      const existing = findById(json.id);
      if (existing) {
        applyModify({ json });
        return;
      }
      if (enliveningIds.has(json.id)) return;
      enliveningIds.add(json.id);
      try {
        const [obj] = await util.enlivenObjects([json]);
        enliveningIds.delete(json.id);
        if (!obj || !fcRef.current) return;
        if (findById(json.id)) {
          applyModify({ json });
          return;
        }
        obj.set('id', json.id);
        obj.set('pageId', objPage);
        applyingRemote.current = true;
        canvas.add(obj);
        requestRenderDebounced();
        applyingRemote.current = false;
      } catch {
        enliveningIds.delete(json.id);
      }
    };

    const applySnapshot = async ({ objects }) => {
      if (!Array.isArray(objects) || !fcRef.current) return;
      const curPage = styleRef.current.currentPageId || 'page-1';

      if (objects.length === 0 && storeByPageRef.current.size === 0 && fcRef.current.getObjects().length === 0) {
        const roomId = window.location.hash ? window.location.hash.replace(/^#/, '') : '';
        const slug = getTemplateSlugFromRoomCode(roomId);
        if (slug && slug !== 'blank') {
          const starters = getTemplateStarterObjects(slug);
          starters.forEach((json) => {
            if (json && json.id) {
              storeByPageRef.current.set(json.id, json);
              rtRef.current?.emit(EVENTS.OBJECT_ADD, { json });
            }
          });
          applyingRemote.current = true;
          try {
            const enlivened = await util.enlivenObjects(starters);
            if (!fcRef.current) return;
            enlivened.forEach((obj, idx) => {
              if (obj && starters[idx] && !findById(starters[idx].id)) {
                obj.set('id', starters[idx].id);
                obj.set('pageId', starters[idx].pageId || 'page-1');
                fcRef.current.add(obj);
              }
            });
            requestRenderDebounced();
          } finally {
            applyingRemote.current = false;
          }
          return;
        }
      }

      objects.forEach((json) => {
        if (json && json.id) storeByPageRef.current.set(json.id, json);
      });
      const toLoad = objects.filter((json) => (json.pageId || 'page-1') === curPage && !findById(json.id));
      if (toLoad.length > 0) {
        applyingRemote.current = true;
        try {
          const enlivened = await util.enlivenObjects(toLoad);
          if (!fcRef.current) return;
          enlivened.forEach((obj, idx) => {
            if (obj && toLoad[idx] && !findById(toLoad[idx].id)) {
              obj.set('id', toLoad[idx].id);
              obj.set('pageId', toLoad[idx].pageId || 'page-1');
              fcRef.current.add(obj);
            }
          });
          requestRenderDebounced();
        } finally {
          applyingRemote.current = false;
        }
      }
    };

    const applyRemove = ({ id }) => {
      if (id) storeByPageRef.current.delete(id);
      const target = findById(id);
      if (!target) return;
      applyingRemote.current = true;
      canvas.remove(target);
      requestRenderDebounced();
      applyingRemote.current = false;
    };
    const applyClear = (payload) => {
      const targetPageId = payload?.pageId;
      const curPage = styleRef.current.currentPageId || 'page-1';
      if (targetPageId) {
        for (const [key, val] of storeByPageRef.current.entries()) {
          if ((val.pageId || 'page-1') === targetPageId) storeByPageRef.current.delete(key);
        }
        if (targetPageId === curPage) {
          applyingRemote.current = true;
          canvas.remove(...canvas.getObjects());
          requestRenderDebounced();
          applyingRemote.current = false;
        }
      } else {
        storeByPageRef.current.clear();
        applyingRemote.current = true;
        canvas.remove(...canvas.getObjects());
        requestRenderDebounced();
        applyingRemote.current = false;
      }
    };
    const applyPageList = ({ pages: remotePages }) => {
      if (Array.isArray(remotePages) && remotePages.length > 0) {
        dispatch(setPages(remotePages));
      }
    };

    const unsubs = [
      rt.on(EVENTS.OBJECT_ADD, applyAdd),
      rt.on(EVENTS.OBJECT_MODIFY, applyModify),
      rt.on(EVENTS.OBJECT_REMOVE, applyRemove),
      rt.on(EVENTS.CANVAS_CLEAR, applyClear),
      rt.on(EVENTS.PAGE_LIST, applyPageList),
      rt.on(EVENTS.CANVAS_SNAPSHOT, applySnapshot),
    ];

    const checkTemplateStarterTimeout = setTimeout(async () => {
      if (!fcRef.current) return;
      const roomId = window.location.hash ? window.location.hash.replace(/^#/, '') : '';
      const slug = getTemplateSlugFromRoomCode(roomId);
      if (slug && slug !== 'blank' && storeByPageRef.current.size === 0 && fcRef.current.getObjects().length === 0) {
        const starters = getTemplateStarterObjects(slug);
        starters.forEach((json) => {
          if (json && json.id) {
            storeByPageRef.current.set(json.id, json);
            rtRef.current?.emit(EVENTS.OBJECT_ADD, { json });
          }
        });
        applyingRemote.current = true;
        try {
          const enlivened = await util.enlivenObjects(starters);
          if (!fcRef.current) return;
          enlivened.forEach((obj, idx) => {
            if (obj && starters[idx] && !findById(starters[idx].id)) {
              obj.set('id', starters[idx].id);
              obj.set('pageId', starters[idx].pageId || 'page-1');
              fcRef.current.add(obj);
            }
          });
          requestRenderDebounced();
        } finally {
          applyingRemote.current = false;
        }
      }
    }, 500);

    return () => {
      clearTimeout(checkTemplateStarterTimeout);
      if (renderAf) cancelAnimationFrame(renderAf);
      unsubs.forEach((u) => u && u());
      rtRef.current = null;
    };

  }, [connected]);
}
