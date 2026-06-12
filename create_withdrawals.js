import db from "./model/db/db.js";

async function run() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES customers(user_id) ON DELETE CASCADE,
        amount NUMERIC(12, 2) NOT NULL,
        bank_name VARCHAR(100) NOT NULL,
        account_name VARCHAR(100) NOT NULL,
        account_number VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending', -- pending, completed, rejected
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("✅ Withdrawals table created.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

run();
