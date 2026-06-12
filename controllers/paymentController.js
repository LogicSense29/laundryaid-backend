import axios from 'axios';
import db from '../model/db/db.js';

export const verifyPayment = async (reference, plan, request_id, customer_id) => {
  try {
    const response = await axios(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_TEST_KEY}`,
        },
      }
    );

    const data = response.data.data;
    //Check for Package
    const { rows } = await db.query("SELECT id FROM packages WHERE name = $1", [
      plan,
    ]);


    console.log('from database', rows)
    if (rows.length == 0) {
      return { success: false, message: "Invalid package" };
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
      return { success: false, message: "Transaction Failed", error: data };
    }

    //Check that there is no duplicate Reference
    const { rows: ref } = await db.query(
      "SELECT paystack_reference FROM payments WHERE paystack_reference = $1 and user_id = $2",
      [reference, customer_id]
    );

    if (ref.length > 0) {
      return { success: false, message: "No vex guy, na Duplicate Reference" };
    }


    // Store payment record
    await db.query(
      `
            INSERT INTO payments (user_id, request_id, package_id, paystack_reference, status)
            VALUES ($1, $2, $3, $4, $5)
          `,
      [customer_id, request_id, package_id, reference, 'success']
    );

    // [NEW] Subscription Enrollment
    // Check if the chosen plan exists in the 'plans' table and is a monthly plan
    const { rows: planRows } = await db.query(
      "SELECT id, interval FROM plans WHERE name = $1",
      [plan]
    );

    if (planRows.length > 0 && planRows[0].interval === 'monthly') {
      // Automatically enroll the user into a 30-day recurring subscription
      await db.query(
        `INSERT INTO subscriptions (customer_id, plan_id, status, start_date, end_date, is_recurring)
         VALUES ($1, $2, 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', true)`,
        [customer_id, planRows[0].id]
      );

      // Insert Subscription Notification
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, $2, $3, $4)`,
        [
          customer_id,
          "Subscription Activated ⭐",
          `You've successfully subscribed to the ${plan} monthly plan! Valid for 30 days.`,
          "subscription"
        ]
      );
      console.log(`Successfully enrolled customer ${customer_id} in monthly plan: ${plan}`);
    }

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