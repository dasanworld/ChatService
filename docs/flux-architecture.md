# Flux 패턴 기반 상태 관리 설계

> 작성일: 2025년 11월 15일  
> 기반 문서: `docs/requirement.md v1.6`, `docs/state-management.md`  
> 패턴: Flux Architecture with useReducer

---

## 1. Flux 패턴 개요

```
┌─────────┐      ┌──────────┐      ┌───────┐      ┌──────┐
│ Action  │─────▶│ Reducer  │─────▶│ Store │─────▶│ View │
└─────────┘      └──────────┘      └───────┘      └──────┘
     ▲                                                 │
     └─────────────────────────────────────────────────┘
                  User Interaction
```

### 1.1 핵심 원칙
1. **단방향 데이터 흐름:** Action → Reducer → Store → View
2. **불변성:** 모든 상태 변경은 새 객체 생성
3. **예측 가능성:** 동일 Action + 동일 State = 동일 결과
4. **중앙 집중:** 모든 상태는 Store에서 관리

---

## 2. 관리해야 할 상태 데이터 목록 (State Tree)

### 2.1 전역 상태 구조

```typescript
interface RootState {
  // 1. 인증 상태
  auth: AuthState;
  
  // 2. 채팅방 목록 상태
  roomList: RoomListState;
  
  // 3. 활성 채팅방 상태
  activeRoom: ActiveRoomState;
  
  // 4. UI 상태
  ui: UIState;
  
  // 5. 네트워크 상태
  network: NetworkState;
}
```

### 2.2 세부 상태 정의

#### 2.2.1 AuthState
```typescript
interface AuthState {
  user: User | null;
  session: Session | null;
  status: 'idle' | 'loading' | 'authenticated' | 'error';
  error: string | null;
}

interface User {
  id: string;
  email: string;
  nickname: string;
  avatar_url?: string;
  created_at: string;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}
```

#### 2.2.2 RoomListState
```typescript
interface RoomListState {
  rooms: Room[];
  status: 'idle' | 'loading' | 'loaded' | 'error';
  error: string | null;
  selectedRoomId: string | null;
}

interface Room {
  id: string;
  name: string;
  lastMessage: Message | null;
  lastActivity: string;
  unreadCount: number;
  participantCount: number;
  created_at: string;
}
```

#### 2.2.3 ActiveRoomState
```typescript
interface ActiveRoomState {
  roomId: string | null;
  roomInfo: RoomDetail | null;
  messages: Message[];
  participants: Participant[];
  
  // Long Polling 상태
  lastSyncVersion: number;
  pollingStatus: 'idle' | 'live' | 'catchup' | 'error';
  
  // 메시지 전송 상태
  pendingMessages: Map<string, PendingMessage>;
  
  // 상호작용 상태
  likedMessageIds: Set<string>;
  hiddenMessageIds: Set<string>;
  replyTarget: Message | null;
  
  // 로딩 상태
  isLoadingHistory: boolean;
  hasMoreHistory: boolean;
}

interface Message {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  reply_to_message_id: string | null;
  like_count: number;
  is_deleted: boolean;
  client_message_id: string | null;
  created_at: string;
  updated_at: string;
}

interface PendingMessage {
  clientId: string;
  content: string;
  status: 'sending' | 'error';
  error?: string;
  created_at: string;
}

interface Participant {
  id: string;
  nickname: string;
  avatar_url?: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}
```

#### 2.2.4 UIState
```typescript
interface UIState {
  modals: {
    createRoom: boolean;
    inviteUser: boolean;
    leaveRoom: boolean;
    confirmDelete: boolean;
  };
  
  contextMenu: ContextMenu | null;
  
  toast: Toast | null;
  
  inviteContext: {
    token: string | null;
    roomInfo: RoomInfo | null;
  };
}

interface ContextMenu {
  type: 'room' | 'message';
  position: { x: number; y: number };
  targetId: string;
  options: ContextMenuOption[];
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration: number;
}
```

#### 2.2.5 NetworkState
```typescript
interface NetworkState {
  isOnline: boolean;
  lastSyncAttempt: string | null;
  retryCount: number;
  backoffDelay: number; // ms
}
```

---

## 3. 화면에 보여지지만 상태가 아닌 데이터 (Derived Data)

### 3.1 Selector 함수로 계산되는 데이터

```typescript
// 인증 관련
const isAuthenticated = (state: RootState): boolean => 
  state.auth.user !== null;

const currentUser = (state: RootState): User | null => 
  state.auth.user;

// 채팅방 목록 관련
const sortedRooms = (state: RootState): Room[] =>
  [...state.roomList.rooms].sort((a, b) => 
    new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
  );

const totalUnreadCount = (state: RootState): number =>
  state.roomList.rooms.reduce((sum, room) => sum + room.unreadCount, 0);

const activeRoom = (state: RootState): Room | null =>
  state.roomList.rooms.find(r => r.id === state.roomList.selectedRoomId) ?? null;

// 활성 채팅방 관련
const visibleMessages = (state: RootState): Message[] =>
  state.activeRoom.messages.filter(
    msg => !state.activeRoom.hiddenMessageIds.has(msg.id) && !msg.is_deleted
  );

const messagesWithOptimisticLikes = (state: RootState): Message[] =>
  state.activeRoom.messages.map(msg => {
    const pending = state.activeRoom.pendingMessages.get(msg.client_message_id || '');
    // Optimistic UI: 전송 중인 메시지는 임시 ID로 표시
    return pending ? { ...msg, status: pending.status } : msg;
  });

const allMessages = (state: RootState): (Message | PendingMessage)[] => {
  const realMessages = visibleMessages(state);
  const pendingMessages = Array.from(state.activeRoom.pendingMessages.values());
  return [...realMessages, ...pendingMessages];
};

const isPollingActive = (state: RootState): boolean =>
  state.activeRoom.pollingStatus === 'live' || 
  state.activeRoom.pollingStatus === 'catchup';

// UI 관련
const hasOpenModal = (state: RootState): boolean =>
  Object.values(state.ui.modals).some(isOpen => isOpen);
```

