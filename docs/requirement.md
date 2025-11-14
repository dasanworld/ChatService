---

📄 **Requirements.md (v1.6 — Production-Hardened Full Sync Architecture)**
본 문서는 Long Polling 기반의 대규모 채팅 시스템을 위한 **최종 완결된 운영 명세서**이다.


### 0\. 🔥 핵심 변경 요약 (v1.6 Patch Notes)

v1.5의 논리적 아키텍처를 기반으로, 실제 운영 환경에서 붕괴를 유발할 수 있는 다음 4가지 문제를 해결했습니다.

-----

### 1\. 🎯 기능 정의 (Features)

#### 1.1 채팅방 기능

  * 1:1 또는 그룹 채팅방 생성.
  * 1:1 채팅방은 사용자 조합당 1개만 존재.
  * 그룹방 방장(creator)은 방제 변경, 비밀번호 관리, 회원 Kick(추방) 가능.
  * Kick된 사용자는 24시간 재입장 불가.

#### 1.2 메시지 기능

  * 텍스트/이모지 메시지 전송.
  * 5분 이내 → “모두에게 삭제” (Public Event)
  * 5분 이후 → “나에게만 삭제” (Private Event)
  * 답장(reply) 가능.
  * 좋아요(heart reaction) 추가/취소 가능. (서버 Batching 적용)
  * @멘션 기능 가능.
  * **(범위 확정)** 메시지 수정(Edit) 기능은 본 v1.6 명세에서 제외한다.

-----

### 2\. 👥 사용자 스토리 (User Stories)

*(v1.5와 동일)*

  * **US1 — 방 생성:** 사용자는 채팅을 시작한다.
  * **US2 — 방 관리:** 방장은 방제/비번/추방 등 관리 작업을 한다.
  * **US3 — Kick:** 특정 사용자를 24시간 재입장 금지시킨다.
  * **US4 — 답장:** 특정 메시지에 인라인 인용 답장을 남긴다.
  * **US5 — 메시지 삭제:** 5분 이내 모두 삭제, 이후 나만 삭제.
  * **US6 — 멘션:** 참여자 목록에서 특정 사용자를 멘션한다.
  * **US7 — 좋아요:** 메시지에 heart reaction을 남긴다.

-----

### 3\. ⚙ Acceptance Criteria (AC)

#### AC 1: 최초 진입 (Snapshot Flow)

  * **시나리오:** 사용자가 앱을 켜거나, 채팅방에 처음 진입하는 순간.

<!-- end list -->

1.  클라이언트는 \*\*'채팅방 스냅샷 API'\*\*를 호출한다.
      * `GET /rooms/{roomId}/snapshot?limit=50`
2.  서버는 \*\*'현재 시점'\*\*의 핵심 데이터를 모두 반환한다:
      * 1)  최신 메시지 50개 (`messages`)
      * 2)  참여자 목록 100명 (`participants`) (Paging: `has_more: true` 포함)
      * 3)  Polling 시작 커서 (`last_sync_version`)
3.  클라이언트는 수신한 메시지와 참여자 목록을 UI에 즉시 렌더링한다.
4.  이후 `last_sync_version`를 기준으로 Long Polling(AC 3, AC 4)을 시작한다.
      * (참고: 참여자가 100명 이상일 경우, 클라이언트는 백그라운드에서 `GET /rooms/{roomId}/participants?page=2`를 호출하여 나머지 목록을 비동기 로드한다.)

#### AC 2: 스크롤백 (과거 로딩)

1.  사용자가 위로 스크롤 → `GET /rooms/{roomId}/messages?before_version=X&limit=50`
2.  서버는 `version < X` 인 메시지 50개 반환
3.  `has_more: false`일 때까지 로드.

#### AC 3: Gap Handling (오프라인 공백 복구)

1.  클라이언트가 `GET /updates?since_version={V}&limit=100` 호출
2.  서버가 `has_more: true` 반환 시, 클라이언트는 '캐치업 모드'로 작동한다.
3.  **재시도 정책 (필수):** 클라이언트는 `has_more: false`를 받을 때까지 Polling을 반복 호출하되, **Exponential Backoff** 정책을 **적용해야 한다.** (예: 100ms, 200ms, 400ms... 최대 1초 간격으로)
4.  완료되면 모든 이벤트를 UI에 일괄 반영 후 Live Mode 전환

#### AC 4: Live Long Polling (실시간 모드)

1.  `GET /updates?since_version={V}` 호출 (서버 30초 대기)
2.  변경 발생(공개 이벤트 또는 나만 삭제) → 즉시 응답
3.  응답 수신 또는 타임아웃 시, 새 `version`으로 즉시 재요청

#### AC 5: 메시지 전송 (Optimistic UI)

1.  `client_message_id(UUID)` 생성 및 `[Sending...]` 상태로 UI 표시
2.  `POST /rooms/{roomId}/messages` 요청
3.  Long Polling의 `events` 내 `type: "message_created"` 이벤트 수신 시, `client_message_id`로 매칭하여 서버 데이터로 교체

#### AC 6: 답장

1.  `reply_to_message_id` 포함 전송
2.  `type: "message_created"` 이벤트로 broadcast

#### AC 7: 좋아요 (성능 강화)

