const express = require('express');
const { Pool } = require('pg'); 

const app = express();
const PORT = process.env.PORT || 3000;
const VERSION = process.env.APP_VERSION || 'UNKNOWN';

const pool = new Pool({
  user: 'postgres',
  host: 'db-service',
  database: 'postgres',
  password: 'postgres',
  port: 5432,
});

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() as current_time');
    res.send(`
      <h2>Hello from the Capstone Node.js App!</h2>
      <p>Deployment Version: <b>${VERSION}</b></p>
      <p>DB Time: <b>${result.rows[0].current_time}</b></p>
    `);
  } catch (err) {
    res.status(500).send(`Database connection failed: ${err.message}`);
  }
});

app.listen(PORT, () => {
  console.log(`App running on port ${PORT}`);
});
