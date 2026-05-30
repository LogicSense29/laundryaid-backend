import cron from "node-cron";
import db from "../model/db/db.js";
import { sendRequestMail, generateDailyDigestEmail, generateSubscriptionReminderEmail } from "./mailer.js";
import { sendSubscriptionReminder } from "./whatsapp.js";

/**
 * Daily digest email to admin — runs every day at 9 PM
 */
const scheduleDailyDigest = () => {
  cron.schedule("0 21 * * *", async () => {
    console.log("📧 Running daily digest...");
    try {
      const today = new Date().toISOString().split("T")[0];

      const { rows: transactions } = await db.query(
        `SELECT r.name, r.email, r.package, p.status,
                COALESCE(pkg.price, 0) AS amount
         FROM request r
         JOIN payments p ON p.request_id = r.request_id
         LEFT JOIN packages pkg ON pkg.name = r.package
         WHERE DATE(p.payment_date) = $1 AND p.status = 'success'
         ORDER BY p.payment_date DESC`,
        [today]
      );

      const adminEmail = process.env.ADMIN_EMAIL || "palmslaundryng@gmail.com";

      await sendRequestMail({
        to: adminEmail,
        subject: `📊 LaundryAid Daily Report — ${today}`,
        html: generateDailyDigestEmail({ date: today, transactions }),
      });

      console.log(`✅ Daily digest sent for ${today} (${transactions.length} transactions)`);
    } catch (err) {
      console.error("❌ Daily digest error:", err.message);
    }
  });
};

/**
 * Subscription reminder — runs every day at 10 AM
 * Sends reminder 3 days and 1 day before expiry
 */
const scheduleSubscriptionReminders = () => {
  cron.schedule("0 10 * * *", async () => {
    console.log("🔔 Running subscription reminders...");
    try {
      const { rows: expiring } = await db.query(
        `SELECT s.id, s.customer_id, s.end_date,
                c.email, c.mobile,
                pl.name AS plan_name
         FROM subscriptions s
         JOIN customers c ON c.user_id = s.customer_id
         JOIN plans pl ON pl.id = s.plan_id
         WHERE s.status = 'active'
           AND s.end_date::date IN (
             CURRENT_DATE + INTERVAL '3 days',
             CURRENT_DATE + INTERVAL '1 day'
           )`
      );

      for (const sub of expiring) {
        const daysLeft = Math.ceil(
          (new Date(sub.end_date) - new Date()) / (1000 * 60 * 60 * 24)
        );
        const name = sub.email.split("@")[0];

        // Email reminder
        await sendRequestMail({
          to: sub.email,
          subject: `⏰ Your LaundryAid subscription expires in ${daysLeft} day(s)`,
          html: generateSubscriptionReminderEmail({
            name,
            daysLeft,
            planName: sub.plan_name,
          }),
        });

        // WhatsApp reminder (if mobile available)
        if (sub.mobile) {
          await sendSubscriptionReminder(sub.mobile, name, daysLeft);
        }

        console.log(`✅ Reminder sent to ${sub.email} (${daysLeft} days left)`);
      }
    } catch (err) {
      console.error("❌ Subscription reminder error:", err.message);
    }
  });
};

export const startSchedulers = () => {
  scheduleDailyDigest();
  scheduleSubscriptionReminders();
  console.log("⏰ Schedulers started");
};
