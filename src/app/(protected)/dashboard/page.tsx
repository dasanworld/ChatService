"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useUI } from "@/features/ui/context/UIContext";
import { RoomList } from "@/features/room-list/components/RoomList";
import { CreateRoomModal } from "@/features/room-list/components/CreateRoomModal";
import { JoinRoomDialog } from "@/features/room-list/components/JoinRoomDialog";
import { LeaveRoomModal } from "@/features/room-list/components/LeaveRoomModal";
import { ChatRoomDialog } from "@/features/active-room/components/ChatRoomDialog";
import { MessageSquarePlus, LogOut, UserPlus } from "lucide-react";

type DashboardPageProps = {
  params: Promise<Record<string, never>>;
};

export default function DashboardPage({ params }: DashboardPageProps) {
  void params;
  const { user, logout } = useCurrentUser();
  const { openModal, openChatRoom } = useUI();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Auto-open chat room if redirected from invite
  useEffect(() => {
    const roomId = sessionStorage.getItem('open_chat_room');
    if (roomId) {
      sessionStorage.removeItem('open_chat_room');
      // Small delay to ensure dashboard is mounted
      setTimeout(() => {
        openChatRoom(roomId);
      }, 100);
    }
  }, [openChatRoom]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Global Navigation */}
      <nav className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-slate-900">
            ChatService
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-slate-600 hover:text-slate-900 transition">
              홈
            </Link>
            <span className="text-sm text-slate-600">
              {user?.email ?? "알 수 없는 사용자"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12 w-full">
        {/* Header */}
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
          <p className="text-gray-600">
            {user?.email ?? "알 수 없는 사용자"} 님, 환영합니다.
          </p>
        </header>

        {/* Room List Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                내 채팅방
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                참여 중인 채팅방 목록입니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => openModal("createRoom")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <MessageSquarePlus className="h-4 w-4" />
                <span className="ml-2">새 채팅방</span>
              </Button>
              <Button
                onClick={() => openModal("joinRoom")}
                variant="outline"
              >
                <UserPlus className="h-4 w-4" />
                <span className="ml-2">채팅방 참여하기</span>
              </Button>
            </div>
          </div>

          {/* Room List */}
          <RoomList />
        </section>

        {/* Modals */}
        <CreateRoomModal />
        <JoinRoomDialog />
        <LeaveRoomModal />
        <ChatRoomDialog />
      </div>
    </div>
  );
}
