'use client';

import { useEffect, useState } from 'react';
import { useUI } from '@/features/ui/context/UIContext';
import { useLeaveRoom } from '../hooks/useLeaveRoom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export const LeaveRoomModal = () => {
  const { closeModal, isModalOpen, showToast } = useUI();
  const { mutate: leaveRoom, isPending } = useLeaveRoom();
  const [roomId, setRoomId] = useState<string | null>(null);

  const isOpen = isModalOpen('leaveRoom');

  // Load room ID from sessionStorage
  useEffect(() => {
    if (isOpen) {
      const storedRoomId = sessionStorage.getItem('leave_room_id');
      setRoomId(storedRoomId);
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!roomId) return;

    leaveRoom(roomId, {
      onSuccess: () => {
        showToast('success', '방을 나갔습니다', 3000);
        sessionStorage.removeItem('leave_room_id');
        setRoomId(null);
        closeModal('leaveRoom');
      },
      onError: (error) => {
        const message =
          error instanceof Error ? error.message : '방 나가기에 실패했습니다';
        showToast('error', message, 3000);
      },
    });
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>방을 나가시겠어요?</AlertDialogTitle>
          <AlertDialogDescription>
            이 채팅방에서 나가면 메시지 목록에서 제거됩니다.
            다시 참여하려면 초대 링크가 필요합니다.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex gap-3">
          <AlertDialogCancel
            onClick={() => {
              sessionStorage.removeItem('leave_room_id');
              setRoomId(null);
              closeModal('leaveRoom');
            }}
            disabled={isPending}
          >
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending ? '나가는 중...' : '나가기'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
