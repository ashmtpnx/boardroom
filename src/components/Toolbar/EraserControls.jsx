import { useDispatch, useSelector } from 'react-redux';
import { setEraserWidth } from '../../features/canvas/canvasSlice';
import styles from './Toolbar.module.css';

export default function EraserControls() {
  const dispatch = useDispatch();
  const eraserWidth = useSelector((s) => s.canvas.eraserWidth || 32);

  const presets = [
    { label: 'Small', value: 16 },
    { label: 'Medium', value: 32 },
    { label: 'Big', value: 64 },
  ];

  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>
        Eraser Size <span className={styles.widthVal}>{eraserWidth}px</span>
      </div>
      <div className={styles.segment} style={{ marginBottom: '10px' }}>
        {presets.map((p) => (
          <button
            type="button"
            key={p.label}
            className={`${styles.segmentBtn} ${eraserWidth === p.value ? styles.segmentActive : ''}`}
            onClick={() => dispatch(setEraserWidth(p.value))}
          >
            {p.label}
          </button>
        ))}
      </div>
      <input
        type="range"
        min="8"
        max="120"
        value={eraserWidth}
        onChange={(e) => dispatch(setEraserWidth(Number(e.target.value)))}
        className={styles.range}
      />
    </div>
  );
}
