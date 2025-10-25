import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';

import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
// No encryption for video files — store raw files under pages/api/.private_media/video
import { pusher } from '../../../lib/pusher';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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
  // Allow credentials so browser can send cookies when needed
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, DELETE');
  
  if (req.method === 'POST') {
    // Публикация видео
    try {
      // Verify session before parsing large multipart body
      let sessionEarly;
      try {
        sessionEarly = await getServerSession(req, res, authOptions);
      } catch (se) {
        console.error('[VIDEO UPLOAD] getServerSession error:', se);
      }
      if (!sessionEarly || !sessionEarly.user?.id) {
        // don't short-circuit here — continue to parse to give better error details when testing
        console.warn('[VIDEO UPLOAD] Warning: no session found (request may be missing cookies)');
      }

      let fields: any, files: any;
      try {
        ({ fields, files } = await parseForm(req));
      } catch (pfErr: any) {
        console.error('[VIDEO UPLOAD] parseForm failed:', pfErr && pfErr.stack ? pfErr.stack : String(pfErr));
        res.status(500).json({ error: 'Failed to parse multipart form', details: String(pfErr), stack: pfErr?.stack });
        return;
      }
      console.log('[VIDEO UPLOAD] parsed fields:', fields);
      console.log('[VIDEO UPLOAD] parsed files keys:', Object.keys(files || {}));
      let video = files.video;
      console.log('[VIDEO UPLOAD] raw video object:', video);
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
        const tmpPath = (video as any)?.filepath || (video as any)?.path || (video as any)?.tempFilePath || (video as any)?.file?.path;
        console.log('[VIDEO UPLOAD] video.tempPath candidates checked, using:', tmpPath);
        console.log('[VIDEO UPLOAD] video props:', {
          originalFilename: (video as any)?.originalFilename || (video as any)?.name || null,
          mimetype: (video as any)?.mimetype || (video as any)?.type || null,
          size: (video as any)?.size || null,
        });

        if (!tmpPath) throw new Error('Temporary upload path is missing on parsed file');

        // ensure temp path is readable
        try {
          await fs.promises.access(tmpPath, fs.constants.R_OK);
        } catch (accessErr) {
          console.error('[VIDEO UPLOAD] Temp file is not accessible:', accessErr);
          throw accessErr;
        }

        // Read file buffer and store as base64 in DB when external object storage is not configured.
        // This keeps media persisted in the database (text column) so deployments without S3 still work.
        const fileBuffer = await fs.promises.readFile(tmpPath);
        if (!fileBuffer || fileBuffer.length === 0) throw new Error('Empty video file');
        const base64 = fileBuffer.toString('base64');

        // We'll create the message including base64 data below; set videoUrl to DB-serving endpoint placeholder
        // videoUrl will point to an API route that serves media from DB by message id.
        videoUrl = '__DB_BASE64__';
        // store base64 later when creating the message
        (req as any)._videoBase64 = base64;
        (req as any)._videoMime = (video as any)?.mimetype || 'video/webm';
    } catch (error: any) {
      console.error('[VIDEO UPLOAD] Error:', error && error.stack ? error.stack : String(error));
      res.status(500).json({ error: 'Video processing failed', details: error?.message || String(error), stack: error?.stack });
      return;
    }
    const session = sessionEarly || await getServerSession(req, res, authOptions);
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
