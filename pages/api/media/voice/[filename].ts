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
  // Файл должен лежать в storage/voice
  const filePath = path.join(process.cwd(), '.private_media', 'voice', filename);
  console.log('[VOICE API] filePath:', filePath);
  if (!fs.existsSync(filePath)) {
    console.error('[VOICE API] File not found:', filePath);
    return res.status(404).json({ error: 'File not found' });
  }
  try {
    const encrypted = fs.readFileSync(filePath);
    const prisma = (await import('../../../../lib/prisma')).default;
    const message = await prisma.message.findFirst({ where: { audioUrl: { contains: filename } } });
    console.log('[VOICE API] message:', message);
    if (!message) {
      console.error('[VOICE API] Message not found for filename:', filename);
      return res.status(404).json({ error: 'Message not found' });
    }
    const chatId = message.chatId;
    console.log('[VOICE API] chatId:', chatId);
    const decrypted = decryptFileBuffer(encrypted, chatId);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `inline; filename="${filename.replace(/\.enc$/, '.mp3')}"`);
    res.status(200).send(decrypted);
  } catch (e) {
    console.error('[VOICE API] Decryption failed:', e);
    res.status(500).json({ error: 'Decryption failed', details: String(e) });
  }
}
