import { useRef, useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft, Camera, Trash2, Check, ShieldCheck, LogOut, Mail, Copy,
  Award, Users, UserPlus, UserCheck, Sparkles, Layers, Shapes,
  StickyNote, Pencil, Smile, MessageSquare, KeyRound, Clock, Zap,
  Search, ExternalLink, Pin, Lock, Settings, Share2, Heart,
  TrendingUp, Briefcase, Type, Sliders,
} from 'lucide-react';
import { setUser } from '../../features/session/sessionSlice';
import { saveProfile, clearProfile, applyProfile } from '../../utils/profile';
import { publishLocal } from '../../utils/localDirectory';
import { accountId, normalizeAccountId } from '../../utils/accountId';
import { fileToAvatarDataURL } from '../../utils/imageResize';
import { goHome, goToRoom, goToMessages, goToFriendChat } from '../../utils/nav';
import { googleEnabled, signInWithGoogle, signOut } from '../../auth/auth';
import {
  ALL_BADGES, BADGE_TIERS, getUserStats, getUnlockedBadges,
  getBadgeProgress, getPinnedBadgeIds, togglePinBadge,
} from '../../utils/badges';
import {
  getFollowing, getFollowers, isFollowing, followAccount,
  unfollowAccount, toggleFollow, getSuggestedCollaborators,
  SOCIAL_EVENT,
} from '../../utils/socialFollow';
import Avatar from '../Avatar';
import styles from './Account.module.css';

// Dynamic icon resolver for badges
const ICON_MAP = {
  Sparkles, Camera, Type, Layers, Shapes, UserPlus, Users, Award,
  StickyNote, Pencil, Smile, MessageSquare, Clock, Zap, KeyRound,
  Lock, Check, Pin,
};

function BadgeIcon({ name, size = 20 }) {
  const IconComp = ICON_MAP[name] || Award;
  return <IconComp size={size} />;
}

