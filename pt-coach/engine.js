// ============================================================
//  추천 엔진 — 순수 함수만. UI/네트워크 의존성 없음.
// ============================================================
(function (global) {
  "use strict";

  const FOCI = ["lower", "back", "push"];

  // 부위별 슬롯 템플릿. 위에서부터 순서대로 배치.
  const TEMPLATES = {
    lower: [
      { label: "힙 머신",    patterns: ["abduction", "adduction"] },
      { label: "메인 스쿼트", patterns: ["squat", "squat_machine"] },
      { label: "힌지",      patterns: ["hinge", "hinge_uni"] },
      { label: "한다리",     patterns: ["unilateral"] },
      { label: "둔근 마무리", patterns: ["glute_bridge", "glute_iso", "knee_ext", "plyo"] },
    ],
    back: [
      // 데드 계열은 하체 세션에도 등장하므로 lower 쪽 힌지 종목까지 후보에 포함
      { label: "힌지 · 데드", patterns: ["hinge"], alsoFocus: ["lower"] },
      { label: "수직 당기기", patterns: ["vert_pull"] },
      { label: "수평 당기기", patterns: ["horiz_pull"] },
      { label: "한팔 당기기", patterns: ["horiz_pull_uni"] },
      // PT쌤이 등 세션 마무리에 팩덱 플라이를 자주 넣었으므로 가슴 고립도 허용
      { label: "마무리",     patterns: ["rear_delt", "chest_iso"], alsoFocus: ["push"] },
    ],
    push: [
      { label: "메인 벤치",   patterns: ["horiz_push"] },
      { label: "인클라인",    patterns: ["incline_push"] },
      { label: "수직 밀기",   patterns: ["vert_push"] },
      { label: "보조 밀기",   patterns: ["vert_push_uni", "chest_iso"] },
      { label: "삼각근 마무리", patterns: ["side_delt", "front_delt", "triceps"] },
    ],
  };

  // 어시스트 머신 — 무게가 '줄어드는' 것이 진전
  const ASSISTED = new Set(["pullup_assist"]);

  // ---------- 유틸 ----------
  const dayMs = 86400000;
  function daysBetween(a, b) {
    return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / dayMs);
  }
  function seededRandom(seed) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h / 4294967296; };
  }
  function roundTo(v, step) {
    if (v == null) return null;
    const s = step && step > 0 ? step : 0.5;
    return Math.round(v / s) * s;
  }

  // ---------- 기록 조회 ----------
  // history: [{date:'YYYY-MM-DD', focus, exercises:[{exercise_id, sets:[{weight,reps,set_count,per_side}]}]}]
  // 날짜 내림차순으로 정렬되어 있다고 가정하지 않고 내부에서 정렬한다.
  function sortDesc(history) {
    return history.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }

  // 항상 최신 세션이 [0] 이 되도록 내부에서 정렬한다.
  function sessionsOf(exId, history) {
    const out = [];
    for (const w of sortDesc(history)) {
      const e = w.exercises.find((x) => x.exercise_id === exId);
      if (e) out.push({ date: w.date, sets: e.sets });
    }
    return out;
  }

  // 그 종목 그 세션의 '탑 세트' — 가장 무거운 무게(동일 무게면 고반복)
  function topSet(sets) {
    const weighted = sets.filter((s) => s.weight != null && s.reps);
    if (weighted.length) {
      return weighted.slice().sort((a, b) => b.weight - a.weight || b.reps - a.reps)[0];
    }
    const bw = sets.filter((s) => s.reps).sort((a, b) => b.reps - a.reps)[0];
    return bw || null;
  }

  function setsAtWeight(sets, weight) {
    return sets
      .filter((s) => (weight == null ? s.weight == null : s.weight === weight))
      .reduce((a, s) => a + (s.set_count || 1), 0);
  }

  // 그 종목에서 실제로 쓰인 무게 간격의 '최솟값' = 그 기구에서 가능한 최소 증량 단위.
  // 중앙값을 쓰면 램프업 점프(20→30 같은 것)에 끌려가 과증량을 제안하게 되므로 최솟값이 안전하다.
  function learnStep(exId, history) {
    const ws = new Set();
    for (const s of sessionsOf(exId, history)) {
      for (const st of s.sets) if (st.weight != null) ws.add(st.weight);
    }
    const arr = [...ws].sort((a, b) => a - b);
    let min = null;
    for (let i = 1; i < arr.length; i++) {
      const d = arr[i] - arr[i - 1];
      if (d > 0 && (min == null || d < min)) min = d;
    }
    return quantizeStep(min);
  }

  // 실제 헬스장에서 가능한 증량 단위로 내림 — 4kg 같은 값이 나오면 2.5kg로 보수적으로
  const STD_STEPS = [0.5, 1, 2, 2.5, 5, 10];
  function quantizeStep(v) {
    if (v == null) return null;
    let best = STD_STEPS[0];
    for (const s of STD_STEPS) if (s <= v + 1e-9) best = s;
    return best;
  }

  function defaultStep(w) {
    if (w == null) return null;
    if (w < 5) return 0.5;
    if (w < 12) return 1;
    if (w < 40) return 2.5;
    return 5;
  }

  // ---------- 종목별 세트·무게 제안 ----------
  function suggestSets(exId, history, targetReps) {
    const sess = sessionsOf(exId, history);
    const assisted = ASSISTED.has(exId);

    if (!sess.length) {
      return {
        isNew: true,
        why: "기록에 없는 종목이야. 첫 세트는 가볍게 감 잡고 올려.",
        sets: [
          { weight: null, reps: 12, set_count: 1, kind: "warmup", per_side: false },
          { weight: null, reps: 12, set_count: 3, kind: "work", per_side: false },
        ],
      };
    }

    // 최근 3회 중 가장 무거웠던 세션을 기준으로 삼는다.
    // 바로 지난번이 20회짜리 고반복/디로드였을 때 무게가 크게 퇴행하는 걸 막기 위함.
    const recent3 = sess.slice(0, 3).map((s) => ({ s, t: topSet(s.sets) })).filter((x) => x.t);
    if (!recent3.length) return { isNew: true, why: "지난 기록을 읽지 못했어.", sets: [] };

    const heaviest = recent3.reduce((a, b) =>
      (b.t.weight || 0) > (a.t.weight || 0) ? b : a);
    const latest = recent3[0];
    // 바로 지난번이 (a) 맨몸이었거나 (b) 최근 최고 무게의 85% 미만이면 디로드로 보고
    // 최근 최고 무게를 기준으로 삼는다.
    const deload = latest !== heaviest && heaviest.t.weight != null &&
                   (latest.t.weight == null || latest.t.weight < heaviest.t.weight * 0.85);

    const ref = deload ? heaviest : latest;
    const last = ref.s;
    const top = ref.t;
    const done = setsAtWeight(last.sets, top.weight);
    // 증량 폭은 (1) 기록에서 관찰된 최소 단위, (2) 현재 무게의 10% 중 작은 쪽.
    // 데이터가 2~3개뿐인 종목에서 관찰 단위가 과장되는 걸 막는다.
    const observed = learnStep(exId, history) || defaultStep(top.weight);
    const capped = top.weight ? quantizeStep(top.weight * 0.1) : null;
    const step = capped ? Math.max(Math.min(observed, capped), 0.5) : observed;
    const perSide = !!top.per_side;
    // 지난번이 20회짜리 디로드였을 수도 있으니 근력 구간(8~15회)으로 되돌린다
    const reps = targetReps || Math.min(Math.max(top.reps || 12, 8), 15);

    let target = top.weight;
    let why;

    if (top.weight == null) {
      target = null;
      const nextReps = Math.min((top.reps || 12) + 2, 25);
      return {
        why: `맨몸 종목 — 지난번 ${top.reps}회 × ${done}세트 → 횟수를 조금 늘려보자`,
        last: { date: last.date, weight: null, reps: top.reps, sets: done },
        step: null,
        sets: [{ weight: null, reps: nextReps, set_count: 3, kind: "work", per_side: false }],
      };
    }

    const when = deload
      ? `${latest.t.weight}kg 고반복 날이 있었지만 그 전 ${last.date.slice(5).replace("-", "/")}에`
      : "지난번";

    if (done >= 3) {
      target = assisted ? Math.max(top.weight - step, 30) : top.weight + step;
      why = assisted
        ? `${when} 보조 ${top.weight}kg로 ${top.reps}회 × ${done}세트 완주 → 보조를 ${step}kg 줄여서 난이도 올리기`
        : `${when} ${top.weight}kg${perSide ? "씩" : ""}로 ${top.reps}회 × ${done}세트 완주 → ${step}kg 증량`;
    } else {
      why = `${when} ${top.weight}kg${perSide ? "씩" : ""}에서 ${done}세트만 했어 → 같은 무게로 3세트 채우는 게 목표`;
    }

    const plan = [];
    if (!assisted && step) {
      const warm = roundTo(target - step * 2, 0.5);
      if (warm != null && warm > 0 && warm < target) {
        plan.push({ weight: warm, reps: Math.min(reps + 3, 15), set_count: 1, kind: "warmup", per_side: perSide });
      }
    }
    plan.push({ weight: roundTo(target, 0.5), reps, set_count: 3, kind: "work", per_side: perSide });

    return {
      why,
      step,
      last: { date: last.date, weight: top.weight, reps: top.reps, sets: done, per_side: perSide },
      sets: plan,
    };
  }

  // ---------- 부위 결정 ----------
  function focusRanking(history, today) {
    const h = sortDesc(history);
    const last = {};
    for (const w of h) if (!last[w.focus]) last[w.focus] = w.date;
    const counts = {};
    for (const w of h.slice(0, 12)) counts[w.focus] = (counts[w.focus] || 0) + 1;

    return FOCI.map((f) => ({
      focus: f,
      lastDate: last[f] || null,
      days: last[f] ? daysBetween(last[f], today) : 999,
      recent: counts[f] || 0,
    })).sort((a, b) => b.days - a.days || a.recent - b.recent);
  }

  // ---------- 종목 선택 ----------
  // 최근 N세션(같은 부위)에 나온 종목은 강하게 회피
  function recentExerciseIds(history, focus, nSessions) {
    const h = sortDesc(history).filter((w) => w.focus === focus).slice(0, nSessions);
    const map = new Map(); // exId -> 몇 세션 전
    h.forEach((w, i) => w.exercises.forEach((e) => { if (!map.has(e.exercise_id)) map.set(e.exercise_id, i); }));
    return map;
  }

  function lastDoneMap(history) {
    const m = {};
    for (const w of sortDesc(history)) {
      for (const e of w.exercises) if (!m[e.exercise_id]) m[e.exercise_id] = w.date;
    }
    return m;
  }

  function scoreCandidates(slot, ctx) {
    const { catalog, focus, recent, lastDone, today, rng, allowExtra, used, pinned } = ctx;
    const okFocus = new Set([focus].concat(slot.alsoFocus || []));
    return catalog
      .filter((x) => okFocus.has(x.focus) && slot.patterns.includes(x.pattern) && !used.has(x.id))
      .map((x) => {
        const ago = recent.has(x.id) ? recent.get(x.id) : null; // 0 = 바로 지난 세션
        const days = lastDone[x.id] ? daysBetween(lastDone[x.id], today) : 999;
        let score = Math.min(days, 120);
        if (pinned && pinned.has(x.id)) score += 1000;   // 고정 종목은 무조건 우선
        if (ago === 0) score -= 200;        // 지난 세션에 한 종목 — 거의 배제
        else if (ago === 1) score -= 60;    // 두 세션 전
        else if (ago === 2) score -= 20;
        if (x.focus !== focus) score -= 15; // 다른 부위에서 빌려온 종목은 살짝 후순위
        if (!x.from_history) score -= allowExtra ? 45 : 500; // 대체 종목은 세션당 최대 1개
        score += rng() * 12;                // 약한 무작위성
        return { ex: x, score, days, ago };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * 오늘의 추천 생성
   * @param {object} o
   *   o.catalog   exercises.json 의 exercises 배열
   *   o.history   과거 세션 배열
   *   o.today     'YYYY-MM-DD'
   *   o.focus     지정하면 그 부위로 강제
   *   o.salt      리롤용 문자열
   */
  function recommend(o) {
    const history = sortDesc(o.history || []);
    const today = o.today;
    const ranking = focusRanking(history, today);
    const focus = o.focus || ranking[0].focus;
    const rng = seededRandom(today + "|" + focus + "|" + (o.salt || ""));

    const ctx = {
      catalog: o.catalog,
      focus,
      recent: recentExerciseIds(history, focus, 3),
      lastDone: lastDoneMap(history),
      today,
      rng,
      used: new Set(),
      allowExtra: true,
      pinned: new Set(o.pinned || []),
    };

    const slots = TEMPLATES[focus].map((slot) => {
      const cands = scoreCandidates(slot, ctx);
      const pick = cands[0];
      if (!pick) return { label: slot.label, patterns: slot.patterns, alsoFocus: slot.alsoFocus, exercise: null, alternatives: [] };
      ctx.used.add(pick.ex.id);
      if (!pick.ex.from_history) ctx.allowExtra = false; // 대체 종목은 하루 1개까지
      return {
        label: slot.label,
        patterns: slot.patterns,
        alsoFocus: slot.alsoFocus,
        exercise: pick.ex,
        daysSince: pick.days,
        plan: suggestSets(pick.ex.id, history, null),
        alternatives: cands.slice(1, 6).map((c) => c.ex),
      };
    });

    return { date: today, focus, ranking, slots };
  }

  /** 특정 슬롯의 종목을 교체 */
  function swapSlot(rec, slotIndex, o, exerciseId) {
    const history = sortDesc(o.history || []);
    const slot = rec.slots[slotIndex];
    let next;
    if (exerciseId) {
      next = o.catalog.find((x) => x.id === exerciseId);
    } else {
      const used = new Set(rec.slots.map((s) => s.exercise && s.exercise.id).filter(Boolean));
      used.delete(slot.exercise && slot.exercise.id);
      const cands = scoreCandidates(slot, {
        catalog: o.catalog, focus: rec.focus,
        recent: recentExerciseIds(history, rec.focus, 3),
        lastDone: lastDoneMap(history), today: rec.date,
        rng: seededRandom(rec.date + slotIndex + Math.random()),
        used, allowExtra: true,
      }).filter((c) => c.ex.id !== (slot.exercise && slot.exercise.id));
      next = cands.length ? cands[0].ex : null;
    }
    if (!next) return rec;
    slot.exercise = next;
    slot.plan = suggestSets(next.id, history, null);
    slot.daysSince = lastDoneMap(history)[next.id] ? daysBetween(lastDoneMap(history)[next.id], rec.date) : 999;
    return rec;
  }

  global.PTEngine = {
    FOCI, TEMPLATES, ASSISTED,
    recommend, swapSlot, suggestSets, focusRanking,
    sessionsOf, topSet, setsAtWeight, learnStep, defaultStep,
    daysBetween, sortDesc, roundTo, seededRandom,
  };
})(typeof window !== "undefined" ? window : globalThis);
