-- BizSim v5.1 additive migration
-- SQLite. Uses JSON TEXT for flexible simulation state while keeping key relations indexed.
CREATE TABLE IF NOT EXISTS player_economic_state (
  user_id TEXT PRIMARY KEY,
  cash INTEGER NOT NULL DEFAULT 0,
  reputation REAL NOT NULL DEFAULT 0,
  career_json TEXT NOT NULL DEFAULT '{}',
  portfolio_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS business_investor_offers (
  id TEXT PRIMARY KEY,user_id TEXT NOT NULL,business_id TEXT NOT NULL,
  investor_name TEXT NOT NULL,investor_type TEXT NOT NULL,investment INTEGER NOT NULL,
  requested_equity REAL NOT NULL,negotiated_json TEXT,status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,accepted_at TEXT
);
CREATE TABLE IF NOT EXISTS business_investors (
  id TEXT PRIMARY KEY,user_id TEXT NOT NULL,business_id TEXT NOT NULL,
  name TEXT NOT NULL,type TEXT NOT NULL,investment INTEGER NOT NULL,equity REAL NOT NULL,
  terms_json TEXT NOT NULL DEFAULT '{}',active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS business_incidents (
  id TEXT PRIMARY KEY,user_id TEXT NOT NULL,business_id TEXT NOT NULL,
  type TEXT NOT NULL,title TEXT NOT NULL,affected_area TEXT NOT NULL,severity TEXT NOT NULL,
  damage_level REAL NOT NULL,damage_amount INTEGER NOT NULL,repair_cost INTEGER NOT NULL,
  insurance_payout INTEGER NOT NULL DEFAULT 0,status TEXT NOT NULL DEFAULT 'open',
  data_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS business_insurance_policies (
  id TEXT PRIMARY KEY,user_id TEXT NOT NULL,business_id TEXT NOT NULL,
  type TEXT NOT NULL,coverage_amount INTEGER NOT NULL,premium INTEGER NOT NULL,
  deductible REAL NOT NULL,duration_months INTEGER NOT NULL,remaining_months INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,start_date TEXT
);
CREATE TABLE IF NOT EXISTS business_loans (
  id TEXT PRIMARY KEY,user_id TEXT NOT NULL,business_id TEXT NOT NULL,
  amount INTEGER NOT NULL,interest_rate REAL NOT NULL,duration_months INTEGER NOT NULL,
  monthly_payment INTEGER NOT NULL,total_repayment INTEGER NOT NULL,remaining INTEGER NOT NULL,
  collateral INTEGER NOT NULL DEFAULT 0,credit_score INTEGER NOT NULL DEFAULT 650,
  status TEXT NOT NULL DEFAULT 'active',late_payments INTEGER NOT NULL DEFAULT 0,
  start_date TEXT
);
CREATE TABLE IF NOT EXISTS business_ownership (
  id TEXT PRIMARY KEY,user_id TEXT NOT NULL,business_id TEXT NOT NULL,
  owner_key TEXT NOT NULL,share REAL NOT NULL,role TEXT,terms_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS business_products (
  id TEXT PRIMARY KEY,user_id TEXT NOT NULL,business_id TEXT NOT NULL,
  name TEXT NOT NULL,category TEXT,purchase_cost INTEGER NOT NULL,selling_price INTEGER NOT NULL,
  expected_demand REAL NOT NULL DEFAULT 50,inventory INTEGER NOT NULL DEFAULT 0,data_json TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS business_branches (
  id TEXT PRIMARY KEY,user_id TEXT NOT NULL,business_id TEXT NOT NULL,
  location TEXT NOT NULL,rent INTEGER NOT NULL,cost INTEGER NOT NULL,capacity INTEGER NOT NULL DEFAULT 100,
  demand REAL NOT NULL DEFAULT 50,status TEXT NOT NULL DEFAULT 'operational',opened_at TEXT
);
CREATE TABLE IF NOT EXISTS business_competitors (
  id TEXT PRIMARY KEY,user_id TEXT NOT NULL,business_id TEXT NOT NULL,
  name TEXT NOT NULL,price_strategy TEXT,quality REAL,marketing REAL,expansion_rate REAL,cash INTEGER
);
CREATE TABLE IF NOT EXISTS business_events (
  id TEXT PRIMARY KEY,user_id TEXT NOT NULL,business_id TEXT,category TEXT NOT NULL,
  title TEXT NOT NULL,data_json TEXT NOT NULL DEFAULT '{}',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_biz_incidents_user_business ON business_incidents(user_id,business_id);
CREATE INDEX IF NOT EXISTS idx_biz_loans_user_status ON business_loans(user_id,status);
CREATE INDEX IF NOT EXISTS idx_biz_offers_user_status ON business_investor_offers(user_id,status);
CREATE INDEX IF NOT EXISTS idx_biz_events_user_date ON business_events(user_id,created_at);
