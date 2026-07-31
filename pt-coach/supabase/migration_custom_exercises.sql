-- ============================================================
--  내가 만든 종목 (마이그레이션)
--  Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run
--  여러 번 실행해도 안전합니다.
-- ============================================================

-- data/exercises.json 의 기본 카탈로그에 더해, 앱에서 직접 만든 종목.
-- id 는 앱이 'custom_<타임스탬프>' 형태로 만들어 workout_sets.exercise_id 에 들어갑니다.
create table if not exists public.custom_exercises (
  id         text primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null,
  focus      text not null check (focus in ('lower', 'back', 'push')),
  -- 패턴을 안 받으므로 자동 추천 슬롯에는 넣지 않고 '＋ 종목'에서 직접 고르게 한다.
  pattern    text not null default 'custom',
  equipment  text,
  hidden     boolean not null default false,  -- 기록이 있어 지울 수 없을 때 목록에서만 감춤
  created_at timestamptz not null default now()
);

create index if not exists custom_exercises_user_idx on public.custom_exercises(user_id);

-- ── RLS ────────────────────────────────────────────────────────
alter table public.custom_exercises enable row level security;

drop policy if exists "own custom exercises" on public.custom_exercises;
create policy "own custom exercises" on public.custom_exercises
  for all
  using      (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.custom_exercises from anon;
grant  all on public.custom_exercises to authenticated;

-- 확인용: 아래가 true 여야 정상
-- select relname, relrowsecurity from pg_class where relname = 'custom_exercises';
