import { useState, useRef, useEffect } from 'react';
import { Copy, Check, Code2, Play, Pause, Volume2 } from 'lucide-react';
import Avatar from '../../components/Avatar';
import styles from './ChatPanel.module.css';

function VoiceNotePlayer({ src, duration, mine }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(() => {
    if (!duration) return 0;
    const parts = String(duration).split(':');
    if (parts.length === 2) return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    return parseFloat(duration) || 0;
  });

  const togglePlay = (e) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  };

  const onTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
    if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
      setTotalTime(audioRef.current.duration);
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const onSeek = (e) => {
    e.stopPropagation();
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs) || secs <= 0) return duration || '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPct = totalTime > 0 ? Math.min(100, (currentTime / totalTime) * 100) : 0;

  // Generate 16 simulated waveform bars for visual aesthetic
  const bars = [35, 65, 45, 85, 100, 75, 50, 90, 60, 40, 80, 95, 70, 45, 60, 35];

  return (
    <div className={`${styles.voiceBubble} ${mine ? styles.voiceBubbleMine : ''}`} onClick={(e) => e.stopPropagation()}>
      <audio
        ref={audioRef}
        src={src}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onTimeUpdate}
        onEnded={onEnded}
      />
      <button
        type="button"
        className={`${styles.voicePlayBtn} ${mine ? styles.voicePlayBtnMine : ''}`}
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
      >
        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" style={{ marginLeft: '1px' }} />}
      </button>

      <div className={styles.voiceWaveArea}>
        <div className={styles.voiceWaveBars}>
          {bars.map((h, idx) => {
            const barPct = (idx / bars.length) * 100;
            const active = barPct <= progressPct;
            return (
              <span
                key={idx}
                className={`${styles.voiceBar} ${active ? (mine ? styles.voiceBarActiveMine : styles.voiceBarActive) : ''}`}
                style={{ height: `${h}%` }}
              />
            );
          })}
        </div>
        <input
          type="range"
          min="0"
          max={totalTime || 100}
          value={currentTime}
          onChange={onSeek}
          className={styles.voiceSeeker}
        />
        <div className={styles.voiceTimeRow}>
          <span>{formatTime(currentTime > 0 ? currentTime : totalTime)}</span>
          <Volume2 size={12} className={styles.voiceVolIcon} />
        </div>
      </div>
    </div>
  );
}

export default function ChatMessage({ message, mine }) {
  const [copied, setCopied] = useState(false);
  const [reactions, setReactions] = useState([]);
  const time = new Date(message.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const onCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(message.text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const onQuickReact = (emoji, e) => {
    e.stopPropagation();
    setReactions((prev) => (prev.includes(emoji) ? prev : [...prev, emoji]));
    window.dispatchEvent(
      new CustomEvent('room:reaction:local', {
        detail: { emoji, from: message.name || 'someone' },
      }),
    );
  };

  // Check if message is a code snippet (starts with ``` or contains multi-line code)
  const isCode = (message.text || '').startsWith('```') || (((message.text || '').includes('\n')) && ((message.text || '').includes('function') || (message.text || '').includes('const ') || (message.text || '').includes('import ')));
  const cleanText = (message.text || '').replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '');

  return (
    <div className={`${styles.msg} ${mine ? styles.msgMine : ''}`}>
      <Avatar
        user={{
          id: message.fromTag || message.id || message.name,
          account: message.fromTag || message.id || message.name,
          name: message.name,
          color: message.color,
          photoURL: message.photoURL,
        }}
        size={34}
        clickable={!mine}
        className={styles.avatar}
      />
      <div className={styles.bubbleWrap}>
        <div className={styles.meta}>
          <span className={styles.name}>{mine ? 'You' : message.name}</span>
          <span className={styles.time}>{time}</span>
          {isCode && (
            <span className={styles.codeBadge}>
              <Code2 size={11} /> Code Snippet
            </span>
          )}
        </div>

        <div className={styles.bubbleContainer}>
          {message.photoAttachment && (
            <div className={styles.photoAttachmentWrap}>
              <img
                src={message.photoAttachment}
                alt="Shared attachment"
                className={styles.photoAttachmentImg}
                onClick={() => window.open(message.photoAttachment, '_blank')}
                loading="lazy"
              />
            </div>
          )}

          {message.voiceNote && (
            <VoiceNotePlayer src={message.voiceNote} duration={message.voiceDuration} mine={mine} />
          )}

          {message.text && (
            isCode ? (
              <div className={styles.codeBubble}>
                <div className={styles.codeHeader}>
                  <span className={styles.codeDots}><span /><span /><span /></span>
                  <span className={styles.codeLang}>Snippet</span>
                  <button className={styles.codeCopyBtn} onClick={onCopy} title="Copy code">
                    {copied ? <Check size={12} className={styles.checkIcon} /> : <Copy size={12} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className={styles.codeContent}>{cleanText}</pre>
              </div>
            ) : (
              <div className={styles.bubble}>
                {message.text}
                <div className={styles.bubbleActions}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={onCopy}
                    title="Copy text"
                    aria-label="Copy message text"
                  >
                    {copied ? <Check size={13} className={styles.checkIcon} /> : <Copy size={13} />}
                  </button>
                  <div className={styles.quickRxGroup}>
                    {['❤️', '🔥', '👍'].map((rx) => (
                      <button
                        key={rx}
                        type="button"
                        className={styles.actionRxBtn}
                        onClick={(e) => onQuickReact(rx, e)}
                        title={`React ${rx}`}
                      >
                        {rx}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}

          {reactions.length > 0 && (
            <div className={styles.messageReactions}>
              {reactions.map((rx, idx) => (
                <span key={idx} className={styles.rxBadge}>{rx}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

