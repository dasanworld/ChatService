---
title: 페이지 단위 구현 계획서
description: 페이지 구현 전 필요한 단계별 계획
version: v1.0
date: 2025년 11월 15일
related_docs:
  - state-management.md (기술 아키텍처)
  - docs/prd.md (기능 정의)
  - docs/requirement.md (요구사항)
  - docs/00N/spec.md (Flow 명세)
---

# 📋 페이지 단위 구현 계획서

> **목적**: 페이지 구현 전에 수행해야 할 5단계 계획을 정의하고, 
> 문서(state-management.md, spec.md, prd.md, requirement.md) 간의 혼란을 최소화합니다.

---

## 🎯 핵심 문제 분석

### 현재 상황
- **state-management.md**: 기술 중심 설계서 (Context API, Reducer, Long Polling)
- **docs/00N/spec.md**: 사용자 Flow 중심 명세 (User Story, UI 흐름)
- **prd.md**: 기능 정의 중심 (F-00.1~F-07)
- **requirement.md**: 기술 요구사항 중심 (API, DB 스키마)

### 문제점
세 가지 관점이 **서로 다른 추상화 레벨**에 있어서 일치시키기 어려운 구조
- **state-management.md** ≠ **spec.md** ≠ **prd.md**

### 해결책
**문서를 억지로 일치시키지 말고**, 각각의 역할을 존중하면서 **크로스 레퍼런스**만 추가

---

## 📊 페이지-Flow-기능 매핑 테이블

| 페이지 | URL | PRD 기능 | spec.md Flow | 필요 Context | 상태 |
|--------|-----|---------|--------------|--------------|------|
| 랜딩 | `/` | - | 001 사전 | 없음 | 미구현 |
| 회원가입 | `/signup` | F-00.1 | 001 | AuthContext | 미구현 |
| 로그인 | `/login` | F-00.2 | 001 | AuthContext | 미구현 |
| 비밀번호 찾기 | `/auth/reset-password` | F-00.3 | 001.5 | AuthContext | 미구현 |
| 초대 인증 | `/invite/[token]` | - | 004 | AuthContext + UIContext | 미구현 |
| 대시보드 | `/dashboard` | F-01, F-07 | 002, 005 | AuthContext + RoomListContext + UIContext | 미구현 |
| 채팅방 | `/chat/[roomId]` | F-02~F-06 | 003, 006, 007 | 모든 Context | 미구현 |

---

## 🚀 5단계 구현 계획

### **1단계: 페이지 인벤토리 정리** (소요 시간: 1일)

#### 목적
구현할 페이지 목록을 명확히 정의하고, 각 페이지의 책임 범위를 확정합니다.

#### 수행 작업
- [ ] PRD의 기능(F-00.1~F-07)을 **화면 단위**로 분해
- [ ] spec.md의 Flow(001~007)를 **URL 경로**로 매핑
- [ ] 각 페이지의 **라우트**, **역할**, **필요 Context** 정리

#### 산출물

