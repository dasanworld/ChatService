'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';

type InviteAuthWallProps = {
  roomName: string;
  roomId: string;
};

export const InviteAuthWall = ({ roomName, roomId }: InviteAuthWallProps) => {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 text-6xl">💬</div>
        <h1 className="mb-2 text-2xl font-semibold">'{roomName}' 방에 초대되었습니다!</h1>
        <p className="mb-8 text-slate-600">채팅에 참여하려면 로그인이 필요합니다.</p>
        <div className="flex flex-col gap-3">
          <Button asChild>
            <Link
              href={
                inviteToken
                  ? `/signup?invite=${inviteToken}`
                  : `/signup?invite=${roomId}`
              }
              className="inline-block"
            >
              가입하고 합류하기
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link
              href={
                inviteToken
                  ? `/login?invite=${inviteToken}`
                  : `/login?invite=${roomId}`
              }
              className="inline-block"
            >
              이미 계정이 있어요
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};
