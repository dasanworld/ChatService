'use client';

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useActiveRoom } from '../context/ActiveRoomContext';
import { apiClient, extractApiErrorMessage } from '@/lib/remote/api-client';
import { useReadReceipts } from '@/features/read-receipt/hooks/useReadReceipts';
import { MessageItem } from './MessageItem';
import { Loader } from 'lucide-react';

interface MessageListProps {
  roomId: string;
}

export const MessageList = ({ roomId }: MessageListProps) => {
  const {
    messages,
    pendingMessages,
    visibleMessages,
    hiddenMessageIds,
    likedMessageIds,
    hasMoreHistory,
    isLoadingHistory,
    isSnapshotLoaded,
    loadHistory,
  } = useActiveRoom();

  const { readStatuses } = useReadReceipts(roomId);
  const [isMounted, setIsMounted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Combine visible messages and pending messages for display
  const displayMessages = useMemo(() => {
    const combined = [...visibleMessages];

    // Add pending messages at the end
    pendingMessages.forEach((msg) => {
      if (!combined.find((m) => m.id === msg.id)) {
        combined.push(msg);
      }
    });

    return combined;
  }, [visibleMessages, pendingMessages]);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (shouldAutoScrollRef.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages, scrollToBottom]);

  // Handle scroll up to load history
  const handleScroll = useCallback(
    async (e: React.UIEvent<HTMLDivElement>) => {
      const container = e.currentTarget;

      // Check if scrolled to top
      if (container.scrollTop < 100 && !isLoadingHistory && hasMoreHistory) {
        shouldAutoScrollRef.current = false;

        try {
          const firstMessage = displayMessages[0];
          const response = await apiClient.get(
            `/api/rooms/${roomId}/messages/history`,
            {
              params: {
                beforeMessageId: firstMessage?.id,
                limit: 50,
              },
            },
          );

          const { messages: newMessages, hasMore } = response.data;
          loadHistory(newMessages, hasMore);
        } catch (error) {
          const msg = extractApiErrorMessage(error, '메시지 로드 실패');
          console.error(msg);
        }
      } else {
        // Detect if user scrolled down to re-enable auto-scroll
        shouldAutoScrollRef.current =
          container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      }
    },
    [displayMessages, isLoadingHistory, hasMoreHistory, roomId, loadHistory],
  );

  // Loading indicator - show only until snapshot is loaded
  if (!isMounted || !isSnapshotLoaded) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        <div className="text-center">
          <Loader className="mb-2 h-6 w-6 animate-spin mx-auto" />
          <p>메시지를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Empty state - snapshot loaded but no messages
  if (messages.length === 0 && pendingMessages.size === 0) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">아직 메시지가 없습니다</p>
          <p className="text-sm">첫 메시지를 보내보세요!</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={messagesContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto space-y-1"
    >
      {/* Load history button */}
      {hasMoreHistory && (
        <div className="flex justify-center py-4">
          <button
            onClick={() => {
              shouldAutoScrollRef.current = false;
              const firstMessage = displayMessages[0];
              if (firstMessage) {
                apiClient
                  .get(`/api/rooms/${roomId}/messages/history`, {
                    params: { beforeMessageId: firstMessage.id, limit: 50 },
                  })
                  .then((res) => {
                    loadHistory(res.data.messages, res.data.hasMore);
                  });
              }
            }}
            disabled={isLoadingHistory}
            className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50"
          >
            {isLoadingHistory ? '로드 중...' : '더 이전 메시지 로드'}
          </button>
        </div>
      )}

      {/* Messages */}
      {displayMessages.map((message) => {
        const isPending = pendingMessages.has(message.client_message_id || '');
        const isLiked = likedMessageIds.has(message.id);
        const isHidden = hiddenMessageIds.has(message.id);
        const readStatus = readStatuses.get(message.id);

        return (
          <MessageItem
            key={message.id || message.client_message_id}
            message={message}
            isPending={isPending}
            isLiked={isLiked}
            isHidden={isHidden}
            readStatus={readStatus}
          />
        );
      })}

      {/* Scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
};
