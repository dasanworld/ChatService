-----

### 📄 Database Design v1.5 (진짜 최종 완결본 - Enforced RPC-Only)

  * **문서 버전:** v1.5 (Final)
  * **관련 문서:** `PRD v1.3`, `Userflow v1.3`, `requirement.md v1.6`
  * **아키텍처:** Supabase Auth + RLS Disabled + **Enforced Atomic RPCs**

> ### 📢 v1.5 변경 로그 (Change Log)
>
>   * **[v1.5 핵심] The Golden Rule (DB 권한 강제) 도입:**
>       * API(백엔드)가 사용하는 DB 역할(Role)의 모든 `INSERT`, `UPDATE`, `DELETE` 권한을 `REVOKE` (회수)합니다.
>       * API 역할에는 \*\*오직 `SELECT` (읽기)\*\*와 **`EXECUTE` (함수 실행)** 권한만 부여합니다.
>       * **결과:** API 개발자는 `like_message()` 같은 RPC를 호출하지 않고는 `message_likes` 테이블에 `INSERT`하는 것이 **물리적으로 불가능**해집니다. 아키텍처가 코드가 아닌 권한으로 강제됩니다.
>   * **[v1.5 핵심] 모든 P0 RPC 명세 완성:**
>       * `v1.4`에서 "참고"로 누락되었던 **`like_message()`**, **`unlike_message()`**, **`delete_message_for_all()`** 등 모든 P0 쓰기(Write) RPC를 명시적으로 정의합니다.
>       * 이 함수들은 `v1.4`의 'Link-Back' 로직을 포함하여, `room_events`와의 데이터 정합성을 100% 보장합니다.
>   * **[v1.5 참고] '좋아요' Batching 정책 명확화:**
>       * `like_message()` RPC는 `requirement.md v1.6`의 Batching 정책에 따라, `message_likes`에는 즉시 `INSERT`하되, `room_events`에는 기록하지 않습니다. (`room_events` 기록은 별도의 비동기 Batch 워커가 담당)

-----

### 1\. 🛡️ [v1.5 신규] The Golden Rule (DB 권한 강제)

이 아키텍처를 강제하기 위해, API(백엔드)가 연결하는 DB Role(예: `api_role`)에 다음 권한 설정을 적용해야 합니다. (Supabase의 `authenticated` Role에 적용하거나, 별도 Role 생성)

```sql
-- 1. (가정) API가 'api_role'을 사용한다고 가정
-- CREATE ROLE api_role LOGIN PASSWORD '...';
-- GRANT USAGE ON SCHEMA public TO api_role;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO api_role; -- BIGSERIAL ID 사용 위해

-- 2. [핵심] API의 테이블 직접 쓰기 권한을 '모두' 회수 (REVOKE)
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM api_role;

-- 3. [핵심] API에 '읽기(SELECT)' 권한만 허용
GRANT SELECT ON ALL TABLES IN SCHEMA public TO api_role;

-- 4. [핵심] API에 '쓰기(Write)'는 오직 '함수 실행(EXECUTE)'으로만 허용
GRANT EXECUTE ON FUNCTION public.create_room(UUID, TEXT) TO api_role;
GRANT EXECUTE ON FUNCTION public.join_room(UUID, UUID) TO api_role;
GRANT EXECUTE ON FUNCTION public.leave_room(UUID, UUID) TO api_role;
GRANT EXECUTE ON FUNCTION public.post_new_message(UUID, UUID, TEXT, UUID) TO api_role;
GRANT EXECUTE ON FUNCTION public.like_message(UUID, UUID) TO api_role;
GRANT EXECUTE ON FUNCTION public.unlike_message(UUID, UUID) TO api_role;
GRANT EXECUTE ON FUNCTION public.delete_message_for_all(UUID, UUID) TO api_role;
GRANT EXECUTE ON FUNCTION public.hide_message_for_me(UUID, UUID) TO api_role;
```

-----

