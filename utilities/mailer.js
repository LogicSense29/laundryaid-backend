// utils/mailer.js
import nodemailer from "nodemailer"

export function requestEmail(
  {customerName,
  pickupDate,
  deliveryDate,
  packageType,
  clothesCount,}
) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>LaundryAid Notification</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f6f6f6;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="padding: 20px 0;">
            <img src="cid:laundryaidlogo" alt="LaundryAid Logo" style="width: 200px; height: auto;" />
          </td>
        </tr>
        <tr>
          <td align="center">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; padding: 40px; border-radius: 8px;">
              <tr>
                <td style="color: #333333;">
                  <h2 style="margin-top: 0;">Hello ${customerName},</h2>
                  <p style="font-size: 16px; line-height: 1.6;">
                    Thank you for placing your laundry request with <strong>LaundryAid</strong>! 🧺<br /><br />
                    Your clothes will be picked up as scheduled. We would call you shortly.
                  </p>

                  <table style="margin: 20px 0; width: 100%;">
                    <tr><td><strong>Pickup Date:</strong></td><td>${pickupDate}</td></tr>
                    <tr><td><strong>Delivery Date:</strong></td><td>${deliveryDate}</td></tr>
                    <tr><td><strong>Package:</strong></td><td>${packageType}</td></tr>
                    <tr><td><strong>Clothes Count:</strong></td><td>${clothesCount}</td></tr>
                  </table>

                  <p style="font-size: 16px;">
                    If you have any questions, feel free to reply to this email. We're here to help!
                  </p>

                  <p style="margin-top: 30px;">Warm regards,<br /><strong>The LaundryAid Team</strong></p>
                </td>
              </tr>
            </table>

            <p style="color: #999999; font-size: 12px; padding: 20px 0;">
              &copy; 2025 LaundryAid. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export const generateAdminEmail = ({
  email,
  customerName,
  pickupDate,
  deliveryDate,
  packageType,
  address,
  mobile,
  clothesCount,
  pickupOption,
}) => `
  <div style="font-family: Arial, sans-serif; padding: 20px;">
    <img src="cid:laundryaidlogo" alt="LaundryAid Logo" style="width: 150px;" />
    <h2>New Laundry Request</h2>
    <p><strong>Name:</strong> ${customerName}</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Pickup:</strong> ${pickupDate}</p>
    <p><strong>Delivery:</strong> ${deliveryDate}</p>
    <p><strong>Package:</strong> ${packageType}</p>
    <p><strong>Clothes:</strong> ${clothesCount}</p>
    <p><strong>Pickup Option:</strong> ${pickupOption}</p>
     <p><strong>Phone Number:</strong> ${mobile}</p>
    <p><strong>Address:</strong> ${address}</p>
  </div>
`;



const transporter = nodemailer.createTransport({
  host: "mail.laundryaid.com.ng",
  port: 587,
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export const sendRequestMail = async (
{  to,
subject,
bcc,
html}
) => {
  console.log(process.env.MAIL_USER);
  console.log(process.env.MAIL_PASS);
  console.log(to);

  try {

  const info = await transporter.sendMail({
    from: `"LaundryAid Service" <${process.env.MAIL_USER}>`,
    to,
    subject,
    bcc: bcc || "info@laundryaid.com.ng",
    html,
    attachments: [
      {
        filename: "laundryaidlogo.png",
        path: "./assets/laundryaidlogo.png",
        cid: "laundryaidlogo",
        contentDisposition: "inline",
      },
    ],
  });

  console.log("✅ Email sent:", info.response);
  return { success: true, message: "Email sent successfully" };

  } catch(error) {
     console.error("❌ Email send failed:", error.message);
     return { success: false, message: "Email failed to send", error };
  }
};


