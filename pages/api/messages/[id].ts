import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') return res.status(405).end();
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.id) return res.status(401).json({ error: 'Unauthorized' });
  const { id } = req.query;
  if (!id || typeof id !== 'string') return res.status(400).json({ error: 'No message id' });
  // Проверяем, что сообщение принадлежит пользователю
  const msg = await prisma.message.findUnique({ where: { id } });
  console.log('[DELETE MESSAGE]', {
    userId: session.user.id,
    senderId: msg?.senderId,
    messageId: id,
    msgExists: !!msg
  });
  if (!msg || msg.senderId !== session.user.id) return res.status(403).json({ error: 'Forbidden', userId: session.user.id, senderId: msg?.senderId, messageId: id });
  // Удаляем аудиофайл, если есть audioUrl
  if (msg.audioUrl && typeof msg.audioUrl === 'string') {
    try {
      // Извлекаем имя файла из audioUrl (ожидается /api/messages/voice/filename.mp3 или /voice/filename.mp3)
      const match = msg.audioUrl.match(/([\w\-]+\.mp3)$/);
      if (match) {
        const fileName = match[1];
        const filePath = require('path').join(process.cwd(), 'storage', 'voice', fileName);
        require('fs').unlink(filePath, (err: any) => {
          if (err) console.error('Ошибка удаления голосового файла:', err);
        });
      }
    } catch (e) {
      console.error('Ошибка при попытке удалить голосовой файл:', e);
    }
  }
  await prisma.message.delete({ where: { id } });
  return res.status(204).end();
}
