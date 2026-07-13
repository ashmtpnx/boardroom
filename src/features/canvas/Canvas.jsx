import { useRef, useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useFabricCanvas } from './useFabricCanvas';
import { getCanvasApi } from './canvasApi';
import { getRealtimeClient } from '../../realtime/client';

import { EVENTS } from '../../realtime/events';
import styles from './Canvas.module.css';

export default function Canvas() {
  const containerRef = useRef(null);
  const elRef = useRef(null);
  useFabricCanvas({ canvasElRef: elRef, containerRef });

  const [peerCursors, setPeerCursors] = useState({});
  const users = useSelector((s) => s.people?.users || []);


  useEffect(() => {
    const rt = getRealtimeClient();
    if (!rt) return undefined;

    const onPeerCursor = (payload, meta) => {
      if (!payload || typeof payload.x !== 'number' || typeof payload.y !== 'number') return;
      const sender = meta?.sender;
      if (!sender) return;
      setPeerCursors((prev) => ({
        ...prev,
        [sender]: { x: payload.x, y: payload.y, timestamp: Date.now() },
      }));
    };

    const unsub = rt.on(EVENTS.ROOM_CURSOR, onPeerCursor);

    const interval = setInterval(() => {
      const now = Date.now();
      setPeerCursors((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [key, val] of Object.entries(next)) {
          if (now - val.timestamp > 3500) {
            delete next[key];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);

    return () => {
      unsub && unsub();
      clearInterval(interval);
    };
  }, []);

  // Drop local images directly onto the board (synced to peers via object:added).
  const onDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    const rect = containerRef.current.getBoundingClientRect();
    const point = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const api = getCanvasApi();
    files.forEach((f) => api?.addImageFile(f, point));
  };

  const vpt = elRef.current?.fabricCanvas?.viewportTransform || [1, 0, 0, 1, 0, 0];

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <canvas ref={elRef} />
      <div className={styles.peerCursorOverlay}>
        {Object.entries(peerCursors).map(([senderId, pos]) => {
          const user = (users || []).find((u) => u && u.id === senderId) || { name: 'Teammate', color: '#4285f4' };

          const screenX = pos.x * vpt[0] + vpt[4];
          const screenY = pos.y * vpt[3] + vpt[5];
          return (
            <div
              key={senderId}
              className={styles.peerCursor}
              style={{
                transform: `translate(${screenX}px, ${screenY}px)`,
              }}
            >
              <svg className={styles.peerArrow} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M5.5 3.21V20.8C5.5 21.6 6.4 22.06 7.03 21.59L11.8 18.04C12.06 17.84 12.38 17.74 12.71 17.74H19.2C20.06 17.74 20.55 16.76 20.02 16.08L6.82 2.87C6.21 2.27 5.5 2.7 5.5 3.21Z"
                  fill={user.color || '#4285f4'}
                  stroke="#ffffff"
                  strokeWidth="1.8"
                />
              </svg>
              <span
                className={styles.peerNamePill}
                style={{ backgroundColor: user.color || '#4285f4' }}
              >
                {user.name || 'Teammate'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

