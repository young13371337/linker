// Lightweight client-side session helpers.
// Keeps compatibility with older code that used localStorage key `user` and newer key `app_user`.
// This module is intended for browser-only code paths and provides a tiny API:
// - saveUser(user)
// - getUser() -> user | null
// - clearUser()

const KEY_NEW = "app_user";
const KEY_OLD = "user";

export type User = { id: string; login: string; [k: string]: any } | null;

export function saveUser(user: User) {
  try {
    const v = JSON.stringify(user);
    localStorage.setItem(KEY_NEW, v);
    // also write the old key for compatibility
    localStorage.setItem(KEY_OLD, v);
  } catch (e) {
    // ignore (storage can throw in some environments)
  }
}

export function getUser(): User {
  try {
    const v = localStorage.getItem(KEY_NEW) || localStorage.getItem(KEY_OLD);
    return v ? JSON.parse(v) : null;
  } catch (e) {
    return null;
  }
}

export function clearUser() {
  try {
    localStorage.removeItem(KEY_NEW);
    localStorage.removeItem(KEY_OLD);
  } catch (e) {
    // ignore
  }
}

export default getUser;
