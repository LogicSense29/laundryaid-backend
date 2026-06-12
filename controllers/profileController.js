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
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const countResult = await db.query(
      `SELECT 
         COUNT(*) as total,
         SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_count,
         SUM(CASE WHEN status != 'delivered' OR status IS NULL THEN 1 ELSE 0 END) as active_count
       FROM request WHERE user_id = $1`,
      [userId]
    );
    const total = parseInt(countResult.rows[0].total) || 0;
    const deliveredCount = parseInt(countResult.rows[0].delivered_count) || 0;
    const activeCount = parseInt(countResult.rows[0].active_count) || 0;
    const hasMore = offset + limit < total;

    const { rows } = await db.query(
      `SELECT r.request_id, r.name, r.package, r.status,
              r.pickup_date, r.delivery_date, r.pickup_option,
              r.clothes_count, r.created_at, r.address, r.contact, r.email,
              p.paystack_reference, p.status AS payment_status
       FROM request r
       LEFT JOIN payments p ON p.request_id = r.request_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return res.json({ bookings: rows, hasMore, total, deliveredCount, activeCount });
  } catch (err) {
    console.error("Bookings error:", err);
    return res.status(500).json({ error: "Failed to fetch bookings" });
  }
};

export const getNotifications = async (req, res) => {
  const userId = req.user_id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { rows } = await db.query(
      `SELECT * FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [userId]
    );

    return res.json({ notifications: rows });
  } catch (err) {
    console.error("Notifications error:", err);
    return res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

export const markNotificationsRead = async (req, res) => {
  const userId = req.user_id;
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await db.query(
      `UPDATE notifications 
       SET is_read = TRUE 
       WHERE user_id = $1 AND is_read = FALSE`,
      [userId]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error("Mark notifications read error:", err);
    return res.status(500).json({ error: "Failed to update notifications" });
  }
};
