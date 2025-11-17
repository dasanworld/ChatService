"use client";

import { useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, MessageCircle, Users, Share2, Zap } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { user, isAuthenticated, isLoading, refresh } = useCurrentUser();
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    await refresh();
    router.replace("/");
  }, [refresh, router]);

  const authActions = useMemo(() => {
    if (isLoading) {
      return (
        <span className="text-sm text-slate-500">세션 확인 중...</span>
      );
    }

    if (isAuthenticated && user) {
      return (
        <div className="flex items-center gap-3 text-sm text-slate-700">
          <span className="truncate">{user.email ?? "알 수 없는 사용자"}</span>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
            >
              홈
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border border-blue-200 px-3 py-1 text-blue-600 transition hover:border-blue-300 hover:bg-blue-50"
            >
              대시보드
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex items-center gap-1 rounded-md bg-slate-200 px-3 py-1 text-slate-700 transition hover:bg-slate-300"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/"
          className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
        >
          홈
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
        >
          로그인
        </Link>
        <Link
          href="/signup"
          className="rounded-md bg-blue-600 px-3 py-1 text-white transition hover:bg-blue-700"
        >
          회원가입
        </Link>
      </div>
    );
  }, [handleSignOut, isAuthenticated, isLoading, user]);

  return (
    <main className="min-h-screen bg-white text-slate-900 flex flex-col">
      {/* Global Navigation */}
      <nav className="border-b border-slate-200 bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-slate-900">
            ChatService
          </Link>
          <div>{authActions}</div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-16 px-6 py-20 flex-1">
        {/* Hero Section */}
        <section className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-5xl font-bold tracking-tight text-slate-900 md:text-6xl">
              간편한 실시간 채팅
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl">
              친구들과 언제 어디서나 쉽게 메시지를 주고받으세요. 초대 링크 하나로 즉시 시작할 수 있습니다.
            </p>
          </div>

          {!isAuthenticated && (
            <div className="flex gap-3 pt-4">
              <Link href="/signup">
                <Button className="bg-blue-600 hover:bg-blue-700 px-6 py-2 text-base">
                  지금 시작하기
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" className="px-6 py-2 text-base">
                  로그인
                </Button>
              </Link>
            </div>
          )}

          {isAuthenticated && (
            <div className="flex gap-3 pt-4">
              <Link href="/dashboard">
                <Button className="bg-blue-600 hover:bg-blue-700 px-6 py-2 text-base">
                  대시보드 가기
                </Button>
              </Link>
            </div>
          )}
        </section>

        {/* Features Section */}
        <section className="space-y-8">
          <h2 className="text-3xl font-bold text-slate-900">주요 기능</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <MessageCircle className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">실시간 메시징</h3>
              </div>
              <p className="text-slate-600">
                메시지가 즉시 전달됩니다. 더 빠른 대화, 더 강한 연결.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <Share2 className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">초대 링크</h3>
              </div>
              <p className="text-slate-600">
                링크 하나만 공유하면 누구나 채팅방에 참여할 수 있습니다.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">활동 표시</h3>
              </div>
              <p className="text-slate-600">
                누가 온라인인지 확인하고 실시간으로 상호작용하세요.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="space-y-8">
          <h2 className="text-3xl font-bold text-slate-900">어떻게 시작하나요?</h2>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex gap-4 rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-semibold text-sm">
                1
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">계정 만들기</h3>
                <p className="text-sm text-slate-600">이메일과 비밀번호로 간단하게 가입하세요.</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-semibold text-sm">
                2
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">채팅방 생성 또는 참여</h3>
                <p className="text-sm text-slate-600">새 채팅방을 만들거나 초대 링크로 참여하세요.</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-semibold text-sm">
                3
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">채팅 시작</h3>
                <p className="text-sm text-slate-600">친구들과 실시간으로 메시지를 주고받으세요.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        {!isAuthenticated && (
          <section className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 p-12 text-white text-center space-y-4">
            <h2 className="text-3xl font-bold">지금 바로 시작하세요</h2>
            <p className="text-blue-100 text-lg max-w-2xl mx-auto">
              ChatService와 함께 더 쉽고 빠르게 소통하세요.
            </p>
            <div className="flex gap-3 justify-center pt-4">
              <Link href="/signup">
                <Button className="bg-white text-blue-600 hover:bg-slate-100 px-6 py-2 text-base font-semibold">
                  무료로 시작하기
                </Button>
              </Link>
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-6">
        <div className="mx-auto max-w-6xl text-center text-sm text-slate-600">
          <div>&copy; 2025 ChatService. 모든 권리 보유.</div>
        </div>
      </footer>
    </main>
  );
}
