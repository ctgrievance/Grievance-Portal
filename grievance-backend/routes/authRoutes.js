import express from "express";
import User from "../models/UserModel.js";
import StaffUser from "../models/StaffUser.js";
import StudentUser from "../models/StudentUser.js";
import StudentRecord from "../models/StudentRecord.js";
import StaffRecord from "../models/StaffRecord.js";
import {
  registerRequest,
  verifyRegistration,
  loginUser,
  verifyLogin,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  getUserProfile,
  updateUserProfile,
  requestEmailOtp,
  verifyEmailOtp,
  requestPhoneOtp,
  verifyPhoneOtp
} from "../controllers/authController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Register (Step 1 & 2)
router.post("/register-request", registerRequest);
router.post("/verify-registration", verifyRegistration);

// Login (Step 1 & 2)
router.post("/login", loginUser);
router.post("/verify-login", verifyLogin);

// Forgot Password (ID + Email -> Email OTP)
router.post("/forgot-password", forgotPassword);
router.post("/verify-reset-otp", verifyResetOtp);

// Reset Password
router.post("/reset-password", resetPassword);

// User Profile & Contact Update with OTP
router.get("/profile", verifyToken, getUserProfile);
router.put("/profile", verifyToken, updateUserProfile);
router.post("/profile/request-email-otp", verifyToken, requestEmailOtp);
router.post("/profile/verify-email-otp", verifyToken, verifyEmailOtp);
router.post("/profile/request-phone-otp", verifyToken, requestPhoneOtp);
router.post("/profile/verify-phone-otp", verifyToken, verifyPhoneOtp);

// Get User by ID
router.get("/user/:id", async (req, res) => {
  try {
    const safeId = req.params.id.toString().trim().toUpperCase();
    console.log(`🔍 Fetching user with ID: ${safeId}`);

    // 1️⃣ Check Staff collection first
    const staffUser = await StaffUser.findOne({ id: safeId });
    if (staffUser) {
      const staffRecord = await StaffRecord.findOne({ id: safeId });
      const dept = staffUser.staffDepartment || staffUser.adminDepartment || (staffRecord ? staffRecord.department : "") || "General";
      return res.json({
        fullName: staffUser.fullName || "",
        email: staffUser.email || "",
        phone: staffUser.phone || "",
        role: staffUser.role || "staff",
        department: dept,
        adminDepartment: staffUser.adminDepartment || "",
        staffDepartment: staffUser.staffDepartment || "",
        isDeptAdmin: staffUser.isDeptAdmin || false,
        isMasterAdmin: staffUser.isMasterAdmin || false,
      });
    }

    // 2️⃣ Check Student collections
    const studentUser = await StudentUser.findOne({ id: safeId });
    const studentRecord = await StudentRecord.findOne({ id: safeId });
    const legacyUser = await User.findOne({ id: safeId });

    const isStudent = !!studentUser || !!studentRecord || (legacyUser && legacyUser.role === "student") || /^\d+$/.test(safeId);

    if (isStudent) {
      const studentSchool = studentUser?.school || studentRecord?.school || legacyUser?.school || "";
      const studentProgram = studentUser?.program || studentRecord?.program || legacyUser?.program || "";
      const studentDept = studentSchool || studentProgram || "General";

      // Self-heal StudentUser record if school or role is missing
      if (studentUser) {
        let needsSave = false;
        if (!studentUser.school && studentSchool) {
          studentUser.school = studentSchool;
          studentUser.department = studentSchool;
          needsSave = true;
        }
        if (!studentUser.role) {
          studentUser.role = "student";
          needsSave = true;
        }
        if (needsSave) {
          await studentUser.save().catch((e) => console.error("StudentUser heal error:", e));
        }
      }

      // Self-heal legacy User record if missing school
      if (legacyUser && !legacyUser.school && studentSchool) {
        legacyUser.school = studentSchool;
        legacyUser.department = studentSchool;
        legacyUser.role = "student";
        await legacyUser.save().catch((e) => console.error("Legacy User heal error:", e));
      }

      return res.json({
        fullName: studentUser?.fullName || studentRecord?.fullName || legacyUser?.fullName || "Student",
        email: studentUser?.email || studentRecord?.email || legacyUser?.email || "",
        phone: studentUser?.phone || studentRecord?.phone || legacyUser?.phone || "",
        role: "student",
        school: studentSchool || studentDept,
        program: studentProgram,
        department: studentDept,
        adminDepartment: ""
      });
    }

    // 3️⃣ Check legacy User fallback (if non-student staff/admin)
    if (legacyUser) {
      return res.json({
        fullName: legacyUser.fullName || "",
        email: legacyUser.email || "",
        phone: legacyUser.phone || "",
        role: legacyUser.role || "staff",
        department: legacyUser.staffDepartment || legacyUser.adminDepartment || "General",
        adminDepartment: legacyUser.adminDepartment || ""
      });
    }

    // 4️⃣ User not found
    return res.status(404).json({ message: "User not found" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;
