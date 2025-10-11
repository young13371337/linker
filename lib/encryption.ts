import crypto from 'crypto';

const ALGORITHM = 'aes-256-ctr';
const IV_LENGTH = 16;

function getChatKey(chatId: string): Buffer {
    // Генерируем 32-байтовый ключ из chatId через SHA-256
    return crypto.createHash('sha256').update(chatId).digest();
}

export function encryptMessage(message: string, chatId: string): string {
    const key = getChatKey(chatId);
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(message, 'utf8'), cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptMessage(encryptedMessage: string, chatId: string): string {
    try {
        const key = getChatKey(chatId);
        const [ivHex, encryptedHex] = encryptedMessage.split(':');
        if (!ivHex || !encryptedHex) throw new Error('Invalid encrypted message format');
        const iv = Buffer.from(ivHex, 'hex');
        const encryptedText = Buffer.from(encryptedHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
        return decrypted.toString('utf8');
    } catch (e) {
        return '[Ошибка шифрования]';
    }
}
