import db from "../model/db/db.js"

export const promoCodeCheck = async (req,res) => {
    const {promo_code, email} = req.body

     const toUpperCase = promo_code?.toUpperCase();

        try{
            const {rows} = await db.query('SELECT * FROM promo_codes WHERE code = $1', [toUpperCase])
            if(rows.length == 0){
                return res.status(400).json({error: 'Invalid code'})
            }

            const promo_id = rows[0].id

            
          const { rows: customers } = await db.query(
              "SELECT * FROM customers WHERE email = $1",
                 [email]
                  );
          if (customers.length > 0) {
             const user_id = customers[0].user_id;

                 const { rows: usage } = await db.query(
                   "SELECT * FROM user_promo_usages WHERE user_id = $1 AND promo_code_id = $2",
                   [user_id, promo_id]
                 );
                 if (usage.length > 0) {
                   return res
                     .status(400)
                     .json({ error: "You’ve already used this promo code" });
                 }
                }



            const value = rows[0].value
            // const percentage = value / 100
            return res.status(200).json({ message: "Correct code", percentage: value });
        }catch(error) {
             console.error("DB Error from Voucher Check:", error);
             res.status(500).json({ error: "Failed to check Voucher code" });
        }
}