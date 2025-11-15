import type { NextApiRequest, NextApiResponse } from 'next';
// `formidable` API has several shapes depending on version. Use a compatibility helper below.
import fs from 'fs';
// Import sharp lazily inside handler where used to avoid module import errors on platforms
// where sharp may not be available. We'll `require` it at runtime and fall back.
import prisma from '../../../lib/prisma';
import { PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { createS3Client, getS3Bucket, getS3Endpoint } from '../../../lib/s3';
import { randomUUID } from 'crypto';

export const config = { api: { bodyParser: false } };

const MAX_FILE_BYTES = Number(process.env.MAX_FILE_BYTES || 25 * 1024 * 1024); // default 25MB

  // S3/MinIO client created via helper in lib/s3.ts

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Parse multipart form with compatibility wrapper
  async function parseForm(req: any) {
    return new Promise<{ fields: any; files: any }>((resolve, reject) => {
      try {
        const formidableLib = require('formidable');
        let createForm: any = null;
        if (typeof formidableLib === 'function') createForm = formidableLib;
        else if (formidableLib && typeof formidableLib.default === 'function') createForm = formidableLib.default;
        else if (formidableLib && typeof formidableLib.IncomingForm === 'function') createForm = (opts: any) => new formidableLib.IncomingForm(opts);
        if (!createForm) return reject(new Error('Formidable module has unexpected shape'));
        const form = createForm({ maxFileSize: MAX_FILE_BYTES, multiples: false, keepExtensions: true, allowEmptyFiles: false });
        if (typeof form.parse === 'function') {
          form.parse(req, (err2: any, fields: any, files: any) => {
            if (err2) return reject(err2);
            resolve({ fields, files });
          });
        } else if (typeof (form as any).then === 'function') {
          (form as any).then((parsed: any) => resolve(parsed)).catch(reject);
        } else reject(new Error('Formidable parse method not available'));
      } catch (err) { reject(err); }
    });
  }

  const { fields, files } = await parseForm(req);
    console.log('media upload request headers', { ct: req.headers['content-type'] });
    console.log('media upload parsed files (raw)', files);
    // Note: parseForm will throw on error; this point only proceeds when parsed

    const fAny = (files.file as any);
    const file = Array.isArray(fAny) ? fAny[0] : fAny;
    if (!file) {
      console.error('media upload: no file in files object', { files, fields });
      return res.status(400).json({ error: 'No file provided' });
    }

    // Support both `filepath` (newer formidable) and `path` (older)
    const filepath = (file.filepath || (file as any).path) as string;
    if (!filepath) {
      console.error('media upload: uploaded file has no filepath', file);
      return res.status(400).json({ error: 'Uploaded file missing path' });
    }

    try {
      let forceDb = (process.env.FORCE_DB_MEDIA || 'false').toLowerCase() === 'true';
      // Resize and convert to webp for storage efficiency; if `sharp` isn't available,
      // fall back to storing the raw uploaded bytes.
      const maxWidth = 1600;
      let sharpLib: any | null = null;
      try { sharpLib = require('sharp'); } catch (e) { sharpLib = null; }
      let optimized: Buffer | null = null;
      let meta2: any = {};
      if (sharpLib) {
        const image = sharpLib(filepath);
        const metadata = await image.metadata();
        const width = Math.min(metadata.width || maxWidth, maxWidth);
        optimized = await image
          .resize({ width, withoutEnlargement: true })
          .toFormat('webp', { quality: 80 })
          .toBuffer();
        meta2 = await sharpLib(optimized).metadata();
      } else {
        // sharp not installed in this environment; read raw file
        optimized = fs.readFileSync(filepath);
        // Try to retain any known mime type if possible; we will not have width/height
        meta2 = {};
      }

      // If FORCE_DB_MEDIA is set, skip any S3 behavior and store bytes in DB
      if (forceDb) {
        console.log('[MEDIA:upload] FORCE_DB_MEDIA=true — storing media in DB only');
        const mediaDb = await (prisma as any).media.create({
          data: {
            ownerId: fields.ownerId ? String(fields.ownerId) : undefined,
            data: optimized as Buffer,
            mime: (file.mimetype || file.type) || 'image/webp',
            size: (optimized as Buffer).length,
            width: meta2.width ?? undefined,
            height: meta2.height ?? undefined,
            provider: 'db',
          },
        });
        try { fs.unlinkSync(filepath); } catch (e) {}
        console.log('[MEDIA:upload] Created DB media (force)', { id: mediaDb.id, size: mediaDb.size });
        return res.status(200).json({ mediaId: mediaDb.id, mime: mediaDb.mime, size: mediaDb.size, provider: 'db' });
      }

      // If S3/MinIO is configured, upload there and store reference in DB
      const s3 = createS3Client();
      const bucket = getS3Bucket();
      const endpoint = getS3Endpoint();
      // If S3 client or bucket is missing, force DB storage
      if (!s3 || !bucket) forceDb = true;
      console.log('[MEDIA:upload] S3 client configured=', !!s3, 'endpoint=', endpoint, 'bucket=', bucket, 'forceDb=', forceDb);
      if (!forceDb && s3 && bucket) {
        // quick check if bucket exists and is accessible
        try {
          await s3.send(new HeadBucketCommand({ Bucket: bucket }));
          console.log('[MEDIA:upload] HeadBucket OK for', bucket);
        } catch (hbErr) {
          console.error('[MEDIA:upload] HeadBucket error for', bucket, hbErr && (hbErr as any).message ? (hbErr as any).message : hbErr);
          try { fs.unlinkSync(filepath); } catch (er) {}
          const allowFallback = (process.env.S3_FAIL_OPEN || 'false').toLowerCase() === 'true';
          if (!allowFallback) {
            return res.status(500).json({ error: 'Bucket check failed', detail: String((hbErr as any)?.message || hbErr) });
          }
          console.warn('[MEDIA:upload] S3 bucket check failed; falling back to DB storage because S3_FAIL_OPEN=true');
          // If fail-open set, fall through to DB storage path below
        }

      
        const key = `media/${randomUUID()}.webp`;
        try {
          console.log('[MEDIA:upload] Putting object', { Bucket: bucket, Key: key, size: (optimized as Buffer).length });
          await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: optimized as Buffer, ContentType: (file.mimetype || file.type) || 'image/webp', ContentLength: (optimized as Buffer).length }));
          console.log('[MEDIA:upload] PutObject successful', { key });

          const media = await (prisma as any).media.create({
            data: {
              ownerId: fields.ownerId ? String(fields.ownerId) : undefined,
              provider: 's3',
              key,
              mime: (file.mimetype || file.type) || 'image/webp',
              size: (optimized as Buffer).length,
              width: meta2.width ?? undefined,
              height: meta2.height ?? undefined,
            },
          });

          try { fs.unlinkSync(filepath); } catch (e) {}
          return res.status(200).json({ mediaId: media.id, mime: media.mime, size: media.size, provider: 's3' });
        } catch (e) {
          console.error('s3 upload error', e, 'response:', (e as any)?.$metadata || undefined);
          // If S3/MinIO is configured but upload fails, allow optional fallback to DB storage
          const allowFallback = (process.env.S3_FAIL_OPEN || 'false').toLowerCase() === 'true';
          try { fs.unlinkSync(filepath); } catch (er) {}
          if (!allowFallback) {
            return res.status(500).json({ error: 'Failed to upload to object storage', detail: String((e as any)?.message || e) });
          }
          console.warn('[MEDIA:upload] S3 upload failed; falling back to DB storage because S3_FAIL_OPEN=true');
          // fall through to DB storage
        }
      }

      // DB storage: store bytes directly
      const media = await (prisma as any).media.create({
        data: {
          ownerId: fields.ownerId ? String(fields.ownerId) : undefined,
          data: optimized as Buffer,
          mime: (file.mimetype || file.type) || 'image/webp',
          size: (optimized as Buffer).length,
          width: meta2.width ?? undefined,
          height: meta2.height ?? undefined,
          provider: 'db',
        },
      });

      console.log('[MEDIA:upload] Created DB media', { id: media.id, size: media.size });
      try { fs.unlinkSync(filepath); } catch (e) {}

      return res.status(200).json({ mediaId: media.id, mime: media.mime, size: media.size, provider: 'db' });
    } catch (e) {
      console.error('media upload error', e);
      try { fs.unlinkSync(filepath); } catch (er) {}
      return res.status(500).json({ error: 'Internal server error', detail: String(e && (e as any).message ? (e as any).message : e) });
    }
}
