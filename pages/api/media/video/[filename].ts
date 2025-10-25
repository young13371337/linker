import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { decryptFileBuffer } from '../../../../lib/encryption';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { filename } = req.query;
  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'No filename' });
  }
  // Файл лежит в pages/api/.private_media/video
  const filePath = path.join(process.cwd(), 'pages', 'api', '.private_media', 'video', filename);
  console.log('[VIDEO API] filePath:', filePath);
  if (!fs.existsSync(filePath)) {
    console.error('[VIDEO API] File not found:', filePath);
    return res.status(404).json({ error: 'File not found' });
  }
  try {
    const encrypted = fs.readFileSync(filePath);
    const prisma = (await import('../../../../lib/prisma')).default;
    const message = await prisma.message.findFirst({ where: { videoUrl: { contains: filename } } });
    console.log('[VIDEO API] message:', message);
    if (!message) {
      console.error('[VIDEO API] Message not found for filename:', filename);
      return res.status(404).json({ error: 'Message not found' });
    }
    const chatId = message.chatId;
    console.log('[VIDEO API] chatId:', chatId);
    const decrypted = decryptFileBuffer(encrypted, chatId);
    res.setHeader('Content-Type', 'video/webm');
    res.setHeader('Content-Disposition', `inline; filename="${filename.replace(/\.enc$/, '.webm')}"`);
    res.status(200).send(decrypted);
  } catch (e) {
    console.error('[VIDEO API] Decryption failed:', e);
    res.status(500).json({ error: 'Decryption failed', details: String(e) });
  }
}
