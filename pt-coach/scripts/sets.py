# -*- coding: utf-8 -*-
"""raw 종목 줄 -> {name, sets:[{weight,reps,count}], per_side, bodyweight}"""
import re, json

NUM = r'\d+(?:\.\d+)?'

def parse_line(line):
    s = line
    per_side = '씩' in s and re.search(r'%s\s*키로\s*씩' % NUM, s) is not None
    assisted = '풀업' in s
    # 종목명: 첫 숫자+키로 / 첫 숫자+개 앞까지
    mcut = re.search(r'(%s\s*(?:키로|개)|무게없|맨몸)' % NUM, s)
    name = (s[:mcut.start()] if mcut else s).strip(' ,/()')
    name = re.sub(r'\s*\(\s*$', '', name).strip()

    tail = s[mcut.start():] if mcut else ''
    sets = []
    # 토큰: [무게그룹] [reps개] [n세트]
    # 1) "A,B,C키로 R개 N세트씩"  -> 각각 N세트
    # 2) "W키로 R개 N세트" 반복
    # 3) "W키로 R개  W2키로 R개 ... 1세트씩"
    chunks = re.findall(
        r'(?:(무게없이|무게없음|맨몸)|((?:%s\s*[,/]\s*)*%s)\s*키로(씩)?)?\s*[^0-9]{0,14}?(%s)\s*개(?:씩)?\s*(?:[^0-9]{0,10}?(%s)\s*세트(씩)?)?' % (NUM, NUM, NUM, NUM),
        tail)
    pending = []
    for bw, wgrp, side1, reps, cnt, each in chunks:
        if not (bw or wgrp) and not reps:
            continue
        weights = [None] if bw else [float(x) for x in re.split(r'[,/]', wgrp) if x.strip()] if wgrp else [None]
        for w in weights:
            pending.append({"weight": w, "reps": int(float(reps)) if reps else None,
                            "count": int(float(cnt)) if cnt else None,
                            "per_side": bool(side1) or per_side})
        if cnt:
            n = int(float(cnt))
            if each:   # "1세트씩" -> 앞의 무게 없는 항목 전부에 적용
                for p in pending:
                    if p["count"] is None: p["count"] = n
            for p in pending:
                if p["count"] is None: p["count"] = n
            sets.extend(pending); pending = []
    sets.extend(p for p in pending if p["reps"])
    for p in sets:
        if p["count"] is None: p["count"] = 1
    return {"name": name, "sets": sets, "assisted": assisted, "raw": line}

if __name__ == "__main__":
    data = json.load(open('raw_sessions.json'))
    out, bad = [], []
    for s in data:
        exs = []
        for r in s["raw"]:
            p = parse_line(r)
            if not p["sets"]: bad.append((s["date"], r))
            exs.append(p)
        out.append({"date": s["date"], "exercises": exs})
    json.dump(out, open('parsed.json','w'), ensure_ascii=False, indent=1)
    print("무게/세트 추출 실패:", len(bad))
    for d,r in bad: print("  ", d, r)
