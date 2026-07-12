// Social Following & Followers management for Boardroom profiles.
// Allows following creators and teammates by their Account ID (tag), browsing suggested collaborators, and tracking your network graph.

import { normalizeAccountId } from './accountId';
import { pickColor } from './colors';

const FOLLOWING_KEY = 'boardroom:following';
const FOLLOWERS_KEY = 'boardroom:followers';
export const SOCIAL_EVENT = 'boardroom:social-changed';

export const SUGGESTED_CREATORS = [
  {
    account: 'BR-ALEX-CHEN',
    name: 'Alex Chen',
    role: 'Full-Stack Developer & UI Architect',
    bio: 'Passionate about AI-assisted web apps, interactive whiteboards, and real-time multiplayer architecture.',
    color: '#3b82f6',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    badgesCount: 14,
    topBadges: ['welcome', 'board_master', 'social_butterfly', 'networker'],
  },
  {
    account: 'BR-SARA-JNK8',
    name: 'Sarah Jenkins',
    role: 'Lead UX Designer & Sketch Artist',
    bio: 'Creating human-centered infinite canvas experiences. Wireframing diagrams and freehand design.',
    color: '#ec4899',
    photoURL: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=256&q=80',
    badgesCount: 12,
    topBadges: ['quick_draw', 'sticky_fan', 'identity', 'exporter'],
  },
  {
    account: 'BR-MARK-VN99',
    name: 'Marcus Vance',
    role: 'Distributed Systems & WebSockets Lead',
    bio: 'Building low-latency sync protocols, offline-first data engines, and end-to-end encrypted rooms.',
    color: '#8b5cf6',
    photoURL: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80',
    badgesCount: 15,
    topBadges: ['password_master', 'night_owl', 'supporter', 'board_master'],
  },
  {
    account: 'BR-ELEN-ROST',
    name: 'Elena Rostova',
    role: 'Product Manager & Agile Facilitator',
    bio: 'Running design sprints, retrospective sticky note boards, and live cross-functional team workshops.',
    color: '#10b981',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80',
    badgesCount: 11,
    topBadges: ['sticky_fan', 'chatterbox', 'reactor', 'first_board'],
  },
  {
    account: 'BR-DEVIN-AI0',
    name: 'Devin AI Collaborator',
    role: 'Autonomous Coding & Visual Agent',
    bio: 'Pair-programming, generating architecture diagrams, and assisting developers across canvas rooms.',
    color: '#f59e0b',
    photoURL: null,
    badgesCount: 16,
    topBadges: ['welcome', 'board_master', 'networker', 'supporter'],
  },
];

const DEFAULT_FOLLOWING = [
  SUGGESTED_CREATORS[0],
  SUGGESTED_CREATORS[1],
];

const DEFAULT_FOLLOWERS = [
  SUGGESTED_CREATORS[0],
  SUGGESTED_CREATORS[1],
  SUGGESTED_CREATORS[2],
  SUGGESTED_CREATORS[3],
];

export function getFollowing() {
  try {
    const raw = JSON.parse(localStorage.getItem(FOLLOWING_KEY));
    if (Array.isArray(raw)) return raw;
    localStorage.setItem(FOLLOWING_KEY, JSON.stringify(DEFAULT_FOLLOWING));
    return DEFAULT_FOLLOWING;
  } catch {
    return DEFAULT_FOLLOWING;
  }
}

export function getFollowers() {
  try {
    const raw = JSON.parse(localStorage.getItem(FOLLOWERS_KEY));
    if (Array.isArray(raw)) return raw;
    localStorage.setItem(FOLLOWERS_KEY, JSON.stringify(DEFAULT_FOLLOWERS));
    return DEFAULT_FOLLOWERS;
  } catch {
    return DEFAULT_FOLLOWERS;
  }
}

export function isFollowing(accountInput) {
  const account = normalizeAccountId(accountInput || '') || String(accountInput || '').trim().toUpperCase();
  if (!account) return false;
  return getFollowing().some((f) => f.account === account);
}

export function followAccount(target) {
  if (!target) return getFollowing();
  const account = normalizeAccountId(target.account || target) || String(target.account || target).trim().toUpperCase();
  if (!account) return getFollowing();

  const list = getFollowing();
  if (list.some((f) => f.account === account)) return list;

  // Look up if they are in SUGGESTED_CREATORS
  const suggested = SUGGESTED_CREATORS.find((s) => s.account === account);
  const newEntry = {
    id: `fol_${Date.now()}`,
    account,
    name: target.name || suggested?.name || `Collaborator ${account}`,
    role: target.role || target.title || suggested?.role || 'Collaborative Whiteboard Creator',
    bio: target.bio || suggested?.bio || 'Active collaborator on Boardroom.',
    color: target.color || suggested?.color || pickColor(account),
    photoURL: target.photoURL !== undefined ? target.photoURL : (suggested?.photoURL || null),
    badgesCount: target.badgesCount || suggested?.badgesCount || 8,
    topBadges: target.topBadges || suggested?.topBadges || ['first_board', 'sticky_fan', 'reactor'],
    followedAt: Date.now(),
  };

  const next = [newEntry, ...list];
  try {
    localStorage.setItem(FOLLOWING_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(SOCIAL_EVENT));
  } catch {
    /* ignore */
  }
  return next;
}

export function unfollowAccount(accountInput) {
  const account = normalizeAccountId(accountInput || '') || String(accountInput || '').trim().toUpperCase();
  if (!account) return getFollowing();

  const next = getFollowing().filter((f) => f.account !== account);
  try {
    localStorage.setItem(FOLLOWING_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(SOCIAL_EVENT));
  } catch {
    /* ignore */
  }
  return next;
}

export function toggleFollow(target) {
  const account = normalizeAccountId(target?.account || target || '') || String(target?.account || target || '').trim().toUpperCase();
  if (isFollowing(account)) {
    return unfollowAccount(account);
  } else {
    return followAccount(target);
  }
}

export function getSuggestedCollaborators() {
  const following = getFollowing();
  return SUGGESTED_CREATORS.filter((s) => !following.some((f) => f.account === s.account));
}
