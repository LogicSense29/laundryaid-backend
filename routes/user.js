import express from "express";
import { loginUser, requestOTP, verifyOTP, otpLogin } from "../controllers/userController.js";

const route = express.Router();

// Password-based login (existing)
route.post("/login", loginUser);

// OTP-based login (no registration needed — user created on first booking)
route.post("/otp/request", requestOTP);
route.post("/otp/verify", otpLogin);

export { route as authRoute };
