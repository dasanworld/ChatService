# Database Design — Reality Check (2025-11-15)

> 이 문서는 ChatService 저장소에 **실제로 존재하는 Supabase 상태**와 **이번 스프린트에 필요한 최소 설계**만 기록합니다. 과거 v1.11 문서는 구현되지 않은 Trigger Guard·RLS·RPC 조합을 수백 줄에 걸쳐 나열한 과설계 문서였으므로 폐기했습니다.

---

## 1. 현재 Supabase 상태

| 항목 | 내용 | 근거 |
| --- | --- | --- |
| 마이그레이션 | `supabase/migrations/0001_create_example_table.sql` 단일 파일만 존재 | 저장소 구조
| 테이블 | `public.example` 1개뿐 | 11~28행
| RLS | `ALTER TABLE public.example DISABLE ROW LEVEL SECURITY;` → **비활성** | 33행
| 함수/RPC | 정의된 것 없음 | 코드/SQL 전체 검색
| 연결 방식 | Next.js 서버가 `service_role` 키로 Supabase 접속 | `src/backend/supabase/client.ts`

> ✅ 질문하신 대로 **현재 RLS는 Disable 상태**가 맞습니다. 샘플 테이블만 존재해 굳이 Enable할 이유가 없었습니다.

---

## 2. 기존 문서가 과설계였던 이유

| 항목 | 문제 |
| --- | --- |
| Trigger Guard 남용 | `_shared_triggers.block_direct_dml()`과 `set_config('app.is_rpc_call')` 패턴을 모든 테이블에 강제했지만, 실제 테이블은 없었습니다. |
| 끝없는 RPC 목록 | 초대/읽음/좋아요/배치 워커 등 구현 계획조차 없는 SQL을 600+ 줄로 작성해 유지가 불가능했습니다. |
| RLS 정책 남발 | 문서상으로는 전 테이블 RLS ENABLE이지만 Supabase에서는 DISABLE이라 현실과 완전히 괴리되었습니다. |
| 문서=PRD 혼합 | 구현보다 문서가 앞서가며 팀에 혼란을 줬습니다. |

---

## 3. 지금 필요한 최소 스키마

| 우선순위 | 테이블 | 목적 | 비고 |
| --- | --- | --- | --- |
| P0 | `profiles` | Supabase Auth 유저 메타 캐시 | 가입 트리거 + 닉네임 정도 |
| P0 | `rooms` | 채팅방 메타 | `name`, `created_at`
| P0 | `room_participants` | 사용자-방 매핑 | 권한 판정/알림 기반
| P1 | `messages` | 메시지 저장 | MVP 확장 때 추가

그 외(초대, 이벤트, 좋아요 등)는 실제 기능 요청이 들어올 때 개별 설계/마이그레이션을 작성합니다.

---

## 4. RLS & 보안 전략

1. **현재**: 모든 테이블 RLS 비활성화 유지. 서버만 DB에 접근하며, 서비스 범위도 좁습니다.
2. **단계적 적용**: 새 테이블을 추가한 뒤 기능이 안정되면 해당 테이블에만 RLS를 Enable하고 정책을 문서화합니다.
3. **Trigger Guard 재도입 기준**: 직접 SQL을 노출하거나 RPC 기반 쓰기가 꼭 필요할 때 ADR을 통해 결정합니다.
4. **문서 원칙**: 이 파일에는 "현재 운영 중인 객체"와 "바로 다음 단계에서 할 일"만 기록합니다.

---

## 5. 즉시 할 일 (Action Items)

1. `supabase/migrations/0002_init_core_schema.sql`
   - `profiles`, `rooms`, `room_participants` (필요 시 `messages`) 정의
   - 모든 테이블에 `RLS DISABLE -- 이유` 주석 추가
2. Next.js API에서 실제로 필요한 CRUD만 구현 (직접 SQL 혹은 Supabase JS SDK)
3. 기능이 안정되면 해당 테이블의 RLS를 Enable하고 정책을 이 문서에 업데이트
4. Trigger/배치 워커 등 고급 패턴은 ADR로 별도 관리 후 채택

---

## 6. FAQ

- **Q. 지금 RLS를 켜두면 더 안전하지 않나요?**  
  A. 현재는 서버가 `service_role` 키로만 접근하며, 외부에서 Supabase RPC를 호출하지 않습니다. 빈 껍데기 정책을 관리하는 것보다, 기능이 명확해졌을 때 정확한 정책을 도입하는 편이 안전합니다.

- **Q. Trigger Guard는 완전히 없애나요?**  
  A. 아닙니다. 다만 실제 사용 사례가 생길 때 ADR을 통해 검토한 뒤 다시 도입합니다.

---

## 7. 업데이트 체크리스트

- [ ] 새 마이그레이션 작성 시 이 문서를 즉시 동기화
- [ ] `psql \d`, `\dp` 결과와 문서 내용 일치 여부 확인
- [ ] 문서가 다시 비대해질 경우 세부 SQL은 `docs/sql/*.sql`로 분리하고 링크만 유지

---

### 요약
- **RLS는 현 시점에 종료(DISABLE)** 되어 있으며, 이는 저장소 실제 상태와 일치합니다.
- 과설계된 v1.11 문서를 삭제하고 현실적인 최소 범위만 남겼습니다.
- 앞으로는 실제 구현이 완료된 범위와 바로 다음 단계의 필요 정보만 이 문서에 기록합니다.
