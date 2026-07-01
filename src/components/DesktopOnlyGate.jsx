import { useIsDesktop } from '../hooks/useIsDesktop';
import styles from './DesktopOnlyGate.module.css';

// BOARDROOM needs a mouse and room to work, so phones/tablets see a notice
// instead of the canvas. Re-evaluates on resize via useIsDesktop.
export default function DesktopOnlyGate({ children }) {
  const isDesktop = useIsDesktop();
  if (isDesktop) return children;

  return (
    <div className={styles.gate}>
      <div className={styles.card}>
        <img src="/board.svg" className={styles.logo} alt="" />
        <div className={styles.brand}>BOARDROOM</div>
        <h1 className={styles.title}>Desktop only</h1>
        <p className={styles.body}>
          The collaborative canvas needs a mouse and a larger screen. Please open this
          link on a laptop or desktop computer to join the board.
        </p>
      </div>
    </div>
  );
}
