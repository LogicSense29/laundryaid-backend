// import crypto from "crypto";
// import db from "../model/db.js";
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
//       "INSERT INTO promo_codes(code) VALUES($1)",
//       [pin]
//     );
// } catch (err) {

// }



//   }
// };
