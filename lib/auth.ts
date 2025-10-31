import bcrypt from "bcryptjs";
import prisma from "./prisma";
import { forbiddenPasswords } from "./forbidden-passwords";

export async function registerUser(login: string, password: string, link?: string) {
  if (!login || !password) throw new Error("Login and password required");
  // link is required during registration in this implementation
  if (!link || typeof link !== 'string') throw new Error('Link required');
  // validate link format: only letters, numbers and underscore, 3..32 chars
  const re = /^[A-Za-z0-9_]{3,32}$/;
  if (!re.test(link)) throw new Error('Invalid link format');
  const existing = await prisma.user.findFirst({ where: { OR: [{ login }, { link }] } });
  if (existing) {
    if (existing.login === login) throw new Error("Логин уже занят");
    throw new Error('Линк уже занят');
  }
  if (forbiddenPasswords.includes(password)) {
    const err: any = new Error("Слишком простой пароль");
    err.code = "FORBIDDEN_PASSWORD";
    throw err;
  }
  const hash = await bcrypt.hash(password, 8); // ускоряем регистрацию
  // Если не указана аватарка, используем ссылку на SVG
  const defaultAvatarUrl = "https://resizer.mail.ru/p/2d3243c9-28a9-527c-acc4-3e7f19f4b8c6/AQAKlMFyyuDhk7ef5glIS3uLbMVw_UxiuoLDmcZmuZGDHmp4Ax7kyc2wMR_VHeCajjlDkRn4mE6Sr1xoII-N8OtKMfE.jpg";
  const user = await prisma.user.create({ data: { login, password: hash, avatar: defaultAvatarUrl, link } });
  return { id: user.id, login: user.login, avatar: user.avatar, link: user.link };
}
