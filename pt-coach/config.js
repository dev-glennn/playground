// ============================================================
//  Supabase 연결 정보
//  대시보드 > Project Settings > API Keys 에서 복사해 붙여넣으세요.
//
//  넣어야 하는 키 (둘 중 프로젝트에 있는 것):
//    · sb_publishable_...  ← 2025년 11월 이후 만든 프로젝트
//    · eyJ... (anon / public) ← 그 전에 만든 프로젝트의 레거시 키
//
//  이 두 값은 public repo에 올라가도 괜찮습니다.
//  브라우저에 노출되는 걸 전제로 만들어진 공개 키이고,
//  실제 데이터 접근은 schema.sql 의 RLS 정책이 막습니다.
//
//  ⚠️ 절대 넣지 말 것:  sb_secret_...  또는  service_role
//     이 키들은 RLS를 무시합니다.
//
//  URL은 프로젝트 루트만 넣습니다 → https://xxxx.supabase.co
//  뒤에 /rest/v1 같은 경로가 붙으면 "Invalid path specified in request URL"
//  오류가 납니다. (앱이 자동으로 떼어내지만, 처음부터 루트만 넣는 게 좋습니다)
// ============================================================
window.PT_CONFIG = {
  SUPABASE_URL: "https://hrejyiqxudyqnykllupo.supabase.co",
  SUPABASE_PUBLISHABLE_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyZWp5aXF4dWR5cW55a2xsdXBvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzODc0NDUsImV4cCI6MjEwMDk2MzQ0NX0.aqXlY-KP29YLqM5XODEOAPZ9fUO4Psti3ILBat_g11A",
};
