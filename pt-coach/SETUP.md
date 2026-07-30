# 설치 순서

전체 20~25분. 순서대로만 따라가면 됩니다.

---

## 0. 먼저 그냥 열어보기 (0분)

Supabase 설정 전에도 추천이 잘 나오는지 볼 수 있습니다.

```bash
cd pt-coach
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000` → **미리보기 모드**로 PT 기록 34세션 기반 추천이 보입니다.
(`file://`로 직접 열면 `fetch`가 막혀서 안 됩니다. 반드시 위 서버를 통해서 여세요.)

마음에 들면 아래로 진행합니다.

---

## 1. Supabase 프로젝트 만들기 (5분)

1. <https://supabase.com> 접속 → **Start your project** → GitHub 계정으로 로그인
2. **New project**
   - Name: `pt-coach` (아무거나)
   - Database Password: 아무거나 정하고 **어딘가 적어두기** (나중에 필요할 수 있음)
   - Region: `Northeast Asia (Seoul)` — 서울이 제일 빠릅니다
3. **Create new project** → 프로비저닝 1~2분 대기

## 2. 테이블 만들기 (2분)

1. 왼쪽 사이드바 **SQL Editor** → **New query**
2. 이 저장소의 `supabase/schema.sql` **전체 내용**을 복사해 붙여넣기
3. 우측 아래 **Run** (또는 `Cmd/Ctrl + Enter`)
4. `Success. No rows returned` 이 나오면 성공

## 3. 이메일 확인 끄기 (1분) — 권장

혼자 쓰는 앱이라 가입 확인 메일을 받을 필요가 없습니다.

1. **Authentication** → **Sign In / Providers** → **Email**
2. **Confirm email** 토글을 **끄기** → **Save**

> 이걸 끄지 않으면 가입 후 메일의 링크를 눌러야 로그인됩니다. 그것도 괜찮습니다.

## 4. 연결 정보 넣기 (2분)

### 4-1. Project URL

**Project Settings**(톱니바퀴) → **Data API** → **Project URL**
→ `https://xxxxxxxx.supabase.co`

### 4-2. 공개 키

**Project Settings** → **API Keys**

여기서 프로젝트가 어느 세대인지에 따라 화면이 다릅니다.

**새 프로젝트 (2025년 11월 이후 생성 — 지금 만들면 여기에 해당)**

`API Keys` 탭에 `default` 라는 이름의 키가 있습니다. **Publishable key** 를 복사하세요.

```
sb_publishable_xxxxxxxxxxxxxxxxxxxxxx
```

같은 화면의 **Secret keys** 섹션에 있는 `sb_secret_...` 은 건드리지 마세요.

**예전 프로젝트**

`Legacy API Keys` 탭 → **anon** / **public** 키. `eyJ...` 로 시작하는 긴 JWT입니다.

### 4-3. config.js에 붙여넣기

```js
window.PT_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxx.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_xxxxxxxxxxxx",
};
```

둘 중 무엇이든 같은 자리에 넣으면 됩니다. 앱이 알아서 처리합니다.

> ✅ **이 키는 공개 저장소에 올려도 됩니다.** publishable 키(구 anon 키)는 브라우저에 내려가는 걸 전제로 만들어진 공개 키이고, 권한 수준이 동일합니다. 실제 접근 통제는 2단계에서 넣은 RLS 정책이 담당합니다.
>
> ⚠️ **`sb_secret_...` 또는 `service_role` 키는 절대 넣지 마세요.** 이 키들은 RLS를 무시합니다. 공개 저장소에 올라가면 누구나 데이터를 다 읽고 지울 수 있습니다. 앱이 이런 키를 감지하면 실행을 거부하고 경고를 띄우지만, 그 전에 이미 커밋했다면 대시보드에서 **즉시 폐기(Revoke)** 하세요.

### 어떤 키인지 헷갈릴 때

