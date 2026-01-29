import express from "express";
import {
  registerRequest,
  verifyRegistration,
  loginUser,
  verifyLogin,
  forgotPassword,
  resetPassword
} from "../controllers/authController.js";

const router = express.Router();

// Register (Step 1 & 2)
router.post("/register-request", registerRequest);
router.post("/verify-registration", verifyRegistration);

// Login (Step 1 & 2)
router.post("/login", loginUser);
router.post("/verify-login", verifyLogin);

// Forgot Password (ID + Email -> Email OTP)
router.post("/forgot-password", forgotPassword);

// Reset Password
router.post("/reset-password", resetPassword);

export default router;
