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
		// Robustly support several possible `formidable` shapes
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
			if (!createForm) return reject(new Error('Formidable module has unexpected shape'));
			const form = createForm({
				multiples: false,
				allowEmptyFiles: false,
				keepExtensions: true,
				maxFileSize: 10 * 1024 * 1024, // 10MB
			});
			if (typeof form.parse === 'function') {
				form.parse(req, (err: any, fields: any, files: any) => {
					if (err) reject(err);
					else resolve({ fields, files });
				});
			} else if (typeof (form as any).then === 'function') {
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
	res.setHeader('Access-Control-Allow-Methods', 'POST');
	
	if (req.method !== 'POST') {
		res.status(405).json({ error: 'Method not allowed' });
		return;
	}
	try {
		// session check will be attempted below; continue to parsing so we can return helpful errors
		let sessionEarly;
		try {
			sessionEarly = await getServerSession(req, res, authOptions);
		} catch (se) {
			console.error('[VOICE UPLOAD] getServerSession error:', se);
		}
		if (!sessionEarly || !sessionEarly.user?.id) {
			console.warn('[VOICE UPLOAD] Warning: no session found (request may be missing cookies)');
		}

		let fields: any, files: any;
		try {
			({ fields, files } = await parseForm(req));
		} catch (pfErr: any) {
			console.error('[VOICE UPLOAD] parseForm failed:', pfErr && pfErr.stack ? pfErr.stack : String(pfErr));
			res.status(500).json({ error: 'Failed to parse multipart form', details: String(pfErr), stack: pfErr?.stack });
			return;
		}
		console.log('[VOICE UPLOAD] parsed fields:', fields);
		console.log('[VOICE UPLOAD] parsed files keys:', Object.keys(files || {}));
		console.log('[VOICE UPLOAD] raw audio object:', files?.audio);
		   let audio = files.audio;
		   console.log('[VOICE UPLOAD] audio.filepath:', (audio as any)?.filepath || (audio as any)?.path);
		   if (Array.isArray(audio)) audio = audio[0];
		   let file: any, fileType: string | undefined, fileExt: string | undefined;
		   let uploadDir: string, fileName: string, filePath: string, urlField: string, urlValue: string;
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
					   // Read temp file into buffer and store as base64 in DB (safer on serverless platforms)
					   const tmpPath = (file as any)?.filepath || (file as any)?.path || (file as any)?.tempFilePath || (file as any)?.file?.path;
					   console.log('[VOICE UPLOAD] tmpPath candidates, using:', tmpPath);
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

					   const fileBuffer = await fs.promises.readFile(tmpPath);
					   if (!fileBuffer || fileBuffer.length === 0) throw new Error('Uploaded audio is empty');
					   const b64 = fileBuffer.toString('base64');
					   const mime = (file as any)?.mimetype || (file as any)?.type || 'audio/mpeg';

					   // We'll store base64 in DB and serve via /api/media/db/:id/audio
					   urlField = 'audioUrl';
					   // create message with base64 payload below (after session check)
					   (fields as any).__audioBase64 = b64;
					   (fields as any).__audioMime = mime;
					   urlValue = '__DB_BASE64_PLACEHOLDER__';
					   console.log('[VOICE UPLOAD] Prepared base64 payload, mime:', mime);
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
		   // If we prepared base64 payload, include it in the DB create
		   const createData: any = {
			   chatId,
			   senderId: userId,
			   text: '',
		   };
		   if ((fields as any).__audioBase64) {
			   createData.audioBase64 = (fields as any).__audioBase64;
			   createData.audioMime = (fields as any).__audioMime || 'audio/mpeg';
		   } else if (urlValue && urlValue !== '__DB_BASE64_PLACEHOLDER__') {
			   createData[urlField] = urlValue;
		   }

		   let message: any = null;
		   let dbError: any = null;
		   let persisted = false;
		   try {
			   message = await prisma.message.create({ data: createData });
			   persisted = !!(message && message.id);
			   // If we stored base64 in DB, set audioUrl to DB-serving endpoint for convenience
			   if (createData.audioBase64) {
				   const dbUrl = `/api/media/db/${message.id}/audio`;
				   await prisma.message.update({ where: { id: message.id }, data: { audioUrl: dbUrl } });
				   urlValue = dbUrl;
			   }
		   } catch (err: any) {
			   console.error('[VOICE UPLOAD] Prisma create failed', err);
			   dbError = { message: err?.message || String(err), stack: err?.stack };
			   // Fallback ephemeral message object
			   message = { id: `temp-${Date.now()}`, chatId, senderId: userId, text: '', createdAt: new Date().toISOString() };
			   persisted = false;
		   }
		// Отправляем событие в Pusher
		try {
			const payload = { id: message.id, sender: userId, text: '', createdAt: message.createdAt, audioUrl: urlValue, persisted, dbError };
			await pusher.trigger(`chat-${chatId}`, 'new-message', payload);
		} catch (pErr) {
			console.error('[VOICE UPLOAD] Pusher trigger failed:', pErr);
		}
		res.status(200).json({ [urlField]: urlValue, message, persisted, dbError });
	} catch (e) {
		console.error('Voice upload error:', e);
		res.status(500).json({ error: 'Upload failed', details: String(e) });
	}
}
