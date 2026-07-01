// Unified auth service. Supports two identities behind one interface:
//   - Google sign-in (Firebase) — enabled only when VITE_FIREBASE_* keys are set.
//   - Guest — a zero-config local identity so the app always works out of the box.
//
// The Firebase SDK is imported lazily, so it never enters the bundle unless a
// Google sign-in actually happens.
import { uid } from '../utils/ids';
import { pickColor, randomName } from '../utils/colors';

const GUEST_KEY = 'boardroom:guest';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Google sign-in is only offered when Firebase is configured.
export const googleEnabled = Boolean(
  firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId,
);

let _fb = null;
async function fb() {
  if (_fb) return _fb;
  const { initializeApp } = await import('firebase/app');
  const authMod = await import('firebase/auth');
  const app = initializeApp(firebaseConfig);
  _fb = { authMod, instance: authMod.getAuth(app), provider: new authMod.GoogleAuthProvider() };
  return _fb;
}

function toGoogleUser(u) {
  if (!u) return null;
  return {
    id: u.uid,
    name: u.displayName || 'User',
    email: u.email || null,
    color: pickColor(u.uid),
    photoURL: u.photoURL || null,
    provider: 'google',
  };
}

function loadGuest() {
  try {
    const g = JSON.parse(localStorage.getItem(GUEST_KEY));
    if (g && g.id) return g;
  } catch {
    /* ignore */
  }
  return null;
}

// A persistent guest identity (stable across reloads until they sign out).
export function signInAsGuest() {
  const existing = loadGuest();
  if (existing) return existing;
  const id = uid('user');
  const guest = { id, name: randomName(), color: pickColor(id), photoURL: null, email: null, provider: 'guest' };
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(guest));
  } catch {
    /* ignore */
  }
  return guest;
}

export async function signInWithGoogle() {
  const { authMod, instance, provider } = await fb();
  const result = await authMod.signInWithPopup(instance, provider);
  return toGoogleUser(result.user);
}

// Restore an existing session WITHOUT prompting. Returns a user or null.
export async function restoreSession() {
  if (googleEnabled) {
    const { authMod, instance } = await fb();
    const u = await new Promise((resolve) => {
      const unsub = authMod.onAuthStateChanged(instance, (usr) => {
        unsub();
        resolve(usr);
      });
    });
    if (u) return toGoogleUser(u);
  }
  return loadGuest(); // null if the user has never chosen an identity
}

export async function signOut() {
  if (googleEnabled) {
    try {
      const { authMod, instance } = await fb();
      await authMod.signOut(instance);
    } catch {
      /* ignore */
    }
  }
  try {
    localStorage.removeItem(GUEST_KEY);
  } catch {
    /* ignore */
  }
}
