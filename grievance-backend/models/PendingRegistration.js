import mongoose from "mongoose";

// PendingRegistration: Holds temporary registration data & OTPs before user completes verification.
// Auto-expires via MongoDB TTL index (15 minutes / 900 seconds).
// User is ONLY inserted into StudentUser/StaffUser once OTP is successfully verified!
const pendingRegistrationSchema = new mongoose.Schema({
  id: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, default: "" },
  role: { type: String, default: "student" },
  password: { type: String, required: true }, // hashed password
  fullName: { type: String, default: "" },

  // Student-specific
  ctuId: { type: String, default: "" },
  school: { type: String, default: "" },
  department: { type: String, default: "" },
  program: { type: String, default: "" },
  studentType: { type: String, default: "" },

  // Staff-specific
  staffDepartment: { type: String, default: "" },
  staffType: { type: String, default: "Non-Teaching" },

  // OTPs
  otp: { type: String, required: true },
  otpExpires: { type: Number, required: true },
  phoneOtp: { type: String, required: true },
  phoneOtpExpires: { type: Number, required: true },

  createdAt: { type: Date, default: Date.now, expires: 900 } // Auto-deletes after 15 minutes
});

pendingRegistrationSchema.index({ id: 1 });
pendingRegistrationSchema.index({ email: 1 });
pendingRegistrationSchema.index({ ctuId: 1 });

const PendingRegistration = mongoose.model("PendingRegistration", pendingRegistrationSchema);
export default PendingRegistration;

