import type { NextApiRequest, NextApiResponse } from "next";
import { registerUser } from "../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { login, password } = req.body;
  if (!login || !password) return res.status(400).json({ error: "Login and password required" });
  try {
    const user = await registerUser(login, password);
    return res.status(201).json({ user });
  } catch (e: any) {
    console.error("/api/auth/register error:", e);
    // If we know it's a conflict
    if (e.message && e.message.includes("exists")) return res.status(409).json({ error: e.message });
    return res.status(500).json({ error: "Internal server error" });
  }
}