```markdown
# 페이지 인벤토리

## 1. 인증 페이지 그룹

### /signup (회원가입)
- PRD 기능: F-00.1
- Spec Flow: 001 (신규 방문자 가입)
- 필요 Context: AuthContext
- 최소 구현:
  - 이메일, 비밀번호, 닉네임 입력 폼
  - 유효성 검증 (클라이언트 + 서버)
  - 가입 완료 후 /dashboard 리디렉션
  - 에러 처리

### /login (로그인)
- PRD 기능: F-00.2
- Spec Flow: 001 (신규 방문자 로그인)
- 필요 Context: AuthContext
- 최소 구현:
  - 이메일, 비밀번호 입력 폼
  - 로그인/회원가입 선택 분기
  - 로그인 후 대시보드 또는 초대 방으로 리디렉션
  - 에러 처리

### /auth/reset-password (비밀번호 찾기)
- PRD 기능: F-00.3
- Spec Flow: 001.5 (비밀번호 찾기)
- 필요 Context: AuthContext
- 최소 구현:
  - 이메일 입력
  - 초기화 링크 발송
  - 링크를 통한 비밀번호 재설정

## 2. 초대 페이지 그룹

### /invite/[token] (초대 확인)
- PRD 기능: -
- Spec Flow: 004 (초대받은 사용자 가입/로그인)
- 필요 Context: AuthContext + UIContext
- 최소 구현:
  - 초대 토큰 검증
  - "OOO방에 초대되었습니다" 메시지 표시
  - 미로그인: 로그인/회원가입 페이지로 리디렉션
  - 로그인 완료: 채팅방으로 리디렉션

## 3. 대시보드

### /dashboard (채팅방 목록)
- PRD 기능: F-01, F-07
- Spec Flow: 002 (첫 로그인), 005 (재방문)
- 필요 Context: AuthContext + RoomListContext + UIContext
- 최소 구현:
  - 채팅방 목록 표시
  - Empty State (채팅방 없을 때)
  - [새 채팅 시작] 버튼
  - [방 나가기] 메뉴
  - 방 클릭 시 /chat/[roomId] 이동

## 4. 채팅방

### /chat/[roomId] (채팅 화면)
- PRD 기능: F-02~F-06
- Spec Flow: 003 (방 생성), 006 (메시지 전송), 007 (메시지 관리)
- 필요 Context: 모든 Context (Auth + RoomList + ActiveRoom + UI + Network)
- 최소 구현:
  - 메시지 목록 표시
  - 메시지 전송 (Optimistic UI)
  - 메시지 답장
  - 메시지 좋아요
  - 메시지 삭제
  - 참여자 목록
  - [초대하기] 버튼
  - 모달: 방 생성, 사용자 초대, 방 나가기
```

---

### **2단계: Backend API 우선순위 정렬** (소요 시간: 반나절)

#### 목적
페이지 구현 순서에 맞춰 필요한 API부터 개발합니다.

#### 수행 작업
- [ ] requirement.md의 API 엔드포인트 목록 추출
- [ ] 페이지별 필수 API 매핑
- [ ] 구현 우선순위 정렬 (Auth → Room List → Active Room)

#### 산출물

```markdown
# Backend API 구현 순서

## Phase 1: 인증 API (1주차)
필수 완료: /signup, /login 페이지 구현

- POST /api/auth/signup
  - Body: {email, password, nickname}
  - Response: {user, session}
  - 참고: requirement.md 섹션 5

- POST /api/auth/login
  - Body: {email, password}
  - Response: {user, session}

- POST /api/auth/logout
  - Response: {success}

- POST /api/auth/request-reset
  - Body: {email}
  - Response: {success}
  - Rate Limit 필수 (IP당 분당 5회)

- POST /api/auth/reset-password
  - Body: {token, password}
  - Response: {success}

- GET /api/auth/me
  - Response: {user, session}
  - 세션 검증용

## Phase 2: 채팅방 API (1-2주차)
필수 완료: /dashboard 페이지 구현

- GET /api/rooms
  - Query: {limit, offset}
  - Response: {rooms: [], has_more}
  - 참고: requirement.md AC 1

- POST /api/rooms
  - Body: {name}
  - Response: {room}
  - 참고: requirement.md 기능 정의

- GET /api/rooms/{roomId}/info
  - Response: {room}

- DELETE /api/rooms/{roomId}
  - Response: {success}

- POST /api/rooms/{roomId}/leave
  - Response: {success}
  - PRD: F-07 방 나가기

## Phase 3: 메시지 API (2주차)
필수 완료: /chat/[roomId] 페이지 구현

### Snapshot 및 히스토리
- GET /api/rooms/{roomId}/snapshot
  - Query: {limit=50}
  - Response: {messages, participants, room_info, last_sync_version}
  - 참고: requirement.md AC 1

- GET /api/rooms/{roomId}/messages
  - Query: {before_version, limit=50}
  - Response: {messages, has_more}
  - 참고: requirement.md AC 2 (과거 로딩)

### 실시간 메시지
- POST /api/rooms/{roomId}/messages
  - Body: {content, client_message_id, reply_to_message_id?}
  - Response: {success}
  - 참고: requirement.md AC 5

- DELETE /api/messages/{messageId}
  - Query: {type: 'all' | 'me'}
  - Response: {success}
  - 참고: requirement.md AC 8

- GET /api/rooms/{roomId}/updates
  - Query: {since_version, limit=100}
  - Response: {events, private_deletions, last_version, has_more}
  - Long Polling 엔드포인트
  - 참고: requirement.md AC 3, AC 4

### 좋아요
- POST /api/messages/{messageId}/like
  - Response: {success}
  - 참고: requirement.md AC 7

- DELETE /api/messages/{messageId}/like
  - Response: {success}

## Phase 4: 초대 API (2주차)
필수 완료: /invite/[token] 페이지 구현

- GET /api/invites/{token}
  - Response: {room, valid, expire_at}
  - 초대 토큰 검증

- POST /api/invites
  - Body: {room_id}
  - Response: {token, url}
  - 새 초대 생성

## 구현 우선순위 타임라인

```
1주차 (Phase 1):
Mon: POST /api/auth/signup, POST /api/auth/login
Tue: POST /api/auth/logout, 추가 인증 API
Wed: GET /api/auth/me, 세션 검증

