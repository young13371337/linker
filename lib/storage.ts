import path from 'path';
import os from 'os';
import fs from 'fs';

function formatErr(err: unknown) {
  if (!err) return String(err);
  if (typeof err === 'string') return err;
  try {
    const anyErr = err as any;
    if (anyErr && anyErr.message) return String(anyErr.message);
    return JSON.stringify(err);
  } catch (e) {
    try {
      return String(err);
    } catch (ee) {
      return '[unprintable error]';
    }
  }
}

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
  // Cache the selected base directory per-process so repeated calls are consistent
  // and we don't race selecting different candidates across requests.
  if ((getStoragePath as any)._selectedBase) {
    const base = (getStoragePath as any)._selectedBase as string;
    return path.join(base, 'linker', subfolder);
  }

  // Ensure repository-local `storage` exists and prefer it as a stable,
  // writable location for uploads. This is useful when `public/media` is
  // not present or not writable on the host.
  try {
    const repoStorageBase = path.join(process.cwd(), 'storage');
    const repoCandidate = path.join(repoStorageBase, 'linker', subfolder);
    fs.mkdirSync(repoCandidate, { recursive: true });
    // quick probe
    const probe = path.join(repoCandidate, `.probe-${Date.now()}.tmp`);
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    (getStoragePath as any)._selectedBase = repoStorageBase;
    console.log('[STORAGE] using repo-local storage for uploads:', repoCandidate);
    return repoCandidate;
  } catch (e) {
    console.warn('[STORAGE] repo-local storage not usable, will try other candidates:', formatErr(e));
  }

  // Try to proactively create and use public/media if possible (makes files
  // directly served by Next.js static server). This helps ensure uploads
  // persist and are immediately accessible.
  try {
    const publicMediaBase = path.join(process.cwd(), 'public', 'media');
    const publicCandidate = path.join(publicMediaBase, 'linker', subfolder);
    fs.mkdirSync(publicCandidate, { recursive: true });
    // quick writability probe
    const probe = path.join(publicCandidate, `.probe-${Date.now()}.tmp`);
    fs.writeFileSync(probe, 'ok');
    fs.unlinkSync(probe);
    (getStoragePath as any)._selectedBase = publicMediaBase;
    console.log('[STORAGE] using public/media for uploads:', publicCandidate);
    return publicCandidate;
  } catch (e) {
    // if public/media cannot be created or written, fall back to normal candidates
    console.warn('[STORAGE] public/media not usable, falling back to candidates:', formatErr(e));
  }

  const candidates = [] as string[];

  // If operator explicitly set FORCE_REPO_STORAGE=1, prefer repo-local storage
  const forceRepo = !!process.env.FORCE_REPO_STORAGE;
  // Prefer explicit UPLOAD_DIR unless forceRepo is set
  if (process.env.UPLOAD_DIR && !forceRepo) candidates.push(process.env.UPLOAD_DIR);
  // Prefer public/media in repo (web-accessible persistent folder)
  try {
    candidates.push(path.join(process.cwd(), 'public', 'media'));
  } catch (e) {
    // ignore
  }
  // Repo-local storage (fallback)
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
        // successful write -> select this path and cache base
        console.log(`[STORAGE] selected writable storage candidate: ${candidate}`);
        (getStoragePath as any)._selectedBase = base;
        return candidate;
      } catch (writeErr) {
        // can't write here, continue to next candidate
        console.warn(`[STORAGE] Not writable: ${candidate}`, formatErr(writeErr));
        continue;
      }
    } catch (mkdirErr) {
      console.warn(`[STORAGE] Cannot create candidate storage dir ${candidate}:`, formatErr(mkdirErr));
      continue;
    }
  }

  // As an ultimate fallback, return os.tmpdir() joined path (ensure it's created)
  const fallback = path.join(os.tmpdir(), 'linker', subfolder);
  try {
    fs.mkdirSync(fallback, { recursive: true });
    console.log(`[STORAGE] falling back to tmpdir storage: ${fallback}`);
    (getStoragePath as any)._selectedBase = os.tmpdir();
  } catch (e) {
    console.error('[STORAGE] Failed to create fallback tmp dir', fallback, formatErr(e));
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
