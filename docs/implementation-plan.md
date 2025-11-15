---
title: 페이지 단위 구현 계획서
description: 페이지 구현 전 필요한 단계별 계획
version: v1.1
date: 2025년 11월 15일 (최종 업데이트)
related_docs:
  - state-management.md (기술 아키텍처)
  - docs/prd.md (기능 정의)
  - docs/requirement.md (요구사항)
  - docs/00N/spec.md (Flow 명세)
  - docs/pages/*/state-management.md (페이지별 상세 구현 가이드)
---

# 📋 페이지 단위 구현 계획서

> **목적**: 페이지 구현 전에 수행해야 할 5단계 계획을 정의하고, 
> 문서(state-management.md, spec.md, prd.md, requirement.md) 간의 혼란을 최소화합니다.

> **최신 업데이트**: Auth 백엔드/프론트엔드 구현 완료 (2025-11-15). State Management는 문서화 완료, 실제 구현 대기 중.

---

## 📊 현재 구현 상태 (2025-11-15 기준)

### ✅ 완료된 작업

#### Backend Layer
- ✅ **Auth Service** (`src/features/auth/backend/`)
  - `error.ts`: 7개 에러 코드 정의 (INVALID_CREDENTIALS, EMAIL_ALREADY_EXISTS 등)
  - `schema.ts`: Signup 요청/응답 Zod 스키마
  - `service.ts`: `createUserProfile()` - 닉네임 중복 체크, 프로필 생성
  - `route.ts`: `POST /api/auth/signup` Hono 라우터
- ✅ **Hono App Integration**
  - `src/backend/hono/app.ts`: `registerAuthRoutes()` 등록
  - HMR 지원 (개발 환경에서 싱글턴 해제)

#### Frontend Layer
- ✅ **Auth Components**
  - `src/features/auth/schemas/signup.ts`: 클라이언트 폼 검증 (한글 메시지)
  - `src/features/auth/hooks/useSignup.ts`: Axios 기반 회원가입 훅
  - `src/features/auth/components/SignupForm.tsx`: React Hook Form + Zod
  - `src/app/signup/page.tsx`: SignupForm 컴포넌트 사용 (리팩토링 완료)
- ✅ **Build Validation**
  - TypeScript 컴파일 성공 (0 errors)
  - 개발 서버 정상 작동 (localhost:3000)

#### Database
- ✅ **Schema Migration**
  - `supabase/migrations/0002_init_core_schema.sql`: profiles, rooms, messages 테이블 생성
  - RLS 비활성화 (MVP용 service_role 접근)

#### Documentation
- ✅ **State Management 상세 가이드** (6개 파일)
  - `docs/pages/signup/state-management.md`: AuthContext 전체 구현 가이드
  - `docs/pages/login/state-management.md`: 로그인 + 공유 AuthContext
  - `docs/pages/dashboard/state-management.md`: RoomListContext + UIContext
  - `docs/pages/chat-room/state-management.md`: ActiveRoomContext + NetworkContext + Long Polling
  - `docs/pages/invite/state-management.md`: 초대 플로우
  - `docs/pages/state-management-overview.md`: 5주 구현 로드맵

### ⚠️ 부분 완료 (Migration 필요)

- ⚠️ **CurrentUserContext** (`src/features/auth/context/current-user-context.tsx`)
  - 기존: `useState` 사용 (Flux 패턴 미적용)
  - 필요: AuthContext로 마이그레이션 (useReducer + Actions)
  - 완료도: ~30%

### ❌ 미구현 (우선순위 순)

#### P0: Core State Management (0% → 100% 목표)
1. **AuthContext** (Week 1)
   - 파일: `src/features/auth/types.ts`, `context/authReducer.ts`, `context/AuthContext.tsx`
   - 상태: AuthState (user, session, status, error)
   - 액션: AUTH_REQUEST, SIGNUP_SUCCESS, LOGIN_SUCCESS, AUTH_FAILURE, LOGOUT, REFRESH_SESSION
   - 참조: `docs/pages/signup/state-management.md`

2. **UIContext** (Week 1-2)
   - 파일: `src/features/ui/types.ts`, `context/uiReducer.ts`, `context/UIContext.tsx`
   - 상태: modals, toasts, inviteToken
   - 액션: OPEN_MODAL, CLOSE_MODAL, SHOW_TOAST, HIDE_TOAST, SET_INVITE_TOKEN
   - 참조: `docs/pages/dashboard/state-management.md`

3. **RoomListContext** (Week 2)
   - 파일: `src/features/room-list/types.ts`, `context/roomListReducer.ts`, `context/RoomListContext.tsx`
   - 상태: rooms, selectedRoom, isLoading, totalUnreadCount
   - 액션: FETCH_ROOMS_SUCCESS, SELECT_ROOM, UPDATE_LAST_MESSAGE, INCREMENT_UNREAD
   - 참조: `docs/pages/dashboard/state-management.md`

4. **NetworkContext** (Week 2-3)
   - 파일: `src/features/network/types.ts`, `context/networkReducer.ts`, `context/NetworkContext.tsx`
   - 상태: isOnline, retryCount, backoffDelay, lastSyncAttempt
   - 액션: RECORD_SYNC_ATTEMPT, RECORD_SYNC_SUCCESS, RECORD_SYNC_FAILURE, RESET_BACKOFF
   - 참조: `docs/pages/chat-room/state-management.md`

5. **ActiveRoomContext** (Week 3-4)
   - 파일: `src/features/active-room/types.ts`, `context/activeRoomReducer.ts`, `context/ActiveRoomContext.tsx`
   - 상태: messages (14+ fields), isPollingActive, pendingMessages, replyTarget
   - 액션: ENTER_ROOM, EXIT_ROOM, ADD_MESSAGE, SEND_MESSAGE_PENDING, LIKE_MESSAGE 등 15+ 액션
   - 커스텀 훅: `useLongPolling` (AbortController, exponential backoff)
   - 참조: `docs/pages/chat-room/state-management.md`

#### P0: API Endpoints
- ❌ POST /api/auth/login
- ❌ POST /api/auth/logout
- ❌ GET /api/auth/me
- ❌ POST /api/auth/request-reset
- ❌ POST /api/auth/reset-password
- ❌ GET /api/rooms
- ❌ POST /api/rooms
- ❌ GET /api/rooms/{roomId}/snapshot
- ❌ GET /api/rooms/{roomId}/messages
- ❌ POST /api/rooms/{roomId}/messages
- ❌ GET /api/rooms/{roomId}/updates (Long Polling)
- ❌ DELETE /api/messages/{messageId}
- ❌ POST /api/messages/{messageId}/like
- ❌ DELETE /api/messages/{messageId}/like
- ❌ POST /api/rooms/{roomId}/leave
- ❌ GET /api/invites/{token}
- ❌ POST /api/invites

#### P0: Pages
- ❌ `/login` 페이지 (AuthContext 사용)
- ❌ `/auth/reset-password` 페이지
- ❌ `/dashboard` 페이지 (RoomListContext + UIContext)
- ❌ `/chat/[roomId]` 페이지 (모든 Context)
- ❌ `/invite/[token]` 페이지

### 📈 완료율

| 레이어 | 완료 | 진행률 |
|-------|-----|--------|
| **Backend (API)** | 1/17 | 6% |
| **State Management** | 0/5 | 0% (문서 100%) |
| **Pages** | 1/6 | 17% |
| **전체** | 2/28 | **7%** |

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

| 페이지 | URL | PRD 기능 | spec.md Flow | 필요 Context | 상태 | 구현 문서 |
|--------|-----|---------|--------------|--------------|------|-----------|
| 랜딩 | `/` | - | 001 사전 | 없음 | 미구현 | - |
| 회원가입 | `/signup` | F-00.1 | 001 | AuthContext | ✅ 완료 (백엔드+프론트) | [가이드](./pages/signup/state-management.md) |
| 로그인 | `/login` | F-00.2 | 001 | AuthContext | ❌ 미구현 | [가이드](./pages/login/state-management.md) |
| 비밀번호 찾기 | `/auth/reset-password` | F-00.3 | 001.5 | AuthContext | ❌ 미구현 | - |
| 초대 인증 | `/invite/[token]` | - | 004 | AuthContext + UIContext | ❌ 미구현 | [가이드](./pages/invite/state-management.md) |
| 대시보드 | `/dashboard` | F-01, F-07 | 002, 005 | AuthContext + RoomListContext + UIContext | ❌ 미구현 | [가이드](./pages/dashboard/state-management.md) |
| 채팅방 | `/chat/[roomId]` | F-02~F-06 | 003, 006, 007 | 모든 Context | ❌ 미구현 | [가이드](./pages/chat-room/state-management.md) |

**전체 로드맵**: [State Management Overview](./pages/state-management-overview.md)

---

## 🚀 5단계 구현 계획

> **참고**: 1단계(페이지 인벤토리)는 완료되었고, 3단계(Context 인터페이스)는 문서화 완료. 현재는 **실제 구현 단계**입니다.

### **✅ 1단계: 페이지 인벤토리 정리** (완료: 2025-11-15)

#### 상태: 완료
위의 "페이지-Flow-기능 매핑 테이블" 섹션 참조. 6개 페이지 확정.

---

### **2단계: Backend API 우선순위 정렬** (소요 시간: 반나절)

#### 목적
구현할 페이지 목록을 명확히 정의하고, 각 페이지의 책임 범위를 확정합니다.

#### 수행 작업
- [x] PRD의 기능(F-00.1~F-07)을 **화면 단위**로 분해
- [x] spec.md의 Flow(001~007)를 **URL 경로**로 매핑
- [x] 각 페이지의 **라우트**, **역할**, **필요 Context** 정리

#### 산출물: 페이지-Flow-기능 매핑 테이블 (위 참조)

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

- ✅ POST /api/auth/signup
  - Body: {email, password, nickname}
  - Response: {user, session}
  - 상태: **완료** (2025-11-15)
  - 참고: requirement.md 섹션 5

- ❌ POST /api/auth/login
  - Body: {email, password}
  - Response: {user, session}
  - 상태: 미구현

- ❌ POST /api/auth/logout
  - Response: {success}
  - 상태: 미구현

- ❌ POST /api/auth/request-reset
  - Body: {email}
  - Response: {success}
  - Rate Limit 필수 (IP당 분당 5회)
  - 상태: 미구현

- ❌ POST /api/auth/reset-password
  - Body: {token, password}
  - Response: {success}
  - 상태: 미구현

- ❌ GET /api/auth/me
  - Response: {user, session}
  - 세션 검증용
  - 상태: 미구현

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

### **✅ 3단계: Context 구현 순서 및 Mock 데이터 준비** (완료: 문서화)

#### 상태: 문서화 완료, 실제 구현 대기

#### 완료 산출물
6개 상세 구현 가이드 문서 작성 완료:
- ✅ [AuthContext 구현 가이드](./pages/signup/state-management.md)
- ✅ [Login + AuthContext 가이드](./pages/login/state-management.md)
- ✅ [RoomList + UI Context 가이드](./pages/dashboard/state-management.md)
- ✅ [ActiveRoom + Network Context 가이드](./pages/chat-room/state-management.md)
- ✅ [Invite 페이지 가이드](./pages/invite/state-management.md)
- ✅ [전체 로드맵 및 체크리스트](./pages/state-management-overview.md)

각 문서에는 다음이 포함됨:
- 완전한 TypeScript 타입 정의
- Reducer 전체 구현 코드
- Context Provider 샘플 코드
- Mermaid 시퀀스 다이어그램
- 단계별 구현 체크리스트
- Mock 데이터 예시

#### 다음 액션
**실제 코드 구현 시작** - AuthContext부터 순서대로 구현 (Week 1 목표)

---

### **4단계: 페이지별 구현 계획서 작성** (소요 시간: 반나절)



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

### 상태: ✅ 완료 (2025-11-15)

### 구현된 내용
- ✅ 이메일, 비밀번호, 닉네임 입력 폼
- ✅ 클라이언트 측 유효성 검증 (Zod + React Hook Form)
- ✅ 서버 API 호출 (POST /api/auth/signup)
- ✅ 로딩 상태 표시
- ✅ 에러 처리 (중복 이메일, 약한 비밀번호 등)
- ✅ 성공 시 /dashboard로 리디렉션
- ✅ 로그인 링크 제공

### 구현 파일
- `src/features/auth/backend/route.ts`: POST /api/auth/signup
- `src/features/auth/backend/service.ts`: createUserProfile
- `src/features/auth/components/SignupForm.tsx`: 폼 컴포넌트
- `src/features/auth/hooks/useSignup.ts`: 회원가입 훅
- `src/app/signup/page.tsx`: 페이지

### 남은 작업
- ⚠️ **AuthContext 마이그레이션 필요**: 현재 useSignup이 직접 API 호출, Context로 이전 필요
- 참고: [AuthContext 구현 가이드](./pages/signup/state-management.md)

### 관련 문서
- PRD: F-00.1
- Spec: 001 (신규 방문자 가입)

---

## 페이지 2: /login (로그인)

### 상태: ❌ 미구현

### 최소 구현 범위 (MVP)
- 이메일, 비밀번호 입력 폼
- 로그인 로직
- 회원가입 링크
- 비밀번호 찾기 링크
- 초대 토큰 있으면 자동으로 채팅방으로 이동
- 없으면 /dashboard로 이동
- 에러 처리

### 의존성
- AuthContext (login 액션) - 미구현
- UIContext (showToast, setInviteToken) - 미구현
- API: POST /api/auth/login - 미구현

### 성공 기준
- [ ] 유효한 자격 증명으로 로그인 성공
- [ ] 잘못된 자격 증명 시 에러 메시지
- [ ] 초대 토큰 없음 → /dashboard
- [ ] 초대 토큰 있음 → /invite/[token]
- [ ] 로딩 중 버튼 비활성화

### 구현 가이드
[Login State Management 가이드](./pages/login/state-management.md) 참조

### 관련 문서
- PRD: F-00.2
- Spec: 001 (신규 방문자 로그인)

---

## 페이지 3: /dashboard (대시보드)

### 상태: ❌ 미구현

### 최소 구현 범위 (MVP)
- 채팅방 목록 표시 (최신 활동순)
- Empty State (채팅방 없음)
- [새 채팅 시작] 버튼 → 모달
- 채팅방 클릭 → /chat/[roomId] 이동
- 우클릭/롱프레스 → [방 나가기]
- 안읽은 메시지 배지 표시
- 로딩/에러 상태

### 의존성
- AuthContext (currentUser, logout) - 30% 완료 (마이그레이션 필요)
- RoomListContext (fetchRooms, sortedRooms, selectRoom, leaveRoom) - 미구현
- UIContext (openModal) - 미구현
- API: GET /api/rooms, POST /api/rooms, POST /api/rooms/{id}/leave - 미구현

### 성공 기준
- [ ] 페이지 진입 시 방 목록 로드
- [ ] 방 목록 렌더링 (최신순 정렬)
- [ ] Empty State 표시
- [ ] [새 채팅 시작] 모달 열기
- [ ] 방 이름 입력 후 생성
- [ ] 생성된 방으로 이동
- [ ] [방 나가기] 기능
- [ ] 안읽은 메시지 배지

### 구현 가이드
[Dashboard State Management 가이드](./pages/dashboard/state-management.md) 참조

### 관련 문서
- PRD: F-01, F-07
- Spec: 002 (첫 로그인 온보딩), 005 (재방문)

---

## 페이지 4: /chat/[roomId] (채팅방)

### 상태: ❌ 미구현

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

### 의존성 (모두 미구현)
- AuthContext (currentUser)
- ActiveRoomContext (모든 액션) - 미구현
- RoomListContext (updateLastMessage) - 미구현
- UIContext (showToast, openModal) - 미구현
- NetworkContext (isOnline) - 미구현
- API: 모든 메시지 API (snapshot, messages, updates, like, delete) - 미구현

### 성공 기준
- [ ] 스냅샷 로드 및 메시지 표시
- [ ] 메시지 전송 (Optimistic UI)
- [ ] Long Polling으로 실시간 메시지 수신
- [ ] 과거 메시지 로드
- [ ] 메시지 답장, 좋아요, 삭제
- [ ] 오프라인 상태 표시
- [ ] 재연결 후 동기화

### 구현 가이드 (가장 복잡한 페이지)
[Chat Room State Management 가이드](./pages/chat-room/state-management.md) 참조
- ActiveRoomContext: 14+ 상태 필드, 15+ 액션
- NetworkContext: Exponential backoff (100ms → 30s)
- useLongPolling 커스텀 훅
- Optimistic UI 패턴
- 메모리 관리 (최대 500개 메시지)

### 관련 문서
- PRD: F-02~F-06
- Spec: 003 (채팅방 생성), 006 (메시지), 007 (메시지 관리)

---

## 페이지 5: /invite/[token] (초대 확인)

### 상태: ❌ 미구현

### 최소 구현 범위 (MVP)
- 초대 토큰 검증
- "OOO방에 초대되었습니다" 메시지 표시
- 미로그인: 로그인/회원가입 페이지로
  - 쿠키에 invite_token 저장
  - 로그인 후 자동으로 채팅방 이동
- 로그인한 상태: 채팅방으로 자동 이동
- 토큰 유효하지 않음: 에러 페이지

### 의존성
- AuthContext (isAuthenticated, currentUser) - 30% 완료 (마이그레이션 필요)
- UIContext (setInviteToken, showToast) - 미구현
- API: GET /api/invites/{token} - 미구현

### 성공 기준
- [ ] 토큰 검증
- [ ] 미로그인 시 로그인 페이지로 리디렉션
- [ ] 로그인 완료 후 채팅방 자동 이동
- [ ] 유효하지 않은 토큰 → 에러 페이지
- [ ] 초대 방 정보 표시

### 구현 가이드
[Invite State Management 가이드](./pages/invite/state-management.md) 참조

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

### 업데이트된 타임라인 (2025-11-15 기준)

```
✅ 준비 단계 완료:
- 페이지 인벤토리 정리
- Context 문서화 (6개 파일)
- Signup 페이지 + API 구현
- Database 마이그레이션

📍 현재 위치: Week 1 (AuthContext 구현 단계)

Week 1: AuthContext + 기본 인증 (현재 주)
├─ 월 (1일):  ✅ [완료] Signup 페이지 + API
├─ 화 (1일):  🎯 [다음] AuthContext 구현
│             - src/features/auth/types.ts (AuthState, AuthAction)
│             - src/features/auth/context/authReducer.ts
│             - src/features/auth/context/AuthContext.tsx
│             - CurrentUserContext 마이그레이션
│             참고: docs/pages/signup/state-management.md
├─ 수 (1일):  POST /api/auth/login 구현
│             - src/features/auth/backend/route.ts 확장
│             - login 서비스 함수 추가
├─ 목 (1일):  /login 페이지 구현
│             - SignupForm 참고하여 LoginForm 생성
│             - AuthContext 사용
│             참고: docs/pages/login/state-management.md
└─ 금 (1일):  UIContext 구현 시작
              - src/features/ui/types.ts
              - src/features/ui/context/uiReducer.ts
              - src/features/ui/context/UIContext.tsx
              - Modal, Toast 컴포넌트

Week 2: RoomList + API (대시보드)
├─ 월 (1일):  GET /api/rooms, POST /api/rooms API
├─ 화 (1일):  RoomListContext 구현
│             참고: docs/pages/dashboard/state-management.md
├─ 수 (1일):  /dashboard 페이지 UI
├─ 목 (1일):  Empty State, 모달 통합
└─ 금 (1일):  방 나가기 기능 (POST /api/rooms/{id}/leave)

Week 3: 메시지 기본 + NetworkContext
├─ 월-화:    메시지 API 구현
│            - GET /api/rooms/{roomId}/snapshot
│            - POST /api/rooms/{roomId}/messages
│            - GET /api/rooms/{roomId}/messages (과거)
├─ 수:       NetworkContext 구현
│            - exponential backoff 로직
│            참고: docs/pages/chat-room/state-management.md
├─ 목-금:    ActiveRoomContext 구현 (1/2)
│            - 기본 상태 구조
│            - enterRoom, exitRoom
│            - 메시지 표시 로직

Week 4: ActiveRoom 완성 + Long Polling
├─ 월-화:    Long Polling API 구현
│            - GET /api/rooms/{roomId}/updates
│            - 이벤트 스트림 처리
├─ 수-목:    useLongPolling 커스텀 훅
│            - AbortController
│            - 재연결 로직
│            - catchup 모드
├─ 금:       Optimistic UI 구현
│            - sendMessage (pending → confirmed)
│            - client_message_id 매칭

Week 5: 나머지 기능 + 통합 테스트
├─ 월:       메시지 액션 (답장, 좋아요, 삭제)
├─ 화:       초대 기능 (/invite/[token])
│            참고: docs/pages/invite/state-management.md
├─ 수:       비밀번호 찾기 페이지
├─ 목:       전체 통합 테스트
│            - 시나리오별 E2E 테스트
│            - 오프라인 복구 테스트
└─ 금:       성능 최적화
             - React.memo 적용
             - useMemo, useCallback 최적화
             - 메모리 누수 체크
```

---

## 💡 주요 권고사항

### 1️⃣ 문서 역할 존중하기

```
implementation-plan.md (이 문서 - 프로젝트 마스터 플랜)
├─ 목적: 전체 구현 로드맵, 진행 상황 추적, 우선순위 관리
├─ 사용 시기: 프로젝트 시작 전, 진행 상황 체크 시
└─ 최신 정보: 현재 구현 상태, 완료율, 다음 액션 아이템

docs/pages/*/state-management.md (상세 구현 가이드)
├─ 목적: 각 페이지별 Context 구현 방법 상세 가이드
├─ 사용 시기: 실제 코드 작성 시
└─ 포함 내용: 완전한 TypeScript 코드, Reducer, Mermaid 다이어그램

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

