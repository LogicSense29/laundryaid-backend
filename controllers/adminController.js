import db from "../model/db/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

/**
 * GET /api/admin/bookings
 */
export const getAllBookings = async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT r.request_id, r.name, r.package, r.status, r.address,
              r.pickup_date, r.delivery_date, r.pickup_option,
              r.clothes_count, r.created_at,
              p.paystack_reference, p.status AS payment_status
       FROM request r
       LEFT JOIN payments p ON p.request_id = r.request_id
       ORDER BY r.created_at DESC`
    );

    return res.json({ bookings: rows });
  } catch (err) {
    console.error("Admin Bookings error:", err);
    return res.status(500).json({ error: "Failed to fetch bookings" });
  }
};

export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const { rows } = await db.query("SELECT * FROM admins WHERE email = $1", [email.toLowerCase()]);
    if (rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: admin.id, role: admin.role, isAdmin: true, name: admin.name },
      process.env.SECRET,
      { expiresIn: "1d" }
    );

    return res.json({ token, admin: { id: admin.id, name: admin.name, email: admin.email, role: admin.role } });
  } catch (err) {
    console.error("Admin login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const createAdmin = async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) return res.status(400).json({ error: "All fields required" });

  try {
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);
    const { rows } = await db.query(`
      INSERT INTO admins (name, email, password, role)
      VALUES ($1, $2, $3, $4) RETURNING id, name, email, role
    `, [name, email.toLowerCase(), hashed, role]);

    return res.status(201).json({ message: "Admin created successfully", admin: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: "Email already exists" });
    console.error("Create admin error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const updateBookingStatus = async (req, res) => {
  const { id } = req.params;
  const { status, token } = req.query;

  const validStatuses = ["processing", "ready", "delivered"];
  if (!validStatuses.includes(status)) {
    return res.status(400).send("<h2>Invalid status value.</h2>");
  }

  // Verify the one-time signed token
  try {
    const decoded = jwt.verify(token, process.env.SECRET);
    if (decoded.request_id !== id) {
      return res.status(403).send("<h2>Token mismatch. Action not allowed.</h2>");
    }
  } catch (err) {
    return res.status(401).send("<h2>Link has expired or is invalid.</h2>");
  }

  try {
    const { rowCount } = await db.query(
      "UPDATE request SET status = $1 WHERE request_id = $2",
      [status, id]
    );
    if (rowCount === 0) return res.status(404).send("<h2>Booking not found.</h2>");

    return res.send(`
      <html><body style="font-family:Arial;text-align:center;padding:60px;">
        <h2 style="color:#127733;">✅ Status Updated!</h2>
        <p>Booking <strong>${id}</strong> is now marked as <strong>${status.toUpperCase()}</strong>.</p>
      </body></html>
    `);
  } catch (err) {
    console.error("Update booking status error:", err);
    return res.status(500).send("<h2>Server error. Please try again.</h2>");
  }
};
export const deleteBooking = async (req, res) => {
  const { id } = req.params;
  try {
    // Delete payments first to handle foreign key dependencies just in case
    await db.query("DELETE FROM payments WHERE request_id = $1", [id]);
    
    const { rowCount } = await db.query("DELETE FROM request WHERE request_id = $1", [id]);
    if (rowCount === 0) return res.status(404).json({ error: "Booking not found" });

    return res.json({ message: "Booking deleted successfully" });
  } catch (err) {
    console.error("Delete booking error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
