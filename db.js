const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'nexro',
  password: process.env.DB_PASSWORD || '9885',
  port: process.env.DB_PORT || 5432,
});

// Prevent extra connections in test mode
if (process.env.NODE_ENV !== 'test') {
    pool.connect((err) => {
        if (err) {
            console.error('Failed to connect to the database', err);
        } else {
            console.log('Connected to the database');
        }
    });
}

module.exports = pool;
