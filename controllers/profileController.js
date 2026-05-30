import db from "../model/db/db.js";

/**
 * GET /api/user/profile
 */
export const getUserProfile = async (req, res) => {
  const userId = req.user_id;
  try {
    const { rows } = await db.query(
      `SELECT c.user_id, c.email, c.mobile, c.referrer_id, c.referred_by, c.created_at,
              COALESCE(w.balance, 0) AS wallet_balance,
              COUNT(DISTINCT r.request_id) AS total_bookings
       FROM customers c
       LEFT JOIN wallets w ON w.customer_id = c.user_id
       LEFT JOIN request r ON r.user_id = c.user_id
       WHERE c.user_id = $1
       GROUP BY c.user_id, w.balance`,
      [userId]
    );

    if (!rows.length) return res.status(404).json({ error: "User not found" });

    return res.json(rows[0]);
  } catch (err) {
    console.error("Profile error:", err);
    return res.status(500).json({ error: "Failed to fetch profile" });
  }
};

/**
 * GET /api/user/bookings
 */
export const getUserBookings = async (req, res) => {
  const userId = req.user_id;
  try {
    const { rows } = await db.query(
      `SELECT r.request_id, r.name, r.package, r.status,
              r.pickup_date, r.delivery_date, r.pickup_option,
              r.clothes_count, r.created_at,
              p.paystack_reference, p.status AS payment_status
       FROM request r
       LEFT JOIN payments p ON p.request_id = r.request_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );

    return res.json({ bookings: rows });
  } catch (err) {
    console.error("Bookings error:", err);
    return res.status(500).json({ error: "Failed to fetch bookings" });
  }
};
