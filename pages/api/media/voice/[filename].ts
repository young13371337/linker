import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { getStoragePath } from '../../../../lib/storage';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  const { filename } = req.query;
  if (!filename || Array.isArray(filename)) return res.status(400).json({ error: 'Invalid filename' });
  try {
    const safeName = path.basename(filename as string);
    // Find message by audioUrl containing filename
    const message = await prisma.message.findFirst({ where: { audioUrl: { contains: safeName } } });
    const userId = session.user.id as string;
    if (!message) {
      // No DB message found — allow uploader (owner) to access their own file if filename contains their user id.
      if (!safeName.includes(userId)) {
        return res.status(404).json({ error: 'Message not found' });
      }
      console.log('[MEDIA][VOICE] No DB message found; serving orphaned audio to owner:', userId);
    } else {
      // Check permissions: sender or participant of chat
      if (message.senderId !== userId) {
        const chat = await prisma.chat.findUnique({ where: { id: message.chatId }, include: { users: true } });
        const isParticipant = chat?.users?.some((u: any) => u.id === userId);
        if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });
      }
    }

  const storageDir = getStoragePath('voice');
  const fullPath = path.join(storageDir, safeName);
    console.log('[MEDIA][VOICE] serving path:', fullPath, 'storageDir:', storageDir, 'host:', os.hostname(), 'pid:', process.pid);
    if (!fs.existsSync(fullPath)) {
      let listing: string[] = [];
      try {
        listing = fs.readdirSync(storageDir);
      } catch (re) {
        console.warn('[MEDIA][VOICE] Failed to read storageDir listing:', storageDir, String(re));
      }
      console.warn('[MEDIA][VOICE] File not found at expected path:', fullPath, 'storageDir listing:', listing, 'host:', os.hostname(), 'pid:', process.pid);
      return res.status(404).json({ error: 'File not found', storageDirListing: listing });
    }
    const stat = fs.statSync(fullPath);
    const ext = path.extname(safeName).toLowerCase();
    const contentType = ext === '.mp3' ? 'audio/mpeg' : ext === '.wav' ? 'audio/wav' : 'audio/webm';

    // Allow range requests and long cache for audio files to improve playback reliability
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    const range = req.headers.range;
    if (range) {
      // Serve partial content for seeking
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? Math.min(stat.size - 1, parseInt(parts[1], 10)) : stat.size - 1;
      if (isNaN(start) || isNaN(end) || start > end) {
        res.status(416).setHeader('Content-Range', `bytes */${stat.size}`);
        return res.end();
      }
      const chunkSize = (end - start) + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      res.setHeader('Content-Length', String(chunkSize));
      res.setHeader('Content-Type', contentType);
      const stream = fs.createReadStream(fullPath, { start, end });
      stream.pipe(res);
    } else {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', String(stat.size));
      const stream = fs.createReadStream(fullPath);
      stream.pipe(res);
    }
  } catch (e) {
    console.error('[MEDIA][VOICE] Error serving file:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}
