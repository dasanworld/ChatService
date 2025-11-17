'use client';

import { useState } from 'react';
import { useUI } from '@/features/ui/context/UIContext';
import { useCreateRoom } from '../hooks/useCreateRoom';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';

export const CreateRoomModal = () => {
  const { closeModal, isModalOpen, showToast, openChatRoom } = useUI();
  const { mutate: createRoom, isPending } = useCreateRoom();
  const [roomName, setRoomName] = useState('');

  const isOpen = isModalOpen('createRoom');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomName.trim()) {
      showToast('error', '방 이름을 입력해주세요', 3000);
      return;
    }

    createRoom(
      { name: roomName },
      {
        onSuccess: (newRoom) => {
          showToast('success', '채팅방이 생성되었습니다', 3000);
          setRoomName('');
          closeModal('createRoom');
          // Open chat dialog instead of navigating to a page
          openChatRoom(newRoom.id);
        },
        onError: (error) => {
          const message =
            error instanceof Error ? error.message : '방 생성에 실패했습니다';
          showToast('error', message, 3000);
        },
      },
    );
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>새 채팅방 만들기</AlertDialogTitle>
          <AlertDialogDescription>
            함께 대화할 새로운 채팅방을 만들어보세요.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="room-name"
              className="block text-sm font-medium text-slate-700"
            >
              방 이름
            </label>
            <Input
              id="room-name"
              placeholder="예: 프로젝트 팀, 독서 모임"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              disabled={isPending}
              maxLength={100}
              autoFocus
            />
            <p className="text-xs text-slate-500">
              {roomName.length}/100
            </p>
          </div>
        </form>

        <div className="flex gap-3">
          <AlertDialogCancel
            onClick={() => {
              setRoomName('');
              closeModal('createRoom');
            }}
            disabled={isPending}
          >
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={isPending || !roomName.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isPending ? '생성 중...' : '만들기'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
