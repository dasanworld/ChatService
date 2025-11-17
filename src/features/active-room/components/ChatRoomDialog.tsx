'use client';

import { useEffect, useState } from 'react';
import { useActiveRoom } from '@/features/active-room/context/ActiveRoomContext';
import { useLongPolling } from '@/features/active-room/hooks/useLongPolling';
import { MessageList } from '@/features/active-room/components/MessageList';
import { MessageInput } from '@/features/active-room/components/MessageInput';
import { NetworkBanner } from '@/features/active-room/components/NetworkBanner';
import { usePresence } from '@/features/realtime/hooks/usePresence';
import { UserPresenceDisplay } from '@/features/realtime/components/UserPresence';
import { InviteDialog } from '@/features/invite/components/InviteDialog';
import { useUI } from '@/features/ui/context/UIContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';

export const ChatRoomDialog = () => {
  const { modals, currentChatRoomId, closeChatRoom } = useUI();
  const { setRoom, clearRoom } = useActiveRoom();
  const { onlineUsers } = usePresence(currentChatRoomId);
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  // Start Long Polling when room is open
  useLongPolling(currentChatRoomId);

  // Set/clear room when dialog opens/closes
  useEffect(() => {
    if (modals.chatRoom && currentChatRoomId) {
      setRoom(currentChatRoomId);
    } else {
      clearRoom();
    }
  }, [modals.chatRoom, currentChatRoomId, setRoom, clearRoom]);

  const handleClose = () => {
    setShowInviteDialog(false);
    closeChatRoom();
  };

  return (
    <>
      <Sheet open={modals.chatRoom} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent 
          side="right" 
          className="flex w-full flex-col p-0 sm:max-w-2xl lg:max-w-4xl"
        >
          {/* Header */}
          <SheetHeader className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="text-xl font-semibold">채팅방</SheetTitle>
                {currentChatRoomId && (
                  <p className="mt-1 text-xs text-slate-500">
                    {currentChatRoomId}
                  </p>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowInviteDialog(true)}
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                초대
              </Button>
            </div>
          </SheetHeader>

          {/* Network banner */}
          <NetworkBanner />

          {/* User presence */}
          {currentChatRoomId && <UserPresenceDisplay onlineUsers={onlineUsers} />}

          {/* Messages area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {currentChatRoomId && <MessageList roomId={currentChatRoomId} />}
          </div>

          {/* Input area */}
          <div className="border-t border-slate-200 p-4">
            {currentChatRoomId && <MessageInput roomId={currentChatRoomId} />}
          </div>
        </SheetContent>
      </Sheet>

      {/* Invite Dialog */}
      {currentChatRoomId && (
        <InviteDialog
          roomId={currentChatRoomId}
          isOpen={showInviteDialog}
          onClose={() => setShowInviteDialog(false)}
        />
      )}
    </>
  );
};
