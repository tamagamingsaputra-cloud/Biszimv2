/* GENERATED dari netlify/functions/api.mjs. Jangan diedit di sini. Jalankan: npm run sync:local */
import crypto from './shim/node-crypto.js';
import { getStore } from './shim/blobs.js';
import { VERSION as V730, catchup730, route as v730Route } from './v730.js';
import { route as v731Route } from './v731-creator.js';
import { route as v740Route } from './v740.js';
import { route as v750Route } from './v750-education.js';
import { VERSION as V720, catchup720, route as v720Route, hide720 } from './v720.js';
import { VERSION as V710, route as v710Route } from './v710.js';
import { VERSION as V700, catchup as v700Catchup, route as v700Route } from './v700.js';
import { VERSION as V655, BUSINESS_EXTRA, catchup as v655Catchup, route as v655Route } from './v655.js';

const store = getStore({ name: 'bizsim-state', consistency: 'strong', region: 'ap-southeast-1' });
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30;
const COOKIE = 'bizsim_session';
const jobs = [
  ['job-sales','Junior Sales Associate','Nusantara Retail','Retail',4200000,25,'SMA/SMK'],
  ['job-support','Customer Support','Cipta Digital','Technology',5000000,40,'SMA/SMK'],
  ['job-accountant','Junior Accountant','Artha Konsultan','Finance',5800000,50,'D3/S1'],
  ['job-content','Content Assistant','Kreativa Studio','Media',4500000,35,'SMA/SMK'],
  ['job-ops','Operations Analyst','BizWorks Indonesia','Business',7000000,55,'S1'],
  ['job-marketing','Digital Marketer','PasarKita','Marketing',6500000,50,'D3/S1'],
  ['job-admin','Business Administrator','Mandiri Office','Business',4800000,20,'SMA/SMK'],
  ['job-design','Junior Designer','Ruang Kreatif','Creative',5200000,42,'D3/S1'],
  ['job-tech','Junior Web Developer','Nusa Tech','Technology',7200000,58,'D3/S1'],
  ['job-finance','Financial Analyst','Sinar Finance','Finance',8200000,62,'S1'],
  ['job-procurement','Procurement Officer','Prima Supply','Logistics',6800000,52,'D3/S1'],
  ['job-supervisor','Operations Supervisor','Kota Retail','Retail',9500000,70,'S1']
].map(([id,title,company,industry,salary,min_skill,education])=>({id,title,company,industry,salary,min_skill,education}));


const businessCatalog = [
  {id:'warung',name:'Warung Harian',category:'Retail',startup:2500000,minSkill:20,skill:'sales',monthlyFixed:550000,price:18000,quality:45,capacity:55,image:'warung.svg',description:'Toko kebutuhan harian skala kecil.'},
  {id:'laundry',name:'Laundry Kiloan',category:'Services',startup:6000000,minSkill:25,skill:'management',monthlyFixed:900000,price:28000,quality:48,capacity:65,image:'laundry.svg',description:'Layanan laundry dengan kapasitas harian.'},
  {id:'online-store',name:'Online Store',category:'E-commerce',startup:8500000,minSkill:25,skill:'marketing',monthlyFixed:800000,price:120000,quality:50,capacity:80,image:'online-store.svg',description:'Toko online dengan biaya operasional ringan.'},
  {id:'coffee-shop',name:'Coffee Shop',category:'Food & Beverage',startup:15000000,minSkill:32,skill:'management',monthlyFixed:1800000,price:32000,quality:55,capacity:75,image:'coffee-shop.svg',description:'Kedai kopi dengan layanan dine-in dan take-away.'},
  {id:'barbershop',name:'Barbershop',category:'Services',startup:18000000,minSkill:30,skill:'communication',monthlyFixed:1600000,price:60000,quality:55,capacity:60,image:'barbershop.svg',description:'Jasa potong rambut dan grooming.'},
  {id:'clothing',name:'Clothing Brand',category:'Fashion',startup:25000000,minSkill:35,skill:'marketing',monthlyFixed:2200000,price:185000,quality:58,capacity:90,image:'clothing.svg',description:'Brand pakaian dengan produksi dan pemasaran sendiri.'},
  {id:'workshop',name:'Bengkel Motor',category:'Automotive',startup:40000000,minSkill:38,skill:'problemSolving',monthlyFixed:3200000,price:175000,quality:60,capacity:70,image:'workshop.svg',description:'Servis dan perawatan kendaraan roda dua.'},
  {id:'restaurant',name:'Restaurant',category:'Food & Beverage',startup:75000000,minSkill:45,skill:'management',monthlyFixed:6500000,price:95000,quality:62,capacity:85,image:'restaurant.svg',description:'Restoran dengan dapur dan operasi lebih kompleks.'},
  {id:'minimarket',name:'Minimarket',category:'Retail',startup:120000000,minSkill:48,skill:'management',monthlyFixed:9000000,price:45000,quality:64,capacity:110,image:'minimarket.svg',description:'Retail modern dengan inventori dan karyawan.'},
  {id:'digital-agency',name:'Digital Agency',category:'Technology',startup:150000000,minSkill:50,skill:'marketing',monthlyFixed:7500000,price:8500000,quality:68,capacity:30,image:'digital-agency.svg',description:'Jasa pemasaran, desain, dan teknologi untuk klien.'},
  {id:'logistics',name:'Logistics Company',category:'Logistics',startup:250000000,minSkill:58,skill:'management',monthlyFixed:14000000,price:1200000,quality:70,capacity:45,image:'logistics.svg',description:'Operasi pengiriman dan fulfillment.'},
  {id:'manufacturing',name:'Small Manufacturing',category:'Manufacturing',startup:500000000,minSkill:68,skill:'management',monthlyFixed:30000000,price:350000,quality:74,capacity:160,image:'manufacturing.svg',description:'Produksi skala kecil dengan modal dan risiko lebih besar.'}
];
const investmentCatalog = [
  {id:'stock-index',name:'Saham / Index Fund',category:'Saham',minimum:1000000,returnRange:[-0.04,0.06],image:'stocks.svg',description:'Investasi jangka menengah; tidak mengikuti tick trading harian.'},
  {id:'gold',name:'Emas Fisik',category:'Emas',minimum:1000000,returnRange:[-0.015,0.025],image:'gold.svg',description:'Aset defensif dengan pergerakan lebih lambat.'},
  {id:'land',name:'Tanah',category:'Tanah',minimum:50000000,returnRange:[0.002,0.012],image:'land.svg',description:'Aset jangka panjang dengan likuiditas rendah.'},
  {id:'property',name:'Properti Sewa',category:'Properti',minimum:150000000,returnRange:[0.001,0.008],image:'property.svg',description:'Aset fisik yang menghasilkan arus kas sewa.'},
  {id:'bond',name:'Obligasi',category:'Obligasi',minimum:5000000,returnRange:[0.001,0.006],image:'bond.svg',description:'Aset pendapatan tetap dengan volatilitas relatif rendah.'}
];

