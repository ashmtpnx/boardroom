import { useState } from 'react';
import { useSelector } from 'react-redux';
import { X, ShieldCheck, KeyRound, Check, Sparkles, AlertCircle } from 'lucide-react';
import { getRealtimeClient } from '../../realtime/client';
import styles from './RoomSettingsModal.module.css';

export default function RoomSettingsModal({ onClose }) {
  const user = useSelector((s) => s.session.currentUser);
  const roomId = useSelector((s) => s.session.roomId);
  const settings = useSelector((s) => s.session.roomSettings);

  const isAdmin = user && settings && (user.id === settings.adminId || !settings.adminId);

  const [name, setName] = useState(settings?.name || roomId || '');
  const [password, setPassword] = useState('');
  const [hasPassword, setHasPassword] = useState(settings?.hasPassword || false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAdmin || saving) return;
    setSaving(true);
    setStatusMsg(null);

    const rt = getRealtimeClient();
    if (!rt) {
      setSaving(false);
      return;
    }

    const res = await rt.updateRoomSettings({
      name: name.trim() || roomId,
      password: hasPassword ? password : '',
    });

    setSaving(false);
    if (res && res.ok) {
      setStatusMsg({ type: 'success', text: 'Room security & personal name updated successfully!' });
      setTimeout(() => onClose?.(), 1500);
    } else {
      setStatusMsg({ type: 'error', text: res?.error || 'Failed to update settings. Make sure you are the Room Admin.' });
    }
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <ShieldCheck size={22} className={styles.adminIcon} />
            <div>
              <h3>Room Security & Admin Settings</h3>
              <span>Personalize this board & manage entrance access</span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        <form onSubmit={handleSave} className={styles.body}>
          {!isAdmin && (
            <div className={styles.readOnlyNotice}>
              <AlertCircle size={18} />
              <span>Only the Room Admin ({settings?.adminName || 'Admin'}) can modify entrance security settings.</span>
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Personal Room Name</label>
            <input
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isAdmin}
              placeholder="e.g. Design Studio 2026..."
            />
          </div>

          <div className={styles.securityBox}>
            <div className={styles.toggleRow}>
              <div className={styles.toggleText}>
                <KeyRound size={18} className={styles.keyIcon} />
                <div>
                  <div className={styles.toggleTitle}>Password Protected Entrance</div>
                  <div className={styles.toggleDesc}>
                    {hasPassword ? 'Password protection is ACTIVE for all new visitors' : 'Room is currently open to anyone with the link'}
                  </div>
                </div>
              </div>
              {isAdmin && (
                <input
                  type="checkbox"
                  checked={hasPassword}
                  onChange={(e) => setHasPassword(e.target.checked)}
                  className={styles.checkbox}
                />
              )}
            </div>

            {hasPassword && isAdmin && (
              <div className={styles.passwordField}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Set or change entrance password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <span className={styles.helpText}>Leave blank to keep current password unchanged</span>
              </div>
            )}
          </div>

          <div className={styles.adminCard}>
            <div className={styles.adminInfo}>
              <span className={styles.adminLabel}>Current Room Admin:</span>
              <span className={styles.adminName}>{settings?.adminName || 'Admin 👑'}</span>
            </div>
            <span className={styles.adminBadge}>{isAdmin ? 'You are Admin 👑' : 'Guest'}</span>
          </div>

          {statusMsg && (
            <div className={statusMsg.type === 'success' ? styles.successAlert : styles.errorAlert}>
              {statusMsg.type === 'success' && <Check size={16} />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Close
            </button>
            {isAdmin && (
              <button type="submit" className={styles.saveBtn} disabled={saving}>
                {saving ? 'Saving...' : 'Save Security Settings'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
