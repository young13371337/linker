import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Получить профиль пользователя, друзей, устройства
  if (req.method === "GET") {
    try {
      let userId = req.query.userId;
      let login = req.query.login;
      if (Array.isArray(userId)) userId = userId[0];
      if (Array.isArray(login)) login = login[0];
      let user;
      if (userId && typeof userId === "string") {
        user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            friends: true,
            sessions: true,
          },
        });
      } else if (login && typeof login === "string") {
        user = await prisma.user.findUnique({
          where: { login },
          include: {
            friends: true,
            sessions: true,
          },
        });
      } else {
        return res.status(400).json({ error: "userId or login required" });
      }
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
            // Статус всегда вычисляется только по сессиям
            status: (friend.sessions || []).some((s: any) => {
              if (!s.isActive) return false;
              const created = new Date(s.createdAt).getTime();
              const now = Date.now();
              return now - created < 2 * 60 * 1000; // 2 минуты
            }) ? 'online' : 'offline'
          } : null;
        })
      );
      // Получить входящие заявки (FriendRequest), показать login, role, isOnline
      const incomingRequests = await prisma.friendRequest.findMany({ where: { toId: user?.id } });
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
      if (!user) return res.status(404).json({ error: "User not found" });
      // Normalize main user: include status field if available, otherwise compute from sessions
      // Статус всегда вычисляется только по сессиям
      // Если статус явно установлен (например, 'dnd'), используем его, иначе вычисляем по сессиям
      const mainStatus = (user as any).status && ['dnd'].includes((user as any).status)
        ? (user as any).status
        : (user.sessions || []).some((s: any) => {
            if (!s.isActive) return false;
            const created = new Date(s.createdAt).getTime();
            const now = Date.now();
            return now - created < 2 * 60 * 1000;
          }) ? 'online' : 'offline';
      return res.status(200).json({ user: {
        ...(user as any),
        status: mainStatus,
        backgroundUrl: user.backgroundUrl || null,
        friends: friendsFull.filter(Boolean),
        friendRequests: friendRequests.filter(Boolean)
      }});
    } catch (e: any) {
      return res.status(500).json({ error: e.message || "Internal server error" });
    }
  }
  // Ошибочный дублирующийся код удалён. Всё внутри handler.
  // Обновить профиль (описание, аватар)
  if (req.method === "POST") {
  const { userId, description, avatar, twoFactorToken, password, backgroundUrl, bgOpacity, favoriteTrackUrl, login: newLogin } = req.body;
    if (!userId) return res.status(400).json({ error: "userId required" });
    try {
      const data: any = {};
      if (typeof description !== "undefined") data.description = description;
      if (typeof avatar === "string") data.avatar = avatar;
  // ...удалено: обработка twoFactorToken...
  if (typeof backgroundUrl === "string" || backgroundUrl === null) data.backgroundUrl = backgroundUrl;
  if (typeof bgOpacity === "number") data.bgOpacity = bgOpacity;
      if (typeof favoriteTrackUrl === "string" || favoriteTrackUrl === null) data.favoriteTrackUrl = favoriteTrackUrl;
      if (typeof password === "string" && password.length > 0) {
        const { forbiddenPasswords } = require('../../lib/forbidden-passwords');
        if (forbiddenPasswords.includes(password)) {
          return res.status(400).json({ error: "Слишком простой пароль", code: "FORBIDDEN_PASSWORD" });
        }
        const bcrypt = require('bcryptjs');
        data.password = await bcrypt.hash(password, 8);
      }
      if (typeof newLogin === "string" && newLogin.length > 0) {
        // Проверка, занят ли логин
        const existing = await prisma.user.findUnique({ where: { login: newLogin } });
        if (existing) {
          return res.status(409).json({ error: "Login is already taken" });
        }
        data.login = newLogin;
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