### 2️⃣ 구현 순서 엄수 (의존성 때문에 중요)

```
필수 순서:
1️⃣ AuthContext (Week 1 화요일)
   └─ 모든 페이지가 의존
   
2️⃣ UIContext (Week 1 금요일)
   └─ 모달, Toast 필요한 모든 페이지

3️⃣ RoomListContext (Week 2)
   └─ AuthContext 의존
   └─ Dashboard, ChatRoom이 필요
   
4️⃣ NetworkContext (Week 3)
   └─ ActiveRoomContext가 의존
   
5️⃣ ActiveRoomContext (Week 3-4)
   └─ RoomList + Network 의존
   └─ 가장 복잡한 Context (마지막에 구현)
```

### 3️⃣ ⚠️ CurrentUserContext 마이그레이션 (최우선)

```typescript
// ❌ 현재 상태 (src/features/auth/context/current-user-context.tsx)
// - useState 사용
// - Flux 패턴 아님
// - 직접 Supabase 호출

// ✅ 목표 상태 (src/features/auth/context/AuthContext.tsx)
// - useReducer 사용
// - Flux 패턴 (Actions → Reducer → State)
// - 명확한 액션 정의 (AUTH_REQUEST, SIGNUP_SUCCESS 등)

마이그레이션 단계:
1. AuthContext 구현 (docs/pages/signup/state-management.md 참조)
2. src/app/providers.tsx에서 CurrentUserProvider → AuthProvider 교체
3. 모든 useCurrentUser() 호출을 useAuth()로 교체
4. CurrentUserContext 파일 삭제
```

