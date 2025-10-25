import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end();
  const { login, userId } = req.query;
  if (!login || typeof login !== "string") return res.status(400).json({ error: "login required" });
  // Поиск пользователей по части логина
  const users = await prisma.user.findMany({
    where: {
      login: {
        contains: login,
        mode: "insensitive"
      }
    },
    select: {
      id: true,
      login: true,
      avatar: true,
      role: true
    },
    take: 10 // ограничение на количество результатов
  });
  // Определяем, является ли найденный пользователь другом и отправлена ли заявка
  let usersWithFriendStatus = (Array.isArray(users) ? users : []).map(u => ({ ...u, isFriend: false, requestSent: false }));
  if (userId && typeof userId === "string") {
    const friendIds = await prisma.friend.findMany({
      where: { userId },
      select: { friendId: true }
    });
    const friendIdSet = new Set(friendIds.map((f: any) => f.friendId));
    // find outgoing friend requests from current user
    const outgoing = await prisma.friendRequest.findMany({ where: { fromId: userId }, select: { toId: true } });
    const outgoingSet = new Set(outgoing.map((r: any) => r.toId));
    usersWithFriendStatus = usersWithFriendStatus.map(u => ({ ...u, isFriend: friendIdSet.has(u.id), requestSent: outgoingSet.has(u.id) }));
  }
  return res.status(200).json({ users: usersWithFriendStatus });
}
