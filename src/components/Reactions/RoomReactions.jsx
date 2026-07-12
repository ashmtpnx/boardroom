import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { getRealtimeClient } from '../../realtime/client';
import { EVENTS } from '../../realtime/events';
import { uid } from '../../utils/ids';
import styles from './RoomReactions.module.css';

export default function RoomReactions() {
  const [items, setItems] = useState([]);
  const status = useSelector((s) => s.session.status);

  useEffect(() => {
    const addReaction = (emoji, from) => {
      if (!emoji) return;
      const id = uid('rx');
      const left = Math.floor(Math.random() * 60) + 20; // 20% to 80% across screen
      setItems((prev) => [...prev, { id, emoji, from, left }]);

      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }, 3000);
    };

    const onRemoteReaction = (payload) => {
      if (!payload || !payload.emoji) return;
      addReaction(payload.emoji, payload.from);
    };

    const onLocalReaction = (e) => {
      const payload = e?.detail;
      if (!payload || !payload.emoji) return;
      addReaction(payload.emoji, payload.from);
    };

    window.addEventListener('room:reaction:local', onLocalReaction);

    const rt = getRealtimeClient();
    let unsub = null;
    if (rt) {
      unsub = rt.on(EVENTS.ROOM_REACTION, onRemoteReaction);
    }

    return () => {
      window.removeEventListener('room:reaction:local', onLocalReaction);
      if (unsub) unsub();
    };
  }, [status]);

  if (items.length === 0) return null;

  return (
    <div className={styles.container} aria-hidden="true">
      {items.map((item) => (
        <div
          key={item.id}
          className={styles.floater}
          style={{ left: `${item.left}%` }}
        >
          <span className={styles.emoji}>{item.emoji}</span>
          {item.from && <span className={styles.fromBadge}>{item.from}</span>}
        </div>
      ))}
    </div>
  );
}
