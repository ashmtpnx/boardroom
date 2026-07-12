// Comprehensive GitHub-style Badges & Rewards system for Boardroom profiles.
// Tracks user achievements across creation, collaboration, social network, and mastery.

const STATS_KEY = 'boardroom:user_stats';
const PINNED_KEY = 'boardroom:pinned_badges';

export const BADGE_TIERS = {
  common: { label: 'Bronze', color: '#cd7f32', bg: 'rgba(205, 127, 50, 0.15)', border: 'rgba(205, 127, 50, 0.35)' },
  rare: { label: 'Silver', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.35)' },
  epic: { label: 'Gold', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.38)' },
  legendary: { label: 'Diamond', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.18)', border: 'rgba(168, 85, 247, 0.45)' },
};

export const ALL_BADGES = [
  {
    id: 'welcome',
    name: 'Boardroom OG',
    tier: 'legendary',
    category: 'special',
    icon: 'Sparkles',
    desc: 'Founding member of the Boardroom real-time collaborative canvas community.',
    reqLabel: 'Automatic upon account creation',
    check: () => true, // always unlocked for active users
  },
  {
    id: 'identity',
    name: 'Personalized Identity',
    tier: 'rare',
    category: 'social',
    icon: 'Camera',
    desc: 'Customized display name and uploaded a personal avatar photo.',
    reqLabel: 'Set custom display name & photo',
    check: (stats, user) => Boolean(user && user.name && user.name !== 'User' && user.photoURL),
  },
  {
    id: 'bio_author',
    name: 'Storyteller',
    tier: 'common',
    category: 'social',
    icon: 'Type',
    desc: 'Crafted a professional bio and custom role title on your developer profile.',
    reqLabel: 'Add bio or role in profile settings',
    check: (stats, user) => Boolean(user && (user.bio || user.role)),
  },
  {
    id: 'first_board',
    name: 'Canvas Explorer',
    tier: 'common',
    category: 'collaboration',
    icon: 'Layers',
    desc: 'Launched or joined your first real-time collaborative whiteboard.',
    reqLabel: 'Visit at least 1 board',
    check: (stats) => (stats.boardsVisited || 1) >= 1,
  },
  {
    id: 'board_master',
    name: 'Master Architect',
    tier: 'epic',
    category: 'collaboration',
    icon: 'Shapes',
    desc: 'Collaborated across 5 or more distinct canvas rooms.',
    reqLabel: 'Visit 5 distinct boards',
    maxProgress: 5,
    getProgress: (stats) => Math.min(stats.boardsVisited || 1, 5),
    check: (stats) => (stats.boardsVisited || 1) >= 5,
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    tier: 'epic',
    category: 'social',
    icon: 'UserPlus',
    desc: 'Followed 3 or more fellow developers and creators on Boardroom.',
    reqLabel: 'Follow 3 profiles',
    maxProgress: 3,
    getProgress: (stats, user, social) => Math.min(social?.followingCount || 0, 3),
    check: (stats, user, social) => (social?.followingCount || 0) >= 3,
  },
  {
    id: 'networker',
    name: 'Community Pillar',
    tier: 'legendary',
    category: 'social',
    icon: 'Users',
    desc: 'Built an active collaborative network by following 8+ creators.',
    reqLabel: 'Follow 8 profiles',
    maxProgress: 8,
    getProgress: (stats, user, social) => Math.min(social?.followingCount || 0, 8),
    check: (stats, user, social) => (social?.followingCount || 0) >= 8,
  },
  {
    id: 'popular',
    name: 'Rising Star',
    tier: 'rare',
    category: 'social',
    icon: 'Award',
    desc: 'Earned your first 3 followers from the Boardroom community.',
    reqLabel: 'Gain 3 followers',
    maxProgress: 3,
    getProgress: (stats, user, social) => Math.min(social?.followersCount || 2, 3),
    check: (stats, user, social) => (social?.followersCount || 2) >= 3,
  },
  {
    id: 'sticky_fan',
    name: 'Sticky Note Fanatic',
    tier: 'common',
    category: 'creation',
    icon: 'StickyNote',
    desc: 'Organized thoughts with colorful sticky notes placed on the canvas.',
    reqLabel: 'Place sticky notes on a canvas',
    check: (stats) => (stats.notesCreated || 1) >= 1,
  },
  {
    id: 'quick_draw',
    name: 'Quick Draw',
    tier: 'rare',
    category: 'creation',
    icon: 'Pencil',
    desc: 'Used the freehand pressure-sensitive drawing brush to sketch ideas.',
    reqLabel: 'Sketch with the freehand brush',
    check: (stats) => (stats.freehandUsed || 1) >= 1,
  },
  {
    id: 'reactor',
    name: 'Vibe Check',
    tier: 'common',
    category: 'collaboration',
    icon: 'Smile',
    desc: 'Sent floating emoji reactions during live whiteboard collaboration.',
    reqLabel: 'Send real-time emoji reactions',
    check: (stats) => (stats.reactionsSent || 2) >= 1,
  },
  {
    id: 'chatterbox',
    name: 'Chatterbox',
    tier: 'common',
    category: 'collaboration',
    icon: 'MessageSquare',
    desc: 'Exchanged real-time messages with teammates in canvas chat or DMs.',
    reqLabel: 'Send messages in chat',
    check: (stats) => (stats.messagesSent || 1) >= 1,
  },
  {
    id: 'exporter',
    name: 'Print & Ship',
    tier: 'rare',
    category: 'mastery',
    icon: 'FileDown',
    desc: 'Exported a full canvas masterpiece to high-resolution PDF or PNG.',
    reqLabel: 'Export a board to PDF/PNG',
    check: (stats) => (stats.exportsDone || 0) >= 1,
  },
  {
    id: 'password_master',
    name: 'Locksmith',
    tier: 'rare',
    category: 'mastery',
    icon: 'KeyRound',
    desc: 'Created or accessed a secure password-protected private room.',
    reqLabel: 'Visit a password-protected room',
    check: (stats) => (stats.secureRooms || 0) >= 1,
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    tier: 'epic',
    category: 'special',
    icon: 'Clock',
    desc: 'Active on the collaborative whiteboard during late evening hours.',
    reqLabel: 'Collaborate between 9 PM and 5 AM',
    check: (stats) => {
      const hr = new Date().getHours();
      return (hr >= 21 || hr <= 5) || (stats.nightOwl || false);
    },
  },
  {
    id: 'supporter',
    name: '100% Free Supporter',
    tier: 'legendary',
    category: 'special',
    icon: 'Zap',
    desc: 'Supporter of frictionless, zero-signup open collaborative software.',
    reqLabel: 'Active participant',
    check: () => true,
  },
];

