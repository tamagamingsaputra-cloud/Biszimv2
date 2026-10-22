/* ============================================================
 BizSim v5.1 — Economic Life & Business Simulation Extension
 ADDITIVE MODULE: career-from-zero, investors, valuation, incidents,
 partial damage, insurance, risk/prevention, loans, accounting,
 expansion, competitors, customers, suppliers, assets, reports,
 calendar/tasks/meetings/partners/ownership/dividends.
 It does not replace legacy engines. It uses State.data as the
 canonical save container and guards every optional legacy API.
============================================================ */

const BizSimLifeEngine = {
  VERSION: "5.1",

  _id(prefix) {
    return prefix + "_" + Date.now() + "_" + Math.floor(Math.random() * 100000);
  },
  _cash() { return Number(State?.data?.cash || 0); },
  _setCash(v) { State.data.cash = Math.max(0, Math.round(v)); },
  _addTx(cat, desc, amount) {
    if (typeof State?.addTx === "function") State.addTx(cat, desc, Math.round(amount));
  },
  _notify(title, message, type="info") {
    if (typeof State?.notify === "function") State.notify(title, message, type);
  },
  _date() {
    const t = State.data.time || {year:1,month:1,day:1};
    return `T${t.year}.${String(t.month).padStart(2,"0")}.${String(t.day).padStart(2,"0")}`;
  },
  _rand(min,max) { return min + Math.random()*(max-min); },
  _clamp(v,min,max) { return Math.max(min, Math.min(max,v)); },

  /* ---------- 121-122: CAREER FROM ZERO ---------- */
  initCareerFromZero(force=false) {
    const pc = State.data.playerCareer || {};
    if (!force && pc._zeroCareerInitialized) return pc;
    /* Existing v5.0/legacy saves are preserved. Zeroing applies only to a genuinely
       new career/save, never to a player who already has progress. */
    const hasExistingProgress = Boolean(
      pc.currentJobId || pc.currentCompany || pc.salary > 0 || pc.yearsExperience > 0 ||
      (State.data.businesses||[]).length || (State.data.portfolio?.holdings||[]).length ||
      (State.data.assets||[]).length || (State.data.investments||[]).length ||
      Number(State.data.cash||0) > 0
    );
    if (!force && hasExistingProgress && !pc.currentJobId && !pc.currentCompany && !pc.salary && !pc.skills) {
      State.data.playerCareer = {
        currentJobId:null,currentCompany:null,currentPosition:null,currentIndustry:null,
        level:0,levelTitle:"Unemployed",salary:0,monthsInPosition:0,yearsExperience:0,
        performance:70,skills:{communication:20,technical:20,finance:10,management:10,sales:20},
        education:"SMA/SMK",cv:{summary:"",workHistory:[]},applications:[],
        interviewsPassed:0,interviewsFailed:0,_zeroCareerInitialized:true
      };
      return State.data.playerCareer;
    }
    if (!force && hasExistingProgress) {
      pc.level = pc.level ?? 0;
      pc.levelTitle = pc.levelTitle || "Unemployed";
      pc.salary = Number(pc.salary || 0);
      pc.skills = pc.skills || {communication:20,technical:20,finance:10,management:10,sales:20};
      pc.applications = pc.applications || [];
      pc._zeroCareerInitialized = true;
      State.data.playerCareer = pc;
      return pc;
    }
    State.data.playerCareer = {
      ...pc,
      currentJobId: null, currentCompany: null, currentPosition: null,
      currentIndustry: null, level: 0, levelTitle: "Unemployed", salary: 0,
      monthsInPosition: 0, yearsExperience: 0, performance: 70,
      skills: pc.skills || { communication: 20, technical: 20, finance: 10, management: 10, sales: 20 },
      education: pc.education || "SMA/SMK",
      cv: pc.cv || {summary:"",workHistory:[]}, applications: pc.applications || [],
      interviewsPassed: pc.interviewsPassed || 0, interviewsFailed: pc.interviewsFailed || 0,
      _zeroCareerInitialized: true
    };
    /* Starting a new career must never inject money, assets, business or portfolio. */
    State.data.cash = 0;
    State.data.portfolio = State.data.portfolio || {};
    State.data.portfolio.cash = 0;
    State.data.portfolio.holdings = State.data.portfolio.holdings || [];
    State.data.assets = State.data.assets || [];
    State.data.businesses = State.data.businesses || [];
    State.data.investments = State.data.investments || [];
    State.data.playerAssets = State.data.playerAssets || [];
    return State.data.playerCareer;
  },

  startCareer(careerType="employee", skillSeed={}) {
    this.initCareerFromZero(false);
    const pc = State.data.playerCareer;
    pc.careerType = careerType;
    pc.skills = Object.assign(pc.skills, skillSeed);
    this._notify("Career Dimulai Dari Nol", "Belum ada modal, aset, bisnis, pekerjaan, atau portfolio. Bangun semuanya melalui aktivitas game.", "info");
    return pc;
  },

  getCareerNetWorth() {
    return this._cash() + this._portfolioValue() + this._assetValue() + this._businessValue();
  },

  /* ---------- 123-127: INVESTORS ---------- */
  INVESTOR_TYPES: {
    angel: {label:"Angel Investor", risk:70, size:[50000000,1000000000], horizon:[24,60]},
    vc: {label:"Venture Capital", risk:55, size:[500000000,10000000000], horizon:[36,84]},
    partner: {label:"Business Partner", risk:45, size:[20000000,2000000000], horizon:[24,120]},
    private: {label:"Private Investor", risk:50, size:[100000000,5000000000], horizon:[24,72]},
    strategic: {label:"Strategic Investor", risk:40, size:[250000000,20000000000], horizon:[36,120]}
  },

  _investorName() {
    const first=["Arif","Maya","Rendra","Nadia","Bima","Dian","Raka","Sinta"];
    const last=["Pratama","Wijaya","Santoso","Kusuma","Halim","Permata","Nugraha","Putra"];
    return first[Math.floor(Math.random()*first.length)]+" "+last[Math.floor(Math.random()*last.length)];
  },

  ensureBusinessSystems(bizId) {
    const d=State.data;
    d.investorOffers=d.investorOffers||[];
    d.investors=d.investors||[];
    d.businessValuations=d.businessValuations||{};
    d.businessIncidents=d.businessIncidents||[];
    d.businessInsurance=d.businessInsurance||{};
    d.businessRisk=d.businessRisk||{};
    d.businessPrevention=d.businessPrevention||{};
    d.emergencyFunds=d.emergencyFunds||{};
    d.businessLoans=d.businessLoans||[];
    d.businessAccounting=d.businessAccounting||{};
    d.businessProducts=d.businessProducts||{};
    d.businessBranches=d.businessBranches||{};
    d.businessLocations=d.businessLocations||{};
    d.competitors=d.competitors||{};
    d.marketingCampaigns=d.marketingCampaigns||[];
    d.customerSegments=d.customerSegments||{};
    d.businessReports=d.businessReports||{};
    d.calendar=d.calendar||[];
    d.tasks=d.tasks||[];
    d.meetings=d.meetings||[];
    d.businessPartners=d.businessPartners||[];
    d.ownership=d.ownership||{};
    d.dividendPolicies=d.dividendPolicies||{};
    d.businessDecisions=d.businessDecisions||[];
    d.achievements=d.achievements||[];
    d.portfolio=d.portfolio||{cash:0,holdings:[]};
    if (!bizId) return;
    d.businessRisk[bizId] ||= this._defaultRisk();
    d.businessPrevention[bizId] ||= {};
    d.businessAccounting[bizId] ||= this._freshAccounting();
    d.businessProducts[bizId] ||= [];
    d.businessBranches[bizId] ||= [];
    d.businessLocations[bizId] ||= [];
    d.customerSegments[bizId] ||= this._freshCustomers();
    d.businessReports[bizId] ||= {monthly:[],yearly:[]};
    d.ownership[bizId] ||= [{owner:"player",share:100}];
    d.dividendPolicies[bizId] ||= "no_dividend";
    d.emergencyFunds[bizId] ||= 0;
    d.businessInsurance[bizId] ||= [];
  },

  investorInterest(businessId) {
    const biz=this._biz(businessId); if(!biz) return {interested:false,score:0};
    const v=this.calculateValuation(businessId);
    const c=this._customers(businessId);
    const rep=(typeof BusinessEngine!=="undefined"?BusinessEngine.getReputation(businessId):50);
    const revenue=Number(biz.revenue||biz.monthlyRevenue||v.revenue||0);
    const profit=Number(biz.profit||biz.monthlyProfit||v.profit||0);
    const growth=Number(biz.growth||v.growth||0);
    const risk=this._riskScore(businessId);
    const score=this._clamp(
      25 + Math.log10(Math.max(1,revenue))/3 + Math.log10(Math.max(1,profit))/2 +
      growth*0.35 + rep*0.25 + c.count*0.03 - risk*0.35, 0,100);
    return {interested:score>=62,score:Math.round(score),valuation:v.value};
  },

  generateInvestmentOffer(businessId, type) {
    this.ensureBusinessSystems(businessId);
    const interest=this.investorInterest(businessId);
    if(!interest.interested || Math.random()>0.72) return null;
    const key=type||Object.keys(this.INVESTOR_TYPES)[Math.floor(Math.random()*5)];
    const cfg=this.INVESTOR_TYPES[key];
    const value=Math.max(1000000,interest.valuation||this.calculateValuation(businessId).value);
    const amount=Math.round(this._clamp(value*this._rand(.05,.35),cfg.size[0],cfg.size[1]));
    const equity=this._clamp(amount/value*100*this._rand(.8,1.25),3,40);
    const offer={
      id:this._id("offer"),businessId,investorId:null,investorType:key,
      investorName:this._investorName(),investment:amount,requestedEquity:Number(equity.toFixed(1)),
      expectedGrowth:Math.round(this._rand(8,28)),risk:this._riskLabel(this._riskScore(businessId)),
      background:`${cfg.label} dengan horizon ${cfg.horizon[0]}–${cfg.horizon[1]} bulan dan preferensi risiko ${cfg.risk}/100.`,
      status:"pending",createdAt:this._date()
    };
    State.data.investorOffers.push(offer);
    this._notify("Investment Offer",`${offer.investorName} menawarkan Rp${amount.toLocaleString("id-ID")} untuk ${offer.requestedEquity}% saham.`,`info`);
    return offer;
  },

  negotiateInvestment(offerId, proposedInvestment, proposedEquity) {
    const o=(State.data.investorOffers||[]).find(x=>x.id===offerId&&x.status==="pending");
    if(!o) return {success:false,error:"Offer tidak ditemukan"};
    const v=this.calculateValuation(o.businessId).value;
    const implied=proposedInvestment/(Math.max(.1,proposedEquity)/100);
    const fairness=this._clamp(1-Math.abs(implied-v)/Math.max(v,1),0,1);
    const cfg=this.INVESTOR_TYPES[o.investorType];
    const riskFit=this._clamp(1-Math.max(0,(this._riskScore(o.businessId)-cfg.risk))/100,0,1);
    const chance=this._clamp(.15+.6*fairness+.25*riskFit, .05,.9);
    if(Math.random()<chance) {
      o.negotiated={investment:Math.round(proposedInvestment),equity:Number(proposedEquity.toFixed(1))};
      return {success:true,accepted:true,probability:chance,offer:o};
    }
    return {success:true,accepted:false,probability:chance,offer:o};
  },

  acceptInvestment(offerId) {
    const o=(State.data.investorOffers||[]).find(x=>x.id===offerId&&x.status==="pending");
    if(!o) return {success:false,error:"Offer tidak ditemukan"};
    const terms=o.negotiated||{investment:o.investment,equity:o.requestedEquity};
    const existing=(State.data.ownership[o.businessId]||[]).filter(x=>x.owner!=="player");
    const player=State.data.ownership[o.businessId].find(x=>x.owner==="player");
    const eq=this._clamp(Number(terms.equity),0,90);
    player.share=Math.max(0,player.share-eq);
    State.data.ownership[o.businessId].push({owner:o.investorName,share:eq,investorId:o.id});
    o.status="accepted"; o.acceptedAt=this._date();
    State.data.investors.push({id:this._id("inv"),offerId:o.id,businessId:o.businessId,name:o.investorName,type:o.investorType,investment:terms.investment,equity:eq,terms:{reporting:true,profitShare:true},active:true});
    this._setCash(this._cash()+terms.investment);
    this._addTx("Investment","Modal investor masuk",terms.investment);
    this._notify("Investor Masuk",`${o.investorName} resmi memiliki ${eq}% bisnis.`,`success`);
    return {success:true,terms};
  },

  rejectInvestment(offerId) {
    const o=(State.data.investorOffers||[]).find(x=>x.id===offerId&&x.status==="pending");
    if(!o) return {success:false,error:"Offer tidak ditemukan"};
    o.status="rejected"; o.rejectedAt=this._date(); return {success:true};
  },

  /* ---------- 128: VALUATION ---------- */
  calculateValuation(businessId) {
    const b=this._biz(businessId); if(!b) return {value:0};
    this.ensureBusinessSystems(businessId);
    const revenue=Number(b.revenue||b.monthlyRevenue||0);
    const profit=Number(b.profit||b.monthlyProfit||0);
    const assets=Number(b.assetsValue||b.assetValue||b.value||0);
    const debt=Number(b.debt||0);
    const customers=this._customers(businessId).count||0;
    const rep=typeof BusinessEngine!=="undefined"?BusinessEngine.getReputation(businessId):50;
    const growth=Number(b.growth||0);
    const industryMult=this._industryMultiple(b.type||b.businessType||"general");
    const market=Number(State.data.economy?.marketSentiment||50);
    const risk=this._riskScore(businessId);
    const income=Math.max(0,profit)*12*industryMult;
    const revenueMethod=Math.max(0,revenue)*12*industryMult*.45;
    const assetMethod=Math.max(0,assets-debt);
    const value=Math.max(0,Math.round((income*.45+revenueMethod+assetMethod*.35)*(0.65+rep/250+growth/500+(market-50)/500)*(1-risk/250)));
    const out={value,revenue,profit,assets,debt,customers,reputation:rep,growth,risk,marketSentiment:market,updatedAt:this._date()};
    State.data.businessValuations[businessId]=out;
    return out;
  },

  _industryMultiple(type) {
    const t=String(type).toLowerCase();
    if(/tech|internet|software|digital/.test(t)) return 2.2;
    if(/restaurant|food/.test(t)) return 1.1;
    if(/retail|store|book/.test(t)) return .9;
    if(/property|real/.test(t)) return 1.3;
    return 1;
  },

  /* ---------- 129-135: INCIDENTS + PARTIAL DAMAGE ---------- */
  INCIDENT_POOLS: {
    restaurant:[
      ["kitchen_fire","Kebakaran dapur","equipment", "fire", "major"],
      ["freezer_failure","Freezer rusak","equipment","equipment","moderate"],
      ["food_spoilage","Bahan makanan rusak","inventory","supply","moderate"],
      ["food_poisoning","Komplain keracunan makanan","operations","reputation","major"],
      ["employee_absent","Karyawan tidak masuk","staff","employee","minor"],
      ["customer_complaint","Komplain customer","operations","reputation","minor"]
    ],
    bookstore:[
      ["warehouse_fire","Kebakaran gudang","warehouse","fire","major"],
      ["book_theft","Pencurian buku","inventory","theft","moderate"],
      ["water_damage","Buku rusak karena air","inventory","disaster","moderate"],
      ["rack_damage","Rak rusak","storefront","equipment","minor"],
      ["cashier_failure","Kasir bermasalah","cashier","equipment","minor"],
      ["supplier_delay","Supplier terlambat","inventory","supply","moderate"]
    ],
    youtube:[
      ["copyright_claim","Copyright claim","channel","copyright","moderate"],
      ["demonetized","Video demonetisasi","channel","platform","major"],
      ["channel_warning","Channel terkena warning","channel","platform","major"],
      ["sponsor_cancel","Sponsor membatalkan kerja sama","sponsor","market","moderate"],
      ["camera_failure","Kamera rusak","equipment","equipment","moderate"],
      ["laptop_failure","Laptop rusak","equipment","equipment","major"]
    ],
    internet:[
      ["server_down","Server down","server","cyber","major"],
      ["database_error","Database error","database","cyber","major"],
      ["cyber_incident","Cyber incident","security","cyber","critical"],
      ["payment_failure","Payment failure","payment","operations","moderate"],
      ["customer_complaint","Customer complaint","operations","reputation","minor"]
    ],
    online_store:[
      ["damaged_goods","Barang rusak","inventory","supply","moderate"],
      ["lost_package","Paket hilang","delivery","logistics","moderate"],
      ["warehouse_problem","Gudang bermasalah","warehouse","equipment","major"],
      ["supplier_delay","Supplier terlambat","inventory","supply","moderate"],
      ["returns_surge","Return meningkat","operations","market","moderate"]
    ],
    default:[
      ["equipment_failure","Peralatan rusak","equipment","equipment","moderate"],
      ["supplier_delay","Supplier terlambat","inventory","supply","moderate"],
      ["customer_complaint","Komplain customer","operations","reputation","minor"],
      ["employee_error","Kesalahan karyawan","operations","employee","minor"],
      ["theft","Pencurian","inventory","theft","moderate"]
    ]
  },

  _businessTypeKey(b) {
    const s=String(b?.type||b?.businessType||b?.category||"default").toLowerCase();
    if(/restaurant|resto|food/.test(s)) return "restaurant";
    if(/book/.test(s)) return "bookstore";
    if(/youtube|creator/.test(s)) return "youtube";
    if(/internet|software|web/.test(s)) return "internet";
    if(/online|ecommerce|shop/.test(s)) return "online_store";
    return "default";
  },

  createIncident(businessId, forcedType=null) {
    const b=this._biz(businessId); if(!b) return {success:false,error:"Bisnis tidak ditemukan"};
    this.ensureBusinessSystems(businessId);
    const pool=this.INCIDENT_POOLS[this._businessTypeKey(b)]||this.INCIDENT_POOLS.default;
    const row=forcedType ? pool.find(x=>x[0]===forcedType)||pool[Math.floor(Math.random()*pool.length)] : pool[Math.floor(Math.random()*pool.length)];
    const severity=row[4], damagePct={minor:this._rand(5,20),moderate:this._rand(15,45),major:this._rand(40,75),critical:this._rand(70,100)}[severity];
    const scale=Math.max(500000,Number(b.value||b.assetsValue||b.totalInvested||10000000));
    const damage=Math.round(scale*damagePct/100*.08);
    const incident={
      id:this._id("incident"),businessId,type:row[0],title:row[1],affectedArea:row[2],cause:row[3],
      severity,damageLevel:Math.round(damagePct),damageAmount:damage,
      inventoryLoss:row[2]==="inventory"||row[2]==="warehouse"?Math.round(damage*.45):0,
      repairCost:Math.round(damage*.45),temporaryRevenueLoss:Math.round(damage*.2),
      status:"open",createdAt:this._date(),recoveryDays:Math.max(1,Math.round({minor:1,moderate:3,major:7,critical:14}[severity]*this._rand(.7,1.3)))
    };
    State.data.businessIncidents.unshift(incident);
    b._partialDamage=b._partialDamage||{};
    b._partialDamage[row[2]]={status:"damaged",damageLevel:incident.damageLevel,incidentId:incident.id};
    if(incident.inventoryLoss && State.data.inventory?.[businessId]) {
      const items=State.data.inventory[businessId]; const loss=Math.min(items.reduce((a,i)=>a+i.stock,0),Math.round(incident.inventoryLoss/Math.max(1,items[0]?.buyPrice||10000)));
      let left=loss; for(const item of items){const x=Math.min(item.stock,left);item.stock-=x;item.damagedStock=(item.damagedStock||0)+x;left-=x;if(left<=0)break;}
    }
    this._notify("Business Incident",`${incident.title}: ${incident.affectedArea} rusak ${incident.damageLevel}%.`,`warning`);
    return {success:true,incident};
  },

  getDamageReport(incidentId) {
    const x=(State.data.businessIncidents||[]).find(i=>i.id===incidentId);
    if(!x) return null;
    const ins=this._insuranceCoverage(x.businessId,x);
    return {...x,insurance:ins,uncoveredCost:Math.max(0,x.repairCost-ins.payout)};
  },

  repairIncident(incidentId,mode="repair") {
    const x=(State.data.businessIncidents||[]).find(i=>i.id===incidentId&&i.status==="open");
    if(!x) return {success:false,error:"Insiden tidak ditemukan"};
    const cost=mode==="temporary_fix"?Math.round(x.repairCost*.25):mode==="replace"?Math.round(x.repairCost*1.25):x.repairCost;
    if(cost>this._cash()) return {success:false,error:"Cash tidak cukup"};
    this._setCash(this._cash()-cost); this._addTx("Business Repair",x.title,-cost);
    x.status=mode==="delay"?"delayed":"repaired"; x.recoveryMode=mode; x.actualRepairCost=cost; x.repairedAt=this._date();
    const b=this._biz(x.businessId); if(b?._partialDamage) delete b._partialDamage[x.affectedArea];
    return {success:true,cost,status:x.status};
  },

  /* ---------- 136-138: INSURANCE/PREVENTION ---------- */
  INSURANCE_TYPES:{
    fire:{name:"Fire Insurance",covers:["fire"],rate:.012,coverage:.8,deductible:.1},
    property:{name:"Property Insurance",covers:["fire","disaster","equipment"],rate:.009,coverage:.75,deductible:.12},
    inventory:{name:"Inventory Insurance",covers:["theft","supply","disaster"],rate:.01,coverage:.7,deductible:.1},
    equipment:{name:"Equipment Insurance",covers:["equipment"],rate:.008,coverage:.8,deductible:.1},
    interruption:{name:"Business Interruption Insurance",covers:["fire","disaster","equipment"],rate:.006,coverage:.6,deductible:.15}
  },
  buyInsurance(businessId,type,coverageAmount,durationMonths=12) {
    this.ensureBusinessSystems(businessId); const cfg=this.INSURANCE_TYPES[type]; if(!cfg)return {success:false,error:"Jenis asuransi tidak ada"};
    const amount=Math.max(1,Number(coverageAmount)); const premium=Math.round(amount*cfg.rate*durationMonths/12);
    if(premium>this._cash()) return {success:false,error:"Cash tidak cukup"};
    this._setCash(this._cash()-premium); this._addTx("Insurance",cfg.name,-premium);
    const p={id:this._id("policy"),type,name:cfg.name,coverageAmount:amount,premium,deductible:cfg.deductible,durationMonths,remainingMonths:durationMonths,active:true,startDate:this._date()};
    State.data.businessInsurance[businessId].push(p); return {success:true,policy:p};
  },
  _insuranceCoverage(businessId,incident) {
    const policies=State.data.businessInsurance?.[businessId]||[];
    let payout=0,coveredAmount=0,deductible=0;
    policies.filter(p=>p.active).forEach(p=>{
      const cfg=this.INSURANCE_TYPES[p.type]; if(!cfg||!cfg.covers.includes(incident.cause))return;
      coveredAmount+=incident.repairCost*cfg.coverage;
      deductible+=incident.repairCost*cfg.deductible;
    });
    payout=Math.max(0,Math.min(incident.repairCost,coveredAmount-deductible));
    return {coveredAmount:Math.round(coveredAmount),deductible:Math.round(deductible),payout:Math.round(payout)};
  },
  claimInsurance(incidentId) {
    const x=(State.data.businessIncidents||[]).find(i=>i.id===incidentId);
    if(!x)return {success:false,error:"Insiden tidak ditemukan"};
    if(x.insuranceClaimed)return {success:false,error:"Claim sudah diajukan"};
    const c=this._insuranceCoverage(x.businessId,x); x.insuranceClaimed=true;x.insurancePayout=c.payout;
    this._setCash(this._cash()+c.payout); this._addTx("Insurance Payout","Klaim "+x.title,c.payout);
    this._notify("Insurance Claim",`Payout Rp${c.payout.toLocaleString("id-ID")}; biaya tidak tertutup Rp${Math.max(0,x.repairCost-c.payout).toLocaleString("id-ID")}.`,"success");
    return {success:true,...c};
  },
  _defaultRisk(){return {fire:35,theft:30,equipment:30,employee:25,supply:30,market:35,naturalDisaster:20,cyber:30};},
  installPrevention(businessId,type) {
    const costs={fire_alarm:2500000,cctv:3500000,security_guard:5000000,extinguisher:800000,flood_protection:4000000,anti_theft:4500000,cyber_security:6000000,backup_generator:7500000,maintenance:3000000};
    const effects={fire_alarm:{fire:-18},cctv:{theft:-15},security_guard:{theft:-20},extinguisher:{fire:-10},flood_protection:{naturalDisaster:-18},anti_theft:{theft:-25},cyber_security:{cyber:-30},backup_generator:{equipment:-8},maintenance:{equipment:-18}};
    if(!costs[type])return {success:false,error:"Prevention tidak ditemukan"};
    if(costs[type]>this._cash())return {success:false,error:"Cash tidak cukup"};
    this._setCash(this._cash()-costs[type]); this._addTx("Risk Prevention",type,-costs[type]);
    const r=State.data.businessRisk[businessId]||this._defaultRisk(); const e=effects[type];
    Object.keys(e).forEach(k=>r[k]=this._clamp((r[k]||0)+e[k],0,100));
    State.data.businessPrevention[businessId][type]=true; return {success:true,cost:costs[type],risk:r};
  },
  _riskScore(id){const r=State.data.businessRisk?.[id]||this._defaultRisk();return Object.values(r).reduce((a,b)=>a+b,0)/Object.keys(r).length;},
  _riskLabel(n){return n<30?"Low":n<60?"Medium":"High";},

  /* ---------- 142-143: EMERGENCY FUND + LOANS ---------- */
  depositEmergencyFund(businessId,amount) {
    amount=Math.floor(amount); if(amount<=0||amount>this._cash())return {success:false,error:"Jumlah tidak valid"};
    this._setCash(this._cash()-amount); State.data.emergencyFunds[businessId]=(State.data.emergencyFunds[businessId]||0)+amount;
    this._addTx("Emergency Fund","Setor dana darurat",-amount); return {success:true,balance:State.data.emergencyFunds[businessId]};
  },
  withdrawEmergencyFund(businessId,amount) {
    const bal=State.data.emergencyFunds[businessId]||0; amount=Math.min(Math.floor(amount),bal);
    if(amount<=0)return {success:false,error:"Dana tidak cukup"}; State.data.emergencyFunds[businessId]-=amount;this._setCash(this._cash()+amount);
    this._addTx("Emergency Fund","Tarik dana darurat",amount);return {success:true,balance:State.data.emergencyFunds[businessId]};
  },
  creditScore() {
    const loans=State.data.businessLoans||[]; let score=650;
    loans.forEach(l=>{score+=l.latePayments?-l.latePayments*35:0;score+=l.status==="paid"?20:0;score+=l.status==="default"?-120:0;});
    return this._clamp(Math.round(score),300,850);
  },
  requestBusinessLoan(businessId,amount,durationMonths=24,collateral=0) {
    amount=Math.floor(amount); const score=this.creditScore(); const profit=Number(this.calculateValuation(businessId).profit||0);
    const rate=this._clamp((State.data.economy?.interestRate||.06)+(.8-score/850)*.06,.04,.18);
    const approvalChance=this._clamp(.1+(score-300)/550*.6+(profit>0?.2:0)+(collateral>amount?.1:0),.05,.9);
    if(Math.random()>approvalChance)return {success:false,approved:false,approvalChance,rate,creditScore:score};
    const total=Math.round(amount*(1+rate*durationMonths/12)); const monthly=Math.round(total/durationMonths);
    const loan={id:this._id("loan"),businessId,amount,interestRate:rate,durationMonths,monthlyPayment:monthly,totalRepayment:total,remaining:total,collateral,creditScore:score,status:"active",startDate:this._date(),nextPaymentDay:30};
    State.data.businessLoans.push(loan);this._setCash(this._cash()+amount);this._addTx("Business Loan","Pencairan pinjaman",amount);
    this._notify("Business Loan Disetujui",`Rp${amount.toLocaleString("id-ID")} dengan cicilan Rp${monthly.toLocaleString("id-ID")}/bulan.`,"success");
    return {success:true,approved:true,loan};
  },
  payLoan(loanId,amount=null) {
    const l=(State.data.businessLoans||[]).find(x=>x.id===loanId&&x.status==="active");if(!l)return {success:false,error:"Pinjaman tidak ditemukan"};
    const pay=Math.min(l.remaining,Math.floor(amount||l.monthlyPayment)); if(pay>this._cash())return {success:false,error:"Cash tidak cukup"};
    this._setCash(this._cash()-pay);l.remaining-=pay;l.payments=(l.payments||0)+1;if(l.remaining<=0){l.remaining=0;l.status="paid";}
    this._addTx("Loan Payment","Pembayaran pinjaman",-pay);return {success:true,remaining:l.remaining,status:l.status};
  },

  /* ---------- 146: ACCOUNTING + CASH FLOW ---------- */
  _freshAccounting(){return {revenue:0,cogs:0,employeeSalary:0,rent:0,utilities:0,marketing:0,maintenance:0,tax:0,loanPayment:0,insurance:0,damage:0,investing:0,financing:0};},
  recordAccounting(businessId,kind,amount) {
    this.ensureBusinessSystems(businessId); const a=State.data.businessAccounting[businessId]; if(a[kind]!==undefined)a[kind]+=Number(amount);
    a.totalExpense=(a.cogs||0)+(a.employeeSalary||0)+(a.rent||0)+(a.utilities||0)+(a.marketing||0)+(a.maintenance||0)+(a.tax||0)+(a.loanPayment||0)+(a.insurance||0)+(a.damage||0);
    a.profit=(a.revenue||0)-a.totalExpense; a.netCashFlow=(a.revenue||0)-a.totalExpense+(a.financing||0)-(a.investing||0); return a;
  },
  getFinancialStatement(businessId) {
    this.ensureBusinessSystems(businessId); const a=State.data.businessAccounting[businessId];
    const b=this._biz(businessId)||{}; const assets=this._assetValueForBusiness(businessId); const debt=(State.data.businessLoans||[]).filter(l=>l.businessId===businessId&&l.status==="active").reduce((x,l)=>x+l.remaining,0);
    return {incomeStatement:{revenue:a.revenue,expenses:a.totalExpense||0,profit:a.profit||0},balanceSheet:{assets,liabilities:debt,equity:Math.max(0,assets-debt)},cashFlow:{operating:(a.revenue||0)-(a.totalExpense||0)+(a.loanPayment||0),investing:-(a.investing||0),financing:a.financing||0,net:a.netCashFlow||0},transactionHistory:State.data.transactions||[]};
  },

  /* ---------- 147-148: EXPANSION / DYNAMIC BUSINESS WORLD ---------- */
  addProduct(businessId,product) {
    this.ensureBusinessSystems(businessId);
    const p={id:this._id("product"),name:product.name,category:product.category||"general",supplierId:product.supplierId||null,purchaseCost:Number(product.purchaseCost||0),sellingPrice:Number(product.sellingPrice||0),expectedDemand:Number(product.expectedDemand||50),inventory:0,shelfSpace:Number(product.shelfSpace||1),image:product.image||null};
    State.data.businessProducts[businessId].push(p); return p;
  },
  openBranch(businessId,location) {
    this.ensureBusinessSystems(businessId); const cost=Number(location.cost||location.rent*3||0);
    if(cost>this._cash())return {success:false,error:"Cash tidak cukup"};
    this._setCash(this._cash()-cost);const br={id:this._id("branch"),businessId,location:location.name||"Unknown",rent:Number(location.rent||0),cost,openedAt:this._date(),status:"operational",capacity:Number(location.capacity||100),demand:Number(location.demand||50)};
    State.data.businessBranches[businessId].push(br);this._addTx("Branch Expansion","Buka cabang "+br.location,-cost);return {success:true,branch:br};
  },
  recommendLocations(businessType) {
    const names=["Jakarta Selatan","Surabaya Barat","Bandung Tengah","Yogyakarta","Semarang","Malang"];
    return names.map((name,i)=>({name,demand:70-i*4,competition:45+i*5,rent:8000000+i*5000000,purchasingPower:70-i*2,traffic:60+i*3,risk:30+i*4,growthPotential:65-i*2,businessType}));
  },
  addCompetitor(businessId,competitor={}) {
    const c={id:this._id("comp"),businessId,name:competitor.name||"Kompetitor "+Math.ceil(Math.random()*999),priceStrategy:competitor.priceStrategy||"standard",quality:competitor.quality||50,marketing:competitor.marketing||50,expansionRate:competitor.expansionRate||30,cash:competitor.cash||100000000};
    State.data.competitors[businessId] ||= [];State.data.competitors[businessId].push(c);return c;
  },
  launchMarketing(businessId,type,budget,duration=30) {
    const mult={social_media:[1.2,.08],advertisement:[1.5,.12],influencer:[1.8,.16],billboard:[1.3,.1],discount:[2,.18],promotion:[1.6,.14],email:[1.1,.1],event:[1.7,.13],referral:[1.3,.15]}[type]||[1,0];
    if(budget>this._cash())return {success:false,error:"Cash tidak cukup"};this._setCash(this._cash()-budget);
    const c={id:this._id("mkt"),businessId,type,budget,duration,reach:Math.round(budget/1000*mult[0]),conversion:mult[1],roi:0,status:"active",start:this._date()};
    State.data.marketingCampaigns.push(c);this._addTx("Marketing",type,-budget);return {success:true,campaign:c};
  },
  _freshCustomers(){return {count:0,satisfaction:60,loyalty:50,budget:50,segments:{},purchaseFrequency:1};},

  /* ---------- 87-94: ASSET PORTFOLIO ---------- */
  buyAsset(asset) {
    const price=Number(asset.price||0);if(price<=0||price>this._cash())return {success:false,error:"Cash tidak cukup"};
    this._setCash(this._cash()-price);State.data.portfolio.holdings.push({...asset,id:asset.id||this._id("asset"),cost:price,currentValue:price,purchasedAt:this._date()});
    this._addTx("Asset Purchase",asset.name||asset.type,-price);return {success:true};
  },
  sellAsset(assetId) {
    const h=(State.data.portfolio.holdings||[]).find(x=>x.id===assetId);if(!h)return {success:false,error:"Asset tidak ditemukan"};
    const value=Number(h.currentValue||h.price||h.cost||0);this._setCash(this._cash()+value);State.data.portfolio.holdings=State.data.portfolio.holdings.filter(x=>x.id!==assetId);
    this._addTx("Asset Sale",h.name||h.type,value);return {success:true,proceeds:value};
  },
  updateOfflineAsset(assetId,patch) {
    const h=(State.data.portfolio.holdings||[]).find(x=>x.id===assetId);if(!h)return null;Object.assign(h,patch);return h;
  },
  _portfolioValue(){return (State.data.portfolio?.holdings||[]).reduce((a,h)=>a+Number(h.currentValue||h.price||h.cost||0),0);},
  _assetValue(){return this._portfolioValue();},
  _assetValueForBusiness(id){return (State.data.portfolio?.holdings||[]).filter(h=>h.businessId===id).reduce((a,h)=>a+Number(h.currentValue||h.cost||0),0);},
  _businessValue(){return (State.data.businesses||[]).reduce((a,b)=>a+Number(this.calculateValuation(b.id||b.name).value||b.value||0),0);},
  portfolioSummary(){
    const h=State.data.portfolio?.holdings||[];const total=this._portfolioValue();const cost=h.reduce((a,x)=>a+Number(x.cost||0),0);
    const by={};h.forEach(x=>{const k=x.category||x.type||"Other";by[k]=(by[k]||0)+Number(x.currentValue||x.cost||0);});
    return {totalValue:total,totalCost:cost,unrealizedPL:total-cost,allocation:Object.fromEntries(Object.entries(by).map(([k,v])=>[k,total?Number((v/total*100).toFixed(1)):0]))};
  },

  /* ---------- 104-115: REPORTS / ACHIEVEMENTS / CALENDAR / TASKS ---------- */
  monthlyReport(businessId) {
    this.ensureBusinessSystems(businessId);const a=State.data.businessAccounting[businessId];const b=this._biz(businessId)||{};
    const r={period:this._date(),revenue:a.revenue||0,profit:a.profit||0,expenses:a.totalExpense||0,cashFlow:a.netCashFlow||0,businessGrowth:Number(b.growth||0),employeeCost:a.employeeSalary||0,customerGrowth:this._customers(businessId).count,assetPerformance:this._assetValueForBusiness(businessId),investmentReturn:0,netWorthChange:this.getCareerNetWorth()};
    State.data.businessReports[businessId].monthly.unshift(r);State.data.businessAccounting[businessId]=this._freshAccounting();return r;
  },
  yearlyReport(businessId) {
    const rows=State.data.businessReports?.[businessId]?.monthly||[];const yearRows=rows.slice(0,12);return {period:"Year "+(State.data.time?.year||1),annualRevenue:yearRows.reduce((a,r)=>a+r.revenue,0),annualProfit:yearRows.reduce((a,r)=>a+r.profit,0),businessValue:this.calculateValuation(businessId).value,netWorth:this.getCareerNetWorth(),portfolioReturn:this.portfolioSummary().unrealizedPL,businessGrowth:yearRows.reduce((a,r)=>a+r.businessGrowth,0)/Math.max(1,yearRows.length),majorEvents:(State.data.businessIncidents||[]).filter(x=>x.businessId===businessId).slice(0,10),majorDecisions:(State.data.businessDecisions||[]).filter(x=>x.businessId===businessId).slice(0,10)};
  },
  addTask(task){const t={id:this._id("task"),deadline:task.deadline||this._date(),reward:task.reward||0,priority:task.priority||"normal",status:"open",...task};State.data.tasks.push(t);return t;},
  addCalendarEvent(e){const x={id:this._id("cal"),status:"scheduled",...e};State.data.calendar.push(x);return x;},
  scheduleMeeting(type,participants,agenda){const m={id:this._id("meet"),type,participants,agenda,status:"scheduled",date:this._date()};State.data.meetings.push(m);return m;},
  addPartner(businessId,partner){this.ensureBusinessSystems(businessId);const p={id:this._id("partner"),businessId,capital:partner.capital||0,skill:partner.skill||50,network:partner.network||50,personality:partner.personality||"balanced",ownership:partner.ownership||0,role:partner.role||"Partner",expectation:partner.expectation||"growth"};State.data.businessPartners.push(p);return p;},
  setDividendPolicy(businessId,policy){if(!["no_dividend","low","medium","high"].includes(policy))return {success:false,error:"Policy invalid"};State.data.dividendPolicies[businessId]=policy;return {success:true,policy};},
  distributeDividend(businessId,amount){const owners=State.data.ownership[businessId]||[];if(amount>this._cash())return {success:false,error:"Cash tidak cukup"};this._setCash(this._cash()-amount);owners.forEach(o=>{o.lastDividend=Math.round(amount*o.share/100);});this._addTx("Dividend","Distribusi dividen",-amount);return {success:true,amount,owners};},

  /* ---------- 149: CONSISTENT DAILY/MONTHLY SIMULATION ---------- */
  processDaily() {
    (State.data.businessIncidents||[]).filter(x=>x.status==="open"||x.status==="delayed").forEach(x=>{if(x.recoveryDays>0)x.recoveryDays--;});
    (State.data.businessLoans||[]).filter(l=>l.status==="active").forEach(l=>{if(l.nextPaymentDay>0)l.nextPaymentDay--;});
    (State.data.businessInsurance&&Object.keys(State.data.businessInsurance).length?Object.values(State.data.businessInsurance).flat():[]).forEach(p=>{if(p.active&&p.remainingMonths<=0)p.active=false;});
  },
  processMonthly() {
    (State.data.businesses||[]).forEach(b=>{const id=b.id||b.name;this.ensureBusinessSystems(id);this.calculateValuation(id);this._simulateCustomerAndCompetitors(id);this._simulateRisk(id);this._processInvestorReports(id);});
    this._processLoanPayments();
  },
  processYearly() {
    (State.data.businesses||[]).forEach(b=>this.yearlyReport(b.id||b.name));
  },
  _simulateCustomerAndCompetitors(id) {
    const c=this._customers(id);const rep=typeof BusinessEngine!=="undefined"?BusinessEngine.getReputation(id):50;
    const demand=State.data.economy?.purchasingPower||100;
    c.count=Math.max(0,Math.round((c.count||0)*(1+((rep-50)/1000)+(demand-100)/2000)));
    (State.data.competitors[id]||[]).forEach(x=>{if(Math.random()<.25)x.marketing=this._clamp(x.marketing+this._rand(-5,8),0,100);});
  },
  _simulateRisk(id) {
    const r=State.data.businessRisk[id]||this._defaultRisk();const biz=this._biz(id);
    const scale=this._riskScore(id)/100;const chance=.015+.04*scale;
    if(Math.random()<chance)this.createIncident(id);
  },
  _processInvestorReports(id){(State.data.investors||[]).filter(i=>i.businessId===id&&i.active).forEach(i=>{i.lastReport=this._date();});},
  _processLoanPayments(){/* payment is intentionally explicit; no silent cash drain */},

  _customers(id){this.ensureBusinessSystems(id);return State.data.customerSegments[id];},
  _biz(id){return (State.data.businesses||[]).find(b=>(b.id||b.name)===id);},
};

