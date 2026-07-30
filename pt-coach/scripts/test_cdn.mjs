import fs from 'fs'; import { JSDOM } from 'jsdom';
const html = fs.readFileSync('index.html','utf8')
  .replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'')
  .replace(/<link rel="stylesheet"[^>]*>/,'');
const dom = new JSDOM(html,{runScripts:'outside-only',url:'http://localhost:8000/'});
const w = dom.window;
w.fetch = async (p) => { const f=String(p).replace(/^\.?\//,'');
  return fs.existsSync(f)?{ok:true,json:async()=>JSON.parse(fs.readFileSync(f,'utf8'))}
    :{ok:false,json:async()=>{throw new Error('404')}}; };
w.localStorage.setItem('pt_pinned','[]');
// 유효한 설정 + CDN 미로드 (window.supabase 없음)
w.PT_CONFIG = { SUPABASE_URL:'https://abc.supabase.co', SUPABASE_PUBLISHABLE_KEY:'sb_publishable_T' };
w.eval(fs.readFileSync('engine.js','utf8'));
let threw=null;
try{ w.eval(fs.readFileSync('app.js','utf8')); }catch(e){ threw=e.message; }
await new Promise(r=>setTimeout(r,400));
const boot=w.document.querySelector('#boot');
console.log('예외 발생:', threw || '없음');
console.log('boot 영역 표시:', !boot.classList.contains('hidden'));
console.log('안내 메시지:', boot.textContent.trim().slice(0,60));
const ok = !threw && /라이브러리를 못 불러왔어요/.test(boot.textContent);
console.log(ok ? '\n✅ CDN 실패를 사용자에게 안내함' : '\n❌ 빈 화면으로 죽음');
process.exit(ok?0:1);
