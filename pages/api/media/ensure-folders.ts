import type { NextApiRequest, NextApiResponse } from 'next';
import { getStoragePath, ensureDir } from '../../../lib/storage';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET for this admin/debug helper
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const videoPath = getStoragePath('video');
    const voicePath = getStoragePath('voice');

    const okVideo = ensureDir(videoPath);
    const okVoice = ensureDir(voicePath);

    return res.status(200).json({ ok: true, videoPath, voicePath, okVideo, okVoice });
  } catch (e: any) {
    console.error('[MEDIA][ENSURE] error:', e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
