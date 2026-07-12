import { useSelector } from 'react-redux';
import Avatar from '../../components/Avatar';
import { viewUserProfile } from '../../utils/profileView';
import styles from './PeoplePanel.module.css';

export default function PeoplePanel() {
  const users = useSelector((s) => s.people.users);
  // Show yourself first.
  const sorted = [...users].sort((a, b) => (b.isSelf ? 1 : 0) - (a.isSelf ? 1 : 0));

  return (
    <div className={styles.panel}>
      <div className={styles.count}>{users.length} in this room</div>
      <ul className={styles.list}>
        {sorted.map((u) => (
          <li
            key={u.id}
            className={styles.person}
            onClick={() => !u.isSelf && viewUserProfile(u)}
            style={{ cursor: u.isSelf ? 'default' : 'pointer' }}
            title={u.isSelf ? 'You' : `Click to view ${u.name}'s profile`}
          >
            <Avatar user={u} size={36} />
            <div className={styles.info}>
              <div className={styles.name}>
                {u.name}
                {u.isSelf && <span className={styles.you}> (You)</span>}
              </div>
              <div className={styles.status}>
                <span className={styles.dot} /> Active
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className={styles.hint}>
        Open this room link in another browser tab to see live collaboration.
      </p>
    </div>
  );
}
