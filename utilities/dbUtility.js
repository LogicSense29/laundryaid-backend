import { generateReferralCode } from "./generateRefcode.js";

// helpers/dbUtils.js
export async function findOrCreateCustomer(db, email, contact, referredByCode = null) {
  const lowerEmail = email.toLowerCase();
  // Check if customer already exists
  const { rows: customers } = await db.query(
    "SELECT * FROM customers WHERE email = $1",
    [lowerEmail]
  );

  if (customers.length > 0) {
    return customers[0].user_id;
  }

  // Generate unique referral code
  let referrerCode = generateReferralCode();
  let codeExists = true;
  while (codeExists) {
    const { rows: codeCheck } = await db.query(
      "SELECT user_id FROM customers WHERE referrer_id = $1",
      [referrerCode]
    );
    if (codeCheck.length === 0) codeExists = false;
    else referrerCode = generateReferralCode();
  }

  // Validate referred_by code if provided
  let validReferredBy = null;
  if (referredByCode) {
    const { rows: referrer } = await db.query(
      "SELECT user_id FROM customers WHERE referrer_id = $1",
      [referredByCode.toUpperCase()]
    );
    if (referrer.length > 0) {
      validReferredBy = referredByCode.toUpperCase();
    }
  }

  const { rows: newCustomers } = await db.query(
    "INSERT INTO customers(email, mobile, referrer_id, referred_by) VALUES($1, $2, $3, $4) RETURNING user_id",
    [lowerEmail, contact, referrerCode, validReferredBy]
  );

  if (newCustomers.length === 0) {
    throw new Error("Failed to insert new customer");
  }

  return newCustomers[0].user_id;
}
