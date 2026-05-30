import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Send a WhatsApp message via Twilio
 * @param {string} to - recipient in format "whatsapp:+234XXXXXXXXXX"
 * @param {string} body - message text
 */
export const sendWhatsApp = async (to, body) => {
  try {
    const message = await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM,
      to,
      body,
    });
    console.log("✅ WhatsApp sent:", message.sid);
    return { success: true, sid: message.sid };
  } catch (err) {
    console.error("❌ WhatsApp failed:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send subscription reminder to a user
 */
export const sendSubscriptionReminder = async (mobile, name, daysLeft) => {
  const to = `whatsapp:${mobile.startsWith("+") ? mobile : "+234" + mobile.replace(/^0/, "")}`;
  const body = `Hi ${name} 👋, your LaundryAid subscription expires in *${daysLeft} day(s)*. Renew now to keep enjoying clean clothes! 🧺 Visit laundryaid.com.ng`;
  return sendWhatsApp(to, body);
};