### 4️⃣ Mock-First 접근 (API 개발과 병렬 진행)

```typescript
// ✅ 좋은 예: Mock으로 UI 먼저 검증
import { MOCK_ROOMS } from '@/features/room-list/mocks';

function Dashboard() {
  const [rooms, setRooms] = useState(MOCK_ROOMS);
  // UI 개발 완료 후 API로 교체
  
  useEffect(() => {
    // TODO: API 준비되면 교체
    // fetchRooms().then(setRooms);
  }, []);
}
```

### 5️⃣ 병렬 작업 구조 (팀 협업 시)

```
동시 진행 가능한 작업:

[Frontend] AuthContext 구현
    ↓ (Mock 데이터 사용)
[Frontend] /login, /signup 페이지 완성
    ||
    || (병렬)
    ||
[Backend] POST /api/auth/login, /signup 구현
    ↓
[통합] Mock → 실제 API로 교체
```

### 6️⃣ 상세 구현 가이드 활용

```bash
# Context 구현 시작 전에 반드시 읽을 문서:

# Week 1 (AuthContext)
docs/pages/signup/state-management.md
docs/pages/login/state-management.md

# Week 2 (RoomList + UI)
docs/pages/dashboard/state-management.md

# Week 3-4 (ActiveRoom + Network)
docs/pages/chat-room/state-management.md  # 가장 긴 문서 (Long Polling 포함)

# Week 5 (Invite)
docs/pages/invite/state-management.md

# 전체 로드맵
docs/pages/state-management-overview.md
```

