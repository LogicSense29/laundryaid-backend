import db from "../model/db/db.js";
import { 
  generateOtpEmail, 
  generateAdminWithdrawalEmail, 
  generateWithdrawalStatusEmail, 
  sendRequestMail 
} from "../utilities/mailer.js";

/**
 * Generate a 6-digit numeric OTP
 */
const generateNumericOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * POST /api/user/wallet/withdraw/request
 * Initiates withdrawal request and sends OTP
 */
export const requestWithdrawal = async (req, res) => {
  const userId = req.user_id;
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid amount" });
  }

  try {
    // Check wallet balance
    const { rows: walletRows } = await db.query(
      "SELECT balance FROM wallets WHERE customer_id = $1",
      [userId]
    );

    const balance = walletRows.length ? Number(walletRows[0].balance) : 0;
    if (amount > balance) {
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Get user email
    const { rows: userRows } = await db.query(
      "SELECT email FROM customers WHERE user_id = $1",
      [userId]
    );
    if (!userRows.length) {
      return res.status(404).json({ error: "User not found" });
    }
    const userEmail = userRows[0].email;

    // Generate and store OTP
    const otp = generateNumericOtp();
    const expiresAt = new Date(Date.now() + 20 * 60000); // 20 minutes

    await db.query(
      "INSERT INTO email_otps (email, otp, expires_at) VALUES ($1, $2, $3)",
      [userEmail, otp, expiresAt]
    );

    // Send OTP via email
    await sendRequestMail({
      to: userEmail,
      subject: "Withdrawal Verification Code",
      html: generateOtpEmail({ otp, fullname: "Customer" }),
    });

    return res.json({ success: true, message: "OTP sent to email" });
  } catch (err) {
    console.error("requestWithdrawal error:", err);
    return res.status(500).json({ error: "Failed to request withdrawal" });
  }
};

/**
 * POST /api/user/wallet/withdraw/verify
 * Verifies OTP, deducts balance, creates withdrawal, notifies admin
 */
export const verifyWithdrawal = async (req, res) => {
  const userId = req.user_id;
  const { otp, amount, bankName, accountName, accountNumber } = req.body;

  if (!otp || !amount || !bankName || !accountName || !accountNumber) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Get user email & name
    const { rows: userRows } = await db.query(
      "SELECT email, name FROM customers c LEFT JOIN request r ON c.user_id = r.user_id WHERE c.user_id = $1 LIMIT 1",
      [userId]
    );
    if (!userRows.length) return res.status(404).json({ error: "User not found" });
    const userEmail = userRows[0].email;
    const userName = userRows[0].name || "Customer";

    // Verify OTP
    const { rows: otpRows } = await db.query(
      "SELECT id FROM email_otps WHERE email = $1 AND otp = $2 AND used = false AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1",
      [userEmail, otp]
    );

    if (!otpRows.length) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    // Begin Transaction
    await db.query("BEGIN");

    // Mark OTP as used
    await db.query("UPDATE email_otps SET used = true WHERE id = $1", [otpRows[0].id]);

    // Re-check balance (row lock for safety)
    const { rows: walletRows } = await db.query(
      "SELECT balance FROM wallets WHERE customer_id = $1 FOR UPDATE",
      [userId]
    );
    const balance = walletRows.length ? Number(walletRows[0].balance) : 0;
    
    if (amount > balance) {
      await db.query("ROLLBACK");
      return res.status(400).json({ error: "Insufficient balance" });
    }

    // Deduct balance
    await db.query(
      "UPDATE wallets SET balance = balance - $1 WHERE customer_id = $2",
      [amount, userId]
    );

    // Create withdrawal record
    const { rows: withdrawRows } = await db.query(
      `INSERT INTO withdrawals (user_id, amount, bank_name, account_name, account_number, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING id`,
      [userId, amount, bankName, accountName, accountNumber]
    );
    const withdrawalId = withdrawRows[0].id;

    await db.query("COMMIT");

    // Email Admin
    await sendRequestMail({
      to: "palmslaundryng@gmail.com", // Admin email
      bcc: "lappiconnect@gmail.com",
      subject: "New Withdrawal Request 💸",
      html: generateAdminWithdrawalEmail({
        customerName: userName,
        email: userEmail,
        amount,
        bankName,
        accountName,
        accountNumber,
        withdrawalId
      })
    });

    return res.json({ success: true, message: "Withdrawal placed successfully" });

  } catch (err) {
    await db.query("ROLLBACK");
    console.error("verifyWithdrawal error:", err);
    return res.status(500).json({ error: "Failed to process withdrawal" });
  }
};

/**
 * GET /api/user/wallet/admin/withdrawals/:id/confirm
 */
export const adminConfirmWithdrawal = async (req, res) => {
  const { id } = req.params;

  try {
    const { rows: wRows } = await db.query("SELECT * FROM withdrawals WHERE id = $1 AND status = 'pending'", [id]);
    if (!wRows.length) return res.send("Withdrawal already processed or not found.");

    const withdrawal = wRows[0];

    // Mark completed
    await db.query("UPDATE withdrawals SET status = 'completed' WHERE id = $1", [id]);

    // Send email to user
    const { rows: userRows } = await db.query("SELECT email, name FROM customers c LEFT JOIN request r ON c.user_id = r.user_id WHERE c.user_id = $1 LIMIT 1", [withdrawal.user_id]);
    if (userRows.length) {
      await sendRequestMail({
        to: userRows[0].email,
        subject: "Withdrawal Successful 🎉",
        html: generateWithdrawalStatusEmail({
          name: userRows[0].name || "Customer",
          amount: withdrawal.amount,
          status: 'completed'
        })
      });
    }

    return res.send(`<h1>✅ Withdrawal Confirmed</h1><p>The user has been notified of the successful transfer.</p>`);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Error confirming withdrawal");
  }
};

/**
 * GET /api/user/wallet/admin/withdrawals/:id/reject
 */
export const adminRejectWithdrawal = async (req, res) => {
  const { id } = req.params;

  try {
    await db.query("BEGIN");

    const { rows: wRows } = await db.query("SELECT * FROM withdrawals WHERE id = $1 AND status = 'pending' FOR UPDATE", [id]);
    if (!wRows.length) {
      await db.query("ROLLBACK");
      return res.send("Withdrawal already processed or not found.");
    }

    const withdrawal = wRows[0];

    // Mark rejected
    await db.query("UPDATE withdrawals SET status = 'rejected' WHERE id = $1", [id]);

    // Refund wallet
    await db.query("UPDATE wallets SET balance = balance + $1 WHERE customer_id = $2", [withdrawal.amount, withdrawal.user_id]);

    await db.query("COMMIT");

    // Send email to user
    const { rows: userRows } = await db.query("SELECT email, name FROM customers c LEFT JOIN request r ON c.user_id = r.user_id WHERE c.user_id = $1 LIMIT 1", [withdrawal.user_id]);
    if (userRows.length) {
      await sendRequestMail({
        to: userRows[0].email,
        subject: "Withdrawal Rejected ❌",
        html: generateWithdrawalStatusEmail({
          name: userRows[0].name || "Customer",
          amount: withdrawal.amount,
          status: 'rejected'
        })
      });
    }

    return res.send(`<h1>❌ Withdrawal Rejected</h1><p>The user's wallet has been refunded, and they have been notified.</p>`);
  } catch (err) {
    await db.query("ROLLBACK");
    console.error(err);
    return res.status(500).send("Error rejecting withdrawal");
  }
};
