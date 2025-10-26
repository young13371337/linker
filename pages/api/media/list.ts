import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { getStoragePath } from '../../../lib/storage';

function listDirContents(dir: string) {
  try {
    const files = fs.readdirSync(dir).map((name) => {
      try {
        const stat = fs.statSync(path.join(dir, name));
        return { name, size: stat.size, mtime: stat.mtime };
      } catch (e) {
        return { name, error: String(e) };
      }
    });
    return { ok: true, files };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Debug-only endpoint to inspect storage contents. Do not expose in production
  try {
    const voiceDir = getStoragePath('voice');
    const videoDir = getStoragePath('video');
    const voice = listDirContents(voiceDir);
    const video = listDirContents(videoDir);
    return res.status(200).json({ voiceDir, videoDir, voice, video });
  } catch (e) {
    console.error('[MEDIA][LIST] Error listing storage:', e);
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
