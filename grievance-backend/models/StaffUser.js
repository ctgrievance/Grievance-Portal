import mongoose from "mongoose";

// StaffUser: Authenticated STAFF and ADMIN users (after registration)
const staffUserSchema = new mongoose.Schema({
    // Basic Identity
    id: { type: String, required: true, unique: true }, // StaffID / AdminID
    role: { type: String, enum: ["staff", "admin"], required: true },

    // Personal Info
    fullName: { type: String },
    email: { type: String, required: true },
    phone: { type: String },

    // Auth
    password: { type: String, required: true },

    // OTP & Verification
    isVerified: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Number },
    phoneOtp: { type: String },
    phoneOtpExpires: { type: Number },
    resetOtp: { type: String },
    resetOtpExpires: { type: Date },

    // Staff/Admin Specific Info
    staffDepartment: { type: String, default: "" },

    // Admin Role Management
    isDeptAdmin: { type: Boolean, default: false },
    adminDepartment: { type: String, default: "" },
    isMasterAdmin: { type: Boolean, default: false },

}, { timestamps: true });

const StaffUser = mongoose.model("StaffUser", staffUserSchema);
export default StaffUser;
