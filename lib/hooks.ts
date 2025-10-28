import type { SWRConfiguration } from 'swr';

export const fetcher = (input: RequestInfo, init?: RequestInit) =>
  fetch(input, { credentials: 'include', ...(init || {}) }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err: any = new Error('Request failed');
      err.status = res.status;
      err.body = text;
      throw err;
    }
    return res.json().catch(() => null);
  });

export const swrConfig: Partial<SWRConfiguration> = {
  fetcher,
  revalidateOnFocus: true,
  dedupingInterval: 2000,
  errorRetryCount: 1,
};

export const profileKey = (userId: string) => `/api/profile?userId=${userId}`;
export const chatsKey = `/api/chats`;
export const messagesKey = (chatId: string) => `/api/messages?chatId=${chatId}`;

export default {};
