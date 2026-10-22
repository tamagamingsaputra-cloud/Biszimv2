const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { db, hashPassword, verifyPassword, userState, snapshot } = require('./db');

const PORT = Number(process.env.PORT || 8787);
const WEB = path.join(__dirname,'..','web');
const sessions = new Map();
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json'};
function send(res,status,data,type='application/json'){res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store'});res.end(type.startsWith('application/json')?JSON.stringify(data):data);}
function parseCookies(req){return Object.fromEntries((req.headers.cookie||'').split(';').filter(Boolean).map(v=>{const i=v.indexOf('=');return [v.slice(0,i).trim(),decodeURIComponent(v.slice(i+1))]}));}
function auth(req){const sid=parseCookies(req).bizsim_session; return sid?sessions.get(sid):null;}
function requireAuth(req,res){const userId=auth(req);if(!userId){send(res,401,{error:'AUTH_REQUIRED'});return null;}return userId;}
async function body(req){let s='';for await(const c of req)s+=c;if(!s)return{};try{return JSON.parse(s)}catch{return{};}}
function clean(s,max=160){return String(s??'').trim().slice(0,max);}
function money(n){return Math.max(0,Math.round(Number(n)||0));}
function notify(userId,title,message,type='info'){db.prepare('INSERT INTO notifications(user_id,title,message,type) VALUES(?,?,?,?)').run(userId,title,message,type);}
function achievement(userId,code,title){db.prepare('INSERT OR IGNORE INTO achievements(user_id,code,title) VALUES(?,?,?)').run(userId,code,title);}
function updateState(userId, patch){const s=userState(userId); const fields=[];const vals=[];for(const [k,v] of Object.entries(patch)){if(['cash','reputation','emergency_fund','credit_score','day'].includes(k)){fields.push(`${k}=?`);vals.push(v)} else if(['skills_json','career_json','portfolio_json','settings_json'].includes(k)){fields.push(`${k}=?`);vals.push(typeof v==='string'?v:JSON.stringify(v))}} if(fields.length){fields.push('updated_at=CURRENT_TIMESTAMP');vals.push(userId);db.prepare(`UPDATE player_state SET ${fields.join(',')} WHERE user_id=?`).run(...vals)} }
function serveStatic(req,res){let p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(p==='/'||p==='/index.html')p='/index.html';const file=path.normalize(path.join(WEB,p));if(!file.startsWith(WEB))return send(res,403,{error:'FORBIDDEN'});fs.readFile(file,(e,b)=>{if(e)return send(res,404,{error:'NOT_FOUND'});send(res,200,b,MIME[path.extname(file)]||'application/octet-stream')});}

async function api(req,res){
 const u=new URL(req.url,'http://localhost'); const p=u.pathname; const method=req.method;
 if(method==='GET'&&p==='/api/health')return send(res,200,{ok:true,version:'6.0.0',database:'sqlite'});
 if(method==='POST'&&p==='/api/auth/register'){
   const b=await body(req),email=clean(b.email,200).toLowerCase(),name=clean(b.name,80),password=String(b.password||'');
   if(!email||!email.includes('@')||password.length<6||!name)return send(res,400,{error:'Nama, email valid, dan password minimal 6 karakter diperlukan.'});
   try{const r=db.prepare('INSERT INTO users(email,password_hash,name) VALUES(?,?,?)').run(email,hashPassword(password),name);const id=Number(r.lastInsertRowid);userState(id);const sid=crypto.randomBytes(32).toString('hex');sessions.set(sid,id);res.setHeader('Set-Cookie',`bizsim_session=${sid}; HttpOnly; SameSite=Lax; Path=/`);achievement(id,'first_login','First Login');return send(res,201,{user:{id,email,name}})}catch(e){return send(res,409,{error:'Email sudah terdaftar.'})}
 }
 if(method==='POST'&&p==='/api/auth/login'){
   const b=await body(req),email=clean(b.email,200).toLowerCase(),row=db.prepare('SELECT * FROM users WHERE email=?').get(email);if(!row||!verifyPassword(String(b.password||''),row.password_hash))return send(res,401,{error:'Email atau password salah.'});const sid=crypto.randomBytes(32).toString('hex');sessions.set(sid,row.id);res.setHeader('Set-Cookie',`bizsim_session=${sid}; HttpOnly; SameSite=Lax; Path=/`);return send(res,200,{user:{id:row.id,email:row.email,name:row.name}})
 }
 if(method==='POST'&&p==='/api/auth/logout'){const sid=parseCookies(req).bizsim_session;if(sid)sessions.delete(sid);res.setHeader('Set-Cookie','bizsim_session=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/');return send(res,200,{ok:true});}
 const userId=requireAuth(req,res);if(!userId)return;
 if(method==='GET'&&p==='/api/me')return send(res,200,snapshot(userId));
 if(method==='GET'&&p==='/api/jobs')return send(res,200,{jobs:db.prepare('SELECT * FROM jobs ORDER BY salary DESC').all()});
 if(method==='POST'&&p==='/api/jobs/apply'){const b=await body(req),job=db.prepare('SELECT * FROM jobs WHERE id=?').get(Number(b.jobId));if(!job)return send(res,404,{error:'Pekerjaan tidak ditemukan.'});const s=userState(userId),skills=JSON.parse(s.skills_json),avg=Object.values(skills).reduce((a,v)=>a+v,0)/Object.values(skills).length;const score=Math.round(Math.min(100,avg+Math.random()*20));const status=score>=job.min_skill?'accepted':'rejected';const r=db.prepare('INSERT INTO applications(user_id,job_id,score,status) VALUES(?,?,?,?)').run(userId,job.id,score,status);if(status==='accepted'){const career=JSON.parse(s.career_json);career.status='employed';career.salary=job.salary;career.position=job.title;career.company=job.company;career.experience=career.experience||0;career.history=career.history||[];career.history.unshift({company:job.company,position:job.title,salary:job.salary,startedDay:s.day});updateState(userId,{career_json:career});notify(userId,'Lamaran diterima',`${job.title} di ${job.company}. Gaji Rp${job.salary.toLocaleString('id-ID')}/bulan.`,'success');achievement(userId,'first_job','First Job');}else notify(userId,'Lamaran selesai',`Score interview ${score}. Status: ${status}.`,'warning');return send(res,201,{id:Number(r.lastInsertRowid),score,status});}
 if(method==='POST'&&p==='/api/simulate/day'){const s=userState(userId),career=JSON.parse(s.career_json);let delta=0;if(career.status==='employed')delta=Math.round((career.salary||0)/30);let businesses=db.prepare('SELECT * FROM businesses WHERE user_id=?').all(userId);let bizDelta=0;for(const b of businesses){const base=Math.max(0,Math.round((b.revenue||0)/30));const expense=Math.max(0,Math.round((b.expenses||0)/30));bizDelta+=base-expense;db.prepare('UPDATE businesses SET cash=cash+?,revenue=revenue+? WHERE id=?').run(base-expense,base,b.id);}const day=s.day+1;updateState(userId,{day,cash:s.cash+delta,reputation:s.reputation+(career.status==='employed'?1:0)});if(delta)notify(userId,'Hari simulasi selesai',`Gaji harian Rp${delta.toLocaleString('id-ID')} masuk ke cash personal.`,'success');if(bizDelta)notify(userId,'Bisnis beroperasi',`Net cash bisnis hari ini Rp${bizDelta.toLocaleString('id-ID')}.`,'info');return send(res,200,{day,cash:s.cash+delta});}
 if(method==='POST'&&p==='/api/businesses'){const b=await body(req),name=clean(b.name,80),type=clean(b.type,40)||'Retail',location=clean(b.location,80)||'Jakarta';const startup={Retail:25000000,Restaurant:40000000,'Online Store':15000000,'Internet Business':20000000,'YouTube Creator':5000000}[type]||20000000;const s=userState(userId);if(s.cash<startup)return send(res,400,{error:`Modal tidak cukup. Bisnis ini membutuhkan sekitar Rp${startup.toLocaleString('id-ID')}. Saldo saat ini Rp${s.cash.toLocaleString('id-ID')}.`});const r=db.prepare('INSERT INTO businesses(user_id,name,type,location,cash,revenue,expenses,value,risk_json,operations_json) VALUES(?,?,?,?,?,?,?,?,?,?)').run(userId,name,type,location,0,0,Math.round(startup*.03),startup,JSON.stringify({fire:20,theft:15,flood:10,equipment:15,employee:10,supplier:15,market:25,financial:20,cyber:type==='Internet Business'?35:10}),JSON.stringify({capacity:100,inventory:50,employees:0,branches:1}));updateState(userId,{cash:s.cash-startup});notify(userId,'Bisnis baru dibuka',`${name} mulai beroperasi dari modal pribadi.`,'success');achievement(userId,'first_business','First Business');return send(res,201,{id:Number(r.lastInsertRowid)});}
 if(method==='POST'&&p==='/api/businesses/incident'){const b=await body(req),biz=db.prepare('SELECT * FROM businesses WHERE id=? AND user_id=?').get(Number(b.businessId),userId);if(!biz)return send(res,404,{error:'Bisnis tidak ditemukan.'});const types={Fire:['Warehouse','Major'],Theft:['Inventory','Moderate'],Flood:['Store Floor','Major'],'Equipment Breakdown':['Cashier','Moderate'],'Power Outage':['Store Floor','Minor'],'Supplier Failure':['Warehouse','Moderate'],'Cyber Attack':['Server Room','Major'],'Customer Complaint':['Customer Service','Minor']};const [area,severity]=types[b.type]||['Operations','Minor'];const factor={Minor:.15,Moderate:.4,Major:.7,Critical:.95}[severity];const damage=Math.round(Math.max(1000000,biz.value*factor*.12));const repair=Math.round(damage*.45);const r=db.prepare('INSERT INTO incidents(user_id,business_id,type,area,severity,damage_level,damage_value,repair_cost,data_json) VALUES(?,?,?,?,?,?,?,?,?)').run(userId,biz.id,b.type,area,severity,factor*100,damage,repair,JSON.stringify({chain:['damage assessment','capacity impact','repair/recovery']}));notify(userId,'Business incident',`${b.type} terjadi di ${area}. Dampak estimasi Rp${damage.toLocaleString('id-ID')}.`,'warning');return send(res,201,{id:Number(r.lastInsertRowid),area,severity,damage,repair});}
 if(method==='POST'&&p==='/api/incidents/decision'){const b=await body(req),inc=db.prepare('SELECT * FROM incidents WHERE id=? AND user_id=?').get(Number(b.incidentId),userId);if(!inc)return send(res,404,{error:'Incident tidak ditemukan.'});const actions={repair:0.8,temporary:0.35,delay:0,insurance:0.65};const a=actions[b.action];if(a===undefined)return send(res,400,{error:'Decision tidak valid.'});let payout=0;if(b.action==='insurance')payout=Math.round(inc.damage_value*.65);if(b.action==='repair'||b.action==='insurance'){db.prepare('UPDATE businesses SET cash=MAX(0,cash-?),value=MAX(0,value-?) WHERE id=?').run(Math.round(inc.repair_cost*(b.action==='insurance'?.35:1)),Math.round(inc.damage_value*.1),inc.business_id);}db.prepare('UPDATE incidents SET status=?,decision=?,insurance_payout=? WHERE id=? AND user_id=?').run(b.action==='delay'?'active':'recovery',b.action,payout,inc.id,userId);db.prepare('INSERT INTO events(user_id,category,title,decision,consequence_json) VALUES(?,?,?,?,?)').run(userId,'Business Incident',inc.type,b.action,JSON.stringify({damage:inc.damage_value,repair:inc.repair_cost,payout}));return send(res,200,{success:true,payout});}
 if(method==='POST'&&p==='/api/investors/discover'){
  const b=await body(req), biz=db.prepare('SELECT * FROM businesses WHERE id=? AND user_id=?').get(Number(b.businessId),userId);
  if(!biz)return send(res,404,{error:'Business tidak ditemukan.'});
  const ops=JSON.parse(biz.operations_json||'{}');
  const revenue=Number(biz.revenue||0), profit=Math.max(0,revenue-Number(biz.expenses||0)), assets=Math.max(0,Number(biz.value||0));
  const risk=Object.values(JSON.parse(biz.risk_json||'{}')).reduce((a,v)=>a+Number(v||0),0)/Math.max(1,Object.keys(JSON.parse(biz.risk_json||'{}')).length);
  const readiness=Math.round(Math.min(100, 25+(revenue>0?20:0)+(profit>0?20:0)+(biz.reputation||0)*0.2+(ops.capacity||0)*0.1-risk*0.25));
  if(readiness<45)return send(res,409,{error:'Bisnis belum cukup siap menarik investor. Tingkatkan revenue, profit, reputation, dan operational reliability terlebih dahulu.',readiness});
  const multiple=profit>0?Math.max(1.8,Math.min(5.5,3.2-risk/100)):Math.max(1.2,Math.min(2.4,1.8-risk/120));
  const valuation=Math.max(assets,Math.round((profit||Math.max(revenue*0.08,1000000))*multiple));
  const investment=Math.max(25000000,Math.round(valuation*0.15));
  const equity=Number((investment/(valuation+investment)*100).toFixed(1));
  const investorTypes=[['Nusantara Angel','Angel Investor','Medium'],['Meridian Capital','Venture Capital','Medium-High'],['Arunika Strategic','Strategic Investor','Low-Medium']];
  const pick=investorTypes[(biz.id+Math.floor((biz.reputation||0)))%investorTypes.length];
  const growth=Math.max(5,Math.min(35,Math.round((profit>0?18:10)+(biz.reputation||0)/10-risk/20)));
  const terms={dividend:'pro-rata sesuai ownership',voting:equity>=20,exit:'24-48 months',valuation,readiness};
  const r=db.prepare('INSERT INTO investors(user_id,business_id,name,type,investment,equity,growth,risk,terms_json) VALUES(?,?,?,?,?,?,?,?,?)').run(userId,biz.id,pick[0],pick[1],investment,equity,growth,pick[2],JSON.stringify(terms));
  notify(userId,'Investor discovered',`${pick[0]} menilai bisnis ${biz.name}. Offer Rp${investment.toLocaleString('id-ID')} untuk ${equity}% equity.`, 'info');
  return send(res,201,{id:Number(r.lastInsertRowid),investor:{name:pick[0],type:pick[1],investment,equity,growth,risk:pick[2],valuation,readiness,terms}});
 }
 if(method==='POST'&&p==='/api/investors/offer'){const b=await body(req),biz=db.prepare('SELECT * FROM businesses WHERE id=? AND user_id=?').get(Number(b.businessId),userId);if(!biz)return send(res,404,{error:'Business tidak ditemukan.'});const r=db.prepare('INSERT INTO investors(user_id,business_id,name,type,investment,equity,growth,risk,terms_json) VALUES(?,?,?,?,?,?,?,?,?)').run(userId,biz.id,clean(b.name,80)||'Artha Ventures',clean(b.type,40)||'Angel Investor',money(b.investment)||500000000,Number(b.equity)||15,Number(b.growth)||18,clean(b.risk,20)||'Medium',JSON.stringify({dividend:'pro-rata',voting:false,exit:'24 months'}));notify(userId,'Investment Offer',`Investor menawarkan Rp${(money(b.investment)||500000000).toLocaleString('id-ID')} untuk ${Number(b.equity)||15}% equity.`,'info');return send(res,201,{id:Number(r.lastInsertRowid)});}
 if(method==='POST'&&p==='/api/investors/decision'){
  const b=await body(req),o=db.prepare('SELECT * FROM investors WHERE id=? AND user_id=?').get(Number(b.id),userId);
  if(!o)return send(res,404,{error:'Offer tidak ditemukan.'});
  const biz=db.prepare('SELECT * FROM businesses WHERE id=? AND user_id=?').get(o.business_id,userId);
  if(!biz)return send(res,404,{error:'Business tidak ditemukan.'});
  const terms=JSON.parse(o.terms_json||'{}');
  const revenue=Number(biz.revenue||0), profit=Math.max(0,revenue-Number(biz.expenses||0));
  const currentVal=Math.max(Number(biz.value||0),profit>0?profit*3:revenue*0.6);
  if(b.action==='accept'){
    const postMoney=o.investment/Math.max(0.01,o.equity/100);
    const ratio=postMoney>0?currentVal/postMoney:0;
    const riskPenalty=(o.risk==='High'?18:o.risk==='Medium-High'?10:o.risk==='Medium'?5:2);
    const acceptScore=Math.round(Math.max(0,Math.min(100,50+ratio*35+(profit>0?12:0)+(biz.reputation||0)*0.2-riskPenalty)));
    if(acceptScore<58)return send(res,409,{error:'Investor menolak acceptance pada terms ini setelah due-diligence. Negosiasikan valuation, equity, atau investment.',acceptScore});
    db.prepare('UPDATE investors SET status=\'accepted\' WHERE id=?').run(o.id);
    db.prepare('UPDATE businesses SET cash=cash+? WHERE id=?').run(o.investment,biz.id);
    notify(userId,'Investor accepted',`${o.name} masuk dengan ${o.equity}% ownership setelah due-diligence.`, 'success');
    achievement(userId,'first_investor','First Investor');
    return send(res,200,{success:true,accepted:true,acceptScore});
  }
  if(b.action==='reject'){db.prepare("UPDATE investors SET status='rejected' WHERE id=?").run(o.id);notify(userId,'Offer ditolak',`Tawaran ${o.name} ditolak.`,'info');return send(res,200,{success:true});}
  if(b.action==='counter'){
    const equity=Math.max(1,Math.min(60,Number(b.equity)||o.equity)), investment=Math.max(1000000,money(b.investment)||o.investment);
    const implied=investment/Math.max(0.01,equity/100);
    const gap=implied>0?Math.abs(implied-currentVal)/currentVal:1;
    const counterScore=Math.round(Math.max(0,Math.min(100,78-gap*70+(profit>0?8:0)-(o.risk==='High'?8:0))));
    if(counterScore<55)return send(res,409,{error:'Investor menolak counter offer. Valuation/terms terlalu jauh dari penilaian mereka.',counterScore});
    db.prepare('UPDATE investors SET equity=?,investment=?,status=\'pending\' WHERE id=?').run(equity,investment,o.id);
    notify(userId,'Counter offer accepted for review',`${o.name} menerima counter untuk ditinjau: Rp${investment.toLocaleString('id-ID')} / ${equity}%.`,'info');
    return send(res,200,{success:true,counterScore,status:'pending'});
  }
  return send(res,400,{error:'Decision tidak valid.'});
 }
 if(method==='POST'&&p==='/api/market/transaction'){const b=await body(req),qty=Math.max(0,Number(b.quantity)||0),price=money(b.price)||1000000,asset=clean(b.asset,80)||'Asset',kind=b.kind==='SELL'?'SELL':'BUY',fee=Math.round(qty*price*.0025),total=Math.round(qty*price)+fee,s=userState(userId),portfolio=JSON.parse(s.portfolio_json||'{}');portfolio.holdings=portfolio.holdings||{};const held=Number(portfolio.holdings[asset]||0);if(!qty||!price)return send(res,400,{error:'Quantity dan price harus valid.'});if(kind==='BUY'&&s.cash<total)return send(res,400,{error:'Saldo personal tidak cukup.'});if(kind==='SELL'&&held<qty)return send(res,400,{error:`Holding ${asset} tidak cukup untuk dijual.`});if(kind==='BUY')portfolio.holdings[asset]=held+qty;else{portfolio.holdings[asset]=held-qty;if(portfolio.holdings[asset]<=0)delete portfolio.holdings[asset]}const next=s.cash+(kind==='SELL'?Math.round(qty*price)-fee:-total);db.prepare('INSERT INTO transactions(user_id,kind,asset,quantity,price,fee,total) VALUES(?,?,?,?,?,?,?)').run(userId,kind,asset,qty,price,fee,total);updateState(userId,{cash:next,portfolio_json:portfolio});achievement(userId,'first_investment','First Investment');return send(res,200,{success:true,cash:next,fee,total,holding:portfolio.holdings[asset]||0});}
 if(method==='POST'&&p==='/api/loans'){const b=await body(req),amount=money(b.amount),rate=Math.max(0,Number(b.rate)||12),months=Math.max(1,Math.round(Number(b.months)||12)),interest=Math.round(amount*rate/100*(months/12)),monthly=Math.ceil((amount+interest)/months),s=userState(userId),business=b.businessId?db.prepare('SELECT * FROM businesses WHERE id=? AND user_id=?').get(Number(b.businessId),userId):null;if(!business)return send(res,400,{error:'Business loan membutuhkan bisnis aktif sebagai dasar penilaian dan tujuan penggunaan dana.'});if(s.credit_score<500)return send(res,400,{error:'Credit score terlalu rendah.'});if(business.cash+business.value<amount*0.35)return send(res,400,{error:'Coverage bisnis terlalu rendah untuk jumlah pinjaman ini.'});const r=db.prepare('INSERT INTO loans(user_id,business_id,amount,interest_rate,duration_months,monthly_payment,remaining) VALUES(?,?,?,?,?,?,?)').run(userId,business.id,amount,rate,months,monthly,amount+interest);db.prepare('UPDATE businesses SET cash=cash+? WHERE id=?').run(amount,business.id);notify(userId,'Loan approved',`Dana pinjaman Rp${amount.toLocaleString('id-ID')} masuk ke cash bisnis. Cicilan Rp${monthly.toLocaleString('id-ID')}/bulan.`,'info');return send(res,201,{id:Number(r.lastInsertRowid),monthly});}
 if(method==='POST'&&p==='/api/save')return send(res,200,{ok:true,snapshot:snapshot(userId)});
 if(method==='POST'&&p==='/api/notifications/read'){db.prepare('UPDATE notifications SET read=1 WHERE user_id=?').run(userId);return send(res,200,{ok:true});}
 return send(res,404,{error:'API_NOT_FOUND'});
}
const server=http.createServer((req,res)=>{if(req.url.startsWith('/api/'))api(req,res).catch(e=>{console.error(e);send(res,500,{error:'SERVER_ERROR',detail:process.env.NODE_ENV==='development'?e.message:'Internal server error'})});else serveStatic(req,res)});
server.listen(PORT,()=>console.log(`BizSim v6.0.0 running at http://localhost:${PORT}`));
