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
    // Use formidable v3+ API (callable) instead of deprecated IncomingForm
    const formidable = require('formidable');
    const form = formidable({
      multiples: false,
      allowEmptyFiles: false,
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB
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
    // Read uploaded temp file into buffer and store as base64 in DB (serverless-friendly)
      console.log('[VIDEO UPLOAD] Reading file from:', video.filepath || video.path);
      const fileBuffer = await fs.promises.readFile(video.filepath || video.path);
      if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('Empty video file buffer');
      }
      const b64 = fileBuffer.toString('base64');
      const mime = video.mimetype || 'video/webm';
      // We'll create DB message with base64 payload below (after session check)
      (fields as any).__videoBase64 = b64;
      (fields as any).__videoMime = mime;
      videoUrl = '__DB_BASE64_PLACEHOLDER__';
      console.log('[VIDEO UPLOAD] Prepared base64 payload, mime:', mime);
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
      // Prepare create data — include base64 if prepared
      const createData: any = { chatId, senderId: userId, text: '' };
      if ((fields as any).__videoBase64) {
        createData.videoBase64 = (fields as any).__videoBase64;
        createData.videoMime = (fields as any).__videoMime || 'video/webm';
      } else if (videoUrl && videoUrl !== '__DB_BASE64_PLACEHOLDER__') {
        createData.videoUrl = videoUrl;
      }

      const message = await prisma.message.create({ data: createData });

      // If base64 was stored in DB, set videoUrl to DB-serving endpoint
      if (createData.videoBase64) {
        const dbUrl = `/api/media/db/${message.id}/video`;
        await prisma.message.update({ where: { id: message.id }, data: { videoUrl: dbUrl } });
        videoUrl = dbUrl;
      }
      // Уведомляем подписчиков через Pusher
      try {
        await pusher.trigger(`chat-${chatId}`, 'new-message', {
          id: message.id,
          sender: userId,
          text: '',
          createdAt: message.createdAt,
          videoUrl,
        });
      } catch (pErr) {
        console.error('[VIDEO UPLOAD] Pusher trigger failed:', pErr);
      }
      res.status(200).json({ videoUrl, message });
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
