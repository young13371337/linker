import type { NextApiRequest, NextApiResponse } from "next";
import { registerUser } from "../../../lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { login, password, link } = req.body;
  if (!login || !password || !link) return res.status(400).json({ error: "Login, password and link required" });
  try {
    // Require a reCAPTCHA token in the request body.
    // If a server secret is configured (`RECAPTCHA_SECRET`) we'll also verify it with Google.
    const token = (req.body && req.body.recaptchaToken) || null;
    if (!token) {
      return res.status(400).json({ error: 'reCAPTCHA token required' });
    }

    const recaptchaSecret = process.env.RECAPTCHA_SECRET || null;
    if (recaptchaSecret) {
      try {
        const params = new URLSearchParams();
        params.append('secret', recaptchaSecret);
        params.append('response', token as string);
        // optional: remoteip
        const v = await fetch('https://www.google.com/recaptcha/api/siteverify', { method: 'POST', body: params });
        const j = await v.json();
        if (!j || !j.success) {
          console.warn('reCAPTCHA verification failed', j);
          return res.status(403).json({ error: 'reCAPTCHA verification failed' });
        }
      } catch (recErr) {
        console.error('reCAPTCHA verify error', recErr);
        return res.status(500).json({ error: 'reCAPTCHA verification error' });
      }
    }
    const user = await registerUser(login, password, link);
    return res.status(201).json({ user });
  } catch (e: any) {
    console.error("/api/auth/register error:", e);
    if (e.message && e.message.includes("exists")) return res.status(409).json({ error: e.message });
    if (e.message && e.message.includes("Слишком простой пароль")) return res.status(400).json({ error: e.message, code: "FORBIDDEN_PASSWORD" });
    return res.status(500).json({ error: "Internal server error" });
  }
}
