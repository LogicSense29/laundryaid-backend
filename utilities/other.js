import db from "../model/db/db.js";
export const promoCode = async (res, user_id, amount, promo_code) => {
  const client = await db.connect(); // get client for transaction
  try {
    await client.query("BEGIN");

    const { rows: promoCodeRows } = await client.query(
      "SELECT * FROM promo_codes WHERE code = $1",
      [promo_code]
    );

    if (promoCodeRows.length > 0) {
      const promo = promoCodeRows[0];
      const promo_id = promo.id;

      const { rows: usage } = await db.query(
        "SELECT * FROM user_promo_usages WHERE user_id = $1 AND promo_code_id = $2",
        [user_id, promo_id]
      );

      if (usage.length > 0) {
        return res
          .status(400)
          .json({ error: "You’ve already used this promo code" });
      }

      const date = new Date();
      const is_active = promo.is_active;
      const start_date = new Date(promo.start_date);
      const end_date = new Date(promo.end_date);
      const used_count = promo.used_count;
      const usage_limit = promo.usage_limit;
      const min_order_amount = promo.min_order_amount;
      const amountKb = amount * 100;

      console.log(promoCodeRows);
      console.log(amount);
      if (!is_active) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Promo code is not active" });
      }

      if (start_date && date < start_date) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Promo has not started yet" });
      }

      if (end_date && date > end_date) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Promo has expired" });
      }

      if (usage_limit && used_count >= usage_limit) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Promo usage limit reached" });
      }

      if (min_order_amount && amountKb < min_order_amount) {
        await client.query("ROLLBACK");
        return res.status(400).json({ error: "Minimum order amount not met" });
      }

      await client.query(
        "UPDATE promo_codes SET used_count = used_count + 1 WHERE id = $1",
        [promo_id]
      );

      await client.query(
        "INSERT INTO user_promo_usages (user_id, promo_code_id) VALUES ($1, $2)",
        [user_id, promo_id]
      );

      await client.query("COMMIT");

      return {
        success: true,
        message: "Promo applied successfully",
      };
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.log("Errror occured during Voucher check", err);
    return {
      success: false,
      message: "system error during voucher check",
    };
  } finally {
    client.release();
  }
};
