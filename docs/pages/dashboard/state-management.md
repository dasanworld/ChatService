# Dashboard Page - State Management Implementation

> **관련 문서**: docs/state-management.md, docs/pages/dashboard/plan.md  
> **Context**: AuthContext, RoomListContext, UIContext  
> **우선순위**: P0  
> **상태**: 미구현

---

## 📋 개요

대시보드 페이지는 채팅방 목록을 표시하고 관리합니다. **RoomListContext**가 핵심이며, AuthContext와 UIContext를 함께 사용합니다.

---

## 🎯 필요한 Context

### 1. AuthContext (필수)
```typescript
const {
  user,            // User | null
  isAuthenticated, // boolean
  logout,          // () => Promise<void>
} = useAuth();
```

### 2. RoomListContext (필수)
```typescript
const {
  sortedRooms,      // Room[] - 최신 활동순 정렬
  totalUnreadCount, // number
  selectedRoomId,   // string | null
  isLoading,        // boolean
  fetchRooms,       // () => Promise<void>
  createRoom,       // (name: string) => Promise<Room>
  leaveRoom,        // (roomId: string) => Promise<void>
  selectRoom,       // (roomId: string | null) => void
} = useRoomList();
```

### 3. UIContext (필수)
```typescript
const {
  openModal,      // (modal: 'createRoom' | 'leaveRoom') => void
  closeModal,     // (modal: string) => void
  showToast,      // (type, message) => void
} = useUI();
```

---

## 🏗️ 구현 계획

### Phase 1: RoomListContext 생성

#### 1.1 상태 정의 (`src/features/room-list/types.ts`)

```typescript
export interface RoomListState {
  rooms: Room[];
  selectedRoomId: string | null;
  status: 'idle' | 'loading' | 'loaded' | 'error';
  error: string | null;
}

export interface Room {
  id: string;
  name: string;
  lastMessage: {
    content: string;
    created_at: string;
    sender_nickname: string;
  } | null;
  unreadCount: number;
  participantCount: number;
  created_at: string;
  updated_at: string;
}

export type RoomListAction =
  | { type: 'FETCH_ROOMS_REQUEST' }
  | { type: 'FETCH_ROOMS_SUCCESS'; payload: { rooms: Room[] } }
  | { type: 'FETCH_ROOMS_FAILURE'; payload: { error: string } }
  | { type: 'CREATE_ROOM_SUCCESS'; payload: { room: Room } }
  | { type: 'LEAVE_ROOM_SUCCESS'; payload: { roomId: string } }
  | { type: 'SELECT_ROOM'; payload: { roomId: string | null } }
  | { type: 'UPDATE_LAST_MESSAGE'; payload: { roomId: string; message: Message } }
  | { type: 'INCREMENT_UNREAD'; payload: { roomId: string } }
  | { type: 'RESET_UNREAD'; payload: { roomId: string } };
```

---

#### 1.2 Reducer (`src/features/room-list/context/roomListReducer.ts`)

```typescript
import type { RoomListState, RoomListAction, Room } from '../types';

export const initialRoomListState: RoomListState = {
  rooms: [],
  selectedRoomId: null,
  status: 'idle',
  error: null,
};

export function roomListReducer(
  state: RoomListState,
  action: RoomListAction
): RoomListState {
  switch (action.type) {
    case 'FETCH_ROOMS_REQUEST':
      return {
        ...state,
        status: 'loading',
        error: null,
      };

    case 'FETCH_ROOMS_SUCCESS':
      return {
        ...state,
        rooms: action.payload.rooms,
        status: 'loaded',
        error: null,
      };

    case 'FETCH_ROOMS_FAILURE':
      return {
        ...state,
        status: 'error',
        error: action.payload.error,
      };

    case 'CREATE_ROOM_SUCCESS':
      return {
        ...state,
        rooms: [action.payload.room, ...state.rooms],
      };

    case 'LEAVE_ROOM_SUCCESS':
      return {
        ...state,
        rooms: state.rooms.filter(room => room.id !== action.payload.roomId),
        selectedRoomId: state.selectedRoomId === action.payload.roomId
          ? null
          : state.selectedRoomId,
      };

    case 'SELECT_ROOM':
      return {
        ...state,
        selectedRoomId: action.payload.roomId,
      };

    case 'UPDATE_LAST_MESSAGE': {
      const { roomId, message } = action.payload;
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === roomId
            ? {
                ...room,
                lastMessage: {
                  content: message.content,
                  created_at: message.created_at,
                  sender_nickname: message.user_nickname ?? 'Unknown',
                },
                updated_at: message.created_at,
              }
            : room
        ),
      };
    }

    case 'INCREMENT_UNREAD': {
      const { roomId } = action.payload;
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === roomId
            ? { ...room, unreadCount: room.unreadCount + 1 }
            : room
        ),
      };
    }

    case 'RESET_UNREAD': {
      const { roomId } = action.payload;
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === roomId
            ? { ...room, unreadCount: 0 }
            : room
        ),
      };
    }

    default:
      return state;
  }
}
```

