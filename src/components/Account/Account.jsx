import { useRef, useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  ArrowLeft, Camera, Trash2, Check, ShieldCheck, LogOut, Mail, Copy,
  Award, Users, UserPlus, UserCheck, Sparkles, Layers, Shapes,
  StickyNote, Pencil, Smile, MessageSquare, KeyRound, Clock, Zap,
  Search, ExternalLink, Pin, Lock, Settings, Share2, Briefcase, Type,
  Sliders, ArrowRight, CheckCircle2,
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
  Lock, Check, Pin, CheckCircle2,
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
    const foundSuggest = suggestedList.find((s) => s.account === clean)
      || followersList.find((f) => f.account === clean)
      || followingList.find((f) => f.account === clean);

    if (foundSuggest) {
      setSearchResult({ profile: foundSuggest });
      return;
    }
    setSearchResult({
      profile: {
        account: clean,
        name: `Collaborator ${clean.split('-').slice(1).join('-') || clean}`,
        role: 'Real-time Whiteboard Collaborator',
        bio: 'Active member of the Boardroom collaborative canvas community.',
        color: '#2563eb',
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
      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={goHome}>
            <ArrowLeft size={16} /> Home
          </button>
          <div className={styles.headerDivider} />
          <div className={styles.brand} onClick={goHome}>
            <img src="/board.svg" className={styles.brandMark} alt="" />
            <span>BOARDROOM</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.navMsgBtn} onClick={goToMessages} title="Direct Messages">
            <MessageSquare size={16} />
            <span>Messages</span>
          </button>
        </div>
      </header>

      <main className={styles.mainContainer}>
        {/* ---- Profile Header Card ---- */}
        <section className={styles.headerCard}>
          <div className={styles.coverBanner}>
            <div className={styles.coverPattern} />
          </div>

          <div className={styles.headerBody}>
            {/* Avatar overlapping cover */}
            <div className={styles.avatarRow}>
              <div className={styles.avatarBox}>
                <Avatar user={user} size={116} />
                <button
                  className={styles.avatarEditBtn}
                  onClick={() => fileRef.current?.click()}
                  title="Change profile photo"
                >
                  <Camera size={18} />
                </button>
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickPhoto} />
              </div>

              <div className={styles.profileActionBtns}>
                <button className={styles.btnSecondary} onClick={() => setActiveTab('settings')}>
                  <Settings size={15} /> Edit Profile
                </button>
                <button className={styles.btnPrimary} onClick={onCopyMyId}>
                  <Share2 size={15} /> Share Profile
                </button>
              </div>
            </div>

            {/* Profile Meta Info on crisp white surface */}
            <div className={styles.metaRow}>
              <div className={styles.metaTitleGroup}>
                <div className={styles.nameBadgeGroup}>
                  <h1 className={styles.displayNameText}>{user.name || 'User'}</h1>
                  <span className={styles.verifiedPill}>
                    <Sparkles size={13} /> Verified Collaborator
                  </span>
                </div>
                <p className={styles.roleText}>{role || 'Full-Stack Developer & Whiteboard Creator'}</p>
              </div>

              <div className={styles.tagGroup}>
                <span className={styles.accountTagMono}>#{myTag}</span>
                <button className={styles.copyTagLink} onClick={onCopyMyId} title="Copy Account ID">
                  {copiedId === 'self' ? <Check size={14} className={styles.iconGreen} /> : <Copy size={14} />}
                  <span>{copiedId === 'self' ? 'Copied to clipboard' : 'Copy ID'}</span>
                </button>
              </div>

              <p className={styles.bioText}>{bio}</p>

              {/* Quick Counter Row */}
              <div className={styles.countersRow}>
                <button
                  className={styles.counterItem}
                  onClick={() => { setActiveTab('social'); setSocialSubTab('followers'); }}
                >
                  <span className={styles.counterValue}>{followersList.length}</span>
                  <span className={styles.counterLabel}>Followers</span>
                </button>
                <div className={styles.counterSep} />
                <button
                  className={styles.counterItem}
                  onClick={() => { setActiveTab('social'); setSocialSubTab('following'); }}
                >
                  <span className={styles.counterValue}>{followingList.length}</span>
                  <span className={styles.counterLabel}>Following</span>
                </button>
                <div className={styles.counterSep} />
                <button
                  className={styles.counterItem}
                  onClick={() => setActiveTab('badges')}
                >
                  <span className={styles.counterValue}>{unlockedBadges.length}</span>
                  <span className={styles.counterLabel}>Badges Earned</span>
                </button>
                <div className={styles.counterSep} />
                <div className={styles.counterItem}>
                  <span className={styles.counterValue}>{userStats.boardsVisited || 1}</span>
                  <span className={styles.counterLabel}>Canvas Visits</span>
                </div>
              </div>
            </div>

            {/* Sub-Navigation Tabs inside the Card Footer */}
            <nav className={styles.tabsNav}>
              <button
                className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <Zap size={16} /> Overview
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'badges' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('badges')}
              >
                <Award size={16} /> Badges & Achievements
                <span className={styles.tabCounterPill}>{unlockedBadges.length}/{ALL_BADGES.length}</span>
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'social' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('social')}
              >
                <Users size={16} /> Following & Followers
                <span className={styles.tabCounterPill}>{followingList.length + followersList.length}</span>
              </button>
              <button
                className={`${styles.tabBtn} ${activeTab === 'settings' ? styles.tabBtnActive : ''}`}
                onClick={() => setActiveTab('settings')}
              >
                <Sliders size={16} /> Settings
              </button>
            </nav>
          </div>
        </section>

        {error && activeTab === 'settings' && <div className={styles.errorAlert}>{error}</div>}

        {/* =========================================================
            TAB 1: OVERVIEW
           ========================================================= */}
        {activeTab === 'overview' && (
          <div className={styles.overviewLayout}>
            {/* Left Column: Pinned Badges & Bio Details */}
            <div className={styles.mainCol}>
              <section className={styles.contentCard}>
                <div className={styles.cardHeaderRow}>
                  <div className={styles.cardTitleGroup}>
                    <Pin size={18} className={styles.titleIconAmber} />
                    <h2 className={styles.cardHeading}>Pinned Achievements</h2>
                  </div>
                  <button className={styles.textLinkBtn} onClick={() => setActiveTab('badges')}>
                    Customize pinned <ExternalLink size={13} />
                  </button>
                </div>

                <div className={styles.pinnedGrid}>
                  {pinnedBadges.map((badge) => {
                    const tier = BADGE_TIERS[badge.tier] || BADGE_TIERS.common;
                    return (
                      <div
                        key={badge.id}
                        className={styles.pinnedItemCard}
                        style={{ '--tier-accent': tier.color }}
                      >
                        <div className={styles.pinnedIconBox} style={{ color: tier.color, background: tier.bg }}>
                          <BadgeIcon name={badge.icon} size={22} />
                        </div>
                        <div className={styles.pinnedTextBox}>
                          <div className={styles.pinnedTitleRow}>
                            <span className={styles.pinnedName}>{badge.name}</span>
                            <span className={styles.tierTag} style={{ color: tier.color, border: `1px solid ${tier.border}` }}>
                              {tier.label}
                            </span>
                          </div>
                          <p className={styles.pinnedDescText}>{badge.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                  {pinnedBadges.length === 0 && (
                    <div className={styles.emptyPinnedBox}>
                      <Award size={36} className={styles.emptyIconGrey} />
                      <p>You haven't pinned any achievements yet. Feature your top badges on your profile!</p>
                      <button className={styles.btnPrimarySmall} onClick={() => setActiveTab('badges')}>
                        Browse Badges
                      </button>
                    </div>
                  )}
                </div>
              </section>

              {/* Bio & Whiteboard Expertise */}
              <section className={styles.contentCard}>
                <div className={styles.cardHeaderRow}>
                  <h2 className={styles.cardHeading}>Collaborative Bio & Expertise</h2>
                  <button className={styles.textLinkBtn} onClick={() => setActiveTab('settings')}>
                    Edit Bio <Pencil size={13} />
                  </button>
                </div>
                <p className={styles.bioExpandedText}>{bio}</p>
                <div className={styles.expertisePillsRow}>
                  <span className={styles.expertisePill}>Infinite Canvas</span>
                  <span className={styles.expertisePill}>Real-Time WebSockets</span>
                  <span className={styles.expertisePill}>Sticky Notes & Architecture</span>
                  <span className={styles.expertisePill}>Freehand Sketching</span>
                  <span className={styles.expertisePill}>PDF & PNG Export</span>
                </div>
              </section>
            </div>

            {/* Right Column: Network Overview & Navigation */}
            <div className={styles.sideCol}>
              <section className={styles.contentCard}>
                <div className={styles.cardHeaderRow}>
                  <h2 className={styles.cardHeading}>Network Summary</h2>
                  <button className={styles.textLinkBtn} onClick={() => setActiveTab('social')}>
                    View all <ExternalLink size={13} />
                  </button>
                </div>

                <div className={styles.networkStatsGrid}>
                  <div className={styles.netBox} onClick={() => { setActiveTab('social'); setSocialSubTab('followers'); }}>
                    <Users size={18} className={styles.netBoxIcon} />
                    <div className={styles.netBoxContent}>
                      <span className={styles.netBoxNum}>{followersList.length}</span>
                      <span className={styles.netBoxLabel}>Followers</span>
                    </div>
                  </div>
                  <div className={styles.netBox} onClick={() => { setActiveTab('social'); setSocialSubTab('following'); }}>
                    <UserCheck size={18} className={styles.netBoxIcon} />
                    <div className={styles.netBoxContent}>
                      <span className={styles.netBoxNum}>{followingList.length}</span>
                      <span className={styles.netBoxLabel}>Following</span>
                    </div>
                  </div>
                </div>

                <div className={styles.sidebarSectionTitle}>Top Followers</div>
                <div className={styles.miniList}>
                  {followersList.slice(0, 3).map((f) => (
                    <div key={f.account} className={styles.miniRow}>
                      <div className={styles.miniAvatarCircle} style={{ background: f.color || '#2563eb' }}>
                        {f.photoURL ? <img src={f.photoURL} alt="" /> : f.name.charAt(0)}
                      </div>
                      <div className={styles.miniMeta}>
                        <div className={styles.miniNameText}>{f.name}</div>
                        <div className={styles.miniRoleText}>{f.role || 'Collaborator'}</div>
                      </div>
                      <button
                        className={isFollowing(f.account) ? styles.btnFollowingMini : styles.btnFollowMini}
                        onClick={() => handleToggleFollow(f)}
                      >
                        {isFollowing(f.account) ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.contentCard}>
                <h2 className={styles.cardHeading}>Quick Navigation</h2>
                <div className={styles.navMenuCol}>
                  <button className={styles.navMenuItem} onClick={goToMessages}>
                    <MessageSquare size={18} className={styles.navMenuIcon} />
                    <div className={styles.navMenuText}>
                      <div className={styles.navMenuTitle}>Direct Messages</div>
                      <div className={styles.navMenuSub}>Chat live with teammates</div>
                    </div>
                    <ArrowRight size={16} className={styles.navMenuArrow} />
                  </button>
                  <button className={styles.navMenuItem} onClick={() => goToRoom('main-room')}>
                    <Layers size={18} className={styles.navMenuIcon} />
                    <div className={styles.navMenuText}>
                      <div className={styles.navMenuTitle}>Main Team Room</div>
                      <div className={styles.navMenuSub}>Jump into collaboration</div>
                    </div>
                    <ArrowRight size={16} className={styles.navMenuArrow} />
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
          <section className={styles.contentCardFull}>
            <div className={styles.badgeTopBar}>
              <div>
                <h2 className={styles.cardHeading}>Badges & Achievements</h2>
                <p className={styles.subHeadingText}>
                  Unlock badges by exploring canvas rooms, collaborating across teams, and mastering visual design tools.
                </p>
              </div>
              <div className={styles.filterTabsBar}>
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

            <div className={styles.badgesGrid}>
              {filteredBadges.map((badge) => {
                const tier = BADGE_TIERS[badge.tier] || BADGE_TIERS.common;
                const progress = getBadgeProgress(badge, user, socialContext);
                const isPinned = pinnedIds.includes(badge.id);

                return (
                  <div
                    key={badge.id}
                    className={`${styles.badgeItemCard} ${progress.unlocked ? styles.badgeUnlocked : styles.badgeLocked}`}
                    style={progress.unlocked ? { '--tier-accent': tier.color } : {}}
                  >
                    <div className={styles.badgeItemTop}>
                      <div
                        className={styles.badgeIconCircle}
                        style={progress.unlocked ? { color: tier.color, background: tier.bg } : {}}
                      >
                        {progress.unlocked ? <BadgeIcon name={badge.icon} size={26} /> : <Lock size={22} className={styles.lockIconGrey} />}
                      </div>
                      <div className={styles.badgeItemHeader}>
                        <div className={styles.badgeItemTitleRow}>
                          <span className={styles.badgeItemName}>{badge.name}</span>
                          <span className={styles.tierTag} style={progress.unlocked ? { color: tier.color, border: `1px solid ${tier.border}` } : {}}>
                            {tier.label}
                          </span>
                        </div>
                        <p className={styles.badgeItemDesc}>{badge.desc}</p>
                      </div>
                    </div>

                    <div className={styles.badgeItemBottom}>
                      {progress.unlocked ? (
                        <div className={styles.unlockedFooter}>
                          <span className={styles.unlockedStatusText}>
                            <CheckCircle2 size={15} /> Unlocked Achievement
                          </span>
                          <button
                            className={`${styles.btnPinToggle} ${isPinned ? styles.btnPinToggleActive : ''}`}
                            onClick={() => togglePinBadge(user?.id, badge.id)}
                            title={isPinned ? 'Unpin from profile' : 'Pin to profile'}
                          >
                            <Pin size={13} /> {isPinned ? 'Pinned' : 'Pin to Profile'}
                          </button>
                        </div>
                      ) : (
                        <div className={styles.progressContainer}>
                          <div className={styles.progressLabelRow}>
                            <span>{badge.reqLabel || badge.desc}</span>
                            <span className={styles.progressNum}>{progress.current} / {progress.max}</span>
                          </div>
                          <div className={styles.progressBarTrack}>
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
          <section className={styles.contentCardFull}>
            <div className={styles.socialTopBar}>
              <div className={styles.socialSubTabs}>
                <button
                  className={`${styles.socialSubBtn} ${socialSubTab === 'following' ? styles.socialSubBtnActive : ''}`}
                  onClick={() => setSocialSubTab('following')}
                >
                  <UserCheck size={16} /> Following ({followingList.length})
                </button>
                <button
                  className={`${styles.socialSubBtn} ${socialSubTab === 'followers' ? styles.socialSubBtnActive : ''}`}
                  onClick={() => setSocialSubTab('followers')}
                >
                  <Users size={16} /> Followers ({followersList.length})
                </button>
                <button
                  className={`${styles.socialSubBtn} ${socialSubTab === 'explore' ? styles.socialSubBtnActive : ''}`}
                  onClick={() => { setSocialSubTab('explore'); setSearchResult(null); }}
                >
                  <UserPlus size={16} /> Explore & Add Collaborators
                </button>
              </div>
            </div>

            {/* Sub-Tab 1: Following */}
            {socialSubTab === 'following' && (
              <div className={styles.socialTabContainer}>
                {followingList.length === 0 ? (
                  <div className={styles.emptyStateBox}>
                    <Users size={44} className={styles.emptyIconGrey} />
                    <h3>You aren't following anyone yet</h3>
                    <p>Connect with teammates and creators to quickly message them and follow their collaborative updates.</p>
                    <button className={styles.btnPrimary} onClick={() => setSocialSubTab('explore')}>
                      Explore Creators
                    </button>
                  </div>
                ) : (
                  <div className={styles.collaboratorGrid}>
                    {followingList.map((f) => (
                      <div key={f.account} className={styles.collabCard}>
                        <div className={styles.collabTop}>
                          <div className={styles.collabAvatarCircle} style={{ background: f.color || '#2563eb' }}>
                            {f.photoURL ? <img src={f.photoURL} alt="" /> : f.name.charAt(0)}
                          </div>
                          <div className={styles.collabInfo}>
                            <div className={styles.collabNameRow}>
                              <span className={styles.collabNameText}>{f.name}</span>
                              <span className={styles.collabTagText}>#{f.account}</span>
                            </div>
                            <span className={styles.collabRoleText}>{f.role || 'Whiteboard Collaborator'}</span>
                          </div>
                        </div>
                        <p className={styles.collabBioText}>{f.bio || 'Collaborative canvas creator on Boardroom.'}</p>
                        <div className={styles.collabFooterBar}>
                          <span className={styles.badgeCountChip}>
                            <Award size={14} /> {f.badgesCount || 8} Badges
                          </span>
                          <div className={styles.badgeMiniGroup}>
                            {(f.topBadges || ['first_board', 'sticky_fan']).slice(0, 3).map((bid) => {
                              const bObj = ALL_BADGES.find((ab) => ab.id === bid) || ALL_BADGES[3];
                              const tier = BADGE_TIERS[bObj.tier] || BADGE_TIERS.common;
                              return (
                                <span key={bid} className={styles.miniIconBadge} style={{ color: tier.color, background: tier.bg }} title={bObj.name}>
                                  <BadgeIcon name={bObj.icon} size={14} />
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        <div className={styles.collabCardActions}>
                          <button className={styles.btnSecondaryFull} onClick={() => goToFriendChat(f.account)}>
                            <MessageSquare size={15} /> Message
                          </button>
                          <button
                            className={styles.btnUnfollowFull}
                            onClick={() => handleToggleFollow(f)}
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
              <div className={styles.socialTabContainer}>
                {followersList.length === 0 ? (
                  <div className={styles.emptyStateBox}>
                    <Award size={44} className={styles.emptyIconGrey} />
                    <h3>No followers yet</h3>
                    <p>Share your account ID #{myTag} or collaborate across team canvases to grow your network!</p>
                  </div>
                ) : (
                  <div className={styles.collaboratorGrid}>
                    {followersList.map((f) => {
                      const amFollowing = isFollowing(f.account);
                      return (
                        <div key={f.account} className={styles.collabCard}>
                          <div className={styles.collabTop}>
                            <div className={styles.collabAvatarCircle} style={{ background: f.color || '#7c3aed' }}>
                              {f.photoURL ? <img src={f.photoURL} alt="" /> : f.name.charAt(0)}
                            </div>
                            <div className={styles.collabInfo}>
                              <div className={styles.collabNameRow}>
                                <span className={styles.collabNameText}>{f.name}</span>
                                <span className={styles.collabTagText}>#{f.account}</span>
                              </div>
                              <span className={styles.collabRoleText}>{f.role || 'Whiteboard Collaborator'}</span>
                            </div>
                          </div>
                          <p className={styles.collabBioText}>{f.bio || 'Active participant on Boardroom canvas rooms.'}</p>
                          <div className={styles.collabFooterBar}>
                            <span className={styles.badgeCountChip}>
                              <Award size={14} /> {f.badgesCount || 10} Badges
                            </span>
                          </div>
                          <div className={styles.collabCardActions}>
                            <button className={styles.btnSecondaryFull} onClick={() => goToFriendChat(f.account)}>
                              <MessageSquare size={15} /> Message
                            </button>
                            <button
                              className={amFollowing ? styles.btnUnfollowFull : styles.btnPrimaryFull}
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

            {/* Sub-Tab 3: Explore & Look Up */}
            {socialSubTab === 'explore' && (
              <div className={styles.exploreLayout}>
                {/* Search Bar */}
                <form className={styles.searchFormBox} onSubmit={handleSearchAccount}>
                  <div className={styles.searchInputGroup}>
                    <Search size={18} className={styles.searchIconLeft} />
                    <input
                      className={styles.searchInputField}
                      placeholder="Enter exact Account ID to follow (e.g., BR-4K7P-2QX9)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <button type="button" className={styles.clearBtn} onClick={() => { setSearchQuery(''); setSearchResult(null); }}>
                        ×
                      </button>
                    )}
                  </div>
                  <button type="submit" className={styles.btnPrimary} disabled={!searchQuery.trim()}>
                    Look Up Profile
                  </button>
                </form>

                {/* Search Result Box */}
                {searchResult && (
                  <div className={styles.searchResultContainer}>
                    {searchResult.error ? (
                      <div className={styles.searchErrorAlert}>{searchResult.error}</div>
                    ) : (
                      <div className={styles.collabCard}>
                        <div className={styles.collabTop}>
                          <div className={styles.collabAvatarCircle} style={{ background: searchResult.profile.color || '#2563eb' }}>
                            {searchResult.profile.photoURL ? <img src={searchResult.profile.photoURL} alt="" /> : searchResult.profile.name.charAt(0)}
                          </div>
                          <div className={styles.collabInfo}>
                            <div className={styles.collabNameRow}>
                              <span className={styles.collabNameText}>{searchResult.profile.name}</span>
                              <span className={styles.collabTagText}>#{searchResult.profile.account}</span>
                            </div>
                            <span className={styles.collabRoleText}>{searchResult.profile.role}</span>
                          </div>
                        </div>
                        <p className={styles.collabBioText}>{searchResult.profile.bio}</p>
                        <div className={styles.collabCardActions}>
                          <button className={styles.btnSecondaryFull} onClick={() => goToFriendChat(searchResult.profile.account)}>
                            <MessageSquare size={15} /> Message
                          </button>
                          <button
                            className={isFollowing(searchResult.profile.account) ? styles.btnUnfollowFull : styles.btnPrimaryFull}
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
                <div className={styles.suggestedContainer}>
                  <h3 className={styles.suggestedHeading}>Suggested Boardroom Creators & Teammates</h3>
                  <div className={styles.collaboratorGrid}>
                    {suggestedList.map((s) => {
                      const amFollowing = isFollowing(s.account);
                      return (
                        <div key={s.account} className={styles.collabCard}>
                          <div className={styles.collabTop}>
                            <div className={styles.collabAvatarCircle} style={{ background: s.color || '#2563eb' }}>
                              {s.photoURL ? <img src={s.photoURL} alt="" /> : s.name.charAt(0)}
                            </div>
                            <div className={styles.collabInfo}>
                              <div className={styles.collabNameRow}>
                                <span className={styles.collabNameText}>{s.name}</span>
                                <span className={styles.collabTagText}>#{s.account}</span>
                              </div>
                              <span className={styles.collabRoleText}>{s.role}</span>
                            </div>
                          </div>
                          <p className={styles.collabBioText}>{s.bio}</p>
                          <div className={styles.collabFooterBar}>
                            <span className={styles.badgeCountChip}>
                              <Award size={14} /> {s.badgesCount} Badges
                            </span>
                            <div className={styles.badgeMiniGroup}>
                              {(s.topBadges || []).map((bid) => {
                                const bObj = ALL_BADGES.find((ab) => ab.id === bid) || ALL_BADGES[0];
                                const tier = BADGE_TIERS[bObj.tier] || BADGE_TIERS.common;
                                return (
                                  <span key={bid} className={styles.miniIconBadge} style={{ color: tier.color, background: tier.bg }} title={bObj.name}>
                                    <BadgeIcon name={bObj.icon} size={14} />
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          <div className={styles.collabCardActions}>
                            <button className={styles.btnSecondaryFull} onClick={() => goToFriendChat(s.account)}>
                              <MessageSquare size={15} /> Message
                            </button>
                            <button
                              className={amFollowing ? styles.btnUnfollowFull : styles.btnPrimaryFull}
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
          <div className={styles.settingsLayoutGrid}>
            <section className={styles.contentCard}>
              <div className={styles.cardHeaderRow}>
                <div className={styles.cardTitleGroup}>
                  <Settings size={18} className={styles.titleIconBlue} />
                  <h2 className={styles.cardHeading}>Profile Customization</h2>
                </div>
              </div>
              <p className={styles.subHeadingText}>
                Your profile updates will immediately reflect across your public account card, direct messages, and team canvases.
              </p>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="nameInput">Display Name</label>
                <input
                  id="nameInput"
                  className={styles.formInput}
                  value={name}
                  maxLength={40}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="roleInput">Headline / Professional Role</label>
                <input
                  id="roleInput"
                  className={styles.formInput}
                  value={role}
                  maxLength={60}
                  placeholder="e.g., Full-Stack Developer & UI Architect"
                  onChange={(e) => setRole(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel} htmlFor="bioInput">Bio & Expertise</label>
                <textarea
                  id="bioInput"
                  className={styles.formTextarea}
                  rows={3}
                  value={bio}
                  maxLength={180}
                  placeholder="Share your interests, tech stack, or collaborative projects..."
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <div className={styles.formSaveRow}>
                <button className={styles.btnPrimary} onClick={onSaveSettings}>
                  {savedTick ? <><Check size={16} /> Profile Saved Successfully!</> : 'Save Profile Changes'}
                </button>
              </div>
            </section>

            <section className={styles.contentCard}>
              <h2 className={styles.cardHeading}>Account & Device Security</h2>
              <dl className={styles.accountDataList}>
                <div className={styles.dataListRow}>
                  <dt>Sign-In Method</dt>
                  <dd className={styles.providerBadge}>
                    <ShieldCheck size={16} />
                    {user.provider === 'google' ? 'Google Account (Cloud Sync)' : 'Guest Device Account (Offline)'}
                  </dd>
                </div>
                {user.email && (
                  <div className={styles.dataListRow}>
                    <dt>Email Address</dt>
                    <dd className={styles.emailBadge}><Mail size={15} /> {user.email}</dd>
                  </div>
                )}
                <div className={styles.dataListRow}>
                  <dt>Shareable Account ID</dt>
                  <dd className={styles.accountIdCopyRow}>
                    <span className={styles.tagCodeMono}>{myTag}</span>
                    <button className={styles.btnIconGhost} onClick={onCopyMyId} title="Copy ID">
                      {copiedId === 'self' ? <Check size={16} className={styles.iconGreen} /> : <Copy size={16} />}
                    </button>
                  </dd>
                </div>
              </dl>

              {isGuest && googleEnabled && (
                <div className={styles.upgradeAlertBox}>
                  <p>Upgrade to a Google Account to securely sync your profile and badges across all browsers and devices.</p>
                  <button className={styles.btnUpgradeGoogle} onClick={onUpgradeToGoogle}>
                    Sign in with Google
                  </button>
                </div>
              )}

              <div className={styles.dangerActionsRow}>
                <button className={styles.btnResetDanger} onClick={onReset}>
                  <Trash2 size={15} /> Reset Customizations
                </button>
                <button className={styles.btnSignOutDanger} onClick={onSignOut}>
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