businessCatalog.push(...BUSINESS_EXTRA.filter(x=>!businessCatalog.some(y=>y.id===x.id)));
investmentCatalog.forEach(i=>{i.returnRange=[0,0]});
const clean=(v,n=160)=>String(v??'').trim().slice(0,n);
const money=v=>Math.max(0,Math.round(Number(v)||0));
const keyEmail=e=>`user/email/${encodeURIComponent(String(e).toLowerCase())}`;
const keyUser=id=>`user/id/${id}`;
const keyState=id=>`state/${id}`;
const keySession=s=>`session/${s}`;
const now=()=>Date.now();
const uid=()=>Date.now()+Math.floor(Math.random()*1000);

function hashPassword(password){
  const salt=crypto.randomBytes(16).toString('hex');
  const hash=crypto.scryptSync(password,salt,64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password,stored){
  try{
    const [salt,hash]=String(stored).split(':');
    if(!salt||!hash)return false;
    const derived=crypto.scryptSync(password,salt,64).toString('hex');
    const a=Buffer.from(hash,'hex'),b=Buffer.from(derived,'hex');
    return a.length===b.length&&crypto.timingSafeEqual(a,b);
  }catch{return false;}
}
function baseState(){return {
  day:1,cash:0,reputation:0,emergency_fund:0,credit_score:650,
  skills:{communication:40,leadership:30,sales:35,marketing:25,finance:20,programming:20,design:20,management:20,negotiation:25,problemSolving:35},
  career:{status:'unemployed',salary:0,experience:0,position:null,company:null,history:[],education:[],certifications:[]},
  portfolio:{cashInvested:0,holdings:{},costBasis:{},allocation:{}},investments:[],market:{prices:{BTC:950000000,BBCA:10100,TLKM:2900},history:{BTC:[],BBCA:[],TLKM:[]},sentiment:'neutral',lastTickAt:0},settings:{theme:'light',difficulty:'realistic',autosave:true},
  businesses:[],products:[],employees:[],suppliers:[],creators:[],assets:[],incidents:[],applications:[],investors:[],transactions:[],loans:[],events:[],notifications:[],achievements:[],reports:[]
};}
async function readJSON(key){return await store.get(key,{type:'json',consistency:'strong'});}
async function writeJSON(key,value){await store.setJSON(key,value);return value;}
async function body(req){const text=await req.text();if(!text)return{};try{return JSON.parse(text)}catch{throw Object.assign(new Error('INVALID_JSON'),{status:400})}}
function json(data,status=200,headers={}){return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}})}
function cookieValue(req){const raw=req.headers.get('cookie')||'';for(const part of raw.split(';')){const [k,...v]=part.trim().split('=');if(k===COOKIE)return decodeURIComponent(v.join('='));}return null;}
function setCookie(token,maxAge=SESSION_TTL){return `${COOKIE}=${encodeURIComponent(token)}; Max-Age=${Math.floor(maxAge/1000)}; HttpOnly; SameSite=Lax; Path=/; Secure`}
async function sessionUser(req){const sid=cookieValue(req);if(!sid)return null;const s=await readJSON(keySession(sid));if(!s||s.expiresAt<=now()){if(s)await store.delete(keySession(sid));return null;}const user=await readJSON(keyUser(s.userId));return user?{sid,user}:null;}
async function requireUser(req){const auth=await sessionUser(req);return auth?.user||null;}
async function createSession(userId){const sid=crypto.randomBytes(32).toString('hex');await writeJSON(keySession(sid),{userId,expiresAt:now()+SESSION_TTL});return sid;}
function skillAverage(state){const vals=Object.values(state.skills||{});return vals.length?vals.reduce((a,b)=>a+Number(b||0),0)/vals.length:0;}
function marketSeedPrice(asset){return {BTC:950000000,BBCA:10100,TLKM:2900}[asset]||1000000;}
function marketRandom(s){let x=(Number(s.market.rngState)||2463534242)>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;s.market.rngState=x>>>0;return (s.market.rngState>>>0)/4294967296;}
function randomWalk(price,asset,sentiment='neutral',s){const volatility={BTC:.035,BBCA:.018,TLKM:.02}[asset]||.012;const drift=sentiment==='bullish'?.004:sentiment==='bearish'?-0.004:0;const shock=(marketRandom(s)-.5)*2*volatility;return Math.max(1,Math.round(price*(1+drift+shock)));}
function ensureMarket(s){if(!s.market)s.market={prices:{},history:{},sentiment:'neutral',lastTickAt:0,rngState:2463534242};if(!Number.isFinite(Number(s.market.rngState))||!Number(s.market.rngState))s.market.rngState=2463534242;for(const a of ['BTC','BBCA','TLKM']){s.market.prices[a]=money(s.market.prices?.[a])||marketSeedPrice(a);s.market.history[a]=Array.isArray(s.market.history?.[a])?s.market.history[a]:[];if(!s.market.history[a].length){const base=s.market.prices[a];const factors=[.94,.98,.96,1.01,.99,1.03,1.00,1.05,1.02,1.07,1.04,1.00];s.market.history[a]=factors.map(f=>Math.round(base*f));}}if(!s.investments)s.investments=[];if(!s.portfolio.costBasis)s.portfolio.costBasis={};return s;}
function tickMarket(s,force=false){ensureMarket(s);const nowMs=Date.now();if(!force&&nowMs-(s.market.lastTickAt||0)<5000)return false;const sentiments=['bullish','neutral','bearish','volatile'];s.market.sentiment=sentiments[Math.floor(marketRandom(s)*sentiments.length)];for(const a of ['BTC','BBCA','TLKM']){const p=randomWalk(s.market.prices[a],a,s.market.sentiment,s);s.market.prices[a]=p;s.market.history[a].push(p);s.market.history[a]=s.market.history[a].slice(-30);}s.market.lastTickAt=nowMs;return true;}
function addNotice(s,title,message,type='info'){s.notifications.unshift({id:uid(),title,message,type,read:0,created_at:new Date().toISOString()});s.notifications=s.notifications.slice(0,50)}
function achievement(s,code,title){if(!s.achievements.some(x=>x.code===code))s.achievements.unshift({id:uid(),code,title,unlocked_at:new Date().toISOString()})}
async function saveUserState(user,s){await writeJSON(keyState(user.id),s);return s;}
async function getState(user){const s=(await readJSON(keyState(user.id)))||baseState();ensureMarket(s);return s;}
const hideV700=s=>{if(!s.v700?.hr?.cand?.length)return s;return {...s,v700:{...s.v700,hr:{...s.v700.hr,cand:s.v700.hr.cand.map(({skill,honesty,loyalty,flaw,...c})=>c)}}};};
function snapshot(user,s0){const s=hide720(hideV700(s0));return {user:{id:user.id,email:user.email,name:user.name,created_at:user.created_at},state:{...s,skills:s.skills,career:s.career,portfolio:s.portfolio,investments:s.investments,market:s.market,settings:s.settings},businesses:s.businesses,products:s.products,employees:s.employees,suppliers:s.suppliers,creators:s.creators,assets:s.assets,incidents:s.incidents,applications:s.applications,investors:(s.investors||[]).map(x=>({...x,terms_json:typeof x.terms_json==='string'?x.terms_json:JSON.stringify(x.terms||{})})),transactions:s.transactions,loans:s.loans,events:s.events,notifications:s.notifications,achievements:s.achievements,reports:s.reports};}
function findBiz(s,id){return s.businesses.find(b=>String(b.id)===String(id));}
function findCreator(s,id){return s.creators.find(c=>String(c.id)===String(id));}

