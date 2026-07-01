import { useDispatch, useSelector } from 'react-redux';
import { setStrokeColor, setFillColor, setStickyColor } from '../../features/canvas/canvasSlice';
import { PALETTE, STICKY_COLORS } from '../../features/canvas/tools';
import styles from './Toolbar.module.css';

// A reusable row of color swatches + custom-color input.
function SwatchRow({ label, value, options, onPick, allowCustom = true, none = null }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>{label}</div>
      <div className={styles.swatches}>
        {none && (
          <button
            type="button"
            className={`${styles.swatch} ${styles.swatchNone} ${value === none.value ? styles.swatchActive : ''}`}
            onClick={() => onPick(none.value)}
            aria-label={none.label}
            title={none.label}
          />
        )}
        {options.map((c) => (
          <button
            type="button"
            key={c}
            className={`${styles.swatch} ${value === c ? styles.swatchActive : ''}`}
            style={{ background: c }}
            onClick={() => onPick(c)}
            aria-label={`Use color ${c}`}
          />
        ))}
        {allowCustom && (
          <label className={styles.customColor} title="Custom color">
            <input
              type="color"
              value={value === 'transparent' ? '#ffffff' : value}
              onChange={(e) => onPick(e.target.value)}
            />
          </label>
        )}
      </div>
    </div>
  );
}

export default function ColorPicker() {
  const dispatch = useDispatch();
  const strokeColor = useSelector((s) => s.canvas.strokeColor);
  const fillColor = useSelector((s) => s.canvas.fillColor);
  const stickyColor = useSelector((s) => s.canvas.stickyColor);

  return (
    <>
      <SwatchRow
        label="Stroke / text"
        value={strokeColor}
        options={PALETTE}
        onPick={(c) => dispatch(setStrokeColor(c))}
      />
      <SwatchRow
        label="Shape fill"
        value={fillColor}
        options={PALETTE}
        onPick={(c) => dispatch(setFillColor(c))}
        none={{ value: 'transparent', label: 'No fill' }}
      />
      <SwatchRow
        label="Sticky note"
        value={stickyColor}
        options={STICKY_COLORS}
        onPick={(c) => dispatch(setStickyColor(c))}
        allowCustom={false}
      />
    </>
  );
}