### 2\. 🏛️ 아키텍처 및 핵심 데이터플로우

  * **인증 (AuthN):** `Supabase Auth`
  * **인가 (AuthZ):** RLS Disabled. 백엔드 API가 JWT 검증 및 `room_participants` `SELECT`로 권한 확인.
  * **쓰기 (Writes):** **Enforced RPC-Only.** API는 DB 권한(`REVOKE`) 때문에 `INSERT`/`UPDATE`가 불가능하며, 오직 `GRANT`된 `public` 함수(RPC)만 `EXECUTE`할 수 있습니다.

-----

### 3\. 🗃️ 구체적인 데이터베이스 스키마 (Tables)



#### 1\. `profiles`

#### 2\. `rooms`

#### 3\. `room_participants`

#### 4\. `messages` ( `event_version` 컬럼 포함)

#### 5\. `message_likes`

#### 6\. `room_events`

#### 7\. `hidden_messages`



-----

### 4\. ⚡ [CRITICAL] P0 필수 데이터베이스 함수 (Functions)

API가 호출할 수 있는 유일한 '쓰기' 통로입니다.

#### 1\. (가입) `handle_new_user` (Trigger)

(v1.4와 동일)

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nickname)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'nickname');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

#### 2\. (방 생성) `create_room` (RPC)



```sql
CREATE OR REPLACE FUNCTION public.create_room(p_user_id UUID, p_name TEXT)
RETURNS public.rooms
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_new_room rooms;
BEGIN
  -- (권한 검증: API가 JWT의 p_user_id를 전달)
  INSERT INTO public.rooms (name) VALUES (p_name)
  RETURNING * INTO v_new_room;
  
  INSERT INTO public.room_participants (user_id, room_id)
  VALUES (p_user_id, v_new_room.id);

  INSERT INTO public.room_events (room_id, type, payload)
  VALUES (v_new_room.id, 'room_created', 
          jsonb_build_object('room_id', v_new_room.id, 'name', v_new_room.name));
  
  RETURN v_new_room;
END;
$$;
```

#### 3\. (초대 합류) `join_room` (RPC)



```sql
CREATE OR REPLACE FUNCTION public.join_room(p_user_id UUID, p_room_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_profile public.profiles;
BEGIN
  INSERT INTO public.room_participants (user_id, room_id)
  VALUES (p_user_id, p_room_id)
  ON CONFLICT (user_id, room_id) DO NOTHING;

  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
  INSERT INTO public.room_events (room_id, type, payload)
  VALUES (p_room_id, 'participant_joined', 
          jsonb_build_object('user_id', p_user_id, 'nickname', v_profile.nickname));
END;
$$;
```

#### 4\. (방 나가기) `leave_room` (RPC)



```sql
CREATE OR REPLACE FUNCTION public.leave_room(p_user_id UUID, p_room_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM public.room_participants
  WHERE user_id = p_user_id AND room_id = p_room_id;

  INSERT INTO public.room_events (room_id, type, payload)
  VALUES (p_room_id, 'participant_left', 
          jsonb_build_object('user_id', p_user_id));
END;
$$;
```

#### 5\. (메시지 전송) `post_new_message` (RPC)



```sql
CREATE OR REPLACE FUNCTION public.post_new_message(
    p_room_id UUID,
    p_user_id UUID,
    p_content TEXT,
    p_reply_to_message_id UUID DEFAULT NULL
)
RETURNS public.messages 
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_nickname TEXT;
  v_new_message messages;
  v_new_event_version BIGINT;
BEGIN
  -- (API는 p_user_id가 p_room_id의 참여자인지 SELECT로 선검증해야 함)
  SELECT nickname INTO v_user_nickname FROM profiles WHERE id = p_user_id;

  INSERT INTO public.messages (room_id, user_id, content, reply_to_message_id, user_nickname)
  VALUES (p_room_id, p_user_id, p_content, p_reply_to_message_id, v_user_nickname)
  RETURNING * INTO v_new_message;

  INSERT INTO public.room_events (room_id, type, payload)
  VALUES (p_room_id, 'message_created', jsonb_build_object('message', row_to_json(v_new_message)))
  RETURNING id INTO v_new_event_version;

  UPDATE public.messages
  SET event_version = v_new_event_version
  WHERE id = v_new_message.id;

  v_new_message.event_version := v_new_event_version; 
  RETURN v_new_message;
END;
$$;
```

