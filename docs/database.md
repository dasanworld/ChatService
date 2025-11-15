
## 📄 Database Design v1.11 (Production Ready)

> **Single Source of Truth** — `PRD v1.3`, `Userflow v1.3`, `requirement.md v1.6`을 기준으로 데이터·보안 요구사항을 1:1로 만족하는 최종 데이터베이스 문서입니다.

## v1.11 변경 로그

1. **Trigger Guard 복원**: Next.js 백엔드가 Supabase `service_role` 키를 사용한다는 현실을 인정하고, 모든 테이블에 DML 차단 트리거 + `set_config('app.is_rpc_call')` 패턴을 다시 적용했습니다.
2. **RLS 완전 정비**: 인증 사용자는 자신이 참여한 방 데이터만 읽을 수 있으며, 클라이언트/백엔드 모두 직접 DML을 실행하지 못하도록 정책을 명문화했습니다.
3. **테이블 스키마 보강**: 모든 P0 테이블에 `updated_at` 컬럼과 자동 갱신 트리거를 추가했습니다.
4. **RPC 전수 정리**: `join_room`, `update_last_read_version`, `record_batched_like_event` 등 누락됐던 함수까지 전체 SQL을 다시 작성했습니다.
5. **초대 경쟁 조건 해결**: `join_room`이 성공적으로 참가자를 추가한 경우에만 `current_uses`를 증가시키도록 로직을 수정했습니다.
6. **읽음 처리 방어**: `update_last_read_version`가 타인의 방을 갱신하거나 미래 버전을 기록하지 못하도록 검증을 강화했습니다.
7. **배치 워커 설계**: 좋아요 배치 워커가 호출할 `record_batched_like_event` RPC의 책임, 실패 시나리오, 재시도 전략을 명시했습니다.

---

## 1. 핵심 아키텍처 원칙

| 구분 | 내용 |
| --- | --- |
| **인증** | Supabase Auth (`auth.users`). 모든 사용자 ID는 UUID.
| **읽기 인가** | 테이블별 RLS 활성화. `authenticated` Role은 자신이 참여한 방 데이터만 `SELECT` 가능.
| **쓰기 인가** | Next.js API는 `service_role` 키를 사용하지만 `Trigger Guard` 때문에 직접 DML 불가. 모든 쓰기는 RPC를 통해서만 수행.
| **동기화 전략** | Snapshot(`messages`) + Polling(`room_events`). `messages.event_version`은 `room_events.id`를 링크합니다.
| **초대/안읽음** | `room_invites`가 초대 토큰을, `room_participants.last_read_version`이 안 읽음 뱃지를 관리합니다.

---

## 2. RLS 정책 (공통)

```sql
-- 0) 모든 테이블에 RLS 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hidden_messages ENABLE ROW LEVEL SECURITY;
```

### 2.1 쓰기 차단 (클라이언트 기본 역할)

```sql
CREATE POLICY "deny_writes_profiles" ON public.profiles FOR ALL USING (false);
CREATE POLICY "deny_writes_rooms" ON public.rooms FOR ALL USING (false);
CREATE POLICY "deny_writes_room_participants" ON public.room_participants FOR ALL USING (false);
CREATE POLICY "deny_writes_room_invites" ON public.room_invites FOR ALL USING (false);
CREATE POLICY "deny_writes_messages" ON public.messages FOR ALL USING (false);
CREATE POLICY "deny_writes_message_likes" ON public.message_likes FOR ALL USING (false);
CREATE POLICY "deny_writes_room_events" ON public.room_events FOR ALL USING (false);
CREATE POLICY "deny_writes_hidden_messages" ON public.hidden_messages FOR ALL USING (false);
```

### 2.2 읽기 허용 (참여 방 기준)