2주차 (Phase 2):
Mon-Tue: GET /api/rooms, POST /api/rooms
Wed-Thu: GET /api/rooms/{roomId}/snapshot, Long Polling 준비

3주차 (Phase 3):
Mon-Tue: POST /api/rooms/{roomId}/messages, DELETE /api/messages
Wed-Thu: GET /api/rooms/{roomId}/updates (Long Polling)
Fri: 좋아요 API, 초대 API
```
```

---

### **3단계: Context 구현 순서 및 Mock 데이터 준비** (소요 시간: 1일)

#### 목적
페이지 개발과 병렬로 진행 가능하도록 Context 인터페이스를 먼저 확정합니다.

#### 수행 작업
- [ ] state-management.md의 Context 5개를 **구현 순서**로 정렬
- [ ] 각 Context의 **최소 인터페이스**(노출 API) 확정
- [ ] API 개발 전까지 사용할 **Mock 데이터** 준비

#### 산출물

```markdown
# Context 구현 순서

## Priority 1: AuthContext (페이지 공통)
**목적**: 모든 페이지에서 필요한 인증 상태 관리
**구현 시점**: 1주차 초반
**의존성**: 없음

### 노출 API
\`\`\`typescript
useAuth() => {
  // 계산된 값
  isAuthenticated: boolean;
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
  
  // 액션
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, nickname: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
}
\`\`\`

### Mock 데이터
\`\`\`typescript
const MOCK_USER = {
  id: 'user-uuid-1',
  email: 'test@example.com',
  nickname: 'TestUser',
  avatar_url: 'https://picsum.photos/48?random=1',
  created_at: new Date().toISOString(),
};

const MOCK_SESSION = {
  access_token: 'mock-token-123',
  refresh_token: 'mock-refresh-123',
  expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,
};
\`\`\`

## Priority 2: UIContext (페이지 공통)
**목적**: 모달, Toast, Context Menu 전역 관리
**구현 시점**: 1주차 중순
**의존성**: AuthContext

### 노출 API
\`\`\`typescript
useUI() => {
  // Modal
  openModal: (modal: 'createRoom' | 'inviteUser' | 'leaveRoom') => void;
  closeModal: (modal: string) => void;
  isModalOpen: (modal: string) => boolean;
  
  // Toast
  showToast: (type: 'success' | 'error' | 'info', message: string, duration?: number) => void;
  hideToast: (id: string) => void;
  
  // Invite Context
  setInviteToken: (token: string) => void;
  getInviteToken: () => string | null;
}
\`\`\`

### Mock 데이터
\`\`\`typescript
const MOCK_MODALS = {
  createRoom: false,
  inviteUser: false,
  leaveRoom: false,
};
\`\`\`

## Priority 3: RoomListContext (대시보드)
**목적**: 채팅방 목록 관리
**구현 시점**: 2주차 초반
**의존성**: AuthContext

### 노출 API
\`\`\`typescript
useRoomList() => {
  // 계산된 값
  sortedRooms: Room[];
  totalUnreadCount: number;
  selectedRoom: Room | null;
  isLoading: boolean;
  
  // 액션
  fetchRooms: () => Promise<void>;
  selectRoom: (roomId: string | null) => void;
  createRoom: (name: string) => Promise<Room>;
  leaveRoom: (roomId: string) => Promise<void>;
  
  // Internal
  updateLastMessage: (roomId: string, message: Message) => void;
  incrementUnread: (roomId: string) => void;
  resetUnread: (roomId: string) => void;
}
\`\`\`

### Mock 데이터
\`\`\`typescript
const MOCK_ROOMS: Room[] = [
  {
    id: 'room-1',
    name: '우리 팀',
    lastMessage: { content: '마지막 메시지...', created_at: '2025-11-15T10:00:00Z' },
    unreadCount: 3,
    participantCount: 5,
    created_at: '2025-11-01T00:00:00Z',
  },
  {
    id: 'room-2',
    name: '프로젝트 논의',
    lastMessage: null,
    unreadCount: 0,
    participantCount: 2,
    created_at: '2025-11-10T00:00:00Z',
  },
];
\`\`\`

## Priority 4: NetworkContext (전체)
**목적**: 네트워크 상태, Retry 로직 관리
**구현 시점**: 2주차 중반
**의존성**: 없음

### 노출 API
\`\`\`typescript
useNetwork() => {
  // 계산된 값
  isOnline: boolean;
  shouldRetry: boolean;
  nextRetryDelay: number;
  
  // Actions (Internal)
  recordSyncAttempt: () => void;
  recordSyncSuccess: () => void;
  recordSyncFailure: (error: string) => void;
  resetBackoff: () => void;
}
\`\`\`

### Mock 데이터
\`\`\`typescript
const MOCK_NETWORK_STATE = {
  isOnline: true,
  lastSyncAttempt: Date.now(),
  retryCount: 0,
  backoffDelay: 100,
};
\`\`\`

## Priority 5: ActiveRoomContext (채팅방)
**목적**: 현재 채팅방 상태, Long Polling 관리
**구현 시점**: 2주차 후반
**의존성**: RoomListContext, NetworkContext

### 노출 API
\`\`\`typescript
useActiveRoom() => {
  // 계산된 값
  visibleMessages: (Message | PendingMessage)[];
  currentRoom: RoomDetail | null;
  isPollingActive: boolean;
  isLoading: boolean;
  
  // 액션
  enterRoom: (roomId: string) => Promise<void>;
  exitRoom: () => void;
  loadMoreHistory: () => Promise<void>;
  sendMessage: (content: string, replyToId?: string) => Promise<void>;
  toggleLike: (messageId: string) => Promise<void>;
  deleteMessage: (messageId: string, deleteType: 'all' | 'me') => Promise<void>;
  setReplyTarget: (message: Message | null) => void;
}
\`\`\`

### Mock 데이터
\`\`\`typescript
const MOCK_MESSAGES: Message[] = [
  {
    id: 'msg-1',
    room_id: 'room-1',
    user_id: 'user-1',
    content: '안녕하세요!',
    reply_to_message_id: null,
    like_count: 2,
    is_deleted: false,
    client_message_id: null,
    created_at: '2025-11-15T09:00:00Z',
    updated_at: '2025-11-15T09:00:00Z',
  },
];
\`\`\`
```

