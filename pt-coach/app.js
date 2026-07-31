/* ============================================================
   PT Coach — 영수증 UI + Supabase
   ============================================================ */
(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const el = (t, c, txt) => { const n = document.createElement(t); if (c) n.className = c; if (txt != null) n.textContent = txt; return n; };
  const cfg = window.PT_CONFIG || {};
  const E = window.PTEngine;

  const HI = "#2f6d4f", WARN = "#a8442b", PAPER = "#f3f0e7";

  const S = {
    sb: null, user: null, demo: false,
    catalog: null, focusLabels: {}, patternLabels: {},
    history: [], rec: null, edits: null,
    date: null, mode: "new", forceNew: false, loaded: null,
    noCardioTable: false,   // migration_cardio.sql 미실행 감지
    calMonth: null,         // 'YYYY-MM' 보고 있는 달
    calSel: null,           // 선택한 날짜
    monPick: false,         // 월 선택 열림
    drag: null,             // 날짜 옮기기 드래그 중
    custom: [],             // custom_exercises 테이블
    noCustomTable: false,   // migration_custom_exercises.sql 미실행 감지
    salt: "", manualFocus: null,
    pinned: JSON.parse(localStorage.getItem("pt_pinned") || "[]"),
    trendSel: new Set(),
    cardioCat: null,        // data/cardio.json
    cardio: [],             // [{machine, rep_count, segments:[{label,speed,incline,minutes,distance,floors}]}]
    tab: "today",
  };

  const iso = (d) => { const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  const TODAY = iso(new Date());
  S.date = TODAY;

  // 기본 카탈로그 + 내가 만든 종목. 숨긴 것은 목록에서 빼되 조회는 되게 남긴다.
  const allEx = () => S.catalog.concat(S.custom);
  const pickable = () => S.catalog.concat(S.custom.filter((x) => !x.hidden));
  const byId = (id) => allEx().find((x) => x.id === id);
  const num = (v) => (v == null ? "" : String(+(+v).toFixed(2)));
  // 'cardio' 는 부위가 아니라 "근력 없이 유산소만 한 날" 표시값이다.
  const kFocus = (f) => (f === "cardio" ? "유산소" : (S.focusLabels[f] || f));
  const wd = (isoStr) => "일월화수목금토"[new Date(isoStr + "T00:00:00").getDay()];
  const kDate = (isoStr) => { const d = new Date(isoStr + "T00:00:00");
    return `${d.getMonth() + 1}/${d.getDate()} (${wd(isoStr)})`; };

  const BW = { band: "밴드", bodyweight: "맨몸", aquabag: "아쿠아백", medball: "메드볼" };
  const EQUIP = {
    machine: "머신", barbell: "바벨", dumbbell: "덤벨", smith: "스미스머신",
    cable: "케이블", band: "밴드", bodyweight: "맨몸", kettlebell: "케틀벨",
    medball: "메드신볼", aquabag: "아쿠아백",
  };
  const isBW = (ex) => ["bodyweight", "band", "aquabag", "medball"].includes(ex.equipment);
  const pad = (n, w) => String(n).padStart(w, "0");

  // 대시보드에서 URL을 복사하면 /rest/v1 같은 경로가 붙어오기 쉽다.
  // supabase-js는 경로를 스스로 붙이므로 루트만 남겨야 한다.
  function normalizeUrl(raw) {
    let u = String(raw || "").trim();
    if (!u) return "";
    u = u.replace(/^http:\/\//, "https://");
    if (!/^https?:\/\//.test(u)) u = "https://" + u;
    try { const p = new URL(u); return p.protocol + "//" + p.host; }
    catch (_) { return u.replace(/\/+$/, ""); }
  }

  // ---------------------------------------------------------
  //  유산소 헬퍼
  // ---------------------------------------------------------
  const machineById = (id) => (S.cardioCat.machines || []).find((m) => m.id === id);
  const fieldMeta = (f) => (S.cardioCat.field_labels || {})[f] || { ko: f, unit: "", step: 1 };

  // 기구가 쓰는 칸 이름 → DB 컬럼. speed/level/resist 는 모두 speed 컬럼에 들어간다.
  const FIELD_COL = { speed: "speed", level: "speed", resist: "speed",
                      incline: "incline", minutes: "minutes",
                      distance: "distance_km", floors: "floors" };

  // 항목 총 시간 = 반복 세트 × 구간 시간 합
  const itemMinutes = (it) =>
    (it.rep_count || 1) * (it.segments || []).reduce((a, sg) => a + (+sg.minutes || 0), 0);
  const itemDistance = (it) =>
    (it.rep_count || 1) * (it.segments || []).reduce((a, sg) => a + (+sg.distance || 0), 0);
  const cardioMinutes = () => S.cardio.reduce((a, it) => a + itemMinutes(it), 0);

  function paceText(it) {
    const mi = itemMinutes(it), km = itemDistance(it);
    if (!mi || !km) return "";
    const p = mi / km;
    return `${Math.floor(p)}'${pad(Math.round((p % 1) * 60), 2)}" /km`;
  }

  // 완료 체크된 근력 세트가 하나라도 있나
  const anyStrengthDone = () =>
    (S.edits || []).some((ex) => ex.sets.some((sg) => sg.done && sg.reps > 0));

  // 실제로 저장될 부위. 근력을 하나도 안 했고 유산소만 있으면 'cardio'.
  // (부위로 저장하면 추천 엔진이 그 부위를 했다고 착각한다)
  const effFocus = () =>
    (!anyStrengthDone() && cardioMinutes()) ? "cardio" : S.rec.focus;

  function blankItem(machineId) {
    const m = machineById(machineId);
    const d = (m && m.default) || { rep_count: 1, segments: [{ minutes: 20 }] };
    return { machine: machineId, rep_count: d.rep_count || 1,
             segments: d.segments.map((x) => ({ ...x })) };
  }

  // ---------------------------------------------------------
  //  확대 차단
  //  iOS Safari 는 viewport 의 user-scalable=no 를 무시한다.
  //  제스처 이벤트와 멀티터치를 직접 막아야 실제로 확대가 안 된다.
  // ---------------------------------------------------------
  (function noZoom() {
    // Safari 전용 핀치 제스처
    ["gesturestart", "gesturechange", "gestureend"].forEach((t) => {
      document.addEventListener(t, (ev) => ev.preventDefault(), { passive: false });
    });
    // 손가락 2개 이상이면 확대 시도로 보고 막는다
    document.addEventListener("touchmove", (ev) => {
      if (ev.touches && ev.touches.length > 1) ev.preventDefault();
    }, { passive: false });
    // 더블탭 확대는 CSS touch-action 이 막는다.
    // 여기서 touchend 를 preventDefault 하면 빠르게 연속 탭할 때
    // 두 번째 탭의 click 이 씹혀서 세트 체크가 안 된다.
    // 데스크톱 Ctrl/⌘ + 휠 확대
    document.addEventListener("wheel", (ev) => {
      if (ev.ctrlKey || ev.metaKey) ev.preventDefault();
    }, { passive: false });
  })();

  // ---------------------------------------------------------
  //  글자 크기
  // ---------------------------------------------------------
  (function zoom() {
    const saved = localStorage.getItem("pt_fs") || "15.5px";
    document.documentElement.style.setProperty("--fs", saved);
    const box = $("#zoom");
    box.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.z === saved));
    box.addEventListener("click", (ev) => {
      const t = ev.target.closest("button"); if (!t) return;
      document.documentElement.style.setProperty("--fs", t.dataset.z);
      localStorage.setItem("pt_fs", t.dataset.z);
      box.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b === t));
    });
  })();

  // ---------------------------------------------------------
  //  부트
  // ---------------------------------------------------------
  async function boot() {
    const di = $("#dateInput");
    di.value = S.date; di.max = TODAY;
    di.addEventListener("change", () => {
      if (!di.value) { di.value = S.date; return; }
      S.date = di.value; S.forceNew = false; S.manualFocus = null; S.salt = "";
      buildRec(); renderAll();
    });

    try {
      const res = await fetch("data/exercises.json", { cache: "no-cache" });
      const j = await res.json();
      S.catalog = j.exercises; S.focusLabels = j.focus_labels; S.patternLabels = j.pattern_labels;
      const cres = await fetch("data/cardio.json", { cache: "no-cache" });
      S.cardioCat = await cres.json();
    } catch (e) {
      $("#boot").innerHTML = `<div class="msg err">카탈로그(data/exercises.json · data/cardio.json)를 불러오지 못했어요.<br>${e.message}</div>`;
      return;
    }

    const pubKey = cfg.SUPABASE_PUBLISHABLE_KEY || cfg.SUPABASE_ANON_KEY || "";

    if (/^sb_secret_/.test(pubKey) || /service_role/.test(pubKey)) {
      $("#boot").innerHTML = '<div class="msg err"><b>위험: 비밀 키가 들어 있어요.</b><br>' +
        'config.js에 sb_secret_ 또는 service_role 키가 있습니다. 이 키는 RLS를 무시하므로 ' +
        '공개 저장소에 올리면 안 됩니다.<br><br>대시보드에서 즉시 폐기(Revoke)하고 ' +
        'sb_publishable_ 키로 바꿔주세요.</div>';
      return;
    }
    if (!cfg.SUPABASE_URL || /여기에/.test(cfg.SUPABASE_URL) || /여기에/.test(pubKey) || !pubKey) {
      return startDemo();
    }

    const url = normalizeUrl(cfg.SUPABASE_URL);
    if (url !== String(cfg.SUPABASE_URL).trim()) {
      console.warn("[PT] SUPABASE_URL을 루트로 보정했습니다:", cfg.SUPABASE_URL, "→", url);
    }
    if (!window.supabase || !window.supabase.createClient) {
      $("#boot").innerHTML = '<div class="msg err"><b>Supabase 라이브러리를 못 불러왔어요.</b><br>' +
        '네트워크가 cdn.jsdelivr.net 을 막고 있거나 연결이 끊겼습니다. ' +
        '와이파이를 확인하고 새로고침해 주세요.</div>';
      return;
    }

    S.sb = window.supabase.createClient(url, pubKey);
    S.sb.auth.onAuthStateChange((_e, session) => {
      const u = session && session.user;
      if (u && (!S.user || S.user.id !== u.id)) { S.user = u; afterLogin(); }
      else if (!u && S.user) { S.user = null; showAuth(); }
    });
    const { data } = await S.sb.auth.getSession();
    if (data.session) { S.user = data.session.user; afterLogin(); } else showAuth();
  }

  async function startDemo() {
    S.demo = true;
    try {
      const res = await fetch("data/workouts.json", { cache: "no-cache" });
      S.history = (await res.json()).map((w) => ({
        id: null, date: w.date, focus: w.focus, source: "pt",
        exercises: w.exercises.map((e) => ({
          exercise_id: e.exercise_id,
          sets: e.sets.map((s) => ({ weight: s.weight, reps: s.reps, set_count: s.count, per_side: s.per_side })),
        })),
        cardio: [],
      }));
    } catch (e) {
      $("#boot").innerHTML = `<div class="msg err">data/workouts.json을 못 읽었어요.<br>${e.message}</div>`;
      return;
    }
    $("#mWho").textContent = "미리보기";
    $("#boot").classList.add("hidden");
    $("#app").classList.remove("hidden");
    const b = el("div", "msg err");
    b.innerHTML = "<b>미리보기 모드</b> — PT 기록 34세션으로 추천만 계산합니다. " +
      "저장하려면 config.js에 Supabase 정보를 넣어주세요 (SETUP.md 참고).";
    $("#demoBanner").append(b);
    $("#save").disabled = true;
    buildRec(); renderAll();
  }

  function showAuth() {
    $("#boot").classList.add("hidden"); $("#app").classList.add("hidden");
    $("#auth").classList.remove("hidden");
    $("#mWho").textContent = "미확인"; $("#uRight").textContent = "";
  }

  async function afterLogin() {
    $("#auth").classList.add("hidden");
    $("#boot").classList.remove("hidden");
    $("#boot").innerHTML = '<span class="spin"></span> 기록 불러오는 중…';
    $("#mWho").textContent = S.user.email.split("@")[0];

    const out = el("button", "link", "로그아웃");
    out.onclick = async () => { await S.sb.auth.signOut(); location.reload(); };
    $("#uRight").innerHTML = ""; $("#uRight").append(out);

    try { await loadHistory(); await loadCustom(); }
    catch (e) {
      const miss = /cardio_sets/i.test(e.message || "")
        ? "<br><br><b>supabase/migration_cardio.sql</b> 을 SQL Editor에서 실행해 주세요."
        : "<br><br>schema.sql · migration_cardio.sql 을 실행했는지 확인하고, " +
          "그래도 안 되면 diagnose.html을 열어보세요.";
      $("#boot").innerHTML = `<div class="msg err">기록을 불러오지 못했어요.<br>${e.message}${miss}</div>`;
      return;
    }
    $("#boot").classList.add("hidden");
    $("#app").classList.remove("hidden");
    buildRec(); renderAll();
  }

  // ---------------------------------------------------------
  //  데이터
  // ---------------------------------------------------------
  const SEL_BASE = "id,date,focus,source,note," +
    "workout_sets(exercise_id,seq,set_index,weight,reps,set_count,per_side)";
  const SEL_CARDIO = ",cardio_sets(machine,seq,segment_index,label,rep_count,minutes,speed,incline,distance_km,floors)";

  async function loadHistory() {
    // cardio_sets 테이블이 없으면 PostgREST가 관계를 못 찾아 400을 낸다.
    // 그때 근력 기록까지 못 불러오면 앱이 통째로 죽으므로, 유산소만 빼고 다시 시도한다.
    // 이미 없다고 확인된 뒤에는 처음부터 유산소를 빼고 조회한다
    // (안 그러면 저장 직후 재조회가 매번 400으로 실패한다)
    const sel = SEL_BASE + (S.noCardioTable ? "" : SEL_CARDIO);
    let res = await S.sb.from("workouts").select(sel).order("date", { ascending: false });

    if (res.error && !S.noCardioTable) {
      const m = (res.error.message || "") + (res.error.details || "") + (res.error.hint || "");
      if (/cardio_sets|relationship|schema cache/i.test(m)) {
        S.noCardioTable = true;
        console.warn("[PT] cardio_sets 테이블이 없어 유산소 없이 불러옵니다.", res.error);
        res = await S.sb.from("workouts").select(SEL_BASE).order("date", { ascending: false });
      }
    }
    const { data, error } = res;
    if (error) throw error;
    S.history = (data || []).map((w) => {
      const groups = new Map();
      for (const r of (w.workout_sets || []).slice().sort((a, b) => a.seq - b.seq || a.set_index - b.set_index)) {
        if (!groups.has(r.exercise_id)) groups.set(r.exercise_id, { exercise_id: r.exercise_id, sets: [] });
        groups.get(r.exercise_id).sets.push({
          weight: r.weight == null ? null : +r.weight,
          reps: r.reps, set_count: r.set_count || 1, per_side: !!r.per_side,
        });
      }
      // 유산소: seq 별로 항목을 묶고 segment_index 순으로 구간을 붙인다
      const citems = new Map();
      for (const r of (w.cardio_sets || []).slice().sort((a, b) => a.seq - b.seq || a.segment_index - b.segment_index)) {
        if (!citems.has(r.seq)) citems.set(r.seq, { machine: r.machine, rep_count: r.rep_count || 1, segments: [] });
        citems.get(r.seq).segments.push({
          label: r.label || null,
          minutes: r.minutes == null ? null : +r.minutes,
          speed: r.speed == null ? null : +r.speed,
          incline: r.incline == null ? null : +r.incline,
          distance: r.distance_km == null ? null : +r.distance_km,
          floors: r.floors == null ? null : +r.floors,
        });
      }
      return { id: w.id, date: w.date, focus: w.focus, source: w.source, note: w.note,
               exercises: [...groups.values()], cardio: [...citems.values()] };
    });
  }

  async function loadCustom() {
    const { data, error } = await S.sb.from("custom_exercises")
      .select("id,name,focus,pattern,equipment,hidden").order("created_at");
    if (error) {
      const m = (error.message || "") + (error.details || "");
      if (/custom_exercises|schema cache|does not exist/i.test(m)) {
        S.noCustomTable = true; S.custom = [];
        console.warn("[PT] custom_exercises 테이블이 없어 내가 만든 종목 기능을 끕니다.", error);
        return;
      }
      throw error;
    }
    S.custom = (data || []).map((x) => ({
      id: x.id, name: x.name, focus: x.focus,
      pattern: x.pattern || "custom", equipment: x.equipment || "custom",
      hidden: !!x.hidden, from_history: false, mine: true,
    }));
  }

  // 추천은 '그 날짜 이전' 기록만 본다. 과거 날짜를 고르면 그 시점의 추천이 나온다.
  const historyBefore = (d) => S.history.filter((w) => w.date < d);
  // 그 날짜에 저장된 기록. 개인운동이 우선이고, 없으면 PT 수업 기록.
  // (PT 기록도 파싱 오류를 고칠 수 있어야 하므로 수정 대상에 포함한다)
  const existingOn = (d) => S.history.find((w) => w.date === d && w.source === "self") ||
                            S.history.find((w) => w.date === d && w.source === "pt");
  const SRC_LABEL = { self: "개인운동", pt: "PT 수업" };

  async function saveToday() {
    const btn = $("#save");
    const rows = S.edits.map((ex, i) => ({ ex, i }))
      .filter(({ ex }) => ex.sets.some((s) => s.done && s.reps > 0));
    const cMin = cardioMinutes();
    if (!rows.length && !cMin) {
      toast("완료 체크된 세트도, 유산소 기록도 없어요.", true); return;
    }

    btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
    try {
      const prev = existingOn(S.date);
      // 불러온 기록을 고친 경우엔 그 기록의 종류(PT/개인)를 유지한다
      const src = (S.mode === "edit" && prev) ? prev.source : "self";
      const target = S.history.find((w) => w.date === S.date && w.source === src);
      if (target) await S.sb.from("workouts").delete().eq("id", target.id);

      const { data: w, error: e1 } = await S.sb.from("workouts")
        .insert({ user_id: S.user.id, date: S.date, focus: effFocus(), source: src })
        .select("id").single();
      if (e1) throw e1;

      const payload = [];
      rows.forEach(({ ex, i }) => {
        ex.sets.filter((s) => s.done && s.reps > 0).forEach((s, j) => {
          payload.push({ workout_id: w.id, exercise_id: ex.exercise_id, seq: i, set_index: j,
                         weight: s.weight, reps: s.reps, set_count: 1, per_side: !!s.per_side, done: true });
        });
      });
      if (payload.length) {
        const { error: e2 } = await S.sb.from("workout_sets").insert(payload);
        if (e2) throw e2;
      }

      const cpayload = [];
      S.cardio.forEach((it, i) => {
        const m = machineById(it.machine);
        (it.segments || []).forEach((sg, j) => {
          const row = { workout_id: w.id, machine: it.machine, seq: i, segment_index: j,
                        label: sg.label || null, rep_count: it.rep_count || 1,
                        minutes: null, speed: null, incline: null, distance_km: null, floors: null };
          (m ? m.fields : []).forEach((f) => {
            const v = sg[f === "distance" ? "distance" : f];
            if (v != null && v !== "") row[FIELD_COL[f]] = +v;
          });
          cpayload.push(row);
        });
      });
      if (cpayload.length && !S.noCardioTable) {
        const { error: e3 } = await S.sb.from("cardio_sets").insert(cpayload);
        if (e3) throw e3;
      }

      await loadHistory();
      toast(`${kDate(S.date)} ${kFocus(effFocus())} ${SRC_LABEL[src]} 저장 — ` +
            `${rows.length}종목 ${payload.length}세트` + (cMin ? ` · 유산소 ${cMin}분` : ""));
      S.forceNew = false;
      buildRec(); renderAll();
    } catch (e) {
      toast("저장 실패: " + (e.message || e), true);
    } finally {
      btn.disabled = false; btn.textContent = "저 장";
    }
  }

  function toast(msg, isErr) {
    const n = el("div", "toast " + (isErr ? "err" : "ok"), msg);
    document.body.append(n);
    setTimeout(() => n.remove(), 3400);
  }

  // ---------------------------------------------------------
  //  추천 / 기존 기록 불러오기
  // ---------------------------------------------------------
  function buildRec() {
    const hist = historyBefore(S.date);
    const prev = existingOn(S.date);
    S.loaded = (prev && !S.forceNew) ? prev : null;

    if (prev && !S.forceNew) {
      // 수정 모드 — 저장된 내용을 그대로 띄운다
      S.mode = "edit";
      S.edits = prev.exercises.map((e) => ({
        exercise_id: e.exercise_id,
        sets: expand(e.sets).map((s) => ({ ...s, kind: "work", done: true })),
      }));
      S.cardio = (prev.cardio || []).map((it) => ({ ...it, segments: it.segments.map((x) => ({ ...x })) }));
      const rk = E.focusRanking(hist, S.date);
      S.rec = {
        date: S.date,
        // 'cardio' 는 부위가 아니므로 스탬프용 기본값만 채워둔다 (effFocus 가 실제 값을 결정)
        focus: prev.focus === "cardio" ? rk[0].focus : prev.focus,
        ranking: rk,
        slots: S.edits.map((ed) => {
          const ex = byId(ed.exercise_id);
          return { label: "기록", exercise: ex || { id: ed.exercise_id, name: ed.exercise_id,
                     focus: prev.focus, pattern: "-", equipment: "-" },
                   plan: { sets: [], why: null }, daysSince: 999 };
        }),
      };
      return;
    }

    S.mode = "new";
    S.cardio = [];
    S.rec = E.recommend({
      catalog: S.catalog, history: hist, today: S.date,
      focus: S.manualFocus, salt: S.salt, pinned: S.pinned,
    });
    // 후보가 없어 비어 있는 슬롯은 버린다 — 이후 인덱스가 edits와 1:1로 맞아야 한다
    S.rec.slots = S.rec.slots.filter((s) => s.exercise);
    S.edits = S.rec.slots.map(toEdit);
  }

  function expand(sets) {
    const out = [];
    (sets || []).forEach((s) => {
      for (let k = 0; k < (s.set_count || 1); k++) {
        out.push({ weight: s.weight, reps: s.reps, per_side: !!s.per_side });
      }
    });
    return out;
  }

  function toEdit(slot) {
    return { exercise_id: slot.exercise.id,
             sets: expand(slot.plan.sets).map((s, i) => ({
               ...s, kind: (slot.plan.sets[0] || {}).kind === "warmup" && i === 0 ? "warmup" : "work",
               done: false })) };
  }

  function rebuildSlot(i) {
    E.swapSlot(S.rec, i, { catalog: S.catalog, history: historyBefore(S.date) });
    S.edits[i] = toEdit(S.rec.slots[i]);
    renderToday();
  }

  function removeSlot(i) {
    S.rec.slots.splice(i, 1);
    S.edits.splice(i, 1);
    renderToday();
  }

  // ---------------------------------------------------------
  //  오늘
  // ---------------------------------------------------------
  function renderModeBanner() {
    const box = $("#modeBanner"); box.innerHTML = "";
    if (S.mode !== "edit") return;
    const src = S.loaded ? SRC_LABEL[S.loaded.source] : "";
    const b = el("div", "msg ok");
    b.style.display = "flex"; b.style.alignItems = "center"; b.style.gap = "8px";
    const t = el("span");
    t.style.flex = "1";
    t.append(document.createTextNode(`${kDate(S.date)} ${src} 기록을 불러왔어요. 고쳐서 저장하면 덮어씁니다.`));
    const nb = el("button", null, "추천 새로 받기");
    nb.style.cssText = "text-decoration:underline;flex:none;color:inherit;white-space:nowrap";
    nb.title = "화면을 그 날짜 기준 추천으로 채웁니다. 저장하기 전까지 실제 기록은 그대로예요.";
    nb.onclick = () => { S.forceNew = true; S.salt = String(Date.now()); buildRec(); renderToday(); };
    b.append(t, nb);
    box.append(b);
  }

  function renderStamps() {
    const box = $("#focuspick"); box.innerHTML = "";
    for (const r of S.rec.ranking) {
      const b = el("button");
      b.setAttribute("aria-pressed", effFocus() !== "cardio" && r.focus === S.rec.focus);
      b.append(el("b", null, kFocus(r.focus)),
               el("i", null, r.lastDate ? `${r.days}일 전` : "기록 없음"));
      b.onclick = () => {
        if (S.mode === "edit") { S.rec.focus = r.focus; renderToday(); return; }
        S.manualFocus = r.focus; S.salt = ""; buildRec(); renderToday();
      };
      box.append(b);
    }
  }

  function renderWhy() {
    if (effFocus() === "cardio") {
      $("#why").textContent = "근력 세트가 체크되지 않았어요. 이대로 저장하면 유산소 세션으로 " +
        "기록되고, 부위 로테이션에는 영향을 주지 않습니다.";
      return;
    }
    if (S.mode === "edit") {
      $("#why").textContent = S.loaded && S.loaded.source === "pt"
        ? "PT 수업에서 한 운동이에요. 무게·횟수를 고치면 이후 추천에도 반영됩니다."
        : "무게·횟수를 고치거나 종목을 더하거나 뺄 수 있어요.";
      return;
    }
    const top = S.rec.ranking[0];
    const auto = !S.manualFocus || S.manualFocus === top.focus;
    let t = auto
      ? `${kFocus(S.rec.focus)}가 ${top.lastDate ? `${top.days}일째 안 나왔어요` : "기록에 없어요"} — 이 부위 차례.`
      : `${kFocus(S.rec.focus)}를 직접 골랐어요. 최근 이 부위에 없던 종목으로 짰습니다.`;
    if (S.date !== TODAY) t = `${kDate(S.date)} 기준 추천이에요. ` + t;
    $("#why").textContent = t;
  }

  // 날짜를 바꾸면 탭 이름도 그 날짜로 바뀐다
  function syncDateLabel() {
    const b = document.querySelector('nav.tabs button[data-tab=today]');
    if (b) b.textContent = S.date === TODAY ? "오늘" : kDate(S.date).replace(/ /g, "");
    const di = $("#dateInput");
    if (di && di.value !== S.date) di.value = S.date;
  }

  function renderToday() {
    syncDateLabel();
    renderModeBanner(); renderStamps(); renderWhy();
    const box = $("#slots"); box.innerHTML = "";

    S.rec.slots.forEach((slot, i) => {
      const ex = slot.exercise, edit = S.edits[i], plan = slot.plan;
      if (i) box.append(el("hr", "rule"));

      const item = el("div", "item");
      const hd = el("div", "hd");
      hd.append(el("span", "no", pad(i + 1, 2)), el("span", "nm", ex.name));
      if (S.pinned.includes(ex.id)) hd.append(el("span", "pin", "📌"));
      item.append(hd);

      const tag = el("div", "tag");
      tag.append(document.createTextNode(
        (S.patternLabels[ex.pattern] || ex.pattern) + " · " + (EQUIP[ex.equipment] || ex.equipment)));
      if (plan.isNew) tag.append(el("span", "bd new", "새 종목"));
      else if (slot.daysSince < 900) tag.append(el("span", "bd", slot.daysSince + "일 전"));
      if (ex.focus !== S.rec.focus) tag.append(el("span", "bd", kFocus(ex.focus)));
      item.append(tag);

      let workNo = 0;
      edit.sets.forEach((s, j) => {
        if (s.kind !== "warmup") workNo++;
        item.append(setLine(ex, edit, s, j, workNo));
      });

      if (plan.why) item.append(el("div", "note", plan.why));

      const foot = el("div", "exfoot");
      // 직접 추가한 슬롯은 패턴이 없어 교체 후보를 뽑을 수 없다
      if (S.mode === "new" && Array.isArray(slot.patterns) && slot.patterns.length) {
        const bSwap = el("button", null, "🔄 다른 종목");
        bSwap.onclick = () => rebuildSlot(i);
        foot.append(bSwap);
      }
      const bPin = el("button", null, S.pinned.includes(ex.id) ? "📌 해제" : "📌 고정");
      bPin.onclick = () => {
        S.pinned = S.pinned.includes(ex.id) ? S.pinned.filter((x) => x !== ex.id) : S.pinned.concat(ex.id);
        localStorage.setItem("pt_pinned", JSON.stringify(S.pinned));
        if (S.mode === "new") buildRec();
        renderToday();
      };
      const bAdd = el("button", null, "＋ 세트");
      bAdd.onclick = () => {
        const last = edit.sets[edit.sets.length - 1] || { weight: null, reps: 12, per_side: false };
        edit.sets.push({ ...last, kind: "work", done: false }); renderToday();
      };
      const bRm = el("button", "rm", "✕");
      bRm.setAttribute("aria-label", ex.name + " 제거");
      bRm.title = "이 종목 제거";
      bRm.onclick = () => removeSlot(i);
      foot.append(bPin, bAdd, bRm);
      item.append(foot);
      box.append(item);
    });

    if (!S.rec.slots.length) {
      box.append(el("div", "empty", "종목이 없어요. ＋ 종목으로 추가하거나 🎲를 눌러보세요."));
    }
    renderCardio();
    renderTotals();
  }

  // ---------------------------------------------------------
  //  유산소
  // ---------------------------------------------------------
  function renderCardio() {
    const box = $("#cardio"); if (!box) return;
    box.innerHTML = "";

    if (S.noCardioTable) {
      const b = el("div", "msg err");
      b.innerHTML = "<b>유산소 기능이 아직 준비되지 않았어요.</b><br>" +
        "Supabase SQL Editor에서 <code>supabase/migration_cardio.sql</code> 을 한 번 실행하고 " +
        "새로고침하면 켜집니다. 그때까지 근력 기록은 정상 동작합니다.";
      box.append(b);
      return;
    }

    if (!S.cardio.length) {
      const add = el("button", "cadd", "＋ 유산소");
      add.onclick = () => { S.cardio.push(blankItem("treadmill")); renderCardio(); renderTotals(); };
      box.append(add);

      // 지난 유산소 기록이 있으면 그대로 불러올 수 있게
      const last = lastCardio();
      if (last) {
        const again = el("button", "cadd", `↻ ${kDate(last.date)} 유산소 그대로 (${last.min}분)`);
        again.style.marginTop = "5px";
        again.onclick = () => {
          S.cardio = last.items.map((it) => ({ ...it, segments: it.segments.map((x) => ({ ...x })) }));
          renderCardio(); renderTotals();
        };
        box.append(again);
      }
      return;
    }

    const head = el("div", "chead");
    const ttl = el("span", null, "유 산 소");
    ttl.style.cssText = "letter-spacing:.18em;flex:1";
    head.append(ttl, el("span", "faint tiny", cardioMinutes() + "분"));
    box.append(head);

    S.cardio.forEach((it, i) => {
      const m = machineById(it.machine) || { fields: ["minutes"], name: it.machine };
      const wrap = el("div");
      wrap.style.marginTop = i ? "9px" : "5px";

      // 기구 선택
      const hd = el("div", "chead");
      hd.append(el("span", "no", pad(i + 1, 2)));
      const sel = el("select", "csel");
      (S.cardioCat.machines || []).forEach((mm) => {
        const o = el("option", null, mm.name); o.value = mm.id;
        if (mm.id === it.machine) o.selected = true;
        sel.append(o);
      });
      sel.setAttribute("aria-label", "기구");
      sel.onchange = () => {
        const keepMin = itemMinutes(it);
        Object.assign(it, blankItem(sel.value));
        if (keepMin && it.segments.length === 1) it.segments[0].minutes = keepMin;
        renderCardio(); renderTotals();
      };
      hd.append(sel);
      wrap.append(hd);

      // 세트 수 (구간이 2개 이상이면 인터벌)
      const rep = el("div", "crep");
      rep.append(el("span", null, it.segments.length > 1 ? "인터벌 세트" : "반복"));
      const ri = el("input", "num");
      ri.type = "number"; ri.min = "1"; ri.step = "1"; ri.inputMode = "numeric";
      ri.value = it.rep_count || 1; ri.style.width = "2.8em";
      ri.setAttribute("aria-label", "세트 수");
      ri.oninput = () => { it.rep_count = Math.max(1, +ri.value || 1); refreshCardioSums(); };
      rep.append(ri, el("span", "u", "세트"));
      wrap.append(rep);

      // 구간들
      it.segments.forEach((sg, j) => {
        const row = el("div", "cseg");
        const lb = el("span", "lb");
        const li = el("input");
        li.type = "text"; li.value = sg.label || ""; li.placeholder = j === 0 ? "구간" : "구간";
        li.setAttribute("aria-label", "구간 이름");
        li.oninput = () => { sg.label = li.value.trim() || null; };
        lb.append(li); row.append(lb);

        m.fields.forEach((f) => {
          const meta = fieldMeta(f);
          const fld = el("span", "fld");
          fld.append(el("label", null, meta.ko));
          const inp = el("input", "num");
          inp.type = "number"; inp.min = "0"; inp.step = String(meta.step);
          inp.inputMode = "decimal"; inp.style.width = f === "minutes" ? "2.8em" : "3.2em";
          const key = f === "distance" ? "distance" : f;
          inp.value = sg[key] == null ? "" : num(sg[key]);
          inp.setAttribute("aria-label", meta.ko);
          inp.oninput = () => { sg[key] = inp.value === "" ? null : +inp.value; refreshCardioSums(); };
          fld.append(inp);
          if (meta.unit) fld.append(el("span", "u", meta.unit));
          row.append(fld);
        });

        if (it.segments.length > 1) {
          const del = el("button", "del", "✕");
          del.setAttribute("aria-label", "구간 삭제");
          del.onclick = () => { it.segments.splice(j, 1); renderCardio(); renderTotals(); };
          row.append(del);
        }
        wrap.append(row);
      });

      // 항목 합계
      const sum = el("div", "csum");
      sum.dataset.sum = String(i);
      wrap.append(sum);

      // 버튼
      const foot = el("div", "cfoot");
      const bSeg = el("button", null, "＋ 구간");
      bSeg.onclick = () => {
        const last = it.segments[it.segments.length - 1] || {};
        it.segments.push({ ...last, label: null }); renderCardio(); renderTotals();
      };
      foot.append(bSeg);
      const bRm = el("button", "rm", "✕");
      bRm.setAttribute("aria-label", "유산소 항목 제거");
      bRm.onclick = () => { S.cardio.splice(i, 1); renderCardio(); renderTotals(); };
      foot.append(bRm);
      wrap.append(foot);
      box.append(wrap);
    });

    const add = el("button", "cadd", "＋ 유산소 항목");
    add.style.marginTop = "8px";
    add.onclick = () => {
      S.cardio.push(blankItem(S.cardio[S.cardio.length - 1].machine));
      renderCardio(); renderTotals();
    };
    box.append(add);
    refreshCardioSums();
  }

  // 숫자만 바뀔 때는 전체를 다시 그리지 않는다 (입력 포커스 유지)
  function refreshCardioSums() {
    S.cardio.forEach((it, i) => {
      const n2 = document.querySelector(`#cardio [data-sum="${i}"]`);
      if (!n2) return;
      const m = machineById(it.machine) || {};
      const bits = [itemMinutes(it) + "분"];
      const km = itemDistance(it); if (km) bits.push(num(km) + "km");
      const fl = (it.rep_count || 1) * (it.segments || []).reduce((a, sg) => a + (+sg.floors || 0), 0);
      if (fl) bits.push(fl + "층");
      const pc = m.pace ? paceText(it) : ""; if (pc) bits.push(pc);
      n2.innerHTML = "";
      n2.append(el("span", null, it.segments.length > 1 ? "인터벌 합계" : "합계"),
                el("span", null, bits.join(" · ")));
    });
    const h = $("#cardio .chead .faint");
    if (h) h.textContent = cardioMinutes() + "분";
    renderTotals();
  }

  // 가장 최근에 유산소를 한 세션
  function lastCardio() {
    const w = S.history.find((x) => x.date < S.date && (x.cardio || []).length);
    if (!w) return null;
    return { date: w.date, items: w.cardio,
             min: w.cardio.reduce((a, it) => a + itemMinutes(it), 0) };
  }

  function setLine(ex, edit, s, j, workNo) {
    const tr = el("div", "setline" + (s.kind === "warmup" ? " warm" : "") + (s.done ? " done" : ""));
    tr.append(el("span", "lbl", s.kind === "warmup" ? "워밍업" : workNo + "세트"));

    if (s.weight == null && isBW(ex)) {
      tr.append(el("span", "bw", BW[ex.equipment] || "맨몸"));
    } else {
      const wt = el("span", "wt");
      const inp = el("input", "num");
      inp.type = "number"; inp.step = "0.5"; inp.min = "0"; inp.inputMode = "decimal";
      inp.value = num(s.weight); inp.placeholder = "0";
      inp.setAttribute("aria-label", "무게");
      inp.oninput = () => { s.weight = inp.value === "" ? null : +inp.value; renderTotals(); };
      wt.append(inp, el("span", "u", s.per_side ? "kg씩" : "kg"));
      tr.append(wt);
    }

    tr.append(el("span", "x", "×"));

    const rp = el("span", "rp");
    const ri = el("input", "num");
    ri.type = "number"; ri.step = "1"; ri.min = "0"; ri.inputMode = "numeric";
    ri.value = s.reps == null ? "" : s.reps;
    ri.setAttribute("aria-label", "횟수");
    ri.oninput = () => { s.reps = ri.value === "" ? 0 : +ri.value; renderTotals(); };
    rp.append(ri, el("span", "u", "회"));
    tr.append(rp);

    const box = el("button", "box", s.done ? "[×]" : "[ ]");
    box.setAttribute("aria-label", "완료");
    box.setAttribute("aria-pressed", !!s.done);
    box.onclick = () => {
      s.done = !s.done;
      box.textContent = s.done ? "[×]" : "[ ]";
      box.setAttribute("aria-pressed", !!s.done);
      tr.classList.toggle("done", !!s.done);
      renderTotals();
    };
    const del = el("button", "del", "✕");
    del.setAttribute("aria-label", "이 세트 삭제");
    del.onclick = () => { edit.sets.splice(j, 1); renderToday(); };
    tr.append(box, del);
    return tr;
  }

  function stats() {
    let sets = 0, vol = 0, doneSets = 0, doneVol = 0;
    S.edits.forEach((ex) => ex.sets.forEach((s) => {
      const v = (s.weight || 0) * (s.reps || 0);
      sets++; vol += v;
      if (s.done) { doneSets++; doneVol += v; }
    }));
    return { sets, vol, doneSets, doneVol };
  }

  function slipNo() {
    return S.history.filter((w) => w.date <= S.date).length + (existingOn(S.date) ? 0 : 1);
  }

  function renderTotals() {
    const box = $("#totals"); if (!box) return;
    const st = stats();
    box.innerHTML = "";
    const row = (k, v, cls) => {
      const d = el("div", "total" + (cls ? " " + cls : ""));
      d.append(el("span", null, k), el("span", null, v));
      return d;
    };
    box.append(row("종목", String(S.edits.length), "dim"));
    box.append(row("총 세트", `${st.doneSets} / ${st.sets}`, "dim"));
    box.append(row("총 볼륨", Math.round(st.vol).toLocaleString() + " kg", "big"));
    if (st.doneSets) box.append(row("완료 볼륨", Math.round(st.doneVol).toLocaleString() + " kg", "dim"));
    const cm = cardioMinutes();
    if (cm) box.append(row("유산소", cm + " 분", "dim"));
    const p = el("p", "tiny faint", "＊ 무게 × 횟수 × 세트 합계 · 씩 표기는 한쪽 기준");
    p.style.margin = "2px 0 0"; box.append(p);

    const n = slipNo();
    $("#mNo").textContent = "NO. " + pad(n, 5);
    $("#barnum").textContent = S.date.replace(/-/g, "") + " " + effFocus().toUpperCase() + " " + pad(n, 3);
    // 체크 상태에 따라 부위 표시가 달라지므로 스탬프와 안내문도 함께 갱신
    if ($("#focuspick").children.length) { renderStamps(); renderWhy(); }
  }

  // ---------------------------------------------------------
  //  기록 날짜 옮기기
  // ---------------------------------------------------------
  // 같은 (date, source) 는 유일해야 하므로, 목적지에 같은 종류의 기록이 있으면
  // 먼저 지워야 한다. 실수로 덮어쓰는 일이 없게 항상 확인을 받는다.
  async function moveSession(w, toDate) {
    if (!toDate || toDate === w.date) return false;
    if (toDate > TODAY) { toast("미래 날짜로는 옮길 수 없어요.", true); return false; }

    const clash = S.history.find((x) => x.date === toDate && x.source === w.source && x.id !== w.id);
    const label = `${kDate(w.date)} ${kFocus(w.focus)} ${SRC_LABEL[w.source]}`;
    const msg = clash
      ? `${kDate(toDate)} 에 이미 ${SRC_LABEL[w.source]} 기록이 있어요.\n` +
        `덮어쓸까요?\n\n옮길 것: ${label}\n지워질 것: ${kDate(clash.date)} ${kFocus(clash.focus)}`
      : `${label} 을\n${kDate(toDate)} 로 옮길까요?`;
    if (!confirm(msg)) return false;

    try {
      if (clash) {
        const { error } = await S.sb.from("workouts").delete().eq("id", clash.id);
        if (error) throw error;
      }
      const { error: e2 } = await S.sb.from("workouts").update({ date: toDate }).eq("id", w.id);
      if (e2) throw e2;

      await loadHistory();
      S.calMonth = monthOf(toDate);
      S.calSel = toDate;
      if (S.date === w.date) { S.date = toDate; $("#dateInput").value = toDate; }
      buildRec();
      toast(`${kDate(w.date)} → ${kDate(toDate)} 로 옮겼어요` + (clash ? " (덮어씀)" : ""));
      renderLog();
      return true;
    } catch (e) {
      toast("옮기기 실패: " + (e.message || e), true);
      return false;
    }
  }

  function openMoveDialog(w) {
    const wrap = el("div", "modal");
    wrap.style.top = "22%";
    const bg = el("div");
    Object.assign(bg.style, { position: "fixed", inset: 0, background: "#0e1116cc", zIndex: 19 });
    const close = () => { wrap.remove(); bg.remove(); };
    bg.onclick = close;

    wrap.append(el("p", "mt", "날 짜 옮 기 기"));
    const info = el("p", "sans tiny dim");
    info.style.cssText = "margin:0 0 9px;text-align:center";
    info.textContent = `${kDate(w.date)} · ${kFocus(w.focus)} · ${SRC_LABEL[w.source]}`;
    wrap.append(info);

    const f = el("div", "field");
    f.append(el("label", null, "옮길 날짜"));
    const di = el("input");
    di.type = "date"; di.value = w.date; di.max = TODAY;
    di.style.cssText = "width:100%;background:var(--paper-2);border:1px solid var(--line);padding:9px 10px";
    f.append(di);
    wrap.append(f);

    const acts = el("div", "acts");
    const no = el("button", null, "취소");
    no.onclick = close;
    const ok = el("button", "pri", "옮기기");
    ok.onclick = async () => {
      const to = di.value;
      if (!to || to === w.date) { toast("다른 날짜를 골라주세요.", true); return; }
      ok.disabled = true;
      const done = await moveSession(w, to);
      ok.disabled = false;
      if (done) close();
    };
    acts.append(no, ok);
    wrap.append(acts);
    document.body.append(bg, wrap);
    setTimeout(() => di.focus(), 30);
  }

  // ---------------------------------------------------------
  //  기록 — 캘린더
  // ---------------------------------------------------------
  const FOCUS_KEYS = { lower: "lower", back: "back", push: "push", cardio: "cardio" };

  // 날짜 -> 그날의 세션 목록 (하루에 PT/개인 최대 2개)
  function sessionsByDate() {
    const m = new Map();
    for (const w of S.history) {
      if (!m.has(w.date)) m.set(w.date, []);
      m.get(w.date).push(w);
    }
    // 개인운동을 먼저 보이게
    for (const list of m.values()) list.sort((a, b) => (a.source === "self" ? -1 : 1));
    return m;
  }

  // 그날 붙일 라벨. 하체+유산소면 2개, PT하체+개인등이면 2개.
  function dayLabels(list) {
    const out = [], seen = new Set();
    for (const w of list) {
      if (w.focus !== "cardio" && !seen.has(w.focus)) { seen.add(w.focus); out.push(w.focus); }
      if ((w.focus === "cardio" || (w.cardio || []).length) && !seen.has("cardio")) {
        seen.add("cardio"); out.push("cardio");
      }
    }
    return out;
  }

  const monthOf = (isoStr) => isoStr.slice(0, 7);
  const firstRecordMonth = () => {
    const ds = S.history.map((w) => w.date).sort();
    return ds.length ? monthOf(ds[0]) : monthOf(TODAY);
  };
  function shiftMonth(ym, delta) {
    const [y, m] = ym.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}`;
  }
  function monthLabel(ym) {
    const [y, m] = ym.split("-").map(Number);
    // 올해면 '7월', 다른 해면 '2025. 06'
    return y === new Date().getFullYear() ? `${m}월` : `${y}. ${pad(m, 2)}`;
  }

  function renderLog() {
    const box = $("#tab-log"); box.innerHTML = "";
    if (!S.calMonth) S.calMonth = monthOf(S.date);
    const byDate = sessionsByDate();

    // ── 월 이동 ──
    const nav = el("div", "calnav");
    const prev = el("button", "arw", "‹");
    prev.setAttribute("aria-label", "지난 달");
    prev.onclick = () => { S.calMonth = shiftMonth(S.calMonth, -1); S.monPick = false; renderLog(); };
    const mon = el("button", "mon", monthLabel(S.calMonth));
    mon.setAttribute("aria-label", "월 선택");
    mon.onclick = () => { S.monPick = !S.monPick; renderLog(); };
    const next = el("button", "arw", "›");
    next.setAttribute("aria-label", "다음 달");
    next.disabled = S.calMonth >= monthOf(TODAY);
    next.onclick = () => { S.calMonth = shiftMonth(S.calMonth, 1); S.monPick = false; renderLog(); };
    nav.append(prev, mon, next);
    if (S.calMonth !== monthOf(TODAY)) {
      const now = el("button", "now", "오늘");
      now.onclick = () => { S.calMonth = monthOf(TODAY); S.monPick = false; renderLog(); };
      nav.append(now);
    }
    const shot = el("button", "now", "📷");
    shot.title = "이 달 캘린더를 이미지로 저장";
    shot.setAttribute("aria-label", "캘린더 이미지로 저장");
    shot.onclick = () => exportCalendar(shot);
    nav.append(shot);
    box.append(nav);

    if (S.monPick) { box.append(monthPicker()); box.append(el("hr", "rule")); }

    box.append(dowRow());
    box.append(calGrid(S.calMonth, byDate, { interactive: true }));
    if (byDate.size) {
      box.append(el("p", "draghint", "기록이 있는 칸을 길게 눌러 다른 날짜로 끌어다 놓을 수 있어요"));
    }
    box.append(el("hr", "rule"));
    monthTotals(S.calMonth, byDate).forEach((x) => box.append(x));

    // ── 선택한 날 상세 ──
    if (S.calSel && byDate.has(S.calSel)) {
      box.append(el("hr", "rule dbl"));
      box.append(dayDetail(S.calSel, byDate.get(S.calSel)));
    }
  }

  function dowRow() {
    const dow = el("div", "dow");
    "일월화수목금토".split("").forEach((d, i) => dow.append(el("span", i === 0 ? "sun" : null, d)));
    return dow;
  }

  // interactive:true 면 클릭·선택 상태를 붙인다. 캡처용은 false.
  function calGrid(ym, byDate, opt) {
    const interactive = !!(opt && opt.interactive);
    const [y, mo] = ym.split("-").map(Number);
    const startDow = new Date(y, mo - 1, 1).getDay();
    const inMonth = new Date(y, mo, 0).getDate();
    const rows = Math.ceil((startDow + inMonth) / 7);
    const grid = el("div", "grid");

    for (let i = 0; i < rows * 7; i++) {
      const dayNum = i - startDow + 1;
      const out = dayNum < 1 || dayNum > inMonth;
      const dt = new Date(y, mo - 1, dayNum);
      const isoDt = iso(dt);
      const cell = el("div", "cell" + (out ? " out" : "") + (dt.getDay() === 0 ? " sun" : "") +
        (isoDt === TODAY ? " today" : "") +
        (interactive && isoDt === S.calSel ? " sel" : ""));
      cell.append(el("div", "dnum", String(dt.getDate())));

      if (!out) cell.dataset.date = isoDt;
      const list = out ? null : byDate.get(isoDt);
      if (list && list.length) {
        cell.classList.add("has");
        const labels = dayLabels(list);
        labels.slice(0, 2).forEach((f) => cell.append(el("div", "lb " + FOCUS_KEYS[f], kFocus(f))));
        if (labels.length > 2) cell.append(el("div", "more", "+" + (labels.length - 2)));
        if (interactive) {
          cell.setAttribute("role", "button");
          cell.setAttribute("aria-label", `${dt.getMonth() + 1}월 ${dt.getDate()}일 ` +
            labels.map(kFocus).join(", "));
          cell.onclick = () => {
            if (cell.dataset.suppress) { delete cell.dataset.suppress; return; }
            S.calSel = S.calSel === isoDt ? null : isoDt; renderLog();
          };
          attachLongPressDrag(cell, isoDt, list);
        }
      }
      grid.append(cell);
    }
    return grid;
  }

  // 길게 눌러 다른 날짜 칸으로 끌어다 놓기.
  // 스크롤과 헷갈리지 않게 420ms 유지 + 8px 이내 움직임일 때만 드래그로 본다.
  function attachLongPressDrag(cell, isoDt, list) {
    let timer = null, sx = 0, sy = 0;

    const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };

    // 길게 누르면 브라우저가 텍스트 선택·기본 드래그·컨텍스트 메뉴를 띄운다. 전부 막는다.
    cell.addEventListener("dragstart", (ev) => ev.preventDefault());
    cell.addEventListener("selectstart", (ev) => ev.preventDefault());
    cell.addEventListener("contextmenu", (ev) => ev.preventDefault());

    cell.addEventListener("pointerdown", (ev) => {
      if (ev.button) return;
      sx = ev.clientX; sy = ev.clientY;
      clear();
      timer = setTimeout(() => {
        timer = null;
        if (list.length !== 1) {
          toast("이 날은 기록이 2개예요. 칸을 눌러 상세에서 옮겨주세요.", true);
          return;
        }
        beginDrag(list[0], isoDt, cell, sx, sy);
      }, 420);
    });
    cell.addEventListener("pointermove", (ev) => {
      if (timer && (Math.abs(ev.clientX - sx) > 8 || Math.abs(ev.clientY - sy) > 8)) clear();
    });
    cell.addEventListener("pointerup", clear);
    cell.addEventListener("pointercancel", clear);
    cell.addEventListener("pointerleave", clear);
  }

  function clearSelection() {
    const sel = window.getSelection && window.getSelection();
    if (!sel) return;
    if (sel.removeAllRanges) sel.removeAllRanges();
    else if (sel.empty) sel.empty();
  }

  function beginDrag(w, fromDate, cell, x, y) {
    if (S.drag) return;
    const ghost = el("div", "dragghost", `${kFocus(w.focus)} ${SRC_LABEL[w.source]}`);
    document.body.append(ghost);
    const place = (px, py) => {
      ghost.style.left = (px + 12) + "px";
      ghost.style.top = (py - 10) + "px";
    };
    place(x, y);

    S.drag = { w, fromDate, cell, ghost, over: null };
    document.body.classList.add("dragging");
    cell.classList.add("drag-src");
    clearSelection();
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (_) {} }

    const onMove = (ev) => {
      ev.preventDefault();
      clearSelection();          // 드래그 중 생기는 선택을 계속 걷어낸다
      place(ev.clientX, ev.clientY);
      const el2 = document.elementFromPoint(ev.clientX, ev.clientY);
      const tgt = el2 && el2.closest ? el2.closest(".cell") : null;
      if (S.drag.over && S.drag.over !== tgt) {
        S.drag.over.classList.remove("drop-ok", "drop-no", "drop-ow");
      }
      S.drag.over = tgt;
      if (!tgt) return;
      tgt.classList.remove("drop-ok", "drop-no", "drop-ow");
      const to = tgt.dataset.date;
      if (!to || to === fromDate) return;                 // 원래 칸·달 밖
      if (to > TODAY) { tgt.classList.add("drop-no"); return; }
      const clash = S.history.some((v) => v.date === to && v.source === w.source && v.id !== w.id);
      tgt.classList.add(clash ? "drop-ow" : "drop-ok");
    };

    const onUp = async (ev) => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointercancel", onUp);
      document.body.classList.remove("dragging");
      ghost.remove();
      cell.classList.remove("drag-src");
      clearSelection();
      const tgt = S.drag.over;
      if (tgt) tgt.classList.remove("drop-ok", "drop-no", "drop-ow");
      S.drag = null;
      // 드래그 직후 따라오는 click 을 삼킨다
      cell.dataset.suppress = "1";
      setTimeout(() => { delete cell.dataset.suppress; }, 350);

      const to = tgt && tgt.dataset.date;
      if (to && to !== fromDate) await moveSession(w, to);
    };

    document.addEventListener("pointermove", onMove, { passive: false });
    document.addEventListener("pointerup", onUp);
    document.addEventListener("pointercancel", onUp);
  }

  function monthStats(ym, byDate) {
    const days = [...byDate.entries()].filter(([d]) => monthOf(d) === ym);
    let vol = 0, cmin = 0, sets = 0;
    const byFocus = {};
    days.forEach(([, list]) => list.forEach((w) => {
      w.exercises.forEach((e) => e.sets.forEach((sg) => {
        vol += (sg.weight || 0) * (sg.reps || 0) * (sg.set_count || 1);
        sets += sg.set_count || 1;
      }));
      (w.cardio || []).forEach((it) => { cmin += itemMinutes(it); });
      dayLabels([w]).forEach((f) => { byFocus[f] = (byFocus[f] || 0) + 1; });
    }));
    return { days: days.length, vol, sets, cmin, byFocus };
  }

  function monthTotals(ym, byDate) {
    const st = monthStats(ym, byDate);
    if (!st.days) return [el("div", "empty", "이 달에는 기록이 없어요.")];
    const row = (k, v) => { const d = el("div", "total dim");
      d.append(el("span", null, k), el("span", null, v)); return d; };
    const out = [row("운동한 날", st.days + " 일"), row("총 세트", st.sets + " 세트"),
                 row("총 볼륨", Math.round(st.vol).toLocaleString() + " kg")];
    if (st.cmin) out.push(row("유산소", st.cmin + " 분"));
    return out;
  }

  // 캡처 전용 캘린더 (선택 표시 없음, 부위별 횟수 범례 포함)
  function buildCalendarNode() {
    const ym = S.calMonth || monthOf(S.date);
    const byDate = sessionsByDate();
    const [y, mo] = ym.split("-").map(Number);

    const paper = el("div", "paper");
    paper.append(paperHead("＊ 운동 기록 ＊", "M O N T H L Y   L O G"));
    paper.append(metaRow("기간", `${y}. ${pad(mo, 2)}`));
    paper.append(metaRow("회원", S.demo ? "미리보기" : (S.user ? S.user.email.split("@")[0] : "-")));
    paper.append(el("hr", "rule"));

    paper.append(dowRow());
    paper.append(calGrid(ym, byDate, { interactive: false }));

    // 부위별 범례 — 색만 보고 헷갈리지 않게 횟수까지
    const st = monthStats(ym, byDate);
    const keys = ["lower", "back", "push", "cardio"].filter((f) => st.byFocus[f]);
    if (keys.length) {
      paper.append(el("hr", "rule"));
      const lg = el("div");
      lg.style.cssText = "display:flex;flex-wrap:wrap;gap:5px;justify-content:center";
      keys.forEach((f) => {
        const b = el("div", "lb " + FOCUS_KEYS[f], `${kFocus(f)} ${st.byFocus[f]}회`);
        b.style.cssText = "font-size:.72em;padding:1px 6px";
        lg.append(b);
      });
      paper.append(lg);
    }

    paper.append(el("hr", "rule dbl"));
    monthTotals(ym, byDate).forEach((x) => paper.append(x));
    paper.append(barcodeBlock(ym.replace("-", "") + " LOG " + pad(st.days, 2)));
    return paper;
  }

  const exportCalendar = (btn) =>
    exportNode(buildCalendarNode(), `pt-calendar-${S.calMonth || monthOf(S.date)}.png`, btn);

  function monthPicker() {
    const wrap = el("div");
    let [y] = S.calMonth.split("-").map(Number);
    const draw = () => {
      wrap.innerHTML = "";
      const yn = el("div", "ynav");
      const p = el("button", null, "‹"); p.setAttribute("aria-label", "지난 해");
      p.onclick = () => { y--; draw(); };
      const nx = el("button", null, "›"); nx.setAttribute("aria-label", "다음 해");
      nx.disabled = y >= new Date().getFullYear();
      nx.onclick = () => { y++; draw(); };
      yn.append(p, el("span", null, y + "년"), nx);
      wrap.append(yn);

      const g = el("div", "mpick");
      const minM = firstRecordMonth(), maxM = monthOf(TODAY);
      for (let m = 1; m <= 12; m++) {
        const ym = `${y}-${pad(m, 2)}`;
        const b = el("button", null, m + "월");
        b.setAttribute("aria-pressed", ym === S.calMonth);
        b.disabled = ym > maxM;
        if (ym < minM) b.style.opacity = "0.5";
        b.onclick = () => { S.calMonth = ym; S.monPick = false; renderLog(); };
        g.append(b);
      }
      wrap.append(g);
    };
    draw();
    return wrap;
  }

  function dayDetail(dateStr, list) {
    const box = el("div", "dtl");
    const hd = el("div", "chead");
    const t = el("span", null, kDate(dateStr));
    t.style.cssText = "letter-spacing:.1em;flex:1";
    hd.append(t);
    box.append(hd);

    list.forEach((w) => {
      const sec = el("div", "sec");
      const sh = el("div", "sh");
      dayLabels([w]).forEach((f) => sh.append(el("span", "lb " + FOCUS_KEYS[f], kFocus(f))));
      sh.append(el("span", "src", w.source === "pt" ? "PT 수업" : "개인"));
      const mv = el("button", "mvbtn", "날짜 옮기기");
      mv.onclick = () => openMoveDialog(w);
      sh.append(mv);
      sec.append(sh);

      for (const e of w.exercises) {
        const ent = byId(e.exercise_id);
        const li = el("div", "li");
        li.append(el("span", "n", ent ? ent.name : e.exercise_id));
        const top = E.topSet(e.sets);
        if (top) {
          const cnt = E.setsAtWeight(e.sets, top.weight);
          li.append(el("span", "v",
            `${top.weight == null ? "맨몸" : num(top.weight) + "kg" + (top.per_side ? "씩" : "")}` +
            ` × ${top.reps} × ${cnt}`));
        }
        sec.append(li);
      }

      (w.cardio || []).forEach((it) => {
        const m = machineById(it.machine) || { name: it.machine };
        const li = el("div", "li");
        const nm = (it.segments || []).length > 1
          ? `${m.name} 인터벌 ${it.rep_count}세트` : m.name;
        li.append(el("span", "n", nm));
        const bits = [itemMinutes(it) + "분"];
        const km = itemDistance(it); if (km) bits.push(num(km) + "km");
        const fl = (it.rep_count || 1) * (it.segments || []).reduce((a, sg) => a + (+sg.floors || 0), 0);
        if (fl) bits.push(fl + "층");
        li.append(el("span", "v", bits.join(" · ")));
        sec.append(li);
      });

      if (!w.exercises.length && !(w.cardio || []).length) {
        sec.append(el("div", "li", "기록된 세트가 없어요."));
      }
      box.append(sec);
    });

    const acts = el("div", "acts");
    const go = el("button", "pri", "이 날짜 열기");
    go.onclick = () => {
      S.date = dateStr; S.forceNew = false; S.manualFocus = null; S.salt = "";
      $("#dateInput").value = dateStr;
      buildRec();
      document.querySelector('nav.tabs button[data-tab=today]').click();
    };
    acts.append(go);
    box.append(acts);
    return box;
  }

  // ---------------------------------------------------------
  //  추이
  // ---------------------------------------------------------
  function trendRows() {
    const rows = [];
    for (const ex of allEx()) {
      const pts = E.sessionsOf(ex.id, S.history)
        .map((s) => ({ date: s.date, w: (E.topSet(s.sets) || {}).weight }))
        .filter((p) => p.w != null).reverse();
      if (pts.length < 2) continue;
      rows.push({ ex, pts, delta: pts[pts.length - 1].w - pts[0].w, last: pts[pts.length - 1] });
    }
    rows.sort((a, b) => b.pts.length - a.pts.length || Math.abs(b.delta) - Math.abs(a.delta));
    return rows;
  }

  // 월요일 시작 주의 첫날
  function weekStart(isoStr) {
    const d = new Date(isoStr + "T00:00:00");
    const dow = (d.getDay() + 6) % 7;          // 월=0
    d.setDate(d.getDate() - dow);
    return iso(d);
  }

  // 주당 총 유산소 분 (최근 12주)
  function cardioWeekly() {
    const byWeek = new Map();
    for (const w of S.history) {
      const mins = (w.cardio || []).reduce((a, it) => a + itemMinutes(it), 0);
      if (!mins) continue;
      const k = weekStart(w.date);
      byWeek.set(k, (byWeek.get(k) || 0) + mins);
    }
    if (!byWeek.size) return null;
    const keys = [...byWeek.keys()].sort();
    // 기록이 없는 중간 주는 0으로 채워 실제 추이를 보이게 한다
    const out = [];
    let cur = keys[0];
    const end = keys[keys.length - 1];
    let guard = 0;
    while (cur <= end && guard++ < 200) {
      out.push({ date: cur, w: byWeek.get(cur) || 0 });
      const d = new Date(cur + "T00:00:00"); d.setDate(d.getDate() + 7); cur = iso(d);
    }
    return out.slice(-12);
  }

  function renderCardioTrend(box) {
    const pts = cardioWeekly();
    if (!pts || pts.length < 2) return false;
    const first = pts[0].w, last = pts[pts.length - 1].w;
    const good = last >= first;
    const c = el("div", "trend");
    const hd = el("div", "hd");
    const nm = el("span", null, "유산소 · 주간 총시간"); nm.style.flex = "1";
    hd.append(nm);
    hd.append(el("span", "d " + (last === first ? "dim" : good ? "up" : "down"),
      `${first}분 → ${last}분`));
    const pick = el("button", "pick", "[ ]");
    pick.dataset.id = "__cardio__";
    pick.setAttribute("aria-label", "유산소 선택");
    pick.onclick = () => {
      if (S.trendSel.has("__cardio__")) S.trendSel.delete("__cardio__"); else S.trendSel.add("__cardio__");
      renderTrend();
    };
    hd.append(pick);
    c.append(hd);
    c.append(spark(pts, good));
    const tot = pts.reduce((a, p) => a + p.w, 0);
    c.append(el("div", "tiny faint",
      `${pts.length}주 · 합계 ${tot}분 · 주 평균 ${Math.round(tot / pts.length)}분`));
    box.append(c);
    return true;
  }

  function renderTrend() {
    const box = $("#tab-trend"); box.innerHTML = "";
    const rows = trendRows();
    const hasCardio = (cardioWeekly() || []).length >= 2;
    if (!rows.length && !hasCardio) { box.append(el("div", "empty", "추이를 그릴 만큼 기록이 쌓이지 않았어요.")); return; }

    const bar = el("div", "tbar");
    const all = el("button", null, "전체 선택");
    const none = el("button", null, "해제");
    const shot = el("button", "pri", "📷 저장");
    const sync = () => {
      const valid = new Set(rows.map((r) => r.ex.id));
      if (hasCardio) valid.add("__cardio__");
      [...S.trendSel].forEach((id) => { if (!valid.has(id)) S.trendSel.delete(id); });
      shot.textContent = `📷 저장 (${S.trendSel.size})`;
      shot.disabled = S.trendSel.size === 0;
      box.querySelectorAll(".trend .pick").forEach((b) => {
        const on = S.trendSel.has(b.dataset.id);
        b.setAttribute("aria-pressed", on);
        b.textContent = on ? "[×]" : "[ ]";
      });
    };
    all.onclick = () => {
      rows.forEach((r) => S.trendSel.add(r.ex.id));
      if (hasCardio) S.trendSel.add("__cardio__");
      renderTrend();
    };
    none.onclick = () => { S.trendSel.clear(); renderTrend(); };
    shot.onclick = () => exportTrend(rows.filter((r) => S.trendSel.has(r.ex.id)),
                                     S.trendSel.has("__cardio__"));
    bar.append(all, none, shot);
    box.append(bar);

    if (renderCardioTrend(box) && rows.length) box.append(el("hr", "rule dbl"));

    rows.forEach((r, i) => {
      box.append(el("hr", "rule"));
      const c = el("div", "trend");
      const hd = el("div", "hd");
      const nm = el("span", null, r.ex.name); nm.style.flex = "1";
      hd.append(nm);
      const good = E.ASSISTED.has(r.ex.id) ? r.delta < 0 : r.delta > 0;
      hd.append(el("span", "d " + (r.delta === 0 ? "dim" : good ? "up" : "down"),
        `${num(r.pts[0].w)} → ${num(r.last.w)}kg` +
        (r.delta === 0 ? "" : ` (${r.delta > 0 ? "+" : ""}${num(r.delta)})`)));
      const pick = el("button", "pick", "[ ]");
      pick.dataset.id = r.ex.id;
      pick.setAttribute("aria-label", r.ex.name + " 선택");
      pick.onclick = () => {
        if (S.trendSel.has(r.ex.id)) S.trendSel.delete(r.ex.id); else S.trendSel.add(r.ex.id);
        sync();
      };
      hd.append(pick);
      c.append(hd);
      c.append(spark(r.pts, good));
      c.append(el("div", "tiny faint", `${r.pts.length}회 · 마지막 ${kDate(r.last.date)}`));
      box.append(c);
    });
    sync();
  }

  function sparkPath(pts, W, H) {
    const ws = pts.map((p) => p.w);
    const lo = Math.min(...ws), hi = Math.max(...ws), span = hi - lo || 1;
    const X = (i) => 3 + (i * (W - 6)) / Math.max(pts.length - 1, 1);
    const Y = (w) => H - 3 - ((w - lo) / span) * (H - 6);
    return { d: pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.w).toFixed(1)}`).join(" "),
             cx: X(pts.length - 1).toFixed(1), cy: Y(pts[pts.length - 1].w).toFixed(1) };
  }

  function spark(pts, good) {
    const W = 300, H = 34;
    const g = sparkPath(pts, W, H);
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "spark");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("preserveAspectRatio", "none");
    const col = good ? "var(--hi)" : "var(--warn)";
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", g.d);
    path.setAttribute("fill", "none"); path.setAttribute("stroke", col);
    path.setAttribute("stroke-width", "1.5");
    path.setAttribute("vector-effect", "non-scaling-stroke");
    svg.append(path);
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("cx", g.cx); dot.setAttribute("cy", g.cy);
    dot.setAttribute("r", "2"); dot.setAttribute("fill", col);
    svg.append(dot);
    return svg;
  }

  // html2canvas는 CSS 변수를 쓴 인라인 SVG를 자주 놓친다.
  // 캡처용으로는 색을 하드코딩한 SVG를 data URL <img>로 바꿔 넣는다.
  function sparkImg(pts, good, W, H) {
    const g = sparkPath(pts, W, H);
    const col = good ? HI : WARN;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
      `<path d="${g.d}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linejoin="round"/>` +
      `<circle cx="${g.cx}" cy="${g.cy}" r="2.2" fill="${col}"/></svg>`;
    const img = new Image(W, H);
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
    img.style.cssText = `display:block;width:100%;height:${H}px;margin:2px 0`;
    return img;
  }

  function renderAll() {
    renderToday();
    if (S.tab === "log") renderLog();
    if (S.tab === "trend") renderTrend();
  }

  // ---------------------------------------------------------
  //  이미지 저장
  // ---------------------------------------------------------
  function paperHead(title, sub) {
    const box = el("div");
    const c = el("div", "c");
    c.append(el("p", "brand", title));
    if (sub) c.append(el("p", "tagline dim tiny", sub));
    box.append(c, el("hr", "rule dbl"));
    return box;
  }
  function metaRow(k, v) {
    const d = el("div", "meta");
    d.append(el("span", "k", k), el("span", "lead"), el("span", "v", v));
    return d;
  }
  function barcodeBlock(numText) {
    const c = el("div", "c");
    c.append(el("hr", "rule solid"));
    const bc = el("div", "barcode"); c.append(bc);
    c.append(el("p", "barnum", numText));
    return c;
  }

  // 입력 필드를 정적 텍스트로 바꾼 캡처 전용 영수증
  function buildReceiptNode() {
    const paper = el("div", "paper");
    paper.append(paperHead("＊ 오늘의 운동 ＊", "P T   P R E S C R I P T I O N"));
    paper.append(metaRow("발행", S.date + " (" + wd(S.date) + ")"));
    paper.append(metaRow("전표", "NO. " + pad(slipNo(), 5)));
    paper.append(metaRow("회원", S.demo ? "미리보기" : (S.user ? S.user.email.split("@")[0] : "-")));
    paper.append(el("hr", "rule"));

    const st = el("div", "c");
    const stamp = el("div");
    stamp.style.cssText = "display:inline-block;padding:5px 16px 4px;margin:2px 0 4px;" +
      "border:2px solid var(--ink);letter-spacing:.22em;font-size:1.16em;transform:rotate(-1.2deg)";
    stamp.textContent = kFocus(effFocus());
    st.append(stamp);
    paper.append(st, el("hr", "rule"));

    S.rec.slots.forEach((slot, i) => {
      const ex = slot.exercise, edit = S.edits[i];
      if (i) paper.append(el("hr", "rule"));
      const item = el("div", "item");
      const hd = el("div", "hd");
      hd.append(el("span", "no", pad(i + 1, 2)), el("span", "nm", ex.name));
      item.append(hd);
      item.append(el("div", "tag",
        (S.patternLabels[ex.pattern] || ex.pattern) + " · " + (EQUIP[ex.equipment] || ex.equipment)));

      let workNo = 0;
      edit.sets.forEach((s) => {
        if (s.kind !== "warmup") workNo++;
        const tr = el("div", "setline" + (s.kind === "warmup" ? " warm" : "") + (s.done ? " done" : ""));
        tr.append(el("span", "lbl", s.kind === "warmup" ? "워밍업" : workNo + "세트"));
        const w = el("span", "bw",
          s.weight == null ? (BW[ex.equipment] || "맨몸") : num(s.weight) + "kg" + (s.per_side ? "씩" : ""));
        tr.append(w, el("span", "x", "×"));
        const r = el("span", "bw", String(s.reps == null ? "-" : s.reps) + "회");
        r.style.width = "3.6em";
        tr.append(r, el("span", "box", s.done ? "[×]" : "[ ]"));
        item.append(tr);
      });
      paper.append(item);
    });

    // 유산소
    if (S.cardio.length) {
      paper.append(el("hr", "rule"));
      const ch = el("div", "chead");
      const t = el("span", null, "유 산 소");
      t.style.cssText = "letter-spacing:.18em;flex:1";
      ch.append(t, el("span", "faint tiny", cardioMinutes() + "분"));
      paper.append(ch);

      S.cardio.forEach((it, i) => {
        const m = machineById(it.machine) || { fields: [], name: it.machine };
        const w2 = el("div"); w2.style.marginTop = "4px";
        const hd = el("div", "hd");
        hd.append(el("span", "no", pad(i + 1, 2)), el("span", "nm", m.name));
        w2.append(hd);
        if (it.segments.length > 1 || (it.rep_count || 1) > 1) {
          w2.append(el("div", "tag", `${it.segments.length > 1 ? "인터벌 " : ""}${it.rep_count || 1}세트`));
        }
        it.segments.forEach((sg) => {
          const row = el("div", "setline");
          row.append(el("span", "lbl", sg.label || "구간"));
          const bits = m.fields.map((f) => {
            const key = f === "distance" ? "distance" : f;
            const v = sg[key]; if (v == null || v === "") return null;
            const meta = fieldMeta(f);
            return `${meta.ko} ${num(v)}${meta.unit}`;
          }).filter(Boolean);
          const b = el("span", null, bits.join(" · "));
          b.style.cssText = "flex:1;text-align:right;font-size:.9em";
          row.append(b);
          w2.append(row);
        });
        const sum = el("div", "csum");
        const km = itemDistance(it);
        const fl = (it.rep_count || 1) * it.segments.reduce((a, sg) => a + (+sg.floors || 0), 0);
        const bits = [itemMinutes(it) + "분"];
        if (km) bits.push(num(km) + "km");
        if (fl) bits.push(fl + "층");
        if (m.pace && paceText(it)) bits.push(paceText(it));
        sum.append(el("span", null, "합계"), el("span", null, bits.join(" · ")));
        w2.append(sum);
        paper.append(w2);
      });
    }

    paper.append(el("hr", "rule dbl"));
    const st2 = stats();
    const tot = (k, v, cls) => {
      const d = el("div", "total" + (cls ? " " + cls : ""));
      d.append(el("span", null, k), el("span", null, v));
      return d;
    };
    paper.append(tot("종목", String(S.edits.length), "dim"));
    paper.append(tot("총 세트", `${st2.doneSets} / ${st2.sets}`, "dim"));
    paper.append(tot("총 볼륨", Math.round(st2.vol).toLocaleString() + " kg", "big"));
    if (st2.doneSets) paper.append(tot("완료 볼륨", Math.round(st2.doneVol).toLocaleString() + " kg", "dim"));
    if (cardioMinutes()) paper.append(tot("유산소", cardioMinutes() + " 분", "dim"));

    const foot = el("div", "c");
    foot.append(el("p", "tiny dim", "교환·환불 불가 · 근육통은 정상입니다"));
    foot.querySelector("p").style.margin = "9px 0 0";
    paper.append(foot);
    paper.append(barcodeBlock(S.date.replace(/-/g, "") + " " + effFocus().toUpperCase() + " " + pad(slipNo(), 3)));
    return paper;
  }

  function buildTrendNode(rows, withCardio) {
    const paper = el("div", "paper");
    paper.append(paperHead("＊ 중량 추이 ＊", "P R O G R E S S   R E P O R T"));
    paper.append(metaRow("발행", TODAY + " (" + wd(TODAY) + ")"));
    paper.append(metaRow("종목", rows.length + (withCardio ? " 개 + 유산소" : " 개")));
    paper.append(metaRow("기간", (S.history.length ? S.history[S.history.length - 1].date : "-") + " ~ " +
                                 (S.history.length ? S.history[0].date : "-")));
    paper.append(el("hr", "rule"));

    if (withCardio) {
      const pts = cardioWeekly() || [];
      if (pts.length >= 2) {
        const first = pts[0].w, last = pts[pts.length - 1].w, good = last >= first;
        const c = el("div", "trend");
        const hd = el("div", "hd");
        const nm = el("span", null, "유산소 · 주간 총시간"); nm.style.flex = "1";
        hd.append(nm);
        const dd = el("span", "d", `${first}분 → ${last}분`);
        dd.style.color = last === first ? "var(--ink-2)" : (good ? HI : WARN);
        hd.append(dd);
        c.append(hd);
        c.append(sparkImg(pts, good, 340, 34));
        const tot = pts.reduce((a, p) => a + p.w, 0);
        c.append(el("div", "tiny faint",
          `${pts.length}주 · 합계 ${tot}분 · 주 평균 ${Math.round(tot / pts.length)}분`));
        paper.append(c);
        if (rows.length) paper.append(el("hr", "rule dbl"));
      }
    }

    rows.forEach((r, i) => {
      if (i) paper.append(el("hr", "rule"));
      const c = el("div", "trend");
      const hd = el("div", "hd");
      const nm = el("span", null, r.ex.name); nm.style.flex = "1";
      hd.append(nm);
      const good = E.ASSISTED.has(r.ex.id) ? r.delta < 0 : r.delta > 0;
      const d = el("span", "d", `${num(r.pts[0].w)} → ${num(r.last.w)}kg` +
        (r.delta === 0 ? "" : ` (${r.delta > 0 ? "+" : ""}${num(r.delta)})`));
      d.style.color = r.delta === 0 ? "var(--ink-2)" : (good ? HI : WARN);
      hd.append(d);
      c.append(hd);
      c.append(sparkImg(r.pts, good, 340, 34));
      c.append(el("div", "tiny faint", `${r.pts.length}회 · 마지막 ${kDate(r.last.date)}`));
      paper.append(c);
    });

    paper.append(el("hr", "rule dbl"));
    const tot = el("div", "total dim");
    tot.append(el("span", null, "누적 세션"), el("span", null, S.history.length + " 회"));
    paper.append(tot);
    paper.append(barcodeBlock("TREND " + TODAY.replace(/-/g, "")));
    return paper;
  }

  async function exportNode(node, filename, btn) {
    const label = btn ? btn.textContent : null;
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spin"></span>'; }
    const stage = $("#capture");
    stage.innerHTML = "";
    stage.append(node);
    try {
      if (!window.html2canvas) throw new Error("이미지 라이브러리(html2canvas)를 못 불러왔어요.");
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      // data URL 이미지 로딩 대기.
      // 어떤 이유로든 onload/onerror가 안 오면 영원히 멈추므로 타임아웃을 둔다.
      await Promise.all([...node.querySelectorAll("img")].map((im) =>
        im.complete ? null : new Promise((res) => {
          const done = () => { clearTimeout(tm); res(); };
          const tm = setTimeout(done, 1500);
          im.onload = done; im.onerror = done;
        })));
      await new Promise((r) => setTimeout(r, 60));

      const canvas = await window.html2canvas(node, {
        backgroundColor: PAPER, scale: 2, useCORS: true, logging: false,
        width: node.offsetWidth, height: node.offsetHeight,
      });
      const blob = await new Promise((res) => canvas.toBlob(res, "image/png"));
      if (!blob) throw new Error("이미지 변환에 실패했어요.");

      // 폰에서는 공유 시트가 사진 저장 경로. 안 되면 다운로드로 폴백.
      try {
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          // title/text 를 넘기면 카톡 등에서 파일명이 메시지로 같이 붙는다. 파일만 보낸다.
          await navigator.share({ files: [file] });
          toast("공유 시트를 열었어요.");
          return;
        }
      } catch (e) {
        if (e && e.name === "AbortError") return;
      }
      const url = URL.createObjectURL(blob);
      const a = el("a"); a.href = url; a.download = filename;
      document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast("이미지를 저장했어요 — " + filename);
    } catch (e) {
      toast("이미지 저장 실패: " + (e.message || e), true);
    } finally {
      stage.innerHTML = "";
      if (btn) { btn.disabled = false; btn.textContent = label; }
    }
  }

  const exportReceipt = () => exportNode(buildReceiptNode(), `pt-${S.date}.png`, $("#shot"));
  const exportTrend = (rows, withCardio) => {
    if (!rows.length && !withCardio) { toast("종목을 하나 이상 골라주세요.", true); return; }
    exportNode(buildTrendNode(rows, withCardio), `pt-trend-${TODAY}.png`, $("#tab-trend .tbar .pri"));
  };

  // ---------------------------------------------------------
  //  종목 추가 (검색 + 새로 만들기)
  // ---------------------------------------------------------
  const EQUIP_SHORT = (ex) => EQUIP[ex.equipment] || "";

  // 검색: 이름 · 부위 · 장비 · 패턴을 공백으로 나눈 모든 토큰이 들어 있어야 통과
  function matchEx(ex, qs) {
    if (!qs) return true;
    const hay = [ex.name, kFocus(ex.focus), S.patternLabels[ex.pattern] || "",
                 EQUIP_SHORT(ex)].join(" ").toLowerCase();
    return qs.toLowerCase().split(/\s+/).filter(Boolean).every((t) => hay.includes(t));
  }

  function addExercise() {
    const used = new Set(S.edits.map((e) => e.exercise_id));
    let newFocus = S.rec.focus === "cardio" ? "lower" : S.rec.focus;

    const wrap = el("div", "modal");
    const bg = el("div");
    Object.assign(bg.style, { position: "fixed", inset: 0, background: "#0e1116cc", zIndex: 19 });
    const close = () => { wrap.remove(); bg.remove(); };
    bg.onclick = close;

    wrap.append(el("p", "mt", "종 목 추 가"));

    const srch = el("input", "srch");
    srch.type = "search"; srch.placeholder = "종목 · 부위 · 기구로 검색";
    srch.setAttribute("aria-label", "종목 검색");
    wrap.append(srch);
    const cnt = el("p", "cnt");
    wrap.append(cnt);

    const list = el("div", "exlist");
    wrap.append(list);

    function addPicked(ex) {
      const plan = S.mode === "edit"
        ? { sets: [{ weight: null, reps: 12, set_count: 3, kind: "work", per_side: false }], why: null }
        : E.suggestSets(ex.id, historyBefore(S.date), null);
      S.rec.slots.push({ label: "직접 추가", exercise: ex, plan, daysSince: 999, alternatives: [] });
      S.edits.push(toEdit({ exercise: ex, plan }));
      close(); renderToday();
    }

    function draw() {
      const qs = srch.value.trim();
      const hits = pickable().filter((x) => !used.has(x.id) && matchEx(x, qs));
      list.innerHTML = "";
      cnt.textContent = `${hits.length} / ${pickable().filter((x) => !used.has(x.id)).length} 종목`;

      if (!hits.length) {
        list.append(el("div", "none", qs ? `'${qs}' 에 맞는 종목이 없어요.` : "추가할 종목이 없어요."));
      }
      // 이름이 걸린 것을 먼저 (패턴·기구로만 걸린 건 아래로).
      // '스쿼트' 를 치면 이름에 스쿼트가 든 종목이 먼저, 머신 스쿼트 패턴인
      // 레그프레스 같은 건 그다음에 나온다.
      const ql = qs.toLowerCase();
      const byName = (x) => ql && x.name.toLowerCase().includes(ql) ? 1 : 0;
      hits.sort((a, b) => byName(b) - byName(a) ||
                          (b.mine ? 1 : 0) - (a.mine ? 1 : 0) ||
                          (b.from_history ? 1 : 0) - (a.from_history ? 1 : 0) ||
                          a.name.localeCompare(b.name, "ko"));
      hits.slice(0, 200).forEach((ex) => {
        const b = el("button");
        b.append(el("span", "nm", ex.name));
        b.append(el("span", "mt2", kFocus(ex.focus) +
          (EQUIP_SHORT(ex) ? " · " + EQUIP_SHORT(ex) : "")));
        if (ex.mine) b.append(el("span", "bd mine", "내 종목"));
        else if (!ex.from_history) b.append(el("span", "bd", "새 종목"));
        b.onclick = () => addPicked(ex);

        if (ex.mine) {
          const act = el("span", "rowact");
          const ed = el("span", null, "이름");
          ed.onclick = (ev) => { ev.stopPropagation(); renameCustom(ex, draw); };
          const rm = el("span", null, "삭제");
          rm.onclick = (ev) => { ev.stopPropagation(); deleteCustom(ex, draw); };
          act.append(ed, rm);
          b.append(act);
        }
        list.append(b);
      });
    }
    srch.addEventListener("input", draw);
    srch.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        const first = list.querySelector("button");
        if (first) first.click();
      }
    });

    // ── 새 종목 만들기 ──
    if (!S.noCustomTable && !S.demo) {
      const nx = el("div", "newex");
      const row = el("div", "row");
      const nin = el("input");
      nin.type = "text"; nin.placeholder = "새 종목 이름";
      nin.setAttribute("aria-label", "새 종목 이름");
      const mk = el("button", null, "만들기");
      mk.style.cssText = "flex:none;border:1px solid var(--ink);background:var(--ink);" +
        "color:var(--paper);padding:8px 12px;letter-spacing:.06em";
      row.append(nin, mk);
      nx.append(row);

      const fsel = el("div", "fsel");
      ["lower", "back", "push"].forEach((f) => {
        const b = el("button", null, kFocus(f));
        b.setAttribute("aria-pressed", f === newFocus);
        b.onclick = () => {
          newFocus = f;
          fsel.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b));
        };
        fsel.append(b);
      });
      nx.append(fsel);
      wrap.append(nx);

      mk.onclick = async () => {
        const name = nin.value.trim();
        if (!name) { toast("종목 이름을 입력해 주세요.", true); return; }
        if (pickable().some((x) => x.name === name)) {
          toast("같은 이름의 종목이 이미 있어요.", true); return;
        }
        mk.disabled = true; mk.innerHTML = '<span class="spin"></span>';
        const ex = await createCustom(name, newFocus);
        mk.disabled = false; mk.textContent = "만들기";
        if (ex) { nin.value = ""; addPicked(ex); }
      };
    } else if (S.noCustomTable) {
      const w2 = el("div", "msg err");
      w2.style.fontSize = ".76em";
      w2.innerHTML = "새 종목을 만들려면 <code>supabase/migration_custom_exercises.sql</code> 을 " +
        "한 번 실행해 주세요.";
      wrap.append(w2);
    }

    const acts = el("div", "acts");
    const no = el("button", null, "닫기");
    no.onclick = close;
    acts.append(no);
    wrap.append(acts);

    document.body.append(bg, wrap);
    draw();
    setTimeout(() => srch.focus(), 30);
  }

  async function createCustom(name, focus) {
    const id = "custom_" + Date.now().toString(36);
    const { error } = await S.sb.from("custom_exercises")
      .insert({ id, user_id: S.user.id, name, focus, pattern: "custom", equipment: "custom" });
    if (error) { toast("종목 만들기 실패: " + error.message, true); return null; }
    const ex = { id, name, focus, pattern: "custom", equipment: "custom",
                 hidden: false, from_history: false, mine: true };
    S.custom.push(ex);
    toast(`'${name}' 종목을 만들었어요.`);
    return ex;
  }

  async function renameCustom(ex, after) {
    const name = (prompt("새 이름", ex.name) || "").trim();
    if (!name || name === ex.name) return;
    if (pickable().some((x) => x.id !== ex.id && x.name === name)) {
      toast("같은 이름의 종목이 이미 있어요.", true); return;
    }
    const { error } = await S.sb.from("custom_exercises").update({ name }).eq("id", ex.id);
    if (error) { toast("이름 변경 실패: " + error.message, true); return; }
    ex.name = name;
    toast("이름을 바꿨어요.");
    if (after) after();
    renderToday();
  }

  async function deleteCustom(ex, after) {
    // 이미 기록에 쓰인 종목은 지우면 그 기록의 종목 이름이 사라진다 → 목록에서만 숨긴다
    const used = S.history.some((w) => w.exercises.some((e) => e.exercise_id === ex.id));
    const msg = used
      ? `'${ex.name}' 은 이미 기록에 쓰였어요.\n목록에서만 감출까요? (지난 기록은 그대로 남습니다)`
      : `'${ex.name}' 을 삭제할까요?`;
    if (!confirm(msg)) return;

    if (used) {
      const { error } = await S.sb.from("custom_exercises").update({ hidden: true }).eq("id", ex.id);
      if (error) { toast("숨기기 실패: " + error.message, true); return; }
      ex.hidden = true;
      toast("목록에서 감췄어요. 지난 기록은 그대로예요.");
    } else {
      const { error } = await S.sb.from("custom_exercises").delete().eq("id", ex.id);
      if (error) { toast("삭제 실패: " + error.message, true); return; }
      S.custom = S.custom.filter((x) => x.id !== ex.id);
      toast("삭제했어요.");
    }
    if (after) after();
  }

  // ---------------------------------------------------------
  //  이벤트
  // ---------------------------------------------------------
  document.addEventListener("click", (ev) => {
    const t = ev.target.closest("nav.tabs button");
    if (!t) return;
    S.tab = t.dataset.tab;
    document.querySelectorAll("nav.tabs button").forEach((b) => b.setAttribute("aria-selected", b === t));
    ["today", "log", "trend"].forEach((k) => $("#tab-" + k).classList.toggle("hidden", k !== S.tab));
    if (S.tab === "today") renderToday();
    if (S.tab === "log") { S.calMonth = monthOf(S.date); S.calSel = null; S.monPick = false; renderLog(); }
    if (S.tab === "trend") renderTrend();
  });

  $("#reroll").onclick = () => {
    S.forceNew = true; S.salt = String(Date.now());
    buildRec(); renderToday();
  };
  $("#save").onclick = saveToday;
  $("#addEx").onclick = addExercise;
  $("#shot").onclick = exportReceipt;

  async function doAuth(kind) {
    const email = $("#email").value.trim(), password = $("#pw").value;
    const msg = $("#authMsg"); msg.innerHTML = "";
    if (!email || password.length < 6) {
      msg.innerHTML = '<div class="msg err">이메일과 6자 이상 비밀번호를 입력해 주세요.</div>'; return;
    }
    const fn = kind === "up" ? "signUp" : "signInWithPassword";
    const { data, error } = await S.sb.auth[fn]({ email, password });
    if (error) { msg.innerHTML = `<div class="msg err">${error.message}</div>`; return; }
    if (kind === "up" && !data.session) {
      msg.innerHTML = '<div class="msg ok">가입 확인 메일을 보냈어요. 링크를 누른 뒤 로그인해 주세요.' +
        '<br>(Supabase에서 이메일 확인을 껐다면 바로 로그인됩니다)</div>';
    }
  }
  $("#loginBtn").onclick = () => doAuth("in");
  $("#signupBtn").onclick = () => doAuth("up");
  $("#pw").addEventListener("keydown", (e) => { if (e.key === "Enter") doAuth("in"); });

  boot();
})();
