const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.PG_URL,
});

module.exports = { pool };
