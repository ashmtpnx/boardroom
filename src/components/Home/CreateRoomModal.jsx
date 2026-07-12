import { useState } from 'react';
import { X, Lock, KeyRound, Sparkles, ArrowRight, ShieldCheck, User } from 'lucide-react';
import { goToRoom, normalizeCode } from '../../utils/nav';
import { roomCode } from '../../utils/ids';
import styles from './CreateRoomModal.module.css';

export default function CreateRoomModal({ onClose }) {
  const [roomName, setRoomName] = useState('');
  const [customCode, setCustomCode] = useState(() => roomCode());
  const [password, setPassword] = useState('');
  const [requirePassword, setRequirePassword] = useState(false);

  const handleLaunch = (e) => {
    e.preventDefault();
    const cleanCode = normalizeCode(customCode) || roomCode();
    
    // Store initial settings temporarily so Board component can send them on room:join
    try {
      sessionStorage.setItem(
        `room_init_${cleanCode}`,
        JSON.stringify({
          name: roomName.trim() || `Board ${cleanCode.toUpperCase()}`,
          password: requirePassword ? password : '',
        })
      );
    } catch (err) {
      // ignore quota issues
    }

    goToRoom(cleanCode);
    onClose?.();
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.iconChip}>
              <Sparkles size={20} className={styles.sparkleIcon} />
            </div>
            <div>
              <h2 className={styles.title}>Create Personal Board</h2>
              <p className={styles.subtitle}>Customize your room name and security entrance</p>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleLaunch} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Personal Room Name</label>
            <input
              type="text"
              className={styles.input}
              placeholder="e.g. Sprint Retrospective Q3, Ashmeet Studio..."
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Room ID / Share Code</label>
            <div className={styles.codeRow}>
              <span className={styles.prefix}>boardroom/#</span>
              <input
                type="text"
                className={styles.codeInput}
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                placeholder="room-code"
                spellCheck={false}
              />
            </div>
          </div>

          <div className={styles.securitySection}>
            <div className={styles.toggleRow} onClick={() => setRequirePassword(!requirePassword)}>
              <div className={styles.toggleLeft}>
                <Lock size={18} className={styles.lockIcon} />
                <div>
                  <div className={styles.toggleTitle}>Admin Password Security</div>
                  <div className={styles.toggleDesc}>Require guests to enter a password to join</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={requirePassword}
                onChange={(e) => setRequirePassword(e.target.checked)}
                className={styles.checkbox}
              />
            </div>

            {requirePassword && (
              <div className={styles.passwordBox}>
                <div className={styles.passwordInputWrapper}>
                  <KeyRound size={16} className={styles.keyIcon} />
                  <input
                    type="text"
                    className={styles.passwordInput}
                    placeholder="Set admin entrance password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className={styles.adminNote}>
                  <ShieldCheck size={14} />
                  <span>As the creator, you automatically become the **Room Admin**.</span>
                </div>
              </div>
            )}
          </div>

          <button type="submit" className={styles.launchBtn}>
            <span>Launch Personal Board</span>
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
