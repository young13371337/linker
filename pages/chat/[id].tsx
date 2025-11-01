import Pusher from 'pusher-js';
import { getPusherClient } from '../../lib/pusher';

// Use shared pusher client helper (returns null on server)
const pusherClient = typeof window !== 'undefined' ? getPusherClient() : null;
import React, { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { FaPaperPlane } from 'react-icons/fa';
import { useRouter } from 'next/router';
import UserStatus, { statusLabels } from '../../components/UserStatus';
import { useSession } from 'next-auth/react';

// Инициализация Pusher
const VoiceMessage: React.FC<{ audioUrl: string; isOwn?: boolean }> = ({ audioUrl, isOwn }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [current, setCurrent] = useState<number>(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => setDuration(audio.duration || 0);
    const onTime = () => setCurrent(audio.currentTime || 0);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
    };
  }, []);

  const playAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play();
    setPlaying(true);
    audio.onended = () => setPlaying(false);
  };

  const pauseAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: isOwn ? 'linear-gradient(90deg,#229ed9 60%,#1e2a3a 100%)' : 'linear-gradient(90deg,#222 60%,#23243a 100%)',
      borderRadius: 16, padding: '8px 18px', boxShadow: '0 2px 8px #2222', minWidth: 120, maxWidth: 320
    }}>
      {!playing ? (
        <button
          onClick={playAudio}
          style={{
            width: 36, height: 36, borderRadius: '50%', background: '#fff',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px #229ed933', cursor: 'pointer', transition: 'background .2s', marginRight: 2
          }}
          aria-label="Воспроизвести"
        >
          <svg width={22} height={22} viewBox="0 0 24 24"><polygon points="6,4 20,12 6,20" fill="#229ed9"/></svg>
        </button>
      ) : (
        <button
          onClick={pauseAudio}
          style={{
            width: 36, height: 36, borderRadius: '50%', background: '#229ed9',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px #229ed933', cursor: 'pointer', transition: 'background .2s', marginRight: 2
          }}
          aria-label="Пауза"
        >
          <svg width={22} height={22} viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" fill="#fff"/><rect x="14" y="5" width="4" height="14" fill="#fff"/></svg>
        </button>
      )}
      <audio ref={audioRef} src={audioUrl.startsWith('/') ? audioUrl : '/' + audioUrl} style={{ display: 'none' }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 4, background: '#229ed9', borderRadius: 2, position: 'relative', marginBottom: 4 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: 4, borderRadius: 2, background: '#fff', width: duration ? `${(current/duration)*100}%` : '0%' }} />
        </div>
        <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{formatTime(current)} / {formatTime(duration)}</div>
      </div>
      {/* Индикатор звука удалён по запросу */}
    </div>
  );
};

interface Message {
  id: string;
  sender: string;
  text: string;
  createdAt: string;
  audioUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  _key?: string;
  // internal flags used by UI (optional)
  _serverId?: string;
  _persisted?: boolean;
  _failed?: boolean;
}