| 시작 문자열 | 정체 | 커밋 |
|---|---|---|
| `sb_publishable_` | 새 공개 키 | ✅ 괜찮음 |
| `eyJ...` (role: anon) | 레거시 공개 키 | ✅ 괜찮음 |
| `sb_secret_` | 새 비밀 키 | ❌ 절대 안 됨 |
| `eyJ...` (role: service_role) | 레거시 비밀 키 | ❌ 절대 안 됨 |

`eyJ...` 키가 어느 쪽인지 모르겠으면 <https://jwt.io> 에 붙여넣어 `"role"` 값을 확인하세요. `anon` 이어야 합니다.

> 📌 레거시 `anon` / `service_role` 키는 Supabase가 단계적으로 폐지 중입니다. 지금 새로 만들면 처음부터 `sb_publishable_` 키가 나오므로 신경 쓸 일이 없습니다.

## 5. 계정 만들기 (1분) — 순서 중요

1. 다시 `http://localhost:8000` 새로고침
2. 로그인 화면에서 이메일 + 비밀번호(6자 이상) 입력 → **계정 만들기**
3. 로그인되면 완료 (3단계를 건너뛰었으면 메일 확인 후 **로그인**)

> ⚠️ **6단계보다 반드시 먼저 하세요.** 시드 스크립트가 계정을 찾아서 데이터를 붙이기 때문에,
> 계정이 없으면 데이터 소유자가 없어서 나중에 앱에서 아무것도 안 보입니다.

## 6. PT 기록 34세션 넣기 (2분)

1. **SQL Editor** → **New query**
2. `supabase/seed.sql` 전체를 붙여넣고 **Run**
3. `시드 완료` 메시지가 나오면 성공

> 이 스크립트는 가장 먼저 만든 계정을 자동으로 찾아서 그 계정에 데이터를 넣습니다.
>
> 여러 번 실행해도 안전합니다 — `source='pt'` 인 기존 데이터를 지우고 다시 넣기 때문에,
> 직접 기록한 개인운동(`source='self'`)은 지워지지 않습니다.

## 6-b. 유산소 테이블 추가 (1분)

1. **SQL Editor** → **New query**
2. `supabase/migration_cardio.sql` 전체를 붙여넣고 **Run**
3. `Success. No rows returned` 이 나오면 성공

> 이걸 실행하지 않으면 유산소 칸에 입력해도 저장할 때 `relation "cardio_sets" does not exist`
> 오류가 납니다. 여러 번 실행해도 안전합니다.

## 7. 로컬에서 전부 검증 (2분) — push 전 필수

`http://localhost:8000/diagnose.html` 를 열고, 5단계에서 만든 이메일·비밀번호를 넣고 **진단 시작**.

6단계를 순서대로 확인합니다.

| 단계 | 확인 내용 |
|---|---|
| 키 형식 | `sb_publishable_` 또는 role=anon 인지. secret 키면 즉시 차단 |
| 익명 접근 | 로그인 없이 데이터가 안 보이는지 — **이게 public repo 안전성의 핵심** |
| 로그인 | 계정이 실제로 되는지 |
| 내 계정 기록 | PT 34세션이 내 `user_id`에 붙어 있는지 |
| 세트 | 288행인지 |
| 쓰기 | 저장이 되는지 (테스트 행을 넣고 바로 지움) |

**전부 ✅ 이고 "전부 정상입니다"가 나와야 push하세요.** 실패한 단계마다 원인과 수정 SQL이 그 자리에 표시됩니다.

그다음 `http://localhost:8000` 에서 실제로 한번 써보세요. 기록 탭에 34세션이 보이고, 세트 하나 체크해서 저장했다가 새로고침하면 오늘 날짜가 `개인운동`으로 남아 있어야 합니다.

### publishable 키는 안 되고 secret 키는 되는 것처럼 보일 때

이건 거의 항상 **키 문제가 아니라 데이터 소유자 문제**입니다.