---

#### 1.3 Context Provider (`src/features/room-list/context/RoomListContext.tsx`)

```typescript
"use client";

import {
  createContext,
  useReducer,
  useCallback,
  useMemo,
  useContext,
  type ReactNode,
} from 'react';
import { apiClient, extractApiErrorMessage, isAxiosError } from '@/lib/remote/api-client';
import { roomListReducer, initialRoomListState } from './roomListReducer';
import type { RoomListState, Room } from '../types';

interface RoomListContextValue extends RoomListState {
  sortedRooms: Room[];
  totalUnreadCount: number;
  selectedRoom: Room | null;
  isLoading: boolean;
  fetchRooms: () => Promise<void>;
  createRoom: (name: string) => Promise<Room>;
  leaveRoom: (roomId: string) => Promise<void>;
  selectRoom: (roomId: string | null) => void;
  updateLastMessage: (roomId: string, message: any) => void;
  incrementUnread: (roomId: string) => void;
  resetUnread: (roomId: string) => void;
}

const RoomListContext = createContext<RoomListContextValue | null>(null);

export function RoomListProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(roomListReducer, initialRoomListState);

  // Fetch rooms
  const fetchRooms = useCallback(async () => {
    dispatch({ type: 'FETCH_ROOMS_REQUEST' });

    try {
      const response = await apiClient.get('/api/rooms');
      const rooms = response.data.rooms ?? [];

      dispatch({
        type: 'FETCH_ROOMS_SUCCESS',
        payload: { rooms },
      });
    } catch (error) {
      const errorMessage = isAxiosError(error)
        ? extractApiErrorMessage(error, '채팅방 목록을 불러오는데 실패했습니다')
        : '채팅방 목록을 불러오는데 실패했습니다';

      dispatch({
        type: 'FETCH_ROOMS_FAILURE',
        payload: { error: errorMessage },
      });
    }
  }, []);

  // Create room
  const createRoom = useCallback(async (name: string) => {
    try {
      const response = await apiClient.post('/api/rooms', { name });
      const room = response.data;

      dispatch({
        type: 'CREATE_ROOM_SUCCESS',
        payload: { room },
      });

      return room;
    } catch (error) {
      throw error;
    }
  }, []);

  // Leave room
  const leaveRoom = useCallback(async (roomId: string) => {
    try {
      await apiClient.post(`/api/rooms/${roomId}/leave`);

      dispatch({
        type: 'LEAVE_ROOM_SUCCESS',
        payload: { roomId },
      });
    } catch (error) {
      throw error;
    }
  }, []);

  // Select room
  const selectRoom = useCallback((roomId: string | null) => {
    dispatch({
      type: 'SELECT_ROOM',
      payload: { roomId },
    });
  }, []);

  // Internal: Update last message (called by ActiveRoomContext)
  const updateLastMessage = useCallback((roomId: string, message: any) => {
    dispatch({
      type: 'UPDATE_LAST_MESSAGE',
      payload: { roomId, message },
    });
  }, []);

  // Internal: Increment unread
  const incrementUnread = useCallback((roomId: string) => {
    dispatch({
      type: 'INCREMENT_UNREAD',
      payload: { roomId },
    });
  }, []);

  // Internal: Reset unread
  const resetUnread = useCallback((roomId: string) => {
    dispatch({
      type: 'RESET_UNREAD',
      payload: { roomId },
    });
  }, []);

  // Computed: Sorted rooms (최신 활동순)
  const sortedRooms = useMemo(() => {
    return [...state.rooms].sort((a, b) => {
      const aTime = new Date(a.updated_at).getTime();
      const bTime = new Date(b.updated_at).getTime();
      return bTime - aTime;
    });
  }, [state.rooms]);

  // Computed: Total unread count
  const totalUnreadCount = useMemo(() => {
    return state.rooms.reduce((sum, room) => sum + room.unreadCount, 0);
  }, [state.rooms]);

  // Computed: Selected room
  const selectedRoom = useMemo(() => {
    return state.rooms.find(room => room.id === state.selectedRoomId) ?? null;
  }, [state.rooms, state.selectedRoomId]);

  const value = useMemo<RoomListContextValue>(() => ({
    ...state,
    sortedRooms,
    totalUnreadCount,
    selectedRoom,
    isLoading: state.status === 'loading',
    fetchRooms,
    createRoom,
    leaveRoom,
    selectRoom,
    updateLastMessage,
    incrementUnread,
    resetUnread,
  }), [
    state,
    sortedRooms,
    totalUnreadCount,
    selectedRoom,
    fetchRooms,
    createRoom,
    leaveRoom,
    selectRoom,
    updateLastMessage,
    incrementUnread,
    resetUnread,
  ]);

  return (
    <RoomListContext.Provider value={value}>
      {children}
    </RoomListContext.Provider>
  );
}

export function useRoomList() {
  const context = useContext(RoomListContext);
  if (!context) {
    throw new Error('useRoomList must be used within RoomListProvider');
  }
  return context;
}
```

