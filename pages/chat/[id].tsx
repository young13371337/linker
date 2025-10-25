import Pusher from 'pusher-js';
import React, { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { FaPaperPlane, FaCheck, FaCheckDouble } from 'react-icons/fa';
import { useRouter } from 'next/router';
import UserStatus, { statusLabels } from '../../components/UserStatus';
import { useSession } from 'next-auth/react';

// --- Кружок с overlay play/pause ---
const VideoCircle: React.FC<{ src: string }> = ({ src }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [showOverlay, setShowOverlay] = React.useState(true);
  const [progress, setProgress] = React.useState(0); // 0..1
  const [duration, setDuration] = React.useState(0);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLoaded = () => setDuration(video.duration);
    const onTime = () => {
      if (video.duration) setProgress(video.currentTime / video.duration);
      else setProgress(0);
    };
    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('timeupdate', onTime);
    return () => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('timeupdate', onTime);
    };
  }, []);

  React.useEffect(() => {
    if (playing) {
      setShowOverlay(false);
    }
  }, [playing]);

  // параметры круга
  const CIRCLE_SIZE = playing ? 140 : 120;
  const STROKE = 5;
  const RADIUS = (CIRCLE_SIZE / 2) - (STROKE / 2);
  const CIRCUM = 2 * Math.PI * RADIUS;
  const offset = CIRCUM * (1 - progress);

  return (
    <div style={{ position: 'relative', width: CIRCLE_SIZE, height: CIRCLE_SIZE, transition: 'width .18s, height .18s', display: 'inline-block' }}>
      <video
        ref={videoRef}
        playsInline
        style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#111', objectFit: 'cover', border: '2.5px solid #229ed9', boxShadow: '0 2px 12px #229ed955', marginBottom: 2, cursor: 'pointer', transition: 'box-shadow .18s, border .18s' }}
        onClick={() => {
          if (!videoRef.current) return;
          if (videoRef.current.paused) {
            videoRef.current.play();
            setPlaying(true);
            setShowOverlay(true);
            setTimeout(() => setShowOverlay(false), 600);
          } else {
            videoRef.current.pause();
            setPlaying(false);
            setShowOverlay(true);
            setTimeout(() => setShowOverlay(false), 600);
          }
        }}
        onPlay={() => {
          setPlaying(true);
          setShowOverlay(true);
          setTimeout(() => setShowOverlay(false), 600);
        }}
        onPause={() => {
          setPlaying(false);
          setShowOverlay(true);
          setTimeout(() => setShowOverlay(false), 600);
        }}
      >
        <source src={src} type="video/webm" />
      </video>
      {/* SVG прогресс-обводка */}
      {playing && duration > 0 && (
        <svg
          width={CIRCLE_SIZE}
          height={CIRCLE_SIZE}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          <circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke="#229ed9"
            strokeWidth={STROKE}
            fill="none"
            opacity="0.18"
          />
          <circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke="#229ed9"
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={CIRCUM}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.18s linear' }}
          />
        </svg>
      )}
      {showOverlay && (
        <div style={{
          position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', transition: 'opacity .18s', opacity: 0.92,
        }}>
          {playing ? (
            <svg width={44} height={44} viewBox="0 0 44 44" style={{ filter: 'drop-shadow(0 2px 8px #222)' }}>
              <circle cx="22" cy="22" r="22" fill="#222" fillOpacity="0.55" />
              <rect x="14" y="13" width="6" height="18" rx="2.5" fill="#fff" />
              <rect x="24" y="13" width="6" height="18" rx="2.5" fill="#fff" />
            </svg>
          ) : (
            <svg width={44} height={44} viewBox="0 0 44 44" style={{ filter: 'drop-shadow(0 2px 8px #222)' }}>
              <circle cx="22" cy="22" r="22" fill="#222" fillOpacity="0.55" />
              <polygon points="16,13 32,22 16,31" fill="#fff" />
            </svg>
          )}
        </div>
      )}
    </div>
  );
};

