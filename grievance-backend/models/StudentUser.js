import mongoose from "mongoose";

// StudentUser: Authenticated STUDENT users (after registration)
const studentUserSchema = new mongoose.Schema({
    // Basic Identity
    id: { type: String, required: true, unique: true }, // RegID

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

    // Student Specific Info
    program: { type: String, default: "" },
    studentType: { type: String, default: "" },

}, { timestamps: true });

const StudentUser = mongoose.model("StudentUser", studentUserSchema);
export default StudentUser;
