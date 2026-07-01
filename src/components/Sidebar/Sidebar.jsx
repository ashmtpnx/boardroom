import { useSelector, useDispatch } from 'react-redux';
import { PanelRightClose, PanelRightOpen, MessageSquare, Users } from 'lucide-react';
import { setActiveTab, toggleSidebar } from '../../features/ui/uiSlice';
import ChatPanel from '../../features/chat/ChatPanel';
import PeoplePanel from '../../features/people/PeoplePanel';
import styles from './Sidebar.module.css';

export default function Sidebar() {
  const dispatch = useDispatch();
  const open = useSelector((s) => s.ui.sidebarOpen);
  const activeTab = useSelector((s) => s.ui.activeTab);
  const peopleCount = useSelector((s) => s.people.users.length);

  if (!open) {
    return (
      <div className={styles.collapsed}>
        <button className={styles.iconBtn} title="Open panel" onClick={() => dispatch(toggleSidebar())}>
          <PanelRightOpen size={20} />
        </button>
        <button className={styles.iconBtn} title="Chat" onClick={() => dispatch(setActiveTab('chat'))}>
          <MessageSquare size={20} />
        </button>
        <button className={styles.iconBtn} title="People" onClick={() => dispatch(setActiveTab('people'))}>
          <Users size={20} />
          <span className={styles.miniBadge}>{peopleCount}</span>
        </button>
      </div>
    );
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'chat' ? styles.tabActive : ''}`}
            onClick={() => dispatch(setActiveTab('chat'))}
          >
            <MessageSquare size={16} /> Chat
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'people' ? styles.tabActive : ''}`}
            onClick={() => dispatch(setActiveTab('people'))}
          >
            <Users size={16} /> People
            <span className={styles.badge}>{peopleCount}</span>
          </button>
        </div>
        <button className={styles.iconBtn} title="Collapse panel" onClick={() => dispatch(toggleSidebar())}>
          <PanelRightClose size={20} />
        </button>
      </div>

      <div className={styles.content}>
        {activeTab === 'chat' ? <ChatPanel /> : <PeoplePanel />}
      </div>
    </aside>
  );
}
