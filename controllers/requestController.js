import jwt from "jsonwebtoken";
import db from "../model/db/db.js";
import { findOrCreateCustomer } from "../utilities/dbUtility.js";
import { generateAdminEmail, requestEmail, sendRequestMail } from "../utilities/mailer.js";
import { validateRequestBody } from "../utilities/validateRequest.js";
import { promoCode } from "../utilities/promoCode.js";
import { verifyPayment } from "./paymentController.js";
import { creditReferralCommission } from "./referralController.js";


export const addRequest =  async (req, res ) => {
  const errors = validateRequestBody(req.body);

  if (errors.length > 0) {
    console.log(errors)
    return res.status(400).json({error: 'Error Validating Input' });
  }


  const {
    name,
    email,
    contact,
    address,
    serviceType,
    pickupDate,
    deliveryDate,
    pickupOption,
    paymentRef,
    paidAmount,
    clothes_count = 80,
    promo_code,
    referred_by,
  } = req.body;

  const user_id = await findOrCreateCustomer(db, email, contact, referred_by);
  

  try {
    const result = await db.query(
      `INSERT INTO request (name, email, contact, address, package, 
        pickup_date, delivery_date, pickup_option, clothes_count, user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8 ,$9, $10)
      RETURNING *`,
      [
        name,
        email,
        contact,
        address,
        serviceType,
        pickupDate,
        deliveryDate,
        pickupOption,
        clothes_count,
        user_id,
      ]
    );

    //Voucher check
    // if (promo_code) {
    //   const toUpperCase = promo_code.toUpperCase()
    //   const promoResult = await promoCode(user_id, paidAmount, toUpperCase);

    //   console.log(promoResult)
    //   console.log(promo_code);
    //   if(!promoResult.success){
    //     console.log("From promo code , request", promoResult.message);
    //      return res.status(400).json({ error: promoResult.message });
    //   }
    // }
    // Voucher check
    if (promo_code != null && promo_code.trim() !== "") {
      const toUpperCase = promo_code.toUpperCase().trim();
      const promoResult = await promoCode(user_id, paidAmount, toUpperCase);

      console.log(promoResult);
      console.log(promo_code);

      if (!promoResult.success) {
        console.log("From promo code, request", promoResult.message);
        return res.status(400).json({ error: promoResult.message });
      }
    }

    const request_id = result.rows[0].request_id;
    const packageType = result.rows[0].package;
    const paymentVerification = await verifyPayment(
      paymentRef,
      packageType,
      request_id,
      user_id,
      paidAmount,
      promo_code
    );

    if (!paymentVerification.success) {
      return res.status(400).json({ error: "Payment verification failed" , message : paymentVerification.message});
    }

    // Credit referral commission (15%) to referrer if applicable
    await creditReferralCommission(user_id, paidAmount);

    // [NEW] Insert Notification for Booking
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type)
       VALUES ($1, $2, $3, $4)`,
      [
        user_id,
        "Booking Confirmed 🎉",
        `Your ${packageType} laundry request was successfully booked! We'll pick it up on ${pickupDate}.`,
        "booking"
      ]
    );

    const to = result.rows[0].email;
    const customerName = result.rows[0].name;
    const pickup_date = result.rows[0].pickup_date;
    const delivery_date = result.rows[0].delivery_date;
    const clothesCount = result.rows[0].clothes_count;
    const deliveryAddress = result.rows[0].address;
    const mobile = result.rows[0].contact;
    const customerEmail = result.rows[0].email;
    const option = result.rows[0].pickup_option;
    // const clothes_count = result.rows[0].clothes_count

    const token = jwt.sign({ id: user_id }, process.env.SECRET, { expiresIn: "2d" });
    // Separate short-lived token for email status buttons (7 days)
    const statusToken = jwt.sign({ request_id }, process.env.SECRET, { expiresIn: "7d" });
    
    const { rows: userRows } = await db.query("SELECT referrer_id FROM customers WHERE user_id = $1", [user_id]);
    const referralCode = userRows.length > 0 ? userRows[0].referrer_id : null;

    res.status(201).json({ 
      request: result.rows[0], 
      token, 
      user: { email: customerEmail, referralCode }
    });
    await sendRequestMail({
      to,
      subject: "Your Laundry Request",
      bcc: "palmslaundryng@gmail.com",
      html: requestEmail({
        to,
        customerName,
        pickupDate: pickup_date,
        deliveryDate: delivery_date,
        packageType,
        deliveryAddress,
        clothesCount,
      }),
    });

    await sendRequestMail({
      to: "palmslaundryng@gmail.com",
      subject: "New Pickup Request",
      bcc: "lappiconnect@gmail.com",
      html: generateAdminEmail({
        email: customerEmail,
        customerName,
        pickupDate,
        deliveryDate,
        packageType,
        address,
        mobile,
        clothesCount,
        pickupOption: option,
        requestId: request_id,
        statusToken,
      }),
    });
  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Failed to create request" });
  }
}