function initBizSimLifeSystems(){
  if(typeof State==="undefined"||!State.data)return;
  const d=State.data;
  d.investorOffers=d.investorOffers||[];d.investors=d.investors||[];d.businessValuations=d.businessValuations||{};
  d.businessIncidents=d.businessIncidents||[];d.businessInsurance=d.businessInsurance||{};d.businessRisk=d.businessRisk||{};
  d.businessPrevention=d.businessPrevention||{};d.emergencyFunds=d.emergencyFunds||{};d.businessLoans=d.businessLoans||[];
  d.businessAccounting=d.businessAccounting||{};d.businessProducts=d.businessProducts||{};d.businessBranches=d.businessBranches||{};
  d.businessLocations=d.businessLocations||{};d.competitors=d.competitors||{};d.marketingCampaigns=d.marketingCampaigns||[];
  d.customerSegments=d.customerSegments||{};d.businessReports=d.businessReports||{};d.calendar=d.calendar||[];
  d.tasks=d.tasks||[];d.meetings=d.meetings||[];d.businessPartners=d.businessPartners||[];d.ownership=d.ownership||{};
  d.dividendPolicies=d.dividendPolicies||{};d.portfolio=d.portfolio||{cash:0,holdings:[]};
  BizSimLifeEngine.initCareerFromZero();
  (d.businesses||[]).forEach(b=>BizSimLifeEngine.ensureBusinessSystems(b.id||b.name));
}
