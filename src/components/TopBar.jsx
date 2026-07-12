import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Share2, Download, ZoomIn, ZoomOut, LogOut, MessageCircle, Users, Undo2, Redo2, ShieldCheck, Lock, Code2 } from 'lucide-react';
import { getCanvasApi } from '../features/canvas/canvasApi';
import { exportBoardPdf, exportChatPdf } from '../utils/exportPdf';
import { goHome, goToAccount, goToMessages } from '../utils/nav';
import { setActiveTab } from '../features/ui/uiSlice';
import Avatar from './Avatar';
import NotificationBell from './Notifications/NotificationBell';
import RoomSettingsModal from './RoomSettingsModal/RoomSettingsModal';
import styles from './TopBar.module.css';

export default function TopBar() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.session.currentUser);
  const roomId = useSelector((s) => s.session.roomId);
  const roomSettings = useSelector((s) => s.session.roomSettings);
  const zoom = useSelector((s) => s.canvas.zoom);
  const canUndo = useSelector((s) => s.canvas.canUndo);
  const canRedo = useSelector((s) => s.canvas.canRedo);
  const messages = useSelector((s) => s.chat.messages);
  const people = useSelector((s) => s.people.users || []);
  const [copied, setCopied] = useState(false);
  const [roomCopied, setRoomCopied] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt('Copy this room link:', window.location.href);
    }
  };

  const copyRoomId = async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
      setRoomCopied(true);
      setTimeout(() => setRoomCopied(false), 1500);
    } catch {
      window.prompt('Copy room code:', roomId);
    }
  };

  const onBoardPdf = () => {
    const c = getCanvasApi()?.getCanvas();
    if (c) exportBoardPdf(c);
  };

  const openPeople = () => {
    dispatch(setActiveTab('people'));
  };

  // Show up to 4 avatars inside the topbar stack
  const displayAvatars = people.slice(0, 4);
  const extraCount = Math.max(0, people.length - 4);

  return (
    <header className={styles.bar}>
      <button className={styles.brand} onClick={goHome} title="Back to home">
        <img src="/board.svg" className={styles.brandMark} alt="" />
        <span className={styles.brandText}>BOARDROOM</span>
      </button>

      <button
        type="button"
        className={styles.room}
        onClick={() => setShowSettingsModal(true)}
        title="Click to manage Room Name & Admin Entrance Security"
      >
        <span className={styles.roomLabel}>Room ·</span>
        <strong>{roomSettings?.name || roomId || '…'}</strong>
        {roomSettings?.hasPassword ? <Lock size={14} className={styles.secIcon} /> : <ShieldCheck size={14} className={styles.secIcon} />}
      </button>

      <button
        type="button"
        className={styles.copyCodeBtn}
        onClick={copyRoomId}
        title={roomCopied ? 'Code copied!' : 'Copy room code'}
      >
        #{roomId || '…'}
        {roomCopied && <span className={styles.copiedBadge}>Copied!</span>}
      </button>

      {people.length > 0 && (
        <div className={styles.avatarsStack} onClick={openPeople} title="Click to view online members" role="button" tabIndex={0}>
          <div className={styles.avatarGroup}>
            {displayAvatars.map((p, idx) => (
              <div key={p.id || idx} className={styles.avatarItem} style={{ zIndex: 10 - idx }}>
                <Avatar user={p} size={24} />
              </div>
            ))}
            {extraCount > 0 && (
              <div className={styles.avatarMore} style={{ zIndex: 1 }}>
                +{extraCount}
              </div>
            )}
          </div>
          <span className={styles.onlineCount}>{people.length} online</span>
        </div>
      )}

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

      <div className={styles.undoRedoGroup}>
        <button
          type="button"
          className={styles.undoRedoBtn}
          onClick={() => getCanvasApi()?.undo?.()}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={16} />
        </button>
        <button
          type="button"
          className={styles.undoRedoBtn}
          onClick={() => getCanvasApi()?.redo?.()}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={16} />
        </button>
      </div>

      <div className={styles.actions}>
        {user && <NotificationBell />}
        {user && (
          <button className={styles.btn} onClick={goToMessages} title="Messages">
            <MessageCircle size={16} /> <span className={styles.btnLabel}>Messages</span>
          </button>
        )}
        <button
          className={styles.btn}
          onClick={() => dispatch(setActiveTab('code'))}
          title="Open Collaborative Code Compiler & IDE"
          style={{ borderColor: 'rgba(96, 165, 250, 0.4)', color: '#60a5fa' }}
        >
          <Code2 size={16} /> <span className={styles.btnLabel}>Code IDE</span>
        </button>
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

      {showSettingsModal && <RoomSettingsModal onClose={() => setShowSettingsModal(false)} />}
    </header>
  );
}
