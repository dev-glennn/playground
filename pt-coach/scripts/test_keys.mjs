import fs from 'fs'; import {JSDOM} from 'jsdom';
const html=fs.readFileSync('index.html','utf8').replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'');
async function run(cfgJs, label){
  const dom=new JSDOM(html,{runScripts:'outside-only',url:'http://localhost:8000/'});
  const w=dom.window; const errs=[];
  w.fetch=async p=>{const f=String(p).replace(/^\.?\//,'');
    return fs.existsSync(f)?{ok:true,json:async()=>JSON.parse(fs.readFileSync(f,'utf8'))}:{ok:false,json:async()=>{throw new Error('404')}}; };
  w.localStorage.setItem('pt_pinned','[]');
  w.supabase={createClient:(u,k)=>{w.__key=k; return {auth:{onAuthStateChange(){},getSession:async()=>({data:{}})}}}};
  try{ w.eval(cfgJs); w.eval(fs.readFileSync('engine.js','utf8')); w.eval(fs.readFileSync('app.js','utf8')); }catch(e){errs.push(e.message)}
  await new Promise(r=>setTimeout(r,400));
  const d=w.document;
  const boot=d.querySelector('#boot');
  const state = !boot.classList.contains('hidden') && /위험/.test(boot.textContent) ? '차단됨(경고)'
    : d.querySelector('#auth') && !d.querySelector('#auth').classList.contains('hidden') ? '로그인 화면'
    : !d.querySelector('#app').classList.contains('hidden') ? '데모 모드' : '알수없음';
  console.log(label.padEnd(30), '→', state, w.__key?`(키 전달: ${String(w.__key).slice(0,22)}…)`:'', errs.length?'ERR '+errs:'');
}
await run(`window.PT_CONFIG={SUPABASE_URL:"https://abc.supabase.co",SUPABASE_PUBLISHABLE_KEY:"sb_publishable_AAAAAAAAAAAAAAAAAAAA"}`, 'publishable 키 (새 방식)');
await run(`window.PT_CONFIG={SUPABASE_URL:"https://abc.supabase.co",SUPABASE_ANON_KEY:"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaa.bbb"}`, 'anon 키 (레거시, 하위호환)');
await run(`window.PT_CONFIG={SUPABASE_URL:"https://abc.supabase.co",SUPABASE_PUBLISHABLE_KEY:"sb_secret_DANGEROUS"}`, 'sb_secret 키 (위험)');
await run(fs.readFileSync('config.js','utf8'), '미설정 (배포된 config.js)');
