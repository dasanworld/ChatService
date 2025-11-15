# 상태 관리 명세서 (State Management Specification)

> 작성일: 2025년 11월 15일  
> 기반 문서: `docs/requirement.md v1.6`

---

## 1. 관리해야 할 상태 데이터 목록

### 1.1 인증 상태 (Authentication State)

| 상태 키 | 타입 | 저장 위치 | 설명 |
|---------|------|----------|------|
| `user` | `User \| null` | Context/Store | 현재 로그인한 사용자 정보 |
| `session` | `Session \| null` | Cookie/LocalStorage | Supabase 세션 토큰 |
| `isAuthenticated` | `boolean` | Derived | `user !== null` 계산값 |
| `isLoading` | `boolean` | Store | 인증 상태 로딩 중 |

### 1.2 채팅방 목록 상태 (Room List State)

| 상태 키 | 타입 | 저장 위치 | 설명 |
|---------|------|----------|------|
| `rooms` | `Room[]` | Store | 참여 중인 채팅방 목록 |
| `activeRoomId` | `string \| null` | Store | 현재 활성화된 방 ID |
| `unreadCounts` | `Map<roomId, number>` | Store | 방별 안 읽은 메시지 수 |
| `lastMessages` | `Map<roomId, Message>` | Store | 방별 최신 메시지 (목록용) |

### 1.3 채팅방 내부 상태 (Room Detail State)

| 상태 키 | 타입 | 저장 위치 | 설명 |
|---------|------|----------|------|
| `roomInfo` | `RoomDetail \| null` | Store | 현재 방 메타데이터 |
| `messages` | `Message[]` | Store | 현재 방의 메시지 목록 |
| `participants` | `Participant[]` | Store | 현재 방의 참여자 목록 |
| `lastSyncVersion` | `number` | Store | Long Polling 커서 |
| `pollingState` | `'idle' \| 'live' \| 'catchup'` | Store | Polling 모드 |

### 1.4 메시지 전송 상태 (Message Sending State)

| 상태 키 | 타입 | 저장 위치 | 설명 |
|---------|------|----------|------|
| `pendingMessages` | `Map<clientId, PendingMessage>` | Store | 전송 중인 메시지 (Optimistic UI) |
| `sendingStatus` | `'idle' \| 'sending' \| 'error'` | Derived | 메시지별 전송 상태 |
| `replyTarget` | `Message \| null` | Store | 답장 대상 메시지 |

### 1.5 UI 상태 (UI State)

| 상태 키 | 타입 | 저장 위치 | 설명 |
|---------|------|----------|------|
| `isCreateModalOpen` | `boolean` | Store | 방 생성 모달 열림 여부 |
| `isInviteModalOpen` | `boolean` | Store | 초대 모달 열림 여부 |
| `isLeaveModalOpen` | `boolean` | Store | 방 나가기 모달 열림 여부 |
| `contextMenu` | `ContextMenu \| null` | Store | 우클릭 메뉴 위치 및 데이터 |
| `scrollPosition` | `number` | Local | 스크롤 위치 (히스토리 로딩용) |

### 1.6 초대 상태 (Invitation State)

| 상태 키 | 타입 | 저장 위치 | 설명 |
|---------|------|----------|------|
| `inviteToken` | `string \| null` | Cookie | 초대 링크 토큰 (roomId) |
| `inviteRoomInfo` | `RoomInfo \| null` | Store | 초대받은 방 정보 |

### 1.7 메시지 상호작용 상태 (Message Interaction State)

| 상태 키 | 타입 | 저장 위치 | 설명 |
|---------|------|----------|------|
| `likedMessages` | `Set<messageId>` | Store | 내가 좋아요한 메시지 ID |
| `hiddenMessages` | `Set<messageId>` | Store | 나에게만 삭제된 메시지 ID |
| `optimisticLikes` | `Map<messageId, delta>` | Store | Optimistic 좋아요 변경 (+1/-1) |

---

## 2. 화면에 보여지지만 상태가 아닌 데이터 (Derived/Computed Data)

### 2.1 계산된 데이터 (Computed)

