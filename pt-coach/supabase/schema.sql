-- ============================================================
--  PT Coach — Supabase 스키마 + RLS
--  Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run
-- ============================================================

-- 세션(하루의 운동)
create table if not exists public.workouts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date       date not null,
  focus      text not null check (focus in ('lower','back','push','cardio')),
                                             -- 'cardio' = 유산소만 한 날
  note       text,
  source     text not null default 'self',   -- 'pt' = PT쌤 수업, 'self' = 개인운동
  created_at timestamptz not null default now(),
  unique (user_id, date, source)
);

-- 세션 안의 각 세트
create table if not exists public.workout_sets (
  id          bigserial primary key,
  workout_id  uuid not null references public.workouts(id) on delete cascade,
  exercise_id text not null,          -- data/exercises.json 의 id
  seq         int  not null default 0,-- 세션 내 종목 순서
  set_index   int  not null default 0,-- 종목 내 세트 순서
  weight      numeric,                -- null = 맨몸/무게없음
  reps        int,
  set_count   int  not null default 1,-- 같은 무게로 반복한 세트 수
  per_side    boolean not null default false,
  done        boolean not null default true
);

create index if not exists workout_sets_workout_idx on public.workout_sets(workout_id);
create index if not exists workout_sets_exercise_idx on public.workout_sets(exercise_id);
create index if not exists workouts_user_date_idx on public.workouts(user_id, date desc);

-- ============================================================
--  RLS — 로그인한 본인만 자기 데이터에 접근
--  anon key가 공개돼도 이 정책 때문에 남의 데이터는 읽거나 쓸 수 없습니다.
-- ============================================================
alter table public.workouts     enable row level security;
alter table public.workout_sets enable row level security;

drop policy if exists "own workouts" on public.workouts;
create policy "own workouts" on public.workouts
  for all
  using      (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "own sets" on public.workout_sets;
create policy "own sets" on public.workout_sets
  for all
  using (exists (
    select 1 from public.workouts w
    where w.id = workout_sets.workout_id and w.user_id = auth.uid()))
  with check (exists (
    select 1 from public.workouts w
    where w.id = workout_sets.workout_id and w.user_id = auth.uid()));

-- 익명(비로그인) 접근 완전 차단
revoke all on public.workouts     from anon;
revoke all on public.workout_sets from anon;
grant  all on public.workouts     to authenticated;
grant  all on public.workout_sets to authenticated;
grant usage, select on all sequences in schema public to authenticated;
