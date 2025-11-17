'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSendMessage } from '../hooks/useSendMessage';
import { useActiveRoom } from '../context/ActiveRoomContext';
import { useNetwork } from '@/features/network/context/NetworkContext';
import { useTypingIndicator } from '@/features/realtime/hooks/useTypingIndicator';
import { TypingIndicator } from '@/features/realtime/components/TypingIndicator';
import { Send, X } from 'lucide-react';

interface MessageInputProps {
  roomId: string;
}

export const MessageInput = ({ roomId }: MessageInputProps) => {
  const { sendMessage, isSending, error, clearError } = useSendMessage(roomId);
  const { replyTarget, clearReplyTarget } = useActiveRoom();
  const { isOnline } = useNetwork();
  const { typingUsers, handleTyping } = useTypingIndicator(roomId);
  const [content, setContent] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim() || isSending || !isOnline) {
      return;
    }

    try {
      await sendMessage(content, {
        replyToMessageId: replyTarget?.id,
      });
      setContent('');
      // Use setTimeout to ensure focus after all state updates
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } catch (err) {
      // Error is already set in the hook
      // Restore focus even on error
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  return (
    <div className="border-t border-slate-200 bg-white p-4">
      {/* Reply target indicator */}
      {replyTarget && (
        <div className="mb-3 flex items-center gap-2 rounded bg-slate-50 p-2 text-sm">
          <div className="flex-1">
            <p className="text-slate-500">
              <span className="font-medium text-slate-700">{replyTarget.user.nickname}</span>
              님에게 답장 중
            </p>
            <p className="line-clamp-1 text-slate-600">{replyTarget.content}</p>
          </div>
          <button
            onClick={() => clearReplyTarget()}
            className="p-1 hover:bg-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-3 flex items-center justify-between rounded bg-red-50 p-2 text-sm text-red-700">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="p-1 hover:bg-red-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Typing indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          ref={inputRef}
          type="text"
          placeholder={
            !isOnline ? '오프라인 상태입니다' : '메시지를 입력하세요...'
          }
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            handleTyping();
          }}
          disabled={isSending || !isOnline}
          maxLength={5000}
          className="flex-1"
        />
        <Button
          type="submit"
          disabled={!content.trim() || isSending || !isOnline}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {/* Character count */}
      {content.length > 0 && (
        <p className="mt-2 text-right text-xs text-slate-500">
          {content.length} / 5000
        </p>
      )}
    </div>
  );
};
