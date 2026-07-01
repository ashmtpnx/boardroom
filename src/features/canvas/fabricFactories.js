import { Rect, Circle, Triangle, IText, Textbox } from 'fabric';
import { uid } from '../../utils/ids';

// Every object carries a stable `id` so remote peers can match add/modify/remove.
const tag = (obj, type) => {
  obj.set('id', uid(type));
  return obj;
};

const strokeProps = ({ strokeColor, fillColor, lineWidth }) => ({
  fill: fillColor,
  stroke: strokeColor,
  strokeWidth: lineWidth,
  strokeUniform: true,
});

// Shapes start at 1px and are resized as the user drags (see useFabricCanvas).
export function createRect(opts) {
  return tag(new Rect({ left: opts.left, top: opts.top, width: 1, height: 1, ...strokeProps(opts) }), 'rect');
}

export function createCircle(opts) {
  return tag(new Circle({ left: opts.left, top: opts.top, radius: 1, ...strokeProps(opts) }), 'circle');
}

export function createTriangle(opts) {
  return tag(new Triangle({ left: opts.left, top: opts.top, width: 1, height: 1, ...strokeProps(opts) }), 'triangle');
}

export function createText({ left, top, fill }) {
  return tag(
    new IText('Type here', {
      left,
      top,
      fontSize: 24,
      fill: fill || '#202124',
      fontFamily: 'Inter, system-ui, sans-serif',
    }),
    'text',
  );
}

// Sticky note = a fixed-width Textbox with a colored background and soft shadow.
// A single editable object (double-click to edit) keeps creation, dragging, and
// cross-peer sync simple and reliable.
export function createSticky({ left, top, color = '#fff8b8' }) {
  return tag(
    new Textbox('Double-click to edit', {
      left,
      top,
      width: 190,
      fontSize: 16,
      fill: '#3c3c3c',
      fontFamily: 'Inter, system-ui, sans-serif',
      backgroundColor: color,
      textAlign: 'left',
      padding: 12,
      shadow: 'rgba(0,0,0,0.18) 0px 6px 16px',
    }),
    'sticky',
  );
}
