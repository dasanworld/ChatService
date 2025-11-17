'use client';

import { use, useEffect } from 'react';
import { useActiveRoom } from '@/features/active-room/context/ActiveRoomContext';
import { useLongPolling } from '@/features/active-room/hooks/useLongPolling';
import { MessageList } from '@/features/active-room/components/MessageList';
import { MessageInput } from '@/features/active-room/components/MessageInput';
import { NetworkBanner } from '@/features/active-room/components/NetworkBanner';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

type ChatPageProps = {
  params: Promise<{ id: string }>;
};

export default function ChatPage({ params }: ChatPageProps) {
  const { id: roomId } = use(params);
  const router = useRouter();
  const { setRoom, clearRoom } = useActiveRoom();

  // Start Long Polling
  useLongPolling(roomId);

  // Set room on mount
  useEffect(() => {
    setRoom(roomId);

    return () => {
      clearRoom();
    };
  }, [roomId, setRoom, clearRoom]);

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="p-1"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              채팅방
            </h1>
            <p className="text-xs text-slate-500">
              {roomId}
            </p>
          </div>
        </div>
      </div>

      {/* Network banner */}
      <NetworkBanner />

      {/* Messages list */}
      <MessageList roomId={roomId} />

      {/* Input area */}
      <MessageInput roomId={roomId} />
    </div>
  );
}