### 3.2 포맷팅 유틸리티 (View Layer)

```typescript
// 이들은 상태가 아닌 순수 함수
const formatMessageTime = (timestamp: string): string =>
  formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ko });

const formatUserInitials = (nickname: string): string =>
  nickname.slice(0, 2).toUpperCase();

const truncateMessage = (content: string, maxLength: number = 50): string =>
  content.length > maxLength ? content.slice(0, maxLength) + '...' : content;

const formatParticipantCount = (count: number): string =>
  `${count}명`;
```

---

## 4. Action 정의 (사용자가 수행할 수 있는 모든 액션)

### 4.1 인증 Actions

```typescript
// Action Types
type AuthAction =
  | { type: 'AUTH_LOGIN_REQUEST'; payload: { email: string; password: string } }
  | { type: 'AUTH_LOGIN_SUCCESS'; payload: { user: User; session: Session } }
  | { type: 'AUTH_LOGIN_FAILURE'; payload: { error: string } }
  | { type: 'AUTH_SIGNUP_REQUEST'; payload: { email: string; password: string; nickname: string } }
  | { type: 'AUTH_SIGNUP_SUCCESS'; payload: { user: User; session: Session } }
  | { type: 'AUTH_SIGNUP_FAILURE'; payload: { error: string } }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_SESSION_RESTORE'; payload: { user: User; session: Session } }
  | { type: 'AUTH_SESSION_EXPIRED' };

// Action Creators
const authActions = {
  loginRequest: (email: string, password: string): AuthAction => ({
    type: 'AUTH_LOGIN_REQUEST',
    payload: { email, password },
  }),
  
  loginSuccess: (user: User, session: Session): AuthAction => ({
    type: 'AUTH_LOGIN_SUCCESS',
    payload: { user, session },
  }),
  
  loginFailure: (error: string): AuthAction => ({
    type: 'AUTH_LOGIN_FAILURE',
    payload: { error },
  }),
  
  logout: (): AuthAction => ({
    type: 'AUTH_LOGOUT',
  }),
};
```

### 4.2 채팅방 목록 Actions

```typescript
type RoomListAction =
  | { type: 'ROOM_LIST_FETCH_REQUEST' }
  | { type: 'ROOM_LIST_FETCH_SUCCESS'; payload: { rooms: Room[] } }
  | { type: 'ROOM_LIST_FETCH_FAILURE'; payload: { error: string } }
  | { type: 'ROOM_LIST_SELECT'; payload: { roomId: string } }
  | { type: 'ROOM_LIST_UNREAD_INCREMENT'; payload: { roomId: string } }
  | { type: 'ROOM_LIST_UNREAD_RESET'; payload: { roomId: string } }
  | { type: 'ROOM_LIST_UPDATE_LAST_MESSAGE'; payload: { roomId: string; message: Message } }
  | { type: 'ROOM_LIST_ADD_ROOM'; payload: { room: Room } }
  | { type: 'ROOM_LIST_REMOVE_ROOM'; payload: { roomId: string } };

const roomListActions = {
  fetchRequest: (): RoomListAction => ({
    type: 'ROOM_LIST_FETCH_REQUEST',
  }),
  
  fetchSuccess: (rooms: Room[]): RoomListAction => ({
    type: 'ROOM_LIST_FETCH_SUCCESS',
    payload: { rooms },
  }),
  
  selectRoom: (roomId: string): RoomListAction => ({
    type: 'ROOM_LIST_SELECT',
    payload: { roomId },
  }),
  
  addRoom: (room: Room): RoomListAction => ({
    type: 'ROOM_LIST_ADD_ROOM',
    payload: { room },
  }),
};
```

### 4.3 채팅방 Actions

```typescript
type ActiveRoomAction =
  | { type: 'ROOM_ENTER'; payload: { roomId: string } }
  | { type: 'ROOM_EXIT' }
  | { type: 'ROOM_SNAPSHOT_SUCCESS'; payload: { 
      roomInfo: RoomDetail; 
      messages: Message[]; 
      participants: Participant[];
      lastSyncVersion: number;
    }}
  | { type: 'ROOM_MESSAGES_PREPEND'; payload: { messages: Message[] } }
  | { type: 'ROOM_MESSAGE_ADD'; payload: { message: Message } }
  | { type: 'ROOM_MESSAGE_UPDATE'; payload: { messageId: string; updates: Partial<Message> } }
  | { type: 'ROOM_MESSAGE_HIDE'; payload: { messageId: string } }
  | { type: 'ROOM_PARTICIPANT_ADD'; payload: { participant: Participant } }
  | { type: 'ROOM_PARTICIPANT_REMOVE'; payload: { userId: string } }
  | { type: 'ROOM_POLLING_START' }
  | { type: 'ROOM_POLLING_EVENT_RECEIVED'; payload: { 
      events: RoomEvent[]; 
      privateDeletions: string[];
      lastVersion: number;
      hasMore: boolean;
    }}
  | { type: 'ROOM_POLLING_MODE_CHANGE'; payload: { mode: 'live' | 'catchup' } }
  | { type: 'ROOM_MESSAGE_SEND_REQUEST'; payload: { 
      clientId: string; 
      content: string;
      replyToId?: string;
    }}
  | { type: 'ROOM_MESSAGE_SEND_SUCCESS'; payload: { clientId: string; message: Message } }
  | { type: 'ROOM_MESSAGE_SEND_FAILURE'; payload: { clientId: string; error: string } }
  | { type: 'ROOM_MESSAGE_LIKE_TOGGLE'; payload: { messageId: string } }
  | { type: 'ROOM_MESSAGE_DELETE_REQUEST'; payload: { messageId: string; deleteType: 'all' | 'me' } }
  | { type: 'ROOM_REPLY_TARGET_SET'; payload: { message: Message | null } }
  | { type: 'ROOM_HISTORY_LOAD_REQUEST' }
  | { type: 'ROOM_HISTORY_LOAD_SUCCESS'; payload: { messages: Message[]; hasMore: boolean } };

const roomActions = {
  enter: (roomId: string): ActiveRoomAction => ({
    type: 'ROOM_ENTER',
    payload: { roomId },
  }),
  
  exit: (): ActiveRoomAction => ({
    type: 'ROOM_EXIT',
  }),
  
  snapshotSuccess: (
    roomInfo: RoomDetail,
    messages: Message[],
    participants: Participant[],
    lastSyncVersion: number
  ): ActiveRoomAction => ({
    type: 'ROOM_SNAPSHOT_SUCCESS',
    payload: { roomInfo, messages, participants, lastSyncVersion },
  }),
  
  sendMessage: (clientId: string, content: string, replyToId?: string): ActiveRoomAction => ({
    type: 'ROOM_MESSAGE_SEND_REQUEST',
    payload: { clientId, content, replyToId },
  }),
  
  toggleLike: (messageId: string): ActiveRoomAction => ({
    type: 'ROOM_MESSAGE_LIKE_TOGGLE',
    payload: { messageId },
  }),
  
  setReplyTarget: (message: Message | null): ActiveRoomAction => ({
    type: 'ROOM_REPLY_TARGET_SET',
    payload: { message },
  }),
};
```

