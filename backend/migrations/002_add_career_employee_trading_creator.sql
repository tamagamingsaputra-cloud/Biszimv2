-- ============================================================
-- BizSim — 002_add_career_employee_trading_creator.sql
-- Migration TAMBAHAN — TIDAK mengubah/menghapus tabel lama.
-- Jalankan SETELAH schema.sqlite.sql asli (poin 67, 70, 75).
-- ============================================================

-- ============ JOBS & EMPLOYMENT ============
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  business_id TEXT,
  position TEXT NOT NULL,
  positions_available INTEGER DEFAULT 1,
  positions_filled INTEGER DEFAULT 0,
  salary_min INTEGER,
  salary_max INTEGER,
  requirements_json TEXT,
  status TEXT DEFAULT 'open',
  posted_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS job_applications (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  candidate_name TEXT,
  candidate_data_json TEXT,
  status TEXT DEFAULT 'pending',
  applied_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);

CREATE TABLE IF NOT EXISTS interviews (
  id TEXT PRIMARY KEY,
  candidate_id TEXT,
  application_id TEXT,
  answers_json TEXT,
  result_score INTEGER,
  status TEXT DEFAULT 'in_progress',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  business_id TEXT,
  name TEXT NOT NULL,
  gender TEXT,
  age INTEGER,
  education TEXT,
  position TEXT,
  level INTEGER DEFAULT 0,
  level_title TEXT,
  experience_years REAL DEFAULT 0,
  months_in_position INTEGER DEFAULT 0,
  salary INTEGER,
  skills_json TEXT,
  performance REAL DEFAULT 60,
  loyalty REAL DEFAULT 50,
  morale REAL DEFAULT 60,
  workload REAL DEFAULT 50,
  attendance REAL DEFAULT 95,
  status TEXT DEFAULT 'active',
  hire_date TEXT,
  portrait_seed INTEGER,
  resignation_risk REAL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS employee_skills (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  skill_value INTEGER DEFAULT 40,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS employee_contracts (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  salary INTEGER,
  working_schedule TEXT,
  probation_end_date TEXT,
  contract_start TEXT,
  contract_end TEXT,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS employee_training (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  program_name TEXT,
  target_skill TEXT,
  skill_gain INTEGER,
  days_remaining INTEGER,
  cost INTEGER,
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE TABLE IF NOT EXISTS employee_promotions (
  id TEXT PRIMARY KEY,
  employee_id TEXT NOT NULL,
  old_title TEXT,
  new_title TEXT,
  old_salary INTEGER,
  new_salary INTEGER,
  promoted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

-- ============ PLAYER CAREER ============
CREATE TABLE IF NOT EXISTS career_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  company TEXT,
  position TEXT,
  industry TEXT,
  salary INTEGER,
  start_date TEXT,
  end_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============ CREATOR PROFILES ============
CREATE TABLE IF NOT EXISTS creator_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  active_profession TEXT,
  youtube_json TEXT,
  tiktok_json TEXT,
  clipper_json TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS creator_content (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT, -- youtube | tiktok
  title TEXT,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  quality INTEGER,
  is_viral BOOLEAN DEFAULT 0,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS creator_statistics (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT,
  month_year TEXT, -- format YYYY-MM
  revenue INTEGER DEFAULT 0,
  subscribers_gained INTEGER DEFAULT 0,
  total_views INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============ TRADING (terpisah dari saham) ============
CREATE TABLE IF NOT EXISTS trading_positions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  side TEXT NOT NULL, -- long | short
  size INTEGER NOT NULL,
  leverage INTEGER NOT NULL,
  margin INTEGER NOT NULL,
  entry_price REAL NOT NULL,
  current_price REAL,
  liquidation_price REAL,
  stop_loss REAL,
  take_profit REAL,
  unrealized_pnl INTEGER DEFAULT 0,
  status TEXT DEFAULT 'open', -- open | closed | liquidated
  opened_at TEXT,
  closed_at TEXT,
  realized_pnl INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS trading_orders (
  id TEXT PRIMARY KEY,
  position_id TEXT NOT NULL,
  order_type TEXT, -- stop_loss | take_profit
  trigger_price REAL,
  status TEXT DEFAULT 'active',
  FOREIGN KEY (position_id) REFERENCES trading_positions(id)
);

CREATE TABLE IF NOT EXISTS trading_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  position_snapshot_json TEXT,
  realized_pnl INTEGER,
  closed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ============ MARKET / EVENTS / NEWS ============
CREATE TABLE IF NOT EXISTS market_data (
  id TEXT PRIMARY KEY,
  asset_id TEXT NOT NULL,
  price REAL,
  high REAL,
  low REAL,
  volume INTEGER,
  recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news (
  id TEXT PRIMARY KEY,
  title TEXT,
  category TEXT,
  severity TEXT,
  source TEXT, -- simulation | realworld
  description TEXT,
  affected_assets_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS world_events (
  id TEXT PRIMARY KEY,
  title TEXT,
  category TEXT,
  severity TEXT,
  source TEXT,
  impacts_json TEXT,
  business_impact_json TEXT,
  started_at TEXT,
  decay_rate REAL DEFAULT 0.05,
  active BOOLEAN DEFAULT 1
);

CREATE TABLE IF NOT EXISTS event_impacts (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  target_asset_category TEXT,
  impact_pct REAL,
  FOREIGN KEY (event_id) REFERENCES world_events(id)
);

-- ============ BUSINESS DEPTH ============
CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  name TEXT,
  price_mult REAL DEFAULT 1.0,
  quality INTEGER DEFAULT 70,
  delivery_days INTEGER DEFAULT 3,
  reliability INTEGER DEFAULT 80,
  min_order INTEGER DEFAULT 10,
  contract_active BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  name TEXT,
  category TEXT,
  buy_price INTEGER,
  sell_price INTEGER,
  stock INTEGER DEFAULT 0,
  demand INTEGER DEFAULT 50
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL UNIQUE,
  count INTEGER DEFAULT 50,
  demand INTEGER DEFAULT 50,
  budget INTEGER DEFAULT 50,
  satisfaction INTEGER DEFAULT 60,
  loyalty INTEGER DEFAULT 50
);

CREATE TABLE IF NOT EXISTS business_upgrades (
  id TEXT PRIMARY KEY,
  business_id TEXT NOT NULL,
  track_id TEXT NOT NULL,
  level INTEGER DEFAULT 0,
  UNIQUE(business_id, track_id)
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_jobs_user ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_user ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_business ON employees(business_id);
CREATE INDEX IF NOT EXISTS idx_trading_positions_user ON trading_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_trading_positions_status ON trading_positions(status);
CREATE INDEX IF NOT EXISTS idx_career_history_user ON career_history(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_business ON inventory(business_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_business ON suppliers(business_id);
