const http=require('http');
const {spawn}=require('child_process');
const base='http://127.0.0.1:8787';
const unique=`qa_${Date.now()}@example.com`;
let proc;
function req(path,options={}){return new Promise((resolve,reject)=>{const u=new URL(base+path);const r=http.request({hostname:u.hostname,port:u.port,path:u.pathname+u.search,method:options.method||'GET',headers:options.headers||{}},res=>{let b='';res.on('data',c=>b+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:b}))});r.on('error',reject);if(options.body)r.write(options.body);r.end()})}
(async()=>{try{
 proc=spawn(process.execPath,['server/server.js'],{stdio:['ignore','pipe','pipe']});await new Promise(r=>setTimeout(r,700));
 const out=[];const check=(n,v)=>{out.push([n,!!v]);if(!v)throw new Error('FAIL '+n)};
 check('health',(await req('/api/health')).status===200);
 check('root',(await req('/')).status===200);
 const js=await req('/app.js');check('app.js',js.status===200&&js.body.includes('window.App=App')&&js.body.includes('requestJson'));
 const reg=await req('/api/auth/register',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'QA',email:unique,password:'secret123'})});check('register',reg.status===201);
 const cookie=reg.headers['set-cookie']?.[0]?.split(';')[0];check('session cookie',!!cookie);
 const me=await req('/api/me',{headers:{Cookie:cookie}});check('me',me.status===200);
 const jobs=await req('/api/jobs',{headers:{Cookie:cookie}});check('jobs',jobs.status===200&&JSON.parse(jobs.body).jobs.length>0);
 const day=await req('/api/simulate/day',{method:'POST',headers:{Cookie:cookie}});check('simulate day',day.status===200);
 const logout=await req('/api/auth/logout',{method:'POST',headers:{Cookie:cookie}});check('logout',logout.status===200);
 const revoked=await req('/api/me',{headers:{Cookie:cookie}});check('session revoked',revoked.status===401);
 console.log(out.map(([n,v])=>`${v?'PASS':'FAIL'} ${n}`).join('\n'));
 process.exit(0);
}catch(e){console.error(e);process.exitCode=1}finally{setTimeout(()=>proc?.kill(),50)}})();