---

### **4단계: 페이지별 구현 계획서 작성** (소요 시간: 반나절)

#### 목적
각 페이지의 구현 범위를 명확히 정의합니다.

#### 수행 작업
- [ ] 페이지별 **최소 구현 범위** (MVP) 정의
- [ ] **의존성** 명시 (어떤 API/Context가 준비되어야 하는가)
- [ ] **성공 기준** 정의 (어떤 상태가 되면 완료인가)

#### 산출물

```markdown
# 페이지별 구현 상세 계획

## 페이지 1: /signup (회원가입)

### 최소 구현 범위 (MVP)
- 이메일, 비밀번호, 닉네임 입력 폼
- 클라이언트 측 유효성 검증 (Zod)
- 서버 API 호출 (POST /api/auth/signup)
- 로딩 상태 표시
- 에러 처리 (중복 이메일, 약한 비밀번호 등)
- 성공 시 /dashboard로 리디렉션
- 로그인 링크 제공

### 의존성
- AuthContext (signup 액션)
- UIContext (showToast for errors)
- API: POST /api/auth/signup
- Mock: MOCK_USER, MOCK_SESSION

### 성공 기준
- [ ] 폼 제출 시 API 호출
- [ ] 에러 메시지 표시
- [ ] 성공 시 세션 저장 및 대시보드 이동
- [ ] 로딩 중 버튼 비활성화
- [ ] 입력값 실시간 검증

### 관련 문서
- PRD: F-00.1
- Spec: 001 (신규 방문자 가입)
- state-management.md: 7.1 AuthContext 노출 API

---

## 페이지 2: /login (로그인)

### 최소 구현 범위 (MVP)
- 이메일, 비밀번호 입력 폼
- 로그인 로직
- 회원가입 링크
- 비밀번호 찾기 링크
- 초대 토큰 있으면 자동으로 채팅방으로 이동
- 없으면 /dashboard로 이동
- 에러 처리

### 의존성
- AuthContext (login 액션)
- UIContext (showToast, setInviteToken)
- API: POST /api/auth/login
- Mock: MOCK_USER, MOCK_SESSION

### 성공 기준
- [ ] 유효한 자격 증명으로 로그인 성공
- [ ] 잘못된 자격 증명 시 에러 메시지
- [ ] 초대 토큰 없음 → /dashboard
- [ ] 초대 토큰 있음 → /invite/[token]
- [ ] 로딩 중 버튼 비활성화

### 관련 문서
- PRD: F-00.2
- Spec: 001 (신규 방문자 로그인)
- state-management.md: 7.1 AuthContext 노출 API

---

## 페이지 3: /dashboard (대시보드)

### 최소 구현 범위 (MVP)
- 채팅방 목록 표시 (최신 활동순)
- Empty State (채팅방 없음)
- [새 채팅 시작] 버튼 → 모달
- 채팅방 클릭 → /chat/[roomId] 이동
- 우클릭/롱프레스 → [방 나가기]
- 안읽은 메시지 배지 표시
- 로딩/에러 상태

### 의존성
- AuthContext (currentUser, logout)
- RoomListContext (fetchRooms, sortedRooms, selectRoom, leaveRoom)
- UIContext (openModal)
- API: GET /api/rooms, POST /api/rooms, DELETE /api/rooms/{id}/leave
- Mock: MOCK_ROOMS

### 성공 기준
- [ ] 페이지 진입 시 방 목록 로드
- [ ] 방 목록 렌더링 (최신순 정렬)
- [ ] Empty State 표시
- [ ] [새 채팅 시작] 모달 열기
- [ ] 방 이름 입력 후 생성
- [ ] 생성된 방으로 이동
- [ ] [방 나가기] 기능
- [ ] 안읽은 메시지 배지

### 관련 문서
- PRD: F-01, F-07
- Spec: 002 (첫 로그인 온보딩), 005 (재방문)
- state-management.md: 7.2 RoomListContext 노출 API

---

## 페이지 4: /chat/[roomId] (채팅방)

### 최소 구현 범위 (MVP)
- 메시지 목록 표시
- Snapshot 로드 (최신 50개)
- 스크롤 상단 → 과거 메시지 로드
- 메시지 입력 후 전송
- Optimistic UI (전송 중... 표시)
- Long Polling (실시간 업데이트)
- 메시지 답장
- 메시지 좋아요
- 메시지 삭제 (모두/나만)
- 참여자 목록
- [초대하기] 버튼
- 에러/오프라인 배너

### 의존성
- AuthContext (currentUser)
- ActiveRoomContext (모든 액션)
- RoomListContext (updateLastMessage)
- UIContext (showToast, openModal)
- NetworkContext (isOnline)
- API: 모든 메시지 API
- Mock: MOCK_MESSAGES, MOCK_PARTICIPANTS

### 성공 기준
- [ ] 스냅샷 로드 및 메시지 표시
- [ ] 메시지 전송 (Optimistic UI)
- [ ] Long Polling으로 실시간 메시지 수신
- [ ] 과거 메시지 로드
- [ ] 메시지 답장, 좋아요, 삭제
- [ ] 오프라인 상태 표시
- [ ] 재연결 후 동기화

### 관련 문서
- PRD: F-02~F-06
- Spec: 003 (채팅방 생성), 006 (메시지), 007 (메시지 관리)
- state-management.md: 7.3 ActiveRoomContext 노출 API, 5. 데이터 흐름

---

## 페이지 5: /invite/[token] (초대 확인)

### 최소 구현 범위 (MVP)
- 초대 토큰 검증
- "OOO방에 초대되었습니다" 메시지 표시
- 미로그인: 로그인/회원가입 페이지로
  - 쿠키에 invite_token 저장
  - 로그인 후 자동으로 채팅방 이동
- 로그인한 상태: 채팅방으로 자동 이동
- 토큰 유효하지 않음: 에러 페이지

### 의존성
- AuthContext (isAuthenticated, currentUser)
- UIContext (setInviteToken, showToast)
- API: GET /api/invites/{token}
- Mock: 토큰 검증 로직

### 성공 기준
- [ ] 토큰 검증
- [ ] 미로그인 시 로그인 페이지로 리디렉션
- [ ] 로그인 완료 후 채팅방 자동 이동
- [ ] 유효하지 않은 토큰 → 에러 페이지
- [ ] 초대 방 정보 표시

### 관련 문서
- PRD: 비-기능 7.5, 7.6
- Spec: 004 (초대받은 사용자 가입/로그인)
```

