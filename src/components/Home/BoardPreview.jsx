import styles from './Home.module.css';

// A purely decorative, animated mock of a live board — sticky notes, a
// shape, a freehand scribble, and two remote cursors — to sell the product on
// the landing page. No canvas, just styled DOM so it stays crisp and light.
export default function BoardPreview() {
  return (
    <div className={styles.preview} aria-hidden="true">
      <div className={styles.previewDots} />

      {/* freehand scribble + connector */}
      <svg className={styles.previewSvg} viewBox="0 0 420 300" preserveAspectRatio="none">
        <path
          d="M60 210 q25 -45 55 -20 t55 -10 t40 25"
          fill="none" stroke="#6366f1" strokeWidth="4" strokeLinecap="round"
          strokeDasharray="200"
          strokeDashoffset="200"
        >
          <animate attributeName="stroke-dashoffset" from="200" to="0" dur="2s" begin="0.5s" fill="freeze" />
        </path>
        <path
          d="M250 120 L300 175"
          fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round"
          opacity="0"
        >
          <animate attributeName="opacity" from="0" to="1" dur="0.4s" begin="1.8s" fill="freeze" />
        </path>
      </svg>

      {/* rectangle shape */}
      <div className={styles.previewRect} />

      {/* sticky notes */}
      <div className={`${styles.previewSticky} ${styles.stickyA}`}>Roadmap Q3</div>
      <div className={`${styles.previewSticky} ${styles.stickyB}`}>Ship v1 🎉</div>
      <div className={`${styles.previewSticky} ${styles.stickyC}`}>User research</div>

      {/* remote cursors with gentle floating animation */}
      <div className={`${styles.cursor} ${styles.cursorA}`}>
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M1 1l5 14 2-6 6-2z" fill="#34a853" /></svg>
        <span style={{ background: '#34a853' }}>Maya</span>
      </div>
      <div className={`${styles.cursor} ${styles.cursorB}`}>
        <svg width="16" height="16" viewBox="0 0 16 16"><path d="M1 1l5 14 2-6 6-2z" fill="#8b5cf6" /></svg>
        <span style={{ background: '#8b5cf6' }}>Leo</span>
      </div>
    </div>
  );
}
