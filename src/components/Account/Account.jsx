import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft, Camera, Trash2, Check, UserPlus, Link2, X, ShieldCheck, LogOut, Mail, Copy, Loader, MessageCircle,
} from 'lucide-react';
import { setUser } from '../../features/session/sessionSlice';
import { saveProfile, clearProfile, applyProfile } from '../../utils/profile';
import { getFriends, addFriend, updateFriend, removeFriend } from '../../utils/friends';
import { accountId, normalizeAccountId } from '../../utils/accountId';
import { lookupAccount } from '../../utils/directory';
import { fileToAvatarDataURL } from '../../utils/imageResize';
import { goHome, newBoardLink, goToFriendChat } from '../../utils/nav';
import { USER_COLORS } from '../../utils/colors';
import { googleEnabled, signInWithGoogle, signOut } from '../../auth/auth';
import Avatar from '../Avatar';
import styles from './Account.module.css';

export default function Account() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.session.currentUser);

  const [name, setName] = useState(user?.name || '');
  const [savedTick, setSavedTick] = useState(false);
  const [error, setError] = useState('');
  const [friends, setFriends] = useState(() => getFriends());
  const [friendAccount, setFriendAccount] = useState('');
  const [friendName, setFriendName] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [addingFriend, setAddingFriend] = useState(false);
  const fileRef = useRef(null);

  // The user's clean, shareable tag (e.g. "BR-4K7P-2QX9") derived from their raw id.
  const myTag = accountId(user?.id || '');

  // On open, re-resolve each friend's public profile from the directory so their
  // current display name and picture show — even if added offline or since changed.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let changed = false;
      for (const f of getFriends()) {
        if (!f.account) continue;
        const res = await lookupAccount(f.account);
        if (cancelled) return;
        if (!res.ok) continue;
        const p = res.profile;
        const patch = {};
        if (p.name && p.name !== f.name) patch.name = p.name;
        if (p.color && p.color !== f.color) patch.color = p.color;
        if ((p.photoURL || null) !== (f.photoURL || null)) patch.photoURL = p.photoURL || null;
        if (Object.keys(patch).length) {
          updateFriend(f.id, patch);
          changed = true;
        }
      }
      if (changed && !cancelled) setFriends(getFriends());
    })();
    return () => { cancelled = true; };
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const onColor = (color) => patchProfile({ color });

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

  const onAddFriend = async () => {
    const acct = friendAccount.trim();
    if (!acct) return;

    const normalized = normalizeAccountId(acct);
    if (!normalized) {
      setError('That account ID doesn’t look right. Expected format: BR-4K7P-2QX9');
      return;
    }
    if (myTag && normalized === myTag) {
      setError('That’s your own account ID.');
      return;
    }
    const existing = getFriends();
    if (existing.some((f) => f.account === normalized)) {
      setError('That friend is already in your list.');
      return;
    }

    setError('');
    setAddingFriend(true);

    // Try to resolve the account ID to a real profile from the server directory.
    // Falls back gracefully when offline — friend is added with just the typed name.
    let name = friendName.trim();
    let color;
    let photoURL = null;

    const result = await lookupAccount(normalized);
    if (result.ok) {
      const p = result.profile;
      if (!name) name = p.name || normalized;
      color = p.color;
      photoURL = p.photoURL || null;
    } else if (!name) {
      name = normalized;
    }

    const list = addFriend({ name, color, photoURL, account: normalized });
    setFriends(list);
    setFriendAccount('');
    setFriendName('');
    setAddingFriend(false);
  };

  const onCopyMyId = async () => {
    try {
      await navigator.clipboard.writeText(myTag);
    } catch {
      window.prompt('Copy your account ID:', myTag);
    }
    setCopiedId('self');
    setTimeout(() => setCopiedId(null), 1600);
  };

  const onRemoveFriend = (id) => setFriends(removeFriend(id));

  const onInvite = async (id) => {
    const link = newBoardLink();
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      window.prompt('Copy this invite link:', link);
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const onReset = () => {
    if (!window.confirm('Reset your profile (name, picture, color) on this device?')) return;
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
        <p className={styles.subtitle}>Manage your profile, picture, and friends. Stored on this device.</p>

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

            <div className={styles.fieldLabel}>Avatar color</div>
            <div className={styles.swatches}>
              {USER_COLORS.map((c) => (
                <button
                  key={c}
                  className={`${styles.swatch} ${user.color === c ? styles.swatchActive : ''}`}
                  style={{ background: c }}
                  onClick={() => onColor(c)}
                  aria-label={`Use ${c}`}
                />
              ))}
            </div>
            <p className={styles.note}>Color is used for your initials when no picture is set, and your presence dot.</p>
          </section>

          {/* ---- account details + friends ---- */}
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

            <section className={styles.card}>
              <div className={styles.cardTitle}>Friends · {friends.length}</div>

              <div className={styles.addRow}>
                <input
                  className={`${styles.input} ${styles.mono}`}
                  placeholder="Add by account ID — e.g. BR-4K7P-2QX9"
                  value={friendAccount}
                  maxLength={20}
                  onChange={(e) => setFriendAccount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onAddFriend()}
                />
                <input
                  className={styles.input}
                  placeholder="Name (optional)"
                  value={friendName}
                  maxLength={40}
                  onChange={(e) => setFriendName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onAddFriend()}
                />
                <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={onAddFriend} disabled={!friendAccount.trim() || addingFriend}>
                  {addingFriend ? <><Loader size={15} className={styles.spin} /> Adding…</> : <><UserPlus size={15} /> Add</>}
                </button>
              </div>
              <p className={styles.note}>Ask a friend for their account ID (shown under Account details) to add them.</p>

              {friends.length === 0 ? (
                <p className={styles.empty}>No friends yet. Add people you collaborate with, then send them an invite link.</p>
              ) : (
                <ul className={styles.friendList}>
                  {friends.map((f) => (
                    <li key={f.id} className={styles.friend}>
                      <Avatar user={f} size={38} />
                      <div className={styles.friendMeta}>
                        <span className={styles.friendName}>{f.name}</span>
                        {f.account && <span className={styles.friendTag}>{f.account}</span>}
                      </div>
                      {f.account && (
                        <button className={styles.iconBtn} onClick={() => goToFriendChat(f.account)} title="Message">
                          <MessageCircle size={16} />
                        </button>
                      )}
                      <button className={styles.iconBtn} onClick={() => onInvite(f.id)} title="Copy a board invite link">
                        {copiedId === f.id ? <Check size={16} /> : <Link2 size={16} />}
                      </button>
                      <button className={styles.iconBtn} onClick={() => onRemoveFriend(f.id)} title="Remove friend">
                        <X size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