---

### **5단계: 문서 통합 또는 크로스 레퍼런스 추가** (선택사항, 반나절)

#### 목적
혼란을 최소화하기 위해 문서 간 연결을 명시합니다.

#### 방법 1: 새 매핑 섹션 추가 (추천)

**위치**: state-management.md 말미에 추가

```markdown
## 10. 페이지-Context-Flow 매핑 가이드

### 목적
state-management.md의 기술 아키텍처와 
spec.md의 사용자 Flow, prd.md의 기능을 연결합니다.

### 매핑 테이블

| 페이지 | URL | Flow (spec.md) | 기능 (prd.md) | 필요 Context | 구현 우선순위 |
|--------|-----|---|---|---|---|
| 회원가입 | /signup | 001 | F-00.1 | AuthContext | P0-1 |
| 로그인 | /login | 001 | F-00.2 | AuthContext | P0-2 |
| 비밀번호 찾기 | /auth/reset | 001.5 | F-00.3 | AuthContext | P1-1 |
| 초대 페이지 | /invite/[token] | 004 | - | Auth + UI | P0-3 |
| 대시보드 | /dashboard | 002, 005 | F-01, F-07 | Auth + RoomList + UI | P0-4 |
| 채팅방 | /chat/[roomId] | 003, 006, 007 | F-02~F-06 | 모든 Context | P0-5 |

### Context 구현 타임라인

**1순위: AuthContext**
- 모든 페이지에서 필수
- Mock 데이터로 즉시 시작 가능
- API 통합은 나중에

**2순위: UIContext**
- AuthContext 다음에 구현
- 모달, Toast 등 전역 UI 상태

**3순위: RoomListContext**
- 대시보드 페이지 구현 시
- AuthContext 필요

**4순위: NetworkContext**
- ActiveRoomContext 전에 구현
- Long Polling 재시도 로직 필요

**5순위: ActiveRoomContext**
- 채팅방 페이지 구현 시
- 모든 다른 Context 필요

### 각 Flow별 기술 구현 포인트

#### Flow 001 (신규 방문자 가입/로그인)
- **기술**: AuthContext의 signup/login 액션
- **상태 관리**: user, session, isLoading
- **데이터 흐름**: 섹션 5.1 참조
- **성능 최적화**: 섹션 8.1 적용 (AuthContext는 분리)

#### Flow 002 (첫 로그인 온보딩)
- **기술**: RoomListContext의 fetchRooms
- **상태 관리**: rooms, isLoading
- **특이점**: Empty State 처리

#### Flow 003 (채팅방 생성)
- **기술**: RoomListContext의 createRoom
- **모달**: UIContext로 관리
- **리다이렉션**: /chat/[roomId]로 이동

#### Flow 004 (초대받은 사용자)
- **기술**: UIContext의 invite_token + AuthContext
- **비-기능**: PRD 7.5 참조 (초대 컨텍스트 명시)
- **쿠키 관리**: invite_token 저장/검증

#### Flow 005 (재방문)
- **기술**: AuthContext로 세션 검증 후 RoomListContext 로드
- **특이점**: Flow 002와 다르게 방이 있을 수 있음

#### Flow 006 (메시지 전송)
- **기술**: ActiveRoomContext의 sendMessage + optimistic UI
- **상태 관리**: pendingMessages, messages 섹션 4.3 참조
- **데이터 흐름**: 섹션 5.1 메시지 전송 흐름 참조

#### Flow 007 (메시지 관리)
- **기술**: ActiveRoomContext의 toggleLike, deleteMessage
- **좋아요**: 섹션 5.2 Batching 적용
- **삭제**: 섹션 5.3 오프라인 복구 고려

### 프롬프트 활용 가이드

#### 페이지 구현 시작 시
\`\`\`
해당 페이지의 최소 구현 범위, 필요 Context, API를 명시하고
implementation-plan.md 4단계의 해당 페이지 섹션을 참조하세요.
예: /dashboard 구현 시 '페이지 3: /dashboard (대시보드)' 섹션 참조
\`\`\`

#### Context 구현 시작 시
\`\`\`
implementation-plan.md 3단계의 'Context 구현 순서' 섹션에서
해당 Context의 노출 API와 Mock 데이터를 참조하세요.
또한 state-management.md의 해당 Context 섹션 (예: 7.2 RoomListContext)도 함께 읽으세요.
\`\`\`

#### API 개발 시작 시
\`\`\`
implementation-plan.md 2단계의 'API 구현 순서'에서
필요한 API와 우선순위를 확인하세요.
requirement.md의 Acceptance Criteria(섹션 3)에서 상세 스펙을 참조하세요.
\`\`\`
```

