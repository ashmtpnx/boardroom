import { useState, useEffect, useRef } from 'react';
import { Pencil, StickyNote, Square, Smile, Sparkles, RefreshCw, Check } from 'lucide-react';
import styles from './Home.module.css';

// An interactive, dynamic mini-playground right on the hero landing page.
// Visitors can actually drag sticky notes, drop new items, toggle tools, and
// watch simulated real-time collaborators (Maya & Leo) interact live.
export default function BoardPreview() {
  const [activeTool, setActiveTool] = useState('select');
  const [notes, setNotes] = useState([
    { id: 1, text: 'Roadmap Q3', left: 58, top: 24, color: '#fff3a8', rot: 3, author: 'You' },
    { id: 2, text: 'Ship v2 PRO 🎉', left: 24, top: 62, color: '#cdeafe', rot: -4, author: 'Maya' },
    { id: 3, text: 'Zero latency engine', left: 66, top: 68, color: '#d8ffd6', rot: -2, author: 'Leo' },
  ]);
  const [shapes, setShapes] = useState([
    { id: 's1', type: 'rect', left: 16, top: 22, width: 32, height: 28, color: '#ea4335' },
  ]);
  const [reactions, setReactions] = useState([]);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [remoteCursors, setRemoteCursors] = useState([
    { id: 'maya', name: 'Maya', x: 45, y: 35, color: '#10b981', action: 'Drawing...' },
    { id: 'leo', name: 'Leo', x: 72, y: 55, color: '#8b5cf6', action: 'Typing note' },
  ]);
  const containerRef = useRef(null);

  // Simulated live remote activity (Maya & Leo gliding and interacting)
  useEffect(() => {
    const interval = setInterval(() => {
      setRemoteCursors((prev) =>
        prev.map((c) => {
          const nextX = Math.max(15, Math.min(85, c.x + (Math.random() * 24 - 12)));
          const nextY = Math.max(20, Math.min(80, c.y + (Math.random() * 24 - 12)));
          return { ...c, x: nextX, y: nextY };
        })
      );
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  // Handle note dragging inside the sandbox container
  const startDrag = (e, note) => {
    e.stopPropagation();
    if (activeTool !== 'select') return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDraggingId(note.id);
    setDragOffset({
      x: ((e.clientX - rect.left) / rect.width) * 100 - note.left,
      y: ((e.clientY - rect.top) / rect.height) * 100 - note.top,
    });
  };

  const handlePointerMove = (e) => {
    if (draggingId === null) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nextLeft = Math.max(4, Math.min(82, ((e.clientX - rect.left) / rect.width) * 100 - dragOffset.x));
    const nextTop = Math.max(16, Math.min(80, ((e.clientY - rect.top) / rect.height) * 100 - dragOffset.y));
    setNotes((prev) =>
      prev.map((n) => (n.id === draggingId ? { ...n, left: nextLeft, top: nextTop } : n))
    );
  };

  const stopDrag = () => {
    setDraggingId(null);
  };

  // Add new item on sandbox click depending on active tool
  const handleContainerClick = (e) => {
    if (draggingId !== null) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    if (activeTool === 'note') {
      const colors = ['#fff3a8', '#cdeafe', '#ffd6e0', '#d8ffd6', '#f3e8ff'];
      const randomColor = colors[notes.length % colors.length];
      const newNote = {
        id: Date.now(),
        text: 'New Idea ✨',
        left: Math.max(5, Math.min(78, clickX - 10)),
        top: Math.max(18, Math.min(78, clickY - 8)),
        color: randomColor,
        rot: Math.round(Math.random() * 8 - 4),
        author: 'You',
      };
      setNotes((prev) => [...prev, newNote]);
      setActiveTool('select');
    } else if (activeTool === 'shape') {
      const newShape = {
        id: 's' + Date.now(),
        type: 'rect',
        left: Math.max(5, Math.min(80, clickX - 12)),
        top: Math.max(18, Math.min(78, clickY - 10)),
        width: 28,
        height: 24,
        color: '#3b82f6',
      };
      setShapes((prev) => [...prev, newShape]);
      setActiveTool('select');
    } else if (activeTool === 'reaction') {
      const emojis = ['🔥', '⚡', '🎉', '💡', '🚀', '💜', '✨'];
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      const newRx = { id: Date.now(), emoji, left: clickX, top: clickY };
      setReactions((prev) => [...prev, newRx]);
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== newRx.id));
      }, 2000);
    }
  };

  const resetSandbox = (e) => {
    e.stopPropagation();
    setNotes([
      { id: 1, text: 'Roadmap Q3', left: 58, top: 24, color: '#fff3a8', rot: 3, author: 'You' },
      { id: 2, text: 'Ship v2 PRO 🎉', left: 24, top: 62, color: '#cdeafe', rot: -4, author: 'Maya' },
      { id: 3, text: 'Zero latency engine', left: 66, top: 68, color: '#d8ffd6', rot: -2, author: 'Leo' },
    ]);
    setShapes([{ id: 's1', type: 'rect', left: 16, top: 22, width: 32, height: 28, color: '#ea4335' }]);
    setReactions([]);
  };

  return (
    <div
      ref={containerRef}
      className={styles.preview}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDrag}
      onPointerLeave={stopDrag}
      onClick={handleContainerClick}
    >
      <div className={styles.previewDots} />

      {/* Top Sandbox Header & Live Status */}
      <div className={styles.sandboxHeader} onClick={(e) => e.stopPropagation()}>
        <div className={styles.sandboxStatus}>
          <span className={styles.sandboxPulse} />
          <span className={styles.sandboxTitle}>Interactive Sandbox</span>
          <span className={styles.sandboxHint}>Try dragging & dropping items</span>
        </div>
        <button className={styles.sandboxResetBtn} onClick={resetSandbox} title="Reset Sandbox">
          <RefreshCw size={12} /> Reset
        </button>
      </div>

      {/* Sandbox Mini Toolbar */}
      <div className={styles.sandboxToolbar} onClick={(e) => e.stopPropagation()}>
        <button
          className={`${styles.sandboxToolBtn} ${activeTool === 'select' ? styles.sandboxToolActive : ''}`}
          onClick={() => setActiveTool('select')}
          title="Select & Drag tool"
        >
          👆 Select
        </button>
        <button
          className={`${styles.sandboxToolBtn} ${activeTool === 'note' ? styles.sandboxToolActive : ''}`}
          onClick={() => setActiveTool('note')}
          title="Click canvas to drop sticky note"
        >
          <StickyNote size={13} /> +Note
        </button>
        <button
          className={`${styles.sandboxToolBtn} ${activeTool === 'shape' ? styles.sandboxToolActive : ''}`}
          onClick={() => setActiveTool('shape')}
          title="Click canvas to drop shape"
        >
          <Square size={13} /> +Shape
        </button>
        <button
          className={`${styles.sandboxToolBtn} ${activeTool === 'reaction' ? styles.sandboxToolActive : ''}`}
          onClick={() => setActiveTool('reaction')}
          title="Click canvas to trigger live emoji burst"
        >
          <Smile size={13} /> React
        </button>
      </div>

      {/* Freehand scribble + connector */}
      <svg className={styles.previewSvg} viewBox="0 0 420 300" preserveAspectRatio="none">
        <path
          d="M70 200 q25 -40 55 -18 t55 -8 t40 22"
          fill="none" stroke="#6366f1" strokeWidth="3.5" strokeLinecap="round"
          strokeDasharray="200"
          strokeDashoffset="200"
        >
          <animate attributeName="stroke-dashoffset" from="200" to="0" dur="2s" begin="0.5s" fill="freeze" />
        </path>
        <path
          d="M240 130 L285 175"
          fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round"
          opacity="0"
        >
          <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="1.6s" fill="freeze" />
        </path>
      </svg>

      {/* Shapes */}
      {shapes.map((s) => (
        <div
          key={s.id}
          className={styles.previewShape}
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.width}%`,
            height: `${s.height}%`,
            borderColor: s.color,
          }}
        />
      ))}

      {/* Sticky notes */}
      {notes.map((note) => (
        <div
          key={note.id}
          className={`${styles.previewSticky} ${draggingId === note.id ? styles.previewStickyDragging : ''}`}
          style={{
            left: `${note.left}%`,
            top: `${note.top}%`,
            background: note.color,
            transform: `rotate(${note.rot}deg) ${draggingId === note.id ? 'scale(1.08)' : 'scale(1)'}`,
            cursor: activeTool === 'select' ? 'grab' : 'pointer',
          }}
          onPointerDown={(e) => startDrag(e, note)}
        >
          <div className={styles.stickyText}>{note.text}</div>
          <div className={styles.stickyAuthorBadge}>{note.author}</div>
        </div>
      ))}

      {/* Floating Emoji Reaction Bursts */}
      {reactions.map((r) => (
        <div
          key={r.id}
          className={styles.previewReactionBurst}
          style={{ left: `${r.left}%`, top: `${r.top}%` }}
        >
          {r.emoji}
        </div>
      ))}

      {/* Remote live cursors with dynamic presence badges */}
      {remoteCursors.map((c) => (
        <div
          key={c.id}
          className={styles.remoteCursor}
          style={{
            left: `${c.x}%`,
            top: `${c.y}%`,
            transition: 'left 2.8s cubic-bezier(0.22, 1, 0.36, 1), top 2.8s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 16 16">
            <path d="M1 1l5 14 2-6 6-2z" fill={c.color} />
          </svg>
          <div className={styles.remoteCursorBadge} style={{ background: c.color }}>
            <span>{c.name}</span>
            <span className={styles.remoteCursorAction}>{c.action}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