---

## ❓ 자주 묻는 질문 (FAQ)

### Q1. 지금 당장 무엇을 해야 하나요?
**A.** 다음 우선순위 작업:
1. **AuthContext 구현** (Week 1 화요일)
   - 파일: `src/features/auth/types.ts`, `context/authReducer.ts`, `context/AuthContext.tsx`
   - 가이드: [docs/pages/signup/state-management.md](./pages/signup/state-management.md)
2. **CurrentUserContext 마이그레이션**
   - 기존 useState → useReducer로 전환
   - providers.tsx에서 AuthProvider로 교체
3. **POST /api/auth/login 구현**
   - 파일: `src/features/auth/backend/route.ts` 확장
   - Signup 구현 참고

### Q2. 페이지 구현 중 어떤 문서를 참고해야 하나요?
**A.** 3단계 체크:
1. 이 문서(implementation-plan.md)의 "페이지별 구현 상세 계획" 섹션
2. `docs/pages/[페이지]/state-management.md` 상세 가이드
3. spec.md의 해당 Flow (사용자 시나리오)

예: /login 구현 시
- implementation-plan.md → "페이지 2: /login" 섹션 확인
- docs/pages/login/state-management.md → 전체 코드 복사/수정
- spec 001 → 사용자 시나리오 이해