#### 6\. (좋아요) `like_message` (RPC) - [v1.5 신규]

`F-05`에서 API가 호출해야 하는 함수.

```sql
CREATE OR REPLACE FUNCTION public.like_message(
    p_user_id UUID,
    p_message_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- 1. [상태 쓰기] message_likes 테이블에 INSERT (성능 최적화)
  INSERT INTO public.message_likes (user_id, message_id)
  VALUES (p_user_id, p_message_id)
  ON CONFLICT (user_id, message_id) DO NOTHING;

  -- 2. [이벤트 쓰기] (주석 처리됨)
  -- requirement.md v1.6 (좋아요 Batching) 정책에 따라,
  -- 이 RPC는 'room_events'에 직접 쓰지 않습니다.
  -- 별도의 비동기 워커(pg_cron 등)가 'message_likes' 테이블의 변화를 감지하여
  -- 5초에 한 번씩 'message_updated' 이벤트를 'room_events'에 기록해야 합니다.
  
  -- (만약 Batching을 포기한다면, 여기에 'INSERT room_events'를 추가해야 함)
END;
$$;
```

#### 7\. (좋아요 취소) `unlike_message` (RPC) - [v1.5 신규]

`F-05`에서 API가 호출해야 하는 함수.

```sql
CREATE OR REPLACE FUNCTION public.unlike_message(
    p_user_id UUID,
    p_message_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- 1. [상태 쓰기] message_likes 테이블에서 DELETE
  DELETE FROM public.message_likes
  WHERE user_id = p_user_id AND message_id = p_message_id;

  -- 2. [이벤트 쓰기] (like_message와 동일한 Batching 정책)
END;
$$;
```

#### 8\. (모두에게 삭제) `delete_message_for_all` (RPC) - [v1.5 신규]

`F-08`에서 API가 호출해야 하는 함수.

```sql
CREATE OR REPLACE FUNCTION public.delete_message_for_all(
    p_user_id UUID,
    p_message_id UUID
)
RETURNS public.messages -- 수정된 메시지 객체 반환
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_updated_message messages;
  v_new_event_version BIGINT;
BEGIN
  -- 1. [상태 쓰기] 5분 이내의 본인 메시지만 수정
  UPDATE public.messages
  SET 
    is_deleted = TRUE,
    content = '삭제된 메시지입니다.'
  WHERE 
    id = p_message_id 
    AND user_id = p_user_id 
    AND created_at > (now() - INTERVAL '5 minutes') -- PRD v1.3 정책
  RETURNING * INTO v_updated_message;

  -- 2. (수정 성공 시) [이벤트 쓰기] + [Link-Back]
  IF v_updated_message IS NOT NULL THEN
    INSERT INTO public.room_events (room_id, type, payload)
    VALUES (v_updated_message.room_id, 'message_deleted', jsonb_build_object('message', row_to_json(v_updated_message)))
    RETURNING id INTO v_new_event_version;
    
    UPDATE public.messages
    SET event_version = v_new_event_version
    WHERE id = v_updated_message.id;
    
    v_updated_message.event_version := v_new_event_version;
  END IF;

  RETURN v_updated_message;
END;
$$;
```

#### 9\. (나에게만 삭제) `hide_message_for_me` (RPC) - [v1.5 신규]

`F-08`에서 API가 호출해야 하는 함수. (이벤트 동기화 불필요)

```sql
CREATE OR REPLACE FUNCTION public.hide_message_for_me(
    p_user_id UUID,
    p_message_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- [상태 쓰기] hidden_messages 테이블에 INSERT
  INSERT INTO public.hidden_messages (user_id, message_id)
  VALUES (p_user_id, p_message_id)
  ON CONFLICT (user_id, message_id) DO NOTHING;
  
  -- (PRD/req.md 정책에 따라 'room_events'에 기록하지 않음)
END;
$$;
```