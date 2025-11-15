import type { NextApiRequest, NextApiResponse } from 'next';
import { createS3Client, getS3Bucket, getS3Endpoint } from '../../../lib/s3';
import { HeadBucketCommand } from '@aws-sdk/client-s3';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const s3 = createS3Client();
  const bucket = getS3Bucket();
  const endpoint = getS3Endpoint();
  const forceDb = (process.env.FORCE_DB_MEDIA || 'false').toLowerCase() === 'true';
  if (forceDb) return res.status(200).json({ ok: false, endpoint, bucket, error: 'S3 disabled by FORCE_DB_MEDIA' });
  if (!s3 || !bucket) return res.status(400).json({ ok: false, error: 'S3 not configured', endpoint, bucket });
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    return res.status(200).json({ ok: true, endpoint, bucket });
  } catch (e) {
    console.error('[S3:check] head bucket error', e);
    return res.status(500).json({ ok: false, endpoint, bucket, error: String((e as any)?.message || e) });
  }
}
