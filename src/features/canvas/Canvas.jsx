import { useRef } from 'react';
import { useFabricCanvas } from './useFabricCanvas';
import { getCanvasApi } from './canvasApi';
import styles from './Canvas.module.css';

export default function Canvas() {
  const containerRef = useRef(null);
  const elRef = useRef(null);
  useFabricCanvas({ canvasElRef: elRef, containerRef });

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

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <canvas ref={elRef} />
    </div>
  );
}
