/* BizSim v5.1 — backend routes for persistent economic-life systems.
   Uses the same generic respond/parseBody/requireAuth convention as v5.0.
   Wire these handlers into the project's existing router. */
const { respond } = require("../utils/respond");
const { parseBody } = require("../utils/body");
const { requireAuth } = require("../middleware/auth");
const db = require("../config/database");

async function getState(req,res){
  const userId=req.user?.id;
  const row=await db.get("SELECT * FROM player_economic_state WHERE user_id = ?",[userId]);
  respond(res,200,{state:row||{cash:0,reputation:0,career_json:"{}",portfolio_json:"{}"}});
}
async function saveState(req,res){
  const userId=req.user?.id, body=await parseBody(req);
  await db.run(`INSERT INTO player_economic_state(user_id,cash,reputation,career_json,portfolio_json,updated_at)
    VALUES(?,?,?,?,?,CURRENT_TIMESTAMP)
    ON CONFLICT(user_id) DO UPDATE SET cash=excluded.cash,reputation=excluded.reputation,
    career_json=excluded.career_json,portfolio_json=excluded.portfolio_json,updated_at=CURRENT_TIMESTAMP`,
    [userId,Math.max(0,Number(body.cash||0)),Number(body.reputation||0),JSON.stringify(body.career||{}),JSON.stringify(body.portfolio||{})]);
  respond(res,200,{success:true});
}
async function listOffers(req,res){
  const rows=await db.all("SELECT * FROM business_investor_offers WHERE user_id=? AND status='pending' ORDER BY created_at DESC",[req.user?.id]);
  respond(res,200,{offers:rows});
}
async function createOffer(req,res){
  const b=await parseBody(req), id="offer_"+Date.now();
  await db.run(`INSERT INTO business_investor_offers
    (id,user_id,business_id,investor_name,investor_type,investment,requested_equity,negotiated_json,status)
    VALUES(?,?,?,?,?,?,?,?, 'pending')`,
    [id,req.user?.id,b.businessId,b.investorName,b.investorType,b.investment,b.requestedEquity,JSON.stringify(b.negotiated||null)]);
  respond(res,201,{id});
}
async function updateOffer(req,res){
  const id=req.params?.id, b=await parseBody(req);
  await db.run("UPDATE business_investor_offers SET status=?,negotiated_json=?,accepted_at=CASE WHEN ?='accepted' THEN CURRENT_TIMESTAMP ELSE accepted_at END WHERE id=? AND user_id=?",
    [b.status,JSON.stringify(b.negotiated||null),b.status,id,req.user?.id]);
  respond(res,200,{success:true});
}
async function listIncidents(req,res){
  const rows=await db.all("SELECT * FROM business_incidents WHERE user_id=? AND business_id=? ORDER BY created_at DESC",[req.user?.id,req.params?.businessId]);
  respond(res,200,{incidents:rows});
}
async function createIncident(req,res){
  const b=await parseBody(req), id="incident_"+Date.now();
  await db.run(`INSERT INTO business_incidents
    (id,user_id,business_id,type,title,affected_area,severity,damage_level,damage_amount,repair_cost,data_json)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    [id,req.user?.id,b.businessId,b.type,b.title,b.affectedArea,b.severity,b.damageLevel,b.damageAmount,b.repairCost,JSON.stringify(b)]);
  respond(res,201,{id});
}
async function listLoans(req,res){
  const rows=await db.all("SELECT * FROM business_loans WHERE user_id=? ORDER BY start_date DESC",[req.user?.id]);
  respond(res,200,{loans:rows});
}
async function createLoan(req,res){
  const b=await parseBody(req),id="loan_"+Date.now();
  await db.run(`INSERT INTO business_loans
    (id,user_id,business_id,amount,interest_rate,duration_months,monthly_payment,total_repayment,remaining,collateral,credit_score)
    VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
    [id,req.user?.id,b.businessId,b.amount,b.interestRate,b.durationMonths,b.monthlyPayment,b.totalRepayment,b.totalRepayment,b.collateral||0,b.creditScore||650]);
  respond(res,201,{id});
}
module.exports={
  routes:{
    "GET /api/v5/state":[requireAuth,getState],
    "PUT /api/v5/state":[requireAuth,saveState],
    "GET /api/v5/investors/offers":[requireAuth,listOffers],
    "POST /api/v5/investors/offers":[requireAuth,createOffer],
    "PATCH /api/v5/investors/offers/:id":[requireAuth,updateOffer],
    "GET /api/v5/business/:businessId/incidents":[requireAuth,listIncidents],
    "POST /api/v5/business/incidents":[requireAuth,createIncident],
    "GET /api/v5/loans":[requireAuth,listLoans],
    "POST /api/v5/loans":[requireAuth,createLoan]
  }
};
