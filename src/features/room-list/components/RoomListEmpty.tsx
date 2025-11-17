'use client';

import { useUI } from '@/features/ui/context/UIContext';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus } from 'lucide-react';

export const RoomListEmpty = () => {
  const { openModal } = useUI();

  return (
    <div className="rounded-lg border-2 border-dashed border-slate-300 p-12 text-center">
      <div className="mx-auto w-fit">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <MessageSquarePlus className="h-8 w-8 text-slate-400" />
        </div>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-slate-900">
        아직 참여한 채팅방이 없습니다
      </h3>
      <p className="mb-6 text-slate-600">
        새로운 채팅방을 만들거나 초대 링크를 통해 참여해보세요.
      </p>
      <Button onClick={() => openModal('createRoom')}>
        <MessageSquarePlus className="h-4 w-4" />
        <span className="ml-2">채팅방 만들기</span>
      </Button>
    </div>
  );
};