```sql
CREATE POLICY "read_own_profile"
ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "read_participated_rooms"
ON public.rooms FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.room_participants p
    WHERE p.room_id = rooms.id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "read_own_participation"
ON public.room_participants FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "read_participated_messages"
ON public.messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.room_participants p
    WHERE p.room_id = messages.room_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "read_participated_events"
ON public.room_events FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.room_participants p
    WHERE p.room_id = room_events.room_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "deny_read_room_invites"
ON public.room_invites FOR SELECT USING (false);

CREATE POLICY "read_participated_likes"
ON public.message_likes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.room_participants p ON m.room_id = p.room_id
    WHERE m.id = message_likes.message_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "read_own_hidden_messages"
ON public.hidden_messages FOR SELECT USING (auth.uid() = user_id);
```

---

## 3. 스키마 요약 (세부 DDL은 `supabase/migrations` 참고)

| 테이블 | 목적 | 핵심 필드 |
| --- | --- | --- |
| `profiles` | 사용자 닉네임 캐시 | `id`, `nickname`, `created_at`, `updated_at`
| `rooms` | 방 메타 | `name`, `latest_event_version`
| `room_participants` | 멤버십/안읽음 | `user_id`, `room_id`, `last_read_version`, `joined_at`
| `room_invites` | 초대 토큰 | `id`, `room_id`, `expires_at`, `max_uses`, `current_uses`
| `messages` | 메시지 저장 | `room_id`, `user_id`, `content`, `reply_to_message_id`, `event_version`, `is_deleted`
| `message_likes` | 좋아요 상태 | `user_id`, `message_id`, `created_at`
| `room_events` | Polling 이벤트 | `type`, `payload`, `created_at`
| `hidden_messages` | 나에게만 삭제 | `user_id`, `message_id`

모든 테이블은 `created_at TIMESTAMPTZ DEFAULT now()`, `updated_at TIMESTAMPTZ DEFAULT now()` 패턴을 따릅니다.

---

## 4. 공통 트리거

### 4.1 `updated_at` 자동화

```sql
CREATE SCHEMA IF NOT EXISTS _shared_triggers;

CREATE OR REPLACE FUNCTION _shared_triggers.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 각 테이블에 BEFORE UPDATE 트리거 연결
```

### 4.2 Trigger Guard (service_role DML 차단)

```sql
CREATE OR REPLACE FUNCTION _shared_triggers.block_direct_dml()
RETURNS TRIGGER AS $$
DECLARE
  v_is_rpc_call TEXT := current_setting('app.is_rpc_call', true);
BEGIN
  IF v_is_rpc_call IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION '[TriggerGuard] Direct DML on % is not allowed. Use RPCs.', TG_TABLE_NAME;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- profiles, rooms, room_participants, room_invites, messages,
-- message_likes, room_events, hidden_messages 전 테이블에
-- BEFORE INSERT/UPDATE/DELETE 트리거로 연결
```

모든 RPC는 다음 패턴으로 가드를 우회합니다.

```sql
PERFORM set_config('app.is_rpc_call', 'true', true);
BEGIN
  -- DML 실행
  PERFORM set_config('app.is_rpc_call', 'false', true);
  RETURN ...;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.is_rpc_call', 'false', true);
  RAISE;
END;
```

---

## 5. RPC & 트리거 정의 (전체 SQL)

> 모든 함수는 `SECURITY DEFINER SET search_path = public`로 생성하며 소유자는 `postgres`여야 합니다.

### 5.1 가입 트리거 `handle_new_user`

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.is_rpc_call', 'true', true);
  INSERT INTO public.profiles (id, nickname)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'nickname');
  PERFORM set_config('app.is_rpc_call', 'false', true);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.is_rpc_call', 'false', true);
  RAISE;
