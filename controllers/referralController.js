import db from "../model/db/db.js";
import { sendWhatsApp } from "../utilities/whatsapp.js";

const REFERRAL_COMMISSION_RATE = 0.15; // 15%

/**
 * Credit referrer wallet when a referred user makes a paid transaction
 * Called after successful payment verification
 */
export const creditReferralCommission = async (userId, paidAmount) => {
  try {
    // Find who referred this user
    const { rows: customer } = await db.query(
      "SELECT referred_by FROM customers WHERE user_id = $1",
      [userId]
    );

    if (!customer.length || !customer[0].referred_by) return;

    const referredByCode = customer[0].referred_by;

    // Find the referrer
    const { rows: referrer } = await db.query(
      "SELECT user_id, mobile FROM customers WHERE referrer_id = $1",
      [referredByCode]
    );

    if (!referrer.length) return;

    const referrerId = referrer[0].user_id;
    const commission = Math.floor(paidAmount * REFERRAL_COMMISSION_RATE);

    // ✅ Check: has referrer booked at least once in the last 30 days?
    const { rows: recentBookings } = await db.query(
      `SELECT 1 FROM request 
       WHERE user_id = $1 
         AND created_at >= NOW() - INTERVAL '30 days'
       LIMIT 1`,
      [referrerId]
    );

    if (!recentBookings.length) {
      // Referrer is inactive — skip commission and send a nudge notification
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, $2, $3, $4)`,
        [
          referrerId,
          "You missed a commission! 💸",
          `One of your referrals just completed a laundry order, but you haven't booked in the last 30 days. Book an order this month to keep earning your 15% commission.`,
          "referral_nudge"
        ]
      );
      
      // Send WhatsApp Nudge
      if (referrer[0].mobile) {
        const mobile = referrer[0].mobile;
        const to = `whatsapp:${mobile.startsWith("+") ? mobile : "+234" + mobile.replace(/^0/, "")}`;
        const body = `*You missed a commission!* 💸\n\nOne of your referrals just completed a laundry order, but you haven't booked in the last 30 days.\n\nBook an order this month to keep earning your 15% commission. 🧺\nVisit laundryaid.com.ng`;
        sendWhatsApp(to, body).catch(console.error);
      }

      console.log(`⚠️ Commission skipped for ${referrerId} — inactive in last 30 days. Nudge sent via App & WhatsApp.`);
      return;
    }

    // Referrer is active — credit commission
    await db.query(
      `INSERT INTO referral_earnings (referrer_id, referred_user_id, amount, status)
       VALUES ($1, $2, $3, 'pending')`,
      [referrerId, userId, commission]
    );

    // Update wallet balance
    await db.query(
      `INSERT INTO wallets (customer_id, balance)
       VALUES ($1, $2)
       ON CONFLICT (customer_id) DO UPDATE SET balance = wallets.balance + $2`,
      [referrerId, commission]
    );

    console.log(`✅ Referral commission ₦${commission} credited to ${referrerId}`);
  } catch (err) {
    console.error("❌ Referral commission error:", err.message);
  }
};


/**
 * GET /api/user/referrals - Get referral stats for logged-in user
 */
export const getReferralStats = async (req, res) => {
  const userId = req.user_id;
  try {
    // Get user's referral code
    const { rows: customer } = await db.query(
      "SELECT referrer_id FROM customers WHERE user_id = $1",
      [userId]
    );

    if (!customer.length) return res.status(404).json({ error: "User not found" });

    const referralCode = customer[0].referrer_id;

    // Get referred users
    const { rows: referred } = await db.query(
      `SELECT c.email, c.created_at,
        COALESCE(SUM(re.amount), 0) AS earned
       FROM customers c
       LEFT JOIN referral_earnings re ON re.referred_user_id = c.user_id AND re.referrer_id = $1
       WHERE c.referred_by = $2
       GROUP BY c.email, c.created_at
       ORDER BY c.created_at DESC`,
      [userId, referralCode]
    );

    // Get wallet balance
    const { rows: wallet } = await db.query(
      "SELECT balance FROM wallets WHERE customer_id = $1",
      [userId]
    );

    const balance = wallet.length ? Number(wallet[0].balance) : 0;
    const totalEarned = referred.reduce((sum, r) => sum + Number(r.earned), 0);

    return res.json({
      referralCode,
      referredCount: referred.length,
      totalEarned,
      walletBalance: balance,
      referred: referred.map(r => ({
        email: r.email.replace(/(.{2}).+(@.+)/, "$1***$2"), // mask email
        joinedAt: r.created_at,
        earned: Number(r.earned),
      })),
    });
  } catch (err) {
    console.error("Referral stats error:", err);
    return res.status(500).json({ error: "Failed to fetch referral stats" });
  }
};
