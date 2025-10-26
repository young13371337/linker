import path from 'path';
import os from 'os';

/**
 * Returns a writable storage directory for uploads. Prefers UPLOAD_DIR env var,
 * falls back to OS temp directory. Subfolder is appended (e.g. 'video' or 'voice').
 */
export function getStoragePath(subfolder: string) {
  const base = process.env.UPLOAD_DIR || os.tmpdir();
  return path.join(base, 'linker', subfolder);
}

export function ensureDir(dir: string) {
  try {
    // Try to create directory recursively; ignore if already exists
    require('fs').mkdirSync(dir, { recursive: true });
    return true;
  } catch (e) {
    console.error('[STORAGE] Failed to ensure directory', dir, e);
    return false;
  }
}
