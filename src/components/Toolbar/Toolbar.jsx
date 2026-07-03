import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  MousePointer2, Pencil, Square, Circle, Triangle,
  StickyNote, Type, ImagePlus, Hand, Eraser, Trash2, Palette,
} from 'lucide-react';
import ToolButton from './ToolButton';
import ColorPicker from './ColorPicker';
import BrushControls from './BrushControls';
import { setTool } from '../../features/canvas/canvasSlice';
import { TOOLS } from '../../features/canvas/tools';
import { getCanvasApi } from '../../features/canvas/canvasApi';
import styles from './Toolbar.module.css';

const TOOL_LIST = [
  { tool: TOOLS.SELECT, icon: MousePointer2, label: 'Select / move' },
  { tool: TOOLS.DRAW, icon: Pencil, label: 'Free draw' },
  { tool: TOOLS.RECT, icon: Square, label: 'Rectangle' },
  { tool: TOOLS.CIRCLE, icon: Circle, label: 'Circle' },
  { tool: TOOLS.TRIANGLE, icon: Triangle, label: 'Triangle' },
  { tool: TOOLS.STICKY, icon: StickyNote, label: 'Sticky note' },
  { tool: TOOLS.TEXT, icon: Type, label: 'Text' },
  { tool: TOOLS.PAN, icon: Hand, label: 'Pan (or hold Space)' },
  { tool: TOOLS.ERASER, icon: Eraser, label: 'Eraser (click to delete)' },
];

export default function Toolbar() {
  const dispatch = useDispatch();
  const activeTool = useSelector((s) => s.canvas.activeTool);
  // Start the style fly-out open on roomy screens, collapsed on phones/tablets
  // where it would otherwise cover most of the canvas.
  const [styleOpen, setStyleOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth > 900,
  );
  const fileRef = useRef(null);

  const onImagePick = (e) => {
    const file = e.target.files?.[0];
    if (file) getCanvasApi()?.addImageFile(file);
    e.target.value = '';
  };

  const onClear = () => {
    if (window.confirm('Clear the entire board for everyone in this room?')) {
      getCanvasApi()?.clearCanvas();
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.palette}>
        <div className={styles.group}>
          {TOOL_LIST.map((t) => (
            <ToolButton
              key={t.tool}
              icon={t.icon}
              label={t.label}
              active={activeTool === t.tool}
              onClick={() => dispatch(setTool(t.tool))}
            />
          ))}
          <ToolButton icon={ImagePlus} label="Add image" onClick={() => fileRef.current?.click()} />
        </div>

        <div className={styles.divider} />
        <ToolButton icon={Palette} label="Style" active={styleOpen} onClick={() => setStyleOpen((v) => !v)} />
        <div className={styles.divider} />
        <ToolButton icon={Trash2} label="Clear board" onClick={onClear} />

        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onImagePick} />
      </div>

      {styleOpen && (
        <div className={styles.stylePanel}>
          <ColorPicker />
          <BrushControls />
        </div>
      )}
    </div>
  );
}
