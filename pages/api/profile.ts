import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Получить профиль пользователя, друзей, устройства
  if (req.method === "GET") {
    const { userId } = req.query;
    if (!userId || typeof userId !== "string") return res.status(400).json({ error: "userId required" });
    try {
      let user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          friends: true,
          sessions: {
            where: { isActive: true }
          },
        },
      });
  // Получить друзей с login, role, isOnline
      const friendsFull = await Promise.all(
        (user?.friends || []).map(async (fr: any) => {
          const friend = await prisma.user.findUnique({
            where: { id: fr.friendId },
            include: { sessions: true }
          });
          return friend ? {
            id: friend.id,
            login: friend.login,
            avatar: friend.avatar,
            role: friend.role,
            isOnline: friend.sessions.some((s: any) => {
              if (!s.isActive) return false;
              const created = new Date(s.createdAt).getTime();
              const now = Date.now();
              return now - created < 2 * 60 * 1000; // 2 минуты
            })
          } : null;
        })
      );
  // Получить входящие заявки (FriendRequest), показать login, role, isOnline
      const incomingRequests = await prisma.friendRequest.findMany({ where: { toId: userId } });
      const friendRequests = await Promise.all(
        incomingRequests.map(async (req: any) => {
          const fromUser = await prisma.user.findUnique({
            where: { id: req.fromId },
            include: { sessions: true }
          });
          return fromUser ? {
            id: fromUser.id,
            login: fromUser.login,
            avatar: fromUser.avatar,
            role: fromUser.role,
            isOnline: fromUser.sessions.some((s: any) => {
              if (!s.isActive) return false;
              const created = new Date(s.createdAt).getTime();
              const now = Date.now();
              return now - created < 2 * 60 * 1000;
            })
          } : null;
        })
      );
      // verified: удалено полностью
      // Если логин 'keppcheek', выдаем роль модератора
      if (user && user.login === 'keppcheek' && user.role !== 'moderator') {
        await prisma.user.update({ where: { id: user.id }, data: { role: 'moderator' } });
        user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            friends: true,
            sessions: {
              where: { isActive: true }
            },
          },
        });
      }
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.status(200).json({ user: {
        ...user,
        friends: friendsFull.filter(Boolean),
        friendRequests: friendRequests.filter(Boolean)
      }});
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Internal server error" });
    }
  }
  // Обновить профиль (описание, аватар)
  if (req.method === "POST") {
  const { userId, description, avatar, twoFactorToken, password } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    try {
      const data: any = {};
  if (typeof description !== "undefined") data.description = description;
      if (typeof avatar === "string") data.avatar = avatar;
      if (typeof twoFactorToken === "string" || twoFactorToken === null) data.twoFactorToken = twoFactorToken;
      if (typeof password === "string" && password.length > 0) {
        // hash password before saving
        const bcrypt = require('bcryptjs');
        data.password = await bcrypt.hash(password, 10);
      }
      const user = await prisma.user.update({
        where: { id: userId },
        data,
      });
      return res.status(200).json({ user });
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Internal server error" });
    }
  }
  return res.status(405).end();
}
