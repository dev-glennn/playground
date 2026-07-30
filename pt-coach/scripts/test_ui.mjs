import fs from 'fs';
import { JSDOM } from 'jsdom';

const html = fs.readFileSync('index.html','utf8')
  .replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'')
  .replace(/<link rel="stylesheet"[^>]*>/,'');
const dom = new JSDOM(html, { runScripts:'outside-only', url:'http://localhost:8000/', pretendToBeVisual:true });
const w = dom.window;
const errors=[];
w.addEventListener('error', e=>errors.push('window.error: '+e.message));
w.fetch = async (p) => {
  const f = String(p).replace(/^\.?\//,'');
  if(!fs.existsSync(f)) return { ok:false, json:async()=>{throw new Error('404 '+f)} };
  return { ok:true, json: async()=> JSON.parse(fs.readFileSync(f,'utf8')) };
};
w.localStorage.setItem('pt_pinned','[]');
const run = (f) => { try{ w.eval(fs.readFileSync(f,'utf8')); }catch(e){ errors.push(f+': '+e.message); } };
// 실제 config.js 대신 미설정 값을 넣어 데모 모드 렌더링을 검사한다
w.PT_CONFIG = { SUPABASE_URL:'https://여기에-프로젝트-ID.supabase.co', SUPABASE_PUBLISHABLE_KEY:'여기에-키' };
run('engine.js'); run('app.js');
await new Promise(r=>setTimeout(r,600));

const d = w.document, q = s => d.querySelector(s), qa = s => [...d.querySelectorAll(s)];
const vis = s => q(s) && !q(s).classList.contains('hidden');
const click = n => n && n.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));

console.log('데모 모드 진입:', vis('#app') ? 'OK' : '실패');
console.log('영수증 용지:', q('.paper') ? 'OK' : '실패', '| 톱니/바코드:', q('.barcode')?'OK':'실패');
console.log('전표번호:', q('#mNo').textContent, '| 바코드번호:', q('#barnum').textContent);
console.log('부위 스탬프:', qa('#focuspick button').length, '개 | 선택:', q('#focuspick button[aria-pressed=true] b').textContent);
console.log('종목:', qa('.item').length, '| 세트 줄:', qa('.setline').length, '| 숫자 입력칸:', qa('input.num').length);
console.log('구분선:', qa('#slots hr.rule').length, '| 근거 문장:', qa('.note').length);
console.log('저장 버튼 비활성(데모):', q('#save').disabled ? 'OK':'실패');

console.log('\n--- 첫 종목 ---');
const it = q('.item');
console.log(' ', it.querySelector('.no').textContent, it.querySelector('.nm').textContent);
console.log('  태그:', it.querySelector('.tag').textContent);
console.log('  세트:', [...it.querySelectorAll('.setline')].map(tr=>{
  const lbl=tr.querySelector('.lbl').textContent;
  const inp=[...tr.querySelectorAll('input.num')].map(i=>i.value);
  const bw=tr.querySelector('.bw');
  return `${lbl} ${bw?bw.textContent:inp[0]+'kg'}×${inp[inp.length-1]}회 ${tr.querySelector('.box').textContent}`;
}).join(' | '));
console.log('  근거:', it.querySelector('.note').textContent);

console.log('\n--- 합계 ---');
qa('#totals .total').forEach(t=>console.log('  ', t.children[0].textContent, '=', t.children[1].textContent));

console.log('\n--- 상호작용 ---');
const t0 = q('.item .nm').textContent;
click(qa('.item .exfoot button')[0]);
console.log('🔄 교체:', q('.item .nm').textContent !== t0 ? `OK (${t0} → ${q('.item .nm').textContent})` : '변화 없음');

const volBefore = q('#totals .total.big').children[1].textContent;
const line = qa('.setline').find(l=>l.querySelector('.box'));
click(line.querySelector('.box'));
console.log('체크:', line.querySelector('.box').textContent, '| done:', line.classList.contains('done'),
  '| 총세트 표기:', q('#totals .total:nth-child(2)').children[1].textContent);
console.log('완료 볼륨 행 추가:', qa('#totals .total').length===4?'OK':'없음');
click(line.querySelector('.box'));
console.log('체크 해제:', line.querySelector('.box').textContent);

// 무게 수정 → 합계 재계산
const wi = qa('input.num')[0];
wi.value = '99'; wi.dispatchEvent(new w.Event('input',{bubbles:true}));
console.log('무게 99로 수정 → 총 볼륨:', volBefore, '→', q('#totals .total.big').children[1].textContent);

click(qa('#focuspick button')[1]);
console.log('부위 변경 →', q('#focuspick button[aria-pressed=true] b').textContent);
click(q('#reroll'));
console.log('🎲 리롤 후 종목:', qa('.item').length);

click(q('nav.tabs button[data-tab=log]'));
console.log('기록 탭:', qa('#tab-log .log').length, '세션 | 오늘 탭 숨김:', q('#tab-today').classList.contains('hidden')?'OK':'실패');
click(q('nav.tabs button[data-tab=trend]'));
console.log('추이 탭:', qa('#tab-trend .trend').length, '종목 |', qa('#tab-trend svg.spark path').length, '스파크라인');
click(q('nav.tabs button[data-tab=today]'));

click(q('#addEx'));
console.log('종목 추가 모달:', qa('select optgroup option').length, '선택지');
click(qa('.acts button')[qa('.acts button').length-2]);

click(qa('.item .exfoot button')[1]);
console.log('📌 핀:', w.localStorage.getItem('pt_pinned'), '→ 첫 종목:', q('.item .nm').textContent, q('.item .pin')?'📌표시OK':'표시없음');

// 글자 크기
click(qa('#zoom button')[2]);
console.log('글자 크기 크게 →', d.documentElement.style.getPropertyValue('--fs'), '| 저장:', w.localStorage.getItem('pt_fs'));

console.log('\n에러:', errors.length ? errors : '없음');
process.exit(errors.length?1:0);