| 데이터 | 계산 방식 | 사용처 |
|--------|----------|--------|
| `isAuthenticated` | `user !== null` | 전역 인증 체크 |
| `sortedRooms` | `rooms.sort((a, b) => b.lastActivity - a.lastActivity)` | 대시보드 목록 |
| `visibleMessages` | `messages.filter(m => !hiddenMessages.has(m.id))` | 채팅방 화면 |
| `filteredParticipants` | `participants.filter(p => !p.isKicked)` | 참여자 목록 |
| `totalUnread` | `sum(unreadCounts.values())` | 전역 배지 |
| `messageWithLikes` | `message + optimisticLikes.get(id)` | 메시지 좋아요 수 |

### 2.2 포맷팅된 데이터 (Formatted)

| 데이터 | 포맷 방식 | 사용처 |
|--------|----------|--------|
| `formattedTime` | `formatDistanceToNow(message.created_at)` | 메시지 시각 |
| `userInitials` | `user.nickname.slice(0, 2).toUpperCase()` | 아바타 |
| `truncatedMessage` | `message.content.slice(0, 50) + '...'` | 방 목록 미리보기 |
| `participantCount` | `participants.length + '명'` | 방 정보 |

### 2.3 서버에서 받은 정적 데이터 (Server Data)

| 데이터 | 소스 | 특징 |
|--------|------|------|
| `room.name` | Snapshot API | 서버 데이터, 변경 시 이벤트로 업데이트 |
| `message.content` | Polling Events | 불변 데이터 |
| `participant.role` | Snapshot API | 변경 시 이벤트로 업데이트 |
| `user.email` | Auth API | 세션 동안 불변 |

---

## 3. 상태 변경 조건 및 화면 반영 테이블

### 3.1 인증 상태 변경

| 상태 | 변경 조건 | 화면 변화 |
|------|----------|----------|
| `user: null → User` | 로그인/가입 성공 | 랜딩 → 대시보드 리디렉션 |
| `user: User → null` | 로그아웃 클릭 | 대시보드 → 랜딩 리디렉션 |
| `isLoading: true → false` | 세션 확인 완료 | 로딩 스피너 → 콘텐츠 표시 |
| `session: null → Session` | 토큰 발급 | 쿠키 저장, API 요청 가능 |

### 3.2 채팅방 목록 상태 변경

| 상태 | 변경 조건 | 화면 변화 |
|------|----------|----------|
| `rooms: [] → [Room]` | 첫 방 생성 | Empty State → 방 목록 표시 |
| `rooms: [Room] → []` | 마지막 방 나가기 | 방 목록 → Empty State |
| `rooms: 정렬 변경` | 새 메시지 도착 | 해당 방이 목록 최상단으로 이동 |
| `unreadCounts[roomId]: +1` | Polling에서 새 메시지 수신 (다른 방) | 방 옆에 배지 수 증가 |
| `unreadCounts[roomId]: 0` | 해당 방 진입 | 배지 사라짐 |
| `activeRoomId: null → roomId` | 방 클릭 | 채팅방 화면으로 전환 |

### 3.3 채팅방 내부 상태 변경

| 상태 | 변경 조건 | 화면 변화 |
|------|----------|----------|
| `messages: [] → [Message]` | 스냅샷 API 응답 | 최신 50개 메시지 표시 |
| `messages: append` | Polling에서 `message_created` 이벤트 | 새 메시지가 하단에 추가 |
| `messages: prepend` | 위로 스크롤 (과거 로딩) | 과거 메시지가 상단에 추가 |
| `messages[id].like_count: +N` | Polling에서 `message_updated` (Batched) | 좋아요 수 증가 애니메이션 |
| `messages[id].is_deleted: true` | Polling에서 `message_updated` (모두 삭제) | 메시지 내용이 "삭제된 메시지입니다."로 변경 |
| `hiddenMessages: add(id)` | Polling에서 `private_deletions` | 해당 메시지가 화면에서 사라짐 |
| `participants: add` | Polling에서 `participant_joined` | 참여자 목록에 추가, 시스템 메시지 표시 |
| `participants: remove` | Polling에서 `participant_left/kicked` | 참여자 목록에서 제거, 시스템 메시지 표시 |
| `lastSyncVersion: N → N+50` | Polling 응답 처리 | (화면 변화 없음, 커서만 업데이트) |
| `pollingState: 'idle' → 'catchup'` | `has_more: true` 수신 | 화면 상단에 "동기화 중..." 표시 |
| `pollingState: 'catchup' → 'live'` | `has_more: false` 도달 | "동기화 중..." 사라짐, 실시간 모드 전환 |