// Кастомный компонент для голосовых сообщений
const VoiceMessage: React.FC<{ audioUrl: string; isOwn?: boolean }> = ({ audioUrl, isOwn }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => setDuration(audio.duration);
    const onTime = () => setCurrent(audio.currentTime);
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
}

const ChatWithFriend: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  
  const [messages, setMessages] = useState<Message[]>([]);
  // Исправить тип friend, чтобы поддерживать login, name, avatar, role
  const [friend, setFriend] = useState<{id: string, login?: string, name?: string, avatar?: string | null, role?: string, status?: string} | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
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

  // TypingIndicator компонент-заглушка (реализуй по необходимости)
  const TypingIndicator = () => <span>Печатает...</span>;

  // --- Для видеокружков: объявить функции, если их нет ---
  // Остановить запись видео
  const stopVideoRecording = () => {
    if (videoRecorder && videoRecording) {
      videoRecorder.stop();
      setVideoRecording(false);
      if (videoTimer.current) clearInterval(videoTimer.current);
    }
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
            // (Проверка минимального размера видео отключена)
            // Сразу отправляем кружок
            if (chatId && session) {
              const formData = new FormData();
              formData.append('chatId', chatId);
              formData.append('video', blob, 'circle.webm');
              try {
                const res = await fetch('/api/messages/video-upload', {
                  method: 'POST',
                  body: formData,
                });
                const data = await res.json();
                if (data.videoUrl && data.message && data.message.id) {
                  setMessages((prev) => [...prev, {
                    id: data.message.id,
                    sender: (session.user as any)?.id,
                    text: '',
                    createdAt: data.message.createdAt || new Date().toISOString(),
                    audioUrl: undefined,
                    videoUrl: data.videoUrl,
                  }]);
                }
              } catch (err) {
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
                  videoUrl: msg.videoUrl || undefined
                }));
                setMessages(msgs);
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

  // Подписка на Pusher для получения изменений статуса пользователя и сообщений
  useEffect(() => {
    if (!friend || !friend.id || !chatId) return;
    try {
      const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1',
      });
      
      // Подписка на канал пользователя для статуса
      const userChannel = pusherClient.subscribe(`user-${friend.id}`);
      const onStatus = (payload: any) => {
        if (!payload || !payload.userId) return;
        setFriend(prev => prev && prev.id === payload.userId ? { ...prev, status: payload.status } : prev);
      };
      userChannel.bind('status-changed', onStatus);

      // Подписка на канал чата для сообщений
      const chatChannel = pusherClient.subscribe(`chat-${chatId}`);
      const onNewMessage = (data: any) => {
        if (!data.message) return;
        
        const newMsg = {
          id: data.message.id,
          sender: data.message.senderId,
          text: data.message.text,
          createdAt: data.message.createdAt,
          audioUrl: data.message.audioUrl,
          videoUrl: data.message.videoUrl
        };
        
        // Добавляем новое сообщение в список
        setMessages(prev => [...prev, newMsg]);

        // Устанавливаем анимацию для нового сообщения
        setAnimatedMsgIds(prev => new Set([...prev, data.message.id]));

        // Автоматически прокручиваем к новому сообщению
        setTimeout(scrollToBottom, 50);
      };
      chatChannel.bind('new-message', onNewMessage);
      
      // cleanup
      return () => {
        try {
          userChannel.unbind('status-changed', onStatus);
          chatChannel.unbind('new-message', onNewMessage);
          pusherClient.unsubscribe(`user-${friend.id}`);
          pusherClient.unsubscribe(`chat-${chatId}`);
          pusherClient.disconnect();
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
      .then(res => res.json())
      .then((data) => {
        if (data.message) {
          // Заменяем временное сообщение на реальное
          setMessages(prev => prev.map(msg => 
            msg.id === tempId ? {
              id: data.message.id,
              sender: data.message.senderId,
              text: data.message.text,
              createdAt: data.message.createdAt,
              videoUrl: data.message.videoUrl,
              audioUrl: data.message.audioUrl
            } : msg
          ));
        }
      });
  };

  // Показываем UI сразу, даже если данные ещё не загружены
  if (!session) {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'flex-start',justifyContent:'center',background:'#111'}}>
        <div style={{marginTop:80,color:'#bbb',fontSize:22,fontWeight:500}}>
          Для общения в чате нужно авторизоваться.
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
          /* Анимация появления сообщения */
          .chat-msg-appear {
            animation: chatMsgFadeIn 0.38s cubic-bezier(.23,1.02,.36,1) both;
          }
          @keyframes chatMsgFadeIn {
            from {
              opacity: 0;
              transform: translateY(18px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
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
        <div style={chatContainerStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: isMobile ? 10 : 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
            <div style={{ position: 'relative' }}>
              <img src={friend?.avatar || '/window.svg'} alt="avatar" style={avatarStyle} />
              {/* Статус только возле аватарки */}
              {friend?.status === 'dnd' ? (
                <img src="/moon-dnd.svg" alt="dnd" style={{ position: 'absolute', right: -6, bottom: -6, width: 18, height: 18 }} />
              ) : (
                <span style={{ position: 'absolute', right: -2, bottom: -2, width: 14, height: 14, borderRadius: '50%', background: friend?.status === 'online' ? '#1ed760' : '#888', border: '2px solid #23242a' }} />
              )}
            </div>
            <span style={nameStyle}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>{friend?.name || friend?.login || <span style={{color:'#888'}}>Загрузка...</span>}</span>
              </span>
              {/* Иконка роли */}
              {friend?.role === 'admin' && <img src="/role-icons/admin.svg" alt="admin" title="Админ" style={{ width: 16, height: 16, marginLeft: 2 }} />}
              {friend?.role === 'moderator' && <img src="/role-icons/moderator.svg" alt="moderator" title="Модератор" style={{ width: 16, height: 16, marginLeft: 2 }} />}
              {friend?.role === 'verif' && <img src="/role-icons/verif.svg" alt="verif" title="Верифицирован" style={{ width: 16, height: 16, marginLeft: 2 }} />}
              {friend?.role === 'pepe' && <img src="/role-icons/pepe.svg" alt="pepe" title="Пепешка" style={{ width: 16, height: 16, marginLeft: 2 }} />}
            </span>
          </div>
        </div>
        <div
            className="chat-messages-scroll"
            style={{
              flex: 1,
              borderRadius: 16,
              padding: '4px 0',
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
              background: '#232228',
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
                        key={msg.id}
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
                        {isOwn && hoveredMsgId === msg.id && (
                          <button
                            onClick={async () => {
                              let res;
                              if (msg.videoUrl) {
                                res = await fetch(`/api/messages/video-upload?id=${msg.id}`, { method: 'DELETE', credentials: 'include' });
                              } else {
                                res = await fetch(`/api/messages/${msg.id}`, { method: 'DELETE', credentials: 'include' });
                              }
                              if (res.status === 204) {
                                setMessages(messages.filter(m => m.id !== msg.id));
                              } else {
                                const data = await res.json().catch(() => ({}));
                                alert('Ошибка удаления: ' + (data?.error || res.status));
                              }
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#888',
                              cursor: 'pointer',
                              fontSize: 16,
                              padding: 0,
                              marginRight: 8,
                              transition: 'color .15s',
                              alignSelf: 'center',
                            }}
                            title="Удалить сообщение"
                          >
                            ×
                          </button>
                        )}
                        {msg.videoUrl ? (
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isOwn ? 'flex-end' : 'flex-start',
                            gap: 2,
                            margin: '2px 0',
                            marginLeft: 0,
                          }}>
                            <VideoCircle src={msg.videoUrl.startsWith('/') ? msg.videoUrl : '/' + msg.videoUrl} />
                            <span style={{ fontSize: 13, color: '#bbb', marginTop: 2 }}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ) : msg.audioUrl ? (
                          <VoiceMessage audioUrl={msg.audioUrl} isOwn={isOwn} />
                        ) : (
                          <span
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
                      </div>
                    );
                  })}
                </React.Fragment>
              ));
            })()
          )}
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
              {/* Затемнение */}
              <div style={{
                position: 'absolute', left: 0, top: 0, width: '100vw', height: '100vh',
                background: 'rgba(20,22,30,0.55)', zIndex: 0,
                animation: 'fadeInOverlay 0.25s',
              }} onClick={cancelVideo} />
              {/* Кружок и кнопки */}
              <div style={{
                position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
              }}>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="circle-anim"
                  style={{ width: 220, height: 220, borderRadius: '50%', background: '#111', objectFit: 'cover', border: '4px solid #229ed9', boxShadow: '0 4px 32px #000a' }}
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
          {isRecording ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flex: 1,
              margin: '0 8px',
              color: '#d32f2f',
              fontSize: 16,
              fontWeight: 600,
              background: '#23232a',
              borderRadius: 12,
              padding: '6px 16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
              maxWidth: '100%',
              justifyContent: 'space-between',
              gap: 0,
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d32f2f', marginRight: 6, boxShadow: '0 0 8px #d32f2f88' }} />
                
                <span style={{ marginLeft: 12, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                  {String(Math.floor(recordTime / 60)).padStart(2, '0')}:{String(recordTime % 60).padStart(2, '0')}
                </span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Кнопка удаления (крестик) */}
                <button
                  type="button"
                  style={{
                    background: '#d32f2f',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 22,
                    boxShadow: '0 2px 8px #d32f2f44',
                    transition: 'background .18s',
                  }}
                  aria-label="Удалить голосовое сообщение"
                  title="Удалить голосовое сообщение"
                  onClick={cancelRecording}
                >
                  &#10006;
                </button>
                {/* Кнопка отправки (иконка микрофона с галочкой) */}
                <button
                  type="button"
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
                  aria-label="Отправить голосовое сообщение"
                  title="Отправить голосовое сообщение"
                  onMouseOver={e => { e.currentTarget.style.background = '#23243a'; }}
                  onMouseOut={e => { e.currentTarget.style.background = '#229ed9'; }}
                  onClick={() => {
                    if (mediaRecorder && isRecording) {
                      // обработчик onstop уже установлен для отправки
                      mediaRecorder.stop();
                      mediaRecorder.stream.getTracks().forEach(track => track.stop());
                    }
                  }}
                >
                  <img src="/send.svg" alt="Отправить" style={{ width: isMobile ? 28 : 22, height: isMobile ? 28 : 22, display: 'block' }} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onInput={async () => {
                  if (!chatId || !session) return;
                  await fetch('/api/messages/typing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ chatId })
                  });
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
                        // (Проверка минимальной длительности аудио отключена)
                        // ...existing code...
                        // (Проверка минимальной длительности видео отключена)
                        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' });
                        audioChunksRef.current = [];
                        // (Проверка минимального размера аудио отключена)
                        const formData = new FormData();
                        formData.append('chatId', chatId || '');
                        formData.append('audio', audioBlob, 'voice.webm');
                        try {
                          const res = await fetch('/api/messages/voice-upload', {
                            method: 'POST',
                            body: formData,
                          });
                          const data = await res.json();
                          if (data.audioUrl && data.message && data.message.id) {
                            setMessages((prev) => [...prev, {
                              id: data.message.id,
                              sender: (session?.user as any)?.id,
                              text: '',
                              createdAt: data.message.createdAt || new Date().toISOString(),
                              audioUrl: data.audioUrl,
                              videoUrl: undefined,
                            }]);
                          }
                        } catch (err) {
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
          )}
        </form>
        {/* (удалено дублирующееся отображение индикатора записи) */}
        {/* Статус "печатает..." чуть выше поля ввода, слева */}
        {isTyping && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            minHeight: 24,
            margin: '8px 0 2px 0',
            marginLeft: 4,
            color: '#4fc3f7',
            fontSize: 15,
            fontWeight: 500,
            maxWidth: '60%',
          }}>
            <TypingIndicator />
          </div>
        )}
      </div>
      {/* (модалка удалена, только inline превью) */}
      </div>
    </>
  );
};

export default ChatWithFriend;