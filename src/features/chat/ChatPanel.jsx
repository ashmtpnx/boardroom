import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Send, Search, X, ArrowDown } from 'lucide-react';
import { sendMessage } from './chatSlice';
import { incrementStat } from '../../utils/badges';
import { getRealtimeClient } from '../../realtime/client';
import { EVENTS } from '../../realtime/events';
import { uid } from '../../utils/ids';
import ChatMessage from './ChatMessage';
import styles from './ChatPanel.module.css';

const QUICK_REACTIONS = ['🎉', '❤️', '🔥', '👏', '💡', '👍'];
const EMPTY_SUGGESTIONS = [
  '👋 Say Hello to the team!',
  '💡 Share today\'s goals & notes',
  '🚀 Ready for a quick code review?'
];

export default function ChatPanel() {
  const dispatch = useDispatch();
  const messages = useSelector((s) => s.chat.messages);
  const me = useSelector((s) => s.session.currentUser);
  const status = useSelector((s) => s.session.status);

  const [text, setText] = useState('');
  const [typingName, setTypingName] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [showJumpBtn, setShowJumpBtn] = useState(false);

  const typingTimerRef = useRef(null);
  const lastEmitRef = useRef(0);
  const messagesContainerRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const textareaRef = useRef(null);

  // Check and update scroll position state
  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const isBottom = distanceToBottom < 120;
    isNearBottomRef.current = isBottom;

    if (isBottom) {
      if (unreadCount > 0) setUnreadCount(0);
      if (showJumpBtn) setShowJumpBtn(false);
    } else {
      if (!showJumpBtn && distanceToBottom > 240) setShowJumpBtn(true);
    }
  }, [unreadCount, showJumpBtn]);

  // Smooth jump to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    const el = messagesContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
    setUnreadCount(0);
    setShowJumpBtn(false);
    isNearBottomRef.current = true;
  }, []);

  // Smart auto-scroll when messages update or typing starts
  useEffect(() => {
    if (messages.length === 0) return;
    const latest = messages[messages.length - 1];
    const isMine = me && latest && latest.userId === me.id;

    if (isNearBottomRef.current || isMine) {
      // Use requestAnimationFrame so layout is settled before scrolling
      requestAnimationFrame(() => {
        scrollToBottom(true);
      });
    } else if (latest && !isMine) {
      setUnreadCount((c) => c + 1);
      setShowJumpBtn(true);
    }
  }, [messages.length, typingName, me, scrollToBottom]);

  // Realtime typing listeners
  useEffect(() => {
    const rt = getRealtimeClient();
    if (!rt) return undefined;

    const onTyping = ({ id, name }) => {
      if (!me || id === me.id) return;
      setTypingName(name);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        setTypingName(null);
      }, 3000);
    };

    const unsub = rt.on(EVENTS.ROOM_TYPING, onTyping);
    return () => {
      if (unsub) unsub();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [me, status]);

  const onInputChange = (e) => {
    const val = e.target.value;
    setText(val);

    // Auto-grow textarea up to 110px
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(110, textareaRef.current.scrollHeight)}px`;
    }

    if (!me) return;
    const now = Date.now();
    if (val.trim() && now - lastEmitRef.current > 1500) {
      lastEmitRef.current = now;
      const rt = getRealtimeClient();
      rt?.emit(EVENTS.ROOM_TYPING, { id: me.id, name: me.name });
    }
  };

  const sendReaction = (emoji) => {
    if (!me) return;
    const rt = getRealtimeClient();
    rt?.emit(EVENTS.ROOM_REACTION, { emoji, from: me.name });
    window.dispatchEvent(
      new CustomEvent('room:reaction:local', {
        detail: { emoji, from: me.name },
      }),
    );
  };

  const submit = useCallback((e) => {
    if (e) e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || !me) return;
    dispatch(
      sendMessage({
        id: uid('msg'),
        userId: me.id,
        name: me.name,
        color: me.color,
        photoURL: me.photoURL || null,
        text: trimmed,
        ts: Date.now(),
      }),
    );
    incrementStat('messagesSent', 1);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, me, dispatch]);

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onSuggestionClick = (suggestionText) => {
    if (!me) return;
    dispatch(
      sendMessage({
        id: uid('msg'),
        userId: me.id,
        name: me.name,
        color: me.color,
        photoURL: me.photoURL || null,
        text: suggestionText,
        ts: Date.now(),
      }),
    );
    incrementStat('messagesSent', 1);
  };

  // Filter messages based on search query
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter((m) =>
      (m.text || '').toLowerCase().includes(q) ||
      (m.name || '').toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  return (
    <div className={styles.panel}>
      {/* Header Bar */}
      <div className={styles.headerBar}>
        <div className={styles.headerTitleArea}>
          <span className={styles.headerTitle}>Room Chat</span>
          <span className={styles.headerStatus}>
            <span className={styles.headerStatusDot} /> Live
          </span>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={`${styles.headerIconBtn} ${searchOpen ? styles.headerIconBtnActive : ''}`}
            onClick={() => {
              setSearchOpen(!searchOpen);
              if (searchOpen) setSearchQuery('');
            }}
            title="Search messages"
          >
            <Search size={16} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {searchOpen && (
        <div className={styles.searchBar}>
          <Search size={14} style={{ color: 'var(--text-2)' }} />
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search chat history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button type="button" className={styles.searchCloseBtn} onClick={() => setSearchQuery('')} title="Clear search">
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Quick Reactions Bar */}
      <div className={styles.quickReactions} aria-label="Quick board reactions">
        <span className={styles.reactionLabel}>React:</span>
        <div className={styles.reactionButtons}>
          {QUICK_REACTIONS.map((emoji) => (
            <button
              type="button"
              key={emoji}
              className={styles.rxBtn}
              onClick={() => sendReaction(emoji)}
              title={`Send ${emoji} across room`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroller */}
      <div className={styles.messages} ref={messagesContainerRef} onScroll={handleScroll}>
        {filteredMessages.length === 0 && !searchQuery && (
          <div className={styles.emptyCard}>
            <div className={styles.emptyIcon}>💬</div>
            <div className={styles.emptyTitle}>Group Chat is Ready</div>
            <div className={styles.emptyText}>
              Share ideas, code snippets, or notes with everyone in real-time.
            </div>
            <div className={styles.emptySuggestions}>
              {EMPTY_SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={styles.suggestionPill}
                  onClick={() => onSuggestionClick(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredMessages.length === 0 && searchQuery && (
          <div className={styles.emptyCard} style={{ padding: '24px 16px' }}>
            <div className={styles.emptyTitle}>No Results Found</div>
            <div className={styles.emptyText}>No messages match &quot;{searchQuery}&quot;</div>
          </div>
        )}

        {filteredMessages.map((m, idx) => {
          const prev = filteredMessages[idx - 1];
          const next = filteredMessages[idx + 1];
          // Group if same user and within 3 minutes (180,000 ms)
          const sameUserAsPrev = prev && prev.userId === m.userId && (m.ts - prev.ts) < 180000;
          const sameUserAsNext = next && next.userId === m.userId && (next.ts - m.ts) < 180000;
          const isGroupStart = !sameUserAsPrev;
          const isGroupEnd = !sameUserAsNext;

          return (
            <ChatMessage
              key={m.id}
              message={m}
              mine={!!me && m.userId === me.id}
              isGroupStart={isGroupStart}
              isGroupEnd={isGroupEnd}
            />
          );
        })}

        {typingName && (
          <div className={styles.typingIndicator}>
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
            <span className={styles.typingDot} />
            <span className={styles.typingText}>{typingName} is typing…</span>
          </div>
        )}
      </div>

      {/* Floating Jump to Bottom Pill */}
      {(showJumpBtn || unreadCount > 0) && (
        <div className={styles.jumpToBottomWrap}>
          <button
            type="button"
            className={styles.jumpToBottomBtn}
            onClick={() => scrollToBottom(true)}
            title="Jump to latest messages"
          >
            <ArrowDown size={14} />
            <span>Latest Messages</span>
            {unreadCount > 0 && <span className={styles.jumpBadge}>{unreadCount}</span>}
          </button>
        </div>
      )}

      {/* Composer Bar */}
      <form className={styles.composer} onSubmit={submit}>
        <div className={styles.composerInner}>
          <textarea
            ref={textareaRef}
            rows={1}
            className={styles.textarea}
            placeholder="Message everyone… (Shift + Enter for new line)"
            value={text}
            onChange={onInputChange}
            onKeyDown={onKeyDown}
            maxLength={1000}
          />
          <button
            className={styles.send}
            type="submit"
            disabled={!text.trim()}
            aria-label="Send message"
            title="Send message (Enter)"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}