### 4.4 UI Actions

```typescript
type UIAction =
  | { type: 'UI_MODAL_OPEN'; payload: { modal: keyof UIState['modals'] } }
  | { type: 'UI_MODAL_CLOSE'; payload: { modal: keyof UIState['modals'] } }
  | { type: 'UI_CONTEXT_MENU_OPEN'; payload: { menu: ContextMenu } }
  | { type: 'UI_CONTEXT_MENU_CLOSE' }
  | { type: 'UI_TOAST_SHOW'; payload: { toast: Omit<Toast, 'id'> } }
  | { type: 'UI_TOAST_HIDE'; payload: { id: string } }
  | { type: 'UI_INVITE_TOKEN_SET'; payload: { token: string; roomInfo: RoomInfo } }
  | { type: 'UI_INVITE_TOKEN_CLEAR' };

const uiActions = {
  openModal: (modal: keyof UIState['modals']): UIAction => ({
    type: 'UI_MODAL_OPEN',
    payload: { modal },
  }),
  
  closeModal: (modal: keyof UIState['modals']): UIAction => ({
    type: 'UI_MODAL_CLOSE',
    payload: { modal },
  }),
  
  showToast: (toast: Omit<Toast, 'id'>): UIAction => ({
    type: 'UI_TOAST_SHOW',
    payload: { toast },
  }),
  
  openContextMenu: (menu: ContextMenu): UIAction => ({
    type: 'UI_CONTEXT_MENU_OPEN',
    payload: { menu },
  }),
};
```

### 4.5 네트워크 Actions

```typescript
type NetworkAction =
  | { type: 'NETWORK_STATUS_CHANGE'; payload: { isOnline: boolean } }
  | { type: 'NETWORK_SYNC_ATTEMPT' }
  | { type: 'NETWORK_SYNC_SUCCESS' }
  | { type: 'NETWORK_SYNC_FAILURE' }
  | { type: 'NETWORK_BACKOFF_RESET' };
```

### 4.6 통합 Action Type

```typescript
type AppAction = 
  | AuthAction 
  | RoomListAction 
  | ActiveRoomAction 
  | UIAction 
  | NetworkAction;
```

---

## 5. Reducer 구현 (useReducer 기반)

### 5.1 Auth Reducer

```typescript
const authInitialState: AuthState = {
  user: null,
  session: null,
  status: 'idle',
  error: null,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_LOGIN_REQUEST':
    case 'AUTH_SIGNUP_REQUEST':
      return {
        ...state,
        status: 'loading',
        error: null,
      };
    
    case 'AUTH_LOGIN_SUCCESS':
    case 'AUTH_SIGNUP_SUCCESS':
    case 'AUTH_SESSION_RESTORE':
      return {
        user: action.payload.user,
        session: action.payload.session,
        status: 'authenticated',
        error: null,
      };
    
    case 'AUTH_LOGIN_FAILURE':
    case 'AUTH_SIGNUP_FAILURE':
      return {
        ...state,
        status: 'error',
        error: action.payload.error,
      };
    
    case 'AUTH_LOGOUT':
    case 'AUTH_SESSION_EXPIRED':
      return authInitialState;
    
    default:
      return state;
  }
}
```

### 5.2 Room List Reducer

```typescript
const roomListInitialState: RoomListState = {
  rooms: [],
  status: 'idle',
  error: null,
  selectedRoomId: null,
};

function roomListReducer(state: RoomListState, action: RoomListAction): RoomListState {
  switch (action.type) {
    case 'ROOM_LIST_FETCH_REQUEST':
      return {
        ...state,
        status: 'loading',
        error: null,
      };
    
    case 'ROOM_LIST_FETCH_SUCCESS':
      return {
        ...state,
        rooms: action.payload.rooms,
        status: 'loaded',
        error: null,
      };
    
    case 'ROOM_LIST_FETCH_FAILURE':
      return {
        ...state,
        status: 'error',
        error: action.payload.error,
      };
    
    case 'ROOM_LIST_SELECT':
      return {
        ...state,
        selectedRoomId: action.payload.roomId,
      };
    
    case 'ROOM_LIST_UNREAD_INCREMENT':
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === action.payload.roomId
            ? { ...room, unreadCount: room.unreadCount + 1 }
            : room
        ),
      };
    
    case 'ROOM_LIST_UNREAD_RESET':
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === action.payload.roomId
            ? { ...room, unreadCount: 0 }
            : room
        ),
      };
    
    case 'ROOM_LIST_UPDATE_LAST_MESSAGE':
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === action.payload.roomId
            ? {
                ...room,
                lastMessage: action.payload.message,
                lastActivity: action.payload.message.created_at,
              }
            : room
        ),
      };
    
    case 'ROOM_LIST_ADD_ROOM':
      return {
        ...state,
        rooms: [action.payload.room, ...state.rooms],
      };
    
    case 'ROOM_LIST_REMOVE_ROOM':
      return {
        ...state,
        rooms: state.rooms.filter(room => room.id !== action.payload.roomId),
        selectedRoomId: state.selectedRoomId === action.payload.roomId 
          ? null 
          : state.selectedRoomId,
      };
    
    default:
      return state;
  }
}
```

