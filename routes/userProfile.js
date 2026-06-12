import express from "express";
import { getUserProfile, getUserBookings, getNotifications, markNotificationsRead } from "../controllers/profileController.js";
import { getReferralStats } from "../controllers/referralController.js";
import { 
  requestWithdrawal, 
  verifyWithdrawal, 
  adminConfirmWithdrawal, 
  adminRejectWithdrawal 
} from "../controllers/walletController.js";
import { auth } from "../middlewares/authMiddleware.js";

const route = express.Router();

route.get("/profile", auth, getUserProfile);
route.get("/bookings", auth, getUserBookings);
route.get("/referrals", auth, getReferralStats);
route.get("/notifications", auth, getNotifications);
route.post("/notifications/read", auth, markNotificationsRead);

route.post("/wallet/withdraw/request", auth, requestWithdrawal);
route.post("/wallet/withdraw/verify", auth, verifyWithdrawal);
route.get("/wallet/admin/withdrawals/:id/confirm", adminConfirmWithdrawal);
route.get("/wallet/admin/withdrawals/:id/reject", adminRejectWithdrawal);

export { route as userProfileRoute };
