import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Lock, ArrowRight, ShieldAlert, KeyRound, ArrowLeft } from 'lucide-react';
import { clearPasswordRequired, setPasswordRequired } from '../../features/session/sessionSlice';
import { getRealtimeClient } from '../../realtime/client';
import { goHome } from '../../utils/nav';
import styles from './RoomLockScreen.module.css';

export default function RoomLockScreen({ roomId, roomName, adminName, error }) {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.session.currentUser);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleUnlock = async (e) => {
    e?.preventDefault();
    if (!password.trim() || loading) return;
    setLoading(true);

    const rt = getRealtimeClient();
    if (rt) {
      rt.disconnect();
      dispatch(clearPasswordRequired());
      rt.connect(roomId, user, {
        password,
        onPasswordRequired: (info) => {
          setLoading(false);
          dispatch(setPasswordRequired({ ...info, error: 'Incorrect room password. Please try again.' }));
        },
        onSettings: (settings) => {
          setLoading(false);
          dispatch({ type: 'session/setRoomSettings', payload: settings });
        },
      });
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconCircle}>
          <Lock size={32} className={styles.lockIcon} />
        </div>
        <span className={styles.badge}>Security · Admin Protected</span>
        <h1 className={styles.title}>{roomName || roomId}</h1>
        <p className={styles.subtitle}>
          This room is secured with a private entrance password set by the Room Admin{' '}
          {adminName ? <strong>({adminName})</strong> : ''}.
        </p>

        {error && (
          <div className={styles.errorAlert}>
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUnlock} className={styles.form}>
          <div className={styles.inputWrapper}>
            <KeyRound size={18} className={styles.inputIcon} />
            <input
              type="password"
              className={styles.input}
              placeholder="Enter room password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={!password.trim() || loading}>
            {loading ? 'Verifying...' : 'Enter Room'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <button type="button" className={styles.backBtn} onClick={goHome}>
          <ArrowLeft size={16} /> Back to Home
        </button>
      </div>
    </div>
  );
}