---

### Phase 2: UIContext 생성

#### 2.1 상태 정의 (`src/features/ui/types.ts`)

```typescript
export interface UIState {
  modals: {
    createRoom: boolean;
    inviteUser: boolean;
    leaveRoom: boolean;
    confirmDelete: boolean;
  };
  contextMenu: ContextMenu | null;
  toast: Toast | null;
}

export interface ContextMenu {
  type: 'room' | 'message';
  position: { x: number; y: number };
  targetId: string;
  options: ContextMenuOption[];
}

export interface ContextMenuOption {
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration: number;
}

export type UIAction =
  | { type: 'OPEN_MODAL'; payload: { modal: keyof UIState['modals'] } }
  | { type: 'CLOSE_MODAL'; payload: { modal: keyof UIState['modals'] } }
  | { type: 'CLOSE_ALL_MODALS' }
  | { type: 'OPEN_CONTEXT_MENU'; payload: { menu: ContextMenu } }
  | { type: 'CLOSE_CONTEXT_MENU' }
  | { type: 'SHOW_TOAST'; payload: { toast: Toast } }
  | { type: 'HIDE_TOAST'; payload: { id: string } };
```

---

#### 2.2 Reducer (`src/features/ui/context/uiReducer.ts`)

```typescript
import type { UIState, UIAction } from '../types';

export const initialUIState: UIState = {
  modals: {
    createRoom: false,
    inviteUser: false,
    leaveRoom: false,
    confirmDelete: false,
  },
  contextMenu: null,
  toast: null,
};

export function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'OPEN_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload.modal]: true,
        },
      };

    case 'CLOSE_MODAL':
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload.modal]: false,
        },
      };

    case 'CLOSE_ALL_MODALS':
      return {
        ...state,
        modals: {
          createRoom: false,
          inviteUser: false,
          leaveRoom: false,
          confirmDelete: false,
        },
      };

    case 'OPEN_CONTEXT_MENU':
      return {
        ...state,
        contextMenu: action.payload.menu,
      };

    case 'CLOSE_CONTEXT_MENU':
      return {
        ...state,
        contextMenu: null,
      };

    case 'SHOW_TOAST':
      return {
        ...state,
        toast: action.payload.toast,
      };

    case 'HIDE_TOAST':
      return {
        ...state,
        toast: state.toast?.id === action.payload.id ? null : state.toast,
      };

    default:
      return state;
  }
}
```

---

#### 2.3 Context Provider (`src/features/ui/context/UIContext.tsx`)

```typescript
"use client";

import {
  createContext,
  useReducer,
  useCallback,
  useMemo,
  useContext,
  useEffect,
  type ReactNode,
} from 'react';
import { uiReducer, initialUIState } from './uiReducer';
import type { UIState, Toast } from '../types';

interface UIContextValue extends UIState {
  openModal: (modal: keyof UIState['modals']) => void;
  closeModal: (modal: keyof UIState['modals']) => void;
  closeAllModals: () => void;
  showToast: (type: Toast['type'], message: string, duration?: number) => void;
  hideToast: (id: string) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(uiReducer, initialUIState);

  const openModal = useCallback((modal: keyof UIState['modals']) => {
    dispatch({ type: 'OPEN_MODAL', payload: { modal } });
  }, []);

  const closeModal = useCallback((modal: keyof UIState['modals']) => {
    dispatch({ type: 'CLOSE_MODAL', payload: { modal } });
  }, []);

  const closeAllModals = useCallback(() => {
    dispatch({ type: 'CLOSE_ALL_MODALS' });
  }, []);

  const showToast = useCallback((
    type: Toast['type'],
    message: string,
    duration = 3000
  ) => {
    const id = `toast-${Date.now()}`;
    const toast: Toast = { id, type, message, duration };

    dispatch({ type: 'SHOW_TOAST', payload: { toast } });

    setTimeout(() => {
      dispatch({ type: 'HIDE_TOAST', payload: { id } });
    }, duration);
  }, []);

  const hideToast = useCallback((id: string) => {
    dispatch({ type: 'HIDE_TOAST', payload: { id } });
  }, []);

  const value = useMemo<UIContextValue>(() => ({
    ...state,
    openModal,
    closeModal,
    closeAllModals,
    showToast,
    hideToast,
  }), [state, openModal, closeModal, closeAllModals, showToast, hideToast]);

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
}
```

