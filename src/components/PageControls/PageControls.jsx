import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { ChevronLeft, ChevronRight, Plus, ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import { setPages, setCurrentPageId } from '../../features/canvas/canvasSlice';
import { getCanvasApi } from '../../features/canvas/canvasApi';
import { getRealtimeClient } from '../../realtime/client';
import { EVENTS } from '../../realtime/events';
import { uid } from '../../utils/ids';
import styles from './PageControls.module.css';

export default function PageControls() {
  const dispatch = useDispatch();
  const pages = useSelector((s) => s.canvas.pages || [{ id: 'page-1', title: 'Page 1' }]);
  const currentPageId = useSelector((s) => s.canvas.currentPageId || 'page-1');

  let currentIndex = pages.findIndex((p) => p.id === currentPageId);
  if (currentIndex === -1) currentIndex = 0;

  const emitPageList = (newPages) => {
    const rt = getRealtimeClient();
    if (rt) {
      rt.emit(EVENTS.PAGE_LIST, { pages: newPages });
    }
  };

  const reindexTitles = (list) => {
    return list.map((p, idx) => {
      if (!p.title || p.title.startsWith('Page ')) {
        return { ...p, title: `Page ${idx + 1}` };
      }
      return p;
    });
  };

  const addPage = () => {
    const newId = uid('page');
    const newPages = reindexTitles([...pages, { id: newId, title: `Page ${pages.length + 1}` }]);
    dispatch(setPages(newPages));
    dispatch(setCurrentPageId(newId));
    emitPageList(newPages);
  };

  const prevPage = () => {
    if (currentIndex > 0 && pages[currentIndex - 1]) {
      dispatch(setCurrentPageId(pages[currentIndex - 1].id));
    }
  };

  const nextPage = () => {
    if (currentIndex < pages.length - 1 && pages[currentIndex + 1]) {
      dispatch(setCurrentPageId(pages[currentIndex + 1].id));
    }
  };

  const moveLeft = () => {
    if (currentIndex <= 0) return;
    const newPages = [...pages];
    const temp = newPages[currentIndex - 1];
    newPages[currentIndex - 1] = newPages[currentIndex];
    newPages[currentIndex] = temp;
    const reindexed = reindexTitles(newPages);
    dispatch(setPages(reindexed));
    emitPageList(reindexed);
  };

  const moveRight = () => {
    if (currentIndex >= pages.length - 1) return;
    const newPages = [...pages];
    const temp = newPages[currentIndex + 1];
    newPages[currentIndex + 1] = newPages[currentIndex];
    newPages[currentIndex] = temp;
    const reindexed = reindexTitles(newPages);
    dispatch(setPages(reindexed));
    emitPageList(reindexed);
  };

  const removePage = () => {
    if (pages.length <= 1) {
      const api = getCanvasApi();
      if (api?.clearCanvas) api.clearCanvas();
      return;
    }
    if (!window.confirm(`Delete ${pages[currentIndex]?.title || 'this page'} and all its drawings?`)) {
      return;
    }
    const targetId = currentPageId;
    const api = getCanvasApi();
    if (api?.clearCanvas) {
      api.clearCanvas();
    } else {
      const rt = getRealtimeClient();
      rt?.emit(EVENTS.CANVAS_CLEAR, { pageId: targetId });
    }

    const filtered = pages.filter((p) => p.id !== targetId);
    const newPages = reindexTitles(filtered);
    const nextIdx = Math.min(currentIndex, newPages.length - 1);
    const nextId = newPages[nextIdx]?.id || 'page-1';

    dispatch(setPages(newPages));
    dispatch(setCurrentPageId(nextId));
    emitPageList(newPages);
  };

  return (
    <div className={styles.controls} role="region" aria-label="Page Controls">
      <div className={styles.navGroup}>
        <button
          type="button"
          onClick={prevPage}
          disabled={currentIndex === 0}
          className={styles.navBtn}
          title="Previous page"
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        <div className={styles.pageIndicator} title={pages[currentIndex]?.title || `Page ${currentIndex + 1}`}>
          <span className={styles.pageTitle}>{pages[currentIndex]?.title || `Page ${currentIndex + 1}`}</span>
          <span className={styles.pageCounter}>
            ({currentIndex + 1}/{pages.length})
          </span>
        </div>

        <button
          type="button"
          onClick={nextPage}
          disabled={currentIndex === pages.length - 1}
          className={styles.navBtn}
          title="Next page"
          aria-label="Next page"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className={styles.divider} />

      <button type="button" onClick={addPage} className={styles.addBtn} title="Add new page">
        <Plus size={15} />
        <span className={styles.addText}>Add page</span>
      </button>

      {pages.length > 1 && (
        <>
          <div className={styles.divider} />

          <div className={styles.actionGroup}>
            <button
              type="button"
              onClick={moveLeft}
              disabled={currentIndex === 0}
              className={styles.iconBtn}
              title="Move page left in order"
              aria-label="Move page left"
            >
              <ArrowLeft size={14} />
            </button>
            <button
              type="button"
              onClick={moveRight}
              disabled={currentIndex === pages.length - 1}
              className={styles.iconBtn}
              title="Move page right in order"
              aria-label="Move page right"
            >
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={removePage}
              className={styles.deleteBtn}
              title="Delete current page"
              aria-label="Delete current page"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
