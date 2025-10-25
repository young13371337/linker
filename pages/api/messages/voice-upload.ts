import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';

import prisma from '../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';
// No encryption for voice files anymore — store raw files under pages/api/.private_media/voice
import { pusher } from '../../../lib/pusher';

export const config = {
	api: {
		bodyParser: false,
	},
};

function parseForm(req: NextApiRequest): Promise<{ fields: any; files: any }> {
	return new Promise((resolve, reject) => {
		// Use formidable v3+ API
		const formidable = require('formidable');
		const form = formidable({
			multiples: false,
			allowEmptyFiles: false,
			keepExtensions: true,
			maxFileSize: 10 * 1024 * 1024, // 10MB
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
	res.setHeader('Access-Control-Allow-Methods', 'POST');
	
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}
	try {
		const { fields, files } = await parseForm(req);
		console.log('[VOICE UPLOAD] parsed fields:', fields);
		console.log('[VOICE UPLOAD] parsed files keys:', Object.keys(files || {}));
		console.log('[VOICE UPLOAD] raw audio object:', files?.audio);
		   let audio = files.audio;
		   console.log('[VOICE UPLOAD] audio.filepath:', (audio as any)?.filepath || (audio as any)?.path);
		   if (Array.isArray(audio)) audio = audio[0];
		   let file, fileType, fileExt, uploadDir, fileName, filePath, urlField, urlValue;
		   let chatId = fields.chatId;
		   if (Array.isArray(chatId)) chatId = chatId[0];

           if (!chatId) {
               throw new Error('No chatId provided');
           }

		   if (audio) {
			   file = audio;
			   fileType = 'audio';
			   fileExt = '.mp3';
			   // Save media under storage/voice (outside pages) to avoid direct listing
			   uploadDir = path.join(process.cwd(), 'storage', 'voice');
			   if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
			   fileName = `${Date.now()}-${file.originalFilename ? file.originalFilename.replace(/\.[^/.]+$/, fileExt) : 'voice.mp3'}`;
			   
				   try {
					   // Сохраняем оригинальный файл (без шифрования)
					   filePath = path.join(uploadDir, fileName);
					   console.log('[VOICE UPLOAD] target filePath:', filePath);

					   const tmpPath = (file as any)?.filepath || (file as any)?.path;
					   console.log('[VOICE UPLOAD] tmpPath:', tmpPath);
					   console.log('[VOICE UPLOAD] file props:', {
						   originalFilename: (file as any)?.originalFilename || (file as any)?.name || null,
						   mimetype: (file as any)?.mimetype || (file as any)?.type || null,
						   size: (file as any)?.size || null,
					   });

					   if (!tmpPath) throw new Error('Temporary upload path is missing on parsed file');
					   try {
						   await fs.promises.access(tmpPath, fs.constants.R_OK);
					   } catch (accessErr) {
						   console.error('[VOICE UPLOAD] Temp file is not accessible:', accessErr);
						   throw accessErr;
					   }

					   // Читаем файл через промисы
					   const fileBuffer = await fs.promises.readFile(tmpPath);
					   if (!fileBuffer || fileBuffer.length === 0) {
						   throw new Error('Empty file buffer');
					   }

					   // Сохраняем файл без шифрования
					   await fs.promises.writeFile(filePath, fileBuffer);

					   urlField = 'audioUrl';
					   urlValue = `/api/media/voice/${fileName}`;
					   console.log('[VOICE UPLOAD] urlValue:', urlValue, 'chatId:', chatId);
				   } catch (error: any) {
					   console.error('[VOICE UPLOAD] File processing error:', error);
					   throw new Error(`File processing failed: ${error.message || 'Unknown error'}`);
				   }
		   } else {
			   res.status(400).json({ error: 'No audio file', fields, files });
			   return;
		   }
		   // (Проверка минимального размера файла отключена)
		   let session = await getServerSession(req, res, authOptions);
		   let userId = session?.user?.id;
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
				   [urlField]: urlValue,
			   },
		   });
		// Отправляем событие в Pusher
		try {
			await pusher.trigger(`chat-${chatId}`, 'new-message', {
				id: message.id,
				sender: userId,
				text: '',
				createdAt: message.createdAt,
				audioUrl: urlValue,
			});
		} catch (pErr) {
			console.error('[VOICE UPLOAD] Pusher trigger failed:', pErr);
		}
		res.status(200).json({ [urlField]: urlValue, message });
	} catch (e) {
		console.error('Voice upload error:', e);
		res.status(500).json({ error: 'Upload failed', details: String(e) });
	}
}