---

## 📈 추천 실행 타임라인

```
1주차: 기초 준비
├─ 월 (1일):  [1단계] 페이지 인벤토리 정리 + [2단계] API 우선순위
├─ 화 (1일):  [3단계] Context Mock 준비
├─ 수 (반나절): [4단계] 페이지별 계획서 작성
├─ 수-목:    /signup, /login 페이지 구현 (Mock 기반)
└─ 금:       POST /api/auth/signup, POST /api/auth/login 구현

2주차: 대시보드
├─ 월-화:    GET /api/rooms, POST /api/rooms 구현
├─ 수-목:    /dashboard 페이지 구현
└─ 금:       테스트 및 통합

3주차: 채팅 기본
├─ 월-화:    GET /api/rooms/{roomId}/snapshot, 메시지 API
├─ 수-목:    /chat/[roomId] 페이지 기본 구현
└─ 금:       Optimistic UI 및 에러 처리

4주차: 실시간 기능
├─ 월-화:    GET /api/rooms/{roomId}/updates (Long Polling)
├─ 수-목:    ActiveRoomContext + NetworkContext 완성
└─ 금:       오프라인 복구 및 전체 통합 테스트
```

---

## 💡 주요 권고사항

### 1️⃣ 문서 역할 존중하기

```
state-management.md (기술 HOW)
├─ 목적: Context, Reducer, Data Flow 정의
├─ 사용 시기: 상태 관리 구현 시
└─ 예: ActiveRoomContext 구현 시 섹션 4.3 메시지 상태 정의 참조

spec.md (사용자 WHAT)
├─ 목적: 각 Flow별 사용자 시나리오 정의
├─ 사용 시기: 페이지 요구사항 정의 시
└─ 예: /login 페이지 만들 때 spec 001 참조

prd.md (비즈니스 WHY)
├─ 목적: 기능 우선순위, KPI 정의
├─ 사용 시기: 구현 우선순위 결정 시
└─ 예: F-07 방 나가기가 P0라서 우선 구현

requirement.md (기술 상세 SPEC)
├─ 목적: API, DB, 에러 코드 정의
├─ 사용 시기: API 개발 시
└─ 예: Long Polling 타이밍은 requirement AC 4 참조
```

