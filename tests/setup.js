const pool = require('../db');

afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000)); // ✅ Small delay before closing DB
    await pool.end().catch(err => console.error("Error closing pool:", err));
});
