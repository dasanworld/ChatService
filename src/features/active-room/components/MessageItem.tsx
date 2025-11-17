'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { MessageCircle, Heart, Trash2 } from 'lucide-react';
import { useActiveRoom } from '../context/ActiveRoomContext';
import { useLikeMessage } from '../hooks/useLikeMessage';
import { useIsMobile } from '@/hooks/useIsMobile';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { ReadReceipt } from '@/features/read-receipt/components/ReadReceipt';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import type { MessageWithUser } from '@/features/message/backend/schema';
import type { MessageReadStatus } from '@/features/read-receipt/backend/schema';

interface MessageItemProps {
  message: MessageWithUser;
  isPending?: boolean;
  isLiked?: boolean;
  isHidden?: boolean;
  readStatus?: MessageReadStatus | null;
}

export const MessageItem = ({
  message,
  isPending = false,
  isLiked = false,
  isHidden = false,
  readStatus = null,
}: MessageItemProps) => {
  const { setReplyTarget, hideMessage } = useActiveRoom();
  const { likeMessage, isLiking } = useLikeMessage();
  const { user } = useCurrentUser();
  const isMobile = useIsMobile();
  const [showActions, setShowActions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const isMine = user?.id === message.user_id;

  // 모바일에서는 항상 액션 버튼 표시, 데스크탑에서는 hover 시에만 표시
  const shouldShowActions = isMobile ? !isPending : showActions && !isPending;

  const handleReply = () => {
    setReplyTarget(message);
  };

  const handleLike = async () => {
    try {
      await likeMessage(message.id);
    } catch (error) {
      // Error is already handled in the hook
    }
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

  // Find reply message (if this is a reply)
  const { messages } = useActiveRoom();
  const replyMessage = message.reply_to_message_id
    ? messages.find((m) => m.id === message.reply_to_message_id)
    : null;

  return (
    <div
      data-message-id={message.id}
      className={`flex px-4 py-2 transition-colors ${
        isPending ? 'opacity-75' : ''
      } bg-white ${isMine ? '' : 'pl-10'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar placeholder */}
      <div className="flex-shrink-0">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold ${
            isMine
              ? 'border-slate-300 bg-white text-slate-700'
              : 'border-amber-200 bg-amber-100 text-amber-800'
          }`}
        >
          {(message.user.nickname || '?').slice(0, 1).toUpperCase()}
        </div>
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        {/* Header: name + time */}
        <div className="flex items-center gap-2">
          <p
            className={`font-medium ${
              isMine ? 'text-slate-900' : 'text-amber-900'
            }`}
          >
            {message.user.nickname}
          </p>
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

        {/* Reply indicator */}
        {replyMessage && (
          <div className="mt-1 mb-2 border-l-2 border-blue-400 bg-slate-50 pl-3 py-1 rounded-r">
            <p className="text-xs text-slate-600">
              <MessageCircle className="inline h-3 w-3 mr-1" />
              <span className="font-medium">{replyMessage.user.nickname}</span>님에게 답장
            </p>
            <p className="text-xs text-slate-500 line-clamp-1">
              {replyMessage.is_deleted ? '삭제된 메시지' : replyMessage.content}
            </p>
          </div>
        )}

        {/* Message body */}
        <p className="break-words text-slate-800">{message.content}</p>

        {/* Like count */}
        {message.like_count > 0 && (
          <div className="mt-1 text-xs text-slate-600">
            👍 {message.like_count}명
          </div>
        )}

        {/* Read receipt */}
        <ReadReceipt readStatus={readStatus} />
      </div>

      {/* Action buttons */}
      {shouldShowActions && (
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
            disabled={isLiking}
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
