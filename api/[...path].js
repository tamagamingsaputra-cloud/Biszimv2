// Vercel catch-all API route. The Express API remains the single source of business rules.
// Note: serverless SQLite is temporary; configure a persistent database before production use.
process.env.BIZSIM_DB = process.env.BIZSIM_DB || '/tmp/bizsim.db';
const app = require('../server/server.cjs');
module.exports = app;
