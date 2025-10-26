import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';

import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
// No encryption for video files — store raw files under pages/api/.private_media/video
import { pusher } from '../../../lib/pusher';

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req: NextApiRequest): Promise<{ fields: any; files: any }> {
  return new Promise((resolve, reject) => {
    // Support several possible `formidable` shapes (callable default, .default, or IncomingForm)
    try {
      const formidableLib = require('formidable');
      let createForm: any = null;
      if (typeof formidableLib === 'function') {
        createForm = formidableLib;
      } else if (formidableLib && typeof formidableLib.default === 'function') {
        createForm = formidableLib.default;
      } else if (formidableLib && typeof formidableLib.IncomingForm === 'function') {
        createForm = (opts: any) => new formidableLib.IncomingForm(opts);
      }
      if (!createForm) {
        return reject(new Error('Formidable module has unexpected shape'));
      }
      const form = createForm({
        multiples: false,
        allowEmptyFiles: false,
        keepExtensions: true,
        maxFileSize: 50 * 1024 * 1024, // 50MB
      });
      if (typeof form.parse === 'function') {
        form.parse(req, (err: any, fields: any, files: any) => {
          if (err) reject(err);
          else resolve({ fields, files });
        });
      } else if (typeof (form as any).parse === 'undefined' && typeof (form as any).then === 'function') {
        // In case some versions return a promise-like API
        (form as any).then((parsed: any) => resolve(parsed)).catch(reject);
      } else {
        reject(new Error('Formidable parse method not available'));
      }
    } catch (err) {
      reject(err);
    }
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Enable CORS for faster response
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Allow credentials so browser can send cookies when needed
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
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
      // Сохраняем видео в оригинальном виде (без шифрования)
          const uploadDir = path.join(process.cwd(), 'storage', 'video');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      const fileName = `${Date.now()}-circle.webm`;
          const filePath = path.join(uploadDir, fileName);

      console.log('[VIDEO UPLOAD] Reading file from:', video.filepath || video.path);

      const fileBuffer = await fs.promises.readFile(video.filepath || video.path);
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new Error('Empty video file buffer');
      }

      // Отправляем частичный ответ клиенту пока идёт запись
      res.writeHead(202);

      await fs.promises.writeFile(filePath, fileBuffer);

      videoUrl = `/api/media/video/${fileName}`;
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
      let message: any = null;
      let dbError: any = null;
      let persisted = false;
      try {
        message = await prisma.message.create({
          data: {
            chatId,
            senderId: userId,
            text: '',
            videoUrl,
          },
        });
        persisted = !!(message && message.id);
      } catch (err: any) {
        console.error('[VIDEO UPLOAD] Prisma create failed', err);
        dbError = { message: err?.message || String(err), stack: err?.stack };
        message = { id: `temp-${Date.now()}`, chatId, senderId: userId, text: '', createdAt: new Date().toISOString() };
        persisted = false;
      }
      // Уведомляем подписчиков через Pusher
      try {
        const payload = { id: message.id, sender: userId, text: '', createdAt: message.createdAt, videoUrl, persisted, dbError };
        await pusher.trigger(`chat-${chatId}`, 'new-message', payload);
      } catch (pErr) {
        console.error('[VIDEO UPLOAD] Pusher trigger failed:', pErr);
      }
      res.status(200).json({ videoUrl, message, persisted, dbError });
    } catch (e) {
      console.error('Video upload error:', e);
      res.status(500).json({ error: 'Upload failed', details: String(e) });
    }
  } else if (req.method === 'DELETE') {
    // Делегируем удаление сообщения на единый endpoint /api/messages/[id]
    // Этот блок сохранлён для совместимости — перенаправляем на основной обработчик
    try {
      const { id } = req.query;
      if (!id || typeof id !== 'string') {
        res.status(400).json({ error: 'No message id provided' });
        return;
      }
      // Переиспользуем основной обработчик: перенаправляем запрос
      // Клиент ожидает 204 или ошибку
      const fetch = require('node-fetch');
      const serverRes = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/messages/${id}`, { method: 'DELETE', headers: { cookie: req.headers.cookie || '' } });
      const text = await serverRes.text();
      if (serverRes.status === 204) return res.status(204).end();
      try { return res.status(serverRes.status).json(JSON.parse(text)); } catch { return res.status(serverRes.status).send(text); }
    } catch (e) {
      console.error('Video delete proxy error:', e);
      res.status(500).json({ error: 'Delete failed', details: String(e) });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