### 5.3 Active Room Reducer

```typescript
const activeRoomInitialState: ActiveRoomState = {
  roomId: null,
  roomInfo: null,
  messages: [],
  participants: [],
  lastSyncVersion: 0,
  pollingStatus: 'idle',
  pendingMessages: new Map(),
  likedMessageIds: new Set(),
  hiddenMessageIds: new Set(),
  replyTarget: null,
  isLoadingHistory: false,
  hasMoreHistory: true,
};

function activeRoomReducer(
  state: ActiveRoomState, 
  action: ActiveRoomAction
): ActiveRoomState {
  switch (action.type) {
    case 'ROOM_ENTER':
      return {
        ...activeRoomInitialState,
        roomId: action.payload.roomId,
      };
    
    case 'ROOM_EXIT':
      return activeRoomInitialState;
    
    case 'ROOM_SNAPSHOT_SUCCESS':
      return {
        ...state,
        roomInfo: action.payload.roomInfo,
        messages: action.payload.messages,
        participants: action.payload.participants,
        lastSyncVersion: action.payload.lastSyncVersion,
        pollingStatus: 'live',
      };
    
    case 'ROOM_MESSAGES_PREPEND':
      return {
        ...state,
        messages: [...action.payload.messages, ...state.messages],
      };
    
    case 'ROOM_MESSAGE_ADD':
      return {
        ...state,
        messages: [...state.messages, action.payload.message],
      };
    
    case 'ROOM_MESSAGE_UPDATE':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === action.payload.messageId
            ? { ...msg, ...action.payload.updates }
            : msg
        ),
      };
    
    case 'ROOM_MESSAGE_HIDE':
      return {
        ...state,
        hiddenMessageIds: new Set([...state.hiddenMessageIds, action.payload.messageId]),
      };
    
    case 'ROOM_PARTICIPANT_ADD':
      return {
        ...state,
        participants: [...state.participants, action.payload.participant],
      };
    
    case 'ROOM_PARTICIPANT_REMOVE':
      return {
        ...state,
        participants: state.participants.filter(p => p.id !== action.payload.userId),
      };
    
    case 'ROOM_POLLING_EVENT_RECEIVED': {
      let newState = { ...state };
      
      // 이벤트 처리
      action.payload.events.forEach(event => {
        switch (event.type) {
          case 'message_created':
            newState.messages = [...newState.messages, event.payload as Message];
            break;
          
          case 'message_updated':
            newState.messages = newState.messages.map(msg =>
              msg.id === event.payload.message_id
                ? { ...msg, ...event.payload.updates }
                : msg
            );
            break;
          
          case 'participant_joined':
            newState.participants = [...newState.participants, event.payload as Participant];
            break;
          
          case 'participant_left':
          case 'participant_kicked':
            newState.participants = newState.participants.filter(
              p => p.id !== event.payload.user_id
            );
            break;
        }
      });
      
      // Private 삭제 처리
      action.payload.privateDeletions.forEach(msgId => {
        newState.hiddenMessageIds = new Set([...newState.hiddenMessageIds, msgId]);
      });
      
      return {
        ...newState,
        lastSyncVersion: action.payload.lastVersion,
        pollingStatus: action.payload.hasMore ? 'catchup' : 'live',
      };
    }
    
    case 'ROOM_POLLING_MODE_CHANGE':
      return {
        ...state,
        pollingStatus: action.payload.mode,
      };
    
    case 'ROOM_MESSAGE_SEND_REQUEST': {
      const pending: PendingMessage = {
        clientId: action.payload.clientId,
        content: action.payload.content,
        status: 'sending',
        created_at: new Date().toISOString(),
      };
      
      return {
        ...state,
        pendingMessages: new Map(state.pendingMessages).set(
          action.payload.clientId, 
          pending
        ),
        replyTarget: null,
      };
    }
    
    case 'ROOM_MESSAGE_SEND_SUCCESS': {
      const newPendingMessages = new Map(state.pendingMessages);
      newPendingMessages.delete(action.payload.clientId);
      
      return {
        ...state,
        pendingMessages: newPendingMessages,
        messages: [...state.messages, action.payload.message],
      };
    }
    
    case 'ROOM_MESSAGE_SEND_FAILURE': {
      const newPendingMessages = new Map(state.pendingMessages);
      const pending = newPendingMessages.get(action.payload.clientId);
      if (pending) {
        newPendingMessages.set(action.payload.clientId, {
          ...pending,
          status: 'error',
          error: action.payload.error,
        });
      }
      
      return {
        ...state,
        pendingMessages: newPendingMessages,
      };
    }
    
    case 'ROOM_MESSAGE_LIKE_TOGGLE': {
      const isLiked = state.likedMessageIds.has(action.payload.messageId);
      const newLikedIds = new Set(state.likedMessageIds);
      
      if (isLiked) {
        newLikedIds.delete(action.payload.messageId);
      } else {
        newLikedIds.add(action.payload.messageId);
      }
      
      return {
        ...state,
        likedMessageIds: newLikedIds,
        messages: state.messages.map(msg =>
          msg.id === action.payload.messageId
            ? { ...msg, like_count: msg.like_count + (isLiked ? -1 : 1) }
            : msg
        ),
      };
    }
    
    case 'ROOM_REPLY_TARGET_SET':
      return {
        ...state,
        replyTarget: action.payload.message,
      };
    
    case 'ROOM_HISTORY_LOAD_REQUEST':
      return {
        ...state,
        isLoadingHistory: true,
      };
    
    case 'ROOM_HISTORY_LOAD_SUCCESS':
      return {
        ...state,
        messages: [...action.payload.messages, ...state.messages],
        hasMoreHistory: action.payload.hasMore,
        isLoadingHistory: false,
      };
    
    default:
      return state;
  }
}
```