### 2️⃣ Mock-First 접근

```typescript
// ❌ 나쁜 예: API 없이 실제 구현을 기다림
function Dashboard() {
  const rooms = fetchFromServerAPI(); // 아직 없음!
}

// ✅ 좋은 예: Mock으로 UI 먼저 검증
import { MOCK_ROOMS } from '@/features/room-list/mocks';
function Dashboard() {
  const [rooms, setRooms] = useState(MOCK_ROOMS);
  // 나중에 API로 교체
}
```

### 3️⃣ 점진적 통합

```
1단계: Mock 데이터만 사용
  /dashboard → MOCK_ROOMS 렌더링

2단계: API 엔드포인트 연결
  GET /api/rooms (작동) → MOCK_ROOMS 대체

3단계: 실시간 기능 추가
  Long Polling GET /api/rooms/{id}/updates
```

### 4️⃣ 병렬 작업 구조

```
팀원 A: /signup, /login 페이지 구현
        ↑
        AuthContext 인터페이스 (Mock)
        ↑
팀원 B: POST /api/auth/signup, login 구현
        → 완성되면 Mock → API로 교체

팀원 C: /dashboard 페이지 구현 (Mock RoomList)
        ↑
        RoomListContext 인터페이스
        ↑
팀원 D: GET /api/rooms, POST /api/rooms 구현
```