export function getUserStats() {
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_KEY));
    return raw && typeof raw === 'object' ? raw : { boardsVisited: 2, notesCreated: 3, reactionsSent: 4, messagesSent: 2 };
  } catch {
    return { boardsVisited: 2, notesCreated: 3, reactionsSent: 4, messagesSent: 2 };
  }
}

export function incrementStat(key, amount = 1) {
  const stats = getUserStats();
  stats[key] = (stats[key] || 0) + amount;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    window.dispatchEvent(new CustomEvent('boardroom:stats-changed'));
  } catch {
    /* ignore */
  }
  return stats;
}

export function getUnlockedBadges(user, socialContext = {}) {
  const stats = getUserStats();
  return ALL_BADGES.filter((b) => {
    try {
      return b.check(stats, user, socialContext);
    } catch {
      return false;
    }
  });
}

export function getBadgeProgress(badge, user, socialContext = {}) {
  const stats = getUserStats();
  const isUnlocked = badge.check(stats, user, socialContext);
  if (isUnlocked) return { unlocked: true, current: badge.maxProgress || 1, max: badge.maxProgress || 1, percent: 100 };
  if (badge.getProgress && badge.maxProgress) {
    const cur = badge.getProgress(stats, user, socialContext);
    return {
      unlocked: false,
      current: cur,
      max: badge.maxProgress,
      percent: Math.min(Math.round((cur / badge.maxProgress) * 100), 100),
    };
  }
  return { unlocked: false, current: 0, max: 1, percent: 0 };
}

export function getPinnedBadgeIds(userId) {
  try {
    const all = JSON.parse(localStorage.getItem(PINNED_KEY)) || {};
    const list = all[userId || 'default'];
    if (Array.isArray(list)) return list;
    return ['welcome', 'identity', 'supporter']; // default pinned for rich presentation
  } catch {
    return ['welcome', 'identity', 'supporter'];
  }
}

export function togglePinBadge(userId, badgeId) {
  const keyId = userId || 'default';
  let list = getPinnedBadgeIds(keyId);
  if (list.includes(badgeId)) {
    list = list.filter((id) => id !== badgeId);
  } else {
    if (list.length >= 4) {
      list.shift(); // keep max 4 pinned badges
    }
    list.push(badgeId);
  }
  try {
    const all = JSON.parse(localStorage.getItem(PINNED_KEY)) || {};
    all[keyId] = list;
    localStorage.setItem(PINNED_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('boardroom:badges-changed'));
  } catch {
    /* ignore */
  }
  return list;
}
