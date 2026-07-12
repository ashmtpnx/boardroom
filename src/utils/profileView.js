export const VIEW_PROFILE_EVENT = 'boardroom:view-profile';

export function viewUserProfile(user) {
  if (!user) return;
  try {
    window.dispatchEvent(new CustomEvent(VIEW_PROFILE_EVENT, { detail: { user } }));
  } catch {
    /* SSR / no window — ignore */
  }
}
