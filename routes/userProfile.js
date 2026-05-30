import express from "express";
import { getUserProfile, getUserBookings } from "../controllers/profileController.js";
import { getReferralStats } from "../controllers/referralController.js";
import { auth } from "../middlewares/authMiddleware.js";

const route = express.Router();

route.get("/profile", auth, getUserProfile);
route.get("/bookings", auth, getUserBookings);
route.get("/referrals", auth, getReferralStats);

export { route as userProfileRoute };
