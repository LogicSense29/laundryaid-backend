import db from "./model/db/db.js";

async function run() {
  try {
    // Drop the unique constraint that was blocking multiple earnings per referred user
    await db.query(`
      ALTER TABLE referral_earnings 
      DROP CONSTRAINT IF EXISTS referral_earnings_referrer_id_referred_user_id_key;
    `);
    console.log("✅ Unique constraint dropped — referrers now earn on every order.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  }
}

run();
