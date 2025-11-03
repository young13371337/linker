import type { NextApiRequest, NextApiResponse } from "next";
import { registerUser } from "../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { login, password, link } = req.body;
  if (!login || !password || !link) return res.status(400).json({ error: "Login, password and link required" });
  try {
    // reCAPTCHA removed — proceed with registration normally
    const user = await registerUser(login, password, link);
    return res.status(201).json({ user });
  } catch (e: any) {
    console.error("/api/auth/register error:", e);
    if (e.message && e.message.includes("exists")) return res.status(409).json({ error: e.message });
    if (e.message && e.message.includes("Слишком простой пароль")) return res.status(400).json({ error: e.message, code: "FORBIDDEN_PASSWORD" });
    return res.status(500).json({ error: "Internal server error" });
  }
}
