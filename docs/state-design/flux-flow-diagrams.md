# Flux 패턴 상태 흐름 시각화

> 작성일: 2025년 11월 15일  
> 기반 문서: `docs/flux-architecture.md`, `docs/requirement.md v1.6`  
> 다이어그램: Mermaid Flowcharts

---

## 목차

1. [인증 흐름 (Auth Flow)](#1-인증-흐름-auth-flow)
2. [채팅방 목록 흐름 (Room List Flow)](#2-채팅방-목록-흐름-room-list-flow)
3. [메시지 전송 흐름 (Message Send Flow)](#3-메시지-전송-흐름-message-send-flow)
4. [Long Polling 실시간 동기화 흐름](#4-long-polling-실시간-동기화-흐름)
5. [좋아요 토글 흐름 (Like Toggle Flow)](#5-좋아요-토글-흐름-like-toggle-flow)
6. [채팅방 입장 흐름 (Room Enter Flow)](#6-채팅방-입장-흐름-room-enter-flow)
7. [메시지 답장 흐름 (Reply Flow)](#7-메시지-답장-흐름-reply-flow)
8. [메시지 삭제 흐름 (Delete Flow)](#8-메시지-삭제-흐름-delete-flow)
9. [오프라인 복구 흐름 (Offline Recovery Flow)](#9-오프라인-복구-흐름-offline-recovery-flow)
10. [채팅방 생성 흐름 (Create Room Flow)](#10-채팅방-생성-흐름-create-room-flow)
11. [초대 수락 흐름 (Invite Accept Flow)](#11-초대-수락-흐름-invite-accept-flow)
12. [채팅방 나가기 흐름 (Leave Room Flow)](#12-채팅방-나가기-흐름-leave-room-flow)

---

## 1. 인증 흐름 (Auth Flow)

### 1.1 로그인 성공 시나리오

```mermaid
sequenceDiagram
    participant User
    participant LoginView
    participant Action
    participant Reducer
    participant Store
    participant API
    participant View

    User->>LoginView: 이메일/비밀번호 입력 후 클릭
    LoginView->>Action: dispatch(loginRequest(email, pw))
    Action->>Reducer: AUTH_LOGIN_REQUEST
    Reducer->>Store: state.auth.status = 'loading'
    Store->>View: 리렌더링 (로딩 스피너 표시)
    
    LoginView->>API: POST /api/auth/login
    API-->>LoginView: {user, session}
    LoginView->>Action: dispatch(loginSuccess(user, session))
    Action->>Reducer: AUTH_LOGIN_SUCCESS
    Reducer->>Store: state.auth = {user, session, status: 'authenticated'}
    Store->>View: 리렌더링 (대시보드로 이동)
```

### 1.2 로그인 실패 시나리오

```mermaid
flowchart TD
    A[User: 잘못된 비밀번호 입력] --> B[LoginView]
    B --> C[Action: loginRequest]
    C --> D[Reducer: AUTH_LOGIN_REQUEST]
    D --> E[Store: status='loading']
    E --> F[View: 로딩 스피너]
    
    B --> G[API: POST /api/auth/login]
    G --> H{인증 실패}
    H --> I[Action: loginFailure]
    I --> J[Reducer: AUTH_LOGIN_FAILURE]
    J --> K[Store: error='Invalid credentials']
    K --> L[View: 에러 메시지 표시]
    
    style H fill:#f96,stroke:#333,stroke-width:2px
    style L fill:#faa,stroke:#333,stroke-width:2px
```

### 1.3 세션 복원 흐름

```mermaid
flowchart LR
    A[App 시작] --> B[LocalStorage 확인]
    B --> C{세션 존재?}
    C -->|Yes| D[Action: sessionRestore]
    C -->|No| E[Action: sessionExpired]
    
    D --> F[Reducer: AUTH_SESSION_RESTORE]
    F --> G[Store: user, session 복원]
    G --> H[View: 자동 로그인]
    
    E --> I[Reducer: AUTH_SESSION_EXPIRED]
    I --> J[Store: user=null]
    J --> K[View: 로그인 화면]
    
    style H fill:#9f9,stroke:#333,stroke-width:2px
```

---

## 2. 채팅방 목록 흐름 (Room List Flow)

### 2.1 초기 로드 흐름

```mermaid
sequenceDiagram
    participant Component as RoomListView
    participant Action
    participant Reducer
    participant Store
    participant API
    participant View

    Component->>Component: useEffect 실행
    Component->>Action: dispatch(fetchRequest())
    Action->>Reducer: ROOM_LIST_FETCH_REQUEST
    Reducer->>Store: state.roomList.status = 'loading'
    Store->>View: 스켈레톤 UI 표시

    Component->>API: GET /api/rooms
    API-->>Component: [{room1}, {room2}, ...]
    Component->>Action: dispatch(fetchSuccess(rooms))
    Action->>Reducer: ROOM_LIST_FETCH_SUCCESS
    Reducer->>Store: state.roomList.rooms = [...]
    Reducer->>Store: state.roomList.status = 'loaded'
    Store->>View: 채팅방 목록 렌더링
```

### 2.2 채팅방 선택 흐름

```mermaid
flowchart TD
    A[User: 채팅방 클릭] --> B[RoomListView]
    B --> C[Action: selectRoom roomId]
    C --> D[Reducer: ROOM_LIST_SELECT]
    D --> E[Store: selectedRoomId 업데이트]
    
    B --> F[Action: roomEnter roomId]
    F --> G[Reducer: ROOM_ENTER]
    G --> H[Store: activeRoom.roomId 설정]
    
    E --> I[View: 목록 하이라이트]
    H --> J[View: 채팅방 화면 전환]
    
    style E fill:#9cf,stroke:#333,stroke-width:2px
    style H fill:#9cf,stroke:#333,stroke-width:2px
```

### 2.3 실시간 업데이트 (새 메시지 도착)

```mermaid
flowchart TD
    A[Long Polling: 새 메시지 이벤트] --> B[Action: pollingEventReceived]
    B --> C{이벤트 타입}
    C -->|message_created| D[ActiveRoom Reducer]
    
    D --> E[Store: messages 배열에 추가]
    E --> F[부가 Action: updateLastMessage]
    F --> G[RoomList Reducer]
    G --> H[Store: room.lastMessage 업데이트]
    G --> I[Store: room.lastActivity 업데이트]
    
    H --> J{현재 방?}
    J -->|No| K[Store: room.unreadCount++]
    J -->|Yes| L[unreadCount 유지]
    
    K --> M[View: 빨간 배지 표시]
    L --> N[View: 즉시 메시지 표시]
    
    style M fill:#f99,stroke:#333,stroke-width:2px
```

---

## 3. 메시지 전송 흐름 (Message Send Flow)

### 3.1 Optimistic UI 패턴

```mermaid
sequenceDiagram
    participant User
    participant InputView
    participant Action
    participant Reducer
    participant Store
    participant View
    participant API
    participant Polling

    User->>InputView: 메시지 입력 후 전송
    InputView->>InputView: clientId = uuid()
    InputView->>Action: dispatch(sendMessage(clientId, content))
    
    Note over Action,Reducer: Phase 1: Optimistic Update
    Action->>Reducer: ROOM_MESSAGE_SEND_REQUEST
    Reducer->>Store: pendingMessages.set(clientId, ...)
    Store->>View: 메시지 즉시 표시 ("전송 중...")
    
    Note over InputView,API: Phase 2: API Call
    InputView->>API: POST /api/rooms/{id}/messages
    
    Note over API,Polling: Phase 3: Long Polling Sync
    API->>API: DB 저장 (version++, client_message_id)
    Polling->>API: GET /api/rooms/{id}/updates
    API-->>Polling: {events: [message_created]}
    
    Polling->>Action: dispatch(pollingEventReceived)
    Action->>Reducer: ROOM_POLLING_EVENT_RECEIVED
    
    Note over Reducer,Store: Phase 4: Replace Pending
    Reducer->>Reducer: pendingMessages에서 clientId 찾기
    Reducer->>Store: pendingMessages.delete(clientId)
    Reducer->>Store: messages.push(serverMessage)
    Store->>View: "전송 중..." → 일반 메시지
```

### 3.2 전송 실패 시나리오

```mermaid
flowchart TD
    A[User: 메시지 전송] --> B[Action: sendMessage]
    B --> C[Reducer: SEND_REQUEST]
    C --> D[Store: pendingMessages 추가]
    D --> E[View: 전송 중 표시]
    
    E --> F[API: POST /api/messages]
    F --> G{네트워크 에러}
    G -->|실패| H[Action: sendFailure]
    H --> I[Reducer: SEND_FAILURE]
    I --> J[Store: pending.status = 'error']
    J --> K[View: 빨간 느낌표 + 재시도 버튼]
    
    K --> L[User: 재시도 클릭]
    L --> B
    
    style G fill:#f96,stroke:#333,stroke-width:2px
    style K fill:#fcc,stroke:#333,stroke-width:2px
```

---

## 4. Long Polling 실시간 동기화 흐름

### 4.1 Live 모드 (정상 실시간)

```mermaid
sequenceDiagram
    participant Effect as LongPollingEffect
    participant API
    participant Action
    participant Reducer
    participant Store
    participant View

    loop Every Poll (즉시 재요청)
        Effect->>API: GET /updates?since_version=100
        Note over API: 새 이벤트 대기 (최대 30초)
        API-->>Effect: {events: [101], has_more: false}
        
        Effect->>Action: dispatch(pollingEventReceived)
        Action->>Reducer: ROOM_POLLING_EVENT_RECEIVED
        Reducer->>Store: lastSyncVersion = 101
        Reducer->>Store: pollingStatus = 'live'
        Store->>View: 새 메시지/참여자 표시
    end
```

### 4.2 Catchup 모드 (밀린 이벤트 처리)

```mermaid
flowchart TD
    A[10분 오프라인 후 복귀] --> B[Effect: Poll 재시작]
    B --> C[API: since_version=100]
    C --> D[Server: events 100~250 존재]
    D --> E{has_more?}
    E -->|true| F[Response: events 150개 + has_more]
    
    F --> G[Action: pollingEventReceived]
    G --> H[Reducer: POLLING_EVENT_RECEIVED]
    H --> I[Store: pollingStatus = 'catchup']
    I --> J[Store: 150개 이벤트 일괄 처리]
    J --> K[View: 동기화 중... 표시]
    
    K --> L[Effect: Exponential Backoff 100ms]
    L --> M[API: since_version=250]
    M --> N[Server: events 250~300]
    N --> O{has_more?}
    O -->|true| L
    O -->|false| P[폴링 속도 정상화]
    
    P --> Q[Store: pollingStatus = 'live']
    Q --> R[View: 실시간 모드 재개]
    
    style I fill:#ff9,stroke:#333,stroke-width:2px
    style Q fill:#9f9,stroke:#333,stroke-width:2px
```

### 4.3 이벤트 타입별 처리

```mermaid
flowchart TD
    A[Long Polling: 이벤트 수신] --> B{event.type}
    
    B -->|message_created| C[Reducer: ROOM_MESSAGE_ADD]
    C --> D[Store: messages.push]
    D --> E[View: 새 메시지 표시]
    
    B -->|message_updated| F[Reducer: ROOM_MESSAGE_UPDATE]
    F --> G[Store: messages.map - like_count 등]
    G --> H[View: 좋아요 숫자 업데이트]
    
    B -->|participant_joined| I[Reducer: ROOM_PARTICIPANT_ADD]
    I --> J[Store: participants.push]
    J --> K[View: 입장 알림 + 참여자 목록]
    
    B -->|participant_left| L[Reducer: ROOM_PARTICIPANT_REMOVE]
    L --> M[Store: participants.filter]
    M --> N[View: 퇴장 알림]
    
    B -->|participant_kicked| O[Reducer: ROOM_PARTICIPANT_REMOVE]
    O --> P{내가 강퇴?}
    P -->|Yes| Q[Action: roomExit]
    P -->|No| M
    Q --> R[Store: activeRoom = null]
    R --> S[View: 채팅방 목록으로 이동]
    
    style S fill:#f99,stroke:#333,stroke-width:2px
```

---

## 5. 좋아요 토글 흐름 (Like Toggle Flow)

### 5.1 Optimistic + 서버 배칭

```mermaid
sequenceDiagram
    participant User
    participant View
    participant Action
    participant Reducer
    participant Store
    participant API
    participant Server
    participant Polling

    User->>View: ❤️ 버튼 클릭
    View->>Action: dispatch(toggleLike(messageId))
    
    Note over Action,Store: Phase 1: Optimistic (즉시)
    Action->>Reducer: ROOM_MESSAGE_LIKE_TOGGLE
    Reducer->>Reducer: likedMessageIds.add(messageId)
    Reducer->>Store: message.like_count++
    Store->>View: ❤️ 빨간색 + 숫자 증가 (0.1초)
    
    Note over View,Server: Phase 2: API (비동기)
    View->>API: POST /api/messages/{id}/like
    API->>Server: like_logs INSERT
    
    Note over Server: Phase 3: Batch (5초 후)
    Server->>Server: 5초간 좋아요 모으기
    Server->>Server: UPDATE messages SET like_count
    Server->>Server: room_events INSERT (version++)
    
    Note over Polling,View: Phase 4: Sync (Long Polling)
    Polling->>Server: GET /updates?since_version=N
    Server-->>Polling: {message_updated: like_count=5}
    Polling->>Action: dispatch(pollingEventReceived)
    Action->>Reducer: ROOM_MESSAGE_UPDATE
    Reducer->>Store: message.like_count = 5 (서버 실제값)
    Store->>View: 만약 차이 있으면 조정
```

### 5.2 좋아요 취소 흐름

```mermaid
flowchart LR
    A[User: ❤️ 다시 클릭] --> B[Action: toggleLike]
    B --> C{이미 좋아요?}
    C -->|Yes| D[Reducer: likedMessageIds.delete]
    C -->|No| E[Reducer: likedMessageIds.add]
    
    D --> F[Store: like_count--]
    E --> G[Store: like_count++]
    
    F --> H[View: ❤️ 회색 + 숫자 감소]
    G --> I[View: ❤️ 빨간색 + 숫자 증가]
    
    H --> J[API: DELETE /api/messages/ID/like]
    I --> K[API: POST /api/messages/ID/like]
    
    style C fill:#9cf,stroke:#333,stroke-width:2px
```

---

## 6. 채팅방 입장 흐름 (Room Enter Flow)

### 6.1 Snapshot 로드 → Live Polling 시작

```mermaid
sequenceDiagram
    participant User
    participant View
    participant Action
    participant Reducer
    participant Store
    participant API
    participant Effect

    User->>View: 채팅방 클릭
    View->>Action: dispatch(roomEnter(roomId))
    Action->>Reducer: ROOM_ENTER
    Reducer->>Store: activeRoom.roomId = roomId
    Store->>View: 로딩 화면 표시
    
    Note over View,API: Snapshot API 호출
    View->>API: GET /api/rooms/{id}/snapshot
    API-->>View: {roomInfo, messages, participants, version}
    
    View->>Action: dispatch(snapshotSuccess(...))
    Action->>Reducer: ROOM_SNAPSHOT_SUCCESS
    Reducer->>Store: activeRoom = {...전체 데이터}
    Reducer->>Store: lastSyncVersion = version
    Reducer->>Store: pollingStatus = 'live'
    Store->>View: 채팅방 렌더링
    
    Note over Effect: LongPollingEffect 감지
    Effect->>Effect: pollingStatus = 'live' 확인
    Effect->>API: GET /api/rooms/{id}/updates?since_version
    Note over Effect,API: Long Polling 시작 (실시간 동기화)
```

### 6.2 과거 메시지 로드 (Scroll Up)

```mermaid
flowchart TD
    A[User: 스크롤을 최상단으로] --> B[View: onScroll 이벤트]
    B --> C{scrollTop === 0?}
    C -->|No| D[무시]
    C -->|Yes| E{hasMoreHistory?}
    E -->|No| F[무시]
    E -->|Yes| G[Action: loadHistoryRequest]
    
    G --> H[Reducer: HISTORY_LOAD_REQUEST]
    H --> I[Store: isLoadingHistory = true]
    I --> J[View: 상단에 스피너 표시]
    
    J --> K[API: GET /messages?before_id=oldest]
    K --> L[Response: older messages]
    L --> M[Action: loadHistorySuccess]
    M --> N[Reducer: HISTORY_LOAD_SUCCESS]
    N --> O[Store: messages.unshift - 앞에 추가]
    N --> P[Store: hasMoreHistory 업데이트]
    O --> Q[View: 이전 스크롤 위치 유지]
    
    style J fill:#9cf,stroke:#333,stroke-width:2px
```

---

## 7. 메시지 답장 흐름 (Reply Flow)

### 7.1 답장 대상 설정

```mermaid
flowchart LR
    A[User: 답장 버튼 클릭] --> B[View: handleReply]
    B --> C[Action: setReplyTarget message]
    C --> D[Reducer: ROOM_REPLY_TARGET_SET]
    D --> E[Store: replyTarget = message]
    E --> F[View: 입력창 위에 미리보기 표시]
    F --> G[내용: 원본 메시지 일부 + X 버튼]
    
    G --> H{User 행동}
    H -->|메시지 전송| I[Action: sendMessage + replyToId]
    H -->|X 클릭| J[Action: setReplyTarget null]
    
    I --> K[Reducer: replyTarget = null]
    J --> K
    K --> L[View: 미리보기 사라짐]
    
    style F fill:#cff,stroke:#333,stroke-width:2px
```

### 7.2 답장 메시지 렌더링

```mermaid
flowchart TD
    A[View: 메시지 렌더링] --> B{reply_to_message_id?}
    B -->|No| C[일반 메시지 UI]
    B -->|Yes| D[Store에서 원본 메시지 조회]
    
    D --> E{원본 존재?}
    E -->|Yes| F[답장 UI: 원본 미리보기 + 화살표]
    E -->|No| G[원본 삭제됨 표시]
    
    F --> H[User: 원본 클릭]
    H --> I[View: 스크롤하여 원본 메시지로 이동]
    I --> J[원본 메시지 하이라이트 효과]
    
    style F fill:#efe,stroke:#333,stroke-width:2px
    style G fill:#fee,stroke:#333,stroke-width:2px
```

---

## 8. 메시지 삭제 흐름 (Delete Flow)

### 8.1 모두에게 삭제 (Soft Delete)

```mermaid
sequenceDiagram
    participant User
    participant View
    participant Action
    participant Reducer
    participant Store
    participant API
    participant Polling

    User->>View: 컨텍스트 메뉴 → 모두에게 삭제
    View->>Action: dispatch(deleteRequest(msgId, 'all'))
    
    Note over View,API: Optimistic Update
    Action->>Reducer: ROOM_MESSAGE_UPDATE
    Reducer->>Store: message.is_deleted = true
    Store->>View: 메시지 즉시 숨김 + "삭제된 메시지"
    
    View->>API: DELETE /api/messages/{id}?type=all
    API->>API: UPDATE messages SET is_deleted=true
    API->>API: room_events INSERT (message_updated)
    
    Note over Polling: Long Polling이 이벤트 수신
    Polling->>Action: dispatch(pollingEventReceived)
    Action->>Reducer: ROOM_MESSAGE_UPDATE
    Reducer->>Store: 서버 확인값으로 동기화
    Store->>View: 다른 사용자 화면에도 "삭제된 메시지"
```

### 8.2 나만 삭제 (Private Delete)

```mermaid
flowchart TD
    A[User: 나만 삭제 클릭] --> B[Action: deleteRequest msgId, me]
    B --> C[Reducer: ROOM_MESSAGE_HIDE]
    C --> D[Store: hiddenMessageIds.add msgId]
    D --> E[View: 메시지 즉시 사라짐]
    
    E --> F[API: DELETE /messages/ID?type=me]
    F --> G[Server: private_deletions INSERT]
    
    G --> H[Long Polling: privateDeletions 수신]
    H --> I[Reducer: hiddenMessageIds 동기화]
    I --> J[LocalStorage 저장]
    
    J --> K[다른 기기에서도 숨김 유지]
    
    style E fill:#ffc,stroke:#333,stroke-width:2px
    style K fill:#cfc,stroke:#333,stroke-width:2px
```

---

## 9. 오프라인 복구 흐름 (Offline Recovery Flow)

### 9.1 네트워크 끊김 → 재연결

```mermaid
sequenceDiagram
    participant Browser
    participant Effect
    participant Action
    participant Reducer
    participant Store
    participant View
    participant API

    Note over Browser: 네트워크 끊김
    Browser->>Effect: window.onoffline 이벤트
    Effect->>Action: dispatch(networkStatusChange false)
    Action->>Reducer: NETWORK_STATUS_CHANGE
    Reducer->>Store: network.isOnline = false
    Store->>View: 오프라인 배너 표시
    
    Note over Effect: Long Polling 자동 중단
    
    Note over Browser: 10분 후 재연결
    Browser->>Effect: window.ononline 이벤트
    Effect->>Action: dispatch(networkStatusChange true)
    Action->>Reducer: NETWORK_STATUS_CHANGE
    Reducer->>Store: network.isOnline = true
    Store->>View: 오프라인 배너 사라짐
    
    Note over Effect: Long Polling 재시작 (Catchup 모드)
    Effect->>API: GET /updates?since_version=100
    API-->>Effect: {events: 150개, has_more: true}
    Effect->>Action: dispatch(pollingEventReceived)
    Action->>Reducer: ROOM_POLLING_EVENT_RECEIVED
    Reducer->>Store: pollingStatus = 'catchup'
    Reducer->>Store: 150개 이벤트 일괄 처리
    Store->>View: 동기화 중... 표시
    
    Note over Effect: Catchup Loop (Exponential Backoff)
    loop Until has_more = false
        Effect->>API: GET /updates (다음 배치)
        API-->>Effect: 더 많은 이벤트
        Effect->>Action: dispatch(pollingEventReceived)
    end
    
    Effect->>Action: dispatch(pollingModeChange 'live')
    Action->>Reducer: ROOM_POLLING_MODE_CHANGE
    Reducer->>Store: pollingStatus = 'live'
    Store->>View: 실시간 모드 재개
```

### 9.2 재시도 Backoff 전략

```mermaid
flowchart TD
    A[Long Polling 실패] --> B[Action: syncFailure]
    B --> C[Reducer: NETWORK_SYNC_FAILURE]
    C --> D[Store: retryCount++]
    C --> E[Store: backoffDelay *= 2]
    
    E --> F{backoffDelay}
    F -->|1회| G[100ms 대기]
    F -->|2회| H[200ms 대기]
    F -->|3회| I[400ms 대기]
    F -->|4회| J[800ms 대기]
    F -->|5회+| K[1000ms 대기 - 최대값]
    
    G --> L[재시도]
    H --> L
    I --> L
    J --> L
    K --> L
    
    L --> M{성공?}
    M -->|Yes| N[Action: syncSuccess]
    M -->|No| A
    
    N --> O[Reducer: NETWORK_SYNC_SUCCESS]
    O --> P[Store: retryCount = 0]
    O --> Q[Store: backoffDelay = 100]
    
    style K fill:#f99,stroke:#333,stroke-width:2px
    style P fill:#9f9,stroke:#333,stroke-width:2px
```

---

## 10. 채팅방 생성 흐름 (Create Room Flow)

### 10.1 모달 → API → 목록 추가

```mermaid
sequenceDiagram
    participant User
    participant View
    participant UIAction
    participant UIReducer
    participant Store
    participant Modal
    participant API
    participant RoomAction
    participant RoomReducer

    User->>View: + 새 채팅 버튼 클릭
    View->>UIAction: dispatch(openModal 'createRoom')
    UIAction->>UIReducer: UI_MODAL_OPEN
    UIReducer->>Store: ui.modals.createRoom = true
    Store->>Modal: 모달 렌더링
    
    User->>Modal: 방 이름 입력 + 생성 클릭
    Modal->>API: POST /api/rooms {name}
    API-->>Modal: {room: {...새 방 정보}}
    
    Modal->>RoomAction: dispatch(addRoom(room))
    RoomAction->>RoomReducer: ROOM_LIST_ADD_ROOM
    RoomReducer->>Store: roomList.rooms.unshift(room)
    
    Modal->>UIAction: dispatch(closeModal 'createRoom')
    UIAction->>UIReducer: UI_MODAL_CLOSE
    UIReducer->>Store: ui.modals.createRoom = false
    Store->>View: 모달 닫힘 + 새 방이 목록 최상단에
    
    Modal->>RoomAction: dispatch(roomEnter(room.id))
    RoomAction->>RoomReducer: ROOM_ENTER
    RoomReducer->>Store: activeRoom.roomId = room.id
    Store->>View: 새 채팅방 화면으로 전환
```

---

## 11. 초대 수락 흐름 (Invite Accept Flow)

### 11.1 토큰 검증 → 방 입장

```mermaid
flowchart TD
    A[User: 초대 링크 클릭] --> B[App: URL에서 token 추출]
    B --> C[Action: setInviteToken token]
    C --> D[Reducer: UI_INVITE_TOKEN_SET]
    D --> E[Store: ui.inviteContext.token = token]
    
    E --> F{로그인 여부?}
    F -->|No| G[View: 로그인 페이지 표시]
    F -->|Yes| H[API: POST /api/invites/validate]
    
    G --> I[User: 로그인/회원가입]
    I --> H
    
    H --> J{토큰 유효?}
    J -->|No| K[View: 초대 만료 에러]
    J -->|Yes| L[Response: roomInfo]
    
    L --> M[Store: ui.inviteContext.roomInfo]
    M --> N[View: 수락 확인 모달]
    N --> O[User: 수락 버튼 클릭]
    
    O --> P[API: POST /api/invites/accept]
    P --> Q[Server: room_participants INSERT]
    Q --> R[Action: addRoom]
    R --> S[Store: roomList에 추가]
    S --> T[Action: roomEnter]
    T --> U[View: 채팅방 화면]
    
    style K fill:#f99,stroke:#333,stroke-width:2px
    style U fill:#9f9,stroke:#333,stroke-width:2px
```

---

## 12. 채팅방 나가기 흐름 (Leave Room Flow)

### 12.1 확인 모달 → API → 목록 제거

```mermaid
sequenceDiagram
    participant User
    participant View
    participant UIAction
    participant Store
    participant Modal
    participant API
    participant RoomAction
    participant Reducer

    User->>View: 설정 메뉴 → 나가기
    View->>UIAction: dispatch(openModal 'leaveRoom')
    UIAction->>Store: ui.modals.leaveRoom = true
    Store->>Modal: 확인 모달 표시
    
    User->>Modal: 나가기 버튼 클릭
    Modal->>API: DELETE /api/rooms/{id}/leave
    API->>API: room_participants DELETE
    API->>API: room_events INSERT (participant_left)
    API-->>Modal: {success: true}
    
    Modal->>RoomAction: dispatch(removeRoom(roomId))
    RoomAction->>Reducer: ROOM_LIST_REMOVE_ROOM
    Reducer->>Store: roomList.rooms.filter
    Reducer->>Store: selectedRoomId = null
    
    Modal->>RoomAction: dispatch(roomExit())
    RoomAction->>Reducer: ROOM_EXIT
    Reducer->>Store: activeRoom = initialState
    
    Modal->>UIAction: dispatch(closeModal 'leaveRoom')
    UIAction->>Store: ui.modals.leaveRoom = false
    Store->>View: 채팅방 목록 화면으로 이동
    
    Note over API: 다른 참여자들에게 Long Polling으로 전파
    API-->>View: participant_left 이벤트
    View->>View: "OOO님이 나갔습니다" 알림
```

---

## 13. 전체 통합 흐름 (Complete Integration)

### 13.1 앱 시작부터 메시지 전송까지

```mermaid
flowchart TD
    Start([앱 시작]) --> Auth{세션 복원?}
    Auth -->|Yes| Dashboard[대시보드]
    Auth -->|No| Login[로그인]
    
    Login --> LoginAPI[POST /api/auth/login]
    LoginAPI --> AuthSuccess[Action: loginSuccess]
    AuthSuccess --> Dashboard
    
    Dashboard --> FetchRooms[Action: fetchRoomsRequest]
    FetchRooms --> RoomAPI[GET /api/rooms]
    RoomAPI --> RoomSuccess[Action: fetchSuccess]
    RoomSuccess --> RoomList[채팅방 목록 표시]
    
    RoomList --> SelectRoom[User: 방 클릭]
    SelectRoom --> EnterRoom[Action: roomEnter]
    EnterRoom --> Snapshot[GET /api/rooms/ID/snapshot]
    Snapshot --> SnapshotSuccess[Action: snapshotSuccess]
    SnapshotSuccess --> ChatView[채팅방 화면]
    
    ChatView --> StartPolling[LongPollingEffect 시작]
    StartPolling --> LiveMode[pollingStatus: live]
    
    ChatView --> TypeMessage[User: 메시지 입력]
    TypeMessage --> SendMessage[Action: sendMessage]
    SendMessage --> OptimisticUI[즉시 화면 표시]
    OptimisticUI --> SendAPI[POST /api/messages]
    SendAPI --> ServerSave[DB 저장]
    ServerSave --> PollEvent[Long Polling 이벤트]
    PollEvent --> ReplacePending[Pending → Real Message]
    ReplacePending --> FinalView[최종 메시지 표시]
    
    style Start fill:#9cf,stroke:#333,stroke-width:3px
    style FinalView fill:#9f9,stroke:#333,stroke-width:3px
```

---

## 14. 상태별 Action-Store-View 매핑 테이블

| 상태 카테고리 | 주요 Action | Reducer 업데이트 | View 반영 |
|--------------|------------|-----------------|----------|
| **Auth** | `loginSuccess` | `state.auth.user = {...}` | 대시보드 리다이렉트 |
| **RoomList** | `fetchSuccess` | `state.roomList.rooms = [...]` | 방 목록 렌더링 |
| **ActiveRoom** | `snapshotSuccess` | `state.activeRoom = {...전체}` | 채팅방 화면 표시 |
| **Message Send** | `sendMessage` | `pendingMessages.set(...)` | Optimistic UI |
| **Long Polling** | `pollingEventReceived` | `messages.push(...)` | 실시간 업데이트 |
| **Like** | `toggleLike` | `likedMessageIds.add(...)` | ❤️ 색상 + 숫자 |
| **Reply** | `setReplyTarget` | `replyTarget = message` | 입력창 미리보기 |
| **Delete** | `deleteRequest` | `message.is_deleted = true` | "삭제된 메시지" |
| **Network** | `statusChange` | `network.isOnline = false` | 오프라인 배너 |
| **UI Modal** | `openModal` | `ui.modals.createRoom = true` | 모달 렌더링 |

---

## 15. 성능 최적화 포인트

### 15.1 Memoization 흐름

```mermaid
flowchart LR
    A[Store State 변경] --> B{useVisibleMessages}
    B --> C{messages 배열 변경?}
    C -->|No| D[캐시된 값 반환 - 리렌더링 없음]
    C -->|Yes| E[필터링 재계산]
    E --> F[새 배열 반환]
    F --> G[View 리렌더링]
    
    style D fill:#9f9,stroke:#333,stroke-width:2px
    style G fill:#fc9,stroke:#333,stroke-width:2px
```

### 15.2 Component Splitting

```mermaid
flowchart TD
    A[RootStore 변경] --> B{어떤 상태?}
    B -->|auth| C[AuthHeader만 리렌더링]
    B -->|roomList| D[RoomListView만 리렌더링]
    B -->|activeRoom| E[ChatView만 리렌더링]
    B -->|ui| F[Modal/Toast만 리렌더링]
    
    E --> G{activeRoom 세부}
    G -->|messages| H[MessageList만]
    G -->|participants| I[ParticipantList만]
    G -->|replyTarget| J[MessageInput만]
    
    style C fill:#cfc,stroke:#333,stroke-width:2px
    style D fill:#cfc,stroke:#333,stroke-width:2px
    style E fill:#cfc,stroke:#333,stroke-width:2px
```

---

## 16. 에러 처리 흐름

### 16.1 API 에러 → Toast 표시

```mermaid
sequenceDiagram
    participant View
    participant API
    participant Action
    participant Reducer
    participant Store
    participant Toast

    View->>API: POST /api/rooms (네트워크 에러)
    API-->>View: Error: Network Failure
    View->>Action: dispatch(showToast 'error', '방 생성 실패')
    Action->>Reducer: UI_TOAST_SHOW
    Reducer->>Store: ui.toast = {type: 'error', message: '...'}
    Store->>Toast: 화면 우측 하단에 에러 토스트
    
    Note over Toast: 3초 후 자동 사라짐
    Toast->>Action: dispatch(hideToast(id))
    Action->>Reducer: UI_TOAST_HIDE
    Reducer->>Store: ui.toast = null
    Store->>Toast: 토스트 사라짐
```

---

**문서 작성 완료**

이 다이어그램들은 Flux 패턴의 단방향 데이터 흐름을 명확히 시각화하며, 각 상태별 Action → Reducer → Store → View 흐름을 구체적으로 보여줍니다.