const ChatWithFriend: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  
  const [messages, setMessages] = useState<Message[]>([]);
  // Исправить тип friend, чтобы поддерживать login, name, avatar, role
  const [friend, setFriend] = useState<{id: string, login?: string, name?: string, link?: string, avatar?: string | null, role?: string, status?: string} | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  // Chat background URL (local per-chat, stored in localStorage like Telegram)
  const [chatBgUrl, setChatBgUrl] = useState<string | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [viewers, setViewers] = useState<Set<string>>(new Set());
  const [openActionMsgId, setOpenActionMsgId] = useState<string | null>(null);
  const lastTapRef = useRef<number | null>(null);
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [videoRecorder, setVideoRecorder] = useState<MediaRecorder | null>(null);
  const [videoChunks, setVideoChunks] = useState<Blob[]>([]);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoRecording, setVideoRecording] = useState(false);
  const [videoTime, setVideoTime] = useState(0);
  const videoTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (videoTime > 60 && videoRecorder && videoRecording) {
      stopVideoRecording();
    }
  }, [videoTime]);

  // --- Добавить недостающие переменные и хуки ---
  const [userId, setUserId] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [animatedMsgIds, setAnimatedMsgIds] = useState<Set<string>>(new Set());
  const [recordTime, setRecordTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordInterval = useRef<NodeJS.Timeout | null>(null);

  // Typing event throttling: send only once per typing session.
  const typingSentRef = useRef(false);
  const typingInactivityTimer = useRef<number | null>(null);

  const stopTyping = () => {
    try {
      if (!chatId) return;
      // send optional stop event; server may ignore unknown fields but it's harmless
      fetch('/api/messages/typing', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, action: 'stop' }),
      }).catch(() => {});
    } finally {
      typingSentRef.current = false;
      if (typingInactivityTimer.current) {
        clearTimeout(typingInactivityTimer.current as unknown as number);
        typingInactivityTimer.current = null;
      }
    }
  };

  const maybeStartTyping = (text: string) => {
    // If input is empty, ensure we send stop and clear state
    if (!text || text.trim() === '') {
      stopTyping();
      return;
    }
    // If we've already sent typing, just reset inactivity timer
    if (typingSentRef.current) {
      if (typingInactivityTimer.current) clearTimeout(typingInactivityTimer.current as unknown as number);
      typingInactivityTimer.current = window.setTimeout(() => {
        stopTyping();
      }, 6000);
      return;
    }

    // Send typing start event once
    try {
      fetch('/api/messages/typing', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, action: 'start' }),
      }).catch(() => {});
    } finally {
      typingSentRef.current = true;
      if (typingInactivityTimer.current) clearTimeout(typingInactivityTimer.current as unknown as number);
      typingInactivityTimer.current = window.setTimeout(() => {
        stopTyping();
      }, 6000);
    }
  };

  // cancelRecording функция-заглушка (реализуй по необходимости)
  const cancelRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.onstop = null;
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      setIsRecording(false);
      setRecordTime(0);
      audioChunksRef.current = [];
      if (recordInterval.current) clearInterval(recordInterval.current);
    }
  };

  // Закрываем меню действий при клике вне
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!openActionMsgId) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      // если клик внутри контейнера действия — не закрываем
      if (target.closest(`[data-action-container="${openActionMsgId}"]`)) return;
      setOpenActionMsgId(null);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [openActionMsgId]);

  const TypingIndicator = ({ name }: { name?: string }) => (
    <div style={{
      fontSize: 13,
      color: '#888',
      padding: 0,
      marginTop: 2,
      marginBottom: 0,
      lineHeight: '1.1'
    }}>
      печатает...
    </div>
  );

  // --- Для видеокружков: объявить функции, если их нет ---
  // Остановить запись видео
  const stopVideoRecording = () => {
    if (videoRecorder && videoRecording) {
      videoRecorder.stop();
      setVideoRecording(false);
      if (videoTimer.current) clearInterval(videoTimer.current);
    }
  };

  // NOTE: single Pusher subscription is handled below (avoid double subscriptions)

  // Отправка события "печатает"
  const sendTypingEvent = () => {
    if (!chatId) return;
    fetch('/api/messages/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId })
    });
  };

  // При открытии превью — запросить камеру и начать live preview
  useEffect(() => {
    if (showVideoPreview && !videoStream && !videoBlob) {
      (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 320, height: 320 }, audio: true });
          setVideoStream(stream);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          // Автоматически начать запись
          let mimeType = 'video/webm';
          if (!window.MediaRecorder.isTypeSupported(mimeType)) mimeType = '';
          const recorder = mimeType ? new window.MediaRecorder(stream, { mimeType }) : new window.MediaRecorder(stream);
          setVideoRecorder(recorder);
          setVideoChunks([]);
          setVideoRecording(true);
          setVideoTime(0);
          if (videoTimer.current) clearInterval(videoTimer.current);
          videoTimer.current = setInterval(() => setVideoTime(t => t + 1), 1000);
          let chunks: Blob[] = [];
          recorder.ondataavailable = (e) => {
            chunks.push(e.data);
          };
          recorder.onstop = async () => {
            if (videoTimer.current) clearInterval(videoTimer.current);
            setVideoRecording(false);
            setVideoTime(0);
            // (Проверка минимальной длительности видео отключена)
            const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
            // Optimistic UI: show temp message while uploading
            const tempId = 'temp-video-' + Date.now();
            const tempMsg: Message = {
              id: tempId,
              sender: (session?.user as any)?.id || '',
              text: '',
              createdAt: new Date().toISOString(),
              audioUrl: undefined,
              videoUrl: undefined,
              _key: tempId,
              _persisted: false,
              _failed: false,
            };
            setMessages(prev => [...prev, tempMsg]);
            // Сразу отправляем кружок
            if (chatId && session) {
              const formData = new FormData();
              formData.append('chatId', chatId);
              formData.append('video', blob, 'circle.webm');
              try {
                const res = await fetch('/api/messages/video-upload', {
                  method: 'POST',
                  credentials: 'include',
                  body: formData,
                });
                if (!res.ok) {
                  const txt = await res.text();
                  setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _failed: true } : m));
                  alert('Ошибка отправки видео: ' + txt);
                } else {
                  const data = await res.json();
                  if (data.videoUrl && data.message && data.message.id) {
                    // replace temp message
                    setMessages(prev => prev.map(m => m.id === tempId ? {
                      ...m,
                      id: data.message.id,
                      createdAt: data.message.createdAt || m.createdAt,
                      videoUrl: data.videoUrl,
                      _persisted: data.persisted !== false,
                    } : m));
                  }
                }
              } catch (err) {
                setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _failed: true } : m));
                alert('Ошибка отправки видео: ' + err);
              }
            }
            setShowVideoPreview(false);
            setVideoBlob(null);
            setVideoChunks([]);
            if (videoRef.current) {
              videoRef.current.srcObject = null;
              videoRef.current.src = '';
            }
            if (stream) {
              stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
            }
            setVideoStream(null);
          };
          recorder.start();
        } catch (err) {
          alert('Не удалось получить доступ к камере: ' + err);
          setShowVideoPreview(false);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showVideoPreview]);
  // Отправить видео (реализовать позже)
  const sendVideo = () => {
    // TODO: реализовать отправку видео
    setShowVideoPreview(false);
    setVideoBlob(null);
    setVideoChunks([]);
    setVideoTime(0);
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
  };
  // Отмена кружка
  const cancelVideo = () => {
    setShowVideoPreview(false);
    setVideoBlob(null);
    setVideoChunks([]);
    setVideoTime(0);
    setVideoRecording(false);
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
      setVideoStream(null);
    }
    if (videoRecorder) {
      videoRecorder.ondataavailable = null;
      videoRecorder.onstop = null;
      setVideoRecorder(null);
    }
  };

  useEffect(() => {
    if (!session || !id || Array.isArray(id)) return;
    setUserId((session.user as any).id);
    // Получить друга по ID
    fetch(`/api/profile?userId=${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setFriend(data.user);
        }
      });
    // --- Получить или создать чат между двумя пользователями ---
    fetch(`/api/chats?userIds=${(session.user as any).id},${id}`)
      .then(res => res.json())
      .then(data => {
                if (data && data.chat && data.chat.id) {
          setChatId(data.chat.id);
            // load per-chat background URL from localStorage
            try {
              const key = `chat-bg-${data.chat.id}`;
              const stored = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
              if (stored) setChatBgUrl(stored);
            } catch (e) {
              console.warn('[CHAT BG] failed to read localStorage', e);
            }
          // Получить сообщения
          fetch(`/api/messages?chatId=${data.chat.id}`, { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
              if (Array.isArray(data.messages)) {
                        const msgs = data.messages.map((msg: any) => ({
                          id: msg.id,
                          sender: msg.senderId,
                          text: msg.text,
                          createdAt: msg.createdAt,
                          audioUrl: msg.audioUrl || undefined,
                          videoUrl: msg.videoUrl || undefined,
                          thumbnailUrl: msg.thumbnailUrl || undefined,
                        }));
                setMessages(msgs);
                // Прокручиваем в конец после загрузки сообщений
                setTimeout(() => {
                  if (chatScrollRef.current) {
                    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
                  }
                }, 100);
                try {
                  localStorage.setItem('chat-messages', JSON.stringify(msgs));
                } catch {}
              } else {
                setMessages([]);
                try { localStorage.removeItem('chat-messages'); } catch {}
              }
            });
        } else {
          setChatId(null);
          setMessages([]);
          try { localStorage.removeItem('chat-messages'); } catch {}
        }
      });
  }, [session, id]);

  // Копирование текста в буфер и удаление — вынесенные хелперы
  const handleCopy = async (text: string | undefined) => {
    try {
      if (!text) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      // небольшая обратная связь
      try { /* non-blocking */ (window as any).toast && (window as any).toast('Скопировано'); } catch {}
    } catch (err) {
      console.error('Copy failed', err);
    } finally {
      setOpenActionMsgId(null);
    }
  };

  // Accept the whole message object so we can handle both persisted and temp-uploaded messages.
  const handleDeleteMessage = async (msg: Message) => {
    // Optimistic removal: remove from UI immediately, try to delete on server.
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    setOpenActionMsgId(null);
    try {
      // If this is a temporary message (upload succeeded but DB create failed), the id may start with 'temp-'
      // In that case, try to delete the uploaded file directly on the server.
      if (typeof msg.id === 'string' && msg.id.startsWith('temp-')) {
        const mediaUrl = msg.videoUrl || msg.audioUrl;
        if (mediaUrl) {
          const endpoint = '/api/messages/media-delete';
          console.log('[CHAT] Deleting temp message media:', mediaUrl, '->', endpoint);
          const res = await fetch(endpoint, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: mediaUrl }),
          });
          console.log('[CHAT] Media-delete response:', res.status, res.statusText);
          if (res.ok) {
            try { (window as any).toast && (window as any).toast('Сообщение и файл удалены'); } catch {}
            return;
          }
          const txt = await res.text().catch(() => '');
          try { (window as any).toast && (window as any).toast('Не удалось удалить файл на сервере'); } catch {}
          console.warn('[CHAT] media-delete failed:', res.status, txt);
          return;
        } else {
          // No uploaded media associated; nothing server-side to delete.
          try { (window as any).toast && (window as any).toast('Сообщение удалено'); } catch {}
          return;
        }
      }

      // Normal persisted message: call the main messages DELETE endpoint
      const endpoint = `/api/messages/${msg.id}`;
      console.log('[CHAT] Deleting message:', msg.id, '->', endpoint);
      const res = await fetch(endpoint, { method: 'DELETE', credentials: 'include' });
      console.log('[CHAT] Delete response:', res.status, res.statusText);
      if (res.ok) {
        try { (window as any).toast && (window as any).toast('Сообщение удалено'); } catch {}
        return;
      }
      // If server responded but not OK, show non-blocking error toast
      const errorText = await res.text().catch(() => '');
      let errorMessage = 'Не удалось удалить сообщение';
      try {
        const errData = JSON.parse(errorText || '{}');
        if (errData && errData.error) errorMessage = errData.error;
      } catch {}
      try { (window as any).toast && (window as any).toast(errorMessage); } catch {}
    } catch (err) {
      console.error('Error deleting message:', err);
      try { (window as any).toast && (window as any).toast('Ошибка при удалении сообщения'); } catch {}
    }
  };

  // Подписка на Pusher для получения изменений статуса пользователя и сообщений
  useEffect(() => {
    if (!friend || !friend.id || !chatId) return;
    try {
      // use the shared pusherClient instance (initialized once at module top)
      
      // Подписка на канал пользователя для статуса
      const userChannel = pusherClient.subscribe(`user-${friend.id}`);
      // Подписка на channel чата для новых сообщений
      const chatChannel = pusherClient.subscribe(`chat-${chatId}`);

      const onStatus = (payload: any) => {
        if (!payload || !payload.userId) return;
        setFriend(prev => prev && prev.id === payload.userId ? { ...prev, status: payload.status } : prev);
      };
      const onNewMessage = (data: any) => {
        // Поддерживаем оба формата: { message: {...} } и прямой объект
        const payload = data?.message ? data.message : data;
        if (!payload || !payload.id) return;

        // message may arrive without plaintext (server no longer broadcasts plaintext).
        const newMsg = {
          id: payload.id,
          sender: payload.sender || payload.senderId,
          text: payload.text || '', // might be empty if server didn't include plaintext
          createdAt: payload.createdAt || new Date().toISOString(),
          audioUrl: payload.audioUrl,
          videoUrl: payload.videoUrl
        };

        setMessages(prev => {
          // Если сообщение с таким id уже есть — игнорируем (дедупликация)
          if (prev.some(m => m.id === newMsg.id)) return prev;

          // Если есть временное сообщение (temp-...) с тем же текстом и отправителем — заменим его,
          // но сохраним внутренний _key, чтобы React не ремонтировал DOM элемент (избегаем дергания).
          // Try to match an optimistic temporary message (id starts with 'temp-') and replace it.
          // Primary match: same sender and identical text. Secondary match: when server didn't include text
          // (payload.text is empty), match by sender and by close createdAt timestamps (within 15s).
          const tempIndex = prev.findIndex(m => {
            if (typeof m.id !== 'string' || !m.id.startsWith('temp-')) return false;
            if (m.sender !== newMsg.sender) return false;
            // exact text match
            if (m.text && newMsg.text && m.text === newMsg.text) return true;
            // if server didn't send text, try matching by timestamp proximity
            if (!newMsg.text) {
              try {
                const a = new Date(m.createdAt).getTime();
                const b = new Date(newMsg.createdAt).getTime();
                if (isNaN(a) || isNaN(b)) return false;
                return Math.abs(a - b) < 15000; // 15 seconds
              } catch (e) {
                return false;
              }
            }
            return false;
          });
          if (tempIndex !== -1) {
            const copy = prev.slice();
            const existing = copy[tempIndex];
            copy[tempIndex] = {
              ...existing,
              id: newMsg.id,
              text: newMsg.text,
              createdAt: newMsg.createdAt,
              audioUrl: newMsg.audioUrl,
              videoUrl: newMsg.videoUrl,
            };
            return copy;
          }

          // Иначе добавляем в конец — добавляем _key равный id, и запускаем анимацию для этого нового сообщения
          const toAdd = { ...newMsg, _key: newMsg.id };
          // помечаем для анимации
          setAnimatedMsgIds(prevAnim => new Set([...prevAnim, newMsg.id]));
          return [...prev, toAdd];
        });

        // Если payload не содержит текста — запросим расшифровку конкретного сообщения по id
        if (!payload.text) {
          (async () => {
            try {
              const r = await fetch('/api/messages/read', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId: payload.id })
              });
              if (r.ok) {
                const d = await r.json();
                if (d && typeof d.text === 'string') {
                  setMessages(prev => prev.map(m => m.id === payload.id ? { ...m, text: d.text } : m));
                }
              }
            } catch (e) {
              // non-blocking
              console.error('[CHAT] Failed to fetch decrypted message', e);
            }
          })();
        }

        // Автоматически прокручиваем к новому сообщению
        setTimeout(scrollToBottom, 50);
      };
      // mark-read/unread handlers removed (feature disabled)
      // Обработка события "печатает"
      const onTyping = (data: { userId: string, name: string }) => {
        try {
          if (!data || !data.userId) return;
          if (data.userId === (session?.user as any)?.id) return; // не показываем себе
          setIsTyping(data.name || 'Пользователь');
          // Сбрасываем через 3 секунды
          setTimeout(() => setIsTyping(null), 3000);
        } catch (e) {
          console.error('Error handling typing event:', e);
        }
      };
    chatChannel.bind('new-message', onNewMessage);
    chatChannel.bind('typing', onTyping);
      const onViewer = (data: any) => {
        try {
          if (!data || !data.userId) return;
          setViewers(prev => {
            const next = new Set(prev);
            if (data.action === 'enter') next.add(data.userId);
            else if (data.action === 'leave') next.delete(data.userId);
            return next;
          });
        } catch (e) {
          console.error('[PUSHER] viewer-state handler error', e);
        }
      };
      chatChannel.bind('viewer-state', onViewer);

      // cleanup
      return () => {
        try {
          try { stopTyping(); } catch (e) {}
          try { userChannel.unbind('status-changed', onStatus); } catch (e) {}
          try { chatChannel.unbind('new-message', onNewMessage); } catch (e) {}
          try { chatChannel.unbind('typing', onTyping); } catch (e) {}
          try { chatChannel.unbind('viewer-state', onViewer); } catch (e) {}
          try { pusherClient.unsubscribe(`user-${friend.id}`); } catch (e) {}
          try { pusherClient.unsubscribe(`chat-${chatId}`); } catch (e) {}
        } catch (e) {}
      };
    } catch (e) {
      // ignore pusher errors on client
    }
  }, [friend?.id, chatId]);

  useEffect(() => {
    if (session) {
      console.log('session:', session);
    }
  }, [session]);

  // Функция для автопрокрутки вниз
  const scrollToBottom = (smooth = true) => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTo({
        top: chatScrollRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId || !session) return;
    
    // Создаем временный ID для сообщения
    const tempId = 'temp-' + Date.now();
    const messageText = newMessage.trim();
    
    // Немедленно добавляем сообщение в UI
    const tempMessage = {
      id: tempId,
      _key: tempId,
      sender: (session.user as any)?.id,
      text: messageText,
      createdAt: new Date().toISOString(),
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage(''); // Очищаем поле ввода сразу
    
    // Устанавливаем анимацию для нового сообщения
    setAnimatedMsgIds(prev => {
      const next = new Set(prev);
      next.add(tempId);
      return next;
    });

    // Прокручиваем чат вниз
    setTimeout(scrollToBottom, 50);
    
    // Отправляем сообщение на сервер
    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ chatId, text: messageText })
    })
      .then(async res => {
        const txt = await res.text();
        let data: any = null;
        try {
          data = txt ? JSON.parse(txt) : {};
        } catch (e) {
          console.error('[SEND] Failed to parse response as JSON', txt, e);
          throw new Error('Invalid JSON from /api/messages');
        }
        return data;
      })
        .then((data) => {
        if (!data || !data.message) {
          console.error('[SEND] Unexpected response from /api/messages', data);
          // mark temp message as failed
          setMessages((prev: any[]) => prev.map((msg: any) => msg.id === tempId ? { ...msg, _failed: true } : msg));
          return;
        }
        const serverMsg = data.message;
        if (serverMsg.dbError || serverMsg.persisted === false) {
          console.error('[SEND] DB write failed for message', serverMsg.dbError || serverMsg);
          // mark temp message as failed visually
          setMessages((prev: any[]) => prev.map((msg: any) => msg.id === tempId ? { ...msg, _failed: true } : msg));
        }
  // If a server message with the same id already exists (arrived via pusher),
  // remove the temporary message instead of replacing it to avoid duplicates.
        setMessages((prev: any[]) => {
          try {
            if (prev.some((m: any) => m.id === serverMsg.id)) {
              // server message already present (pusher delivered it): remove temp
              return prev.filter((m: any) => m.id !== tempId);
            }
            // Otherwise replace the temp message with the server-provided message data,
            // preserving _key so the DOM node/key stays stable.
            return prev.map((msg: any) => msg.id === tempId ? {
              ...msg,
              id: serverMsg.id,
              sender: serverMsg.senderId || serverMsg.sender,
              text: serverMsg.text || messageText,
              createdAt: serverMsg.createdAt || new Date().toISOString(),
              videoUrl: serverMsg.videoUrl,
              audioUrl: serverMsg.audioUrl,
              _persisted: serverMsg.persisted !== false,
            } : msg);
          } catch (e) {
            console.error('[SEND] Error while merging server message', e);
            return prev;
          }
        });
        // we've sent the message — stop typing state
        try { stopTyping(); } catch (e) {}
      })
      .catch(err => {
        console.error('[SEND] Network or parse error sending message', err);
  setMessages((prev: any[]) => prev.map((msg: any) => msg.id === tempId ? { ...msg, _failed: true } : msg));
      });
  };

  // Показываем UI сразу, даже если данные ещё не загружены
  if (!session) {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'flex-start',justifyContent:'center',background:'#111'}}>
        <div style={{marginTop:80,color:'#bbb',fontSize:22,fontWeight:500}}>
        </div>
      </div>
    );
  }

  // Адаптивные стили для ПК и мобильных
  const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 600 : false;
  const chatContainerStyle = isMobile
    ? {
        width: '100%',
        maxWidth: '480px',
        minWidth: '0',
        height: '100vh',
        background: 'linear-gradient(120deg,#18191c 60%,#23242a 100%)',
        borderRadius: '0',
        boxShadow: '0 4px 32px #000c',
        margin: '0',
        display: 'flex',
        flexDirection: 'column' as const,
        padding: '12px 6px 8px 6px',
    position: 'relative' as const,
      }
    : {
        width: '100%',
        maxWidth: '480px',
        minWidth: '260px',
        height: '48vh',
        background: 'linear-gradient(120deg,#18191c 60%,#23242a 100%)',
        borderRadius: '18px',
        boxShadow: '0 4px 32px #000c',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column' as const,
        padding: '22px 18px 16px 18px',
        position: 'relative' as const,
      };
  // Apply chat background if provided (localStorage per-chat setting)
  const appliedChatContainerStyle = (() => {
    try {
      if (chatBgUrl) {
        return { ...chatContainerStyle, background: `linear-gradient(rgba(30,32,42,0.55),rgba(30,32,42,0.75)), url('${chatBgUrl}') center/cover no-repeat` };
      }
    } catch (e) {
      console.warn('[CHAT BG] failed to apply background', e);
    }
    return chatContainerStyle;
  })();
  // Default background to use when per-chat bg is not set
  const DEFAULT_CHAT_BG = 'https://cs13.pikabu.ru/post_img/2023/08/31/12/1693515176124117632.jpg';
  const avatarStyle = isMobile
    ? { width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' as const, background: '#222', boxShadow: '0 2px 8px #2226' }
    : { width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' as const, background: '#222', boxShadow: '0 2px 8px #2226' };
  const nameStyle = isMobile
    ? { fontWeight: 600, fontSize: '18px', color: '#e3e8f0', display: 'flex', alignItems: 'center', gap: '6px' }
    : { fontWeight: 600, fontSize: '17px', color: '#e3e8f0', display: 'flex', alignItems: 'center', gap: '6px' };
  const messageStyle = isMobile
  ? { background: '#229ed9', color: '#fff', padding: '10px 18px', borderRadius: '12px', display: 'inline-block', boxShadow: '0 2px 6px #2222', fontSize: '16px', maxWidth: '80vw', wordBreak: 'break-word' as const, position: 'relative' as 'relative' }
  : { background: '#229ed9', color: '#fff', padding: '7px 14px', borderRadius: '9px', display: 'inline-block', boxShadow: '0 2px 6px #2222', fontSize: '14px', position: 'relative' as 'relative' };
  const inputStyle = isMobile
    ? { flex: 1, padding: '14px 16px', borderRadius: '12px', border: 'none', background: '#18191c', color: '#fff', fontSize: '16px', boxShadow: '0 2px 6px #2222', outline: 'none', minWidth: '0' }
    : { flex: 1, padding: '9px 12px', borderRadius: '9px', border: 'none', background: '#18191c', color: '#fff', fontSize: '14px', boxShadow: '0 2px 6px #2222', outline: 'none' };
  const buttonStyle = isMobile
    ? { width: 44, height: 44, borderRadius: '50%', background: '#229ed9', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 2px 6px #229ed933', transition: 'background .2s', cursor: 'pointer' }
    : { width: 36, height: 36, borderRadius: '50%', background: '#229ed9', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 2px 6px #229ed933', transition: 'background .2s', cursor: 'pointer' };
  return (
    <>
      <Head>
        <style>{`
          .chat-messages-scroll {
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: rgba(180,216,255,0.35) rgba(34,34,34,0.1);
          }
          .chat-messages-scroll::-webkit-scrollbar {
            width: 8px;
            background: rgba(34,34,34,0.1);
          }
          .chat-messages-scroll::-webkit-scrollbar-thumb {
            background: linear-gradient(120deg,rgba(180,216,255,0.35),rgba(34,158,217,0.25));
            border-radius: 8px;
            opacity: 0.5;
            transition: opacity 0.2s;
          }
          .chat-messages-scroll:hover::-webkit-scrollbar-thumb {
            opacity: 0.8;
          }
          /* Анимация появления сообщения — мягкая и не дергающаяся.
             Предотвращаем резкий "подлет" при замене temp->server (см. onNewMessage ниже). */
          .chat-msg-appear {
            animation: chatMsgFadeIn 0.32s cubic-bezier(.2,.8,.2,1) both;
          }
          @keyframes chatMsgFadeIn {
            from {
              opacity: 0;
              /* лёгкое смещение вниз и чуть уменьшенный scale для более мягкого эффекта */
              transform: translateY(6px) scale(0.995);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          /* Action menu animation and styles */
          @keyframes actionPop {
            from { opacity: 0; transform: translateY(-6px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .action-menu {
            animation: actionPop 0.18s cubic-bezier(.2,.9,.2,1) both;
          }

  // Read/delivered feature removed — no client-side mark-read/mark-unread behavior
          .action-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: #e6eef8;
            background: transparent;
            border: none;
            cursor: pointer;
            padding: 6px 8px;
            border-radius: 8px;
            transition: background .12s, transform .12s;
            font-size: 13px;
          }
          .action-btn:hover { background: rgba(255,255,255,0.03); transform: translateY(-1px); }
          .action-btn.icon-only { gap: 0; padding: 6px; }
        `}</style>
      </Head>
      <div
        style={{
          minHeight: '100vh',
          background: '#111',
          color: '#e3e8f0',
          fontFamily: 'Segoe UI,Arial,sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
      >
  <div style={appliedChatContainerStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: isMobile ? 10 : 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
                <button
                  onClick={() => router.push('/chat')}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    marginRight: 6,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#bbb',
                    fontSize: isMobile ? 28 : 22,
                    transition: 'color 0.2s',
                  }}
                  title="Назад к чатам"
                  aria-label="Назад к чатам"
                  onMouseOver={e => (e.currentTarget.style.color = '#229ed9')}
                  onMouseOut={e => (e.currentTarget.style.color = '#bbb')}
                >
                  <svg width={isMobile ? 28 : 22} height={isMobile ? 28 : 22} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M15.5 19L9.5 12L15.5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {/* Center: name + status/typing */}
                <div style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={nameStyle}>{friend?.link ? `${friend.link}` : (friend?.name || friend?.login || <span style={{color:'#888'}}>Загрузка...</span>)}</span>
                    {/* role icons */}
                    {friend?.role === 'admin' && <img src="/role-icons/admin.svg" alt="admin" title="Админ" style={{ width: 16, height: 16, marginLeft: 2 }} />}
                    {friend?.role === 'moderator' && <img src="/role-icons/moderator.svg" alt="moderator" title="Модератор" style={{ width: 16, height: 16, marginLeft: 2 }} />}
                    {friend?.role === 'verif' && <img src="/role-icons/verif.svg" alt="verif" title="Верифицирован" style={{ width: 16, height: 16, marginLeft: 2 }} />}
                    {friend?.role === 'pepe' && <img src="/role-icons/pepe.svg" alt="pepe" title="Пепешка" style={{ width: 16, height: 16, marginLeft: 2 }} />}
                  </div>
                  <div style={{ fontSize: 12, color: '#9aa0a6', marginTop: 2, minHeight: 14, lineHeight: '1' }}>
                    {isTyping ? (
                      <span style={{ color: '#229ed9', fontSize: 12 }}>печатает...</span>
                    ) : (
                      friend?.status === 'dnd' ? <span style={{ fontSize: 12, color: '#9aa0a6' }}>не беспокоить</span> : (friend?.status === 'online' ? <span style={{ fontSize: 12, color: '#229ed9' }}>в сети</span> : <span style={{ fontSize: 12, color: '#9aa0a6' }}>не в сети</span>)
                    )}
                  </div>
                </div>

                {/* Avatar on the right (no status dot in chat header) */}
                <div style={{ marginLeft: 8 }}>
                  <img src={friend?.avatar || '/window.svg'} alt="avatar" style={avatarStyle} />
                </div>
              </div>
            </div>
        <div
            className="chat-messages-scroll"
            style={{
              flex: 1,
              borderRadius: 16,
              padding: '4px 0',
              // apply per-chat background (local) or default global background
              background: `linear-gradient(rgba(30,32,42,0.55),rgba(30,32,42,0.75)), url('${chatBgUrl || DEFAULT_CHAT_BG}') center/cover no-repeat`,
              marginBottom: isMobile ? 10 : 12,
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? 8 : 6,
              minHeight: 0,
              maxHeight: showVideoPreview
                ? (isMobile ? 'calc(100vh - 1px)' : '48vh')
                : (isMobile ? 'calc(100vh - 180px)' : '32vh'),
              overflowY: showVideoPreview ? 'hidden' : 'auto',
              overflowX: 'hidden', // <-- добавлено, чтобы убрать горизонтальный скролл
              boxShadow: '0 2px 16px #0002',
            }}
            ref={chatScrollRef}
        >
          {messages.length === 0 ? (
            <div style={{ color: '#bbb', fontSize: 16, textAlign: 'center', marginTop: 32 }}><i>Нет сообщений</i></div>
          ) : (
            (() => {
              // Группировка сообщений по дням
              const groups: { label: string; date: string; items: Message[] }[] = [];
              const today = new Date();
              const yesterday = new Date();
              yesterday.setDate(today.getDate() - 1);
              const dayBeforeYesterday = new Date();
              dayBeforeYesterday.setDate(today.getDate() - 2);
              function getDayLabel(dateStr: string) {
                const date = new Date(dateStr);
                const d = date.getDate(), m = date.getMonth(), y = date.getFullYear();
                if (d === today.getDate() && m === today.getMonth() && y === today.getFullYear()) return 'Сегодня';
                if (d === yesterday.getDate() && m === yesterday.getMonth() && y === yesterday.getFullYear()) return 'Вчера';
                if (d === dayBeforeYesterday.getDate() && m === dayBeforeYesterday.getMonth() && y === dayBeforeYesterday.getFullYear()) return 'Позавчера';
                return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
              }
              let lastDate = '';
              messages.forEach(msg => {
                const date = new Date(msg.createdAt);
                const dateKey = date.toISOString().slice(0, 10);
                if (!groups.length || groups[groups.length - 1].date !== dateKey) {
                  groups.push({ label: getDayLabel(msg.createdAt), date: dateKey, items: [msg] });
                } else {
                  groups[groups.length - 1].items.push(msg);
                }
              });
              return groups.map(group => (
                <React.Fragment key={group.date}>
                  <div style={{ textAlign: 'center', color: '#bbb', fontWeight: 500, fontSize: 15, margin: '18px 0 8px 0', letterSpacing: 0.5 }}>
                    {group.label}
                  </div>
                  {group.items.map((msg) => {
                    const isOwn = msg.sender === (session?.user as any)?.id;
                    // --- callback ref для анимации только для новых сообщений ---
                    const getMsgRef = (el: HTMLDivElement | null) => {
                      if (el && animatedMsgIds.has(msg.id)) {
                        el.classList.add('chat-msg-appear');
                        setTimeout(() => {
                          el.classList.remove('chat-msg-appear');
                          setAnimatedMsgIds(prev => {
                            const next = new Set(prev);
                            next.delete(msg.id);
                            return next;
                          });
                        }, 400);
                      }
                    };
                    return (
                      <div
                        key={msg._key || msg.id}
                        ref={getMsgRef}
                        className={animatedMsgIds.has(msg.id) ? 'chat-msg-appear' : ''}
                        style={{
                          marginBottom: 0,
                          display: 'flex',
                          flexDirection: 'row',
                          justifyContent: isOwn ? 'flex-end' : 'flex-start',
                          width: '100%',
                          position: 'relative',
                          alignItems: 'center',
                        }}
                        onMouseEnter={() => setHoveredMsgId(msg.id)}
                        onMouseLeave={() => setHoveredMsgId(null)}
                      >
                        {/* Оборачиваем контент сообщения в контейнер с поддержкой клика (ПК) и долгого нажатия (моб)
                            Меню действий появляется для собственных сообщений (Copy / Delete). */}
                        <div
                          data-action-container={msg.id}
                          style={{ position: 'relative', display: 'inline-flex' }}
                        >
                          <div
                            onClick={(e) => {
                              // ПК: открываем/закрываем меню по двойному клику (double-tap)
                              try { e.stopPropagation(); } catch {}
                              if (isMobile) return;
                              const now = Date.now();
                              const last = lastTapRef.current;
                              const DOUBLE_TAP_MS = 350;
                              if (last && (now - last) <= DOUBLE_TAP_MS) {
                                // double click detected — toggle menu
                                setOpenActionMsgId(prev => prev === msg.id ? null : msg.id);
                                lastTapRef.current = null;
                              } else {
                                // record first click, wait for second
                                lastTapRef.current = now;
                                setTimeout(() => {
                                  if (lastTapRef.current === now) lastTapRef.current = null;
                                }, DOUBLE_TAP_MS + 50);
                              }
                            }}
                            onTouchEnd={(e) => {
                              // Моб: открываем меню по двойному тапу (2 клика)
                              if (!isMobile) return;
                              try { e.stopPropagation(); } catch {}
                              const now = Date.now();
                              const last = lastTapRef.current;
                              const DOUBLE_TAP_MS = 350;
                              if (last && (now - last) <= DOUBLE_TAP_MS) {
                                // double tap — toggle menu
                                setOpenActionMsgId(prev => prev === msg.id ? null : msg.id);
                                lastTapRef.current = null;
                              } else {
                                lastTapRef.current = now;
                              }
                            }}
                            style={{ display: 'inline-block' }}
                          >
                            {msg.videoUrl ? (
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: isOwn ? 'flex-end' : 'flex-start',
                                gap: 2,
                                margin: '2px 0',
                                marginLeft: 0,
                              }}>
                                <VideoCircle src={msg.videoUrl.startsWith('/') ? msg.videoUrl : '/' + msg.videoUrl} poster={msg.thumbnailUrl} />
                                <span style={{ fontSize: 13, color: '#bbb', marginTop: 2 }}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            ) : msg.audioUrl ? (
                              <VoiceMessage audioUrl={msg.audioUrl} isOwn={isOwn} />
                            ) : (
                              <span
                                data-msg-id={msg.id}
                                style={isOwn
                                  ? {
                                      ...messageStyle,
                                      display: 'inline-block',
                                      background: '#229ed9',
                                      color: '#fff',
                                      borderRadius: '16px',
                                      minWidth: 48,
                                      wordBreak: 'break-word',
                                      padding: '7px 14px',
                                      fontSize: '15px',
                                      boxShadow: '0 2px 6px #2222',
                                    }
                                  : { ...messageStyle, background: '#222', display: 'inline-block', wordBreak: 'break-word', borderRadius: '16px', fontSize: '15px', padding: '7px 14px' }}
                              >
                                <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                                  <span style={{}}>{msg.text}</span>
                                  {isOwn && (
                                    <>
                                      <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginLeft: 4, marginRight: 2, minWidth: 32, textAlign: 'right', letterSpacing: 0 }}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </>
                                  )}
                                </span>
                              </span>
                            )}

                            {/* Action menu: только для собственных сообщений */}
                            {isOwn && openActionMsgId === msg.id && (
                              <div
                                className="action-menu"
                                onClick={(e) => { e.stopPropagation(); }}
                                role="menu"
                                style={{
                                  position: 'absolute',
                                  top: isMobile ? -46 : -44,
                                  right: isOwn ? (isMobile ? 6 : 8) : 'auto',
                                  left: isOwn ? 'auto' : (isMobile ? 6 : 8),
                                  background: '#0f1113',
                                  border: '1px solid rgba(255,255,255,0.06)',
                                  padding: isMobile ? '6px 8px' : '8px 10px',
                                  borderRadius: isMobile ? 10 : 12,
                                  display: 'flex',
                                  gap: isMobile ? 8 : 12,
                                  alignItems: 'center',
                                  boxShadow: '0 10px 30px rgba(0,0,0,0.65)',
                                  zIndex: 110,
                                  transformOrigin: 'right top',
                                  minWidth: isMobile ? 120 : 160,
                                }}
                                data-action-container={msg.id}
                              >
                                <button
                                  onClick={(e) => { try { e.stopPropagation(); } catch {} handleCopy(msg.text); }}
                                  title="Копировать"
                                  aria-label="Копировать"
                                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                  style={{ background: 'transparent', border: 'none', padding: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#e6eef8', borderRadius: 8, transition: 'background .12s' }}
                                >
                                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ display: 'block', color: 'inherit' }}>
                                    <path d="M16 1H4a2 2 0 00-2 2v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                                    <rect x="8" y="5" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => { try { e.stopPropagation(); } catch {} handleDeleteMessage(msg); }}
                                  title="Удалить"
                                  aria-label="Удалить"
                                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                  style={{ background: 'transparent', border: 'none', padding: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#ff7b7b', borderRadius: 8, transition: 'background .12s' }}
                                >
                                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" style={{ display: 'block' }}>
                                    <path d="M9 3h6l1 2h4v2H4V5h4l1-2z" fill="none" stroke="#ff6b6b" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M10 11v6" stroke="#ff6b6b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                    <path d="M14 11v6" stroke="#ff6b6b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </React.Fragment>
              ));
            })()
          )}
          {/* typing indicator removed from messages area — moved to header */}
        </div>
        <form
          onSubmit={handleSendMessage}
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 0,
            paddingBottom: isMobile ? 8 : 0,
            alignItems: 'center',
          }}
        >
          {/* Кнопка скрепки слева */}
          <button
            type="button"
            style={{
              width: isMobile ? 44 : 36,
              height: isMobile ? 44 : 36,
              borderRadius: '50%',
              background: inputStyle.background,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 2,
              cursor: 'pointer',
              boxShadow: inputStyle.boxShadow,
              color: '#bbb',
              fontSize: isMobile ? 22 : 18,
              transition: 'background .2s',
            }}
            title="Отправить фото или файл"
            aria-label="Отправить фото или файл"
            onClick={() => {
              document.getElementById('file-input')?.click();
            }}
          >
            {/* SVG иконка скрепки */}
            <svg width={isMobile ? 22 : 18} height={isMobile ? 22 : 18} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.657 11.314l-6.364 6.364a4 4 0 01-5.657-5.657l9.192-9.192a3 3 0 114.243 4.243l-9.193 9.192a2 2 0 102.828 2.828l6.364-6.364" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {/* Центрированный кружок поверх чата с затемнением */}
          {showVideoPreview && (
            <div style={{
              position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 2000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(20,22,30,0.85)',
              animation: 'fadeInOverlay 0.25s',
            }}>
              <style>{`
                @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
                @keyframes popInCircle { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                .circle-anim { animation: popInCircle 0.32s cubic-bezier(.23,1.02,.36,1) both; }
                .circle-btn-anim { transition: background .18s, box-shadow .18s, transform .18s; }
                .circle-btn-anim:hover { transform: scale(1.08); box-shadow: 0 4px 16px #229ed9aa; }
                .circle-btn-cancel:hover { background: #b71c1c !important; }
              `}</style>
              {/* Кружок и кнопки */}
              <div style={{
                position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                <div style={{
                  position: 'absolute',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '20px'
                }}>
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="circle-anim"
                    style={{ width: 280, height: 280, borderRadius: '50%', background: '#111', objectFit: 'cover', border: '4px solid #229ed9', boxShadow: '0 4px 32px #000a' }}
                  />
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 18, textAlign: 'center', marginTop: 18, marginBottom: 10 }}>
                  {videoRecording ? ` ${videoTime}s` : 'Готово'}
                </div>
                <div style={{ display: 'flex', gap: 22, justifyContent: 'center', marginTop: 2 }}>
                  {videoRecording && (
                    <button onClick={stopVideoRecording} className="circle-btn-anim" style={{ background: '#229ed9', color: '#fff', border: 'none', borderRadius: '50%', width: 56, height: 56, fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px #229ed933', fontWeight: 700, transition: 'background .18s, box-shadow .18s, transform .18s' }} title="Остановить запись">
                      ■
                    </button>
                  )}
                  <button onClick={cancelVideo} className="circle-btn-anim circle-btn-cancel" style={{ background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '50%', width: 56, height: 56, fontSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 8px #d32f2f44', fontWeight: 700, transition: 'background .18s, box-shadow .18s, transform .18s' }} title="Отмена">
                    ×
                  </button>
                </div>
              </div>
            {/* Chat background button (right-aligned) */}
            <div style={{ marginLeft: 'auto' }}>
              <button
                onClick={() => {
                  try {
                    const key = `chat-bg-${chatId}`;
                    const current = chatBgUrl || '';
                    const url = prompt('Вставьте URL фонового изображения для этого чата (оставьте пустым для удаления):', current);
                    if (url === null) return; // cancelled
                    const trimmed = String(url || '').trim();
                    if (!trimmed) {
                      localStorage.removeItem(key);
                      setChatBgUrl(null);
                    } else {
                      localStorage.setItem(key, trimmed);
                      setChatBgUrl(trimmed);
                    }
                  } catch (e) {
                    console.error('[CHAT BG] set background error', e);
                    alert('Не удалось сохранить фон: ' + String(e));
                  }
                }}
                title="Установить фон чата"
                style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#e6e6e6', padding: '8px 10px', borderRadius: 10, cursor: 'pointer' }}
              >
                Фон
              </button>
            </div>
            </div>
          </div>
          )}
          {/* Скрытый input для выбора файла/медиа */}
          <input
            id="file-input"
            type="file"
            accept={isMobile ? 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt' : '*'}
            style={{ display: 'none' }}
            onChange={(e) => {
              // Пока что заглушка
              const file = e.target.files?.[0];
              if (file) {
                alert(`Выбран файл: ${file.name}`);
              }
            }}
          />
          {/* Always render the input and controls so the layout doesn't shift; the recording UI will overlay when active */}
          <>
            <input
              value={newMessage}
              onChange={(e) => {
                const v = e.target.value;
                setNewMessage(v);
                maybeStartTyping(v);
              }}
              placeholder="Сообщение..."
              style={inputStyle}
            />
            {/* Кнопка видеокружка рядом с микрофоном */}
            <button
              type="button"
              style={{
                width: isMobile ? 44 : 36,
                height: isMobile ? 44 : 36,
                borderRadius: '50%',
                background: inputStyle.background,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginLeft: 4,
                cursor: 'pointer',
                boxShadow: inputStyle.boxShadow,
                color: '#bbb',
                fontSize: isMobile ? 22 : 18,
                transition: 'background .2s',
              }}
              title="Видеокружок"
              aria-label="Видеокружок"
              onClick={() => {
                setShowVideoPreview(true);
              }}
            >
              {/* SVG иконка камеры */}
              <svg width={isMobile ? 22 : 18} height={isMobile ? 22 : 18} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2"/>
                <rect x="9" y="9" width="6" height="6" rx="3" fill="currentColor"/>
                <rect x="16" y="7" width="3" height="3" rx="1.5" fill="currentColor"/>
              </svg>
            </button>
            {newMessage.trim() ? (
              <button
                type="submit"
                style={{
                  ...buttonStyle,
                  padding: 0,
                  background: '#229ed9',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  width: isMobile ? 44 : 36,
                  height: isMobile ? 44 : 36,
                  boxShadow: 'none',
                  transition: 'background .18s, opacity .15s, transform .1s',
                  cursor: 'pointer',
                  opacity: 1,
                  transform: 'scale(1.05)',
                }}
                aria-label="Отправить"
                title="Отправить"
                onMouseOver={e => { e.currentTarget.style.background = '#23243a'; }}
                onMouseOut={e => { e.currentTarget.style.background = '#229ed9'; }}
              >
                <img src="/send.svg" alt="Отправить" style={{ width: isMobile ? 28 : 22, height: isMobile ? 28 : 22, display: 'block' }} />
              </button>
            ) : (
              <button
                type="button"
                style={{
                  ...buttonStyle,
                  padding: 0,
                  background: isRecording ? '#d32f2f' : '#444457',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  width: isMobile ? 44 : 36,
                  height: isMobile ? 44 : 36,
                  boxShadow: 'none',
                  transition: 'background .18s, opacity .15s, transform .1s',
                  cursor: 'pointer',
                  opacity: 0.85,
                  marginLeft: 4, // небольшой отступ между кружком и микрофоном
                }}
                aria-label="Голосовое сообщение"
                title="Голосовое сообщение"
                onClick={async () => {
                  if (!isRecording) {
                    // Начать запись
                    if (!navigator.mediaDevices) return;
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    // Используем audio/webm если поддерживается
                    let mimeType = 'audio/webm';
                    if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = '';
                    const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
                    setMediaRecorder(recorder);
                    audioChunksRef.current = [];
                    setIsRecording(true);
                    setRecordTime(0);
                    if (recordInterval.current) clearInterval(recordInterval.current);
                    recordInterval.current = setInterval(() => setRecordTime(t => t + 1), 1000);
                    recorder.ondataavailable = (e) => {
                      audioChunksRef.current.push(e.data);
                    };
                    recorder.onstop = async () => {
                      if (recordInterval.current) clearInterval(recordInterval.current);
                      setIsRecording(false);
                      setRecordTime(0);
                      const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
                      audioChunksRef.current = [];
                      // Optimistic UI: create a temporary message so user sees upload in progress
                      const tempId = 'temp-audio-' + Date.now();
                      const tempMsg: Message = {
                        id: tempId,
                        sender: (session?.user as any)?.id || '',
                        text: '',
                        createdAt: new Date().toISOString(),
                        audioUrl: undefined,
                        videoUrl: undefined,
                        _key: tempId,
                        _persisted: false,
                        _failed: false,
                      };
                      setMessages(prev => [...prev, tempMsg]);

                      const formData = new FormData();
                      formData.append('chatId', chatId || '');
                      formData.append('audio', audioBlob, 'voice.webm');
                      try {
                        const res = await fetch('/api/messages/voice-upload', {
                          method: 'POST',
                          credentials: 'include',
                          body: formData,
                        });
                        if (!res.ok) {
                          const txt = await res.text();
                          // mark temp message as failed
                          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _failed: true } : m));
                          alert('Ошибка отправки голосового: ' + txt);
                        } else {
                          const data = await res.json();
                          if (data && data.message && data.message.id) {
                            // replace temp message with server message
                            setMessages(prev => prev.map(m => m.id === tempId ? {
                              ...m,
                              id: data.message.id,
                              createdAt: data.message.createdAt || m.createdAt,
                              audioUrl: data.audioUrl,
                              _persisted: data.persisted !== false,
                            } : m));
                          } else {
                            // no message returned: mark failed
                            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _failed: true } : m));
                          }
                        }
                      } catch (err) {
                        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, _failed: true } : m));
                        alert('Ошибка отправки голосового: ' + err);
                      }
                    };
                    recorder.start();
                  } else {
                    // Остановить запись и отправить
                    if (mediaRecorder && isRecording) {
                      // Минимальная длительность
                      // (Проверка минимальной длительности аудио отключена)
                      mediaRecorder.stop();
                      mediaRecorder.stream.getTracks().forEach(track => track.stop());
                    }
                  }
                }}
              >
                <svg
                  width={isMobile ? 26 : 20}
                  height={isMobile ? 26 : 20}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  style={{ display: 'block' }}
                >
                  <path d="M12 17a4 4 0 004-4V7a4 4 0 10-8 0v6a4 4 0 004 4zm5-4a1 1 0 112 0 7 7 0 01-14 0 1 1 0 112 0 5 5 0 0010 0z" fill="#fff"/>
                </svg>
              </button>
            )}
          </>
        </form>
        {/* Overlay recording bar so it doesn't push the input */}
        {isRecording && (
          <div style={{
            position: 'absolute',
            left: isMobile ? 12 : 18,
            right: isMobile ? 12 : 18,
            bottom: isMobile ? 12 : 14,
            zIndex: 140,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              color: '#e6eef8',
              fontSize: isMobile ? 12 : 13,
              fontWeight: 600,
              background: '#1b1b1f',
              border: '1px solid rgba(255,255,255,0.03)',
              borderRadius: isMobile ? 8 : 10,
              padding: isMobile ? '5px 10px' : '6px 12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.7)',
              gap: isMobile ? 10 : 14,
              alignSelf: 'center',
            }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: isMobile ? 8 : 10 }}>
                <span style={{ width: isMobile ? 8 : 9, height: isMobile ? 8 : 9, borderRadius: '50%', background: '#d32f2f', boxShadow: '0 0 6px #d32f2f55' }} />
                <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#f0f3f8', fontSize: isMobile ? 12 : 13 }}>
                  {String(Math.floor(recordTime / 60)).padStart(2, '0')}:{String(recordTime % 60).padStart(2, '0')}
                </span>
              </div>
              <div>
                <button type="button" onClick={cancelRecording} style={{ background: 'transparent', border: 'none', color: '#b992ff', fontSize: isMobile ? 13 : 14, fontWeight: 700, cursor: 'pointer', padding: '2px 6px' }} aria-label="Отмена" title="Отмена">Отмена</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button type="button" title="Отправить голосовое сообщение" aria-label="Отправить голосовое сообщение" onClick={() => { if (mediaRecorder && isRecording) { mediaRecorder.stop(); mediaRecorder.stream.getTracks().forEach(track => track.stop()); } }} style={{ width: isMobile ? 38 : 42, height: isMobile ? 38 : 42, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)', padding: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(180deg,#7c3aed,#6d28d9)', boxShadow: '0 4px 10px rgba(109,40,217,0.14)', cursor: 'pointer', transform: 'translateZ(0)' }}>
                  <img src="/send.svg" alt="Отправить" style={{ width: isMobile ? 18 : 16, height: isMobile ? 18 : 16, display: 'block', filter: 'brightness(1.05) invert(0)' }} />
                </button>
              </div>
            </div>
          </div>
        )}
  {/* (удалено дублирующееся отображение индикатора записи) */}
      </div>
      {/* (модалка удалена, только inline превью) */}
      </div>
    </>
  );
};

// VideoCircle component with custom play/pause controls and progress overlay
const VideoCircle: React.FC<{ src: string; poster?: string }> = ({ src, poster }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };
    const onTimeUpdate = () => {
      if (video.duration) {
        setProgress(video.currentTime / video.duration);
      }
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('ended', onEnded);
    video.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('timeupdate', onTimeUpdate);
    };
  }, []);

  return (
    <div style={{ 
      position: 'relative',
      width: 120,
      height: 120,
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      transform: isPlaying ? 'scale(1.1)' : 'scale(0.95)',
      cursor: 'pointer'
    }}>
      <video 
        ref={videoRef}
        src={src} 
        poster={poster} 
        style={{ 
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          objectFit: 'cover'
        }}
      />
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: isPlaying ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.3)',
          borderRadius: '50%',
          transition: 'background 0.3s'
        }}
        onClick={togglePlay}
      >
        {!isPlaying ? (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="#fff">
            <path d="M8 5v14l11-7z"/>
          </svg>
        ) : (
          <svg width="40" height="40" viewBox="0 0 24 24" fill="#fff">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        )}
      </div>
      {isPlaying && (
        <div style={{
          position: 'absolute',
          top: -3,
          left: -3,
          right: -3,
          bottom: -3,
          borderRadius: '50%',
          border: '2px solid #229ed9',
          borderTopColor: 'transparent',
          transform: `rotate(${progress * 360}deg)`,
          transition: 'transform 0.1s linear',
          animation: 'spin 1s linear infinite',
          opacity: 0.9,
          pointerEvents: 'none'
        }} />
      )}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ChatWithFriend;