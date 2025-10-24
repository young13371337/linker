import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { userId, sessionId } = req.body;
  if (!userId || !sessionId) return res.status(400).json({ error: "userId and sessionId required" });
  // Завершаем сессию (любую, даже текущую)
  await prisma.session.update({
    where: { id: sessionId },
    data: { isActive: false }
  });
  return res.status(200).json({ ok: true });
}