### 3.4 메시지 전송 상태 변경

| 상태 | 변경 조건 | 화면 변화 |
|------|----------|----------|
| `pendingMessages: add` | 전송 버튼 클릭 | 메시지가 "전송 중..." 라벨과 함께 목록에 추가 |
| `pendingMessages: remove` | Polling에서 `client_message_id` 매칭 | "전송 중..." → 일반 메시지로 교체 |
| `pendingMessages: error` | API 요청 실패 | "전송 실패. 다시 시도" 버튼 표시 |
| `replyTarget: null → Message` | 답장 버튼 클릭 | 입력창 상단에 "OOO님에게 답장" 표시 |
| `replyTarget: Message → null` | 전송 완료 또는 취소 | 답장 표시 사라짐 |

### 3.5 UI 모달 상태 변경

| 상태 | 변경 조건 | 화면 변화 |
|------|----------|----------|
| `isCreateModalOpen: false → true` | `[새 채팅 시작]` 클릭 | 방 생성 모달 표시 |
| `isCreateModalOpen: true → false` | 생성 완료 또는 취소 | 모달 닫힘 |
| `isInviteModalOpen: false → true` | `[초대하기]` 클릭 | 초대 URL 모달 표시 |
| `isLeaveModalOpen: false → true` | `[방 나가기]` 클릭 | 확인 모달 표시 |
| `contextMenu: null → {...}` | 우클릭/롱프레스 | 컨텍스트 메뉴 표시 |
| `contextMenu: {...} → null` | 외부 클릭 또는 메뉴 선택 | 메뉴 사라짐 |

### 3.6 초대 상태 변경

| 상태 | 변경 조건 | 화면 변화 |
|------|----------|----------|
| `inviteToken: null → roomId` | 초대 URL 접속 | 쿠키 저장 (화면 변화 없음) |
| `inviteRoomInfo: null → Room` | 방 검증 API 성공 | 초대 컨텍스트 인증 페이지 표시 |
| `inviteRoomInfo: null (오류)` | 방 검증 API 실패 (404) | "유효하지 않은 초대" 에러 페이지 |
| `inviteToken: roomId → null` | 가입/로그인 후 방 참여 완료 | 채팅방 화면으로 리디렉션 |

### 3.7 메시지 상호작용 상태 변경

| 상태 | 변경 조건 | 화면 변화 |
|------|----------|----------|
| `likedMessages: add(id)` | 좋아요 버튼 클릭 | 하트 아이콘 색상 변경 |
| `likedMessages: remove(id)` | 좋아요 취소 클릭 | 하트 아이콘 원래 색으로 |
| `optimisticLikes[id]: +1` | 좋아요 클릭 (즉시) | 좋아요 수 +1 표시 (Optimistic) |
| `optimisticLikes[id]: 0` | Polling에서 실제 `like_count` 수신 | 서버 값으로 교체 |

---

## 4. 상태 동기화 흐름 (State Sync Flow)

### 4.1 초기 진입 (Snapshot)

```
1. 사용자가 채팅방 진입
2. lastSyncVersion: null → 0 (초기화)
3. pollingState: 'idle'
4. API: GET /rooms/{roomId}/snapshot
5. messages: [] → [최신 50개]
6. participants: [] → [100명]
7. lastSyncVersion: 0 → 500 (서버 응답)
8. pollingState: 'idle' → 'live'
9. Long Polling 시작
```

### 4.2 실시간 메시지 수신 (Live)

```
1. Polling 대기 중 (30초)
2. 새 메시지 발생
3. 서버 즉시 응답
4. events: [{ version: 501, type: 'message_created', ... }]
5. messages: append(새 메시지)
6. lastSyncVersion: 500 → 501
7. 즉시 다음 Polling 요청
```

### 4.3 오프라인 복구 (Catchup)