export default function Account() {
  const dispatch = useDispatch();
  const user = useSelector((s) => s.session.currentUser);

  // Profile fields
  const [name, setName] = useState(user?.name || '');
  const [role, setRole] = useState(user?.role || 'Full-Stack Developer & Whiteboard Creator');
  const [bio, setBio] = useState(user?.bio || 'Passionate about real-time collaborative canvas tools, visual architecture, and multiplayer web apps.');
  const [savedTick, setSavedTick] = useState(false);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const fileRef = useRef(null);

  // Navigation tab inside Account: 'overview' | 'badges' | 'social' | 'settings'
  const [activeTab, setActiveTab] = useState('overview');

  // Social tabs: 'following' | 'followers' | 'explore'
  const [socialSubTab, setSocialSubTab] = useState('following');
  const [followingList, setFollowingList] = useState(() => getFollowing());
  const [followersList, setFollowersList] = useState(() => getFollowers());
  const [suggestedList, setSuggestedList] = useState(() => getSuggestedCollaborators());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  // Badges state
  const [userStats, setUserStats] = useState(() => getUserStats());
  const [pinnedIds, setPinnedIds] = useState(() => getPinnedBadgeIds(user?.id));
  const [badgeFilter, setBadgeFilter] = useState('all'); // 'all' | 'unlocked' | 'locked'

  const myTag = accountId(user?.id || '');

  // Keep lists refreshed when social events or badge events fire
  useEffect(() => {
    const refreshSocial = () => {
      setFollowingList(getFollowing());
      setFollowersList(getFollowers());
      setSuggestedList(getSuggestedCollaborators());
    };
    const refreshBadges = () => {
      setUserStats(getUserStats());
      setPinnedIds(getPinnedBadgeIds(user?.id));
    };
    window.addEventListener(SOCIAL_EVENT, refreshSocial);
    window.addEventListener('boardroom:badges-changed', refreshBadges);
    window.addEventListener('boardroom:stats-changed', refreshBadges);
    return () => {
      window.removeEventListener(SOCIAL_EVENT, refreshSocial);
      window.removeEventListener('boardroom:badges-changed', refreshBadges);
      window.removeEventListener('boardroom:stats-changed', refreshBadges);
    };
  }, [user?.id]);

  // Sync profile edits
  const patchProfile = (patch) => {
    if (!user?.id) return;
    saveProfile(user.id, patch);
    const updated = { ...user, ...patch };
    dispatch(setUser(updated));
    publishLocal(updated);
  };

  const onSaveSettings = () => {
    const cleanName = name.trim() || 'User';
    const cleanRole = role.trim() || 'Canvas Creator';
    const cleanBio = bio.trim() || 'Collaborative whiteboard creator on Boardroom.';
    setError('');
    patchProfile({ name: cleanName, role: cleanRole, bio: cleanBio });
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1800);
  };

  const onPickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await fileToAvatarDataURL(file);
      patchProfile({ photoURL: dataUrl });
      setError('');
    } catch (err) {
      setError(err.message || 'Could not use that image.');
    }
  };

  const onRemovePhoto = () => patchProfile({ photoURL: null });

  const onCopyMyId = async () => {
    try {
      await navigator.clipboard.writeText(myTag);
    } catch {
      window.prompt('Copy your account ID:', myTag);
    }
    setCopiedId('self');
    setTimeout(() => setCopiedId(null), 1600);
  };

  const onReset = () => {
    if (!window.confirm('Reset your profile customization on this device?')) return;
    clearProfile(user.id);
    const base = { ...user, photoURL: null, bio: undefined, role: undefined };
    dispatch(setUser(base));
    setName(base.name || 'User');
    setRole('Full-Stack Developer & Whiteboard Creator');
    setBio('Passionate about real-time collaborative canvas tools, visual architecture, and multiplayer web apps.');
  };

  const onSignOut = async () => {
    await signOut();
    dispatch(setUser(null));
    goHome();
  };

  const onUpgradeToGoogle = async () => {
    try {
      const u = await signInWithGoogle();
      dispatch(setUser(applyProfile(u)));
      setName(u.name);
      setError('');
    } catch (err) {
      setError(err?.message || 'Google sign-in failed.');
    }
  };

  // Social actions
  const handleToggleFollow = (target) => {
    toggleFollow(target);
    setFollowingList(getFollowing());
    setSuggestedList(getSuggestedCollaborators());
  };

  const handleSearchAccount = (e) => {
    e.preventDefault();
    const clean = normalizeAccountId(searchQuery);
    if (!clean) {
      setSearchResult({ error: 'Please enter a valid Account ID like BR-4K7P-2QX9' });
      return;
    }
    if (clean === myTag) {
      setSearchResult({ error: 'That is your own Account ID!' });
      return;
    }
    // Check if they exist in suggested or followers or local directory
    const foundSuggest = suggestedList.find((s) => s.account === clean)
      || followersList.find((f) => f.account === clean)
      || followingList.find((f) => f.account === clean);

    if (foundSuggest) {
      setSearchResult({ profile: foundSuggest });
      return;
    }
    // Create a rich profile card for any valid input tag so users can follow them immediately
    setSearchResult({
      profile: {
        account: clean,
        name: `Collaborator ${clean.split('-').slice(1).join('-') || clean}`,
        role: 'Real-time Whiteboard Collaborator',
        bio: 'Active member of the Boardroom collaborative canvas community.',
        color: '#6366f1',
        badgesCount: 9,
        topBadges: ['first_board', 'sticky_fan', 'reactor'],
      },
    });
  };

  // Derived badges data
  const socialContext = { followingCount: followingList.length, followersCount: followersList.length };
  const unlockedBadges = useMemo(() => getUnlockedBadges(user, socialContext), [user, socialContext, userStats]);
  const pinnedBadges = useMemo(() => {
    return ALL_BADGES.filter((b) => pinnedIds.includes(b.id));
  }, [pinnedIds]);

  const filteredBadges = useMemo(() => {
    if (badgeFilter === 'unlocked') {
      return ALL_BADGES.filter((b) => unlockedBadges.some((u) => u.id === b.id));
    }
    if (badgeFilter === 'locked') {
      return ALL_BADGES.filter((b) => !unlockedBadges.some((u) => u.id === b.id));
    }
    return ALL_BADGES;
  }, [badgeFilter, unlockedBadges]);

  if (!user) return null;
  const isGuest = user.provider !== 'google';

  return (
    <div className={styles.page}>
      {/* Ambient background glows */}
      <div className={styles.ambientOrb1} aria-hidden="true" />
      <div className={styles.ambientOrb2} aria-hidden="true" />

      {/* Header */}
      <header className={styles.header}>
        <button className={styles.backBtn} onClick={goHome}>
          <ArrowLeft size={18} /> Home
        </button>
        <div className={styles.brand} onClick={goHome}>
          <img src="/board.svg" className={styles.brandMark} alt="" />
          <span>BOARDROOM</span>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.navMsgBtn} onClick={goToMessages} title="Direct Messages">
            <MessageSquare size={18} />
            <span>Messages</span>
          </button>
        </div>
      </header>

      <main className={styles.main}>
        {/* ---- Profile Banner / Header Card ---- */}
        <section className={styles.profileBannerCard}>
          <div className={styles.bannerBackground}>
            <div className={styles.bannerGrid} />
          </div>
          <div className={styles.profileHeaderContent}>
            <div className={styles.avatarContainer}>
              <Avatar user={user} size={112} />
              <button
                className={styles.avatarEditOverlay}
                onClick={() => fileRef.current?.click()}
                title="Change profile picture"
              >
                <Camera size={20} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickPhoto} />
            </div>

            <div className={styles.profileMeta}>
              <div className={styles.nameRowHeader}>
                <h1 className={styles.displayName}>{user.name || 'User'}</h1>
                <span className={styles.verifiedBadge} title="Boardroom Verified Collaborator">
                  <Sparkles size={14} /> Verified
                </span>
                <span className={styles.roleTag}>{role || 'Canvas Creator'}</span>
              </div>

              <div className={styles.tagRowHeader}>
                <span className={styles.accountTagBadge}>#{myTag}</span>
                <button className={styles.copyIdBtn} onClick={onCopyMyId} title="Copy Account ID">
                  {copiedId === 'self' ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedId === 'self' ? 'Copied ID' : 'Copy ID'}</span>
                </button>
              </div>

              <p className={styles.userBioText}>{bio}</p>

              {/* Quick Stat Bar */}
              <div className={styles.statsBar}>
                <button className={styles.statChip} onClick={() => { setActiveTab('social'); setSocialSubTab('followers'); }}>
                  <span className={styles.statNum}>{followersList.length}</span>
                  <span className={styles.statLabel}>Followers</span>
                </button>
                <div className={styles.statDivider} />
                <button className={styles.statChip} onClick={() => { setActiveTab('social'); setSocialSubTab('following'); }}>
                  <span className={styles.statNum}>{followingList.length}</span>
                  <span className={styles.statLabel}>Following</span>
                </button>
                <div className={styles.statDivider} />
                <button className={styles.statChip} onClick={() => setActiveTab('badges')}>
                  <span className={styles.statNum}>{unlockedBadges.length}</span>
                  <span className={styles.statLabel}>Badges</span>
                </button>
                <div className={styles.statDivider} />
                <div className={styles.statChip}>
                  <span className={styles.statNum}>{userStats.boardsVisited || 1}</span>
                  <span className={styles.statLabel}>Canvas Visits</span>
                </div>
              </div>
            </div>

            <div className={styles.profileHeaderActions}>
              <button className={styles.editProfileBtn} onClick={() => setActiveTab('settings')}>
                <Settings size={16} /> Edit Profile
              </button>
              <button className={styles.shareProfileBtn} onClick={onCopyMyId}>
                <Share2 size={16} /> Share Profile
              </button>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <nav className={styles.profileNavTabs}>
            <button
              className={`${styles.navTab} ${activeTab === 'overview' ? styles.navTabActive : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <Zap size={16} /> Overview
            </button>
            <button
              className={`${styles.navTab} ${activeTab === 'badges' ? styles.navTabActive : ''}`}
              onClick={() => setActiveTab('badges')}
            >
              <Award size={16} /> Badges & Rewards
              <span className={styles.tabBadgeCount}>{unlockedBadges.length}/{ALL_BADGES.length}</span>
            </button>
            <button
              className={`${styles.navTab} ${activeTab === 'social' ? styles.navTabActive : ''}`}
              onClick={() => setActiveTab('social')}
            >
              <Users size={16} /> Following & Followers
              <span className={styles.tabBadgeCount}>{followingList.length + followersList.length}</span>
            </button>
            <button
              className={`${styles.navTab} ${activeTab === 'settings' ? styles.navTabActive : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Sliders size={16} /> Settings
            </button>
          </nav>
        </section>

        {error && activeTab === 'settings' && <div className={styles.errorBanner}>{error}</div>}

        {/* =========================================================
            TAB 1: OVERVIEW
           ========================================================= */}
        {activeTab === 'overview' && (
          <div className={styles.overviewGrid}>
            {/* Left Col: Pinned Badges & Achievements */}
            <div className={styles.overviewColLeft}>
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionTitleWrap}>
                    <Pin size={18} className={styles.pinIcon} />
                    <h2 className={styles.sectionTitle}>Pinned Achievements</h2>
                  </div>
                  <button className={styles.linkActionBtn} onClick={() => setActiveTab('badges')}>
                    Customize pinned <ExternalLink size={13} />
                  </button>
                </div>

                <div className={styles.pinnedBadgesGrid}>
                  {pinnedBadges.map((badge) => {
                    const tier = BADGE_TIERS[badge.tier] || BADGE_TIERS.common;
                    return (
                      <div
                        key={badge.id}
                        className={styles.pinnedBadgeCard}
                        style={{ '--tier-border': tier.border, '--tier-bg': tier.bg }}
                      >
                        <div className={styles.badgeIconCircle} style={{ color: tier.color, background: tier.bg }}>
                          <BadgeIcon name={badge.icon} size={24} />
                        </div>
                        <div className={styles.badgeInfo}>
                          <div className={styles.badgeNameRow}>
                            <span className={styles.badgeName}>{badge.name}</span>
                            <span className={styles.badgeTierPill} style={{ color: tier.color, border: `1px solid ${tier.border}` }}>
                              {tier.label}
                            </span>
                          </div>
                          <p className={styles.badgeDesc}>{badge.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                  {pinnedBadges.length === 0 && (
                    <div className={styles.emptyPinned}>
                      <Award size={32} className={styles.emptyIcon} />
                      <p>No pinned badges yet. Go to Badges tab to pin your top achievements!</p>
                      <button className={styles.primaryBtn} onClick={() => setActiveTab('badges')}>
                        Browse Badges
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Bio & Collaborative Expertise */}
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Collaborative Bio & Expertise</h2>
                  <button className={styles.linkActionBtn} onClick={() => setActiveTab('settings')}>
                    Edit <Pencil size={13} />
                  </button>
                </div>
                <p className={styles.fullBioText}>{bio}</p>
                <div className={styles.expertiseTags}>
                  <span className={styles.tagItem}>Infinite Canvas</span>
                  <span className={styles.tagItem}>Real-Time WebSockets</span>
                  <span className={styles.tagItem}>Sticky Notes & Architecture</span>
                  <span className={styles.tagItem}>Freehand Sketching</span>
                  <span className={styles.tagItem}>PDF/PNG Export</span>
                </div>
              </section>
            </div>

            {/* Right Col: Network Summary & Quick Actions */}
            <div className={styles.overviewColRight}>
              <section className={styles.sectionCard}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Network Summary</h2>
                  <button className={styles.linkActionBtn} onClick={() => setActiveTab('social')}>
                    View all <ExternalLink size={13} />
                  </button>
                </div>

                <div className={styles.networkStatsBox}>
                  <div className={styles.netStatItem} onClick={() => { setActiveTab('social'); setSocialSubTab('followers'); }}>
                    <Users size={20} className={styles.netIcon} />
                    <div>
                      <div className={styles.netNum}>{followersList.length}</div>
                      <div className={styles.netLabel}>Followers</div>
                    </div>
                  </div>
                  <div className={styles.netStatItem} onClick={() => { setActiveTab('social'); setSocialSubTab('following'); }}>
                    <UserCheck size={20} className={styles.netIcon} />
                    <div>
                      <div className={styles.netNum}>{followingList.length}</div>
                      <div className={styles.netLabel}>Following</div>
                    </div>
                  </div>
                </div>

                <div className={styles.miniFollowList}>
                  <span className={styles.miniHeaderTitle}>Top Collaborators Following You</span>
                  {followersList.slice(0, 3).map((f) => (
                    <div key={f.account} className={styles.miniFollowRow}>
                      <div className={styles.miniAvatar} style={{ background: f.color }}>
                        {f.photoURL ? <img src={f.photoURL} alt="" /> : f.name.charAt(0)}
                      </div>
                      <div className={styles.miniInfo}>
                        <div className={styles.miniName}>{f.name}</div>
                        <div className={styles.miniRole}>{f.role || 'Collaborator'}</div>
                      </div>
                      <button
                        className={isFollowing(f.account) ? styles.btnFollowingSmall : styles.btnFollowSmall}
                        onClick={() => handleToggleFollow(f)}
                      >
                        {isFollowing(f.account) ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.sectionCard}>
                <h2 className={styles.sectionTitle}>Quick Navigation</h2>
                <div className={styles.quickNavList}>
                  <button className={styles.quickNavCard} onClick={goToMessages}>
                    <MessageSquare size={20} className={styles.quickIcon} />
                    <div className={styles.quickText}>
                      <div className={styles.quickTitle}>Direct Messages</div>
                      <div className={styles.quickSubtitle}>Chat live with your network</div>
                    </div>
                    <ArrowLeft size={16} className={styles.quickArrow} style={{ transform: 'rotate(180deg)' }} />
                  </button>
                  <button className={styles.quickNavCard} onClick={() => goToRoom('main-room')}>
                    <Layers size={20} className={styles.quickIcon} />
                    <div className={styles.quickText}>
                      <div className={styles.quickTitle}>Main Team Room</div>
                      <div className={styles.quickSubtitle}>Jump back into collaboration</div>
                    </div>
                    <ArrowLeft size={16} className={styles.quickArrow} style={{ transform: 'rotate(180deg)' }} />
                  </button>
                </div>
              </section>
            </div>
          </div>
        )}

        {/* =========================================================
            TAB 2: BADGES & REWARDS
           ========================================================= */}
        {activeTab === 'badges' && (
          <section className={styles.sectionCardFull}>
            <div className={styles.badgeTabHeader}>
              <div>
                <h2 className={styles.sectionTitle}>Badges & Achievements</h2>
                <p className={styles.sectionSubText}>
                  Earn badges by collaborating across canvases, following creators, and mastering whiteboard tools.
                </p>
              </div>
              <div className={styles.badgeFilterBar}>
                <button
                  className={`${styles.filterBtn} ${badgeFilter === 'all' ? styles.filterBtnActive : ''}`}
                  onClick={() => setBadgeFilter('all')}
                >
                  All ({ALL_BADGES.length})
                </button>
                <button
                  className={`${styles.filterBtn} ${badgeFilter === 'unlocked' ? styles.filterBtnActive : ''}`}
                  onClick={() => setBadgeFilter('unlocked')}
                >
                  Unlocked ({unlockedBadges.length})
                </button>
                <button
                  className={`${styles.filterBtn} ${badgeFilter === 'locked' ? styles.filterBtnActive : ''}`}
                  onClick={() => setBadgeFilter('locked')}
                >
                  Locked ({ALL_BADGES.length - unlockedBadges.length})
                </button>
              </div>
            </div>

            <div className={styles.badgesFullGrid}>
              {filteredBadges.map((badge) => {
                const tier = BADGE_TIERS[badge.tier] || BADGE_TIERS.common;
                const progress = getBadgeProgress(badge, user, socialContext);
                const isPinned = pinnedIds.includes(badge.id);

                return (
                  <div
                    key={badge.id}
                    className={`${styles.badgeCard} ${progress.unlocked ? styles.badgeCardUnlocked : styles.badgeCardLocked}`}
                    style={progress.unlocked ? { '--tier-border': tier.border, '--tier-bg': tier.bg } : {}}
                  >
                    <div className={styles.badgeCardTop}>
                      <div
                        className={styles.badgeCardIconBox}
                        style={progress.unlocked ? { color: tier.color, background: tier.bg } : {}}
                      >
                        {progress.unlocked ? <BadgeIcon name={badge.icon} size={28} /> : <Lock size={24} className={styles.lockIcon} />}
                      </div>
                      <div className={styles.badgeCardHeader}>
                        <div className={styles.badgeCardTitleRow}>
                          <span className={styles.badgeCardTitle}>{badge.name}</span>
                          <span className={styles.badgeTierPill} style={progress.unlocked ? { color: tier.color, border: `1px solid ${tier.border}` } : {}}>
                            {tier.label}
                          </span>
                        </div>
                        <p className={styles.badgeCardDesc}>{badge.desc}</p>
                      </div>
                    </div>

                    <div className={styles.badgeCardBottom}>
                      {progress.unlocked ? (
                        <div className={styles.unlockedFooterRow}>
                          <span className={styles.unlockedDate}>
                            <Check size={14} className={styles.unlockedCheck} /> Unlocked
                          </span>
                          <button
                            className={`${styles.pinToggleBtn} ${isPinned ? styles.pinToggleBtnActive : ''}`}
                            onClick={() => togglePinBadge(user?.id, badge.id)}
                            title={isPinned ? 'Unpin from profile' : 'Pin to profile top'}
                          >
                            <Pin size={13} /> {isPinned ? 'Pinned' : 'Pin to Profile'}
                          </button>
                        </div>
                      ) : (
                        <div className={styles.progressSection}>
                          <div className={styles.progressLabelRow}>
                            <span>{badge.reqLabel || badge.desc}</span>
                            <span className={styles.progressPercent}>{progress.current} / {progress.max}</span>
                          </div>
                          <div className={styles.progressBarBg}>
                            <div className={styles.progressBarFill} style={{ width: `${progress.percent}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* =========================================================
            TAB 3: FOLLOWING & FOLLOWERS SOCIAL GRAPH
           ========================================================= */}
        {activeTab === 'social' && (
          <section className={styles.sectionCardFull}>
            <div className={styles.socialHeader}>
              <div className={styles.socialNavSub}>
                <button
                  className={`${styles.subTabBtn} ${socialSubTab === 'following' ? styles.subTabBtnActive : ''}`}
                  onClick={() => setSocialSubTab('following')}
                >
                  <UserCheck size={16} /> Following ({followingList.length})
                </button>
                <button
                  className={`${styles.subTabBtn} ${socialSubTab === 'followers' ? styles.subTabBtnActive : ''}`}
                  onClick={() => setSocialSubTab('followers')}
                >
                  <Users size={16} /> Followers ({followersList.length})
                </button>
                <button
                  className={`${styles.subTabBtn} ${socialSubTab === 'explore' ? styles.subTabBtnActive : ''}`}
                  onClick={() => { setSocialSubTab('explore'); setSearchResult(null); }}
                >
                  <UserPlus size={16} /> Explore & Add Collaborators
                </button>
              </div>
            </div>

            {/* Sub-Tab 1: Following */}
            {socialSubTab === 'following' && (
              <div className={styles.socialListContainer}>
                {followingList.length === 0 ? (
                  <div className={styles.emptySocialState}>
                    <Users size={40} className={styles.emptyIcon} />
                    <h3>You aren't following anyone yet</h3>
                    <p>Follow fellow developers and whiteboard creators to quickly jump into chat and see their updates.</p>
                    <button className={styles.primaryBtn} onClick={() => setSocialSubTab('explore')}>
                      Explore Creators
                    </button>
                  </div>
                ) : (
                  <div className={styles.socialGrid}>
                    {followingList.map((f) => (
                      <div key={f.account} className={styles.collaboratorCard}>
                        <div className={styles.collabHeader}>
                          <div className={styles.collabAvatar} style={{ background: f.color || '#3b82f6' }}>
                            {f.photoURL ? <img src={f.photoURL} alt="" /> : f.name.charAt(0)}
                          </div>
                          <div className={styles.collabMeta}>
                            <div className={styles.collabNameRow}>
                              <span className={styles.collabName}>{f.name}</span>
                              <span className={styles.collabAccount}>#{f.account}</span>
                            </div>
                            <span className={styles.collabRole}>{f.role || 'Whiteboard Collaborator'}</span>
                          </div>
                        </div>
                        <p className={styles.collabBio}>{f.bio || 'Collaborative canvas creator on Boardroom.'}</p>
                        <div className={styles.collabBadgesRow}>
                          <span className={styles.badgesCountTag}>
                            <Award size={13} /> {f.badgesCount || 8} badges
                          </span>
                          <div className={styles.badgeIconsRow}>
                            {(f.topBadges || ['first_board', 'sticky_fan']).slice(0, 3).map((bid) => {
                              const bObj = ALL_BADGES.find((ab) => ab.id === bid) || ALL_BADGES[3];
                              const tier = BADGE_TIERS[bObj.tier] || BADGE_TIERS.common;
                              return (
                                <span key={bid} className={styles.collabMiniBadge} style={{ color: tier.color, background: tier.bg }} title={bObj.name}>
                                  <BadgeIcon name={bObj.icon} size={13} />
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div className={styles.collabActions}>
                          <button className={styles.chatActionBtn} onClick={() => goToFriendChat(f.account)} title="Direct Message">
                            <MessageSquare size={14} /> Message
                          </button>
                          <button
                            className={styles.unfollowActionBtn}
                            onClick={() => handleToggleFollow(f)}
                            title="Unfollow user"
                          >
                            Following
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab 2: Followers */}
            {socialSubTab === 'followers' && (
              <div className={styles.socialListContainer}>
                {followersList.length === 0 ? (
                  <div className={styles.emptySocialState}>
                    <Award size={40} className={styles.emptyIcon} />
                    <h3>No followers yet</h3>
                    <p>Share your account ID #{myTag} or collaborate in public rooms to build your follower network!</p>
                  </div>
                ) : (
                  <div className={styles.socialGrid}>
                    {followersList.map((f) => {
                      const amFollowing = isFollowing(f.account);
                      return (
                        <div key={f.account} className={styles.collaboratorCard}>
                          <div className={styles.collabHeader}>
                            <div className={styles.collabAvatar} style={{ background: f.color || '#8b5cf6' }}>
                              {f.photoURL ? <img src={f.photoURL} alt="" /> : f.name.charAt(0)}
                            </div>
                            <div className={styles.collabMeta}>
                              <div className={styles.collabNameRow}>
                                <span className={styles.collabName}>{f.name}</span>
                                <span className={styles.collabAccount}>#{f.account}</span>
                              </div>
                              <span className={styles.collabRole}>{f.role || 'Whiteboard Collaborator'}</span>
                            </div>
                          </div>
                          <p className={styles.collabBio}>{f.bio || 'Active participant on Boardroom canvas.'}</p>
                          <div className={styles.collabBadgesRow}>
                            <span className={styles.badgesCountTag}>
                              <Award size={13} /> {f.badgesCount || 10} badges
                            </span>
                          </div>
                          <div className={styles.collabActions}>
                            <button className={styles.chatActionBtn} onClick={() => goToFriendChat(f.account)} title="Direct Message">
                              <MessageSquare size={14} /> Message
                            </button>
                            <button
                              className={amFollowing ? styles.unfollowActionBtn : styles.followBackBtn}
                              onClick={() => handleToggleFollow(f)}
                            >
                              {amFollowing ? 'Following' : 'Follow Back'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Sub-Tab 3: Explore & Add */}
            {socialSubTab === 'explore' && (
              <div className={styles.exploreContainer}>
                {/* Search Bar */}
                <form className={styles.exploreSearchForm} onSubmit={handleSearchAccount}>
                  <div className={styles.searchInputWrap}>
                    <Search size={18} className={styles.searchIconInput} />
                    <input
                      className={styles.exploreSearchInput}
                      placeholder="Enter exact Account ID to follow (e.g., BR-4K7P-2QX9)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button type="button" className={styles.clearSearchBtn} onClick={() => { setSearchQuery(''); setSearchResult(null); }}>
                        ×
                      </button>
                    )}
                  </div>
                  <button type="submit" className={styles.primaryBtn} disabled={!searchQuery.trim()}>
                    Look Up Profile
                  </button>
                </form>

                {/* Search Result */}
                {searchResult && (
                  <div className={styles.searchResultBox}>
                    {searchResult.error ? (
                      <div className={styles.searchErrorText}>{searchResult.error}</div>
                    ) : (
                      <div className={styles.collaboratorCard}>
                        <div className={styles.collabHeader}>
                          <div className={styles.collabAvatar} style={{ background: searchResult.profile.color || '#3b82f6' }}>
                            {searchResult.profile.photoURL ? <img src={searchResult.profile.photoURL} alt="" /> : searchResult.profile.name.charAt(0)}
                          </div>
                          <div className={styles.collabMeta}>
                            <div className={styles.collabNameRow}>
                              <span className={styles.collabName}>{searchResult.profile.name}</span>
                              <span className={styles.collabAccount}>#{searchResult.profile.account}</span>
                            </div>
                            <span className={styles.collabRole}>{searchResult.profile.role}</span>
                          </div>
                        </div>
                        <p className={styles.collabBio}>{searchResult.profile.bio}</p>
                        <div className={styles.collabActions}>
                          <button className={styles.chatActionBtn} onClick={() => goToFriendChat(searchResult.profile.account)}>
                            <MessageSquare size={14} /> Message
                          </button>
                          <button
                            className={isFollowing(searchResult.profile.account) ? styles.unfollowActionBtn : styles.followBackBtn}
                            onClick={() => handleToggleFollow(searchResult.profile)}
                          >
                            {isFollowing(searchResult.profile.account) ? 'Following' : 'Follow Profile'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Suggested Creators */}
                <div className={styles.suggestedSection}>
                  <h3 className={styles.suggestedSectionTitle}>Suggested Boardroom Creators & Teammates</h3>
                  <div className={styles.socialGrid}>
                    {suggestedList.map((s) => {
                      const amFollowing = isFollowing(s.account);
                      return (
                        <div key={s.account} className={styles.collaboratorCard}>
                          <div className={styles.collabHeader}>
                            <div className={styles.collabAvatar} style={{ background: s.color || '#3b82f6' }}>
                              {s.photoURL ? <img src={s.photoURL} alt="" /> : s.name.charAt(0)}
                            </div>
                            <div className={styles.collabMeta}>
                              <div className={styles.collabNameRow}>
                                <span className={styles.collabName}>{s.name}</span>
                                <span className={styles.collabAccount}>#{s.account}</span>
                              </div>
                              <span className={styles.collabRole}>{s.role}</span>
                            </div>
                          </div>
                          <p className={styles.collabBio}>{s.bio}</p>
                          <div className={styles.collabBadgesRow}>
                            <span className={styles.badgesCountTag}>
                              <Award size={13} /> {s.badgesCount} badges
                            </span>
                            <div className={styles.badgeIconsRow}>
                              {(s.topBadges || []).map((bid) => {
                                const bObj = ALL_BADGES.find((ab) => ab.id === bid) || ALL_BADGES[0];
                                const tier = BADGE_TIERS[bObj.tier] || BADGE_TIERS.common;
                                return (
                                  <span key={bid} className={styles.collabMiniBadge} style={{ color: tier.color, background: tier.bg }} title={bObj.name}>
                                    <BadgeIcon name={bObj.icon} size={13} />
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          <div className={styles.collabActions}>
                            <button className={styles.chatActionBtn} onClick={() => goToFriendChat(s.account)}>
                              <MessageSquare size={14} /> Message
                            </button>
                            <button
                              className={amFollowing ? styles.unfollowActionBtn : styles.followBackBtn}
                              onClick={() => handleToggleFollow(s)}
                            >
                              {amFollowing ? 'Following' : '+ Follow'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* =========================================================
            TAB 4: SETTINGS
           ========================================================= */}
        {activeTab === 'settings' && (
          <div className={styles.settingsGrid}>
            <section className={styles.sectionCard}>
              <div className={styles.sectionTitleWrap}>
                <Settings size={18} className={styles.pinIcon} />
                <h2 className={styles.sectionTitle}>Profile Customization</h2>
              </div>
              <p className={styles.sectionSubText}>
                Changes saved here will appear across your profile card, direct messages, and all collaborative whiteboards.
              </p>

              <div className={styles.formRow}>
                <label className={styles.fieldLabel} htmlFor="displayNameInput">Display Name</label>
                <input
                  id="displayNameInput"
                  className={styles.inputField}
                  value={name}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.fieldLabel} htmlFor="roleInput">Role / Headline Title</label>
                <input
                  id="roleInput"
                  className={styles.inputField}
                  value={role}
                  maxLength={60}
                  placeholder="e.g., Full-Stack Developer & UI Architect"
                  onChange={(e) => setRole(e.target.value)}
                />
              </div>

              <div className={styles.formRow}>
                <label className={styles.fieldLabel} htmlFor="bioInput">Professional Bio</label>
                <textarea
                  id="bioInput"
                  className={styles.textareaField}
                  rows={3}
                  value={bio}
                  maxLength={180}
                  placeholder="Share your expertise, projects, or interests with fellow collaborators..."
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <div className={styles.formActionsRow}>
                <button className={styles.primarySaveBtn} onClick={onSaveSettings}>
                  {savedTick ? <><Check size={16} /> Profile Saved!</> : 'Save Profile Changes'}
                </button>
              </div>
            </section>

            <section className={styles.sectionCard}>
              <h2 className={styles.sectionTitle}>Account Details & Security</h2>
              <dl className={styles.detailsList}>
                <div className={styles.detailRow}>
                  <dt>Sign-In Method</dt>
                  <dd className={styles.providerTag}>
                    <ShieldCheck size={16} />
                    {user.provider === 'google' ? 'Google Account (Cloud Sync)' : 'Guest Device Account (Offline)'}
                  </dd>
                </div>
                {user.email && (
                  <div className={styles.detailRow}>
                    <dt>Email Address</dt>
                    <dd className={styles.emailTag}><Mail size={15} /> {user.email}</dd>
                  </div>
                )}
                <div className={styles.detailRow}>
                  <dt>Shareable Account ID</dt>
                  <dd className={styles.accountIdRow}>
                    <span className={styles.monoTag}>{myTag}</span>
                    <button className={styles.iconCopyBtn} onClick={onCopyMyId} title="Copy ID">
                      {copiedId === 'self' ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </dd>
                </div>
              </dl>

              {isGuest && googleEnabled && (
                <div className={styles.upgradeBox}>
                  <p>Upgrade to a Google Account to sync your profile across devices and browsers seamlessly.</p>
                  <button className={styles.googleBtn} onClick={onUpgradeToGoogle}>
                    Sign in with Google
                  </button>
                </div>
              )}

              <div className={styles.dangerZoneRow}>
                <button className={styles.resetBtn} onClick={onReset}>
                  <Trash2 size={15} /> Reset Customizations
                </button>
                <button className={styles.signOutBtn} onClick={onSignOut}>
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
