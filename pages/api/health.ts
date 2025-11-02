import type { NextApiRequest, NextApiResponse } from 'next';
import redis from '../../lib/redis';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const pong = await redis.ping();
    return res.status(200).json({ status: 'ok', now: new Date().toISOString(), redis: pong, redisUrl: process.env.REDIS_URL || null });
  } catch (e: any) {
    return res.status(500).json({ status: 'error', error: String(e?.message || e) });
  }
}
