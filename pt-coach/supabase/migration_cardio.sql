-- ============================================================
--  유산소 기록 추가 (마이그레이션)
--  Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run
--  여러 번 실행해도 안전합니다.
-- ============================================================

-- 한 세션의 유산소 항목. 한 항목은 '기구 + 세트수 + 구간들' 로 이뤄진다.
--   예) 런닝머신 인터벌 4세트 = seq 0 / rep_count 4 / segment 2개(달리기·걷기)
--       마무리 걷기 16분     = seq 1 / rep_count 1 / segment 1개
create table if not exists public.cardio_sets (
  id            bigserial primary key,
  workout_id    uuid not null references public.workouts(id) on delete cascade,
  machine       text not null,               -- data/cardio.json 의 id
  seq           int  not null default 0,     -- 세션 내 항목 순서
  segment_index int  not null default 0,     -- 항목 내 구간 순서
  label         text,                        -- '달리기' / '걷기' / null
  rep_count     int  not null default 1,     -- 이 구간 묶음을 반복한 세트 수
  minutes       numeric,                     -- 구간 1회 시간(분)
  speed         numeric,                     -- 속도 · 레벨 · 저항
  incline       numeric,                     -- 경사(%)
  distance_km   numeric,                     -- 거리(km)
  floors        int,                         -- 천국의 계단 층수
  note          text
);

create index if not exists cardio_sets_workout_idx on public.cardio_sets(workout_id);
create index if not exists cardio_sets_machine_idx on public.cardio_sets(machine);

-- ── RLS — workout_sets 와 같은 방식(부모 세션의 소유자 확인) ────────────
alter table public.cardio_sets enable row level security;

drop policy if exists "own cardio" on public.cardio_sets;
create policy "own cardio" on public.cardio_sets
  for all
  using (exists (
    select 1 from public.workouts w
    where w.id = cardio_sets.workout_id and w.user_id = auth.uid()))
  with check (exists (
    select 1 from public.workouts w
    where w.id = cardio_sets.workout_id and w.user_id = auth.uid()));

revoke all on public.cardio_sets from anon;
grant  all on public.cardio_sets to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ── 유산소만 한 날을 위한 focus 값 추가 ────────────────────────────────
--  근력을 하나도 안 한 날을 'push' 같은 부위로 저장하면 추천 엔진이
--  "그 부위를 방금 했다"고 착각해 로테이션이 망가진다. 'cardio' 를 허용하고
--  엔진은 이 값을 3분할 계산에서 무시한다.
alter table public.workouts drop constraint if exists workouts_focus_check;
alter table public.workouts add  constraint workouts_focus_check
  check (focus in ('lower', 'back', 'push', 'cardio'));

-- 확인용: 아래가 true 여야 정상
-- select relname, relrowsecurity from pg_class where relname = 'cardio_sets';
