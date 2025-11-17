'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MessageCircle, Heart, Trash2 } from 'lucide-react';
import { useActiveRoom } from '../context/ActiveRoomContext';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import type { MessageWithUser } from '@/features/message/backend/schema';

interface MessageItemProps {
  message: MessageWithUser;
  isPending?: boolean;
  isLiked?: boolean;
  isHidden?: boolean;
}

export const MessageItem = ({
  message,
  isPending = false,
  isLiked = false,
  isHidden = false,
}: MessageItemProps) => {
  const { setReplyTarget, toggleLike, hideMessage } = useActiveRoom();
  const [showActions, setShowActions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleReply = () => {
    setReplyTarget(message);
  };

  const handleLike = async () => {
    toggleLike(message.id);
    // Optimistic update, actual API call would be made in the service layer
  };

  const handleDelete = async () => {
    if (!confirm('메시지를 삭제하시겠습니까?')) return;

    try {
      setIsDeleting(true);
      await apiClient.delete(`/api/messages/${message.id}`, {
        params: { deleteForAll: false },
      });
      hideMessage(message.id);
    } catch (error) {
      const msg = extractApiErrorMessage(error, '메시지 삭제 실패');
      alert(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isHidden) {
    return null;
  }

  if (message.is_deleted) {
    return (
      <div className="flex gap-3 px-4 py-2 text-center">
        <div className="flex-1 text-sm text-slate-400">
          이 메시지는 삭제되었습니다
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-3 px-4 py-2 transition-colors ${
        isPending ? 'opacity-75' : ''
      } hover:bg-slate-50`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar placeholder */}
      <div className="h-8 w-8 flex-shrink-0 rounded-full bg-slate-300" />

      {/* Message content */}
      <div className="flex-1 min-w-0">
        {/* Header: name + time */}
        <div className="flex items-center gap-2">
          <p className="font-medium text-slate-900">{message.user.nickname}</p>
          <span className="text-xs text-slate-500">
            {formatDistanceToNow(new Date(message.created_at), {
              addSuffix: true,
              locale: ko,
            })}
          </span>
          {isPending && (
            <span className="text-xs text-blue-600">전송 중...</span>
          )}
        </div>

        {/* Message body */}
        <p className="break-words text-slate-800">{message.content}</p>

        {/* Like count */}
        {message.like_count > 0 && (
          <div className="mt-1 text-xs text-slate-600">
            👍 {message.like_count}명
          </div>
        )}
      </div>

      {/* Action buttons */}
      {showActions && !isPending && (
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={handleReply}
            className="p-1 hover:bg-slate-200 rounded"
            title="답장"
          >
            <MessageCircle className="h-4 w-4 text-slate-600" />
          </button>
          <button
            onClick={handleLike}
            className="p-1 hover:bg-slate-200 rounded"
            title="좋아요"
          >
            <Heart
              className={`h-4 w-4 ${
                isLiked ? 'fill-red-500 text-red-500' : 'text-slate-600'
              }`}
            />
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-1 hover:bg-slate-200 rounded"
            title="삭제"
          >
            <Trash2 className="h-4 w-4 text-slate-600" />
          </button>
        </div>
      )}
    </div>
  );
};
