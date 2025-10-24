// @ts-ignore
declare module 'formidable';
import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { pusher } from '../../../lib/pusher';
// @ts-ignore
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session || !session.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const uploadDir = path.join(process.cwd(), 'public', 'voice');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const form = new formidable.IncomingForm({
    uploadDir,
    keepExtensions: true
  });

  form.parse(req, async (err: any, fields: any, files: any) => {
    if (err) {
      return res.status(500).json({ error: 'Form parse error' });
    }
    const { chatId } = fields;
    const audio = files.audio;
    if (!chatId || !audio) {
      return res.status(400).json({ error: 'chatId and audio required' });
    }
    const audioPath = path.join('voice', path.basename(audio.filepath));
    const audioUrl = `/voice/${path.basename(audio.filepath)}`;
    // Сохраняем сообщение с ссылкой на аудиофайл
    const message = await prisma.message.create({
      data: {
        chatId: String(chatId),
        senderId: session.user.id,
        text: '',
        createdAt: new Date(),
        audioUrl: String(audioUrl)
      }
    });
    await pusher.trigger(`chat-${chatId}`, 'new-voice', { ...message, audioUrl });
    return res.status(200).json({ message });
  });
}
