import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Bell, Check, X, UserPlus, MessageCircle } from 'lucide-react';
import {
  getNotifications,
  markAllRead,
  removeNotification,
  NOTIF,
  NOTIFICATIONS_EVENT,
} from '../../utils/notifications';
import { getIncoming, REQUESTS_EVENT } from '../../utils/requests';
import { acceptRequest, declineRequest } from '../../utils/friendRequests';
import { getFriendByTag } from '../../utils/friends';
import { goToFriendChat } from '../../utils/nav';
import Avatar from '../Avatar';
import styles from './NotificationBell.module.css';

function relTime(ts) {
  if (!ts) return '';
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.round(hr / 24)}d`;
}

// The notification bell: a header button with an unread badge that opens a panel
// listing incoming friend requests (with Accept / Decline) and the notification
// feed. It's the accept side of the request handshake and the "notification
// section" surface. Reads the localStorage-backed stores and live-refreshes on the
// same-tab custom events (and cross-tab 'storage').
export default function NotificationBell() {
  const me = useSelector((s) => s.session.currentUser);
  const [open, setOpen] = useState(false);
  const [incoming, setIncoming] = useState(() => getIncoming());
  const [notifs, setNotifs] = useState(() => getNotifications());
  const [busy, setBusy] = useState(null); // fromTag currently being accepted/declined
  const rootRef = useRef(null);

  const refresh = () => {
    setIncoming(getIncoming());
    setNotifs(getNotifications());
  };

  useEffect(() => {
    refresh();
    const events = [NOTIFICATIONS_EVENT, REQUESTS_EVENT, 'storage', 'focus'];
    events.forEach((e) => window.addEventListener(e, refresh));
    return () => events.forEach((e) => window.removeEventListener(e, refresh));
  }, []);

  // Opening the panel marks notifications read (requests still need action).
  useEffect(() => {
    if (open) {
      markAllRead();
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onAccept = async (req) => {
    setBusy(req.fromTag);
    await acceptRequest(me, req);
    setBusy(null);
    refresh();
  };

  const onDecline = async (req) => {
    setBusy(req.fromTag);
    await declineRequest(me, req);
    setBusy(null);
    refresh();
  };

  const onOpenNotif = (n) => {
    if (n.tag && (n.type === NOTIF.MESSAGE || n.type === NOTIF.REQUEST_ACCEPTED)) {
      setOpen(false);
      goToFriendChat(n.tag);
    }
  };

  // Requests are also mirrored as notifications; hide those duplicates from the
  // feed since we render the actionable requests in their own section.
  const feed = notifs.filter((n) => n.type !== NOTIF.FRIEND_REQUEST);
  // Badge = actionable requests + unread non-request notifications. Excluding the
  // mirrored request notifications avoids counting a single request twice.
  const feedUnread = feed.reduce((n, x) => n + (x.read ? 0 : 1), 0);
  const badge = incoming.length + (open ? 0 : feedUnread);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        className={styles.bell}
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        aria-label={badge ? `Notifications, ${badge} new` : 'Notifications'}
      >
        <Bell size={20} />
        {badge > 0 && <span className={styles.badge}>{badge > 99 ? '99+' : badge}</span>}
      </button>

      {open && (
        <div className={styles.panel} role="dialog" aria-label="Notifications">
          <div className={styles.panelHead}>Notifications</div>

          {incoming.length === 0 && feed.length === 0 && (
            <div className={styles.empty}>
              <Bell size={26} />
              <p>You’re all caught up.</p>
            </div>
          )}

          {incoming.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Friend requests</div>
              {incoming.map((req) => (
                <div key={req.fromTag} className={styles.reqRow}>
                  <Avatar user={{ name: req.name, color: req.color, photoURL: req.photoURL }} size={40} />
                  <div className={styles.reqMeta}>
                    <span className={styles.reqName}>{req.name || req.fromTag}</span>
                    <span className={styles.reqSub}>wants to connect · {relTime(req.ts)}</span>
                  </div>
                  <div className={styles.reqActions}>
                    <button
                      className={styles.accept}
                      onClick={() => onAccept(req)}
                      disabled={busy === req.fromTag}
                      aria-label={`Accept ${req.name || req.fromTag}`}
                    >
                      <Check size={15} /> Accept
                    </button>
                    <button
                      className={styles.decline}
                      onClick={() => onDecline(req)}
                      disabled={busy === req.fromTag}
                      aria-label={`Decline ${req.name || req.fromTag}`}
                    >
                      <X size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {feed.length > 0 && (
            <div className={styles.section}>
              {incoming.length > 0 && <div className={styles.sectionLabel}>Earlier</div>}
              {feed.map((n) => {
                const friend = n.tag ? getFriendByTag(n.tag) : null;
                const userObj = (n.photoURL || n.color || friend) ? {
                  name: friend?.name || n.name || n.title,
                  color: friend?.color || n.color,
                  photoURL: friend?.photoURL || n.photoURL,
                } : null;
                const Icon = n.type === NOTIF.MESSAGE ? MessageCircle : UserPlus;
                const clickable = n.tag && (n.type === NOTIF.MESSAGE || n.type === NOTIF.REQUEST_ACCEPTED);
                return (
                  <div
                    key={n.id}
                    className={`${styles.notifRow} ${clickable ? styles.clickable : ''}`}
                    onClick={() => onOpenNotif(n)}
                    role={clickable ? 'button' : undefined}
                  >
                    {userObj ? (
                      <div className={styles.notifAvatarWrap}>
                        <Avatar user={userObj} size={38} />
                        <span className={styles.notifBadgeIcon}><Icon size={11} /></span>
                      </div>
                    ) : (
                      <span className={styles.notifIcon}><Icon size={16} /></span>
                    )}
                    <div className={styles.notifMeta}>
                      <span className={styles.notifTitle}>{n.title}</span>
                      {n.body && <span className={styles.notifBody}>{n.body}</span>}
                    </div>
                    <span className={styles.notifTime}>{relTime(n.ts)}</span>
                    <button
                      className={styles.notifClose}
                      onClick={(e) => { e.stopPropagation(); removeNotification(n.id); refresh(); }}
                      aria-label="Dismiss"
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
