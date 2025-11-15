import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createS3Client, getS3Bucket } from '../../../lib/s3';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || Array.isArray(id)) return res.status(400).end();

  const media = await (prisma as any).media.findUnique({ where: { id } });
  if (!media) return res.status(404).end();

  if (media.provider === 'db' && media.data) {
    console.log('/api/media/[id] serving DB media', { id, size: media.size, mime: media.mime });
    res.setHeader('Content-Type', media.mime || 'application/octet-stream');
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return res.status(200).send(media.data as Buffer);
  }

  // S3/MinIO provider: generate signed URL and redirect
  const s3 = createS3Client();
  const bucket = getS3Bucket();
  if (s3 && bucket && media.key) {
    try {
      const cmd = new GetObjectCommand({ Bucket: bucket, Key: media.key });
      const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 60 });
      return res.redirect(307, url);
    } catch (e) {
      console.error('s3 presign error', e);
      return res.status(500).json({ error: 'Failed to generate url', detail: String((e as any)?.message || e) });
    }
  }

  return res.status(404).end();
}
