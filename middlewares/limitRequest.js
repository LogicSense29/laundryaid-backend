import rateLimit from "express-rate-limit";

// 1 request per 15 minutes per IP
export const limitPickupRequest = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1, // Limit each IP to 1 request per windowMs
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "⏱️ Please wait 15 minutes before trying again.",
    });
}
});

