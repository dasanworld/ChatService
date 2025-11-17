'use client';

import { use } from 'react';
import { useInvite } from '@/features/invite/hooks/useInvite';
import { InviteAuthWall } from '@/features/invite/components/InviteAuthWall';
import { InviteError } from '@/features/invite/components/InviteError';

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default function InvitePage({ params }: InvitePageProps) {
  const { token } = use(params);
  const { state, retry } = useInvite(token);

  if (state.status === 'loading' || state.status === 'joining') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">⏳</div>
          <p className="text-slate-600">
            {state.status === 'loading' ? '초대 확인 중...' : '방에 참여하는 중...'}
          </p>
        </div>
      </div>
    );
  }

  if (state.status === 'error') {
    return <InviteError message={state.message} onRetry={retry} />;
  }

  if (state.status === 'unauthenticated') {
    return (
      <InviteAuthWall roomName={state.roomName} roomId={state.roomId} />
    );
  }

  // Success state redirects automatically
  return null;
}