### Q3. API 개발 시 어떤 문서를 참고해야 하나요?
**A.** 2단계 체크:
1. implementation-plan.md "2단계: Backend API 우선순위 정렬" → 구현할 API 확인
2. requirement.md의 Acceptance Criteria → 상세 스펙 (쿼리, 응답 형식 등)

### Q4. Context 구현할 때는?
**A.** 3단계 체크:
1. implementation-plan.md "3단계" → Context 우선순위 및 의존성 확인
2. `docs/pages/[페이지]/state-management.md` → 완전한 코드 샘플
3. state-management.md → 전체 아키텍처 이해

**중요**: 의존성 순서 반드시 지킬 것
- Auth → UI → RoomList → Network → ActiveRoom

### Q5. Mock 데이터는 어디에 저장하나요?
**A.** 각 feature 폴더 내 `mocks` 디렉토리:
```
src/features/auth/mocks/index.ts          # MOCK_USER, MOCK_SESSION
src/features/room-list/mocks/index.ts     # MOCK_ROOMS
src/features/active-room/mocks/index.ts   # MOCK_MESSAGES, MOCK_PARTICIPANTS
```

### Q6. 여러 페이지가 같은 Context를 사용할 때는?
**A.** Context의 관심사 분리 유지:
- **AuthContext**: 로그인/로그아웃만 (모든 페이지 공통)
- **RoomListContext**: 채팅방 목록만 (대시보드 + 채팅방)
- **UIContext**: 모달/Toast만 (모든 페이지 공통)

