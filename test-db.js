require('dotenv').config();
const db = require('./config/db');

async function test() {
  try {
    const [rows] = await db.execute('DESCRIBE bank_statement_records');
    console.log(rows);
    process.exit(0);
  } catch (err) {
    console.error("DB Error:", err.message);
    process.exit(1);
  }
}

test();
