// promoService.js
import db from "../model/db/db.js";

export const promoCode = async (user_id, amount, promo_code) => {
  const client = await db.connect();


  try {
    await client.query("BEGIN");

    const { rows: promoCodeRows } = await client.query(
      "SELECT * FROM promo_codes WHERE code = $1",
      [promo_code]
    );

    if (promoCodeRows.length == 0) {
      await client.query("ROLLBACK");
      return { success: false, message: "Promo code not found" };
    }

    const promo = promoCodeRows[0];
    const promo_id = promo.id;

    const { rows: usage } = await client.query(
      "SELECT * FROM user_promo_usages WHERE user_id = $1 AND promo_code_id = $2",
      [user_id, promo_id]
    );

    if (usage.length > 0) {
      await client.query("ROLLBACK");
      return { success: false, message: "You’ve already used this promo code" };
    }

    const date = new Date();
    const amountKb = amount * 100;

    if (!promo.is_active) {
      await client.query("ROLLBACK");
      return { success: false, message: "Promo code is not active" };
    }

    if (promo.start_date && date < new Date(promo.start_date)) {
      await client.query("ROLLBACK");
      return { success: false, message: "Promo has not started yet" };
    }

    if (promo.end_date && date > new Date(promo.end_date)) {
      await client.query("ROLLBACK");
      return { success: false, message: "Promo has expired" };
    }

    // if (promo.usage_limit && promo.used_count >= promo.usage_limit) {
    //   await client.query("ROLLBACK");
    //   return { success: false, message: "Promo usage limit reached" };
    // }

    if (promo.min_order_amount && amountKb < promo.min_order_amount) {
      await client.query("ROLLBACK");
      return { success: false, message: "Minimum order amount not met" };
    }

    // Update usage
    await client.query(
      "UPDATE promo_codes SET used_count = used_count + 1 WHERE id = $1",
      [promo_id]
    );

    await client.query(
      "INSERT INTO user_promo_usages (user_id, promo_code_id) VALUES ($1, $2)",
      [user_id, promo_id]
    );

    await client.query("COMMIT");

    return { success: true, message: "Promo applied successfully" };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error during Voucher check", err);
    return { success: false, message: "System error during voucher check" };
  } finally {
    client.release();
  }
};