각 Context는 독립적으로 동작하되, 필요할 때만 상위 Context 참조

### Q7. 빌드 에러가 나면?
**A.** 체크리스트:
1. `npm run build` 실행하여 TypeScript 에러 확인
2. 모든 import 경로 확인 (`@/` alias 사용)
3. Supabase 타입 에러는 무시 가능 (IDE false positive, 실제 빌드는 성공)
4. Context Provider가 src/app/providers.tsx에 올바른 순서로 등록되었는지 확인

### Q8. Long Polling 구현이 어려워요
**A.** 단계별 접근:
1. **Week 3**: NetworkContext 먼저 구현 (재연결 로직만)
2. **Week 4**: ActiveRoomContext 기본 구조 (메시지 표시만)
3. **Week 4 후반**: useLongPolling 커스텀 훅
4. **참고 문서**: [docs/pages/chat-room/state-management.md](./pages/chat-room/state-management.md) - 가장 상세한 가이드

**핵심 포인트**:
- AbortController로 cleanup
- Exponential backoff (100ms → 30s)
- catchup 모드 (offline 복구)

### Q9. Optimistic UI는 언제 적용하나요?
**A.** Week 4 (메시지 전송만):
- 메시지 전송 시: 즉시 UI에 표시 (pending 상태)
- 서버 응답: client_message_id로 매칭하여 confirmed로 변경
- 실패 시: 에러 표시 및 제거
- **참고**: docs/pages/chat-room/state-management.md 섹션 5.1

