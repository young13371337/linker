import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { pusher } from '../../../lib/pusher';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { friendId } = req.body as { friendId?: string };
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session || !session.user || !(session.user as any).id) return res.status(401).json({ error: 'Unauthorized' });
  const userId = (session.user as any).id;
  if (!friendId) return res.status(400).json({ error: "friendId required" });
  // Проверка на существование заявки
  const existing = await prisma.friendRequest.findFirst({ where: { fromId: userId, toId: friendId } });
  if (existing) return res.status(400).json({ error: "Заявка уже отправлена." });
  const created = await prisma.friendRequest.create({ data: { fromId: userId, toId: friendId } });

  // Try to fetch sender info for notification
  try {
    const fromUser = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, login: true, link: true, avatar: true } });
    if (fromUser) {
      // Trigger pusher event to the recipient's user channel (include link)
      try {
        await pusher.trigger(`user-${friendId}`, 'friend-request', { fromId: fromUser.id, fromLogin: fromUser.login, fromLink: fromUser.link || null, fromAvatar: fromUser.avatar || null });
      } catch (e) {
        // log but don't fail the request
        console.error('Pusher trigger failed for friend-request:', e);
      }
    }
  } catch (e) {
    console.error('Failed to fetch sender user for friend request notification:', e);
  }

  return res.status(200).json({ ok: true, request: created });
}
