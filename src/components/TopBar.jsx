import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Share2, Download, ZoomIn, ZoomOut, LogOut } from 'lucide-react';
import { getCanvasApi } from '../features/canvas/canvasApi';
import { exportBoardPdf, exportChatPdf } from '../utils/exportPdf';
import { goHome, goToAccount } from '../utils/nav';
import Avatar from './Avatar';
import styles from './TopBar.module.css';

export default function TopBar() {
  const user = useSelector((s) => s.session.currentUser);
  const roomId = useSelector((s) => s.session.roomId);
  const zoom = useSelector((s) => s.canvas.zoom);
  const messages = useSelector((s) => s.chat.messages);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt('Copy this room link:', window.location.href);
    }
  };

  const onBoardPdf = () => {
    const c = getCanvasApi()?.getCanvas();
    if (c) exportBoardPdf(c);
  };

  return (
    <header className={styles.bar}>
      <button className={styles.brand} onClick={goHome} title="Back to home">
        <img src="/board.svg" className={styles.brandMark} alt="" />
        <span className={styles.brandText}>BOARDROOM</span>
      </button>
      <span className={styles.room} title="Share this room code with collaborators">
        Room · {roomId || '…'}
      </span>

      <div className={styles.zoom}>
        <button className={styles.zoomBtn} onClick={() => getCanvasApi()?.zoomBy(0.9)} aria-label="Zoom out">
          <ZoomOut size={16} />
        </button>
        <button className={styles.zoomVal} onClick={() => getCanvasApi()?.resetView()} title="Reset view">
          {Math.round((zoom || 1) * 100)}%
        </button>
        <button className={styles.zoomBtn} onClick={() => getCanvasApi()?.zoomBy(1.1)} aria-label="Zoom in">
          <ZoomIn size={16} />
        </button>
      </div>

      <div className={styles.spacer} />

      <div className={styles.actions}>
        <button className={styles.btn} onClick={onBoardPdf} title="Export board to PDF">
          <Download size={16} /> <span className={styles.btnLabel}>Board PDF</span>
        </button>
        <button
          className={styles.btn}
          onClick={() => exportChatPdf(messages, { room: roomId })}
          title="Export chat to PDF"
        >
          <Download size={16} /> <span className={styles.btnLabel}>Chat PDF</span>
        </button>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={share} title="Copy room link">
          <Share2 size={16} /> <span className={styles.btnLabel}>{copied ? 'Link copied!' : 'Share'}</span>
        </button>
        <button className={`${styles.btn} ${styles.btnLeave}`} onClick={goHome} title="Leave board">
          <LogOut size={16} /> <span className={styles.btnLabel}>Leave</span>
        </button>
        {user && (
          <button className={styles.avatarBtn} onClick={goToAccount} title={`${user.name} — your account`}>
            <Avatar user={user} size={34} />
          </button>
        )}
      </div>
    </header>
  );
}
