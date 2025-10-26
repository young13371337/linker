import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { getStoragePath } from '../../../../lib/storage';

// This API route serves media files from the storage directory under a unified
// /api/media/* URL. Expected URL patterns via next dynamic catch-all:
// /api/media/linker/video/<filename>
// /api/media/linker/voice/<filename>

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const raw = req.query.path;
    let parts: string[] = [];
    if (Array.isArray(raw)) parts = raw as string[];
    else if (typeof raw === 'string') parts = [raw];

    // expect at least: linker, <type>, <filename>
    if (parts.length < 3) {
      res.status(400).json({ error: 'Invalid media path' });
      return;
    }
    const namespace = parts[0];
    const mediaType = parts[1]; // 'video' or 'voice'
    const fileName = parts.slice(2).join('/');

    if (namespace !== 'linker') {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (mediaType !== 'video' && mediaType !== 'voice') {
      res.status(400).json({ error: 'Unsupported media type' });
      return;
    }

    const storageDir = getStoragePath(mediaType);
    const safeName = path.basename(fileName);
    const fullPath = path.join(storageDir, safeName);
    console.log('[MEDIA API] request for', req.url, '->', fullPath);

    if (!fs.existsSync(fullPath)) {
      console.warn('[MEDIA API] File not found:', fullPath);
      res.status(404).end();
      return;
    }

    const stat = fs.statSync(fullPath);
    const stream = fs.createReadStream(fullPath);
    const ext = path.extname(safeName).toLowerCase();
    const contentType = ext === '.mp4' ? 'video/mp4' : ext === '.webm' ? 'video/webm' : (ext === '.mp3' ? 'audio/mpeg' : 'application/octet-stream');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(stat.size));
    stream.pipe(res);
  } catch (e) {
    console.error('[MEDIA API] Error serving media:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}
