# -*- coding: utf-8 -*-
import re, json, collections
from catalog import RULES, EXTRAS, FOCUS, PATTERN_KO

parsed = json.load(open('parsed.json'))

def match(name):
    for pat, eid, disp, focus, patt, equip in RULES:
        if re.search(pat, name):
            return eid, disp, focus, patt, equip
    return None

cat, unmatched = {}, []
for eid, disp, focus, patt, equip in EXTRAS:
    cat[eid] = {"id": eid, "name": disp, "focus": focus, "pattern": patt,
                "equipment": equip, "from_history": False}

workouts = []
for s in parsed:
    exs = []
    for e in s["exercises"]:
        m = match(e["name"])
        if not m:
            unmatched.append((s["date"], e["name"])); continue
        eid, disp, focus, patt, equip = m
        c = cat.setdefault(eid, {"id": eid, "name": disp, "focus": focus,
                                 "pattern": patt, "equipment": equip, "from_history": True})
        c["from_history"] = True
        sets = [x for x in e["sets"] if x["reps"]]
        exs.append({"exercise_id": eid, "sets": [
            {"weight": x["weight"], "reps": x["reps"], "count": x["count"],
             "per_side": x["per_side"]} for x in sets], "note": e["raw"]})
    # 세션 부위: 컨디셔닝 제외 최다 부위
    votes = collections.Counter(cat[x["exercise_id"]]["focus"] for x in exs
                                if cat[x["exercise_id"]]["pattern"] != "conditioning")
    workouts.append({"date": s["date"], "focus": votes.most_common(1)[0][0] if votes else "lower",
                     "exercises": exs, "source": "pt"})

json.dump({"focus_labels": FOCUS, "pattern_labels": PATTERN_KO,
           "exercises": sorted(cat.values(), key=lambda x: (x["focus"], x["pattern"], x["id"]))},
          open('../data/exercises.json','w'), ensure_ascii=False, indent=1)
json.dump(workouts, open('../data/workouts.json','w'), ensure_ascii=False, indent=1)

print("매칭 실패:", unmatched or "없음")
print("카탈로그 종목 수:", len(cat), "(기록 기반", sum(1 for c in cat.values() if c["from_history"]), ")")
print("\n부위 분포:", collections.Counter(w["focus"] for w in workouts))
print("\n세션별 부위:")
for w in workouts: print(" ", w["date"], FOCUS[w["focus"]], f"({len(w['exercises'])}종목)")
