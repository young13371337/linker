import { Toast, toast } from 'react-hot-toast';
import { useRouter } from 'next/router';

interface MessageToastProps {
  t: Toast;
  avatar: string;
  username: string;
  role?: string;
  message: string;
  chatId?: string;
}

export const MessageToast = ({ t, avatar, username, role, message, chatId }: MessageToastProps) => {
  const router = useRouter();

  const openChat = () => {
    try {
      toast.dismiss(t.id);
    } catch (e) {}
    if (chatId) {
      router.push(`/chat/${chatId}`);
    }
  };

  return (
    <div
      onClick={openChat}
      role="button"
      tabIndex={0}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minWidth: 300,
        maxWidth: 520,
        background: '#0f1214',
        color: '#fff',
        padding: '12px 14px',
        borderRadius: 12,
        boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
        cursor: 'pointer',
        pointerEvents: 'auto',
  // entrance animation: slightly longer duration and smoother easing for a more natural feel
  transition: 'opacity .28s cubic-bezier(.16,.84,.24,1), transform .28s cubic-bezier(.16,.84,.24,1)',
  willChange: 'transform, opacity',
  transform: t.visible ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.985)',
  opacity: t.visible ? 1 : 0,
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={avatar} alt={username} width={44} height={44} style={{ objectFit: 'cover', display: 'block' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{username}</div>
            {role && (
              <div style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img
                  src={`/role-icons/${role}.svg`}
                  alt={role}
                  style={{ width: 18, height: 18, display: 'block' }}
                  onError={(e) => { try { (e.currentTarget as HTMLImageElement).style.display = 'none'; } catch (err) {} }}
                />
              </div>
            )}
          </div>
        </div>
        <div style={{ color: '#e6eef0', fontSize: 14, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, wordBreak: 'break-word' }}>{message}</div>
      </div>
    </div>
  );
};