### 5.4 UI Reducer

```typescript
const uiInitialState: UIState = {
  modals: {
    createRoom: false,
    inviteUser: false,
    leaveRoom: false,
    confirmDelete: false,
  },
  contextMenu: null,
  toast: null,
  inviteContext: {
    token: null,
    roomInfo: null,
  },
};

function uiReducer(state: UIState, action: UIAction): UIState {
  switch (action.type) {
    case 'UI_MODAL_OPEN':
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload.modal]: true,
        },
      };
    
    case 'UI_MODAL_CLOSE':
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.payload.modal]: false,
        },
      };
    
    case 'UI_CONTEXT_MENU_OPEN':
      return {
        ...state,
        contextMenu: action.payload.menu,
      };
    
    case 'UI_CONTEXT_MENU_CLOSE':
      return {
        ...state,
        contextMenu: null,
      };
    
    case 'UI_TOAST_SHOW':
      return {
        ...state,
        toast: {
          ...action.payload.toast,
          id: crypto.randomUUID(),
        },
      };
    
    case 'UI_TOAST_HIDE':
      return {
        ...state,
        toast: state.toast?.id === action.payload.id ? null : state.toast,
      };
    
    case 'UI_INVITE_TOKEN_SET':
      return {
        ...state,
        inviteContext: {
          token: action.payload.token,
          roomInfo: action.payload.roomInfo,
        },
      };
    
    case 'UI_INVITE_TOKEN_CLEAR':
      return {
        ...state,
        inviteContext: {
          token: null,
          roomInfo: null,
        },
      };
    
    default:
      return state;
  }
}
```

### 5.5 Network Reducer

```typescript
const networkInitialState: NetworkState = {
  isOnline: true,
  lastSyncAttempt: null,
  retryCount: 0,
  backoffDelay: 100, // 초기 100ms
};

function networkReducer(state: NetworkState, action: NetworkAction): NetworkState {
  switch (action.type) {
    case 'NETWORK_STATUS_CHANGE':
      return {
        ...state,
        isOnline: action.payload.isOnline,
      };
    
    case 'NETWORK_SYNC_ATTEMPT':
      return {
        ...state,
        lastSyncAttempt: new Date().toISOString(),
      };
    
    case 'NETWORK_SYNC_SUCCESS':
      return {
        ...state,
        retryCount: 0,
        backoffDelay: 100,
      };
    
    case 'NETWORK_SYNC_FAILURE':
      return {
        ...state,
        retryCount: state.retryCount + 1,
        backoffDelay: Math.min(state.backoffDelay * 2, 1000), // 최대 1초
      };
    
    case 'NETWORK_BACKOFF_RESET':
      return {
        ...state,
        retryCount: 0,
        backoffDelay: 100,
      };
    
    default:
      return state;
  }
}
```

### 5.6 Root Reducer (통합)

```typescript
function rootReducer(state: RootState, action: AppAction): RootState {
  return {
    auth: authReducer(state.auth, action as AuthAction),
    roomList: roomListReducer(state.roomList, action as RoomListAction),
    activeRoom: activeRoomReducer(state.activeRoom, action as ActiveRoomAction),
    ui: uiReducer(state.ui, action as UIAction),
    network: networkReducer(state.network, action as NetworkAction),
  };
}

const rootInitialState: RootState = {
  auth: authInitialState,
  roomList: roomListInitialState,
  activeRoom: activeRoomInitialState,
  ui: uiInitialState,
  network: networkInitialState,
};
```

---

## 6. Store 구현 (React Context + useReducer)

### 6.1 Store Provider

```typescript
import { createContext, useContext, useReducer, ReactNode, Dispatch } from 'react';

interface StoreContextValue {
  state: RootState;
  dispatch: Dispatch<AppAction>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(rootReducer, rootInitialState);
  
  return (
    <StoreContext.Provider value={{ state, dispatch }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within StoreProvider');
  }
  return context;
}
```

### 6.2 Selector Hooks

```typescript
export function useAuth() {
  const { state } = useStore();
  return state.auth;
}

export function useIsAuthenticated() {
  const { state } = useStore();
  return state.auth.user !== null;
}

export function useRoomList() {
  const { state } = useStore();
  return useMemo(() => sortedRooms(state), [state]);
}

export function useActiveRoom() {
  const { state } = useStore();
  return state.activeRoom;
}

export function useVisibleMessages() {
  const { state } = useStore();
  return useMemo(() => visibleMessages(state), [state]);
}

export function useUI() {
  const { state } = useStore();
  return state.ui;
}
```

---

## 7. View Layer (컴포넌트 예시)

### 7.1 채팅방 목록 컴포넌트

