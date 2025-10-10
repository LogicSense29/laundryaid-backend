import axios from 'axios';
import db from '../model/db/db.js';

export const verifyPayment = async (res, reference, plan, request_id, customer_id) => {
  try {
    const response = await axios(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const data = response.data.data;
console.log('checking',plan)
    //Check for Package
    const { rows } = await db.query("SELECT id FROM packages WHERE name = $1", [
      plan,
    ]);
    if (rows.length == 0) {
      return res.status(400).json({ error: "Invalid package" });
    }

    const package_id = rows[0].id;


    if (data.status !== "success") {
      await db.query(
        `
            INSERT INTO payments (user_id, request_id, package_id, paystack_reference, status)
            VALUES ($1, $2, $3, $4, $5)
          `,
        [customer_id, request_id, package_id, reference , 'failed']
      );
      return res.status(400).json({ error: "Transaction Failed" });
    }

    //Check that there is no duplicate Reference
    const { rows: ref } = await db.query(
      "SELECT paystack_reference FROM payments WHERE paystack_reference = $1 and user_id = $2",
      [reference, customer_id]
    );

    if (ref.length > 0) {
      return res.status(401).json({
        error: "No vex guy, na Duplicate Reference",
      });
    }


    // Store payment record
    await db.query(
      `
            INSERT INTO payments (user_id, request_id, package_id, paystack_reference, status)
            VALUES ($1, $2, $3, $4, $5)
          `,
      [customer_id, request_id, package_id, reference, 'success']
    );

    return {
      success: true,
      message: "Payment successfully",
    };
  } catch (err) {
    console.log("Error occured while verifying Payment", err);
    return {
      success: false,
      message: "Payment unsuccesful",
      error: err
    };
}
}