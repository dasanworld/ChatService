'use client';

import { useState } from 'react';
import { useUI } from '@/features/ui/context/UIContext';
import { useJoinRoom } from '../hooks/useJoinRoom';
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

export const JoinRoomDialog = () => {
  const { closeModal, isModalOpen, showToast, openChatRoom } = useUI();
  const { isLoading, error, setError, verifyAndJoin } = useJoinRoom();
  const [inviteCode, setInviteCode] = useState('');

  const isOpen = isModalOpen('joinRoom');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inviteCode.trim()) {
      showToast('error', '초대 코드를 입력해주세요', 3000);
      return;
    }

    const result = await verifyAndJoin(inviteCode);

    if (result) {
      showToast(
        'success',
        `"${result.roomName}" 채팅방에 참여했습니다`,
        3000
      );
      setInviteCode('');
      setError(null);
      closeModal('joinRoom');
      // Open the joined room
      openChatRoom(result.roomId);
    } else if (error) {
      showToast('error', error, 3000);
    }
  };

  const handleClose = () => {
    setInviteCode('');
    setError(null);
    closeModal('joinRoom');
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>채팅방 참여하기</AlertDialogTitle>
          <AlertDialogDescription>
            초대 코드 또는 초대 링크를 입력하여 채팅방에 참여해보세요.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="invite-code"
              className="block text-sm font-medium text-slate-700"
            >
              초대 코드
            </label>
            <Input
              id="invite-code"
              placeholder="초대 코드 또는 초대 링크를 입력하세요"
              value={inviteCode}
              onChange={(e) => {
                setInviteCode(e.target.value);
                setError(null);
              }}
              disabled={isLoading}
              maxLength={255}
              autoFocus
            />
            <p className="text-xs text-slate-500">
              예: abc123def456 또는 https://example.com/invite/abc123def456
            </p>
            {error && (
              <p className="text-xs text-red-500 font-medium">{error}</p>
            )}
          </div>
        </form>

        <div className="flex gap-3">
          <AlertDialogCancel
            onClick={handleClose}
            disabled={isLoading}
          >
            취소
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={isLoading || !inviteCode.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? '참여 중...' : '참여하기'}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};
