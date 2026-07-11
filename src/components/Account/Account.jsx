import { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft, Camera, Trash2, Check, ShieldCheck, LogOut, Mail, Copy,
} from 'lucide-react';
import { setUser } from '../../features/session/sessionSlice';
import { saveProfile, clearProfile, applyProfile } from '../../utils/profile';
import { accountId } from '../../utils/accountId';
import { fileToAvatarDataURL } from '../../utils/imageResize';
import { goHome } from '../../utils/nav';
import { googleEnabled, signInWithGoogle, signOut } from '../../auth/auth';
import Avatar from '../Avatar';
import styles from './Account.module.css';

export default function Account() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.session.currentUser);

  const [name, setName] = useState(user?.name || '');
  const [savedTick, setSavedTick] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const fileRef = useRef(null);

  // The user's clean, shareable tag (e.g. "BR-4K7P-2QX9") derived from their raw id.
  const myTag = accountId(user?.id || '');

  // Persist a profile patch both to localStorage and the live session user.
  const patchProfile = (patch) => {
    saveProfile(user.id, patch);
    dispatch(setUser({ ...user, ...patch }));
  };

  const onSaveName = () => {
    const clean = name.trim();
    if (!clean) {
      setError('Name can’t be empty.');
      return;
    }
    setError('');
    patchProfile({ name: clean });
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1600);
  };

  const onPickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataURL(file);
      patchProfile({ photoURL: dataUrl });
      setError('');
    } catch (err) {
      setError(err.message || 'Could not use that image.');
    }
  };

  const onRemovePhoto = () => patchProfile({ photoURL: null });

  const onCopyMyId = async () => {
    try {
      await navigator.clipboard.writeText(myTag);
    } catch {
      window.prompt('Copy your account ID:', myTag);
    }
    setCopiedId('self');
    setTimeout(() => setCopiedId(null), 1600);
  };

  const onReset = () => {
    if (!window.confirm('Reset your profile (name, picture) on this device?')) return;
    clearProfile(user.id);
    const base = { ...user, photoURL: null };
    dispatch(setUser(base));
    setName(base.name);
  };

  const onSignOut = async () => {
    await signOut();
    dispatch(setUser(null)); // Root shows the login screen
    goHome();
  };

  const onUpgradeToGoogle = async () => {
    try {
      const u = await signInWithGoogle();
      dispatch(setUser(applyProfile(u)));
      setName(u.name);
      setError('');
    } catch (err) {
      setError(err?.message || 'Google sign-in failed.');
    }
  };

  if (!user) return null;

  const isGuest = user.provider !== 'google';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button className={styles.back} onClick={goHome}>
          <ArrowLeft size={18} /> Home
        </button>
        <div className={styles.brand}>
          <img src="/board.svg" className={styles.brandMark} alt="" />
          <span>BOARDROOM</span>
        </div>
      </header>

      <main className={styles.main}>
        <h1 className={styles.title}>Your account</h1>
        <p className={styles.subtitle}>Manage your profile, picture, and account. Stored on this device.</p>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.grid}>
          {/* ---- profile card ---- */}
          <section className={styles.card}>
            <div className={styles.cardTitle}>Profile</div>

            <div className={styles.avatarRow}>
              <div className={styles.avatarWrap}>
                <Avatar user={user} size={92} />
                <button className={styles.avatarEdit} onClick={() => fileRef.current?.click()} title="Change picture">
                  <Camera size={16} />
                </button>
              </div>
              <div className={styles.avatarActions}>
                <button className={styles.btn} onClick={() => fileRef.current?.click()}>
                  <Camera size={15} /> Upload photo
                </button>
                {user.photoURL && (
                  <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onRemovePhoto}>
                    <Trash2 size={15} /> Remove
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickPhoto} />
              </div>
            </div>

            <label className={styles.fieldLabel} htmlFor="displayName">Display name</label>
            <div className={styles.nameRow}>
              <input
                id="displayName"
                className={styles.input}
                value={name}
                maxLength={40}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSaveName()}
              />
              <button
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={onSaveName}
                disabled={name.trim() === (user.name || '') || !name.trim()}
              >
                {savedTick ? <><Check size={15} /> Saved</> : 'Save'}
              </button>
            </div>
          </section>

          {/* ---- account details ---- */}
          <div className={styles.col}>
            <section className={styles.card}>
              <div className={styles.cardTitle}>Account details</div>
              <dl className={styles.details}>
                <div className={styles.detailRow}>
                  <dt>Sign-in method</dt>
                  <dd className={styles.provider}>
                    <ShieldCheck size={15} />
                    {user.provider === 'google' ? 'Google' : 'Guest (no sign-up)'}
                  </dd>
                </div>
                {user.email && (
                  <div className={styles.detailRow}>
                    <dt>Email</dt>
                    <dd className={styles.email}><Mail size={14} /> {user.email}</dd>
                  </div>
                )}
                <div className={styles.detailRow}>
                  <dt>Account ID</dt>
                  <dd className={styles.accountId}>
                    <span className={styles.mono}>{myTag}</span>
                    <button className={styles.iconBtn} onClick={onCopyMyId} title="Copy your account ID">
                      {copiedId === 'self' ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </dd>
                </div>
              </dl>

              {isGuest && googleEnabled && (
                <button className={`${styles.btn} ${styles.btnGoogle}`} onClick={onUpgradeToGoogle}>
                  Sign in with Google
                </button>
              )}

              <div className={styles.accountFooter}>
                <button className={`${styles.btn} ${styles.btnDanger}`} onClick={onReset}>
                  Reset profile
                </button>
                <button className={`${styles.btn} ${styles.btnSignout}`} onClick={onSignOut}>
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
