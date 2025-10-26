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
    // Find message by videoUrl containing filename
    const message = await prisma.message.findFirst({ where: { videoUrl: { contains: safeName } } });
    if (!message) return res.status(404).json({ error: 'Message not found' });

    const userId = session.user.id as string;
    if (message.senderId !== userId) {
      const chat = await prisma.chat.findUnique({ where: { id: message.chatId }, include: { users: true } });
      const isParticipant = chat?.users?.some((u: any) => u.id === userId);
      if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });
    }

  const storageDir = getStoragePath('video');
  const fullPath = path.join(storageDir, safeName);
    console.log('[MEDIA][VIDEO] serving path:', fullPath, 'storageDir:', storageDir, 'host:', os.hostname(), 'pid:', process.pid);
    if (!fs.existsSync(fullPath)) {
      console.warn('[MEDIA][VIDEO] File not found at expected path:', fullPath, 'host:', os.hostname(), 'pid:', process.pid);
      return res.status(404).json({ error: 'File not found' });
    }
    const stat = fs.statSync(fullPath);
    const stream = fs.createReadStream(fullPath);
    const ext = path.extname(safeName).toLowerCase();
    const contentType = ext === '.mp4' ? 'video/mp4' : 'video/webm';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', String(stat.size));
    stream.pipe(res);
  } catch (e) {
    console.error('[MEDIA][VIDEO] Error serving file:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}
