import Pusher from 'pusher';
import PusherClient from 'pusher-js';

export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

let _pusherClient: any = null;

export function getPusherClient() {
  if (typeof window === 'undefined') return null;
  if (_pusherClient) return _pusherClient;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY || '';
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '';
  if (!key) return null;
  _pusherClient = new PusherClient(key as string, { cluster: cluster as string });
  return _pusherClient;
}
