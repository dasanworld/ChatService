"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";

type ChatPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ChatPage({ params }: ChatPageProps) {
  const { id: roomId } = await params;
  const router = useRouter();
  const { isAuthenticated, isLoading } = useCurrentUser();

  useEffect(() => {
    // If user is not authenticated and not loading, redirect to invite page
    if (!isLoading && !isAuthenticated) {
      router.replace(`/invite/${roomId}`);
    }
    // If user is authenticated, we could handle joining the room
    // For now, this will be handled by the chat page logic once created
  }, [isAuthenticated, isLoading, router, roomId]);

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>인증을 위한 리다이렉트 중...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1>채팅방: {roomId}</h1>
      <p>채팅방에 참여 중입니다...</p>
    </div>
  );
}