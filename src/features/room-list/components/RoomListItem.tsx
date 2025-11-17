'use client';

import { useUI } from '@/features/ui/context/UIContext';
import { Button } from '@/components/ui/button';
import { MessageCircle, Users, LogOut } from 'lucide-react';
import type { Room } from '../types';

interface RoomListItemProps {
  room: Room;
}

export const RoomListItem = ({ room }: RoomListItemProps) => {
  const { openModal, openChatRoom } = useUI();

  const handleRoomClick = () => {
    openChatRoom(room.id);
  };

  const handleLeaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Store room ID in sessionStorage for modal to access
    sessionStorage.setItem('leave_room_id', room.id);
    openModal('leaveRoom');
  };

  return (
    <div
      onClick={handleRoomClick}
      className="block cursor-pointer rounded-lg border border-slate-200 p-4 transition-all hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Room info */}
        <div className="flex-1 space-y-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <MessageCircle className="h-5 w-5 text-blue-500" />
            {room.name}
          </h3>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {room.participant_count ?? 0}명
            </span>
            <span className="text-slate-500">
              {new Date(room.created_at).toLocaleDateString('ko-KR')}
            </span>
          </div>
        </div>

        {/* Leave button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleLeaveClick}
          className="text-red-600 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto"
        >
          <LogOut className="h-4 w-4" />
          <span className="ml-1">나가기</span>
        </Button>
      </div>
    </div>
  );
};