### Q10. 현재 7% 완료인데 언제 끝나나요?
**A.** 5주 타임라인 기준:
- **Week 1 (현재)**: +20% (Auth + UI Context) → 27%
- **Week 2**: +20% (RoomList + Dashboard) → 47%
- **Week 3**: +20% (메시지 기본 + Network) → 67%
- **Week 4**: +20% (ActiveRoom + Long Polling) → 87%
- **Week 5**: +13% (통합 + 테스트) → **100%**

**주의**: Long Polling이 가장 시간 소요 (Week 4 전체)

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

## 🎯 다음 액션 아이템 (Next Steps)

### 🔥 최우선 작업 (Week 1 화요일 - 오늘/내일)

#### 1. AuthContext 구현 (예상 소요: 4-6시간)
```bash
# 생성할 파일:
src/features/auth/types.ts
src/features/auth/context/authReducer.ts
src/features/auth/context/AuthContext.tsx
src/features/auth/hooks/useAuth.ts

# 가이드 문서:
docs/pages/signup/state-management.md
```

**체크리스트**:
- [ ] `AuthState` 인터페이스 정의 (user, session, status, error)
- [ ] `AuthAction` 타입 정의 (6개 액션: AUTH_REQUEST, SIGNUP_SUCCESS 등)
- [ ] `authReducer` 함수 구현 (switch-case 패턴)
- [ ] `AuthContext` + `AuthProvider` 구현 (useReducer 사용)
- [ ] `useAuth` 커스텀 훅 구현
- [ ] `src/app/providers.tsx`에 AuthProvider 등록

