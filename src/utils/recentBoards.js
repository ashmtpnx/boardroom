// Remembers boards the user has opened, so the home page can offer quick re-entry.
// Stored in localStorage as a most-recent-first list of { code, ts }.
const KEY = 'boardroom:recent';
const MAX = 8;

export function getRecentBoards() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function rememberBoard(code) {
  if (!code) return;
  const list = getRecentBoards().filter((b) => b.code !== code);
  list.unshift({ code, ts: Date.now() });
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* storage full / unavailable — non-critical */
  }
}

export function forgetBoard(code) {
  const list = getRecentBoards().filter((b) => b.code !== code);
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* ignore */
  }
}
