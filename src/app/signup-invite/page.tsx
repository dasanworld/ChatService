"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { SignupForm } from "@/features/auth/components/SignupForm";

type SignupInvitePageProps = {
  params: Promise<Record<string, never>>;
};

export default function SignupInvitePage({ params }: SignupInvitePageProps) {
  void params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useCurrentUser();
  const inviteToken = searchParams.get('invite');

  useEffect(() => {
    if (isAuthenticated) {
      // If authenticated, redirect to the invite room
      if (inviteToken) {
        router.replace(`/chat/${inviteToken}`);
      } else {
        router.replace('/dashboard');
      }
    }
  }, [isAuthenticated, inviteToken, router]);

  if (isAuthenticated) {
    return null;
  }

  if (!inviteToken) {
    // If no invite token, redirect to regular signup
    router.replace('/signup');
    return null;
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-10 px-6 py-16">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-semibold">
          {inviteToken ? `${inviteToken}방에 초대되었습니다!` : '회원가입'}
        </h1>
        <p className="text-slate-500">
          계정을 만들고 채팅을 시작하세요.
        </p>
      </header>
      <div className="grid w-full gap-8 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-6 shadow-sm">
          <SignupForm defaultInviteToken={inviteToken} />
          <p className="mt-4 text-xs text-slate-500">
            이미 계정이 있으신가요?{" "}
            <Link
              href="/login"
              className="font-medium text-slate-700 underline hover:text-slate-900"
            >
              로그인으로 이동
            </Link>
          </p>
        </div>
        <figure className="overflow-hidden rounded-xl border border-slate-200">
          <Image
            src="https://picsum.photos/seed/signup-invite/640/640"
            alt="초대 회원가입"
            width={640}
            height={640}
            className="h-full w-full object-cover"
            priority
          />
        </figure>
      </div>
    </div>
  );
}