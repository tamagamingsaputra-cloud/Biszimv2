const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, 'bizsim.sqlite'));
db.exec('PRAGMA foreign_keys = ON;');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS player_state (
  user_id INTEGER PRIMARY KEY,
  day INTEGER NOT NULL DEFAULT 1,
  cash INTEGER NOT NULL DEFAULT 0,
  reputation INTEGER NOT NULL DEFAULT 0,
  emergency_fund INTEGER NOT NULL DEFAULT 0,
  credit_score INTEGER NOT NULL DEFAULT 650,
  skills_json TEXT NOT NULL DEFAULT '{}',
  career_json TEXT NOT NULL DEFAULT '{}',
  portfolio_json TEXT NOT NULL DEFAULT '{}',
  settings_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS businesses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  location TEXT NOT NULL,
  cash INTEGER NOT NULL DEFAULT 0,
  revenue INTEGER NOT NULL DEFAULT 0,
  expenses INTEGER NOT NULL DEFAULT 0,
  reputation REAL NOT NULL DEFAULT 0,
  value INTEGER NOT NULL DEFAULT 0,
  risk_json TEXT NOT NULL DEFAULT '{}',
  operations_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  business_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  area TEXT NOT NULL,
  severity TEXT NOT NULL,
  damage_level REAL NOT NULL,
  damage_value INTEGER NOT NULL,
  repair_cost INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  decision TEXT,
  insurance_payout INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  industry TEXT NOT NULL,
  salary INTEGER NOT NULL,
  min_skill INTEGER NOT NULL DEFAULT 0,
  education TEXT NOT NULL DEFAULT 'SMA/SMK'
);
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(job_id) REFERENCES jobs(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS investors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  business_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  investment INTEGER NOT NULL,
  equity REAL NOT NULL,
  growth REAL NOT NULL,
  risk TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  terms_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  asset TEXT NOT NULL,
  quantity REAL NOT NULL,
  price INTEGER NOT NULL,
  fee INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  business_id INTEGER,
  amount INTEGER NOT NULL,
  interest_rate REAL NOT NULL,
  duration_months INTEGER NOT NULL,
  monthly_payment INTEGER NOT NULL,
  remaining INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  decision TEXT,
  consequence_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  unlocked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, code),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

const seed = db.prepare('SELECT COUNT(*) AS n FROM jobs').get().n;
if (!seed) {
  const insert = db.prepare('INSERT INTO jobs(title,company,industry,salary,min_skill,education) VALUES(?,?,?,?,?,?)');
  [
    ['Junior Sales Associate','Nusantara Retail','Retail',4200000,35,'SMA/SMK'],
    ['Customer Support','Cipta Digital','Technology',5000000,40,'SMA/SMK'],
    ['Junior Accountant','Artha Konsultan','Finance',5800000,50,'D3/S1'],
    ['Content Assistant','Kreativa Studio','Media',4500000,35,'SMA/SMK'],
    ['Operations Analyst','BizWorks Indonesia','Business',7000000,55,'S1']
  ].forEach(x => insert.run(...x));
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  const a=Buffer.from(hash,'hex'), b=Buffer.from(derived,'hex');
  return a.length===b.length && crypto.timingSafeEqual(a,b);
}
function freshState(userId) {
  db.prepare(`INSERT OR IGNORE INTO player_state(user_id,skills_json,career_json,portfolio_json,settings_json) VALUES(?,?,?,?,?)`)
    .run(userId, JSON.stringify({communication:40,leadership:30,sales:35,marketing:25,finance:20,programming:20,design:20,management:20,negotiation:25,problemSolving:35}), JSON.stringify({status:'unemployed',salary:0,experience:0,position:null,history:[]}), '{}', JSON.stringify({theme:'light'}));
}
function userState(userId) {
  freshState(userId);
  return db.prepare('SELECT * FROM player_state WHERE user_id=?').get(userId);
}
function json(v, fallback={}) { try { return JSON.parse(v || ''); } catch { return fallback; } }
function snapshot(userId) {
  const s = userState(userId);
  return {
    user: db.prepare('SELECT id,email,name,created_at FROM users WHERE id=?').get(userId),
    state: {...s, skills:json(s.skills_json), career:json(s.career_json), portfolio:json(s.portfolio_json)},
    businesses: db.prepare('SELECT * FROM businesses WHERE user_id=? ORDER BY id DESC').all(userId).map(b=>({...b,risk:json(b.risk_json),operations:json(b.operations_json)})),
    incidents: db.prepare('SELECT * FROM incidents WHERE user_id=? ORDER BY id DESC LIMIT 50').all(userId),
    applications: db.prepare('SELECT a.*,j.title,j.company,j.salary FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.user_id=? ORDER BY a.id DESC').all(userId),
    investors: db.prepare('SELECT * FROM investors WHERE user_id=? ORDER BY id DESC').all(userId),
    transactions: db.prepare('SELECT * FROM transactions WHERE user_id=? ORDER BY id DESC LIMIT 50').all(userId),
    loans: db.prepare('SELECT * FROM loans WHERE user_id=? ORDER BY id DESC').all(userId),
    events: db.prepare('SELECT * FROM events WHERE user_id=? ORDER BY id DESC LIMIT 50').all(userId),
    notifications: db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 30').all(userId),
    achievements: db.prepare('SELECT * FROM achievements WHERE user_id=? ORDER BY id DESC').all(userId)
  };
}
module.exports={db,hashPassword,verifyPassword,freshState,userState,snapshot,json};