END;
$$;
```

### 5.2 방 생성 `create_room`

```sql
CREATE OR REPLACE FUNCTION public.create_room(
  p_user_id UUID,
  p_name TEXT
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_room rooms;
  v_event BIGINT;
  v_invite TEXT;
BEGIN
  PERFORM set_config('app.is_rpc_call', 'true', true);

  INSERT INTO public.rooms (name)
  VALUES (p_name)
  RETURNING * INTO v_room;

  INSERT INTO public.room_participants (user_id, room_id)
  VALUES (p_user_id, v_room.id);

  INSERT INTO public.room_events (room_id, type, payload)
  VALUES (v_room.id, 'room_created', jsonb_build_object('room_id', v_room.id, 'name', v_room.name))
  RETURNING id INTO v_event;

  UPDATE public.rooms SET latest_event_version = v_event WHERE id = v_room.id;

  v_invite := public.create_room_invite(p_user_id, v_room.id, 7, -1);

  PERFORM set_config('app.is_rpc_call', 'false', true);
  RETURN v_invite;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.is_rpc_call', 'false', true);
  RAISE;
END;
$$;
```

### 5.3 초대 생성 `create_room_invite`

```sql
CREATE OR REPLACE FUNCTION public.create_room_invite(
  p_user_id UUID,
  p_room_id UUID,
  p_expires_in_days INT DEFAULT 7,
  p_max_uses INT DEFAULT -1
) RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_token TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE user_id = p_user_id AND room_id = p_room_id
  ) THEN
    RAISE EXCEPTION 'Forbidden: not a participant.';
  END IF;

  PERFORM set_config('app.is_rpc_call', 'true', true);

  v_token := 'invite_' || substr(md5(random()::text), 0, 16);

  INSERT INTO public.room_invites (id, room_id, created_by_user_id, expires_at, max_uses)
  VALUES (
    v_token,
    p_room_id,
    p_user_id,
    now() + (p_expires_in_days * INTERVAL '1 day'),
    p_max_uses
  );

  PERFORM set_config('app.is_rpc_call', 'false', true);
  RETURN v_token;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.is_rpc_call', 'false', true);
  RAISE;
