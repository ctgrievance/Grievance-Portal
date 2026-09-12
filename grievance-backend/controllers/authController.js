import User from "../models/UserModel.js"; // Legacy - kept for backup
import StudentRecord from "../models/StudentRecord.js"; // NEW: Student validation
import StaffRecord from "../models/StaffRecord.js"; // NEW: Staff/Admin validation
import StudentUser from "../models/StudentUser.js"; // NEW: Student users
import StaffUser from "../models/StaffUser.js"; // NEW: Staff/Admin users
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendEmailOtp } from "../utils/emailService.js";


// ================= SMS SETUP (Innuvis API) =================
const sendSms = async (phone, otp, customMessage = null) => {
  try {
    let formattedPhone = phone.toString().trim();
    if (formattedPhone.length === 10) {
      formattedPhone = "91" + formattedPhone;
    }

    const message = customMessage || `Dear User, Your One-Time Password (OTP) for registering on the CT University Grievance Portal is: ${otp} - CTU Support Team`;
    const encodedMessage = encodeURIComponent(message);

    const url = `${process.env.SMS_API_URL}&number=${formattedPhone}&text=${encodedMessage}`;

    const response = await fetch(url);
    const data = await response.text();
    
    console.log("✅ SMS API Called for:", formattedPhone);
    console.log("✅ SMS Response:", data);
    
    return data;
  } catch (error) {
    console.error("SMS API Network Error:", error.message);
  }
};

// =================================================
// 1️⃣ REGISTER REQUEST (SEND DUAL OTP) - UPDATED FOR SEPARATED DATA
// =================================================
export const registerRequest = async (req, res) => {
  try {
    const { email, password, id, phone, role } = req.body;
    const safeId = id.toString().trim().toUpperCase();
    const userRole = role ? role.toLowerCase().trim() : "student";

    // Check if user already exists in either collection
    let existingUser = null;
    if (userRole === "student") {
      existingUser = await StudentUser.findOne({ $or: [{ email }, { id: safeId }] });
    } else {
      existingUser = await StaffUser.findOne({ $or: [{ email }, { id: safeId }] });
    }

    // Also check legacy User collection
    if (!existingUser) {
      existingUser = await User.findOne({ $or: [{ email }, { id: safeId }] });
    }

    // User exists check ENABLED (Testing mode disabled)
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ message: "User already exists" });
    }

    // ✅ Validate ID against official records (StudentRecord for students, StaffRecord for staff/admin)
    let validRecord = null;
    if (userRole === "student") {
      validRecord = await StudentRecord.findOne({ id: safeId });
    } else {
      validRecord = await StaffRecord.findOne({ id: safeId });
    }

    if (!validRecord) {
      return res.status(403).json({ message: `ID not found in University ${userRole === "student" ? "Student" : "Staff"} Records.` });
    }

    // Generate OTPs
    const phoneOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare user data based on role
    const baseUserData = {
      id: safeId,
      email: email.toLowerCase().trim(),
      phone,
      password: hashedPassword,
      fullName: validRecord.fullName || req.body.fullName || "",
      otp: emailOtp,
      otpExpires: Date.now() + 10 * 60 * 1000,
      phoneOtp: phoneOtp,
      phoneOtpExpires: Date.now() + 10 * 60 * 1000,
      isVerified: false,
    };

    // Create user in appropriate collection
    if (userRole === "student") {
      const studentData = {
        ...baseUserData,
        role: "student",
        school: validRecord.school || req.body.school || "",
        department: validRecord.school || req.body.department || "",
        program: validRecord.program || req.body.program || "",
        studentType: validRecord.studentType || req.body.studentType || "",
      };
      await StudentUser.findOneAndUpdate({ id: safeId }, studentData, { upsert: true, new: true });
    } else {
      const staffDept = req.body.department || validRecord.department || "";
      const staffData = {
        ...baseUserData,
        role: validRecord.role || userRole,
        staffDepartment: staffDept,
        isDeptAdmin: false,
        adminDepartment: staffDept,
        isMasterAdmin: false,
      };
      await StaffUser.findOneAndUpdate({ id: safeId }, staffData, { upsert: true, new: true });

      if (validRecord && !validRecord.department && staffDept) {
        validRecord.department = staffDept;
        await validRecord.save();
      }
    }

    // Also save to legacy User collection for backup
    const staffDeptBackup = req.body.department || validRecord.department || "";
    await User.findOneAndUpdate(
      { id: safeId },
      { ...baseUserData, role: userRole, school: validRecord.school || "", department: validRecord.school || "", program: validRecord.program || "", staffDepartment: staffDeptBackup, adminDepartment: staffDeptBackup },
      { upsert: true, new: true }
    );

    // 📱 Send Phone OTP via Innuvis API
    if (phone) {
      await sendSms(phone, phoneOtp);
    }

    // 📧 Send Email OTP
    if (email) {
      await sendEmailOtp(email, emailOtp);
    }

    // 🔐 Log OTP prominently in terminal
    if (global.logOTP) global.logOTP("REGISTRATION", email, emailOtp, phoneOtp);
    
    res.status(200).json({ message: `Verification codes sent to ${phone} and ${email}` });

  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// =================================================