```typescript
'use client';

import { useEffect } from 'react';
import { useStore, useRoomList } from '@/store';
import { roomListActions } from '@/store/actions';

export function RoomListView() {
  const { dispatch } = useStore();
  const rooms = useRoomList();
  
  useEffect(() => {
    // 방 목록 로드
    dispatch(roomListActions.fetchRequest());
    
    async function fetchRooms() {
      try {
        const response = await fetch('/api/rooms');
        const data = await response.json();
        dispatch(roomListActions.fetchSuccess(data.rooms));
      } catch (error) {
        dispatch(roomListActions.fetchFailure((error as Error).message));
      }
    }
    
    fetchRooms();
  }, [dispatch]);
  
  const handleRoomClick = (roomId: string) => {
    dispatch(roomListActions.selectRoom(roomId));
    dispatch(roomActions.enter(roomId));
  };
  
  const handleCreateRoom = () => {
    dispatch(uiActions.openModal('createRoom'));
  };
  
  if (rooms.length === 0) {
    return (
      <div className="empty-state">
        <h2>아직 채팅방이 없습니다</h2>
        <button onClick={handleCreateRoom}>새 채팅 시작</button>
      </div>
    );
  }
  
  return (
    <div className="room-list">
      {rooms.map(room => (
        <div 
          key={room.id} 
          className="room-item"
          onClick={() => handleRoomClick(room.id)}
        >
          <h3>{room.name}</h3>
          <p>{truncateMessage(room.lastMessage?.content || '')}</p>
          {room.unreadCount > 0 && (
            <span className="badge">{room.unreadCount}</span>
          )}
        </div>
      ))}
      <button onClick={handleCreateRoom}>+ 새 채팅</button>
    </div>
  );
}
```

### 7.2 메시지 입력 컴포넌트

```typescript
'use client';

import { useState } from 'react';
import { useStore, useActiveRoom } from '@/store';
import { roomActions } from '@/store/actions';
import { v4 as uuid } from 'uuid';

export function MessageInputView() {
  const { dispatch } = useStore();
  const { replyTarget, roomId } = useActiveRoom();
  const [content, setContent] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || !roomId) return;
    
    const clientId = uuid();
    
    // 1. Optimistic UI: 즉시 화면에 표시
    dispatch(roomActions.sendMessage(clientId, content, replyTarget?.id));
    
    setContent('');
    
    // 2. API 요청
    try {
      const response = await fetch(`/api/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          client_message_id: clientId,
          reply_to_message_id: replyTarget?.id,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      // 3. Long Polling이 실제 메시지를 전달할 때까지 대기
      // (Polling에서 client_message_id로 매칭하여 교체)
      
    } catch (error) {
      dispatch(roomActions.sendMessageFailure(clientId, (error as Error).message));
    }
  };
  
  const handleCancelReply = () => {
    dispatch(roomActions.setReplyTarget(null));
  };
  
  return (
    <form onSubmit={handleSubmit} className="message-input">
      {replyTarget && (
        <div className="reply-preview">
          <span>답장: {truncateMessage(replyTarget.content)}</span>
          <button type="button" onClick={handleCancelReply}>X</button>
        </div>
      )}
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="메시지를 입력하세요..."
      />
      <button type="submit">전송</button>
    </form>
  );
}
```

### 7.3 메시지 목록 컴포넌트

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { useStore, useVisibleMessages, useActiveRoom } from '@/store';
import { roomActions } from '@/store/actions';

export function MessageListView() {
  const { dispatch } = useStore();
  const messages = useVisibleMessages();
  const { isLoadingHistory, hasMoreHistory } = useActiveRoom();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // 스크롤 맨 아래로 (새 메시지 도착 시)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);
  
  const handleScroll = () => {
    if (!scrollRef.current || isLoadingHistory || !hasMoreHistory) return;
    
    // 스크롤이 최상단에 도달하면 과거 메시지 로드
    if (scrollRef.current.scrollTop === 0) {
      dispatch(roomActions.loadHistoryRequest());
      
      // API 호출 (생략)
    }
  };
  
  const handleLikeClick = (messageId: string) => {
    dispatch(roomActions.toggleLike(messageId));
    
    // API 호출 (비동기, Optimistic UI)
    fetch(`/api/messages/${messageId}/like`, { method: 'POST' });
  };
  
  const handleReplyClick = (message: Message) => {
    dispatch(roomActions.setReplyTarget(message));
  };
  
  return (
    <div 
      ref={scrollRef} 
      className="message-list" 
      onScroll={handleScroll}
    >
      {isLoadingHistory && <div>과거 메시지 로딩 중...</div>}
      
      {messages.map(message => (
        <div key={message.id} className="message-item">
          <div className="message-header">
            <span className="author">{message.user_id}</span>
            <span className="time">{formatMessageTime(message.created_at)}</span>
          </div>
          <div className="message-content">{message.content}</div>
          <div className="message-actions">
            <button onClick={() => handleLikeClick(message.id)}>
              ❤️ {message.like_count}
            </button>
            <button onClick={() => handleReplyClick(message)}>
              답장
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 8. Side Effects (Middleware 패턴)

### 8.1 Long Polling Effect

```typescript
'use client';

import { useEffect } from 'use';
import { useStore, useActiveRoom } from '@/store';
import { roomActions, networkActions } from '@/store/actions';

