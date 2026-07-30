/* ============================================================
   PT Coach — 영수증 UI + Supabase
   ============================================================ */
(function () {
  "use strict";

  const $ = (s) => document.querySelector(s);
  const el = (t, c, txt) => { const n = document.createElement(t); if (c) n.className = c; if (txt != null) n.textContent = txt; return n; };
  const cfg = window.PT_CONFIG || {};
  const E = window.PTEngine;

  const S = {
    sb: null, user: null, demo: false,
    catalog: null, focusLabels: {}, patternLabels: {},
    history: [], rec: null, edits: null,
    salt: "", manualFocus: null,
    pinned: JSON.parse(localStorage.getItem("pt_pinned") || "[]"),
    tab: "today",
  };

  const todayISO = () => {
    const d = new Date(), p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  const TODAY = todayISO();
  const byId = (id) => S.catalog.find((x) => x.id === id);
  const num = (v) => (v == null ? "" : String(+(+v).toFixed(2)));
  const kFocus = (f) => S.focusLabels[f] || f;
  const kDate = (iso) => {
    const d = new Date(iso + "T00:00:00");
    return `${d.getMonth() + 1}/${d.getDate()} (${"일월화수목금토"[d.getDay()]})`;
  };
  // 무게 칸에 숫자 대신 표시할 이름
  const BW = { band: "밴드", bodyweight: "맨몸", aquabag: "아쿠아백", medball: "메드볼" };
  // 태그 줄에 쓰는 장비 이름
  const EQUIP = {
    machine: "머신", barbell: "바벨", dumbbell: "덤벨", smith: "스미스머신",
    cable: "케이블", band: "밴드", bodyweight: "맨몸", kettlebell: "케틀벨",
    medball: "메드신볼", aquabag: "아쿠아백",
  };
  const isBW = (ex) => ["bodyweight", "band", "aquabag", "medball"].includes(ex.equipment);
  const pad = (n, w) => String(n).padStart(w, "0");

  // 대시보드에서 URL을 복사하면 /rest/v1 같은 경로가 붙어오기 쉽다.
  // supabase-js는 경로를 스스로 붙이므로 루트만 남겨야 한다.
  // (안 그러면 /rest/v1//auth/v1/signup → "Invalid path specified in request URL")
  function normalizeUrl(raw) {
    let u = String(raw || "").trim();
    if (!u) return "";
    u = u.replace(/^http:\/\//, "https://");
    if (!/^https?:\/\//.test(u)) u = "https://" + u;
    try {
      const p = new URL(u);
      return p.protocol + "//" + p.host;   // 경로·쿼리·해시 전부 버림
    } catch (_) {
      return u.replace(/\/+$/, "");
    }
  }

  // ---------------------------------------------------------
  //  글자 크기 (헬스장에서 키울 수 있게)
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
    $("#mDate").textContent = TODAY + " (" + "일월화수목금토"[new Date().getDay()] + ")";

    try {
      const res = await fetch("data/exercises.json", { cache: "no-cache" });
      const j = await res.json();
      S.catalog = j.exercises; S.focusLabels = j.focus_labels; S.patternLabels = j.pattern_labels;
    } catch (e) {
      $("#boot").innerHTML = `<div class="msg err">종목 카탈로그(data/exercises.json)를 불러오지 못했어요.<br>${e.message}</div>`;
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

    // CDN(jsdelivr)이 막히거나 느린 네트워크에서 안 내려온 경우
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

    try { await loadHistory(); }
    catch (e) {
      $("#boot").innerHTML = `<div class="msg err">기록을 불러오지 못했어요.<br>${e.message}` +
        `<br><br>schema.sql을 실행했는지 확인하고, 그래도 안 되면 diagnose.html을 열어보세요.</div>`;
      return;
    }
    $("#boot").classList.add("hidden");
    $("#app").classList.remove("hidden");
    buildRec(); renderAll();
  }

  // ---------------------------------------------------------
  //  데이터
  // ---------------------------------------------------------
  async function loadHistory() {
    const { data, error } = await S.sb
      .from("workouts")
      .select("id,date,focus,source,note,workout_sets(exercise_id,seq,set_index,weight,reps,set_count,per_side)")
      .order("date", { ascending: false });
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
      return { id: w.id, date: w.date, focus: w.focus, source: w.source, note: w.note,
               exercises: [...groups.values()] };
    });
  }

  async function saveToday() {
    const btn = $("#save");
    const rows = S.edits.map((ex, i) => ({ ex, i }))
      .filter(({ ex }) => ex.sets.some((s) => s.done && s.reps > 0));
    if (!rows.length) { toast("완료 체크된 세트가 없어요.", true); return; }

    btn.disabled = true; btn.innerHTML = '<span class="spin"></span>';
    try {
      const existing = S.history.find((w) => w.date === TODAY && w.source === "self");
      if (existing) await S.sb.from("workouts").delete().eq("id", existing.id);

      const { data: w, error: e1 } = await S.sb.from("workouts")
        .insert({ user_id: S.user.id, date: TODAY, focus: S.rec.focus, source: "self" })
        .select("id").single();
      if (e1) throw e1;

      const payload = [];
      rows.forEach(({ ex, i }) => {
        ex.sets.filter((s) => s.done && s.reps > 0).forEach((s, j) => {
          payload.push({ workout_id: w.id, exercise_id: ex.exercise_id, seq: i, set_index: j,
                         weight: s.weight, reps: s.reps, set_count: 1, per_side: !!s.per_side, done: true });
        });
      });
      const { error: e2 } = await S.sb.from("workout_sets").insert(payload);
      if (e2) throw e2;

      await loadHistory();
      toast(`저장 완료 — ${rows.length}종목 ${payload.length}세트`);
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
    setTimeout(() => n.remove(), 3200);
  }

  // ---------------------------------------------------------
  //  추천 → 편집 상태
  // ---------------------------------------------------------
  function buildRec() {
    S.rec = E.recommend({
      catalog: S.catalog, history: S.history, today: TODAY,
      focus: S.manualFocus, salt: S.salt, pinned: S.pinned,
    });
    S.edits = S.rec.slots.filter((s) => s.exercise).map(toEdit);
  }
  function toEdit(slot) {
    const flat = [];
    (slot.plan.sets || []).forEach((s) => {
      for (let k = 0; k < (s.set_count || 1); k++) {
        flat.push({ weight: s.weight, reps: s.reps, per_side: !!s.per_side, kind: s.kind, done: false });
      }
    });
    return { exercise_id: slot.exercise.id, sets: flat };
  }
  function rebuildSlot(i) {
    E.swapSlot(S.rec, i, { catalog: S.catalog, history: S.history });
    S.edits[i] = toEdit(S.rec.slots[i]);
    renderToday();
  }

  // ---------------------------------------------------------
  //  오늘
  // ---------------------------------------------------------
  function renderStamps() {
    const box = $("#focuspick"); box.innerHTML = "";
    for (const r of S.rec.ranking) {
      const b = el("button");
      b.setAttribute("aria-pressed", r.focus === S.rec.focus);
      b.append(el("b", null, kFocus(r.focus)),
               el("i", null, r.lastDate ? `${r.days}일 전` : "기록 없음"));
      b.onclick = () => { S.manualFocus = r.focus; S.salt = ""; buildRec(); renderToday(); };
      box.append(b);
    }
  }

  function renderWhy() {
    const top = S.rec.ranking[0];
    const auto = !S.manualFocus || S.manualFocus === top.focus;
    const done = S.history.find((w) => w.date === TODAY && w.source === "self");
    let t = auto
      ? `${kFocus(S.rec.focus)}가 ${top.lastDate ? `${top.days}일째 안 나왔어요` : "기록에 없어요"} — 오늘 이 부위 차례.`
      : `${kFocus(S.rec.focus)}를 직접 골랐어요. 최근 이 부위에 없던 종목으로 짰습니다.`;
    if (done) t += " 오늘 이미 저장한 기록이 있어서, 다시 저장하면 덮어씁니다.";
    $("#why").textContent = t;
  }

  function renderToday() {
    renderStamps(); renderWhy();
    const box = $("#slots"); box.innerHTML = "";
    let n = 0;

    S.rec.slots.forEach((slot, i) => {
      if (!slot.exercise) return;
      const ex = slot.exercise, edit = S.edits[i], plan = slot.plan;
      if (n) box.append(el("hr", "rule"));
      n++;

      const item = el("div", "item");
      const hd = el("div", "hd");
      hd.append(el("span", "no", pad(n, 2)), el("span", "nm", ex.name));
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
      const bSwap = el("button", null, "🔄 다른 종목");
      bSwap.onclick = () => rebuildSlot(i);
      const bPin = el("button", null, S.pinned.includes(ex.id) ? "📌 고정 해제" : "📌 항상 넣기");
      bPin.onclick = () => {
        S.pinned = S.pinned.includes(ex.id) ? S.pinned.filter((x) => x !== ex.id) : S.pinned.concat(ex.id);
        localStorage.setItem("pt_pinned", JSON.stringify(S.pinned));
        buildRec(); renderToday();
      };
      const bAdd = el("button", null, "＋ 세트");
      bAdd.onclick = () => {
        const last = edit.sets[edit.sets.length - 1] || { weight: null, reps: 12, per_side: false };
        edit.sets.push({ ...last, kind: "work", done: false }); renderToday();
      };
      foot.append(bSwap, bPin, bAdd);
      item.append(foot);
      box.append(item);
    });

    renderTotals();
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

  function renderTotals() {
    const box = $("#totals"); if (!box) return;
    let sets = 0, vol = 0, doneSets = 0, doneVol = 0;
    S.edits.forEach((ex) => ex.sets.forEach((s) => {
      const v = (s.weight || 0) * (s.reps || 0);
      sets++; vol += v;
      if (s.done) { doneSets++; doneVol += v; }
    }));
    box.innerHTML = "";
    const row = (k, v, cls) => {
      const d = el("div", "total" + (cls ? " " + cls : ""));
      d.append(el("span", null, k), el("span", null, v));
      return d;
    };
    box.append(row("종목", String(S.edits.length), "dim"));
    box.append(row("총 세트", `${doneSets} / ${sets}`, "dim"));
    box.append(row("총 볼륨", Math.round(vol).toLocaleString() + " kg", "big"));
    if (doneSets) box.append(row("완료 볼륨", Math.round(doneVol).toLocaleString() + " kg", "dim"));
    const p = el("p", "tiny faint", "＊ 무게 × 횟수 × 세트 합계 · 씩 표기는 한쪽 기준");
    p.style.margin = "2px 0 0"; box.append(p);

    const idx = S.history.filter((w) => w.source === "self").length + 1;
    $("#mNo").textContent = "NO. " + pad(idx, 5);
    $("#barnum").textContent = TODAY.replace(/-/g, "") + " " + S.rec.focus.toUpperCase() + " " + pad(idx, 3);
  }

  // ---------------------------------------------------------
  //  기록
  // ---------------------------------------------------------
  function renderLog() {
    const box = $("#tab-log"); box.innerHTML = "";
    if (!S.history.length) { box.append(el("div", "empty", "아직 기록이 없어요.")); return; }
    S.history.slice(0, 60).forEach((w, i) => {
      if (i) box.append(el("hr", "rule"));
      const c = el("div", "log");
      const hd = el("div", "hd");
      hd.append(el("span", null, kDate(w.date) + "  " + kFocus(w.focus)),
                el("span", "src", w.source === "pt" ? "PT 수업" : "개인"));
      c.append(hd);
      for (const e of w.exercises) {
        const ent = byId(e.exercise_id);
        const li = el("div", "li");
        li.append(el("span", "n", ent ? ent.name : e.exercise_id));
        const t = E.topSet(e.sets);
        if (t) {
          const cnt = E.setsAtWeight(e.sets, t.weight);
          li.append(el("span", "v",
            `${t.weight == null ? "맨몸" : num(t.weight) + "kg" + (t.per_side ? "씩" : "")} × ${t.reps} × ${cnt}`));
        }
        c.append(li);
      }
      box.append(c);
    });
  }

  // ---------------------------------------------------------
  //  추이
  // ---------------------------------------------------------
  function renderTrend() {
    const box = $("#tab-trend"); box.innerHTML = "";
    const rows = [];
    for (const ex of S.catalog) {
      const pts = E.sessionsOf(ex.id, S.history)
        .map((s) => ({ date: s.date, w: (E.topSet(s.sets) || {}).weight }))
        .filter((p) => p.w != null).reverse();
      if (pts.length < 2) continue;
      rows.push({ ex, pts, delta: pts[pts.length - 1].w - pts[0].w, last: pts[pts.length - 1] });
    }
    if (!rows.length) { box.append(el("div", "empty", "추이를 그릴 만큼 기록이 쌓이지 않았어요.")); return; }
    rows.sort((a, b) => b.pts.length - a.pts.length || Math.abs(b.delta) - Math.abs(a.delta));

    rows.forEach((r, i) => {
      if (i) box.append(el("hr", "rule"));
      const c = el("div", "trend");
      const hd = el("div", "hd");
      hd.append(el("span", null, r.ex.name));
      const good = E.ASSISTED.has(r.ex.id) ? r.delta < 0 : r.delta > 0;
      hd.append(el("span", "d " + (r.delta === 0 ? "dim" : good ? "up" : "down"),
        `${num(r.pts[0].w)} → ${num(r.last.w)}kg` +
        (r.delta === 0 ? "" : ` (${r.delta > 0 ? "+" : ""}${num(r.delta)})`)));
      c.append(hd);
      c.append(spark(r.pts, good));
      c.append(el("div", "tiny faint", `${r.pts.length}회 · 마지막 ${kDate(r.last.date)}`));
      box.append(c);
    });
  }

  function spark(pts, good) {
    const W = 300, H = 34, P = 3;
    const ws = pts.map((p) => p.w);
    const lo = Math.min(...ws), hi = Math.max(...ws), span = hi - lo || 1;
    const X = (i) => P + (i * (W - P * 2)) / Math.max(pts.length - 1, 1);
    const Y = (w) => H - P - ((w - lo) / span) * (H - P * 2);
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("class", "spark");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("preserveAspectRatio", "none");
    const col = good ? "var(--hi)" : "var(--warn)";
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", pts.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.w).toFixed(1)}`).join(" "));
    path.setAttribute("fill", "none"); path.setAttribute("stroke", col);
    path.setAttribute("stroke-width", "1.5");
    path.setAttribute("vector-effect", "non-scaling-stroke");
    svg.append(path);
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("cx", X(pts.length - 1)); dot.setAttribute("cy", Y(pts[pts.length - 1].w));
    dot.setAttribute("r", "2"); dot.setAttribute("fill", col);
    svg.append(dot);
    return svg;
  }

  function renderAll() {
    renderToday();
    if (S.tab === "log") renderLog();
    if (S.tab === "trend") renderTrend();
  }

  // ---------------------------------------------------------
  //  종목 추가
  // ---------------------------------------------------------
  function addExercise() {
    const used = new Set(S.edits.map((e) => e.exercise_id));
    const opts = S.catalog.filter((x) => !used.has(x.id));

    const wrap = el("div");
    Object.assign(wrap.style, { position: "fixed", left: "12px", right: "12px", top: "10%",
      zIndex: 20, maxWidth: "400px", margin: "0 auto", background: "var(--paper)",
      color: "var(--ink)", padding: "18px 16px", border: "1px solid var(--ink)" });
    const h = el("p", "c", "종 목 추 가");
    h.style.cssText = "letter-spacing:.12em;margin:0 0 10px";
    wrap.append(h);

    const sel = el("select");
    sel.style.cssText = "width:100%;background:var(--paper-2);border:1px solid var(--line);" +
      "padding:9px 10px;font-family:var(--disp);font-size:1em";
    const byFocus = {};
    opts.forEach((x) => (byFocus[x.focus] = byFocus[x.focus] || []).push(x));
    for (const f of Object.keys(byFocus)) {
      const g = el("optgroup"); g.label = kFocus(f);
      byFocus[f].sort((a, b) => a.name.localeCompare(b.name, "ko")).forEach((x) => {
        const o = el("option", null, x.name + (x.from_history ? "" : " (새 종목)"));
        o.value = x.id; g.append(o);
      });
      sel.append(g);
    }
    wrap.append(sel);

    const acts = el("div", "acts");
    const no = el("button", null, "취소");
    const ok = el("button", "pri", "추가");
    const close = () => { wrap.remove(); bg.remove(); };
    no.onclick = close;
    ok.onclick = () => {
      const ex = byId(sel.value);
      const plan = E.suggestSets(ex.id, S.history, null);
      S.rec.slots.push({ label: "직접 추가", exercise: ex, plan, daysSince: 999, alternatives: [] });
      S.edits.push(toEdit({ exercise: ex, plan }));
      close(); renderToday();
    };
    acts.append(no, ok); wrap.append(acts);

    const bg = el("div");
    Object.assign(bg.style, { position: "fixed", inset: 0, background: "#0e1116cc", zIndex: 19 });
    bg.onclick = close;
    document.body.append(bg, wrap);
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
    if (S.tab === "log") renderLog();
    if (S.tab === "trend") renderTrend();
  });

  $("#reroll").onclick = () => { S.salt = String(Date.now()); buildRec(); renderToday(); };
  $("#save").onclick = saveToday;
  $("#addEx").onclick = addExercise;

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
