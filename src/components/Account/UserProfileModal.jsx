import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  X, Award, MessageSquare, UserPlus, Check, Copy, Sparkles, Trophy, Activity, Layers,
  Camera, Type, Shapes, Users, StickyNote, Pencil, Smile, Clock, Zap, KeyRound, Lock, Pin, CheckCircle2
} from 'lucide-react';
import Avatar from '../Avatar';
import { ALL_BADGES, BADGE_TIERS } from '../../utils/badges';
import {
  isFollowing,
  followAccount,
  unfollowAccount,
  SUGGESTED_CREATORS,
} from '../../utils/socialFollow';
import { getFriends, addFriend } from '../../utils/friends';
import { goToFriendChat } from '../../utils/nav';
import { normalizeAccountId } from '../../utils/accountId';
import styles from './UserProfileModal.module.css';

const ICON_MAP = {
  Sparkles, Camera, Type, Layers, Shapes, UserPlus, Users, Award,
  StickyNote, Pencil, Smile, MessageSquare, Clock, Zap, KeyRound, Lock, Check, Pin, CheckCircle2
};

function BadgeIcon({ name, size = 20 }) {
  const IconComp = ICON_MAP[name] || Award;
  return <IconComp size={size} />;
}

export default function UserProfileModal({ user, onClose }) {
  const me = useSelector((s) => s.session?.currentUser);
  const [tab, setTab] = useState('overview');
  const [copied, setCopied] = useState(false);
  const [following, setFollowing] = useState(false);
  const [connected, setConnected] = useState(false);

  // If `user` is missing or is the current user, don't render or handle cleanly
  const profileId = normalizeAccountId(user?.account || user?.tag || user?.id || '');
  const suggested = SUGGESTED_CREATORS.find((s) => s.account === profileId || s.name === user?.name);

  const profile = {
    ...suggested,
    ...user,
    account: profileId || user?.account || user?.id || 'BR-COLLAB',
    name: user?.name || suggested?.name || 'Boardroom Creator',
    color: user?.color || suggested?.color || '#3b82f6',
    photoURL: user?.photoURL !== undefined ? user?.photoURL : suggested?.photoURL,
    role: user?.role || suggested?.role || 'Whiteboard Collaborator & Visual Thinker',
    bio:
      user?.bio ||
      suggested?.bio ||
      'Active collaborator creating human-centered infinite canvas rooms and interactive diagrams on Boardroom.',
    badgesCount: user?.badgesCount || suggested?.badgesCount || (user?.topBadges?.length || 8),
    topBadges: user?.topBadges || suggested?.topBadges || ['welcome', 'first_board', 'sticky_fan', 'reactor'],
  };

  useEffect(() => {
    if (profile.account) {
      setFollowing(isFollowing(profile.account));
      setConnected(getFriends().some((f) => f.account === profile.account));
    }
  }, [profile.account]);

  if (!user) return null;

  const handleToggleFollow = () => {
    if (following) {
      unfollowAccount(profile.account);
      setFollowing(false);
    } else {
      followAccount(profile);
      setFollowing(true);
    }
  };

  const handleConnect = () => {
    if (!connected) {
      addFriend({
        name: profile.name,
        account: profile.account,
        color: profile.color,
        photoURL: profile.photoURL,
      });
      setConnected(true);
    }
  };

  const handleCopyId = () => {
    if (profile.account) {
      navigator.clipboard?.writeText?.(profile.account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleMessage = () => {
    onClose?.();
    goToFriendChat(profile.account);
  };

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={styles.modal}>
        {/* Cover Banner */}
        <div
          className={styles.coverBanner}
          style={{
            background: `linear-gradient(135deg, ${profile.color}44 0%, #0f172a 90%)`,
          }}
        >
          <div className={styles.coverPattern} />
          <button className={styles.closeBtn} onClick={onClose} title="Close profile">
            <X size={18} />
          </button>
        </div>

        {/* Header Profile Content */}
        <div className={styles.headerContent}>
          <div className={styles.avatarContainer}>
            <div className={styles.avatarWrapper}>
              <Avatar user={profile} size={96} clickable={false} />
            </div>
            {profile.account && profile.account !== me?.id && (
              <div className={styles.actionToolbar} style={{ margin: 0 }}>
                <button
                  type="button"
                  className={following ? styles.btnFollowing : styles.btnPrimary}
                  onClick={handleToggleFollow}
                >
                  {following ? (
                    <>
                      <Check size={16} /> Following
                    </>
                  ) : (
                    <>
                      <UserPlus size={16} /> + Follow
                    </>
                  )}
                </button>
                <button type="button" className={styles.btnSecondary} onClick={handleMessage}>
                  <MessageSquare size={16} /> Message
                </button>
              </div>
            )}
          </div>

          <div className={styles.verifiedPill}>
            <Sparkles size={13} /> Verified Boardroom Collaborator
          </div>

          <div className={styles.nameRow}>
            <span className={styles.userName}>{profile.name}</span>
            {profile.account && (
              <span className={styles.idPill} onClick={handleCopyId} title="Click to copy Account ID">
                #{profile.account} <Copy size={12} />
                {copied && <span style={{ color: '#34d399', marginLeft: 4 }}>Copied!</span>}
              </span>
            )}
          </div>

          <div className={styles.userRole}>{profile.role}</div>
          <p className={styles.userBio}>{profile.bio}</p>

          {/* Key Stats Bar */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{profile.badgesCount || 8}</div>
              <div className={styles.statLabel}>Badges Earned</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{profile.visitsCount || 24}</div>
              <div className={styles.statLabel}>Canvas Visits</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{following ? 13 : 12}</div>
              <div className={styles.statLabel}>Followers</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>18</div>
              <div className={styles.statLabel}>Following</div>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className={styles.tabsNav}>
            <button
              type="button"
              className={`${styles.tabBtn} ${tab === 'overview' ? styles.tabBtnActive : ''}`}
              onClick={() => setTab('overview')}
            >
              <Trophy size={16} /> Overview & Achievements
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${tab === 'badges' ? styles.tabBtnActive : ''}`}
              onClick={() => setTab('badges')}
            >
              <Award size={16} /> All Badges ({ALL_BADGES.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className={styles.tabContent}>
            {tab === 'overview' ? (
              <div>
                <div className={styles.sectionTitle}>
                  <Sparkles size={18} style={{ color: '#f59e0b' }} /> Highlighted Achievements
                </div>
                <div className={styles.badgesGrid}>
                  {(profile.topBadges || ['welcome', 'first_board', 'sticky_fan', 'reactor']).slice(0, 4).map((bid) => {
                    const bObj = ALL_BADGES.find((ab) => ab.id === bid) || ALL_BADGES[0];
                    const tier = BADGE_TIERS[bObj.tier] || BADGE_TIERS.common;
                    return (
                      <div key={bid} className={styles.badgeCard}>
                        <div
                          className={styles.badgeIconBox}
                          style={{ color: tier.color, background: tier.bg }}
                        >
                          <BadgeIcon name={bObj.icon} size={22} />
                        </div>
                        <div className={styles.badgeInfo}>
                          <span className={styles.badgeName}>{bObj.name}</span>
                          <span className={styles.badgeDesc}>{bObj.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className={styles.activityBox}>
                  <div className={styles.activityIcon}>
                    <Activity size={24} />
                  </div>
                  <div className={styles.activityText}>
                    <h4>Real-Time Collaborative Activity</h4>
                    <p>
                      {profile.name.split(' ')[0]} frequently collaborates across whiteboard canvases using sticky note frameworks, freehand sketching, and instant diagram wireframing.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div className={styles.sectionTitle}>
                  <Layers size={18} style={{ color: '#3b82f6' }} /> Trophy Case & Progress
                </div>
                <div className={styles.badgesGrid}>
                  {ALL_BADGES.map((bObj) => {
                    const isUnlocked = (profile.topBadges || []).includes(bObj.id) || ['welcome', 'first_board', 'sticky_fan', 'reactor', 'board_master'].includes(bObj.id);
                    const tier = BADGE_TIERS[bObj.tier] || BADGE_TIERS.common;
                    return (
                      <div
                        key={bObj.id}
                        className={`${styles.badgeCard} ${!isUnlocked ? styles.badgeCardLocked : ''}`}
                      >
                        <div
                          className={styles.badgeIconBox}
                          style={{
                            color: isUnlocked ? tier.color : '#64748b',
                            background: isUnlocked ? tier.bg : 'rgba(255,255,255,0.05)',
                          }}
                        >
                          <BadgeIcon name={bObj.icon} size={22} />
                        </div>
                        <div className={styles.badgeInfo}>
                          <span className={styles.badgeName}>
                            {bObj.name} {!isUnlocked && <span style={{ fontSize: 11, color: '#64748b' }}>(Locked)</span>}
                          </span>
                          <span className={styles.badgeDesc}>{bObj.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
