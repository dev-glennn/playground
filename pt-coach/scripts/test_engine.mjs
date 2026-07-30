import fs from 'fs';
const g = globalThis;
new Function(fs.readFileSync('engine.js','utf8')).call(g);
const E = g.PTEngine;
const cat = JSON.parse(fs.readFileSync('data/exercises.json','utf8'));
const wk  = JSON.parse(fs.readFileSync('data/workouts.json','utf8'))
  .map(w=>({date:w.date, focus:w.focus, exercises:w.exercises.map(e=>({exercise_id:e.exercise_id,
    sets:e.sets.map(s=>({weight:s.weight,reps:s.reps,set_count:s.count,per_side:s.per_side}))}))}));
const byId = Object.fromEntries(cat.exercises.map(e=>[e.id,e]));

// --- 1) 실제 기록 기준 오늘 추천 ---
const rec = E.recommend({catalog:cat.exercises, history:wk, today:'2026-07-30'});
console.log('=== 2026-07-30 추천 ===');
console.log('부위 우선순위:', rec.ranking.map(r=>`${cat.focus_labels[r.focus]}(${r.days===999?'없음':r.days+'일전'})`).join('  '));
console.log('선택:', cat.focus_labels[rec.focus],'\n');
for(const s of rec.slots){
  if(!s.exercise){console.log(`[${s.label}] 후보 없음`);continue;}
  console.log(`[${s.label}] ${s.exercise.name}  ${s.daysSince===999?'(첫 시도)':'('+s.daysSince+'일 전 마지막)'}`);
  console.log('   ->', s.plan.why);
  console.log('   ->', s.plan.sets.map(x=>`${x.weight==null?'맨몸':x.weight+'kg'+(x.per_side?'씩':'')} ${x.reps}회 ${x.set_count}세트${x.kind==='warmup'?'(워밍업)':''}`).join(' / '));
}

// --- 2) 12주 롤링 시뮬레이션: 같은 부위 연속 / 종목 중복 검사 ---
console.log('\n=== 12주(주2회) 시뮬레이션 ===');
let hist = wk.slice();
let d = new Date('2026-08-03'); // 월요일
const log=[]; let sameFocusRun=0, maxRun=1, prevFocus=null, dupBackToBack=0;
for(let i=0;i<24;i++){
  const iso = d.toISOString().slice(0,10);
  const r = E.recommend({catalog:cat.exercises, history:hist, today:iso});
  const ids = r.slots.filter(s=>s.exercise).map(s=>s.exercise.id);
  if(new Set(ids).size!==ids.length) console.log('!! 같은 세션 내 종목 중복', iso, ids);
  // 같은 부위 직전 세션과 종목 겹침 확인
  const prevSame = E.sortDesc(hist).find(w=>w.focus===r.focus);
  if(prevSame){ const ov = ids.filter(x=>prevSame.exercises.some(e=>e.exercise_id===x)); if(ov.length){dupBackToBack++; console.log('   겹침', iso, cat.focus_labels[r.focus], ov.map(x=>byId[x].name).join(','));} }
  if(r.focus===prevFocus){sameFocusRun++;maxRun=Math.max(maxRun,sameFocusRun+1);}else sameFocusRun=0;
  prevFocus=r.focus;
  log.push([iso, cat.focus_labels[r.focus], ids.map(x=>byId[x].name).join(' · ')]);
  hist.push({date:iso, focus:r.focus, exercises:r.slots.filter(s=>s.exercise).map(s=>({
    exercise_id:s.exercise.id, sets:s.plan.sets.map(x=>({weight:x.weight,reps:x.reps,set_count:x.set_count,per_side:x.per_side}))}))});
  d = new Date(d.getTime() + (i%2===0?3:4)*86400000);
}
log.forEach(r=>console.log(r[0], r[1].padEnd(7), r[2]));
console.log('\n같은 부위 최대 연속:', maxRun, '| 직전 동일부위 세션과 종목 겹친 횟수:', dupBackToBack);
const fc={}; log.forEach(r=>fc[r[1]]=(fc[r[1]]||0)+1); console.log('부위 분포:', fc);

// --- 3) 증량 추이 확인 (아웃타이 / 스쿼트 / 데드리프트) ---
console.log('\n=== 증량 스텝 학습 결과 ===');
for(const id of ['hip_abduction','barbell_squat','deadlift','lateral_raise','pullup_assist','bench_press_barbell']){
  const s=E.suggestSets(id, wk, null);
  console.log(byId[id].name.padEnd(24), 'step='+(E.learnStep(id,wk)??'-'), '| 제안:',
    s.sets.map(x=>`${x.weight==null?'맨몸':x.weight+'kg'} x${x.reps} x${x.set_count}`).join(' / '));
}

// --- 4) 실제 기록과 대조: 각 종목 마지막 실측 vs 제안 ---
console.log('\n=== 마지막 실측 대비 제안 (퇴행 검사) ===');
let regress=0;
for(const ex of cat.exercises.filter(e=>e.from_history)){
  const sess = E.sessionsOf(ex.id, wk); if(!sess.length) continue;
  const hist3 = sess.slice(0,3).map(s=>E.topSet(s.sets)).filter(Boolean);
  const bestSeen = Math.max(...hist3.map(t=>t.weight??0));
  const s = E.suggestSets(ex.id, wk, null);
  const work = s.sets.filter(x=>x.kind==='work')[0]; if(!work) continue;
  const w = work.weight ?? 0;
  const flag = (w < bestSeen) ? ' <== 퇴행' : '';
  if(flag) regress++;
  console.log((ex.name+'').padEnd(26), `최근3회 최고 ${bestSeen||'맨몸'}`.padEnd(18),
    `제안 ${work.weight==null?'맨몸':work.weight+'kg'} x${work.reps} x${work.set_count}`+flag);
}
console.log('\n퇴행 제안 개수:', regress);
