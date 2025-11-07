import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { friendId } = req.body as { userId?: string, friendId?: string };
  const session = (await getServerSession(req, res, authOptions as any)) as any;
  if (!session || !session.user || !(session.user as any).id) return res.status(401).json({ error: 'Unauthorized' });
  const userId = (session.user as any).id;
  if (!friendId) return res.status(400).json({ error: "friendId required" });
  try {
    // Use a transaction to remove friend links (both directions), any friend requests
    // between the users, and chats that contain both users.
    await prisma.$transaction(async (tx) => {
      // Remove friend records in both directions
      await tx.friend.deleteMany({
        where: {
          OR: [
            { userId, friendId },
            { userId: friendId, friendId: userId }
          ]
        }
      });

      // Clean up any outstanding friend requests between these users
      await tx.friendRequest.deleteMany({
        where: {
          OR: [
            { fromId: userId, toId: friendId },
            { fromId: friendId, toId: userId }
          ]
        }
      });

      // Find and delete chats that include both users
      const chats = await tx.chat.findMany({
        where: {
          AND: [
            { users: { some: { id: userId } } },
            { users: { some: { id: friendId } } }
          ]
        },
        select: { id: true }
      });

      if (chats && chats.length > 0) {
        const chatIds = chats.map((c: { id: string }) => c.id);
        // Delete chats; messages and related records should cascade
        await tx.chat.deleteMany({ where: { id: { in: chatIds } } });
      }
    });

    return res.status(200).json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || "Internal server error" });
  }
}
