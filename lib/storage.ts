import path from 'path';
import os from 'os';
import fs from 'fs';

/**
 * Returns a writable storage directory for uploads.
 * Preference order:
 * 1. process.env.UPLOAD_DIR (operator-provided persistent dir)
 * 2. <repo-root>/storage (useful for simple deployments where repo is writable)
 * 3. OS temp directory (serverless /tmp fallback)
 *
 * Subfolder is appended (e.g. 'video' or 'voice'). The function will attempt
 * to create and verify the directory is writable. It returns the first usable
 * candidate and will throw on catastrophic failure only if every candidate fails
 * to be created (in which case, the tmpdir will still be returned as last resort).
 */
export function getStoragePath(subfolder: string) {
  const candidates = [] as string[];

  if (process.env.UPLOAD_DIR) candidates.push(process.env.UPLOAD_DIR);
  // Try repository-local storage folder next (useful on VPS / Docker with a mounted volume)
  try {
    candidates.push(path.join(process.cwd(), 'storage'));
  } catch (e) {
    // ignore
  }
  // Finally, fallback to OS temp dir
  candidates.push(os.tmpdir());

  for (const base of candidates) {
    if (!base) continue;
    const candidate = path.join(base, 'linker', subfolder);
    try {
      // Create the directory if it doesn't exist
      fs.mkdirSync(candidate, { recursive: true });
      // Quick writability check: try to write and remove a small file
      const probe = path.join(candidate, `.probe-${Date.now()}.tmp`);
      try {
        fs.writeFileSync(probe, 'ok');
        fs.unlinkSync(probe);
        // successful write -> return this path
        return candidate;
      } catch (writeErr) {
        // can't write here, continue to next candidate
        console.warn(`[STORAGE] Not writable: ${candidate}`, writeErr && writeErr.message ? writeErr.message : writeErr);
        continue;
      }
    } catch (mkdirErr) {
      console.warn(`[STORAGE] Cannot create candidate storage dir ${candidate}:`, mkdirErr && mkdirErr.message ? mkdirErr.message : mkdirErr);
      continue;
    }
  }

  // As an ultimate fallback, return os.tmpdir() joined path (ensure it's created)
  const fallback = path.join(os.tmpdir(), 'linker', subfolder);
  try {
    fs.mkdirSync(fallback, { recursive: true });
  } catch (e) {
    console.error('[STORAGE] Failed to create fallback tmp dir', fallback, e);
  }
  return fallback;
}

export function ensureDir(dir: string) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    return true;
  } catch (e: any) {
    console.error('[STORAGE] Failed to ensure directory', dir, e && e.message ? e.message : e);
    return false;
  }
}