async function api(req){
  const u=new URL(req.url),p=u.pathname,m=req.method;
  if(m==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':u.origin,'Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS'}});
  if(m==='GET'&&p==='/api/health')return json({ok:true,version:V730,database:'netlify-blobs',mode:'serverless-persistent'});
  if(m==='POST'&&p==='/api/auth/register'){
    const b=await body(req),email=clean(b.email,200).toLowerCase(),name=clean(b.name,80),password=String(b.password||'');
    if(!email||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||password.length<6||!name)return json({error:'Nama, email valid, dan password minimal 6 karakter diperlukan.'},400);
    const existing=await readJSON(keyEmail(email));if(existing)return json({error:'Email sudah terdaftar.'},409);
    const user={id:uid(),email,name,password_hash:hashPassword(password),created_at:new Date().toISOString()};
    const result=await store.setJSON(keyEmail(email),user,{onlyIfNew:true});if(!result.modified)return json({error:'Email sudah terdaftar.'},409);
    await writeJSON(keyUser(user.id),user);const s=baseState();achievement(s,'first_login','First Login');await saveUserState(user,s);const sid=await createSession(user.id);
    return json({user:{id:user.id,email:user.email,name:user.name}},201,{'Set-Cookie':setCookie(sid)});
  }
  if(m==='POST'&&p==='/api/auth/login'){
    const b=await body(req),email=clean(b.email,200).toLowerCase(),user=await readJSON(keyEmail(email));
    if(!user||!verifyPassword(String(b.password||''),user.password_hash))return json({error:'Email atau password salah.'},401);
    const sid=await createSession(user.id);return json({user:{id:user.id,email:user.email,name:user.name}},200,{'Set-Cookie':setCookie(sid)});
  }
  if(m==='POST'&&p==='/api/auth/logout'){
    const sid=cookieValue(req);if(sid)await store.delete(keySession(sid));return json({ok:true},200,{'Set-Cookie':setCookie('',0)});
  }
  const user=await requireUser(req);if(!user)return json({error:'AUTH_REQUIRED'},401);
  const s=await getState(user);
  const h655={json,body,clean,money,uid,addNotice,achievement,findBiz,businessCatalog,investmentCatalog,save:saveUserState};
  if(v655Catchup(s,user.id,h655))await saveUserState(user,s);
  const r655=await v655Route({p,m,s,user,req,h:h655});if(r655)return r655;
  const h700={...h655,jobs,skillAverage};
  const c700=v700Catchup(s,user.id,h700),c720=catchup720(s,user.id),c730=catchup730(s,user.id,h700);if(c700||c720||c730)await saveUserState(user,s);
  const r700=await v700Route({p,m,s,user,req,h:h700});if(r700)return r700;
  const r710=await v710Route({p,m,s,user,req,h:h700});if(r710)return r710;
  const r720=await v720Route({p,m,s,user,req,h:h700});if(r720)return r720;
  const r730=await v730Route({p,m,s,user,req,h:h700});if(r730)return r730;
  const r731=await v731Route({p,m,s,user,req,h:h700});if(r731)return r731;
  const r740=await v740Route({p,m,s,user,req,h:h700});if(r740)return r740;
  const r750=await v750Route({p,m,s,user,req,h:h700});if(r750)return r750;
  if(m==='GET'&&p==='/api/me')return json(snapshot(user,s));
  if(m==='GET'&&p==='/api/jobs')return json({jobs:[...jobs].sort((a,b)=>b.salary-a.salary)});
  if(m==='GET'&&p==='/api/businesses/catalog')return json({businesses:businessCatalog});
  if(m==='GET'&&p==='/api/investments/catalog')return json({investments:investmentCatalog});
  if(m==='GET'&&p==='/api/market')return json({prices:s.market.prices,history:s.market.history,sentiment:s.market.sentiment,mode:'SIMULATED',tickAt:s.market.lastTickAt});
  if(m==='POST'&&p==='/api/market/tick'){const moved=tickMarket(s);await saveUserState(user,s);return json({ok:true,moved,prices:s.market.prices,history:s.market.history,sentiment:s.market.sentiment});}
  if(m==='POST'&&p==='/api/jobs/apply'){
    const b=await body(req),j=jobs.find(x=>x.id===b.jobId);if(!j)return json({error:'Pekerjaan tidak ditemukan.'},404);
    const score=Math.round(Math.min(100,skillAverage(s)+((s.day*17+jobs.indexOf(j)*11)%21)-10)),status=score>=j.min_skill?'accepted':'rejected';s.applications.unshift({id:uid(),job_id:j.id,title:j.title,company:j.company,salary:j.salary,score,status,created_at:new Date().toISOString()});
    if(status==='accepted'){s.career={...s.career,status:'employed',salary:j.salary,position:j.title,company:j.company,experience:s.career.experience||0,history:[{company:j.company,position:j.title,salary:j.salary,startedDay:s.day},...(s.career.history||[])]};achievement(s,'first_job','First Job');addNotice(s,'Lamaran diterima',`${j.title} di ${j.company}.`,'success')}else addNotice(s,'Lamaran selesai',`Interview score ${score}. Status: ${status}.`,'warning');await saveUserState(user,s);return json({score,status},201);
  }
  if(m==='POST'&&p==='/api/education'){
    const b=await body(req),cost=Math.max(250000,money(b.cost)||500000),skill=clean(b.skill,40)||'finance';if(s.cash<cost)return json({error:'Cash personal tidak cukup untuk pelatihan.'},400);s.cash-=cost;s.skills[skill]=Math.min(100,Number(s.skills[skill]||20)+Math.max(2,Math.round(cost/250000)));s.career.education.unshift({name:clean(b.name,100)||'Kursus Profesional',skill,cost,day:s.day});await saveUserState(user,s);return json({cash:s.cash,skill:s.skills[skill]});
  }
  if(m==='POST'&&p==='/api/businesses'){
    const b=await body(req),catalog=businessCatalog.find(x=>x.id===clean(b.catalogId,40));
    if(!catalog)return json({error:'Pilihan bisnis tidak ditemukan.'},404);
    const name=clean(b.name,80)||catalog.name,location=clean(b.location,80)||'Indonesia',skill=Number(s.skills[catalog.skill]||0);
    if(s.cash<catalog.startup)return json({error:`Modal belum cukup. Dibutuhkan Rp${catalog.startup.toLocaleString('id-ID')}.`},400);
    if(skill<catalog.minSkill)return json({error:`Skill ${catalog.skill} minimal ${catalog.minSkill}. Skill kamu ${Math.round(skill)}.`},400);
    const id=uid(),ops={price:catalog.price,marketing:20,quality:catalog.quality,inventory:catalog.capacity,capacity:catalog.capacity,automation:0,website:0,ecommerce:catalog.category==='E-commerce'?30:0,marketShare:.1,customerSatisfaction:60,monthlyFixed:catalog.monthlyFixed,insurance:false,taxReserve:0,strategy:'balanced',competitors:Math.max(2,Math.round(catalog.startup/25000000))};
    const biz={id,user_id:user.id,name,type:catalog.category,location,catalogId:catalog.id,catalogName:catalog.name,cash:catalog.startup,revenue:0,expenses:0,reputation:10,value:catalog.startup,risk:{fire:8,theft:8,flood:5,breakdown:8,cyber:4,supplier:8,recall:3},operations:ops,created_at:new Date().toISOString()};
    s.businesses.unshift(biz);s.products.unshift({id:uid(),user_id:user.id,business_id:id,name:catalog.name+' Product',category:catalog.category,price:ops.price,unit_cost:Math.round(ops.price*.45),inventory:catalog.capacity,capacity:catalog.capacity,demand:1,quality:ops.quality,marketing:ops.marketing,sales:0});s.cash-=catalog.startup;achievement(s,'first_business','First Business');addNotice(s,'Business dibuat',`${name} mulai beroperasi.`,'success');await saveUserState(user,s);return json({id,business:biz},201);
  }
  if(m==='POST'&&p==='/api/products'){
    const b=await body(req),biz=findBiz(s,b.businessId);if(!biz)return json({error:'Business tidak ditemukan.'},404);const pdt={id:uid(),user_id:user.id,business_id:biz.id,name:clean(b.name,80)||'Product',category:clean(b.category,40)||biz.type,price:money(b.price)||100000,unit_cost:money(b.cost)||40000,inventory:money(b.inventory)||100,capacity:money(b.capacity)||100,demand:1,quality:Number(b.quality)||50,marketing:Number(b.marketing)||20,sales:0};s.products.unshift(pdt);await saveUserState(user,s);return json(pdt,201);
  }
  if(m==='POST'&&p==='/api/businesses/operate'){
    const b=await body(req),biz=findBiz(s,b.id);if(!biz)return json({error:'Business tidak ditemukan.'},404);Object.assign(biz.operations||{}, {price:money(b.price)||biz.operations.price,marketing:Number(b.marketing??biz.operations.marketing),quality:Number(b.quality??biz.operations.quality),website:Number(b.website??biz.operations.website),ecommerce:Number(b.ecommerce??biz.operations.ecommerce),automation:Number(b.automation??biz.operations.automation),strategy:clean(b.strategy,30)||biz.operations.strategy,insurance:Boolean(b.insurance??biz.operations.insurance)});await saveUserState(user,s);return json({ok:true});
  }
  if(m==='POST'&&p==='/api/creators'){
    const b=await body(req),c={id:uid(),user_id:user.id,name:clean(b.name,80)||'Creator Channel',niche:clean(b.niche,50)||'General',subscribers:0,views:0,watch_hours:0,uploads:0,quality:Number(b.quality)||40,popularity:0,reputation:0,engagement:0,income:0,expenses:0,status:'active',strikes:0,monetized:false,equipment_level:1,editing_skill:Number(b.editing)||20,data:{}};s.creators.unshift(c);achievement(s,'first_creator','First Creator');await saveUserState(user,s);return json(c,201);
  }
  if(m==='POST'&&p==='/api/creators/publish'){
    const b=await body(req),c=findCreator(s,b.id);if(!c)return json({error:'Creator tidak ditemukan.'},404);const views=Math.max(20,Math.round(c.subscribers*.12+c.popularity*120+c.quality*c.editing_skill+(b.trending?500:0)));const subs=Math.max(1,Math.round(views*.0008));c.views+=views;c.subscribers+=subs;c.uploads++;c.watch_hours+=views/60;c.popularity=Math.min(100,c.popularity+(views>1000?.2:.05));if(c.subscribers>=1000&&c.watch_hours>=4000)c.monetized=true;await saveUserState(user,s);return json({views,subscribers:subs,monetized:c.monetized});
  }
  if(m==='POST'&&p==='/api/employees/hire'){
    const b=await body(req),biz=findBiz(s,b.businessId);if(!biz)return json({error:'Business tidak ditemukan.'},404);const e={id:uid(),user_id:user.id,business_id:biz.id,name:clean(b.name,80)||'Employee',role:clean(b.role,50)||'Staff',salary:money(b.salary)||3000000,skill:Number(b.skill)||40,morale:70,productivity:70,status:'active',created_at:new Date().toISOString()};s.employees.unshift(e);await saveUserState(user,s);return json(e,201);
  }
  if(m==='POST'&&p==='/api/employees/train'){
    const b=await body(req),e=s.employees.find(x=>String(x.id)===String(b.id));if(!e)return json({error:'Karyawan tidak ditemukan.'},404);const cost=money(b.cost)||250000;if(s.cash<cost)return json({error:'Cash personal tidak cukup.'},400);s.cash-=cost;e.skill=Math.min(100,e.skill+5);e.productivity=Math.min(100,e.productivity+3);await saveUserState(user,s);return json({ok:true,skill:e.skill});
  }
  if(m==='POST'&&p==='/api/suppliers'){
    const b=await body(req),biz=findBiz(s,b.businessId);if(!biz)return json({error:'Business tidak ditemukan.'},404);const sp={id:uid(),user_id:user.id,business_id:biz.id,name:clean(b.name,80)||'Supplier',category:clean(b.category,40)||'General',reliability:Number(b.reliability)||70,price_factor:Number(b.priceFactor)||1,lead_days:Number(b.leadDays)||3,capacity:Number(b.capacity)||100,status:'active',data:{}};s.suppliers.unshift(sp);await saveUserState(user,s);return json(sp,201);
  }
  if(m==='POST'&&p==='/api/emergency-fund'){
    const b=await body(req),amount=money(b.amount),action=b.action||'deposit';if(action==='deposit'){if(s.cash<amount)return json({error:'Cash personal tidak cukup.'},400);s.cash-=amount;s.emergency_fund+=amount}else if(action==='withdraw'){if(s.emergency_fund<amount)return json({error:'Dana darurat tidak cukup.'},400);s.emergency_fund-=amount;s.cash+=amount}else return json({error:'Action tidak valid.'},400);await saveUserState(user,s);return json({cash:s.cash,emergencyFund:s.emergency_fund});
  }
  if(m==='POST'&&p==='/api/loans'){
    const b=await body(req),amount=money(b.amount)||10000000,duration=Math.max(1,Number(b.duration||b.months)||12),rate=Math.max(0,Number(b.interestRate??b.rate)||12),monthly=Math.ceil((amount+Math.round(amount*rate/100*(duration/12)))/duration),biz=b.businessId?findBiz(s,b.businessId):null;if(b.businessId&&!biz)return json({error:'Business tidak ditemukan.'},404);if(!biz)return json({error:'Business loan membutuhkan bisnis aktif.'},400);if((biz.cash+biz.value)<amount*.35)return json({error:'Coverage bisnis terlalu rendah untuk jumlah pinjaman ini.'},400);const loan={id:uid(),user_id:user.id,business_id:biz.id,amount,interest_rate:rate,duration_months:duration,monthly_payment:monthly,remaining:monthly*duration,status:'pending',created_at:new Date().toISOString()};s.loans.unshift(loan);biz.cash+=amount;await saveUserState(user,s);return json({...loan,monthly});
  }
  if(m==='POST'&&p==='/api/market/transaction'){
    const b=await body(req),asset=clean(b.asset,20).toUpperCase(),q=Math.max(0,Number(b.quantity)||0),prices=s.market.prices,price=prices[asset],kind=String(b.kind||'BUY').toUpperCase();if(!price||!q||!['BUY','SELL'].includes(kind))return json({error:'Aset, quantity, price, dan transaksi harus valid.'},400);const total=Math.round(q*price),fee=Math.round(total*.0025),held=Number(s.portfolio.holdings[asset]||0);let realized=null;if(kind==='BUY'){if(s.cash<total+fee)return json({error:'Cash tidak cukup.'},400);s.cash-=total+fee;s.portfolio.holdings[asset]=held+q;s.portfolio.costBasis[asset]=Number(s.portfolio.costBasis[asset]||0)+total+fee}else{if(held<q)return json({error:`Holding ${asset} tidak cukup untuk dijual.`},400);const basis=Number(s.portfolio.costBasis[asset]||0),removedBasis=held?Math.round(basis*(q/held)):0;realized=Math.round(total-fee-removedBasis);s.portfolio.holdings[asset]=held-q;s.portfolio.costBasis[asset]=Math.max(0,basis-removedBasis);s.cash+=Math.max(0,total-fee);if(s.portfolio.holdings[asset]<=0){delete s.portfolio.holdings[asset];delete s.portfolio.costBasis[asset]}}s.transactions.unshift({id:uid(),user_id:user.id,kind,asset,quantity:q,price,fee,total,realized,status:'completed',created_at:new Date().toISOString()});await saveUserState(user,s);return json({ok:true,price,total,fee,kind,realized,holding:s.portfolio.holdings[asset]||0,cash:s.cash});
  }
  if(m==='POST'&&p==='/api/investments/buy'){
    const b=await body(req),item=investmentCatalog.find(x=>x.id===clean(b.assetId,40)),amount=money(b.amount);
    if(!item)return json({error:'Instrumen investasi tidak ditemukan.'},404);if(amount<item.minimum)return json({error:`Minimum investasi ${item.minimum.toLocaleString('id-ID')}.`},400);if(s.cash<amount)return json({error:'Cash personal tidak cukup.'},400);
    const holding={id:uid(),assetId:item.id,name:item.name,category:item.category,invested:amount,currentValue:amount,units:amount/item.minimum,purchasedDay:s.day,image:item.image};s.cash-=amount;s.investments.unshift(holding);await saveUserState(user,s);return json(holding,201);
  }
  if(m==='POST'&&p==='/api/investments/sell'){
    const b=await body(req),h=s.investments.find(x=>String(x.id)===String(b.id));if(!h)return json({error:'Investasi tidak ditemukan.'},404);s.cash+=Math.round(h.currentValue);s.investments=s.investments.filter(x=>String(x.id)!==String(h.id));await saveUserState(user,s);return json({ok:true,cash:s.cash,realized:h.currentValue-h.invested});
  }
  if(m==='POST'&&p==='/api/assets'){
    const b=await body(req),a={id:uid(),user_id:user.id,kind:clean(b.kind,30)||'equipment',name:clean(b.name,80)||'Asset',quantity:Number(b.quantity)||1,purchase_price:money(b.purchasePrice),current_price:money(b.currentPrice)||money(b.purchasePrice),location:clean(b.location,80),data:{}};s.assets.unshift(a);await saveUserState(user,s);return json(a,201);
  }
  if(m==='POST'&&p==='/api/investors/discover'){
    const b=await body(req),biz=findBiz(s,b.businessId);if(!biz)return json({error:'Business tidak ditemukan.'},404);if(biz.revenue<=0&&biz.value<5000000)return json({error:'Business belum cukup siap untuk investor.'},400);const o={id:uid(),user_id:user.id,business_id:biz.id,name:['Nusantara Ventures','Growth Capital','Strategic Partner'][s.day%3],type:'private',investment:Math.round(biz.value*.2),equity:12+((s.day+biz.id.length)%9),growth:18,risk:'medium',status:'pending',terms:{}};s.investors.unshift(o);await saveUserState(user,s);return json(o,201);
  }
  if(m==='POST'&&p==='/api/investors/offer'){
    const b=await body(req),biz=findBiz(s,b.businessId);if(!biz)return json({error:'Business tidak ditemukan.'},404);const investment=money(b.investment)||500000000,equity=Math.max(1,Math.min(90,Number(b.equity)||15));const o={id:uid(),user_id:user.id,business_id:biz.id,name:clean(b.name,80)||'Artha Ventures',type:clean(b.type,40)||'Angel Investor',investment,equity,growth:Number(b.growth)||18,risk:clean(b.risk,20)||'Medium',status:'pending',terms:{dividend:'pro-rata',voting:equity<=20,exit:'24 months'}};s.investors.unshift(o);addNotice(s,'Investment Offer',`Investor menawarkan Rp${investment.toLocaleString('id-ID')} untuk ${equity}% equity.`,'info');await saveUserState(user,s);return json({id:o.id},201);
  }
  if(m==='POST'&&p==='/api/investors/decision'){
    const b=await body(req),o=s.investors.find(x=>String(x.id)===String(b.id));if(!o)return json({error:'Investor offer tidak ditemukan.'},404);if(b.action==='counter'){o.investment=money(b.investment)||o.investment;o.equity=Number(b.equity)||o.equity}else if(b.action==='accept'){const biz=findBiz(s,o.business_id);if(!biz)return json({error:'Business tidak ditemukan.'},404);biz.cash+=o.investment;o.status='accepted'}else{o.status='rejected'}await saveUserState(user,s);return json({ok:true});
  }
  if(m==='POST'&&p==='/api/businesses/incident'){
    const b=await body(req),biz=findBiz(s,b.businessId);if(!biz)return json({error:'Business tidak ditemukan.'},404);
    const map={Fire:['warehouse','major'],Theft:['inventory','moderate'],Flood:['store','major'],'Equipment Breakdown':['equipment','moderate'],'Power Outage':['operations','minor'],'Supplier Failure':['supply','moderate'],'Cyber Attack':['technology','major'],'Customer Complaint':['customer_service','minor']};
    const [area,severity]=map[b.type]||['operations','minor'];const factor={minor:.08,moderate:.15,major:.25}[severity]||.08;const damage=Math.max(100000,Math.round(biz.value*factor)),repair=Math.round(damage*.55);
    const inc={id:uid(),user_id:user.id,business_id:biz.id,type:clean(b.type,50)||'Incident',area,severity,damage_level:factor*100,damage_value:damage,repair_cost:repair,status:'active',decision:null,insurance_payout:0,data:{trigger:'manual',legacy:true}};s.incidents.unshift(inc);biz.value=Math.max(0,biz.value-Math.round(damage*.1));addNotice(s,'Business incident',`${biz.name}: ${inc.type}.`,'warning');await saveUserState(user,s);return json({id:inc.id,...inc},201);
  }
  if(m==='POST'&&p==='/api/incidents/create'){
    const b=await body(req),biz=findBiz(s,b.businessId);if(!biz)return json({error:'Business tidak ditemukan.'},404);const types=['fire','theft','flood','breakdown','cyber','supplier_failure','recall'],type=types[(s.day+biz.id.length)%types.length],damage=Math.round(biz.value*.06),repair=Math.round(damage*.55),inc={id:uid(),user_id:user.id,business_id:biz.id,type,area:'operations',severity:'medium',damage_level:.15,damage_value:damage,repair_cost:repair,status:'active',decision:null,insurance_payout:0,data:{trigger:'manual'}};s.incidents.unshift(inc);biz.value=Math.max(0,biz.value-damage);addNotice(s,'Business incident',`${biz.name}: ${type}.`,'warning');await saveUserState(user,s);return json({id:inc.id,type,damage,repair},201);
  }
  if(m==='POST'&&p==='/api/incidents/decision'){
    const b=await body(req),inc=s.incidents.find(x=>String(x.id)===String(b.id??b.incidentId)&&x.status==='active');if(!inc)return json({error:'Incident aktif tidak ditemukan.'},404);const biz=findBiz(s,inc.business_id);if(b.action==='delay'||b.action==='temporary'){inc.status='recovery';inc.decision=b.action;await saveUserState(user,s);return json({ok:true,payout:0})}else if(b.action==='repair'){if(biz.cash<inc.repair_cost)return json({error:'Cash bisnis tidak cukup untuk repair.'},400);biz.cash-=inc.repair_cost}else if(b.action==='insurance'){if(!biz.operations.insurance)return json({error:'Insurance belum aktif pada bisnis.'},400);const payout=Math.round(inc.damage_value*.7);biz.cash+=payout;inc.insurance_payout=payout}else if(b.action==='emergency'){if(s.emergency_fund<inc.repair_cost)return json({error:'Emergency fund personal tidak cukup.'},400);s.emergency_fund-=inc.repair_cost}else return json({error:'Decision tidak valid.'},400);inc.status='resolved';inc.decision=b.action;await saveUserState(user,s);return json({ok:true});
  }
  if(m==='POST'&&p==='/api/events/decision'){
    const b=await body(req),e=s.events.find(x=>String(x.id)===String(b.id));if(!e)return json({error:'Event tidak ditemukan.'},404);const c=e.consequence_json?.[b.choice]||{};s.cash=Math.max(0,s.cash+Number(c.cash||0));s.reputation+=Number(c.reputation||0);e.decision=b.choice;await saveUserState(user,s);return json({cash:s.cash,reputation:s.reputation});
  }
  if(m==='POST'&&p==='/api/simulate/day'){
    const oldDay=s.day;s.day++;const activeEmployment=s.career?.status==='employed'&&Number(s.career?.salary)>0;let cashDelta=activeEmployment?Math.round(Number(s.career.salary)/30):0,bizDelta=0,creatorDelta=0,marketDelta=0,notes=[];
    s.cash+=cashDelta;
    for(const biz of s.businesses){const products=s.products.filter(x=>String(x.business_id)===String(biz.id)),staff=s.employees.filter(x=>String(x.business_id)===String(biz.id)&&x.status==='active');let revenue=0,expenses=0;for(const pdt of products){const priceFactor=Math.max(.25,Math.min(2,100000/(Number(pdt.price)||100000))),staffFactor=staff.length?1+staff.reduce((a,e)=>a+e.productivity,0)/Math.max(1,staff.length)/500:1,demand=Math.max(.15,Number(pdt.demand)||1)*(1+Number(biz.operations.marketing||0)/180)*(1+Number(biz.reputation||0)/150)*staffFactor,units=Math.min(Number(pdt.inventory),Math.max(0,Math.round(Number(pdt.capacity)*demand*priceFactor*.08)));pdt.inventory-=units;pdt.sales+=units;pdt.demand=demand;revenue+=units*Number(pdt.price);expenses+=units*Number(pdt.unit_cost)}const wages=staff.reduce((a,e)=>a+e.salary,0)/30,fixed=Number(biz.operations.monthlyFixed||0)/30,marketing=Number(biz.operations.marketing||0)*5000/30,net=Math.round(revenue-expenses-wages-fixed-marketing);biz.cash+=net;biz.revenue+=revenue;biz.expenses+=Math.max(0,expenses+wages+fixed+marketing);biz.reputation=Math.max(0,Math.min(100,biz.reputation+(net>0?.5:-.3)));biz.value=Math.max(0,Math.round(biz.value+net*.35));bizDelta+=net;if(revenue)notes.push(`${biz.name}: revenue Rp${Math.round(revenue).toLocaleString('id-ID')}, net Rp${net.toLocaleString('id-ID')}`);for(const e of staff){e.morale=Math.max(0,Math.min(100,e.morale+(net>0?.2:-.6)));e.productivity=Math.max(20,Math.min(100,e.productivity+(e.morale-60)/200))}}
    for(const c of s.creators.filter(x=>x.status==='active')){const views=Math.max(0,Math.round(c.subscribers*.12+c.popularity*120+c.quality*c.editing_skill));const subs=Math.round(views*.0008),income=c.monetized?Math.round(views*.003):0;c.views+=views;c.subscribers+=subs;c.watch_hours+=views/60;c.income+=income;c.popularity=Math.min(100,c.popularity+(views>1000?.2:0));creatorDelta+=income;s.cash+=income}if(activeEmployment&&s.day%30===0){s.career.experience=(s.career.experience||0)+1;s.skills.management=Math.min(100,Number(s.skills.management||20)+1)}
    const prevPrices={...s.market.prices};tickMarket(s,true);const prices=s.market.prices;for(const [a,q] of Object.entries(s.portfolio.holdings||{}))marketDelta+=Math.round(Number(q)*((prices[a]||0)-(prevPrices[a]||0)));for(const h of s.investments){const item=investmentCatalog.find(x=>x.id===h.assetId);if(item){const [lo,hi]=item.returnRange;h.currentValue=Math.max(0,Math.round(h.currentValue*(1+lo+Math.random()*(hi-lo))));}}
    for(const l of s.loans.filter(x=>x.status==='pending'&&x.remaining>0)){const pay=Math.min(l.monthly_payment,l.remaining),biz=l.business_id?findBiz(s,l.business_id):null;if(biz?biz.cash>=pay:s.cash>=pay){if(biz)biz.cash-=pay;else s.cash-=pay;l.remaining-=pay;if(l.remaining<=0)l.status='paid'}else{s.credit_score=Math.max(300,s.credit_score-8);addNotice(s,'Loan missed','Cash tidak cukup untuk cicilan. Credit score turun.','danger')}}
    if(s.day%7===0&&s.businesses.length){s.events.unshift({id:uid(),user_id:user.id,category:'business',title:'Peluang strategi muncul',decision:null,consequence_json:{invest:{cash:-500000,reputation:3},save:{cash:200000,reputation:0},ignore:{cash:0,reputation:-3}},created_at:new Date().toISOString()});addNotice(s,'Decision baru','Ada peluang strategi yang membutuhkan keputusan.','info')}
    s.reports.unshift({id:uid(),user_id:user.id,day:s.day,cash_delta:cashDelta,business_delta:bizDelta,creator_delta:creatorDelta,market_delta:marketDelta,risk_delta:0,summary:notes.slice(-5).join(' | ')||'Hari berjalan tanpa perubahan besar.',data_json:{prices},created_at:new Date().toISOString()});s.reports=s.reports.slice(0,30);if(cashDelta)addNotice(s,'Gaji diterima',`Pendapatan karier harian Rp${cashDelta.toLocaleString('id-ID')}.`,'success');await saveUserState(user,s);return json({day:s.day,cash:s.cash,cashDelta,bizDelta,creatorDelta,marketDelta,prices,notes});
  }
  if(m==='POST'&&p==='/api/notifications/read'){s.notifications.forEach(n=>n.read=1);await saveUserState(user,s);return json({ok:true});}
  if(m==='POST'&&p==='/api/save'){await saveUserState(user,s);return json({ok:true,snapshot:snapshot(user,s)});}
  return json({error:'API_NOT_FOUND'},404);
}

export default async (req)=>{
  try{return await api(req)}catch(e){console.error(e);return json({error:e?.message||'SERVER_ERROR'},e?.status||500)}
};

export const config = { path: '/api/*' };
