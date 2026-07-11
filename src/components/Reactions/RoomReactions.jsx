import React, { useEffect, useState } from 'react';
import { getRealtimeClient } from '../../realtime/client';
import { EVENTS } from '../../realtime/events';
import { uid } from '../../utils/ids';
import styles from './RoomReactions.module.css';

export default function RoomReactions() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const rt = getRealtimeClient();
    if (!rt) return undefined;

    const onReaction = (payload) => {
      if (!payload || !payload.emoji) return;
      const id = uid('rx');
      const left = Math.floor(Math.random() * 60) + 20; // 20% to 80% across screen
      setItems((prev) => [...prev, { id, emoji: payload.emoji, from: payload.from, left }]);

      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }, 3000);
    };

    const unsub = rt.on(EVENTS.ROOM_REACTION, onReaction);
    return () => unsub && unsub();
  }, []);

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
