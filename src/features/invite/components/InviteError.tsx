'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

type InviteErrorProps = {
  message: string;
  onRetry: () => void;
};

export const InviteError = ({ message, onRetry }: InviteErrorProps) => {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-10 px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 text-6xl">⚠️</div>
        <h1 className="mb-2 text-2xl font-semibold text-rose-600">초대 링크 오류</h1>
        <p className="mb-8 text-slate-600">{message}</p>
        <div className="flex flex-col gap-3">
          <Button onClick={onRetry}>다시 시도</Button>
          <Button asChild variant="outline">
            <Link href="/">메인으로 가기</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};
