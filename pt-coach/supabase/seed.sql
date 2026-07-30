-- PT 기록 시드 (2026-01-12 ~ 2026-06-04, 34세션)
-- Supabase SQL Editor에 붙여넣고 실행하세요. 로그인 계정을 먼저 만든 뒤 실행해야 합니다.
do $$
declare
  uid uuid;
  wid uuid;
begin
  select id into uid from auth.users order by created_at limit 1;
  if uid is null then raise exception '먼저 앱에서 회원가입/로그인해 계정을 만들어 주세요.'; end if;
  delete from workouts where user_id = uid and source = 'pt';

  insert into workouts (user_id, date, focus, source) values (uid, '2026-01-12', 'lower', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'jump_squat', 0, 0, null, 15, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_squat', 1, 0, null, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_squat', 1, 1, 5, 15, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_abduction', 2, 0, 30, 15, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'split_squat', 3, 0, null, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'leg_press', 4, 0, null, 15, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'leg_extension', 5, 0, 10, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'leg_extension', 5, 1, 15, 15, 3, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-01-15', 'back', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'deadlift', 0, 0, 20, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'deadlift', 0, 1, 25, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'deadlift', 0, 2, 30, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'cable_row', 1, 0, 20, 15, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'cable_row', 1, 1, 10, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'medball_complex', 2, 0, null, 15, 2, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'lat_pulldown', 3, 0, 15, 12, 3, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-01-20', 'lower', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_abduction', 0, 0, 40, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_abduction', 0, 1, 45, 15, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_thrust', 1, 0, null, 15, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_thrust', 1, 1, 2.5, 15, 3, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'v_squat', 2, 0, null, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_leg_squat_bench', 3, 0, null, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_leg_squat_bench', 3, 1, 4, 15, 2, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'band_pushdown', 4, 0, null, 20, 3, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-01-22', 'push', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_press_barbell', 0, 0, 6, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_press_barbell', 0, 1, 10, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_press_barbell', 0, 2, 15, 15, 2, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_press_dumbbell', 1, 0, 3, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_press_dumbbell', 1, 1, 4, 12, 2, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'shoulder_press_barbell', 2, 0, 6, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'lateral_raise', 3, 0, 1.5, 15, 3, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-02-09', 'push', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'pushup', 0, 0, null, 10, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_press_barbell', 1, 0, null, 10, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_press_dumbbell', 2, 0, 3, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'thruster', 3, 0, 6, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_arm_ohp', 4, 0, 1, 12, 3, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-02-20', 'back', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'cable_row', 0, 0, 20, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'cable_row', 0, 1, 25, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'cable_row', 0, 2, 30, 12, 2, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'lat_pulldown', 1, 0, 15, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'lat_pulldown', 1, 1, 20, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_arm_dumbbell_row', 2, 0, 3, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_arm_dumbbell_row', 2, 1, 4, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'pullup_assist', 3, 0, 89, 10, 3, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-02-24', 'lower', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'dumbbell_squat', 0, 0, 7, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'dumbbell_squat', 0, 1, 9, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'dumbbell_squat', 0, 2, 12, 15, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'slide_pad', 1, 0, null, 15, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'leg_press', 2, 0, 30, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'leg_press', 2, 1, 40, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'leg_press', 2, 2, 45, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_abduction', 3, 0, 40, 15, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_squat', 4, 0, 3, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_squat', 4, 1, 5, 15, 2, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-02-26', 'push', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_press_smith', 0, 0, null, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_press_smith', 0, 1, 2.5, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_press_smith', 0, 2, 5, 10, 2, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_press_dumbbell', 1, 0, 3, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_press_dumbbell', 1, 1, 4, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_press_dumbbell', 1, 2, 5, 12, 2, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'dumbbell_fly', 2, 0, 3, 10, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'shoulder_press_smith', 3, 0, null, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'shoulder_press_smith', 3, 1, 2.5, 10, 2, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'lateral_raise', 4, 0, 1, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'lateral_raise', 4, 1, 1.5, 15, 3, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-03-04', 'lower', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'sumo_deadlift', 0, 0, 15, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'sumo_deadlift', 0, 1, 20, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'sumo_deadlift', 0, 2, 22, 12, 2, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_adduction', 1, 0, 15, 15, 2, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_adduction', 1, 1, 25, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'side_squat', 2, 0, 5, 20, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'side_squat', 2, 1, 7, 20, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'side_squat', 2, 2, 8, 20, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_leg_squat_bench', 3, 0, 5, 12, 3, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-03-06', 'back', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'dumbbell_deadlift', 0, 0, 7, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'dumbbell_deadlift', 0, 1, 10, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'dumbbell_deadlift', 0, 2, 12, 15, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'arm_pulldown', 1, 0, 10, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_row', 2, 0, 10, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_row', 2, 1, 15, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_arm_cable_row', 3, 0, 10, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_arm_cable_row', 3, 1, 15, 12, 3, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-03-10', 'lower', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_abduction', 0, 0, 40, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_abduction', 0, 1, 45, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_abduction', 0, 2, 50, 15, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'smith_single_squat', 1, 0, null, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'smith_single_squat', 1, 1, 5, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_thrust', 2, 0, 5, 12, 3, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bulgarian_split_squat', 3, 0, null, 12, 3, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-03-12', 'push', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'incline_bench_machine', 0, 0, null, 15, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'incline_bench_machine', 0, 1, 2.5, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'incline_bench_machine', 0, 2, 5, 10, 3, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'incline_bench_dumbbell', 1, 0, 3, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'incline_bench_dumbbell', 1, 1, 4, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'incline_bench_dumbbell', 1, 2, 6, 10, 2, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'shoulder_press_barbell', 2, 0, 6, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'shoulder_press_barbell', 2, 1, 10, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'shoulder_press_dumbbell', 3, 0, 4, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'lateral_raise', 4, 0, 1.5, 20, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'band_lateral_raise', 5, 0, null, 20, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'band_lateral_raise', 5, 1, null, 30, 1, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-03-16', 'lower', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_squat', 0, 0, null, 15, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_squat', 0, 1, 2.5, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_squat', 0, 2, 5, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_squat', 0, 3, 7.5, 12, 2, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_leg_squat_bench', 1, 0, null, 10, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_abduction', 2, 0, 45, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_abduction', 2, 1, 50, 15, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hack_squat', 3, 0, null, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hack_squat', 3, 1, null, 15, 1, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-03-18', 'back', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'deadlift', 0, 0, 20, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'deadlift', 0, 1, 30, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'deadlift', 0, 2, 35, 10, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'deadlift', 0, 3, 40, 10, 2, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'wide_cable_row', 1, 0, 15, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'wide_cable_row', 1, 1, 20, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'wide_cable_row', 1, 2, 25, 12, 2, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'wide_pulldown', 2, 0, null, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'wide_pulldown', 2, 1, 2.5, 12, 3, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_arm_row_machine', 3, 0, 10, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_arm_row_machine', 3, 1, 12.5, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_arm_row_machine', 3, 2, 17.5, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_arm_row_machine', 3, 3, 20, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'fly_machine', 4, 0, 5, 15, 3, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-03-24', 'lower', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_abduction', 0, 0, 50, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_abduction', 0, 1, 55, 15, 2, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'smith_split_squat', 1, 0, 5, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'smith_split_squat', 1, 1, 7.5, 12, 2, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_thrust', 2, 0, 5, 15, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_thrust', 2, 1, 7.5, 15, 3, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'kb_split_hinge', 3, 0, null, 12, 3, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-03-26', 'push', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'pushup', 0, 0, null, 10, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'fly_machine', 1, 0, 5, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'fly_machine', 1, 1, 10, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'incline_bench_machine', 2, 0, 2.5, 10, 3, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_press_dumbbell', 3, 0, 5, 10, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'military_press_smith', 4, 0, null, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'military_press_smith', 4, 1, 2.5, 10, 3, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'lateral_raise', 5, 0, 1.5, 15, 3, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-03-31', 'lower', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_squat', 0, 0, null, 15, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_squat', 0, 1, 5, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_squat', 0, 2, 7.5, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_squat', 0, 3, 10, 10, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_squat', 0, 4, 12.5, 8, 2, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'leg_press', 1, 0, 45, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'leg_press', 1, 1, 50, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'split_squat', 2, 0, 2, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'split_squat', 2, 1, 3, 12, 2, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'leg_extension', 3, 0, 20, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'leg_extension', 3, 1, 25, 12, 2, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-04-02', 'back', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'stiff_deadlift', 0, 0, 10, 20, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'stiff_deadlift', 0, 1, 15, 30, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_row', 1, 0, 15, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'lat_pulldown', 2, 0, 15, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'lat_pulldown', 2, 1, 1.5, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'cable_row', 3, 0, 20, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'cable_row', 3, 1, 30, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'cable_row', 3, 2, 35, 10, 2, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'wide_pulldown', 4, 0, 2.5, 10, 3, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'band_row', 5, 0, null, 30, 1, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-04-06', 'lower', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_abduction', 0, 0, 50, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_abduction', 0, 1, 55, 15, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_leg_v_squat', 1, 0, null, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_leg_v_squat', 1, 1, 2.5, 12, 3, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'tbar_squat', 2, 0, 20, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'monster_glute', 3, 0, 15, 15, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'aquabag_calf', 4, 0, null, 10, 2, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-04-08', 'push', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'incline_bench_barbell', 0, 0, 10, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'incline_bench_barbell', 0, 1, 15, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'incline_bench_dumbbell', 1, 0, 4, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'incline_bench_dumbbell', 1, 1, 6, 10, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'shoulder_press_barbell', 2, 0, 10, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'shoulder_press_barbell', 2, 1, 15, 10, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'shoulder_press_machine', 3, 0, 5, 10, 3, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'lateral_raise', 4, 0, 1.5, 15, 3, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-04-13', 'lower', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hack_squat', 0, 0, 5, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hack_squat', 0, 1, 10, 12, 3, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'leg_press', 1, 0, 40, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'leg_press', 1, 1, 60, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'leg_press', 1, 2, 65, 12, 2, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_squat', 2, 0, 5, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_squat', 2, 1, 8, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_leg_squat_bench', 3, 0, null, 5, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'leg_extension', 4, 0, 10, 25, 1, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-04-15', 'back', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'deadlift', 0, 0, 20, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'deadlift', 0, 1, 35, 10, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'deadlift', 0, 2, 40, 10, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'deadlift', 0, 3, 42, 10, 2, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'lat_pulldown_under', 1, 0, 15, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'cable_row', 2, 0, 20, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'cable_row', 2, 1, 25, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_arm_cable_row', 3, 0, 10, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_arm_cable_row', 3, 1, 15, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_arm_cable_row', 3, 2, 20, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'fly_machine', 4, 0, 6, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'fly_machine', 4, 1, 11, 10, 2, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-04-22', 'lower', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_abduction', 0, 0, 50, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_abduction', 0, 1, 55, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_thrust_smith', 1, 0, 10, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_thrust_smith', 1, 1, 15, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_thrust_smith', 1, 2, 17.5, 12, 3, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'v_squat', 2, 0, 10, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'v_squat', 2, 1, 12.5, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'v_squat', 2, 2, 17.5, 12, 2, true);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-04-24', 'push', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_press_barbell', 0, 0, 15, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_press_barbell', 0, 1, 20, 10, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_press_dumbbell', 1, 0, 5, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_press_dumbbell', 1, 1, 6, 10, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'shoulder_press_barbell', 2, 0, 10, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'shoulder_press_barbell', 2, 1, 15, 10, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'behind_shoulder_press', 3, 0, 6, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'lateral_raise', 4, 0, 2, 12, 3, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-04-27', 'lower', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_squat', 0, 0, 20, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_squat', 0, 1, 30, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_squat', 0, 2, 40, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'dumbbell_squat', 1, 0, 7, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'dumbbell_squat', 1, 1, 8, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'smith_split_squat', 2, 0, null, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_abduction', 3, 0, 60, 12, 1, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-04-30', 'back', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'arm_pulldown', 0, 0, 10, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'wide_cable_row', 1, 0, 30, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'lat_pulldown', 2, 0, 15, 10, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'pullup_assist', 3, 0, 81, 8, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'deadlift', 4, 0, 20, 20, 3, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-05-06', 'lower', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'sumo_deadlift', 0, 0, 20, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'sumo_deadlift', 0, 1, 25, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'side_squat', 1, 0, 5, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_adduction', 2, 0, 20, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_adduction', 2, 1, 25, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'leg_press_pad', 3, 0, 5, 15, 3, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'leg_press_pad', 3, 1, 10, 15, 3, true);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-05-08', 'push', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'incline_bench_smith', 0, 0, null, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'incline_bench_smith', 0, 1, 2.5, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'incline_bench_smith', 0, 2, 5, 10, 2, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'incline_bench_dumbbell', 1, 0, 7, 10, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'military_press_smith', 2, 0, null, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'military_press_smith', 2, 1, 2.5, 10, 3, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_arm_ohp', 3, 0, 2, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_arm_ohp', 3, 1, 3, 15, 2, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'lateral_raise', 4, 0, 1, 15, 3, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-05-12', 'lower', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_abduction', 0, 0, 50, 15, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_abduction', 0, 1, null, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_leg_v_squat', 1, 0, 2.5, 10, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_leg_v_squat', 1, 1, null, 5, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'skating_kneeup', 2, 0, 5, 10, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'monster_glute', 3, 0, 5, 15, 3, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'jump_squat', 4, 0, null, 20, 1, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-05-14', 'back', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'dumbbell_deadlift', 0, 0, 12, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'dumbbell_deadlift', 0, 1, 14, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'middle_row', 1, 0, 25, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'middle_row', 1, 1, 30, 12, 2, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'lat_pulldown_narrow', 2, 0, 20, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'lat_pulldown_narrow', 2, 1, 25, 12, 2, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_row', 3, 0, 15, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'face_pull', 4, 0, 10, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'face_pull', 4, 1, 15, 15, 2, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-05-18', 'lower', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_abduction', 0, 0, 50, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_leg_squat_bench', 1, 0, 8, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_leg_squat_bench', 1, 1, 10, 12, 2, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_thrust', 2, 0, 7.5, 12, 3, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hip_thrust', 2, 1, null, 15, 3, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'jump_squat', 3, 0, null, 10, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'band_pushdown', 4, 0, null, 20, 3, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-05-21', 'push', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_press_barbell', 0, 0, 20, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'bench_press_barbell', 0, 1, 25, 8, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'incline_bench_machine', 1, 0, 2.5, 10, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'fly_machine', 2, 0, 11, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'pushup', 3, 0, null, 8, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'cable_front_raise', 4, 0, 10, 12, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'lateral_raise', 5, 0, 2, 15, 3, false);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-06-03', 'lower', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_squat', 0, 0, 20, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_squat', 0, 1, 30, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_squat', 0, 2, 35, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_squat', 0, 3, 40, 12, 2, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'split_squat', 1, 0, null, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'split_squat', 1, 1, 3, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'split_squat', 1, 2, 4, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'hack_squat', 2, 0, 5, 12, 3, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'monster_glute', 3, 0, 5, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'monster_glute', 3, 1, 7.5, 12, 3, true);

  insert into workouts (user_id, date, focus, source) values (uid, '2026-06-04', 'back', 'pt') returning id into wid;
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'pullup_assist', 0, 0, 83, 8, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_row', 1, 0, 15, 12, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'barbell_row', 1, 1, 20, 10, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'lat_pulldown_under', 2, 0, 20, 10, 3, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_arm_row_machine', 3, 0, 12.5, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_arm_row_machine', 3, 1, 15, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'one_arm_row_machine', 3, 2, 17.5, 12, 1, true);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'fly_machine', 4, 0, 6, 15, 1, false);
  insert into workout_sets (workout_id, exercise_id, seq, set_index, weight, reps, set_count, per_side) values (wid, 'fly_machine', 4, 1, 11, 15, 2, false);

  raise notice '시드 완료';
end $$;