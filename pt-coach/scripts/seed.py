# -*- coding: utf-8 -*-
import json
w = json.load(open('../data/workouts.json'))
def q(v): return 'null' if v is None else (f"'{v}'" if isinstance(v,str) else ('true' if v is True else 'false' if v is False else f"{v:g}"))
L = ["-- PT 기록 시드 (2026-01-12 ~ 2026-06-04, %d세션)" % len(w),
     "-- Supabase SQL Editor에 붙여넣고 실행하세요. 로그인 계정을 먼저 만든 뒤 실행해야 합니다.",
     "do $$", "declare", "  uid uuid;", "  wid uuid;", "begin",
     "  select id into uid from auth.users order by created_at limit 1;",
     "  if uid is null then raise exception '먼저 앱에서 회원가입/로그인해 계정을 만들어 주세요.'; end if;",
     "  delete from workouts where user_id = uid and source = 'pt';", ""]
for s in w:
    L.append(f"  insert into workouts (user_id, date, focus, source) values (uid, '{s['date']}', '{s['focus']}', 'pt') returning id into wid;")
    for i, e in enumerate(s["exercises"]):
        for j, st in enumerate(e["sets"]):
            L.append("  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values "
                     f"(wid, '{e['exercise_id']}', {i}, {j}, {q(st['weight'])}, {q(st['reps'])}, {q(st['count'])}, {q(st['per_side'])});")
    L.append("")
L += ["  raise notice '시드 완료';", "end $$;"]
open('../supabase/seed.sql','w').write('\n'.join(L))
print("seed.sql 생성:", sum(1 for x in L if x.strip().startswith('insert into workout_sets')), "세트 행,",
      sum(1 for x in L if 'insert into workouts' in x), "세션")