// 2️⃣ VERIFY REGISTRATION (DUAL CHECK) - UPDATED FOR SEPARATED DATA
// =================================================
export const verifyRegistration = async (req, res) => {
  try {
    const { email, otpEmail, otpPhone } = req.body;

    // Find user in StudentUser or StaffUser
    let user = await StudentUser.findOne({ email });
    let isStudent = true;

    if (!user) {
      user = await StaffUser.findOne({ email });
      isStudent = false;
    }

    // Fallback to legacy User
    if (!user) {
      user = await User.findOne({ email });
      isStudent = null; // Unknown, use legacy
    }

    if (!user) return res.status(400).json({ message: "User not found" });

    // Validate Phone OTP
    if (user.phoneOtp !== otpPhone || user.phoneOtpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired Phone OTP" });
    }

    // Validate Email OTP
    if (user.otp !== otpEmail || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired Email OTP" });
    }

    // ✅ Success - Update verification status
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    user.phoneOtp = undefined;
    user.phoneOtpExpires = undefined;
    await user.save();

    // Also update legacy User collection for sync
    await User.findOneAndUpdate(
      { email },
      { isVerified: true, otp: undefined, otpExpires: undefined, phoneOtp: undefined, phoneOtpExpires: undefined }
    );

    res.status(200).json({ message: "Account verified successfully! You can now login." });

  } catch (err) {
    console.error("Verification Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// =================================================
// 3️⃣ LOGIN USER - STEP 1 (Credentials -> 2FA) - UPDATED FOR SEPARATED DATA
// =================================================
export const loginUser = async (req, res) => {
  try {
    const { id, password, role } = req.body;
    if (!id || !password) {
      return res.status(400).json({ message: "User ID and password are required" });
    }
    const safeId = id.toString().trim().toUpperCase();
    const userRole = role ? role.toLowerCase().trim() : null;

    // Find user based on role or search collections in parallel
    let user = null;
    let isStudent = false;

    if (userRole === "student") {
      user = await StudentUser.findOne({ id: safeId });
      isStudent = true;
    } else if (userRole === "staff" || userRole === "admin") {
      user = await StaffUser.findOne({ id: safeId });
      isStudent = false;
    } else {
      // Role not specified: query Student and Staff collections in parallel for speed
      const [studentUser, staffUser] = await Promise.all([
        StudentUser.findOne({ id: safeId }),
        StaffUser.findOne({ id: safeId })
      ]);
      if (studentUser) {
        user = studentUser;
        isStudent = true;
      } else if (staffUser) {
        user = staffUser;
        isStudent = false;
      }
    }

    // Fallback to legacy User collection
    if (!user) {
      user = await User.findOne({ id: safeId });
      if (user && user.role === "student") isStudent = true;
    }

    if (!user) return res.status(400).json({ message: "User not found" });

    if (!user.isVerified) return res.status(403).json({ message: "Account not verified" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid password" });

    const userAdminDepts = Array.isArray(user.adminDepartments) && user.adminDepartments.length > 0
      ? user.adminDepartments
      : (user.adminDepartment ? [user.adminDepartment] : []);

    // Generate Token with appropriate role info
    const tokenPayload = {
      id: user.id,
      role: isStudent ? "student" : (user.role || "staff"),
      isDeptAdmin: user.isDeptAdmin || false,
      adminDepartment: user.adminDepartment || userAdminDepts[0] || "",
      adminDepartments: userAdminDepts,
      isMasterAdmin: user.isMasterAdmin || false
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || "fallback_secret_key_123",
      { expiresIn: "7d" }
    );

    // Response Data
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        role: isStudent ? "student" : (user.role || "staff"),
        fullName: user.fullName,
        isDeptAdmin: user.isDeptAdmin || false,
        adminDepartment: user.adminDepartment || userAdminDepts[0] || "",
        adminDepartments: userAdminDepts,
        isMasterAdmin: user.isMasterAdmin || false,
        school: user.school || "",
        program: user.program || "",
        department: (isStudent ? (user.school || user.department || user.program) : (user.staffDepartment || user.adminDepartment)) || ""
      },
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// =================================================
// 4️⃣ LOGIN USER - STEP 2 (Verify OTP -> Token) - UPDATED FOR SEPARATED DATA
// =================================================
export const verifyLogin = async (req, res) => {
  try {
    const { id, otp, role } = req.body;
    if (!id || !otp) {
      return res.status(400).json({ message: "User ID and OTP are required" });
    }
    const safeId = id.toString().trim().toUpperCase();
    const userRole = role ? role.toLowerCase().trim() : null;

    // Find user based on role or search collections in parallel
    let user = null;
    let isStudent = false;

    if (userRole === "student") {
      user = await StudentUser.findOne({ id: safeId });
      isStudent = true;
    } else if (userRole === "staff" || userRole === "admin") {
      user = await StaffUser.findOne({ id: safeId });
      isStudent = false;
    } else {
      const [studentUser, staffUser] = await Promise.all([
        StudentUser.findOne({ id: safeId }),
        StaffUser.findOne({ id: safeId })
      ]);
      if (studentUser) {
        user = studentUser;
        isStudent = true;
      } else if (staffUser) {
        user = staffUser;
        isStudent = false;
      }
    }

    // Fallback to legacy User collection
    if (!user) {
      user = await User.findOne({ id: safeId });
      if (user && user.role === "student") isStudent = true;
    }

    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired Login OTP" });
    }

    // Clear OTP
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const userAdminDepts = Array.isArray(user.adminDepartments) && user.adminDepartments.length > 0
      ? user.adminDepartments
      : (user.adminDepartment ? [user.adminDepartment] : []);

    // Generate Token with appropriate role info
    const tokenPayload = {
      id: user.id,
      role: isStudent ? "student" : (user.role || "staff"),
      isDeptAdmin: user.isDeptAdmin || false,
      adminDepartment: user.adminDepartment || userAdminDepts[0] || "",
      adminDepartments: userAdminDepts,
      isMasterAdmin: user.isMasterAdmin || false
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || "fallback_secret_key_123",
      { expiresIn: "7d" }
    );

    // Response Data
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        role: isStudent ? "student" : (user.role || "staff"),
        fullName: user.fullName,
        isDeptAdmin: user.isDeptAdmin || false,
        adminDepartment: user.adminDepartment || userAdminDepts[0] || "",
        adminDepartments: userAdminDepts,
        isMasterAdmin: user.isMasterAdmin || false,
        school: user.school || "",
        program: user.program || "",
        department: (isStudent ? (user.school || user.department || user.program) : (user.staffDepartment || user.adminDepartment)) || ""
      },
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// =================================================
// 5️⃣ FORGOT PASSWORD (ID + Phone -> SMS OTP) - UPDATED FOR SEPARATED DATA
// =================================================
export const forgotPassword = async (req, res) => {
  try {
    const { id, phone } = req.body;
    const safeId = id.toString().trim().toUpperCase();
    const safePhone = phone.toString().trim();

    // Find user in StudentUser or StaffUser
    let user = await StudentUser.findOne({ id: safeId, phone: safePhone });
    if (!user) {
      user = await StaffUser.findOne({ id: safeId, phone: safePhone });
    }
    // Fallback to legacy User
    if (!user) {
      user = await User.findOne({ id: safeId, phone: safePhone });
    }

    if (!user) {
      return res.status(404).json({ message: "No user found with this ID and Phone combination." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP before storing
    const hashedOtp = await bcrypt.hash(otp, 10);

    user.resetOtp = hashedOtp;
    user.resetOtpExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save();

    // 🔐 Log OTP prominently in terminal
    if (global.logOTP) global.logOTP("PASSWORD RESET", safePhone, otp);

    // Send SMS
    await sendSms(safePhone, otp);

    res.json({ message: `Password reset OTP sent to ${safePhone}` });

  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

// =================================================
// 6️⃣ RESET PASSWORD (Verify OTP -> New Password) - UPDATED FOR SEPARATED DATA
// =================================================
export const resetPassword = async (req, res) => {
  try {
    const { id, otp, newPassword } = req.body;
    const safeId = id.toString().trim().toUpperCase();

    // Find user in StudentUser or StaffUser with valid OTP
    let user = await StudentUser.findOne({
      id: safeId,
      resetOtpExpires: { $gt: Date.now() }
    });

    if (!user) {
      user = await StaffUser.findOne({
        id: safeId,
        resetOtpExpires: { $gt: Date.now() }
      });
    }

    // Fallback to legacy User
    if (!user) {
      user = await User.findOne({
        id: safeId,
        resetOtpExpires: { $gt: Date.now() }
      });
    }

    if (!user) {
      return res.status(400).json({ message: "OTP expired or invalid user." });
    }

    const isOtpValid = await bcrypt.compare(otp, user.resetOtp);
    if (!isOtpValid) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOtp = undefined;
    user.resetOtpExpires = undefined;
    await user.save();

    // Also update in legacy User collection
    await User.findOneAndUpdate(
      { id: safeId },
      { password: hashedPassword, resetOtp: undefined, resetOtpExpires: undefined }
    );

    res.json({ message: "✅ Password reset successfully. You can now login." });

  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Password reset failed" });
  }
};

// =================================================
// 7️⃣ GET USER PROFILE
// =================================================
export const getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id?.toString().trim().toUpperCase();
    let user = await StaffUser.findOne({ id: userId });
    let isStaffOrAdmin = true;

    if (!user) {
      user = await StudentUser.findOne({ id: userId });
      isStaffOrAdmin = false;
    }
    if (!user) {
      user = await User.findOne({ id: userId });
      isStaffOrAdmin = user?.role !== "student";
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let dept = "";
    let studentSchool = "";
    let studentProgram = "";

    if (!isStaffOrAdmin) {
      const studentRec = await StudentRecord.findOne({ id: userId });
      studentSchool = user.school || studentRec?.school || "";
      studentProgram = user.program || studentRec?.program || "";
      dept = studentSchool || studentProgram || "";
    } else if (user.isMasterAdmin) {
      dept = user.adminDepartment || user.staffDepartment || "Super Admin";
    } else {
      dept = user.adminDepartment || user.staffDepartment || "";
    }

    res.json({
      id: user.id,
      fullName: user.fullName || "",
      email: user.email || "",
      phone: user.phone || "",
      role: isStaffOrAdmin ? (user.role || "staff") : "student",
      school: studentSchool,
      program: studentProgram,
      department: dept,
      adminDepartment: user.adminDepartment || "",
      staffDepartment: user.staffDepartment || "",
      isDeptAdmin: user.isDeptAdmin || false,
      isMasterAdmin: user.isMasterAdmin || false,
    });
  } catch (err) {
    console.error("Get Profile Error:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

// =================================================
// 8️⃣ UPDATE USER PROFILE (Name, Department)
// =================================================
export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id?.toString().trim().toUpperCase();
    const { fullName, department } = req.body;

    let user = await StaffUser.findOne({ id: userId });
    let isStudent = false;

    if (!user) {
      user = await StudentUser.findOne({ id: userId });
      isStudent = true;
    }
    if (!user) {
      user = await User.findOne({ id: userId });
      isStudent = user?.role === "student";
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update Full Name
    if (fullName && fullName.trim()) {
      user.fullName = fullName.trim();
    }

    // Department handling: department should not be changed once saved at registration
    let newDept = "";
    if (user.isMasterAdmin) {
      // Super admin department: default to "Super Admin" or as selected
      newDept = department?.trim() || user.adminDepartment || user.staffDepartment || "Super Admin";
      user.adminDepartment = newDept;
      user.staffDepartment = newDept;
    } else if (!isStudent && department !== undefined) {
      const existingDept = (user.staffDepartment || user.adminDepartment || "").trim();
      // Department should NOT be changed once saved at registration
      if (!existingDept || existingDept.toLowerCase() === "general") {
        newDept = department.trim();
        user.staffDepartment = newDept;
        user.adminDepartment = newDept;
      } else {
        // Keep existing registered department intact
        newDept = existingDept;
      }
    }

    await user.save();

    // Sync with User model
    const userUpdate = {};
    if (fullName && fullName.trim()) userUpdate.fullName = fullName.trim();
    if (newDept) {
      userUpdate.staffDepartment = newDept;
      userUpdate.adminDepartment = newDept;
    }
    await User.findOneAndUpdate({ id: userId }, { $set: userUpdate });

    // Sync with StaffRecord
    if (!isStudent) {
      const staffRecordUpdate = {};
      if (fullName && fullName.trim()) staffRecordUpdate.fullName = fullName.trim();
      if (newDept) staffRecordUpdate.department = newDept;
      await StaffRecord.findOneAndUpdate({ id: userId }, { $set: staffRecordUpdate });
    }

    // Generate updated JWT token so client session stays updated
    const tokenPayload = {
      id: user.id,
      role: user.role || (isStudent ? "student" : "staff"),
      isDeptAdmin: user.isDeptAdmin || false,
      adminDepartment: user.adminDepartment || newDept || "",
      isMasterAdmin: user.isMasterAdmin || false,
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || "fallback_secret_key_123",
      { expiresIn: "7d" }
    );

    res.json({
      message: "Profile updated successfully",
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: newDept || user.adminDepartment || user.staffDepartment || (user.isMasterAdmin ? "Super Admin" : ""),
        adminDepartment: user.adminDepartment || newDept || "",
        staffDepartment: user.staffDepartment || newDept || "",
        isDeptAdmin: user.isDeptAdmin || false,
        isMasterAdmin: user.isMasterAdmin || false,
      },
    });
  } catch (err) {
    console.error("Update Profile Error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};

// =================================================
// 9️⃣ REQUEST EMAIL UPDATE OTP
// =================================================
export const requestEmailOtp = async (req, res) => {
  try {
    const userId = req.user.id?.toString().trim().toUpperCase();
    const { newEmail } = req.body;

    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(400).json({ message: "Please provide a valid email address." });
    }

    const cleanEmail = newEmail.toLowerCase().trim();

    // Check if email is already in use by another user
    const existing = await StaffUser.findOne({ email: cleanEmail, id: { $ne: userId } }) ||
                     await StudentUser.findOne({ email: cleanEmail, id: { $ne: userId } }) ||
                     await User.findOne({ email: cleanEmail, id: { $ne: userId } });

    if (existing) {
      return res.status(400).json({ message: "This email address is already registered to another account." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000;

    let user = await StaffUser.findOne({ id: userId }) ||
               await StudentUser.findOne({ id: userId }) ||
               await User.findOne({ id: userId });

    if (!user) return res.status(404).json({ message: "User not found." });

    user.pendingEmail = cleanEmail;
    user.pendingEmailOtp = otp;
    user.pendingEmailOtpExpires = expires;
    await user.save();

    await User.findOneAndUpdate({ id: userId }, {
      pendingEmail: cleanEmail,
      pendingEmailOtp: otp,
      pendingEmailOtpExpires: expires,
    });

    await sendEmailOtp(cleanEmail, otp);
    if (global.logOTP) global.logOTP("PROFILE_EMAIL_UPDATE", cleanEmail, otp);

    res.json({ message: `Verification code sent to ${cleanEmail}` });
  } catch (err) {
    console.error("Request Email OTP Error:", err);
    res.status(500).json({ message: "Failed to send email verification OTP." });
  }
};

// =================================================
// 🔟 VERIFY EMAIL UPDATE OTP
// =================================================
export const verifyEmailOtp = async (req, res) => {
  try {
    const userId = req.user.id?.toString().trim().toUpperCase();
    const { newEmail, otp } = req.body;

    const cleanEmail = newEmail?.toLowerCase().trim();

    let user = await StaffUser.findOne({ id: userId }) ||
               await StudentUser.findOne({ id: userId }) ||
               await User.findOne({ id: userId });

    if (!user) return res.status(404).json({ message: "User not found." });

    if (!user.pendingEmail || user.pendingEmail !== cleanEmail) {
      return res.status(400).json({ message: "Pending email mismatch. Please request a new OTP." });
    }

    if (user.pendingEmailOtp !== otp || user.pendingEmailOtpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired verification code." });
    }

    user.email = cleanEmail;
    user.pendingEmail = undefined;
    user.pendingEmailOtp = undefined;
    user.pendingEmailOtpExpires = undefined;
    await user.save();

    await User.findOneAndUpdate({ id: userId }, {
      email: cleanEmail,
      pendingEmail: undefined,
      pendingEmailOtp: undefined,
      pendingEmailOtpExpires: undefined,
    });

    await StaffRecord.findOneAndUpdate({ id: userId }, { email: cleanEmail });
    await StudentRecord.findOneAndUpdate({ id: userId }, { email: cleanEmail });

    // Refresh JWT
    const tokenPayload = {
      id: user.id,
      role: user.role,
      isDeptAdmin: user.isDeptAdmin || false,
      adminDepartment: user.adminDepartment || "",
      isMasterAdmin: user.isMasterAdmin || false,
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || "fallback_secret_key_123",
      { expiresIn: "7d" }
    );

    res.json({
      message: "Email address verified and updated successfully!",
      email: cleanEmail,
      token,
    });
  } catch (err) {
    console.error("Verify Email OTP Error:", err);
    res.status(500).json({ message: "Failed to verify email OTP." });
  }
};

// =================================================
// 1️⃣1️⃣ REQUEST PHONE UPDATE OTP
// =================================================
export const requestPhoneOtp = async (req, res) => {
  try {
    const userId = req.user.id?.toString().trim().toUpperCase();
    const { newPhone } = req.body;

    const cleanPhone = newPhone?.toString().trim();
    if (!cleanPhone || !/^\d{10}$/.test(cleanPhone)) {
      return res.status(400).json({ message: "Please provide a valid 10-digit mobile number." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = Date.now() + 10 * 60 * 1000;

    let user = await StaffUser.findOne({ id: userId }) ||
               await StudentUser.findOne({ id: userId }) ||
               await User.findOne({ id: userId });

    if (!user) return res.status(404).json({ message: "User not found." });

    user.pendingPhone = cleanPhone;
    user.pendingPhoneOtp = otp;
    user.pendingPhoneOtpExpires = expires;
    await user.save();

    await User.findOneAndUpdate({ id: userId }, {
      pendingPhone: cleanPhone,
      pendingPhoneOtp: otp,
      pendingPhoneOtpExpires: expires,
    });

    await sendSms(cleanPhone, otp, `Dear User, Your One-Time Password (OTP) for updating your phone number on the CT University Grievance Portal is: ${otp} - CTU Support Team`);
    if (global.logOTP) global.logOTP("PROFILE_PHONE_UPDATE", user.email, null, otp);

    res.json({ message: `Verification code sent to ${cleanPhone}` });
  } catch (err) {
    console.error("Request Phone OTP Error:", err);
    res.status(500).json({ message: "Failed to send SMS verification OTP." });
  }
};

// =================================================
// 1️⃣2️⃣ VERIFY PHONE UPDATE OTP
// =================================================
export const verifyPhoneOtp = async (req, res) => {
  try {
    const userId = req.user.id?.toString().trim().toUpperCase();
    const { newPhone, otp } = req.body;

    const cleanPhone = newPhone?.toString().trim();

    let user = await StaffUser.findOne({ id: userId }) ||
               await StudentUser.findOne({ id: userId }) ||
               await User.findOne({ id: userId });

    if (!user) return res.status(404).json({ message: "User not found." });

    if (!user.pendingPhone || user.pendingPhone !== cleanPhone) {
      return res.status(400).json({ message: "Pending phone mismatch. Please request a new OTP." });
    }

    if (user.pendingPhoneOtp !== otp || user.pendingPhoneOtpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired verification code." });
    }

    user.phone = cleanPhone;
    user.pendingPhone = undefined;
    user.pendingPhoneOtp = undefined;
    user.pendingPhoneOtpExpires = undefined;
    await user.save();

    await User.findOneAndUpdate({ id: userId }, {
      phone: cleanPhone,
      pendingPhone: undefined,
      pendingPhoneOtp: undefined,
      pendingPhoneOtpExpires: undefined,
    });

    await StaffRecord.findOneAndUpdate({ id: userId }, { phone: cleanPhone });
    await StudentRecord.findOneAndUpdate({ id: userId }, { phone: cleanPhone });

    res.json({
      message: "Phone number verified and updated successfully!",
      phone: cleanPhone,
    });
  } catch (err) {
    console.error("Verify Phone OTP Error:", err);
    res.status(500).json({ message: "Failed to verify phone OTP." });
  }
};

