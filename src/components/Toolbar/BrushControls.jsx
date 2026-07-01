import { useDispatch, useSelector } from 'react-redux';
import { setBrushType, setLineWidth } from '../../features/canvas/canvasSlice';
import { BRUSHES } from '../../features/canvas/tools';
import styles from './Toolbar.module.css';

const BRUSH_OPTIONS = [
  { key: BRUSHES.PENCIL, label: 'Pencil' },
  { key: BRUSHES.SPRAY, label: 'Spray' },
  { key: BRUSHES.CIRCLE, label: 'Circle' },
];

export default function BrushControls() {
  const dispatch = useDispatch();
  const brushType = useSelector((s) => s.canvas.brushType);
  const lineWidth = useSelector((s) => s.canvas.lineWidth);

  return (
    <>
      <div className={styles.section}>
        <div className={styles.sectionLabel}>Brush</div>
        <div className={styles.segment}>
          {BRUSH_OPTIONS.map((b) => (
            <button
              type="button"
              key={b.key}
              className={`${styles.segmentBtn} ${brushType === b.key ? styles.segmentActive : ''}`}
              onClick={() => dispatch(setBrushType(b.key))}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionLabel}>
          Width <span className={styles.widthVal}>{lineWidth}px</span>
        </div>
        <input
          type="range"
          min="1"
          max="40"
          value={lineWidth}
          onChange={(e) => dispatch(setLineWidth(Number(e.target.value)))}
          className={styles.range}
        />
      </div>
    </>
  );
}
