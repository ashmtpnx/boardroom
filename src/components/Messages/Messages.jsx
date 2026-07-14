import { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  ArrowLeft,
  UserPlus,
  MessageSquare,
  Search,
  X,
  Copy,
  Check,
  Loader,
  ShieldCheck,
  Phone,
  Video,
  Info,
  Edit3,
  Sparkles,
} from 'lucide-react';
import { getFriends, removeFriend, FRIENDS_EVENT } from '../../utils/friends';
import { accountId, normalizeAccountId } from '../../utils/accountId';
import { lookupAccount } from '../../utils/directory';
import { sendFriendRequest } from '../../utils/friendRequests';
import { getOutgoing, removeOutgoing, REQUESTS_EVENT } from '../../utils/requests';
import { listConversations } from '../../utils/dm';
import { NOTIFICATIONS_EVENT } from '../../utils/notifications';
import { goHome } from '../../utils/nav';
import Avatar from '../Avatar';
import NotificationBell from '../Notifications/NotificationBell';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import ChatThread from '../Chat/ChatThread';
import styles from './Messages.module.css';

function relTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.round(hr / 24);
  return day === 1 ? '1d' : `${day}d`;
}

const SAMPLE_FRIEND_NOTES = [
  { note: 'Friday feeling... 🎉' },
  { note: 'Building cool stuff 💻' },
  { note: 'Vibe check ✨' },
  { note: 'Apna Bana... 🎶' },
];

