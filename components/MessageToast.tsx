import { Toast, toast } from 'react-hot-toast';
import Image from 'next/image';
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
      className={`${
        t.visible ? 'animate-enter' : 'animate-leave'
      } max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer hover:shadow-xl transition-shadow`}
    >
      <div className="flex-1 w-0 p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <Image
              className="h-10 w-10 rounded-full"
              src={avatar}
              alt={username}
              width={40}
              height={40}
            />
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-gray-900">
              {username}
              {role && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  {role}
                </span>
              )}
            </p>
            <p className="mt-1 text-sm text-gray-500">{message}</p>
          </div>
        </div>
      </div>
    </div>
  );
};