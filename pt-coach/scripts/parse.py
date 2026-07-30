# -*- coding: utf-8 -*-
"""카카오톡 PT 로그 -> 구조화 JSON"""
import re, json, unicodedata

SRC = "/sessions/intelligent-friendly-babbage/mnt/uploads/Talk_2026.6.5 21:40-1.txt"

# --- 오타 정규화 (세트/개/키로 표기 흔들림) ---
TYPO = [
    (r'세트|세투|시트|세츠|세츠|셑|세크|세쿠|시투|세크|세프|세쿠|셋트|시트|세토|세투', '세트'),
    (r'키로|카로|티로|키롷|키뢰|키로그램|kg|KG', '키로'),
    (r'갸|개씩|게', '개'),
]
def fix(s):
    s = unicodedata.normalize('NFC', s)
    s = s.replace('세투','세트').replace('시트','세트').replace('세츠','세트').replace('셑','세트')
    s = s.replace('세크','세트').replace('세쿠','세트').replace('시투','세트').replace('세토','세트')
    s = s.replace('셋트','세트').replace('세프','세트').replace('시크','세트').replace('세셋','세트')
    s = s.replace('카로','키로').replace('티로','키로').replace('키뢰','키로')
    s = s.replace('로유','로우').replace('더운','다운').replace('인크라인','인클라인')
    s = s.replace('담벨','덤벨').replace('스큐ㅓ트','스쿼트').replace('스뭐트','스쿼트')
    s = s.replace('스쿠ㅏ트','스쿼트').replace('들루트','글루트').replace('원레스','원레그')
    s = s.replace('숄더프리스','숄더프레스').replace('3웡','3월')
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

lines = open(SRC, encoding='utf-8').read().split('\n')
hdr = re.compile(r'^(\d{4})\. (\d+)\. (\d+)\. (오전|오후)')
idx = [i for i, l in enumerate(lines) if re.search(r'운동\s?입니다', l)]

sessions = []
for k, i in enumerate(idx):
    m = hdr.match(lines[i])
    date = f"{m.group(1)}-{int(m.group(2)):02d}-{int(m.group(3)):02d}"
    end = idx[k+1] if k+1 < len(idx) else len(lines)
    body, prev_num = [], None
    for l in lines[i+1:end]:
        if hdr.match(l):
            break
        l = l.strip()
        if not l or '고생하' in l:
            continue
        # "1." 로 시작하는 새 종목인지, 이전 종목의 줄바꿈 연속인지 판별
        nm = re.match(r'^(\d+)\s*[.,]?\s*(.+)$', l)
        if nm and int(nm.group(1)) <= 12 and (prev_num is None or int(nm.group(1)) == prev_num + 1):
            prev_num = int(nm.group(1))
            body.append(fix(nm.group(2)))
        elif body:
            body[-1] = fix(body[-1] + ' ' + l)
    if body:
        sessions.append({"date": date, "raw": body})

print(json.dumps(sessions, ensure_ascii=False, indent=1))
