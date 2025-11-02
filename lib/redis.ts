import Redis from 'ioredis';
import crypto from 'crypto';

// Create a shared Redis client. Uses REDIS_URL env or defaults to localhost.
// Configure retry options to avoid hitting ioredis per-request retry limit which
// can surface as: "Reached the max retries per request limit (which is 20)".
// Setting `maxRetriesPerRequest: null` disables the per-request limit and
// allows the client to use the global reconnect strategy. We also provide
// a simple retryStrategy and reconnectOnError handler to make reconnects
// more resilient and observable.
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  // allow commands to be queued/retried while reconnecting
  maxRetriesPerRequest: null,
  // backoff for reconnect attempts (ms)
  retryStrategy(times) {
    // exponential backoff capped at 2s
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  // when Redis replies with READONLY or similar errors, try reconnecting
  reconnectOnError(err) {
    if (!err) return false;
    const message = String(err.message || '').toUpperCase();
    // reconnect on MOVED/ASK/READONLY or connection issues
    if (message.includes('READONLY') || message.includes('MOVED') || message.includes('ASK')) return true;
    return false;
  },
  // enable offline queue so commands issued while disconnected are queued
  enableOfflineQueue: true,
});

// Basic logging to help debug connection/retry issues in development
redis.on('error', (err) => {
  // eslint-disable-next-line no-console
  console.error('[redis] error', err && err.message ? err.message : err);
});
redis.on('connect', () => {
  // eslint-disable-next-line no-console
  console.info('[redis] connecting');
});
redis.on('ready', () => {
  // eslint-disable-next-line no-console
  console.info('[redis] ready');
});
redis.on('end', () => {
  // eslint-disable-next-line no-console
  console.warn('[redis] connection closed');
});

export default redis;

export type SessionRecord = {
  id: string;
  userId: string;
  deviceName: string;
  isActive: boolean;
  createdAt: string;
  ip?: string | null;
};

export async function createSessionRedis(userId: string, deviceName: string, ip?: string | null) {
  const id = (crypto as any).randomUUID ? (crypto as any).randomUUID() : crypto.randomBytes(16).toString('hex');
  const createdAt = new Date().toISOString();
  const rec: SessionRecord = { id, userId, deviceName, isActive: true, createdAt, ip: ip || null };
  const key = `session:${id}`;
  await redis.set(key, JSON.stringify(rec));
  // store in user sessions zset (score = epoch ms)
  const score = Date.parse(createdAt) || Date.now();
  await redis.zadd(`user:${userId}:sessions`, score.toString(), id);
  return rec;
}

export async function deactivateOtherSessions(userId: string, exceptId?: string) {
  const key = `user:${userId}:sessions`;
  const ids = await redis.zrange(key, 0, -1);
  if (!ids || ids.length === 0) return;
  const pipeline = redis.pipeline();
  for (const sid of ids) {
    if (exceptId && sid === exceptId) continue;
    const sKey = `session:${sid}`;
    pipeline.get(sKey);
  }
  const res = await pipeline.exec();
  // res is array of [err, val]
  if (!res) return;
  const setPipeline = redis.pipeline();
  for (let i = 0; i < res.length; i++) {
    const entry = res[i] as any;
    if (!entry) continue;
    const [err, val] = entry;
    if (err) continue;
    if (!val) continue;
    try {
      const obj = JSON.parse(val as string) as SessionRecord;
      if (obj.isActive) {
        obj.isActive = false;
        setPipeline.set(`session:${obj.id}`, JSON.stringify(obj));
      }
    } catch (e) {
      // ignore
    }
  }
  await setPipeline.exec();
}

export async function endSession(sessionId: string) {
  const key = `session:${sessionId}`;
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as SessionRecord;
    if (!obj.isActive) return obj;
    obj.isActive = false;
    // remove from user's sessions zset so it won't be returned in active lists
    try {
      if (obj.userId) {
        await redis.zrem(`user:${obj.userId}:sessions`, sessionId);
      }
    } catch (e) {
      // ignore zrem errors
    }
    // delete the session key to fully revoke it
    try {
      await redis.del(key);
    } catch (e) {
      // ignore
    }
    return obj;
  } catch (e) {
    return null;
  }
}

export async function getSessionById(sessionId: string) {
  const raw = await redis.get(`session:${sessionId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionRecord;
  } catch (e) {
    return null;
  }
}

export async function getUserSessions(userId: string) {
  const ids = await redis.zrange(`user:${userId}:sessions`, 0, -1);
  if (!ids || ids.length === 0) return [] as SessionRecord[];
  const pipeline = redis.pipeline();
  for (const id of ids) pipeline.get(`session:${id}`);
  const res = await pipeline.exec();
  const out: SessionRecord[] = [];
  for (const [, val] of res as any[]) {
    if (!val) continue;
    try {
      out.push(JSON.parse(val));
    } catch (e) {}
  }
  return out;
}