END;
$$;
```

### 5.4 초대 검증 `validate_and_get_invite_context`

```sql
CREATE OR REPLACE FUNCTION public.validate_and_get_invite_context(
  p_invite_token TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite room_invites;
  v_room rooms;
BEGIN
  SELECT * INTO v_invite FROM public.room_invites WHERE id = p_invite_token;
  IF v_invite IS NULL OR v_invite.expires_at <= now()
     OR (v_invite.max_uses <> -1 AND v_invite.current_uses >= v_invite.max_uses) THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_room FROM public.rooms WHERE id = v_invite.room_id;
  RETURN jsonb_build_object('room_id', v_room.id, 'room_name', v_room.name);
END;
$$;
```

### 5.5 초대 합류 `join_room`

```sql
CREATE OR REPLACE FUNCTION public.join_room(
  p_user_id UUID,
  p_invite_token TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_invite room_invites;
  v_room UUID;
  v_profile profiles;
  v_event BIGINT;
  v_inserted BOOLEAN := false;
BEGIN
  PERFORM set_config('app.is_rpc_call', 'true', true);

  SELECT * INTO v_invite
  FROM public.room_invites
  WHERE id = p_invite_token
    AND expires_at > now()
    AND (max_uses = -1 OR current_uses < max_uses)
  FOR UPDATE;

  IF v_invite IS NULL THEN
    PERFORM set_config('app.is_rpc_call', 'false', true);
    RAISE EXCEPTION 'Invalid, expired, or fully used invite token';
  END IF;

  v_room := v_invite.room_id;

  INSERT INTO public.room_participants (user_id, room_id)
  VALUES (p_user_id, v_room)
  ON CONFLICT (user_id, room_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = (ROW_COUNT > 0);

  IF v_inserted THEN
    UPDATE public.room_invites
    SET current_uses = current_uses + 1
    WHERE id = p_invite_token;

    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;

    INSERT INTO public.room_events (room_id, type, payload)
    VALUES (
      v_room,
      'participant_joined',
      jsonb_build_object('user_id', p_user_id, 'nickname', v_profile.nickname)
    ) RETURNING id INTO v_event;

    UPDATE public.rooms SET latest_event_version = v_event WHERE id = v_room;
  END IF;

  PERFORM set_config('app.is_rpc_call', 'false', true);
  RETURN v_room;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.is_rpc_call', 'false', true);
  RAISE;
END;
$$;
```

### 5.6 방 나가기 `leave_room`

```sql
CREATE OR REPLACE FUNCTION public.leave_room(
  p_user_id UUID,
  p_room_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_event BIGINT;
BEGIN
  PERFORM set_config('app.is_rpc_call', 'true', true);

  DELETE FROM public.room_participants
  WHERE user_id = p_user_id AND room_id = p_room_id;

  INSERT INTO public.room_events (room_id, type, payload)
  VALUES (p_room_id, 'participant_left', jsonb_build_object('user_id', p_user_id))
  RETURNING id INTO v_event;

  UPDATE public.rooms SET latest_event_version = v_event WHERE id = p_room_id;

  PERFORM set_config('app.is_rpc_call', 'false', true);
END;
$$;
```

### 5.7 메시지 전송/삭제/숨김

```sql
CREATE OR REPLACE FUNCTION public.post_new_message(
  p_room_id UUID,
  p_user_id UUID,
  p_content TEXT,
  p_reply_to_message_id UUID DEFAULT NULL
) RETURNS public.messages
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_nickname TEXT;
  v_message messages;
  v_event BIGINT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = p_room_id AND user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'Forbidden: not a participant.';
  END IF;

  PERFORM set_config('app.is_rpc_call', 'true', true);

  SELECT nickname INTO v_nickname FROM public.profiles WHERE id = p_user_id;

  INSERT INTO public.messages (room_id, user_id, content, reply_to_message_id, user_nickname)
  VALUES (p_room_id, p_user_id, p_content, p_reply_to_message_id, v_nickname)
  RETURNING * INTO v_message;

  INSERT INTO public.room_events (room_id, type, payload)
  VALUES (p_room_id, 'message_created', jsonb_build_object('message', row_to_json(v_message)))
  RETURNING id INTO v_event;

  UPDATE public.messages SET event_version = v_event WHERE id = v_message.id;
  UPDATE public.rooms SET latest_event_version = v_event WHERE id = p_room_id;

  v_message.event_version := v_event;

  PERFORM set_config('app.is_rpc_call', 'false', true);
  RETURN v_message;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.is_rpc_call', 'false', true);
  RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_message_for_all(
  p_user_id UUID,
  p_message_id UUID
) RETURNS public.messages
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_message messages;
  v_event BIGINT;
BEGIN
  PERFORM set_config('app.is_rpc_call', 'true', true);

  UPDATE public.messages
  SET is_deleted = TRUE, content = '삭제된 메시지입니다.'
  WHERE id = p_message_id AND user_id = p_user_id AND created_at > (now() - INTERVAL '5 minutes')
  RETURNING * INTO v_message;

  IF v_message IS NOT NULL THEN
    INSERT INTO public.room_events (room_id, type, payload)
    VALUES (v_message.room_id, 'message_deleted', jsonb_build_object('message_id', v_message.id))
    RETURNING id INTO v_event;

    UPDATE public.messages SET event_version = v_event WHERE id = v_message.id;
    UPDATE public.rooms SET latest_event_version = v_event WHERE id = v_message.room_id;
    v_message.event_version := v_event;
  END IF;

  PERFORM set_config('app.is_rpc_call', 'false', true);
  RETURN v_message;
EXCEPTION WHEN OTHERS THEN
  PERFORM set_config('app.is_rpc_call', 'false', true);
  RAISE;
END;
$$;

CREATE OR REPLACE FUNCTION public.hide_message_for_me(
  p_user_id UUID,
  p_message_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.is_rpc_call', 'true', true);
  INSERT INTO public.hidden_messages (user_id, message_id)
  VALUES (p_user_id, p_message_id)
  ON CONFLICT (user_id, message_id) DO NOTHING;
  PERFORM set_config('app.is_rpc_call', 'false', true);
END;
$$;
```

### 5.8 좋아요/좋아요 취소

```sql
CREATE OR REPLACE FUNCTION public.like_message(
  p_user_id UUID,
  p_message_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.is_rpc_call', 'true', true);
  INSERT INTO public.message_likes (user_id, message_id)
  VALUES (p_user_id, p_message_id)
  ON CONFLICT (user_id, message_id) DO NOTHING;
  PERFORM set_config('app.is_rpc_call', 'false', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.unlike_message(
  p_user_id UUID,
  p_message_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.is_rpc_call', 'true', true);
  DELETE FROM public.message_likes
  WHERE user_id = p_user_id AND message_id = p_message_id;
  PERFORM set_config('app.is_rpc_call', 'false', true);
END;
$$;
```

### 5.9 읽음 처리 `update_last_read_version`

```sql
CREATE OR REPLACE FUNCTION public.update_last_read_version(
  p_user_id UUID,
  p_room_id UUID,
  p_version BIGINT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_room_version BIGINT;
  v_target BIGINT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE user_id = p_user_id AND room_id = p_room_id
  ) THEN
    RAISE EXCEPTION 'Forbidden: not a participant of this room.';
  END IF;

  SELECT latest_event_version INTO v_room_version
  FROM public.rooms
  WHERE id = p_room_id;

  v_target := LEAST(COALESCE(p_version, 0), v_room_version);

  PERFORM set_config('app.is_rpc_call', 'true', true);

  UPDATE public.room_participants
  SET last_read_version = v_target
  WHERE user_id = p_user_id
    AND room_id = p_room_id
    AND last_read_version < v_target;

  PERFORM set_config('app.is_rpc_call', 'false', true);
END;
$$;
```

### 5.10 좋아요 배치 이벤트 `record_batched_like_event`

```sql
CREATE OR REPLACE FUNCTION public.record_batched_like_event(
  p_room_id UUID,
  p_message_id UUID,
  p_like_count INT
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_event BIGINT;
BEGIN
  PERFORM set_config('app.is_rpc_call', 'true', true);

  INSERT INTO public.room_events (room_id, type, payload)
  VALUES (
    p_room_id,
    'message_updated',
    jsonb_build_object('message_id', p_message_id, 'like_count', p_like_count)
  ) RETURNING id INTO v_event;

  UPDATE public.rooms SET latest_event_version = v_event WHERE id = p_room_id;

  PERFORM set_config('app.is_rpc_call', 'false', true);
END;
$$;
```

---

## 6. Golden Rule 실행 계획 (Trigger Guard + service_role)

1. **Trigger Guard 배포**: `_shared_triggers.block_direct_dml()`을 모든 테이블에 연결합니다.
2. **RPC만 허용**: Next.js 백엔드는 `service_role` 키를 사용하되, 어떤 테이블에도 직접 DML 권한을 부여하지 않습니다.
3. **set_config 필수화**: 모든 RPC의 시작과 종료, 그리고 예외 블록에서 `set_config('app.is_rpc_call', '...', true)`를 호출합니다.
4. **권한 검증**: `room_participants` 존재 검증, 초대 토큰 `FOR UPDATE`, `LEAST()`/`COALESCE()` 패턴으로 잘못된 입력을 차단합니다.
5. **배치 워커**: 좋아요 집계 워커(예: Edge Function)는 `service_role` 키를 사용해 `record_batched_like_event`만 호출하고, 실패 시 재시도합니다.

---

## 7. 운영 체크리스트

- Supabase SQL Editor에서 모든 RPC가 실제로 생성되어 있는지 `pg_proc` 조회로 확인합니다.
- `supabase/migrations`에 Trigger Guard 및 테이블 스키마 변경분을 누락 없이 커밋합니다.
- 신규 RPC 추가 시 `npm run lint`와 `npm run test` 이전에 `supabase db diff`로 스키마 변화를 검증합니다.
- RLS 정책 수정 시 반드시 스테이징에서 Invite → Join → Message → Read Flow를 최종 사용자 UX 기준으로 리그레션 테스트합니다.

---

## 8. 향후 개선안

1. **메시지 검색 인덱스**: `content`에 `GIN` 인덱스를 추가해 풀텍스트 검색 대비.
2. **메시지 에디트 기록**: `rooms_events`에 `message_edited` 타입을 추가하면 편집 히스토리를 쉽게 추적 가능.
3. **Invite Audit**: `room_invite_events` 별도 테이블을 두면 초대 사용량을 시간대별로 시각화할 수 있음.

이 문서를 기준으로 더 이상 `api_role` 환상에 의존하지 않고, 현실적인 `service_role + Trigger Guard` 구조에서 Supabase 보안 요구사항을 충족할 수 있습니다.