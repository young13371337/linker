import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { getStoragePath } from '../../../lib/storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const url = (req.body && req.body.url) || req.query.url;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'No url provided' });
    }

    // Normalize (strip querystring)
    const clean = url.split('?')[0];
    const filename = path.basename(clean);

    // Determine subfolder by inspecting the url
    let subfolder: 'video' | 'voice' | null = null;
    const lower = clean.toLowerCase();
    if (lower.includes('/video/') || lower.includes('/media/linker/video/') || lower.includes('/api/media/video/')) subfolder = 'video';
    if (lower.includes('/voice/') || lower.includes('/media/linker/voice/') || lower.includes('/api/media/voice/')) subfolder = 'voice';

    if (!subfolder) {
      // As a fallback, try to infer from extension
      if (filename.endsWith('.webm') || filename.endsWith('.mp4') || filename.endsWith('.mov')) subfolder = 'video';
      if (filename.endsWith('.mp3') || filename.endsWith('.wav') || filename.endsWith('.ogg') || filename.endsWith('.webm')) subfolder = subfolder || 'voice';
    }

    if (!subfolder) {
      return res.status(400).json({ error: 'Cannot determine media type from url' });
    }

    const storageDir = getStoragePath(subfolder);
    const targetPath = path.join(storageDir, filename);

    // Security: ensure the target path is inside storageDir
    const normalizedTarget = path.normalize(targetPath);
    const normalizedDir = path.normalize(storageDir + path.sep);
    if (!normalizedTarget.startsWith(normalizedDir)) {
      console.warn('[MEDIA-DELETE] Attempt to delete outside storage:', normalizedTarget);
      return res.status(400).json({ error: 'Invalid target path' });
    }

    if (fs.existsSync(normalizedTarget)) {
      try {
        await fs.promises.unlink(normalizedTarget);
        console.log('[MEDIA-DELETE] Deleted file:', normalizedTarget, 'by user:', session.user.id);
        return res.status(200).json({ ok: true, deleted: filename });
      } catch (e: any) {
        console.error('[MEDIA-DELETE] Error deleting file:', normalizedTarget, e && e.message ? e.message : e);
        return res.status(500).json({ error: 'Failed to delete file', details: e && e.message ? e.message : String(e) });
      }
    }

    // Not found — return 404 to indicate nothing to remove
    return res.status(404).json({ error: 'File not found' });
  } catch (err: any) {
    console.error('[MEDIA-DELETE] Unexpected error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Internal server error', details: err && err.message ? err.message : String(err) });
  }
}
