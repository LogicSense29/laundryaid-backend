import db from "../model/db/db.js";
import { findOrCreateCustomer } from "../utilities/dbUtility.js";
import { generateAdminEmail, requestEmail, sendRequestMail } from "../utilities/mailer.js";
import { validateRequestBody } from "../utilities/validateRequest.js";


export const addRequest =  async (req, res ) => {
  const errors = validateRequestBody(req.body);

  if (errors.length > 0) {
    return res.status(400).json({message: 'Error Validating Input', erorr:  errors });
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
    clothes_count,
  } = req.body;

  console.log(req.body);

  const user_id = await findOrCreateCustomer(db, email, contact);
  

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

    res.status(201).json({ request: result.rows[0] });
    const to = result.rows[0].email;
    const customerName = result.rows[0].name;
    const pickup_date = result.rows[0].pickup_date;
    const delivery_date = result.rows[0].delivery_date;
    const packageType = result.rows[0].package;
    const clothesCount = result.rows[0].clothes_count;
    const deliveryAddress = result.rows[0].address;
    const mobile = result.rows[0].contact;
    const customerEmail = result.rows[0].email;
    const option = result.rows[0].pickup_option;
    // const clothes_count = result.rows[0].clothes_count

    await sendRequestMail({
      to,
      subject: "Your Laundry Request 😊",
      bcc: 'palmslaundryng@gmail.com',
      html: requestEmail({
        to,
        customerName,
       pickupDate:  pickup_date,
       deliveryDate:  delivery_date,
        packageType,
        deliveryAddress,
        clothesCount,
      }),
    })

    await sendRequestMail({
      to: 'palmslaundryng@gmail.com',
      subject: "New Pickup Request 😊",
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
      }),
    });

  } catch (err) {
    console.error("DB Error:", err);
    res.status(500).json({ error: "Failed to create request" });
  }
}
