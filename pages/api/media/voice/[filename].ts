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
  const filePath = path.join(process.cwd(), 'storage', 'voice', filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  try {
    const encrypted = fs.readFileSync(filePath);
    // chatId можно получить из БД по filename (по message.audioUrl)
    // Для простоты: ищем message по audioUrl
    const prisma = (await import('../../../../lib/prisma')).default;
    const message = await prisma.message.findFirst({ where: { audioUrl: { contains: filename } } });
    if (!message) return res.status(404).json({ error: 'Message not found' });
    const chatId = message.chatId;
    const decrypted = decryptFileBuffer(encrypted, chatId);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', `inline; filename="${filename.replace(/\.enc$/, '.mp3')}"`);
    res.status(200).send(decrypted);
  } catch (e) {
    res.status(500).json({ error: 'Decryption failed', details: String(e) });
  }
}
