import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { LoginForm } from "@/features/auth/components/LoginForm";

type InviteLoginPageProps = {
  params: Promise<Record<string, never>>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function InviteLoginPage({ searchParams }: InviteLoginPageProps) {
  const searchParamsObj = await searchParams;
  const inviteToken = Array.isArray(searchParamsObj.invite) ? searchParamsObj.invite[0] : searchParamsObj.invite;

  if (!inviteToken) {
    // If no invite token, redirect to regular login
    redirect('/login');
  }

  // Check authentication status server-side
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // If user is authenticated, redirect to the chat room
    redirect(`/chat/${inviteToken}`);
  }

  // The login form will handle the invite token through props

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-10 px-6 py-16">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-semibold">
          {inviteToken ? `${inviteToken}방에 초대되었습니다!` : '로그인'}
        </h1>
        <p className="text-slate-500">
          계정에 로그인하고 채팅을 시작하세요.
        </p>
      </header>
      <div className="grid w-full gap-8 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-6 shadow-sm">
          <LoginForm defaultInviteToken={inviteToken} />
          <p className="mt-4 text-xs text-slate-500">
            계정이 없으신가요?{" "}
            <Link
              href={`/invite/${inviteToken}`}
              className="font-medium text-slate-700 underline hover:text-slate-900"
            >
              회원가입으로 이동
            </Link>
          </p>
        </div>
        <figure className="overflow-hidden rounded-xl border border-slate-200">
          <Image
            src="https://picsum.photos/seed/login-invite/640/640"
            alt="초대 로그인"
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