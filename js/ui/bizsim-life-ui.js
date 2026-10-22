/* BizSim v5.1 — Business Life UI. Additive; each panel can be mounted by legacy UI. */
const BizSimLifeUI = {
  money(n){return "Rp"+Math.round(n||0).toLocaleString("id-ID");},
  esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));},
  card(title,body){return `<section class="bs-card bs-mb-12"><h3>${title}</h3>${body}</section>`;},

  renderCareerZero(){
    const c=State.data.playerCareer||{};
    return this.card("CAREER DARI NOL",`
      <div class="bs-grid-2">
        <div><small>Status</small><strong>${this.esc(c.levelTitle||"Unemployed")}</strong></div>
        <div><small>Cash</small><strong>${this.money(State.data.cash)}</strong></div>
        <div><small>Salary</small><strong>${this.money(c.salary)}</strong></div>
        <div><small>Experience</small><strong>${c.yearsExperience||0} tahun</strong></div>
      </div>
      <p class="bs-text-secondary">Tidak ada modal awal, aset, bisnis, atau portfolio gratis. Progression dimulai dari pekerjaan dan skill.</p>
    `);
  },

  renderInvestorOffers(){
    const offers=(State.data.investorOffers||[]).filter(x=>x.status==="pending");
    if(!offers.length)return this.card("INVESTMENT OFFER",`<p class="bs-text-secondary">Belum ada investor yang menawarkan modal.</p>`);
    return this.card("INVESTMENT OFFER",offers.map(o=>`
      <div class="bs-card bs-mb-12">
        <strong>${this.esc(o.investorName)}</strong> · ${this.esc(o.investorType)}
        <div>Investment: <b>${this.money(o.investment)}</b></div>
        <div>Requested Equity: <b>${o.requestedEquity}%</b></div>
        <div>Expected Growth: ${o.expectedGrowth}% · Risk: ${o.risk}</div>
        <p>${this.esc(o.background)}</p>
        <button onclick="BizSimLifeUI.acceptOffer('${o.id}')">Accept</button>
        <button onclick="BizSimLifeUI.rejectOffer('${o.id}')">Reject</button>
        <button onclick="BizSimLifeUI.negotiateOffer('${o.id}')">Negotiate</button>
      </div>`).join(""));
  },

  acceptOffer(id){const r=BizSimLifeEngine.acceptInvestment(id);this.refreshOrToast(r);},
  rejectOffer(id){const r=BizSimLifeEngine.rejectInvestment(id);this.refreshOrToast(r);},
  negotiateOffer(id){
    const o=(State.data.investorOffers||[]).find(x=>x.id===id);if(!o)return;
    const inv=prompt("Investment (Rp)",o.investment);const eq=prompt("Equity (%)",o.requestedEquity);
    if(inv===null||eq===null)return;this.refreshOrToast(BizSimLifeEngine.negotiateInvestment(id,Number(inv),Number(eq)));
  },

  renderBusinessRisk(businessId){
    BizSimLifeEngine.ensureBusinessSystems(businessId);const r=State.data.businessRisk[businessId];
    return this.card("BUSINESS RISK DASHBOARD",Object.entries(r).map(([k,v])=>`<div class="bs-flex bs-between"><span>${k}</span><b>${Math.round(v)}/100</b></div>`).join(""));
  },

  renderDamageReport(incidentId){
    const x=BizSimLifeEngine.getDamageReport(incidentId);if(!x)return "";
    return this.card("DAMAGE REPORT",`
      <div>Problem: <b>${this.esc(x.title)}</b></div>
      <div>Affected Area: <b>${this.esc(x.affectedArea)}</b></div>
      <div>Damage Level: <b>${x.damageLevel}%</b></div>
      <div>Estimated Repair: <b>${this.money(x.repairCost)}</b></div>
      <div>Repair Time: <b>${x.recoveryDays} days</b></div>
      <div>Expected Revenue Impact: <b>-${Math.round(x.temporaryRevenueLoss/Math.max(1,x.repairCost)*100)}%</b></div>
      <hr>
      <button onclick="BizSimLifeUI.repair('${x.id}','repair')">Repair</button>
      <button onclick="BizSimLifeUI.repair('${x.id}','temporary_fix')">Temporary Fix</button>
      <button onclick="BizSimLifeUI.repair('${x.id}','delay')">Delay</button>
      ${x.insurance?.payout>0?`<button onclick="BizSimLifeUI.claim('${x.id}')">Insurance Claim</button>`:""}
    `);
  },

  repair(id,mode){this.refreshOrToast(BizSimLifeEngine.repairIncident(id,mode));},
  claim(id){this.refreshOrToast(BizSimLifeEngine.claimInsurance(id));},

  renderFinancialDashboard(){
    const total=BizSimLifeEngine.getCareerNetWorth(), p=BizSimLifeEngine.portfolioSummary();
    return this.card("FINANCIAL DASHBOARD",`
      <div class="bs-grid-2">
        <div>Cash <b>${this.money(State.data.cash)}</b></div>
        <div>Net Worth <b>${this.money(total)}</b></div>
        <div>Portfolio <b>${this.money(p.totalValue)}</b></div>
        <div>Unrealized P/L <b>${this.money(p.unrealizedPL)}</b></div>
      </div>
      <h4>Portfolio Allocation</h4>
      ${Object.entries(p.allocation).map(([k,v])=>`<div class="bs-flex bs-between"><span>${k}</span><b>${v}%</b></div>`).join("")}
    `);
  },

  renderOwnership(businessId){
    BizSimLifeEngine.ensureBusinessSystems(businessId);
    const owners=State.data.ownership[businessId]||[];
    return this.card("OWNERSHIP STRUCTURE",owners.map(o=>`<div class="bs-flex bs-between"><span>${this.esc(o.owner)}</span><b>${o.share}%</b></div>`).join(""));
  },

  renderIncidentHistory(businessId){
    const rows=(State.data.businessIncidents||[]).filter(x=>x.businessId===businessId);
    return this.card("BUSINESS INCIDENT HISTORY",rows.length?rows.map(x=>`<div class="bs-card bs-mb-12"><b>${this.esc(x.title)}</b><div>${x.createdAt} · ${x.affectedArea} · ${x.damageLevel}%</div><div>Loss ${this.money(x.damageAmount)} · Repair ${this.money(x.repairCost)} · Insurance ${this.money(x.insurancePayout||0)}</div><div>Status: ${x.status}</div></div>`).join(""):"<p class='bs-text-secondary'>Belum ada incident.</p>");
  },

  refreshOrToast(r){
    if(typeof BSInteraction!=="undefined"&&r&&!r.success){BSInteraction.showToast({title:"Tidak dapat diproses",message:r.error||"Gagal",type:"warning"});}
    else if(typeof BSInteraction!=="undefined"){BSInteraction.showToast({title:"Berhasil",message:"Perubahan tersimpan.",type:"success"});}
    if(typeof UI!=="undefined"&&typeof UI.render==="function")UI.render();
  }
};