**성공 기준**:
- TypeScript 컴파일 성공
- npm run build 에러 없음
- useAuth() 훅 사용 가능

---

#### 2. CurrentUserContext 마이그레이션 (예상 소요: 2-3시간)

**체크리스트**:
- [ ] useSignup 훅을 AuthContext의 signup 액션 사용하도록 수정
- [ ] providers.tsx에서 CurrentUserProvider → AuthProvider로 교체
- [ ] 모든 useCurrentUser() → useAuth()로 검색/교체
- [ ] src/features/auth/context/current-user-context.tsx 파일 삭제
- [ ] 테스트: /signup 페이지 동작 확인

---

#### 3. POST /api/auth/login 구현 (예상 소요: 2-3시간)

**체크리스트**:
- [ ] `src/features/auth/backend/service.ts`에 `authenticateUser` 함수 추가
- [ ] `src/features/auth/backend/route.ts`에 POST /api/auth/login 라우터 추가
- [ ] `src/features/auth/backend/schema.ts`에 LoginRequest/Response 스키마 추가
- [ ] 에러 처리 (INVALID_CREDENTIALS)
- [ ] Postman/curl로 테스트

---

### 📋 Week 1 나머지 작업

#### 4. /login 페이지 구현 (수요일, 4-5시간)
- 가이드: [docs/pages/login/state-management.md](./pages/login/state-management.md)
- SignupForm 참고하여 LoginForm 컴포넌트 생성
- AuthContext의 login 액션 사용
- 초대 토큰 처리 (UIContext 필요하면 임시로 localStorage 사용)

#### 5. UIContext 구현 (목-금요일, 6-8시간)
- 모달 상태 관리 (createRoom, inviteUser, leaveRoom)
- Toast 상태 관리
- 초대 토큰 상태 관리
- Modal, Toast 공통 컴포넌트 생성

---

### 📊 진행 상황 업데이트 방법

```bash
# 작업 완료 시 이 파일에서:
1. "현재 구현 상태" 섹션의 체크박스 업데이트
2. "완료율" 표 업데이트
3. "페이지-Flow-기능 매핑 테이블"의 상태 컬럼 업데이트
```

---

### 🆘 도움이 필요할 때

**막히는 부분이 있으면**:
1. 해당 페이지의 state-management.md 문서 다시 읽기
2. 완료된 Signup 구현 참고 (`src/features/auth/` 폴더)
3. 에러 메시지로 grep_search 실행
4. FAQ 섹션 확인 (위 참조)

**추가 질문**:
- Context 구현 중 타입 에러 → FAQ Q7 참조
- 의존성 순서 헷갈림 → 권고사항 2️⃣ 참조
- Long Polling 어려움 → FAQ Q8 참조 (Week 4까지는 신경 안 써도 됨)

---

**문서 버전**: v1.1  
**최종 업데이트**: 2025년 11월 15일  
**대상 독자**: 개발자, 팀 리드  
**관련 문서**: 
- state-management.md (기술 아키텍처)
- docs/pages/*/state-management.md (상세 구현 가이드)
- prd.md (기능 정의)
- requirement.md (기술 요구사항)
- spec.md (사용자 Flow)

**다음 주요 마일스톤**:
- ✅ Week 0 완료: Signup 구현, 문서화
- 🎯 Week 1 목표: AuthContext + UIContext 완성, Login 페이지 완료
- 📅 Week 2 목표: Dashboard 페이지 완성 (RoomListContext)
- 📅 Week 3-4 목표: 채팅방 완성 (ActiveRoomContext + Long Polling)
- 📅 Week 5 목표: 통합 테스트 및 배포 준비
