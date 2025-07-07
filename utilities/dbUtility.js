import { generateReferralCode } from "./generateRefcode.js";

// helpers/dbUtils.js
export async function findOrCreateCustomer(db, email, contact) {
  //Generate Referal Code
  let refferalCode = generateReferralCode();
  console.log(refferalCode);

  const { rows: customers } = await db.query(
    "SELECT * FROM customers WHERE email = $1",
    [email]
  );

  if (customers.length > 0) {
    return customers[0].user_id;
  }

  // check if there is Similar refer code
  const { rows: codeCheck } = await db.query(
    "SELECT * FROM customers WHERE referrer_id = $1",
    [refferalCode]
  );

  while (codeCheck.length > 0) {
    // regenerate if not unique
    refferalCode = generateReferralCode();
  }

  const { rows: newCustomers } = await db.query(
    "INSERT INTO customers(email, mobile, referrer_id) VALUES($1, $2, $3) RETURNING user_id",
    [email, contact, refferalCode]
  );

  if (newCustomers.length === 0) {
    throw new Error("Failed to insert new customer");
  }

  return newCustomers[0].user_id;
}