---

### Phase 3: Provider 통합

#### `src/app/providers.tsx` 수정

```typescript
"use client";

import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { RoomListProvider } from "@/features/room-list/context/RoomListContext";
import { UIProvider } from "@/features/ui/context/UIContext";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      forcedTheme="light"
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <UIProvider>
            <RoomListProvider>
              {children}
            </RoomListProvider>
          </UIProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

---

## 📊 데이터 흐름

### 채팅방 목록 로드

```mermaid
sequenceDiagram
    participant Dashboard
    participant RoomListContext
    participant API
    participant Reducer
    
    Dashboard->>RoomListContext: fetchRooms()
    RoomListContext->>Reducer: dispatch('FETCH_ROOMS_REQUEST')
    Reducer->>RoomListContext: status: 'loading'
    
    RoomListContext->>API: GET /api/rooms
    API-->>RoomListContext: {rooms: Room[]}
    
    RoomListContext->>Reducer: dispatch('FETCH_ROOMS_SUCCESS')
    Reducer->>RoomListContext: rooms: Room[], status: 'loaded'
    
    RoomListContext->>Dashboard: sortedRooms (computed)
```

### 방 생성 플로우

```mermaid
sequenceDiagram
    participant User
    participant CreateRoomModal
    participant UIContext
    participant RoomListContext
    participant API
    participant Router
    
    User->>CreateRoomModal: 방 이름 입력 후 생성
    CreateRoomModal->>RoomListContext: createRoom(name)
    
    RoomListContext->>API: POST /api/rooms
    API-->>RoomListContext: {room: Room}
    
    RoomListContext->>Reducer: dispatch('CREATE_ROOM_SUCCESS')
    Reducer->>RoomListContext: rooms: [newRoom, ...existingRooms]
    
    RoomListContext->>CreateRoomModal: return room
    CreateRoomModal->>UIContext: closeModal('createRoom')
    CreateRoomModal->>Router: navigate to /chat/{roomId}
```

---

## ✅ 구현 체크리스트

### Phase 1: RoomListContext
- [ ] `src/features/room-list/types.ts` - 타입 정의
- [ ] `src/features/room-list/context/roomListReducer.ts` - Reducer
- [ ] `src/features/room-list/context/RoomListContext.tsx` - Provider
- [ ] `src/features/room-list/hooks/useRoomList.ts` - Hook

### Phase 2: UIContext
- [ ] `src/features/ui/types.ts` - 타입 정의
- [ ] `src/features/ui/context/uiReducer.ts` - Reducer
- [ ] `src/features/ui/context/UIContext.tsx` - Provider
- [ ] `src/features/ui/hooks/useUI.ts` - Hook

### Phase 3: Provider 통합
- [ ] `src/app/providers.tsx`에 RoomListProvider, UIProvider 추가
- [ ] 의존성 순서 확인 (Auth → UI → RoomList)

### Phase 4: 컴포넌트
- [ ] Dashboard 페이지에서 useRoomList, useUI 사용
- [ ] CreateRoomModal 구현
- [ ] RoomList 컴포넌트 구현
- [ ] RoomItem 컴포넌트 구현

---

## 📝 참고사항

### 정렬 로직
- 최신 메시지가 있는 방이 최상단
- `updated_at` 기준 내림차순

### 안읽은 메시지
- Long Polling에서 메시지 수신 시 자동 증가
- 방 진입 시 자동 초기화

### Empty State
- `rooms.length === 0` 일 때 "첫 채팅 시작하기" UI 표시

---

**문서 버전**: v1.0  
**최종 수정**: 2025년 11월 15일