1.  클라이언트는 `POST /messages/{id}/like` 또는 `DELETE` 요청. (UI는 즉시 Optimistic하게 반영)
2.  **서버 정책 (필수):**
      * 서버는 '좋아요' 요청을 즉시 `RoomEvent` 타임라인에 기록하지 **않는다.**
      * 서버는 `Message` 테이블의 `like_count`만 즉시 `UPDATE`한다. (DB 부하 최소화)
      * 서버는 `like_count` 변경을 5초 주기로 **Batching/Debouncing**하여, `RoomEvent` 타임라인에 **단일 `type: "message_updated"` 이벤트**를 생성한다.
      * 예: 5초간 500개의 '좋아요'가 발생해도, `version`은 1개만 소모되며 Polling 응답도 1개만 전송된다.

#### AC 8: 메시지 삭제

1.  **모두 삭제 (5분 이내):** `type: "message_updated"` 이벤트로 전송
2.  **나만 삭제 (5분 이후):** `HiddenMessages` 테이블에만 기록, Polling 응답의 `private_deletions` 배열로 전송

#### AC 9: Kick (추방)

1.  `events` 배열에서 `type: "participant_kicked"` 이벤트 수신
2.  `if (event.payload.user_id === self.user_id)`: 내가 Kick 당한 경우, 즉시 퇴장 및 Polling 중단.
3.  `else`: 다른 사용자가 Kick 당한 경우, 참여자 목록 UI에서 제거.

-----

### 4\. 🔄 Long Polling Event Timeline 모델 (핵심)

#### 4.1 이벤트 타임라인 정의

  * 모든 **공개(Public)** 이벤트는 단일 `room_version`(sequence)을 사용한다.
  * '나만 삭제'는 Private State이며 이 타임라인에 포함되지 않는다.
  * **Public 이벤트 종류 (RoomEvent의 `type`):**
      * `message_created`
      * `message_updated` (like [**Batching됨**], "모두 삭제")
      * `participant_joined`
      * `participant_left`
      * `participant_kicked`
      * `room_updated` (방제/비번 변경)
  * 이 모든 이벤트는 `RoomEvent` 테이블에 저장되며, 단일 `version`을 가진다.

#### 4.2 Long Polling Response 구조

  * **API:** `GET /rooms/{roomId}/updates?since_version={V}&limit=100`
  * **Response:**
    ```json
    {
      // 1. 공개 이벤트 타임라인 (모든 참여자 공통)
      "events": [
        { "version": 501, "type": "participant_joined", "payload": { ... } },
        { "version": 502, "type": "message_created", "payload": { ... } },
        { "version": 503, "type": "message_updated", "payload": { "message_id": "m-1", "like_count": 50 } } // 5초간 Batching된 결과
      ],

      // 2. 비공개 이벤트 (요청한 사용자 전용)
      "private_deletions": [
        "message_id_to_hide_1"
      ],

      // 3. 커서 및 Gap Handling
      "last_version": 503,
      "has_more": false
    }
    ```

-----

### 5\. 🧱 데이터 모델

  * **Message**
      * `id`, `room_id`, `user_id`, `content_encrypted`, `reply_to_message_id`, `mentioned_user_ids[]`, `like_count`, `is_deleted`, `client_message_id`, `created_at`, `updated_at`
  * **RoomEvent (핵심)**
      * `id` (auto), `room_id`
      * `version` (BigInt, room별 단일 시퀀스)
      * `type` (Enum), `payload` (jsonb)
      * `created_at`
  * **RoomParticipant**
      * `room_id`, `user_id` (복합 PK)
      * `role` (admin, member)
  * **HiddenMessages**
      * `user_id`, `message_id` (복합 PK)
  * **BanRecords**
      * `room_id`, `user_id`, `expires_at`

-----

### 6\. 🛑 제약 조건

1.  **서버 아키텍처 (필수):** 서버는 반드시 **비동기 I/O (Non-blocking I/O)** 기반이어야 한다. (예: Node.js, Netty, Ktor, Uvicorn 등)
2.  **멀티 디바이스 지원 (필수):** 서버는 사용자별 **다중 Long Polling 커넥션**을 허용해야 한다.
3.  **Long Polling 타이밍:** 서버 대기 30초, 클라이언트 타임아웃 35초.
4.  **데이터 보관:** 채팅 히스토리는 1년 보관.
5.  **Push Notification:** 외부 서비스(Firebase 등) 사용.

-----

### 7\. ❗ 에러 코드

*(v1.5와 동일)*
| 코드 | 의미 |
| :--- | :--- |
| 400 | `BAD_REQUEST` |
| 401 | `UNAUTHORIZED` |
| 403 | `FORBIDDEN` |
| 403 | `BANNED` (Kick된 사용자) |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT` |
| 429 | `RATE_LIMIT` |
| 500 | `SERVER_ERROR` |




### 8. ⚖️ 비-채팅 API 제약 (Auth Constraints)

본 `requirement.md`는 채팅(Polling) 아키텍처를 중심으로 기술되었으나, `PRD v1.2`에 명시된 P0 인증 기능은 다음 기술 제약을 반드시 준수해야 한다.

1.  **F-00.3 (비밀번호 찾기) API 제약 (필수):**
    * `PRD v1.2`의 `F-00.3` 기능을 구현하는 API 엔드포인트(예: `POST /auth/request-reset`)는 **반드시 IP 기반의 Rate Limit**이 적용되어야 한다.
    * 이는 이메일 주소를 타겟으로 하는 무차별 대입 공격(Brute-force) 및 이메일 플러딩(Flooding) 공격을 방지하기 위함이다.
    * **정책 (예시):** IP당 1분에 5회, 또는 10분에 10회 등으로 제한한다.
    * **위반 시 응답:** `429 RATE_LIMIT` 에러 코드를 반환한다.


-----
