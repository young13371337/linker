import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getPusherClient } from '../lib/pusher';

type CallType = 'phone' | 'video';
type CallState = {
  id: string;
  type: CallType;
  targetId?: string;
  targetName?: string;
  targetAvatar?: string;
  status: 'calling' | 'ringing' | 'in-call' | 'ended';
  startedAt?: number;
  muted?: boolean;
  endedAt?: number;
  endedReason?: 'declined' | 'ended';
};

type CallContextValue = {
  call: CallState | null;
  startCall: (opts: { type: CallType; targetId: string; targetName?: string; targetAvatar?: string }) => void;
  receiveIncomingCall: (call: CallState) => void;
  acceptCall: () => void;
  endCall: () => void;
  minimizeCall: () => void;
  restoreCall: () => void;
  toggleMute: () => void;
  muted: boolean;
  minimized: boolean;
};

const CallContext = createContext<CallContextValue | null>(null);

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
};

function CallWindow({ call, onAccept, onEnd, onMinimize, muted, onToggleMute }: { call: CallState; onAccept: () => Promise<void> | void; onEnd: () => void; onMinimize: () => void; muted: boolean; onToggleMute: () => void; }) {
  if (!call) return null;
  const isOutgoing = call.status === 'calling';
  const isIncoming = call.status === 'ringing';
  const isActive = call.status === 'in-call';

  const [elapsed, setElapsed] = React.useState<string>('00:00');
  React.useEffect(() => {
    let t: any = null;
    const update = () => {
      const start = call.startedAt || Date.now();
      const diff = Math.max(0, Date.now() - start);
      const s = Math.floor(diff / 1000);
      const mm = String(Math.floor(s / 60)).padStart(2, '0');
      const ss = String(s % 60).padStart(2, '0');
      setElapsed(`${mm}:${ss}`);
    };
    if (isActive) {
      update();
      t = setInterval(update, 1000);
    } else {
      setElapsed('00:00');
    }
    return () => { if (t) clearInterval(t); };
  }, [call.startedAt, isActive]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{ position: 'relative', width: 360, maxWidth: '92vw', background: '#111318', borderRadius: 14, padding: 18, boxShadow: '0 10px 40px rgba(0,0,0,0.6)', color: '#fff', zIndex: 2010 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <img src={call.targetAvatar || '/window.svg'} alt="avatar" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', background: '#333' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{call.targetName || 'Звонок'}</div>
            <div style={{ color: '#9aa0a6', marginTop: 6 }}>
              {call.status === 'ended' ? (call.endedReason === 'declined' ? 'Звонок отклонён' : (call.startedAt ? 'Звонок завершён' : 'Звонок завершён')) : (isOutgoing ? 'Звонок...' : isIncoming ? 'Входящий звонок' : isActive ? 'В разговоре' : '')}
            </div>
          </div>
        </div>
        {call.status === 'ended' ? (
          // ended/declined panel
          <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 84, height: 84, borderRadius: 84, background: call.endedReason === 'declined' ? 'linear-gradient(135deg,#ff7b7b,#e64545)' : 'linear-gradient(135deg,#666,#444)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="/phone-end.svg.svg" alt="ended" style={{ width: 28, height: 28, transform: call.endedReason === 'declined' ? 'rotate(0deg)' : 'rotate(0deg)' }} />
            </div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>{call.endedReason === 'declined' ? 'Звонок отклонён' : (call.startedAt && call.endedAt ? (() => {
              const ms = Math.max(0, (call.endedAt || Date.now()) - (call.startedAt || Date.now()));
              const s = Math.floor(ms / 1000);
              const mm = String(Math.floor(s / 60)).padStart(2, '0');
              const ss = String(s % 60).padStart(2, '0');
              return `Звонок продлился ${mm}:${ss}`;
            })() : 'Звонок завершён')}</div>
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 14, marginTop: 18, justifyContent: 'center', alignItems: 'center' }}>
          {/* show elapsed timer when in-call */}
          {isActive && (
            <div style={{ color: '#cfeefc', fontWeight: 700, fontSize: 16, marginRight: 8 }}>{elapsed}</div>
          )}

          {/* Incoming: show accept + decline */}
          {isIncoming ? (
            <>
              <button onClick={onAccept} title="Принять" style={{ width: 56, height: 56, borderRadius: 56, border: 'none', background: 'linear-gradient(135deg,#1ed760,#18b54a)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 30px rgba(24,160,80,0.16)' }}>
                <img src="/phone-accept.svg.svg" alt="accept" style={{ width: 22, height: 22 }} />
              </button>
              <button onClick={onEnd} title="Отклонить" style={{ width: 56, height: 56, borderRadius: 56, border: 'none', background: 'linear-gradient(135deg,#ff5b5b,#e64545)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 30px rgba(220,60,60,0.16)' }}>
                <img src="/phone-end.svg.svg" alt="decline" style={{ width: 20, height: 20 }} />
              </button>
            </>
          ) : (
            // normal in-call controls
            <>
              {/* Mute/unmute */}
              <button onClick={onToggleMute} title={muted ? 'Включить микрофон' : 'Выключить микрофон'} style={{ width: 48, height: 48, borderRadius: 48, border: '1px solid rgba(255,255,255,0.06)', background: muted ? '#2b2b2b' : '#0f1113', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: muted ? '0 6px 18px rgba(0,0,0,0.45)' : '0 6px 18px rgba(0,0,0,0.25)' }}>
                <img src={muted ? '/mic-off.svg.svg' : '/mic-on.svg.svg'} alt="mic" style={{ width: 20, height: 20 }} />
              </button>

              {/* Minimize */}
              <button onClick={onMinimize} title="Свернуть" style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)', background: '#0f1113', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <img src="/tray.svg.svg" alt="minimize" style={{ width: 18, height: 18, filter: 'invert(1) brightness(1.1)' }} />
              </button>

              {/* End call */}
              <button onClick={onEnd} title="Завершить" style={{ width: 56, height: 56, borderRadius: 56, border: 'none', background: 'linear-gradient(135deg,#ff5b5b,#e64545)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 30px rgba(220,60,60,0.16)' }}>
                <img src="/phone-end.svg.svg" alt="end" style={{ width: 20, height: 20, transform: 'rotate(0deg)' }} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [call, setCall] = useState<CallState | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [muted, setMuted] = useState(false);
  const STORAGE_KEY = 'linker.callState';
  const audioStreamRef = React.useRef<MediaStream | null>(null);
  const audioElRef = React.useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const { data: session } = useSession();
  const pusherClient = typeof window !== 'undefined' ? getPusherClient() : null;

  const startCall = useCallback((opts: { type: CallType; targetId: string; targetName?: string; targetAvatar?: string }) => {
    const c: CallState = {
      id: String(Date.now()) + Math.random().toString(36).slice(2, 8),
      type: opts.type,
      targetId: opts.targetId,
      targetName: opts.targetName,
      targetAvatar: opts.targetAvatar,
      status: 'calling',
      startedAt: Date.now(),
    };
    setCall(c);
  // persist initial call state
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ call: c, minimized: false, muted: false })); } catch (e) {}
    setMinimized(false);

    (async () => {
      try {
        // acquire local audio
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        audioStreamRef.current = stream;

        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        pcRef.current = pc;

        // add local tracks
        stream.getTracks().forEach(t => pc.addTrack(t, stream));

  // collect remote tracks
  const remoteStream = new MediaStream();
  remoteStreamRef.current = remoteStream;
  pc.ontrack = (ev) => { try { if (ev.streams && ev.streams[0]) { remoteStreamRef.current = ev.streams[0]; if (audioElRef.current) { try { audioElRef.current.srcObject = remoteStreamRef.current; audioElRef.current.play().catch(()=>{}); } catch {} } } } catch (e) {} };

        pc.onicecandidate = (ev) => {
          if (ev.candidate) {
            try {
              fetch('/api/calls/candidate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: opts.targetId, candidate: ev.candidate, from: (session?.user as any)?.id }) });
            } catch (e) {}
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // send offer to callee via server (Pusher relay)
  await fetch('/api/calls/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: opts.targetId, sdp: offer.sdp, from: (session?.user as any)?.id, fromName: (session?.user as any)?.link || (session?.user as any)?.login || (session?.user as any)?.name, fromAvatar: (session?.user as any)?.avatar }) });
      } catch (e) {
        console.error('startCall WebRTC init failed', e);
      }
    })();
  }, [session]);

  const receiveIncomingCall = useCallback((c: CallState) => {
    const next = { ...c, status: 'ringing' } as CallState;
    setCall(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ call: next, minimized: false, muted })); } catch (e) {}
    setMinimized(false);
  }, []);

  const acceptCall = useCallback(async () => {
    setCall(prev => {
      const next = prev ? ({ ...prev, status: 'in-call', startedAt: prev.startedAt || Date.now() } as CallState) : prev;
      try { if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify({ call: next, minimized: false, muted })); } catch (e) {}
      return next as CallState | null;
    });
    setMinimized(false);
    try {
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = localStream;
      audioStreamRef.current = localStream;

      let pc = pcRef.current;
      if (!pc) {
        pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        pcRef.current = pc;

        pc.onicecandidate = (ev) => {
          if (ev.candidate) {
            try { fetch('/api/calls/candidate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: call?.targetId, candidate: ev.candidate }) }); } catch (e) {}
          }
        };

  const remoteStream = new MediaStream();
  remoteStreamRef.current = remoteStream;
  pc.ontrack = (ev) => { try { if (ev.streams && ev.streams[0]) { remoteStreamRef.current = ev.streams[0]; if (audioElRef.current) { try { audioElRef.current.srcObject = remoteStreamRef.current; audioElRef.current.play().catch(()=>{}); } catch {} } } } catch (e) {} };
      }

      localStream.getTracks().forEach(t => pc!.addTrack(t, localStream));

      const answer = await pc!.createAnswer();
      await pc!.setLocalDescription(answer);
      // send answer to caller
      try {
        await fetch('/api/calls/answer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: call?.targetId, sdp: answer.sdp, from: (session?.user as any)?.id }) });
      } catch (e) {}
    } catch (e) {
      console.warn('acceptCall failed', e);
    }
  }, [muted, call]);

  const endCall = useCallback(() => {
    setCall(prev => {
      try {
        if (prev) {
          const endedAt = Date.now();
          const wasInCall = prev.status === 'in-call';
          const reason: 'declined' | 'ended' = prev.status === 'ringing' ? 'declined' : 'ended';
          // notify remote party about end/decline
          try {
            if ((prev.targetId) && typeof window !== 'undefined') {
              fetch('/api/calls/end', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: prev.targetId, from: (session as any)?.user?.id, reason }) }).catch(()=>{});
            }
          } catch (e) {}
          // dispatch a global event so pages (chat) can insert system messages (missed/ended)
          try {
            window.dispatchEvent(new CustomEvent('call-ended', { detail: { targetId: prev.targetId, targetName: prev.targetName, startedAt: prev.startedAt, endedAt, wasInCall } }));
          } catch (e) {}
          // return updated call with end metadata so UI can show an ended panel briefly
          const next = ({ ...prev, status: 'ended', endedAt, endedReason: reason } as CallState);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ call: next, minimized: false, muted })); } catch (e) {}
          return next;
        }
      } catch (e) {}
      return prev ? { ...prev, status: 'ended' } : prev;
    });

    // stop any acquired audio tracks
    try {
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(t => t.stop());
        audioStreamRef.current = null;
      }
    } catch (e) {}
    // close peer connection and hide after a short delay
    try {
      if (pcRef.current) {
        try { pcRef.current.getSenders().forEach(s => { try { s.track && s.track.stop(); } catch {} }); } catch {}
        pcRef.current.close();
        pcRef.current = null;
      }
      if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
      if (remoteStreamRef.current) { remoteStreamRef.current.getTracks().forEach(t => t.stop()); remoteStreamRef.current = null; }
    } catch (e) {}

    // pick a visible duration for the ended panel: longer when declined so user sees 'Звонок отклонён'
    setTimeout(() => {
      setCall(null);
      setMuted(false);
      setMinimized(false);
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    }, 2200);
  }, [session]);

  const toggleMute = useCallback(() => {
    setMuted(m => {
      const next = !m;
      try {
        if (audioStreamRef.current) {
          audioStreamRef.current.getAudioTracks().forEach(t => (t.enabled = !next ? true : false));
        }
      } catch (e) {}
      try { // persist mute change
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.muted = next;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
      } catch (e) {}
      return next;
    });
  }, []);

  const minimizeCall = useCallback(() => {
    setMinimized(true);
    try { const stored = localStorage.getItem(STORAGE_KEY); if (stored) { const parsed = JSON.parse(stored); parsed.minimized = true; localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed)); } } catch (e) {}
  }, []);

  const restoreCall = useCallback(() => {
    setMinimized(false);
    try { const stored = localStorage.getItem(STORAGE_KEY); if (stored) { const parsed = JSON.parse(stored); parsed.minimized = false; localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed)); } } catch (e) {}
  }, []);

  // detect mobile for tray styling
  const [isMobileTray, setIsMobileTray] = useState(false);
  useEffect(() => {
    const check = () => setIsMobileTray(typeof window !== 'undefined' && window.innerWidth <= 520);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // allow incoming-call global event to be dispatched from elsewhere (e.g., pusher handler)
  useEffect(() => {
    const handler = (e: any) => {
      try {
        const detail = e.detail as CallState;
        if (!detail) return;
        receiveIncomingCall(detail);
      } catch (e) {}
    };
    window.addEventListener('incoming-call', handler as any);
    return () => window.removeEventListener('incoming-call', handler as any);
  }, [receiveIncomingCall]);

  // rehydrate from localStorage on mount so tray persists across navigation/refresh
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.call && parsed.call.status !== 'ended') {
          setCall(parsed.call as CallState);
          setMinimized(Boolean(parsed.minimized));
          setMuted(Boolean(parsed.muted));
        } else {
          // if ended, remove stale storage
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (e) {}
    // listen storage changes from other tabs
    const onStorage = (ev: StorageEvent) => {
      try {
        if (ev.key !== STORAGE_KEY) return;
        if (!ev.newValue) { setCall(null); setMinimized(false); setMuted(false); return; }
        const parsed = JSON.parse(ev.newValue);
        if (parsed?.call && parsed.call.status !== 'ended') {
          setCall(parsed.call as CallState);
          setMinimized(Boolean(parsed.minimized));
          setMuted(Boolean(parsed.muted));
        } else {
          setCall(null); setMinimized(false); setMuted(false);
        }
      } catch (e) {}
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Pusher-based signaling: subscribe to incoming webrtc events for this user
  useEffect(() => {
    try {
      if (!pusherClient) return;
      if (!session || !(session.user as any)?.id) return;
      const channelName = `user-${(session.user as any).id}`;
      const channel = pusherClient.subscribe(channelName);

      const onOffer = async (data: any) => {
        try {
          const from = data.from as string;
          const sdp = data.sdp as string;
          const callerName = data.fromName as string;
          const callerAvatar = data.fromAvatar as string;
          setCall({ id: String(Date.now()), type: 'phone', targetId: from, targetName: callerName, targetAvatar: callerAvatar, status: 'ringing', startedAt: Date.now() });

          // prepare pc and set remote description so acceptCall can answer
          const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
          pcRef.current = pc;

          pc.onicecandidate = (ev) => {
            if (ev.candidate) {
              try { fetch('/api/calls/candidate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: from, candidate: ev.candidate, from: (session?.user as any)?.id }) }); } catch (e) {}
            }
          };

          const remoteStream = new MediaStream();
          remoteStreamRef.current = remoteStream;
          pc.ontrack = (ev) => { try { if (ev.streams && ev.streams[0]) { remoteStreamRef.current = ev.streams[0]; if (audioElRef.current) { try { audioElRef.current.srcObject = remoteStreamRef.current; audioElRef.current.play().catch(()=>{}); } catch {} } } } catch (e) {} };

          await pc.setRemoteDescription({ type: 'offer', sdp } as RTCSessionDescriptionInit);
        } catch (e) {
          console.error('onOffer handler error', e);
        }
      };

      const onAnswer = async (data: any) => {
        try {
          const sdp = data.sdp as string;
          if (!pcRef.current) return;
          await pcRef.current.setRemoteDescription({ type: 'answer', sdp } as RTCSessionDescriptionInit);
          // mark call as in-call (caller side)
          setCall(prev => prev ? { ...prev, status: 'in-call', startedAt: prev.startedAt || Date.now() } : prev);
        } catch (e) { console.error('onAnswer error', e); }
      };

      const onCandidate = async (data: any) => {
        try {
          const cand = data.candidate;
          if (!cand) return;
          if (!pcRef.current) return;
          try { await pcRef.current.addIceCandidate(cand); } catch (e) {}
        } catch (e) {}
      };

      channel.bind('webrtc-offer', onOffer);
      channel.bind('webrtc-answer', onAnswer);
      channel.bind('webrtc-candidate', onCandidate);
      // remote ended/declined
      const onEnd = (data: any) => {
        try {
          const reason = data?.reason as string | undefined;
          // set local call state to ended
          setCall(prev => prev ? { ...prev, status: 'ended', endedAt: Date.now(), endedReason: reason === 'declined' ? 'declined' : 'ended' } : prev);
          // dispatch global event so chat pages can show system message
          try {
            const wasInCall = reason === 'ended';
            window.dispatchEvent(new CustomEvent('call-ended', { detail: { targetId: data.from, targetName: undefined, startedAt: undefined, endedAt: Date.now(), wasInCall } }));
          } catch (e) {}
          // cleanup local media/pc without notifying remote (we already received remote end)
          try {
            if (audioStreamRef.current) { audioStreamRef.current.getTracks().forEach(t=>t.stop()); audioStreamRef.current = null; }
          } catch (e) {}
          try {
            if (pcRef.current) { try { pcRef.current.getSenders().forEach(s=>{ try { s.track && s.track.stop(); } catch{} }); } catch{}; pcRef.current.close(); pcRef.current = null; }
          } catch (e) {}
          try { if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t=>t.stop()); localStreamRef.current = null; } } catch (e) {}
          try { if (remoteStreamRef.current) { remoteStreamRef.current.getTracks().forEach(t=>t.stop()); remoteStreamRef.current = null; } } catch (e) {}
          // allow ended-panel to show briefly, then clear
          try {
            const delay = (reason === 'declined') ? 2200 : 1200;
            setTimeout(() => { try { setCall(null); setMuted(false); setMinimized(false); } catch {} }, delay);
          } catch (e) {}
        } catch (e) {}
      };
      channel.bind('webrtc-end', onEnd);

      return () => {
        try { channel.unbind('webrtc-offer', onOffer); } catch (e) {}
        try { channel.unbind('webrtc-answer', onAnswer); } catch (e) {}
        try { channel.unbind('webrtc-candidate', onCandidate); } catch (e) {}
        try { channel.unbind('webrtc-end', onEnd); } catch (e) {}
        try { pusherClient.unsubscribe(channelName); } catch (e) {}
      };
    } catch (e) {}
  }, [pusherClient, session]);


  const value = useMemo((): CallContextValue => ({ call, startCall, receiveIncomingCall, acceptCall, endCall, minimizeCall, restoreCall, toggleMute, muted, minimized }), [call, startCall, receiveIncomingCall, acceptCall, endCall, minimizeCall, restoreCall, toggleMute, muted, minimized]);

  return (
    <CallContext.Provider value={value}>
      {children}
      {/* hidden audio element for remote playback */}
      <audio ref={audioElRef} autoPlay style={{ display: 'none' }} />
      {/* Render call overlay and tray */}
      {call && !minimized && (
        <CallWindow call={call} onAccept={acceptCall} onEnd={endCall} onMinimize={minimizeCall} muted={muted} onToggleMute={toggleMute} />
      )}
      {call && minimized && call.status !== 'ended' && (
        isMobileTray ? (
          // Mobile: slightly larger centered pill at bottom
          <div style={{ position: 'fixed', left: '50%', bottom: 14, transform: 'translateX(-50%)', zIndex: 2100 }}>
            <button onClick={restoreCall} title="Вернуться к звонку" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderRadius: 999, background: 'linear-gradient(90deg,#0f1113,#14151a)', color: '#fff', border: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', boxShadow: '0 10px 30px rgba(0,0,0,0.55)' }}>
              <img src={call.targetAvatar || '/phonecall.svg'} alt="a" style={{ width: 36, height: 36, borderRadius: '50%' }} />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{call.targetName || 'Звонок'}</div>
                <div style={{ color: '#9aa0a6', fontSize: 12 }}>{call.type === 'phone' ? 'Звоним...' : 'Звоним...'}</div>
              </div>
              <img src="/phonecall.svg" alt="phone" style={{ width: 20, height: 20, marginLeft: 8 }} />
            </button>
          </div>
        ) : (
          // Desktop: slightly larger card at bottom-right with bigger icon badge
          <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 2100 }}>
            <button onClick={restoreCall} title="Вернуться к звонку" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: '#0b0d10', color: '#fff', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', boxShadow: '0 12px 36px rgba(0,0,0,0.55)' }}>
              <div style={{ position: 'relative' }}>
                <img src={call.targetAvatar || '/window.svg'} alt="a" style={{ width: 48, height: 48, borderRadius: '8px', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', right: -8, bottom: -8, width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#229ed9,#1b7fb3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 22px rgba(27,127,179,0.2)' }}>
                  <img src="/phonecall.svg" alt="phone" style={{ width: 18, height: 18 }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{call.targetName || 'Звонок'}</div>
                <div style={{ color: '#9aa0a6', fontSize: 13 }}>{call.type === 'phone' ? 'Телефонный звонок' : 'Видеозвонок'}</div>
              </div>
            </button>
          </div>
        )
      )}
    </CallContext.Provider>
  );
};

export default CallProvider;