export default function Messages() {
  const me = useSelector((s) => s.session.currentUser);
  const [rows, setRows] = useState(() => listConversations(getFriends()));
  const [pending, setPending] = useState(() => getOutgoing());
  const [query, setQuery] = useState('');

  // Instagram Split View & Tabs State
  const [activeTag, setActiveTag] = useState(null);
  const [activeTab, setActiveTab] = useState('primary'); // 'primary' | 'general' | 'requests'
  const [myNote, setMyNote] = useState(() => localStorage.getItem('boardroom:mynote') || '');

  // add-friend panel
  const [showAdd, setShowAdd] = useState(false);
  const [friendAccount, setFriendAccount] = useState('');
  const [friendName, setFriendName] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');
  const [copied, setCopied] = useState(false);

  const myTag = accountId(me?.id || '');

  const refresh = () => {
    setRows(listConversations(getFriends()));
    setPending(getOutgoing());
  };

  useEffect(() => {
    refresh();
    const events = ['focus', 'storage', REQUESTS_EVENT, FRIENDS_EVENT, NOTIFICATIONS_EVENT];
    events.forEach((e) => window.addEventListener(e, refresh));
    return () => events.forEach((e) => window.removeEventListener(e, refresh));
  }, []);

  const onAddFriend = async () => {
    const normalized = normalizeAccountId(friendAccount);
    if (!normalized) {
      setError('That account ID doesn’t look right. Expected format: BR-4K7P-2QX9');
      return;
    }

    setError('');
    setSent('');
    setAdding(true);

    let name = friendName.trim();
    const result = await lookupAccount(normalized);
    if (result.ok && !name) name = result.profile.name || normalized;

    const res = await sendFriendRequest(me, normalized, name);
    setAdding(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setFriendAccount('');
    setFriendName('');
    setSent(`Request sent. You can message them once they accept.`);
    refresh();
  };

  const onRemove = (e, friend) => {
    e.stopPropagation();
    if (!window.confirm(`Remove ${friend.name} from your messages? Your chat history stays on this device.`)) return;
    removeFriend(friend.id);
    if (activeTag === (friend.account || friend.id)) {
      setActiveTag(null);
    }
    refresh();
  };

  const onCopyMyId = async () => {
    try {
      await navigator.clipboard.writeText(myTag);
    } catch {
      window.prompt('Copy your account ID:', myTag);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const onSetMyNote = () => {
    const next = window.prompt('Share a thought with your friends (max 60 chars):', myNote);
    if (next !== null) {
      const trimmed = next.trim().slice(0, 60);
      localStorage.setItem('boardroom:mynote', trimmed);
      setMyNote(trimmed);
    }
  };

  const q = query.trim().toLowerCase();
  const shown = q
    ? rows.filter(
        (r) =>
          (r.friend.name || '').toLowerCase().includes(q) ||
          (r.tag || '').toLowerCase().includes(q),
      )
    : rows;

  const activeFriendRow = useMemo(
    () => rows.find((r) => r.tag === activeTag),
    [rows, activeTag],
  );

  return (
    <div className={styles.instagramSplitPage}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.back} onClick={goHome} aria-label="Back to home">
            <ArrowLeft size={18} /> <span>Home</span>
          </button>
          <div className={styles.titleGroup}>
            <h1 className={styles.title}>Messages</h1>
            <span className={styles.e2eBadge}>
              <ShieldCheck size={12} className={styles.e2eIcon} /> E2E Encrypted
            </span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <ThemeToggle />
          <NotificationBell />
          <button
            className={`${styles.addBtn} ${showAdd ? styles.addBtnOpen : ''}`}
            onClick={() => { setShowAdd((v) => !v); setError(''); setSent(''); }}
            title={showAdd ? 'Close' : 'Add a friend or share ID'}
            aria-label={showAdd ? 'Close add friend' : 'Add a friend'}
          >
            {showAdd ? <X size={18} /> : <UserPlus size={18} />}
          </button>
        </div>
      </header>

      <div className={styles.splitBody}>
        {/* Left Sidebar Pane (Hidden on phone when a chat is selected) */}
        <aside className={`${styles.sidebarPane} ${activeTag ? styles.sidebarHidden : ''}`}>
          <div className={styles.sidebarHeader}>
            <div className={styles.sidebarUserGroup} title="Your Instagram Direct Inbox">
              <Sparkles size={18} color="#6366f1" />
              <span>{me?.name || 'boardroom_user'}</span>
            </div>
            <div className={styles.sidebarActions}>
              <button
                type="button"
                className={styles.addBtn}
                onClick={() => setShowAdd(!showAdd)}
                title="New Chat / Add Teammate"
              >
                <Edit3 size={16} />
              </button>
            </div>
          </div>

          <div className={styles.instagramTabs}>
            <button
              type="button"
              className={`${styles.instagramTab} ${activeTab === 'primary' ? styles.instagramTabActive : ''}`}
              onClick={() => setActiveTab('primary')}
            >
              Primary
            </button>
            <button
              type="button"
              className={`${styles.instagramTab} ${activeTab === 'general' ? styles.instagramTabActive : ''}`}
              onClick={() => setActiveTab('general')}
            >
              General
            </button>
            <button
              type="button"
              className={`${styles.instagramTab} ${activeTab === 'requests' ? styles.instagramTabActive : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              Requests {pending.length > 0 && `(${pending.length})`}
            </button>
          </div>

          {activeTab !== 'requests' && (
            <div className={styles.notesCarousel}>
              {/* My Note */}
              <div className={styles.noteItem} onClick={onSetMyNote} title="Click to share your note">
                <div className={styles.noteAvatarWrap}>
                  <div className={styles.noteBubble}>
                    {myNote || 'Your note +'}
                  </div>
                  <Avatar user={me} size={56} />
                </div>
                <span className={styles.noteName}>Your note</span>
              </div>

              {/* Friends Notes */}
              {rows.slice(0, 8).map((r, idx) => {
                const sampleNote = SAMPLE_FRIEND_NOTES[idx % SAMPLE_FRIEND_NOTES.length].note;
                return (
                  <div
                    key={r.tag}
                    className={styles.noteItem}
                    onClick={() => setActiveTag(r.tag)}
                    title={`Message ${r.friend.name}`}
                  >
                    <div className={styles.noteAvatarWrap}>
                      <div className={styles.noteBubble}>{sampleNote}</div>
                      <Avatar user={{ ...r.friend, id: r.friend.id || r.tag, account: r.tag }} size={56} />
                    </div>
                    <span className={styles.noteName}>{r.friend.name?.split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>
          )}

          {showAdd && (
            <div className={styles.addPanel}>
              <div className={styles.addPanelHeader}>
                <span className={styles.addPanelTitle}>Share Account ID or Add Teammates</span>
                <span className={styles.addPanelHint}>Direct messages sync in real-time across your devices</span>
              </div>
              <div className={styles.yourId}>
                <div className={styles.yourIdMeta}>
                  <span className={styles.yourIdLabel}>Your Account ID</span>
                  <span className={styles.mono}>{myTag}</span>
                </div>
                <button className={styles.copyBtn} onClick={onCopyMyId} title="Copy your account ID">
                  {copied ? <><Check size={15} className={styles.checkIcon} /> Copied!</> : <><Copy size={15} /> Copy ID</>}
                </button>
              </div>

              <div className={styles.addRow}>
                <input
                  className={`${styles.field} ${styles.mono}`}
                  placeholder="Friend's ID — e.g. BR-4K7P-2QX9"
                  value={friendAccount}
                  maxLength={20}
                  autoFocus
                  onChange={(e) => setFriendAccount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onAddFriend()}
                />
                <input
                  className={styles.field}
                  placeholder="Name (optional nickname)"
                  value={friendName}
                  maxLength={40}
                  onChange={(e) => setFriendName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onAddFriend()}
                />
                <button
                  className={styles.addConfirm}
                  onClick={onAddFriend}
                  disabled={!friendAccount.trim() || adding}
                >
                  {adding ? <><Loader size={15} className={styles.spin} /> Sending…</> : <><UserPlus size={15} /> Send Request</>}
                </button>
              </div>
              {error && <p className={styles.error}>{error}</p>}
              {sent && <p className={styles.sent}>{sent}</p>}
            </div>
          )}

          {rows.length > 0 && activeTab !== 'requests' && (
            <div className={styles.searchRow}>
              <Search size={16} className={styles.searchIcon} />
              <input
                className={styles.search}
                placeholder="Search conversations..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search conversations"
              />
            </div>
          )}

          <div className={styles.sidebarScroller}>
            {activeTab === 'requests' ? (
              pending.length > 0 ? (
                <div className={styles.pending}>
                  <div className={styles.pendingLabel}>Sent Requests · Waiting for Acceptance</div>
                  <ul className={styles.pendingList}>
                    {pending.map((r) => (
                      <li key={r.toTag} className={styles.pendingRow}>
                        <Avatar user={{ id: r.toTag, account: r.toTag, name: r.name, color: r.color, photoURL: r.photoURL }} size={36} />
                        <div className={styles.pendingInfo}>
                          <span className={styles.pendingName}>{r.name || r.toTag}</span>
                          <span className={styles.pendingSub}>{r.toTag}</span>
                        </div>
                        <div className={styles.pendingActions}>
                          <span className={styles.pendingState}><Loader size={13} className={styles.spin} /> Requested</span>
                          <button
                            type="button"
                            className={styles.pendingCancelBtn}
                            onClick={(e) => { e.stopPropagation(); removeOutgoing(r.toTag); refresh(); }}
                            title="Cancel request"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className={styles.empty}>
                  <p className={styles.emptyBody} style={{ margin: '30px auto', textAlign: 'center' }}>
                    No pending message requests right now.
                  </p>
                </div>
              )
            ) : rows.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}><MessageSquare size={34} /></div>
                <h2 className={styles.emptyTitle}>Your Encrypted Inbox</h2>
                <p className={styles.emptyBody}>
                  Direct messages in Boardroom use end-to-end encryption. Add a friend or teammate by their Account ID (`BR-XXXX-YYYY`) to begin sharing notes, snippets, or whiteboards.
                </p>
                <button className={styles.emptyCta} onClick={() => { setShowAdd(true); setError(''); }}>
                  <UserPlus size={16} /> Start a Conversation
                </button>
              </div>
            ) : shown.length === 0 ? (
              <p className={styles.noResults}>No conversations match “{query}”.</p>
            ) : (
              <ul className={styles.list}>
                {shown.map((r) => {
                  const mine = r.lastUserId && me?.id && r.lastUserId === me.id;
                  const isRecent = r.lastTs > 0 && Date.now() - r.lastTs < 15 * 60 * 1000;
                  const isActive = activeTag === r.tag;
                  return (
                    <li key={r.friend.id} className={styles.rowWrap}>
                      <button
                        className={`${styles.sidebarRow} ${isActive ? styles.sidebarRowActive : ''}`}
                        onClick={() => setActiveTag(r.tag)}
                        title={`Message ${r.friend.name}`}
                      >
                        <div className={styles.avatarWrap}>
                          <Avatar user={{ ...r.friend, id: r.friend.id || r.tag, account: r.tag }} size={52} />
                          {isRecent && <span className={styles.onlineDot} title="Active recently" />}
                        </div>
                        <div className={styles.meta}>
                          <div className={styles.metaTop}>
                            <span className={styles.name}>{r.friend.name}</span>
                            {r.lastTs > 0 && <span className={styles.time}>{relTime(r.lastTs)}</span>}
                          </div>
                          <div className={styles.preview}>
                            {r.lastText
                              ? <>{mine && <span className={styles.you}>You: </span>}{r.lastText}</>
                              : <span className={styles.dim}>Tap to send photo or voice note</span>}
                          </div>
                        </div>
                      </button>
                      <button
                        className={styles.rowRemove}
                        onClick={(e) => onRemove(e, r.friend)}
                        title="Remove conversation"
                        aria-label={`Remove ${r.friend.name}`}
                      >
                        <X size={16} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Right Active Chat Pane (Hidden on phone when no chat is selected) */}
        <section className={`${styles.chatPane} ${!activeTag ? styles.chatPaneHidden : ''}`}>
          {activeTag ? (
            <>
              <header className={styles.chatTopBar}>
                <div className={styles.chatPeerGroup} onClick={() => {}}>
                  <button
                    type="button"
                    className={styles.back}
                    style={{ marginRight: 8, display: window.innerWidth < 768 ? 'inline-flex' : 'none' }}
                    onClick={() => setActiveTag(null)}
                    aria-label="Back to conversations list"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <Avatar
                    user={{
                      ...(activeFriendRow?.friend || {}),
                      id: activeTag,
                      account: activeTag,
                    }}
                    size={38}
                  />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16 }}>
                      {activeFriendRow?.friend?.name || activeTag}
                    </div>
                    <div style={{ fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                      <ShieldCheck size={13} /> E2E Encrypted
                    </div>
                  </div>
                </div>

                <div className={styles.chatCallActions}>
                  <button
                    type="button"
                    className={styles.callBtn}
                    onClick={() => alert(`📞 Starting encrypted audio call with ${activeFriendRow?.friend?.name || activeTag}...`)}
                    title="Audio Call"
                  >
                    <Phone size={18} />
                  </button>
                  <button
                    type="button"
                    className={styles.callBtn}
                    onClick={() => alert(`📹 Starting video call with ${activeFriendRow?.friend?.name || activeTag}...`)}
                    title="Video Call"
                  >
                    <Video size={18} />
                  </button>
                  <button
                    type="button"
                    className={styles.callBtn}
                    onClick={() => alert(`ℹ️ Conversation ID: ${activeTag}\nStatus: End-to-End Encrypted & Synced`)}
                    title="Conversation Details"
                  >
                    <Info size={18} />
                  </button>
                </div>
              </header>

              <ChatThread
                friendTag={activeTag}
                active={true}
                onActivity={refresh}
              />
            </>
          ) : (
            <div className={styles.emptyChatSplash}>
              <div className={styles.emptySplashCircle}>💬</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Your Messages</h2>
              <p style={{ color: 'var(--text-2)', fontSize: 14.5, lineHeight: 1.5, margin: 0 }}>
                Send private photos, voice notes, and end-to-end encrypted messages to a friend or teammate.
              </p>
              <button
                type="button"
                className={styles.emptyCta}
                style={{ marginTop: 12 }}
                onClick={() => setShowAdd(true)}
              >
                <UserPlus size={16} /> Send Message / Add Teammate
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
