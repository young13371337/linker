export type User = { id: string; login: string };

// Keep compatibility: older code used key `user`, newer uses `app_user`.
const KEY_NEW = "app_user";
const KEY_OLD = "user";

export function saveUser(user: User) {
  try {
    const v = JSON.stringify(user);
    localStorage.setItem(KEY_NEW, v);
    // also write the old key for compatibility
    localStorage.setItem(KEY_OLD, v);
  } catch (e) {
    // ignore
  }
}

export function getUser(): User | null {
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
  } catch (e) {}
}