export function LongPollingEffect() {
  const { dispatch } = useStore();
  const { roomId, lastSyncVersion, pollingStatus } = useActiveRoom();
  
  useEffect(() => {
    if (!roomId || pollingStatus === 'idle') return;
    
    let abortController = new AbortController();
    let isActive = true;
    
    async function pollUpdates() {
      while (isActive) {
        try {
          dispatch(networkActions.syncAttempt());
          
          const response = await fetch(
            `/api/rooms/${roomId}/updates?since_version=${lastSyncVersion}&limit=100`,
            { 
              signal: abortController.signal,
              headers: { 'Cache-Control': 'no-cache' },
            }
          );
          
          if (!response.ok) {
            throw new Error('Polling failed');
          }
          
          const data = await response.json();
          
          dispatch(roomActions.pollingEventReceived({
            events: data.events,
            privateDeletions: data.private_deletions,
            lastVersion: data.last_version,
            hasMore: data.has_more,
          }));
          
          dispatch(networkActions.syncSuccess());
          
          // Catchup 모드면 Exponential Backoff
          if (data.has_more) {
            const delay = Math.min(100 * Math.pow(2, data.events.length / 50), 1000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
          
        } catch (error) {
          if (error.name === 'AbortError') break;
          
          console.error('Polling error:', error);
          dispatch(networkActions.syncFailure());
          
          // 재시도 (Backoff)
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
      }
    }
    
    pollUpdates();
    
    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [roomId, lastSyncVersion, pollingStatus, dispatch]);
  
  return null;
}
```

### 8.2 Local Storage Sync Effect

```typescript
'use client';

import { useEffect } from 'react';
import { useStore } from '@/store';

export function LocalStorageSyncEffect() {
  const { state } = useStore();
  
  // 좋아요한 메시지 ID 저장
  useEffect(() => {
    if (state.activeRoom.roomId) {
      const key = `liked_messages_${state.activeRoom.roomId}`;
      const likedIds = Array.from(state.activeRoom.likedMessageIds);
      localStorage.setItem(key, JSON.stringify(likedIds));
    }
  }, [state.activeRoom.likedMessageIds, state.activeRoom.roomId]);
  
  // 숨긴 메시지 ID 저장
  useEffect(() => {
    if (state.activeRoom.roomId) {
      const key = `hidden_messages_${state.activeRoom.roomId}`;
      const hiddenIds = Array.from(state.activeRoom.hiddenMessageIds);
      localStorage.setItem(key, JSON.stringify(hiddenIds));
    }
  }, [state.activeRoom.hiddenMessageIds, state.activeRoom.roomId]);
  
  return null;
}
```

---

## 9. Flux 데이터 흐름 시나리오

### 9.1 시나리오: 메시지 전송

```
[User Action]
사용자가 입력창에 "안녕하세요" 입력 후 전송 버튼 클릭

↓

[View → Action]
MessageInputView 컴포넌트:
1. clientId = uuid() 생성
2. dispatch(roomActions.sendMessage(clientId, "안녕하세요"))

↓

[Action → Reducer]
activeRoomReducer:
1. case 'ROOM_MESSAGE_SEND_REQUEST' 처리
2. pendingMessages Map에 추가: {clientId, content, status: 'sending'}
3. 새 state 반환

↓

[Store → View]
1. useActiveRoom() 훅이 새 state 감지
2. MessageListView 리렌더링
3. "안녕하세요" 메시지가 "전송 중..." 라벨과 함께 화면에 즉시 표시 (Optimistic UI)

↓

[Side Effect - API Call]
MessageInputView:
1. fetch('/api/rooms/{roomId}/messages', ...)
2. 서버 응답 대기

↓

[Long Polling]
LongPollingEffect:
1. 서버에서 message_created 이벤트 수신
2. 이벤트에 client_message_id 포함
3. dispatch(roomActions.pollingEventReceived(...))

↓

[Reducer]
activeRoomReducer:
1. case 'ROOM_POLLING_EVENT_RECEIVED'
2. client_message_id로 pendingMessages에서 제거
3. messages 배열에 실제 메시지 추가 (서버 ID 포함)

↓

[Store → View]
1. MessageListView 리렌더링
2. "전송 중..." → 일반 메시지로 교체
3. 서버 타임스탬프 표시
```

### 9.2 시나리오: 좋아요 토글

```
[User Action]
사용자가 메시지의 ❤️ 버튼 클릭

↓

[View → Action]
MessageListView:
dispatch(roomActions.toggleLike(messageId))

↓

[Reducer]
activeRoomReducer:
1. case 'ROOM_MESSAGE_LIKE_TOGGLE'
2. likedMessageIds Set에 messageId 추가/제거
3. messages 배열에서 해당 메시지의 like_count +1/-1 (Optimistic)

↓

[Store → View]
1. useVisibleMessages() 훅이 변경 감지
2. MessageListView 리렌더링
3. ❤️ 아이콘 색상 변경, 숫자 증가 (즉시)

↓

[Side Effect - API Call]
MessageListView:
fetch('/api/messages/{messageId}/like', {method: 'POST'})
(비동기, 응답 대기 안함)

↓

[Server Batching]
서버:
1. 5초간 모든 좋아요 요청 수집
2. DB에 실제 like_count UPDATE
3. 5초 후 단일 message_updated 이벤트 생성 (version: N)

↓

[Long Polling]
LongPollingEffect:
1. message_updated 이벤트 수신
2. payload: {message_id, like_count: 실제값}
3. dispatch(roomActions.pollingEventReceived(...))

↓

[Reducer]
activeRoomReducer:
1. messages 배열에서 해당 메시지 업데이트
2. Optimistic 값을 서버 실제 값으로 교체

↓

[Store → View]
1. 만약 Optimistic과 서버 값이 다르면 숫자 조정
2. 일반적으로는 변화 없음 (이미 Optimistic으로 표시됨)
```

### 9.3 시나리오: 오프라인 복구

```
[Network Event]
네트워크 끊김 (10분)

↓

[Action]
window.addEventListener('offline'):
dispatch(networkActions.statusChange({isOnline: false}))

↓

[Reducer]
networkReducer: isOnline = false

↓

[Store → View]
1. 모든 컴포넌트에 오프라인 배너 표시
2. Long Polling 자동 중단

↓

[Network Event]
네트워크 재연결

↓

[Action]
window.addEventListener('online'):
dispatch(networkActions.statusChange({isOnline: true}))

↓

[Long Polling Restart]
LongPollingEffect:
1. lastSyncVersion = 500 (마지막 동기화 버전)
2. fetch('/api/rooms/{roomId}/updates?since_version=500')

↓

[Server Response]
{
  events: [501~650], // 150개 이벤트
  has_more: true,
  last_version: 650
}

↓

[Reducer]
activeRoomReducer:
1. case 'ROOM_POLLING_EVENT_RECEIVED'
2. pollingStatus: 'live' → 'catchup'
3. 150개 이벤트 일괄 처리
4. messages, participants 업데이트

↓

[Store → View]
1. 화면 상단에 "동기화 중..." 표시
2. 새 메시지들이 한꺼번에 추가됨
3. 참여자 변경사항 반영

↓

[Catchup Loop]
has_more = true 이므로:
1. 즉시 다음 Polling 요청
2. Exponential Backoff (100ms, 200ms, ...)
3. has_more = false까지 반복

↓

[Reducer]
activeRoomReducer:
pollingStatus: 'catchup' → 'live'

↓

[Store → View]
1. "동기화 중..." 사라짐
2. 실시간 모드 재개
```

---

## 10. 테스트 전략

### 10.1 Reducer 단위 테스트

```typescript
import { describe, it, expect } from 'vitest';
import { authReducer, authInitialState } from './authReducer';

describe('authReducer', () => {
  it('should handle AUTH_LOGIN_REQUEST', () => {
    const action = {
      type: 'AUTH_LOGIN_REQUEST',
      payload: { email: 'test@example.com', password: 'password' },
    };
    
    const nextState = authReducer(authInitialState, action);
    
    expect(nextState.status).toBe('loading');
    expect(nextState.error).toBeNull();
  });
  
  it('should handle AUTH_LOGIN_SUCCESS', () => {
    const user = { id: '1', email: 'test@example.com', nickname: 'Test' };
    const session = { access_token: 'token', refresh_token: 'refresh', expires_at: 123 };
    
    const action = {
      type: 'AUTH_LOGIN_SUCCESS',
      payload: { user, session },
    };
    
    const nextState = authReducer(authInitialState, action);
    
    expect(nextState.user).toEqual(user);
    expect(nextState.session).toEqual(session);
    expect(nextState.status).toBe('authenticated');
  });
  
  it('should maintain immutability', () => {
    const action = { type: 'AUTH_LOGIN_REQUEST', payload: { email: '', password: '' } };
    
    const nextState = authReducer(authInitialState, action);
    
    expect(nextState).not.toBe(authInitialState);
    expect(authInitialState.status).toBe('idle'); // 원본 변경 안됨
  });
});
```

### 10.2 통합 테스트

```typescript
import { renderHook, act } from '@testing-library/react';
import { StoreProvider, useStore } from './store';

describe('Store Integration', () => {
  it('should handle complete login flow', async () => {
    const { result } = renderHook(() => useStore(), {
      wrapper: StoreProvider,
    });
    
    // 1. 로그인 요청
    act(() => {
      result.current.dispatch(authActions.loginRequest('test@example.com', 'password'));
    });
    
    expect(result.current.state.auth.status).toBe('loading');
    
    // 2. 로그인 성공
    act(() => {
      result.current.dispatch(authActions.loginSuccess(mockUser, mockSession));
    });
    
    expect(result.current.state.auth.user).toEqual(mockUser);
    expect(result.current.state.auth.status).toBe('authenticated');
  });
});
```

---

## 11. 성능 최적화

### 11.1 Memoization

```typescript
import { useMemo } from 'react';

export function useVisibleMessages() {
  const { state } = useStore();
  
  return useMemo(() => {
    return state.activeRoom.messages.filter(
      msg => !state.activeRoom.hiddenMessageIds.has(msg.id) && !msg.is_deleted
    );
  }, [state.activeRoom.messages, state.activeRoom.hiddenMessageIds]);
}
```

### 11.2 Component Splitting

```typescript
// 나쁜 예: 전체 state 구독
function RoomView() {
  const { state } = useStore(); // 모든 변경에 리렌더링
  return <div>{state.activeRoom.messages.map(...)}</div>;
}

// 좋은 예: 필요한 부분만 구독
function RoomView() {
  const messages = useVisibleMessages(); // 메시지 변경 시만 리렌더링
  return <div>{messages.map(...)}</div>;
}
```

---

## 12. 디버깅 도구

### 12.1 Redux DevTools 연동

```typescript
import { useEffect } from 'react';

export function DevToolsEffect() {
  const { state, dispatch } = useStore();
  
  useEffect(() => {
    if (typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION__) {
      const devTools = window.__REDUX_DEVTOOLS_EXTENSION__.connect();
      
      devTools.init(state);
      
      const originalDispatch = dispatch;
      dispatch = (action) => {
        devTools.send(action, state);
        originalDispatch(action);
      };
    }
  }, []);
  
  return null;
}
```

---

## 13. 결론

### 13.1 Flux 패턴의 장점 (본 설계)

1. ✅ **예측 가능성**: 모든 상태 변경이 Action → Reducer → State 흐름
2. ✅ **디버깅 용이**: Action 로그만 보면 전체 흐름 파악
3. ✅ **테스트 용이**: Reducer는 순수 함수, 입력/출력만 테스트
4. ✅ **타임 트래블**: 모든 Action 기록으로 상태 되돌리기 가능
5. ✅ **확장성**: 새 기능 추가 시 Action과 Reducer만 추가

### 13.2 업계 표준 준수

- ✅ **TypeScript**: 모든 상태와 Action에 타입 정의
- ✅ **useReducer**: React 18+ 표준 Hook 사용
- ✅ **Immutability**: 모든 Reducer에서 불변성 보장
- ✅ **Context API**: 전역 상태 관리
- ✅ **Custom Hooks**: 재사용 가능한 Selector Hook

### 13.3 다음 단계

1. Middleware 레이어 추가 (Logger, Error Reporter)
2. Persist 레이어 추가 (Redux Persist 패턴)
3. Saga/Thunk 패턴으로 복잡한 비동기 로직 관리
4. Optimistic UI 롤백 메커니즘 강화

---

**문서 작성 완료**  
이 설계를 따르면 채팅 서비스의 모든 상태를 체계적으로 관리할 수 있으며, 유지보수성과 확장성이 크게 향상됩니다.