```
1. 네트워크 끊김 (10분)
2. 재연결
3. pollingState: 'idle' → 'catchup'
4. API: GET /updates?since_version=500
5. events: [501~650] (150개 이벤트)
6. has_more: true
7. 재귀 호출 (Exponential Backoff)
8. 최종 has_more: false
9. 모든 이벤트 적용
10. pollingState: 'catchup' → 'live'
```

### 4.4 좋아요 Batching (서버측)

```
[Client A] 좋아요 클릭
1. optimisticLikes[id]: +1 (즉시 UI)
2. API: POST /messages/{id}/like
3. 서버: like_count +1 (DB)
4. 서버: RoomEvent 생성 X (Batch 대기)

[5초 후]
5. 서버: Batching 타이머 종료
6. 서버: RoomEvent 생성 (version: 502, type: 'message_updated', like_count: 55)

[Client B] Polling 응답
7. events: [{ version: 502, like_count: 55 }]
8. messages[id].like_count: 50 → 55
```

---

## 5. 상태 저장 위치 및 영속성

| 상태 | 저장소 | 영속성 | 복원 시점 |
|------|--------|--------|----------|
| `session` | Cookie | 7일 | 앱 재시작 시 자동 복원 |
| `inviteToken` | Cookie | 1시간 | 초대 링크 접속 시 저장 |
| `user` | Memory (Context) | 세션 동안 | 새로고침 시 API로 재조회 |
| `rooms` | Memory (Store) | 없음 | 대시보드 진입 시 API 조회 |
| `messages` | Memory (Store) | 없음 | 채팅방 진입 시 Snapshot API |
| `lastSyncVersion` | Memory (Store) | 없음 | Snapshot API 응답에서 초기화 |
| `likedMessages` | LocalStorage | 영구 | 앱 시작 시 복원 |
| `hiddenMessages` | LocalStorage | 영구 | 앱 시작 시 복원 |
| `scrollPosition` | SessionStorage | 탭 닫을 때까지 | 뒤로가기 시 복원 |

---

## 6. 상태 관리 아키텍처 권장사항

### 6.1 전역 상태 (Global State)
- **사용:** Zustand 또는 React Context
- **범위:** `user`, `session`, `activeRoomId`

### 6.2 서버 상태 (Server State)
- **사용:** React Query (`@tanstack/react-query`)
- **범위:** `rooms`, `messages`, `participants`
- **캐시 전략:**
  - `rooms`: `staleTime: 30000` (30초)
  - `messages`: `staleTime: Infinity` (Polling으로만 업데이트)
  - `participants`: `staleTime: 60000` (1분)

### 6.3 UI 상태 (UI State)
- **사용:** Local Component State (`useState`)
- **범위:** `isModalOpen`, `contextMenu`, `scrollPosition`

### 6.4 Optimistic 상태
- **사용:** Zustand Middleware 또는 React Query Mutation
- **범위:** `pendingMessages`, `optimisticLikes`
- **Rollback:** API 실패 시 자동 복원

---

## 7. 상태 디버깅 체크리스트

| 문제 | 확인 사항 | 해결 방법 |
|------|----------|----------|
| 메시지 중복 | `client_message_id` 매칭 로직 | Pending 메시지를 서버 응답으로 교체 |
| 좋아요 수 불일치 | Optimistic vs 서버 값 | Polling 응답으로 교체 |
| 참여자 목록 오류 | Kick 이벤트 처리 | `participant_kicked` 이벤트 리스너 |
| Polling 무한루프 | `lastSyncVersion` 업데이트 누락 | 응답 처리 후 반드시 업데이트 |
| 스크롤 점프 | 메시지 prepend 시 스크롤 보정 | `scrollTop` 계산 및 조정 |
| 세션 만료 | 401 에러 처리 | 자동 로그아웃 및 리디렉션 |

---

## 8. 결론

이 문서에서 정의한 상태 구조를 따르면:
1. ✅ **명확한 책임 분리:** 서버 상태 vs UI 상태
2. ✅ **Optimistic UI:** 빠른 사용자 경험
3. ✅ **실시간 동기화:** Long Polling 기반
4. ✅ **오프라인 복구:** Gap Handling
5. ✅ **확장 가능:** 새 기능 추가 용이

다음 단계: 각 상태에 대한 구체적인 Zustand Store 또는 React Query Hook 구현.
