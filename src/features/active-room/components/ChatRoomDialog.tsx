'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useActiveRoom } from '@/features/active-room/context/ActiveRoomContext';
import { useLongPolling } from '@/features/active-room/hooks/useLongPolling';
import { MessageList } from '@/features/active-room/components/MessageList';
import { MessageInput } from '@/features/active-room/components/MessageInput';
import { NetworkBanner } from '@/features/active-room/components/NetworkBanner';
import { usePresence } from '@/features/realtime/hooks/usePresence';
import { UserPresenceDisplay } from '@/features/realtime/components/UserPresence';
import { InviteDialog } from '@/features/invite/components/InviteDialog';
import { useUI } from '@/features/ui/context/UIContext';
import { useRoomList } from '@/features/room-list/context/RoomListContext';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { UserPlus, RefreshCw } from 'lucide-react';

export const ChatRoomDialog = () => {
  const { modals, currentChatRoomId, closeChatRoom } = useUI();
  const { setRoom, clearRoom } = useActiveRoom();
  const { onlineUsers } = usePresence(currentChatRoomId);
  const { rooms } = useRoomList();
  const { user } = useCurrentUser();
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [width, setWidth] = useState(768); // Default width in pixels
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Start Long Polling when room is open
  useLongPolling(currentChatRoomId);

  const currentRoom = rooms.find((room) => room.id === currentChatRoomId);
  const roomTitle = currentRoom?.name ?? '채팅방';
  const userLabel =
    (typeof user?.userMetadata?.nickname === 'string' && user.userMetadata.nickname) ||
    user?.email ||
    '알 수 없는 사용자';

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

  const handleRefresh = () => {
    if (!currentChatRoomId) return;
    setIsRefreshing(true);
    // Clear room to reset all state
    clearRoom();
    // Wait a bit then set room again to trigger fresh snapshot
    setTimeout(() => {
      setRoom(currentChatRoomId);
      setIsRefreshing(false);
    }, 200);
  };

  // Resize handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isResizingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = width;
    e.preventDefault();
  }, [width]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;
    
    const deltaX = startXRef.current - e.clientX;
    const newWidth = Math.min(Math.max(400, startWidthRef.current + deltaX), window.innerWidth - 100);
    setWidth(newWidth);
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizingRef.current = false;
  }, []);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <>
      <Sheet open={modals.chatRoom} onOpenChange={(open) => !open && handleClose()}>
        <SheetContent 
          side="right" 
          className="flex flex-col p-0"
          style={{ width: `${width}px`, maxWidth: 'none' }}
        >
          {/* Resize handle */}
          <div
            className="absolute left-0 top-0 h-full w-1 cursor-ew-resize hover:bg-blue-500 transition-colors"
            onMouseDown={handleMouseDown}
          />

          {/* Header */}
          <SheetHeader className="border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SheetTitle className="text-xl font-semibold">
                  {roomTitle}
                </SheetTitle>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-xs text-slate-500">참여자</span>
                  <span className="text-sm font-medium text-slate-700">
                    {userLabel}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="h-8 w-8 p-0"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <div className="flex items-center gap-2">
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
          <div className="p-4">
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