---

## ❓ 자주 묻는 질문 (FAQ)

### Q1. 페이지 구현 중 어떤 문서를 참고해야 하나요?
**A.** 3가지를 순서대로 참고하세요:
1. 이 파일(implementation-plan.md)의 페이지 섹션
2. spec.md의 해당 Flow
3. state-management.md의 해당 Context 섹션

### Q2. API 개발 시 어떤 문서를 참고해야 하나요?
**A.** 2가지를 참고하세요:
1. implementation-plan.md 2단계의 API 목록
2. requirement.md의 Acceptance Criteria

### Q3. Context 구현할 때는?
**A.** 3가지를 참고하세요:
1. implementation-plan.md 3단계의 Context 인터페이스
2. state-management.md의 해당 Context 섹션 (예: 7.2)
3. 데이터 흐름은 state-management.md 섹션 5

### Q4. Mock 데이터는 어디에 저장하나요?
**A.** 각 feature 폴더 내 `mocks` 디렉토리:
```
src/features/auth/mocks/index.ts
src/features/room-list/mocks/index.ts
src/features/active-room/mocks/index.ts
```

### Q5. 여러 페이지가 같은 Context를 사용할 때는?
**A.** Context의 관심사 분리 유지:
- AuthContext: 로그인/로그아웃만 (모든 페이지 공통)
- RoomListContext: 채팅방 목록만 (대시보드 + 채팅방)
- UIContext: 모달/Toast만 (모든 페이지 공통)

각 Context는 독립적으로 동작하되, 필요할 때만 상위 Context 참조

---

## 📚 문서 간 연결 맵

```
implementation-plan.md (이 문서)
├─ 1단계 인벤토리 → spec.md (Flow 매핑)
├─ 2단계 API → requirement.md (Acceptance Criteria)
├─ 3단계 Context → state-management.md (섹션 7. 인터페이스)
├─ 4단계 페이지 계획 → spec.md (상세 시나리오)
└─ 5단계 매핑 → state-management.md (새 섹션 10)

spec.md (001~007)
├─ 각 Flow의 Main Scenario → prd.md (기능 ID F-00.1~F-07)
└─ Edge Cases → requirement.md (에러 코드)

prd.md (기능 정의)
├─ 각 기능의 "What" → spec.md (Flow로 실현)
└─ KPI 및 비-기능 → state-management.md (성능, 보안)

requirement.md (기술 스펙)
├─ Acceptance Criteria → API 구현 명세
├─ Data Model → DB 마이그레이션
└─ Constraints → state-management.md (성능, 보안)

state-management.md (기술 설계)
├─ Context 구조 → implementation-plan.md (구현 순서)
├─ Data Flow → 실제 구현 시 참조
└─ 성능 최적화 → 모든 Context 구현 시 적용
```

---

**문서 버전**: v1.0  
**작성일**: 2025년 11월 15일  
**대상 독자**: 개발자, 팀 리드  
**관련 문서**: state-management.md, prd.md, requirement.md, spec.md (001~007)
