import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  // Basic Identity
  id: { type: String, required: true, unique: true }, // RegID / StaffID / AdminID
  role: { type: String, enum: ["student", "staff", "admin"], required: true },

  // Personal Info
  fullName: { type: String },
  email: { type: String, required: true, unique: true }, // "unique: true" added back
  phone: { type: String },

  // Auth
  password: { type: String, required: true },

  // OTP & Verification
  isVerified: { type: Boolean, default: false },
  otp: { type: String }, // Email OTP
  otpExpires: { type: Number },
  phoneOtp: { type: String }, // 🔥 Phone OTP
  phoneOtpExpires: { type: Number },
  resetOtp: { type: String },
  resetOtpExpires: { type: Date },

  // Profile Update OTPs
  pendingEmail: { type: String },
  pendingEmailOtp: { type: String },
  pendingEmailOtpExpires: { type: Number },
  pendingPhone: { type: String },
  pendingPhoneOtp: { type: String },
  pendingPhoneOtpExpires: { type: Number },

  // Student Info
  program: String,
  studentType: String,

  // Admin / Staff Info
  staffDepartment: { type: String, default: "" },
  isDeptAdmin: { type: Boolean, default: false },
  adminDepartment: { type: String, default: "" },
  isMasterAdmin: { type: Boolean, default: false }, // 🔥 Added for Transferable Ownership

}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
