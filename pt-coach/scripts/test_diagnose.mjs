import fs from 'fs'; import { JSDOM } from 'jsdom';

const html = fs.readFileSync('diagnose.html','utf8')
  .replace(/<script src="https:\/\/cdn[^"]*"><\/script>/,'')
  .replace(/<script src="config\.js"><\/script>/,'');

// 시나리오별 가짜 Supabase
function mkClient(sc){
  const R = (data,error,count)=>({data,error,count});
  return {
    auth:{
      signOut: async()=>({}),
      signInWithPassword: async()=> sc.loginErr
        ? R(null,sc.loginErr)
        : R({user:{id:'11111111-2222-3333-4444-555555555555',email:'me@example.com'}},null),
    },
    from(table){
      const q = {
        _head:false,
        select(_c,o){ if(o&&o.head) this._head=true; return this; },
        limit(){ return this; },
        eq(){ return this; },
        single(){ return this; },
        delete(){ return this; },
        insert(){ this._ins=true; return this; },
        then(res){
          let out;
          if(this._ins){
            out = table==='workouts'
              ? (sc.insErr? R(null,sc.insErr) : R({id:'w1'},null))
              : (sc.insSetErr? R(null,sc.insSetErr) : R({},null));
          } else if(!sc.loggedIn){
            out = sc.anon;   // 익명 단계
          } else if(table==='workouts'){
            out = sc.mine;
          } else {
            out = R(null,null,sc.setCount);
          }
          res(out); return Promise.resolve(out);
        },
      };
      // 로그인 이후를 구분하기 위한 플래그
      return q;
    },
  };
}

const SCEN = [
  { name:'테이블 없음',      anon:{data:null,error:{message:'relation "public.workouts" does not exist',code:'42P01'}} },
  { name:'키 거부',          anon:{data:null,error:{message:'Invalid API key',code:'401'}} },
  { name:'RLS 미적용(위험)',  anon:{data:[{id:'x'}],error:null} },
  { name:'로그인 실패-미확인', anon:{data:[],error:null}, loginErr:{message:'Email not confirmed'} },
  { name:'로그인 실패-자격',   anon:{data:[],error:null}, loginErr:{message:'Invalid login credentials'} },
  { name:'내 기록 0건',      anon:{data:[],error:null}, loggedInAfter:true, mine:{data:[],error:null} },
  { name:'쓰기 RLS 거부',     anon:{data:[],error:null}, loggedInAfter:true,
    mine:{data:Array.from({length:34},()=>({id:'a',source:'pt'})),error:null}, setCount:288,
    insErr:{message:'new row violates row-level security policy for table "workouts"'} },
  { name:'전부 정상',        anon:{data:[],error:null}, loggedInAfter:true,
    mine:{data:Array.from({length:34},()=>({id:'a',source:'pt'})),error:null}, setCount:288 },
];

for(const sc of SCEN){
  const dom = new JSDOM(html,{runScripts:'outside-only',url:'http://localhost:8000/'});
  const w = dom.window;
  w.PT_CONFIG = { SUPABASE_URL:'https://abc.supabase.co', SUPABASE_PUBLISHABLE_KEY:'sb_publishable_TEST' };
  const state = {...sc, loggedIn:false};
  w.supabase = { createClient: ()=> {
    const c = mkClient(state);
    const origLogin = c.auth.signInWithPassword;
    c.auth.signInWithPassword = async(...a)=>{ const r = await origLogin(...a); if(!r.error) state.loggedIn=true; return r; };
    return c;
  }};
  w.eval(fs.readFileSync('diagnose.html','utf8').match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1]);
  w.document.querySelector('#email').value='me@example.com';
  w.document.querySelector('#pw').value='secret123';
  w.document.querySelector('#run').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  await new Promise(r=>setTimeout(r,150));
  const steps=[...w.document.querySelectorAll('.step')].map(s=>s.className.replace('step ','')+':'+s.querySelector('.t').textContent.trim());
  const v=w.document.querySelector('.verdict');
  console.log('■', sc.name);
  steps.forEach(s=>console.log('   ', s));
  console.log('    판정 →', v? (v.className.includes('good')?'정상':'문제')+' / '+v.querySelector('b').textContent : '(없음)');
}

// 비밀 키 시나리오
const dom = new JSDOM(html,{runScripts:'outside-only',url:'http://localhost:8000/'});
const w = dom.window;
w.PT_CONFIG={SUPABASE_URL:'https://abc.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_secret_OOPS'};
w.supabase={createClient:()=>({})};
w.eval(fs.readFileSync('diagnose.html','utf8').match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1]);
console.log('\n■ secret 키를 넣은 경우');
console.log('    ', w.document.querySelector('.step').className, '/', w.document.querySelector('.verdict b').textContent);
console.log('     진단 버튼 비활성:', w.document.querySelector('#run').disabled ? 'OK' : '실패');
// 레거시 anon JWT 판별
const jwt='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({role:'anon'})).toString('base64')+'.sig';
const d2=new JSDOM(html,{runScripts:'outside-only',url:'http://localhost:8000/'}); const w2=d2.window;
w2.PT_CONFIG={SUPABASE_URL:'https://abc.supabase.co',SUPABASE_ANON_KEY:jwt};
w2.supabase={createClient:()=>({})};
w2.eval(fs.readFileSync('diagnose.html','utf8').match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1]);
console.log('\n■ 레거시 anon JWT 판별:', w2.document.querySelector('#keyinfo').textContent.includes('role=anon')?'OK':'실패');
const jwt2='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({role:'service_role'})).toString('base64')+'.sig';
const d3=new JSDOM(html,{runScripts:'outside-only',url:'http://localhost:8000/'}); const w3=d3.window;
w3.PT_CONFIG={SUPABASE_URL:'https://abc.supabase.co',SUPABASE_ANON_KEY:jwt2};
w3.supabase={createClient:()=>({})};
w3.eval(fs.readFileSync('diagnose.html','utf8').match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1]);
console.log('■ 레거시 service_role JWT 차단:', w3.document.querySelector('#run').disabled?'OK':'실패');

// '내 기록 0건' 시나리오에서 UID가 채워진 수정 SQL이 나오는지
const d4=new JSDOM(html,{runScripts:'outside-only',url:'http://localhost:8000/'}); const w4=d4.window;
w4.PT_CONFIG={SUPABASE_URL:'https://abc.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_T'};
const st={anon:{data:[],error:null},mine:{data:[],error:null},loggedIn:false};
w4.supabase={createClient:()=>{const c=mkClient(st);const o=c.auth.signInWithPassword;
  c.auth.signInWithPassword=async(...a)=>{const r=await o(...a);if(!r.error)st.loggedIn=true;return r;};return c;}};
w4.eval(fs.readFileSync('diagnose.html','utf8').match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1]);
w4.document.querySelector('#email').value='me@example.com';
w4.document.querySelector('#pw').value='secret123';
w4.document.querySelector('#run').dispatchEvent(new w4.MouseEvent('click',{bubbles:true}));
await new Promise(r=>setTimeout(r,150));
const pre=[...w4.document.querySelectorAll('#out pre')].pop();
console.log('\n■ 0건일 때 생성되는 수정 SQL\n');
console.log(pre? pre.textContent.split('\n').map(l=>'    '+l).join('\n') : '    (없음) 실패');
