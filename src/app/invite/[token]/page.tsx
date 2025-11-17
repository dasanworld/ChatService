import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { validateInviteToken } from "@/features/auth/server/invite-service";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import { SignupForm } from "@/features/auth/components/SignupForm";

type InvitePageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = await params;

  // Validate the invite token server-side
  const validationResponse = await validateInviteToken(token);

  if (!validationResponse.ok || !validationResponse.data.isValid) {
    // If the token is invalid, redirect to the invalid invite page
    redirect('/invalid-invite');
  }

  // Check authentication status server-side
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // If user is authenticated, add them to the room and redirect
    // For now, just redirect to the chat page
    redirect(`/chat/${token}`);
  }

  // The signup form will handle the invite token through props
  // Cookies can be set through server actions or redirects if needed

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-center gap-10 px-6 py-16">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-semibold">
          {token ? `${token}방에 초대되었습니다!` : '회원가입'}
        </h1>
        <p className="text-slate-500">
          계정을 만들고 채팅을 시작하세요.
        </p>
      </header>
      <div className="grid w-full gap-8 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-6 shadow-sm">
          <SignupForm defaultInviteToken={token} />
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