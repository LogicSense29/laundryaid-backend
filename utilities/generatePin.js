// import crypto from "crypto";
// import db from "../model/db/db.js";

// const generatePin = () => {
//   return crypto.randomBytes(5).toString("hex").toUpperCase();
// };

// const generatePins = async (count) => {
//   for (let i = 0; i > count; i++) {
//     let pin = generatePin()
// try {
//     const { rows: code } = await db.query(
//       "SELECT code FROM promo_codes WHERE code = $1",
//       [pin]
//     );

//     if (code.length > 0) {
//       pin = generatePin();
//     }
//     const { rows: codes } = await db.query(
//       "INSERT INTO promo_codes(code, description, type,value, min_order_amount,usage_limit, ) VALUES($1, $2,$3,$4,$5,$6)",
//       [pin,'Conversion Promo', 'percentage', 5000.00, 350000.00, 1]
//     );
// } catch (err) {
//     console.error("Error during Voucher check", err);
// }
//   }
// };

// generatePins(1000)
import crypto from "crypto";
import db from "../model/db/db.js";

const generatePin = () => {
  return crypto.randomBytes(5).toString("hex").toUpperCase();
};

const generatePins = async (count) => {
  for (let i = 0; i < count; i++) {
    let pin = generatePin();
    try {
      const { rows: code } = await db.query(
        "SELECT code FROM promo_codes WHERE code = $1",
        [pin]
      );

      if (code.length > 0) {
        pin = generatePin(); // regenerate if duplicate
      }

      await db.query(
        "INSERT INTO promo_codes (code, description, type, value, min_order_amount, usage_limit) VALUES ($1, $2, $3, $4, $5, $6)",
        [pin, "Conversion Promo", "percentage", 5000.0, 350000.0, 1]
      );

      console.log(`✅ Generated pin ${i + 1}: ${pin}`);
    } catch (err) {
      console.error("❌ Error during Voucher insert:", err);
    }
  }
};

generatePins(1000);