secret 키는 RLS를 무시해서 *모든 계정의 행*을 반환합니다. publishable 키는 RLS를 통과하므로 `user_id`가 내 계정인 행만 반환합니다. 두 결과가 다르다는 건 **PT 데이터가 내 계정에 붙어 있지 않다**는 뜻입니다 — 보통 5단계(계정 만들기)보다 6단계(시드)를 먼저 실행했을 때 그렇습니다.

`diagnose.html`이 이 경우를 잡아내고, 내 `user_id`가 채워진 수정 SQL을 만들어 줍니다. 직접 하려면 `supabase/troubleshoot.sql`의 1·2번으로 상태를 확인하고 5-A로 옮기세요.

**secret 키를 config.js에 넣는 것으로 해결하지 마세요.** 공개 저장소에 올라가면 누구나 데이터를 읽고 지울 수 있습니다. 이미 커밋했다면 대시보드에서 즉시 **Revoke** 하세요 — 커밋을 되돌려도 이력에 남아 있으면 노출된 상태입니다.

## 8. GitHub Pages에 올리기 (5분)

```bash
cd pt-coach
git init
git add .
git commit -m "PT coach"
git branch -M main
git remote add origin https://github.com/<내아이디>/pt-coach.git
git push -u origin main
```

1. GitHub 저장소 → **Settings** → **Pages**
2. **Source**: `Deploy from a branch`
3. **Branch**: `main` / `/ (root)` → **Save**
4. 1~2분 후 `https://<내아이디>.github.io/pt-coach/` 에서 열립니다

### 폰에 앱처럼 설치하기

iPhone Safari에서 위 주소 열기 → 공유 버튼 → **홈 화면에 추가**.
아이콘이 생기고 주소창 없이 전체화면으로 열립니다.

---

## 잘 안 될 때

| 증상 | 원인 / 해결 |
|---|---|
| `Supabase 설정이 필요해요` | `config.js`에 `여기에...`가 남아 있거나 키가 비어 있음 |
| `종목 카탈로그를 불러오지 못했어요` | `file://`로 열었음 → `python3 -m http.server`로 열기 |
| `relation "workouts" does not exist` | 2단계 `schema.sql` 실행 안 됨 |
| `relation "cardio_sets" does not exist` | 6-b단계 `migration_cardio.sql` 실행 안 됨 |
| 로그인은 되는데 기록이 텅 빔 | 6단계 `seed.sql` 실행 안 됨 |
| `Email not confirmed` | 3단계에서 Confirm email 끄기, 또는 메일 링크 클릭 |
| `먼저 앱에서 회원가입...` 오류 | 5단계(계정 만들기)를 6단계보다 먼저 해야 함 |
| 저장 눌렀는데 `new row violates row-level security` | `schema.sql`의 RLS 부분이 일부만 실행됨 → 전체 다시 Run |
| publishable 키는 안 되고 secret 키는 됨 | 데이터가 내 계정에 없음 → 7단계 참고 |
| `Failed to fetch` | Project URL 오타, 또는 프로젝트가 일시 정지 → 대시보드에서 Restore |

무엇이든 막히면 먼저 `diagnose.html` 을 여세요. 어느 단계에서 왜 막혔는지 알려줍니다.

## 데이터 백업

Supabase 무료 티어는 자동 백업이 없습니다. 가끔 SQL Editor에서:

```sql
select w.date, w.focus, w.source, s.exercise_id, s.weight, s.reps, s.set_count, s.per_side
from workouts w join workout_sets s on s.workout_id = w.id
order by w.date, s.seq, s.set_index;
```

실행 후 결과창의 **Download CSV**를 누르면 전체가 내려옵니다. (`supabase/troubleshoot.sql` 6번과 같습니다)

> 무료 프로젝트는 **1주일간 접속이 없으면 일시 정지**됩니다. 대시보드에서 Restore를 누르면 데이터 그대로 살아납니다. 주 2회 운동하면 정지될 일은 거의 없습니다.
