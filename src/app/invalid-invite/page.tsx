"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function InvalidInvitePage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-rose-600">유효하지 않은 초대 링크입니다</h1>
        <p className="mt-2 text-slate-600">
          요청하신 초대 링크가 유효하지 않거나 만료되었습니다.
        </p>
      </div>
      <Link href="/" className="w-full max-w-xs">
        <Button className="w-full" variant="default">
          메인으로 가기
        </Button>
      </Link>
    </div>
  );
}