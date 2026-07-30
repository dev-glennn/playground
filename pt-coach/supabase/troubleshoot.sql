-- ============================================================
--  문제 진단 · 수정용 SQL
--  한 번에 다 실행하지 말고, 필요한 블록만 골라서 실행하세요.
--  (SQL Editor는 secret 권한으로 돌기 때문에 RLS가 적용되지 않습니다.
--   그래서 여기서는 모든 행이 보입니다 — 정상입니다.)
-- ============================================================


-- ── 1. 계정 목록 ─────────────────────────────────────────────
-- 앱에서 만든 계정이 여기 있어야 합니다. 여러 개면 어느 걸 쓸지 정하세요.
select id, email, created_at, last_sign_in_at
from auth.users
order by created_at;


-- ── 2. 데이터가 누구에게 붙어 있나 ───────────────────────────
-- 결과가 0행이면 seed.sql 을 실행하지 않은 것입니다.
select w.user_id, u.email, w.source, count(*) as sessions
from workouts w
left join auth.users u on u.id = w.user_id
group by w.user_id, u.email, w.source
order by u.email, w.source;


-- ── 3. 전체 행 수 확인 ───────────────────────────────────────
-- 기대값: workouts 34 (source='pt'), workout_sets 288
select
  (select count(*) from workouts where source = 'pt')     as pt_sessions,
  (select count(*) from workouts where source = 'self')   as my_sessions,
  (select count(*) from workout_sets)                     as total_sets;


-- ── 4. RLS가 켜져 있나 ───────────────────────────────────────
-- 둘 다 rls_enabled = true 여야 합니다.
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where relname in ('workouts', 'workout_sets');

-- 정책도 있어야 합니다. 2행이 나와야 정상입니다.
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename;


-- ============================================================
--  수정
-- ============================================================

-- ── 5-A. PT 데이터가 다른 계정에 붙어 있을 때 내 계정으로 옮기기 ──
-- 아래 이메일을 본인 것으로 바꾸고 실행하세요.
--
-- update workouts
--    set user_id = (select id from auth.users where email = 'me@example.com')
--  where source = 'pt';


-- ── 5-B. 내가 직접 기록한 것까지 전부 옮기기 ─────────────────
-- update workouts
--    set user_id = (select id from auth.users where email = 'me@example.com');


-- ── 5-C. 계정을 잘못 만들어서 지우고 다시 시작 ───────────────
-- 이 계정에 딸린 workouts/workout_sets 도 함께 삭제됩니다 (on delete cascade).
--
-- delete from auth.users where email = '지울계정@example.com';


-- ── 5-D. RLS가 안 걸려 있으면 ────────────────────────────────
-- schema.sql 전체를 다시 Run 하는 게 가장 확실합니다.
-- 여러 번 실행해도 안전하게 작성돼 있습니다.


-- ── 6. 전체 데이터 백업 (실행 후 Download CSV) ───────────────
select w.date, w.focus, w.source, s.exercise_id,
       s.weight, s.reps, s.set_count, s.per_side
from workouts w
join workout_sets s on s.workout_id = w.id
order by w.date, s.seq, s.set_index;
