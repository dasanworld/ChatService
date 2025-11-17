"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/features/auth/hooks/useCurrentUser";
import { useUI } from "@/features/ui/context/UIContext";
import { RoomList } from "@/features/room-list/components/RoomList";
import { CreateRoomModal } from "@/features/room-list/components/CreateRoomModal";
import { LeaveRoomModal } from "@/features/room-list/components/LeaveRoomModal";
import { ChatRoomDialog } from "@/features/active-room/components/ChatRoomDialog";
import { MessageSquarePlus } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

type DashboardPageProps = {
  params: Promise<Record<string, never>>;
};

export default function DashboardPage({ params }: DashboardPageProps) {
  void params;
  const { user, logout } = useCurrentUser();
  const { openModal, openChatRoom } = useUI();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");

  useEffect(() => {
    // Debug: Check session
    const checkSession = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        setDebugInfo(`❌ Session Error: ${error.message}`);
      } else if (session) {
        setDebugInfo(`✅ Session OK - User: ${session.user.email}`);
      } else {
        setDebugInfo(`⚠️ No session found`);
      }
    };
    
    checkSession();
  }, []);

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
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-12">
      {/* Debug Info */}
      {debugInfo && (
        <div className="rounded bg-slate-100 p-2 text-xs font-mono">
          {debugInfo}
        </div>
      )}

      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
          <p className="mt-2 text-gray-600">
            {user?.email ?? "알 수 없는 사용자"} 님, 환영합니다.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? "로그아웃 중..." : "로그아웃"}
        </Button>
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
          <Button
            onClick={() => openModal("createRoom")}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <MessageSquarePlus className="h-4 w-4" />
            <span className="ml-2">새 채팅방</span>
          </Button>
        </div>

        {/* Room List */}
        <RoomList />
      </section>

      {/* Modals */}
      <CreateRoomModal />
      <LeaveRoomModal />
      <ChatRoomDialog />
    </div>
  );
}
