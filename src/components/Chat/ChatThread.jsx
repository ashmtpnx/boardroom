import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Send } from 'lucide-react';
import { createRealtime } from '../../realtime/RealtimeProvider';
import { EVENTS } from '../../realtime/events';
import { accountId, normalizeAccountId } from '../../utils/accountId';
import { lookupAccount } from '../../utils/directory';
import { getFriendByTag } from '../../utils/friends';
import { dmRoomId, loadConversation, appendMessage } from '../../utils/dm';
import { addNotification, NOTIF } from '../../utils/notifications';
import { uid } from '../../utils/ids';
import ChatMessage from '../../features/chat/ChatMessage';
import styles from './FriendChat.module.css';

// The reusable one-to-one conversation core: owns the per-pair realtime channel,
// localStorage persistence, typing indicator, and composer. Used both by the
// full-page FriendChat route (#dm/<tag>) and embedded in the Messages right pane,
// so the chat logic lives in exactly one place.
//
// `active` tells the thread whether it's the pane the user is actually looking
// at. When false (e.g. embedded but a different conversation is selected — not
// currently the case, but also while the tab is backgrounded) an incoming
// message raises a notification instead of being silently marked seen.
export default function ChatThread({ friendTag, active = true, onActivity }) {
  const me = useSelector((s) => s.session.currentUser);
  const tag = normalizeAccountId(friendTag);

  const myTag = useMemo(() => accountId(me?.id || ''), [me?.id]);
  const [friend, setFriend] = useState(() =>
    getFriendByTag(tag) || (tag ? { account: tag, name: tag } : null),
  );
  const [messages, setMessages] = useState(() => loadConversation(tag));
  const [text, setText] = useState('');
  const [peerTyping, setPeerTyping] = useState(false);
  const rtRef = useRef(null);
  const endRef = useRef(null);
  const lastTypingSentRef = useRef(0); // throttle outgoing "typing" pings
  const typingClearRef = useRef(null); // timer that hides the peer's indicator
  // Mutable values the realtime handler reads but must NOT re-subscribe on — kept
  // in refs so the connect effect depends only on the conversation identity
  // (tag/myTag). Without this, a resolved profile name or an unmemoized
  // onActivity prop would tear down and rebuild the socket, dropping messages and
  // making the chat feel laggy.
  const activeRef = useRef(active);
  activeRef.current = active;
  const meRef = useRef(me);
  meRef.current = me;
  const friendNameRef = useRef(friend?.name);
  friendNameRef.current = friend?.name;
  const onActivityRef = useRef(onActivity);
  onActivityRef.current = onActivity;

  // When the selected conversation changes, reload its stored thread and friend.
  useEffect(() => {
    setMessages(loadConversation(tag));
    setFriend(getFriendByTag(tag) || (tag ? { account: tag, name: tag } : null));
    setText('');
    setPeerTyping(false);
  }, [tag]);

  // Resolve a fresh profile for the friend (name/photo) from the directory.
  useEffect(() => {
    if (!tag) return;
    let cancelled = false;
    (async () => {
      const res = await lookupAccount(tag);
      if (!cancelled && res.ok) setFriend((cur) => ({ ...cur, ...res.profile }));
    })();
    return () => { cancelled = true; };
  }, [tag]);

  // Connect to the per-pair realtime channel and stream incoming DMs in.
  useEffect(() => {
    if (!tag || !myTag) return;
    const roomId = dmRoomId(myTag, tag);
    if (!roomId) return;

    let cancelled = false;
    const offs = [];

    // ---- Batch buffer for server replay ----
    // The server replays the full DM history one event at a time on join. Instead
    // of calling setMessages N times (causing N re-renders + scrollIntoView
    // storms), we collect replayed messages and flush them in one setState call.
    let replayBuffer = [];
    let flushTimer = null;
    const flushReplay = () => {
      if (!replayBuffer.length) return;
      const batch = replayBuffer;
      replayBuffer = [];
      // Merge the batch into the stored thread in one pass (appendMessage
      // deduplicates by id, so already-local messages are skipped).
      setMessages((prev) => {
        let merged = prev;
        for (const msg of batch) {
          if (!merged.some((m) => m.id === msg.id)) {
            merged = [...merged, msg];
            appendMessage(tag, msg); // persist each new message
          }
        }
        return merged;
      });
    };
    const scheduleFlush = () => {
      if (flushTimer) return;
      flushTimer = setTimeout(() => { flushTimer = null; flushReplay(); }, 50);
    };

    (async () => {
      const rt = await createRealtime();
      if (cancelled) { rt.disconnect?.(); return; }
      rt.connect(roomId, meRef.current);
      rtRef.current = rt;

      offs.push(rt.on(EVENTS.DM_MESSAGE, (msg) => {
        if (!msg?.id) return;
        // If we're still in the replay window, batch it; otherwise apply live.
        if (flushTimer !== null) {
          replayBuffer.push(msg);
          scheduleFlush();
        } else {
          setMessages(appendMessage(tag, msg)); // persist + dedupe
        }
        setPeerTyping(false); // a sent message means they stopped typing
        onActivityRef.current?.();
        // Not looking at this thread (or tab hidden) → surface a notification.
        if (!activeRef.current || document.hidden) {
          addNotification({
            type: NOTIF.MESSAGE,
            title: `New message from ${msg.name || friendNameRef.current || tag}`,
            body: msg.text,
            tag,
            dedupeKey: `msg:${tag}`,
            photoURL: msg.photoURL || null,
            color: msg.color || null,
            name: msg.name || friendNameRef.current || tag,
          });
        }
      }));

      // Show "typing…" while pings arrive; hide it if none comes for ~3.5s.
      offs.push(rt.on(EVENTS.DM_TYPING, () => {
        setPeerTyping(true);
        clearTimeout(typingClearRef.current);
        typingClearRef.current = setTimeout(() => setPeerTyping(false), 3500);
      }));

      // Kick off the replay window — the first batch of messages from the server
      // arrives right after connect. Schedule the first flush so the buffer
      // collects them.
      scheduleFlush();
    })();

    return () => {
      cancelled = true;
      offs.forEach((off) => off());
      clearTimeout(typingClearRef.current);
      clearTimeout(flushTimer);
      flushReplay(); // flush any remaining buffered messages
      rtRef.current?.disconnect();
      rtRef.current = null;
    };
    // Only reconnect when the conversation identity changes. `me`, `friend`,
    // and `onActivity` are read via stable refs so they don't need to be deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag, myTag]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, peerTyping]);

  // Update the field and let the friend know we're typing — at most one ping/sec.
  const onType = (value) => {
    setText(value);
    const now = Date.now();
    if (value.trim() && now - lastTypingSentRef.current > 1000) {
      lastTypingSentRef.current = now;
      rtRef.current?.emit(EVENTS.DM_TYPING, { userId: me.id, name: me.name });
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !me || !tag) return;
    const msg = {
      id: uid('dm'),
      userId: me.id,
      name: me.name,
      color: me.color,
      photoURL: me.photoURL || null,
      text: trimmed,
      ts: Date.now(),
    };
    setMessages(appendMessage(tag, msg)); // optimistic + persist
    rtRef.current?.emit(EVENTS.DM_MESSAGE, msg);
    onActivity?.();
    setText('');
    lastTypingSentRef.current = 0; // allow an immediate typing ping next time
  };

  if (!me || !tag) return null;

  return (
    <>
      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.empty}>No messages yet. Say hello 👋</div>
        )}
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} mine={m.userId === me.id} />
        ))}
        <div ref={endRef} />
      </div>

      {peerTyping && (
        <div className={styles.typing} aria-live="polite">
          <span className={styles.typingDots}><span /><span /><span /></span>
          {friend?.name || 'Friend'} is typing…
        </div>
      )}

      <form className={styles.composer} onSubmit={submit}>
        <input
          className={styles.input}
          placeholder={`Message ${friend?.name || 'your friend'}…`}
          value={text}
          onChange={(e) => onType(e.target.value)}
          maxLength={1000}
        />
        <button className={styles.send} type="submit" disabled={!text.trim()} aria-label="Send message">
          <Send size={18} />
        </button>
      </form>
    </>
  );
}
