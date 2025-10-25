import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';

import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
import { encryptFileBuffer } from '../../../lib/encryption';

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req: NextApiRequest): Promise<{ fields: any; files: any }> {
  return new Promise((resolve, reject) => {
  const { IncomingForm } = require('formidable');
  const form = new IncomingForm({ 
    multiples: false, 
    allowEmptyFiles: false,
    keepExtensions: true,
    maxFileSize: 50 * 1024 * 1024, // 50MB максимум для видео
    filter: function ({mimetype}: {mimetype?: string}) {
      return mimetype && mimetype.includes('video');
    }
  });
  form.parse(req, (err: any, fields: any, files: any) => {
    if (err) reject(err);
    else resolve({ fields, files });
  });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS for faster response
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE');
  
  if (req.method === 'POST') {
    // Публикация видео
    try {
      const { fields, files } = await parseForm(req);
      let video = files.video;
      if (Array.isArray(video)) video = video[0];
      if (!video) {
        res.status(400).json({ error: 'No video file', fields, files });
        return;
      }

      let chatId = fields.chatId;
      if (Array.isArray(chatId)) chatId = chatId[0];
      if (!chatId) {
        res.status(400).json({ error: 'No chatId provided' });
        return;
      }

      let videoUrl: string;
      try {
          // --- Шифруем видеофайл и сохраняем с .enc ---
          const uploadDir = path.join(process.cwd(), '.private_media', 'video');
          if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
          const fileName = `${Date.now()}-circle.webm`;
          const encFileName = fileName + '.enc';
          const filePath = path.join(uploadDir, encFileName);
          
          console.log('[VIDEO UPLOAD] Reading file from:', video.filepath || video.path);
          
          // Читаем файл через промисы для лучшей производительности
          const fileBuffer = await fs.promises.readFile(video.filepath || video.path);
          if (!fileBuffer || fileBuffer.length === 0) {
              throw new Error('Empty video file buffer');
          }
          
          // Отправляем частичный ответ клиенту пока идет шифрование
          res.writeHead(202);
          
          console.log('[VIDEO UPLOAD] Encrypting file for chat:', chatId);
          const encryptedBuffer = encryptFileBuffer(fileBuffer, chatId);
          
          // Асинхронная запись файла
          await fs.promises.writeFile(filePath, encryptedBuffer);
          
          videoUrl = `/api/media/video/${encFileName}`;
          console.log('[VIDEO UPLOAD] File saved as:', filePath);
      } catch (error: any) {
          console.error('[VIDEO UPLOAD] Error:', error);
          res.status(500).json({ error: 'Video processing failed', details: error.message || 'Unknown error' });
          return;
      }
      const session = await getServerSession(req, res, authOptions);
      const userId = session?.user?.id;
      if (!chatId) {
        res.status(400).json({ error: 'No chatId provided', fields });
        return;
      }
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: no userId from session', session });
        return;
      }
      const message = await prisma.message.create({
        data: {
          chatId,
          senderId: userId,
          text: '',
          videoUrl,
        },
      });
      res.status(200).json({ videoUrl, message });
    } catch (e) {
      console.error('Video upload error:', e);
      res.status(500).json({ error: 'Upload failed', details: String(e) });
    }
  } else if (req.method === 'DELETE') {
    // Удаление кружка
    try {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'No message id provided' });
        return;
      }
      // Найти сообщение
      const message = await prisma.message.findUnique({ where: { id } });
      if (!message || !message.videoUrl) {
        res.status(404).json({ error: 'Message or video not found' });
        return;
      }
      // Удалить файл
      const filePath = path.join(process.cwd(), message.videoUrl.startsWith('/') ? message.videoUrl.slice(1) : message.videoUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      // Удалить сообщение
      await prisma.message.delete({ where: { id } });
      res.status(204).end();
    } catch (e) {
      console.error('Video delete error:', e);
      res.status(500).json({ error: 'Delete failed', details: String(e) });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
