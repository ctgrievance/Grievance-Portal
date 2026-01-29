import User from "../models/UserModel.js";
import UniversityRecord from "../models/UniversityRecord.js";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ================= EMAIL SETUP =================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Google App Password
  },
});

// =================================================
// 1️⃣ REGISTER REQUEST (SEND DUAL OTP)
// =================================================
export const registerRequest = async (req, res) => {
  try {
    const { email, password, id, phone } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { id }] });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ message: "User already exists" });
    }

    // ✅ Validate ID against University Records
    const validRecord = await UniversityRecord.findOne({ id: id.toString().trim().toUpperCase() });
    if (!validRecord) {
      return res.status(403).json({ message: "ID not found in University Records." });
    }

    // Generate OTPs
    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const phoneOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
      ...req.body,
      password: hashedPassword,
      otp: emailOtp, // Email Code
      otpExpires: Date.now() + 10 * 60 * 1000,
      phoneOtp: phoneOtp, // Phone Code
      phoneOtpExpires: Date.now() + 10 * 60 * 1000,
      isVerified: false,
    };

    await User.findOneAndUpdate(
      { email },
      userData,
      { upsert: true, new: true }
    );

    // 📧 Send Email OTP
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "CT University - Registration Verification",
      text: `Your Email Verification Code is: ${emailOtp}\n\nValid for 10 minutes.`,
    });

    // 📱 Simulate Phone & Email OTP (Console Log for Debugging)


    res.status(200).json({ message: `Verification codes sent to ${email} and ${phone}` });

  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// =================================================
// 2️⃣ VERIFY REGISTRATION (DUAL CHECK)
// =================================================
export const verifyRegistration = async (req, res) => {
  try {
    const { email, otpEmail, otpPhone } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // Validate Email OTP
    if (user.otp !== otpEmail || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired Email OTP" });
    }

    // Validate Phone OTP
    if (user.phoneOtp !== otpPhone || user.phoneOtpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired Phone OTP" });
    }

    // ✅ Success
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    user.phoneOtp = undefined;
    user.phoneOtpExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Account verified successfully! You can now login." });

  } catch (err) {
    console.error("Verification Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// =================================================
// 3️⃣ LOGIN USER - STEP 1 (Credentials -> 2FA)
// =================================================
export const loginUser = async (req, res) => {
  try {
    const { id, password } = req.body;

    const user = await User.findOne({ id });

    if (!user) return res.status(400).json({ message: "User not found" });

    if (!user.isVerified) return res.status(403).json({ message: "Account not verified" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    // 🔐 Generate 2FA OTP (Email)
    const loginOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = loginOtp;
    user.otpExpires = Date.now() + 5 * 60 * 1000; // 5 min
    await user.save();

    // Send OTP
    console.log(`[DEBUG] Login OTP for ${user.email}: ${loginOtp}`); // 🔥 Debug Log Added
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "CT University - Login OTP",
      text: `Your Login OTP is ${loginOtp}. Valid for 5 minutes.`,
    });

    // Return 2FA Flag
    res.status(200).json({
      requires2FA: true,
      message: `OTP sent to ${user.email}`,
      maskedEmail: user.email.replace(/(.{2})(.*)(@.*)/, "$1***$3")
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// =================================================
// 4️⃣ LOGIN USER - STEP 2 (Verify OTP -> Token)
// =================================================
export const verifyLogin = async (req, res) => {
  try {
    const { id, otp } = req.body;

    const user = await User.findOne({ id });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired Login OTP" });
    }

    // Clear OTP
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Generate Token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        isDeptAdmin: user.isDeptAdmin,
        adminDepartment: user.adminDepartment,
        isMasterAdmin: user.isMasterAdmin // 🔥 Added to token
      },
      process.env.JWT_SECRET || "fallback_secret_key_123",
      { expiresIn: "7d" }
    );

    // Response Data
    res.status(200).json({
      message: "Login successful",
      token, // 🔥 Return Token
      user: {
        id: user.id,
        role: user.role,
        fullName: user.fullName,
        isDeptAdmin: user.isDeptAdmin,
        adminDepartment: user.adminDepartment,
        isMasterAdmin: user.isMasterAdmin // 🔥 Added to response
      },
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =================================================
// 5️⃣ FORGOT PASSWORD (ID + Email -> Email OTP)
// =================================================
export const forgotPassword = async (req, res) => {
  try {
    const { id, email } = req.body;

    // Verify User by ID and Email
    const user = await User.findOne({ id, email });
    if (!user) {
      return res.status(404).json({ message: "No user found with this ID and Email combination." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP before storing
    const hashedOtp = await bcrypt.hash(otp, 10);

    user.resetOtp = hashedOtp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    console.log(`[DEBUG] Reset OTP for ${email}: ${otp}`);

    // Send Email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "CT University - Password Reset Request",
      text: `Your Password Reset OTP is: ${otp}\n\nValid for 10 minutes.\n\nIf you did not request this, please ignore this email.`,
    });

    res.json({ message: `Password reset OTP sent to ${email}` });

  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

// =================================================
// 6️⃣ RESET PASSWORD (Verify OTP -> New Password)
// =================================================
export const resetPassword = async (req, res) => {
  try {
    const { id, otp, newPassword } = req.body;

    const user = await User.findOne({
      id,
      resetOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "OTP expired or invalid user." });
    }

    const isOtpValid = await bcrypt.compare(otp, user.resetOtp);
    if (!isOtpValid) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Update password
    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;

    await user.save();

    res.json({ message: "✅ Password reset successfully. You can now login." });

  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Password reset failed" });
  }
};
