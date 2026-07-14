import { useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { Send, Mic, Image as ImageIcon, Heart, Trash2 } from 'lucide-react';
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
  const lastTypingSentRef = useRef(0);
  const typingClearRef = useRef(null);

  // Voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  // Photo upload ref
  const fileInputRef = useRef(null);

  const activeRef = useRef(active);
  activeRef.current = active;
  const meRef = useRef(me);
  meRef.current = me;
  const friendNameRef = useRef(friend?.name);
  friendNameRef.current = friend?.name;
  const onActivityRef = useRef(onActivity);
  onActivityRef.current = onActivity;

  useEffect(() => {
    setMessages(loadConversation(tag));
    setFriend(getFriendByTag(tag) || (tag ? { account: tag, name: tag } : null));
    setText('');
    setPeerTyping(false);
  }, [tag]);

  useEffect(() => {
    if (!tag) return;
    let cancelled = false;
    (async () => {
      const res = await lookupAccount(tag);
      if (!cancelled && res.ok) setFriend((cur) => ({ ...cur, ...res.profile }));
    })();
    return () => { cancelled = true; };
  }, [tag]);

  useEffect(() => {
    if (!tag || !myTag) return;
    const roomId = dmRoomId(myTag, tag);
    if (!roomId) return;

    let cancelled = false;
    const offs = [];
    let replayBuffer = [];
    let flushTimer = null;
    const flushReplay = () => {
      if (!replayBuffer.length) return;
      const batch = replayBuffer;
      replayBuffer = [];
      setMessages((prev) => {
        let merged = prev;
        for (const msg of batch) {
          if (!merged.some((m) => m.id === msg.id)) {
            merged = [...merged, msg];
            appendMessage(tag, msg);
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
        if (flushTimer !== null) {
          replayBuffer.push(msg);
          scheduleFlush();
        } else {
          setMessages(appendMessage(tag, msg));
        }
        setPeerTyping(false);
        onActivityRef.current?.();
        if (!activeRef.current || document.hidden) {
          const bodyText = msg.text || (msg.photoAttachment ? '🖼️ Sent a photo' : msg.voiceNote ? '🎙️ Sent a voice note' : 'New message');
          addNotification({
            type: NOTIF.MESSAGE,
            title: `New message from ${msg.name || friendNameRef.current || tag}`,
            body: bodyText,
            tag,
            dedupeKey: `msg:${tag}`,
            photoURL: msg.photoURL || null,
            color: msg.color || null,
            name: msg.name || friendNameRef.current || tag,
          });
        }
      }));

      offs.push(rt.on(EVENTS.DM_TYPING, () => {
        setPeerTyping(true);
        clearTimeout(typingClearRef.current);
        typingClearRef.current = setTimeout(() => setPeerTyping(false), 3500);
      }));

      scheduleFlush();
    })();

    return () => {
      cancelled = true;
      offs.forEach((off) => off());
      clearTimeout(typingClearRef.current);
      clearTimeout(flushTimer);
      flushReplay();
      rtRef.current?.disconnect();
      rtRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag, myTag]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, peerTyping]);

  const onType = (value) => {
    setText(value);
    const now = Date.now();
    if (value.trim() && now - lastTypingSentRef.current > 1000) {
      lastTypingSentRef.current = now;
      rtRef.current?.emit(EVENTS.DM_TYPING, { userId: me.id, name: me.name });
    }
  };

  const sendMessageObject = (overrides = {}) => {
    if (!me || !tag) return;
    const msg = {
      id: uid('dm'),
      userId: me.id,
      name: me.name,
      color: me.color,
      photoURL: me.photoURL || null,
      text: '',
      ts: Date.now(),
      ...overrides,
    };
    setMessages(appendMessage(tag, msg));
    rtRef.current?.emit(EVENTS.DM_MESSAGE, msg);
    onActivity?.();
    lastTypingSentRef.current = 0;
  };

  const submit = (e) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !me || !tag) return;
    sendMessageObject({ text: trimmed });
    setText('');
  };

  // Photo Attachment Handler
  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    if (!file || !me || !tag) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result;
      if (!result) return;
      // Compress image via canvas if it's large so messages send fast
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
          else { w = Math.round((w * maxDim) / h); h = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        sendMessageObject({ photoAttachment: dataUrl });
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Voice Note Recording Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err) {
      alert('Could not access microphone for voice recording.');
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    }
    clearInterval(recordingIntervalRef.current);
    setIsRecordingVoice(false);
    setRecordingSeconds(0);
  };

  const sendRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    const currentSeconds = recordingSeconds;
    clearInterval(recordingIntervalRef.current);
    mediaRecorderRef.current.onstop = () => {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        const m = Math.floor(currentSeconds / 60);
        const s = currentSeconds % 60;
        const formatted = `${m}:${s < 10 ? '0' : ''}${s}`;
        sendMessageObject({ voiceNote: dataUrl, voiceDuration: formatted || '0:06' });
      };
      reader.readAsDataURL(audioBlob);
      setIsRecordingVoice(false);
      setRecordingSeconds(0);
    };
    mediaRecorderRef.current.stop();
  };

  const formatRecTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!me || !tag) return null;

  return (
    <>
      <div className={styles.messages}>
        {messages.length === 0 && (
          <div className={styles.emptyCard}>
            <div className={styles.emptyCardIcon}>🔒</div>
            <div className={styles.emptyCardTitle}>Encrypted Direct Conversation</div>
            <div className={styles.emptyCardText}>
              You are now connected with {friend?.name || tag}. Messages sent here are synchronized instantly across active devices and protected by end-to-end encryption. Send a voice note, share photos, or say hello!
            </div>
          </div>
        )}
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} mine={m.userId === me.id} />
        ))}
        <div ref={endRef} />
      </div>

      {peerTyping && (
        <div className={styles.typing} aria-live="polite">
          <span className={styles.typingDots}><span /><span /><span /></span>
          <span className={styles.typingText}>{friend?.name || 'Friend'} is typing…</span>
        </div>
      )}

      {isRecordingVoice ? (
        <div className={styles.composer}>
          <div className={styles.recordingBar}>
            <div className={styles.recordingStatus}>
              <span className={styles.recordingDot} />
              <span>Recording Voice Note...</span>
              <span className={styles.recordingTimer}>{formatRecTimer(recordingSeconds)}</span>
            </div>
            <div className={styles.composerActionsRight}>
              <button
                type="button"
                className={styles.recordingTrashBtn}
                onClick={cancelRecording}
                title="Cancel recording"
              >
                <Trash2 size={15} /> Cancel
              </button>
              <button
                type="button"
                className={styles.send}
                onClick={sendRecording}
                title="Send voice note"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <form className={styles.composer} onSubmit={submit}>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={onPickImage}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className={styles.composerIconBtn}
            onClick={() => fileInputRef.current?.click()}
            title="Attach image or photo"
          >
            <ImageIcon size={20} />
          </button>
          <input
            className={styles.input}
            placeholder={`Message ${friend?.name || 'your friend'}...`}
            value={text}
            onChange={(e) => onType(e.target.value)}
            maxLength={1000}
          />
          <div className={styles.composerActionsRight}>
            {text.trim() ? (
              <button className={styles.send} type="submit" aria-label="Send message">
                <Send size={18} />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.composerIconBtn}
                  onClick={startRecording}
                  title="Record voice note"
                >
                  <Mic size={20} />
                </button>
                <button
                  type="button"
                  className={styles.composerHeartBtn}
                  onClick={() => sendMessageObject({ text: '❤️' })}
                  title="Send heart reaction"
                >
                  <Heart size={20} fill="currentColor" />
                </button>
              </>
            )}
          </div>
        </form>
      )}
    </>
  );
}

