import StudentUser from "../models/StudentUser.js";
import StaffUser from "../models/StaffUser.js";
import User from "../models/UserModel.js";
import AdminStaffModel from "../models/AdminStaffModel.js";
import Grievance from "../models/GrievanceModel.js";
import Department from "../models/Department.js";

// =========================================================================
// 1️⃣ GET LIVE REGISTERED STUDENTS
// =========================================================================
export const getLiveStudents = async (req, res) => {
  try {
    const { search = "", status = "registered", page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;

    // Strict condition: A user is considered a registered student ONLY IF their OTP has been verified
    const verifiedCondition = {
      isVerified: true,
      $or: [{ otp: { $exists: false } }, { otp: null }, { otp: "" }]
    };
    const pendingCondition = {
      $or: [
        { isVerified: false },
        { otp: { $exists: true, $ne: null, $ne: "" } }
      ]
    };

    // Build query filter
    const query = {};

    // "registered" (default) or "verified" means strictly OTP-verified students
    if (status === "registered" || status === "verified") {
      Object.assign(query, verifiedCondition);
    } else if (status === "pending" || status === "incomplete") {
      Object.assign(query, pendingCondition);
    }
    // if status === "all", query both

    if (search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, "i");
      const searchOr = [
        { id: regex },
        { fullName: regex },
        { email: regex },
        { phone: regex },
        { program: regex },
        { studentType: regex }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const total = await StudentUser.countDocuments(query);
    const rawStudents = await StudentUser.find(query)
      .select("-password -phoneOtp -resetOtp") // retain otp presence check
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    // Format output students and compute OTP status flag (without revealing secret OTP code)
    const students = rawStudents.map(s => {
      const sObj = s.toObject();
      const hasPendingOtp = !sObj.isVerified || !!(sObj.otp && sObj.otp.trim() !== "");
      sObj.otpPending = hasPendingOtp;
      sObj.isOtpVerified = !hasPendingOtp && sObj.isVerified === true;
      delete sObj.otp; // never leak secret OTP to frontend
      return sObj;
    });

    // Counts: Total truly registered (OTP verified) vs Incomplete/Pending OTP
    const [totalRegistered, totalPending] = await Promise.all([
      StudentUser.countDocuments(verifiedCondition),
      StudentUser.countDocuments(pendingCondition)
    ]);

    res.status(200).json({
      total,
      totalRegistered,
      totalVerified: totalRegistered,
      totalPending,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      students
    });
  } catch (err) {
    console.error("Error fetching live students:", err);
    res.status(500).json({ message: "Failed to fetch live registered students", error: err.message });
  }
};

// =========================================================================
// 2️⃣ UPDATE LIVE REGISTERED STUDENT
// =========================================================================
export const updateLiveStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const safeId = id.toString().trim().toUpperCase();
    const { fullName, email, phone, program, studentType, isVerified } = req.body;

    const student = await StudentUser.findOne({ id: safeId });
    if (!student) {
      return res.status(404).json({ message: `Student with ID ${safeId} not found.` });
    }

    // Check email uniqueness if email changed
    if (email && email.toLowerCase().trim() !== student.email.toLowerCase()) {
      const cleanEmail = email.toLowerCase().trim();
      const existing = await StudentUser.findOne({ email: cleanEmail, id: { $ne: safeId } }) ||
                       await User.findOne({ email: cleanEmail, id: { $ne: safeId } });
      if (existing) {
        return res.status(400).json({ message: `Email ${cleanEmail} is already used by another account.` });
      }
      student.email = cleanEmail;
    }

    if (fullName !== undefined) student.fullName = fullName.trim();
    if (phone !== undefined) student.phone = phone.trim();
    if (program !== undefined) student.program = program.trim();
    if (studentType !== undefined) student.studentType = studentType.trim();

    if (isVerified !== undefined) {
      const isTryingToVerify = !!isVerified;
      const hasPendingOtp = !!(student.otp && student.otp.trim() !== "") || student.isVerified === false;
      if (isTryingToVerify && hasPendingOtp && !student.isVerified) {
        return res.status(400).json({
          message: "Cannot mark student as verified because registration OTP is still pending. The student must verify the OTP sent to their email/phone."
        });
      }
      student.isVerified = isTryingToVerify;
    }

    await student.save();

    // Sync to legacy UserModel
    const syncData = {
      fullName: student.fullName,
      email: student.email,
      phone: student.phone,
      program: student.program,
      studentType: student.studentType,
      isVerified: student.isVerified
    };
    await User.findOneAndUpdate({ id: safeId }, { $set: syncData });

    res.status(200).json({
      message: `✅ Student ${safeId} updated successfully.`,
      student
    });
  } catch (err) {
    console.error("Error updating live student:", err);
    res.status(500).json({ message: "Failed to update student", error: err.message });
  }
};

// =========================================================================
// 3️⃣ DELETE LIVE REGISTERED STUDENT
// =========================================================================
export const deleteLiveStudent = async (req, res) => {
  try {
    const { id } = req.params;
    const safeId = id.toString().trim().toUpperCase();

    const student = await StudentUser.findOne({ id: safeId });
    if (!student) {
      return res.status(404).json({ message: `Student with ID ${safeId} not found.` });
    }

    // Delete from StudentUser and User
    await Promise.all([
      StudentUser.deleteOne({ id: safeId }),
      User.deleteOne({ id: safeId })
    ]);

    res.status(200).json({
      message: `✅ Registered student (${safeId} - ${student.fullName || "Student"}) deleted successfully.`
    });
  } catch (err) {
    console.error("Error deleting live student:", err);
    res.status(500).json({ message: "Failed to delete student", error: err.message });
  }
};

// =========================================================================
// 4️⃣ GET LIVE REGISTERED STAFF / FACULTY
// =========================================================================
export const getLiveStaff = async (req, res) => {
  try {
    const { search = "", department = "all", role = "all", status = "registered", page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;

    // Strict condition: A user is considered registered staff ONLY IF their OTP has been verified
    const verifiedCondition = {
      isVerified: true,
      $or: [{ otp: { $exists: false } }, { otp: null }, { otp: "" }]
    };
    const pendingCondition = {
      $or: [
        { isVerified: false },
        { otp: { $exists: true, $ne: null, $ne: "" } }
      ]
    };

    const query = {};

    if (status === "registered" || status === "verified") {
      Object.assign(query, verifiedCondition);
    } else if (status === "pending" || status === "incomplete") {
      Object.assign(query, pendingCondition);
    }

    if (department !== "all") {
      query.$or = [
        { staffDepartment: department },
        { adminDepartment: department }
      ];
    }

    if (role === "admin") {
      const roleFilter = [{ role: "admin" }, { isDeptAdmin: true }, { isMasterAdmin: true }];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: roleFilter }];
        delete query.$or;
      } else {
        query.$or = roleFilter;
      }
    } else if (role === "staff") {
      query.role = "staff";
      query.isDeptAdmin = { $ne: true };
      query.isMasterAdmin = { $ne: true };
    }

    if (search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, "i");
      const searchConditions = [
        { id: regex },
        { fullName: regex },
        { email: regex },
        { phone: regex },
        { staffDepartment: regex },
        { adminDepartment: regex }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchConditions }];
        delete query.$or;
      } else if (query.$and) {
        query.$and.push({ $or: searchConditions });
      } else {
        query.$or = searchConditions;
      }
    }

    const rawStaff = await StaffUser.find(query)
      .select("-password -phoneOtp -resetOtp") // retain otp presence check
      .sort({ createdAt: -1 });

    // Also pull admin records from AdminStaffModel to attach live roles
    const adminRecords = await AdminStaffModel.find({});
    const adminMap = new Map(adminRecords.map(a => [a.id, a]));

    const enriched = rawStaff.map(s => {
      const sObj = s.toObject();
      const adminRec = adminMap.get(s.id);
      if (adminRec) {
        sObj.adminDepartment = adminRec.adminDepartment || sObj.adminDepartment || "";
        sObj.isDeptAdmin = adminRec.isDeptAdmin !== undefined ? adminRec.isDeptAdmin : sObj.isDeptAdmin;
      }
      const hasPendingOtp = !sObj.isVerified || !!(sObj.otp && sObj.otp.trim() !== "");
      sObj.otpPending = hasPendingOtp;
      sObj.isOtpVerified = !hasPendingOtp && sObj.isVerified === true;
      delete sObj.otp; // never leak secret OTP to frontend
      return sObj;
    });

    const total = enriched.length;
    const paginated = enriched.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    // Count strictly verified staff and fetch all unique departments
    const [totalRegistered, totalPending, totalAdmins, totalRegularStaff, deptDocs, staffDepts, adminDepts] = await Promise.all([
      StaffUser.countDocuments(verifiedCondition),
      StaffUser.countDocuments(pendingCondition),
      StaffUser.countDocuments({ ...verifiedCondition, $or: [{ role: "admin" }, { isDeptAdmin: true }, { isMasterAdmin: true }] }),
      StaffUser.countDocuments({ ...verifiedCondition, role: "staff", isDeptAdmin: { $ne: true }, isMasterAdmin: { $ne: true } }),
      Department.find({ isActive: true }).select("name").sort({ name: 1 }),
      StaffUser.distinct("staffDepartment"),
      StaffUser.distinct("adminDepartment")
    ]);

    const allDeptsSet = new Set();
    if (Array.isArray(deptDocs)) {
      deptDocs.forEach(d => { if (d.name && d.name.trim()) allDeptsSet.add(d.name.trim()); });
    }
    if (Array.isArray(staffDepts)) {
      staffDepts.forEach(d => { if (d && d.trim()) allDeptsSet.add(d.trim()); });
    }
    if (Array.isArray(adminDepts)) {
      adminDepts.forEach(d => { if (d && d.trim()) allDeptsSet.add(d.trim()); });
    }

    const departments = Array.from(allDeptsSet).sort((a, b) => a.localeCompare(b));

    res.status(200).json({
      total,
      totalRegistered,
      totalVerified: totalRegistered,
      totalPending,
      totalAdmins,
      totalRegularStaff,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      departments,
      staff: paginated
    });
  } catch (err) {
    console.error("Error fetching live staff:", err);
    res.status(500).json({ message: "Failed to fetch live staff", error: err.message });
  }
};

// =========================================================================
// 5️⃣ UPDATE LIVE REGISTERED STAFF
// =========================================================================
export const updateLiveStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const safeId = id.toString().trim().toUpperCase();
    const { fullName, email, phone, department, role, isDeptAdmin, isVerified } = req.body;

    const staff = await StaffUser.findOne({ id: safeId });
    if (!staff) {
      return res.status(404).json({ message: `Staff member with ID ${safeId} not found.` });
    }

    // Protection: Master Admin ID 10001 cannot be altered into regular staff
    if (safeId === "10001" || staff.isMasterAdmin) {
      if (role && role !== "admin") {
        return res.status(403).json({ message: "Master Admin role cannot be modified." });
      }
    }

    // Check email uniqueness if email changed
    if (email && email.toLowerCase().trim() !== staff.email.toLowerCase()) {
      const cleanEmail = email.toLowerCase().trim();
      const existing = await StaffUser.findOne({ email: cleanEmail, id: { $ne: safeId } }) ||
                       await User.findOne({ email: cleanEmail, id: { $ne: safeId } });
      if (existing) {
        return res.status(400).json({ message: `Email ${cleanEmail} is already in use by another account.` });
      }
      staff.email = cleanEmail;
    }

    if (fullName !== undefined) staff.fullName = fullName.trim();
    if (phone !== undefined) staff.phone = phone.trim();
    if (department !== undefined) {
      staff.staffDepartment = department.trim();
      staff.adminDepartment = department.trim();
    }
    if (role !== undefined) staff.role = role.trim();
    if (isDeptAdmin !== undefined && safeId !== "10001") staff.isDeptAdmin = !!isDeptAdmin;

    if (isVerified !== undefined) {
      const isTryingToVerify = !!isVerified;
      const hasPendingOtp = !!(staff.otp && staff.otp.trim() !== "") || staff.isVerified === false;
      if (isTryingToVerify && hasPendingOtp && !staff.isVerified) {
        return res.status(400).json({
          message: "Cannot mark staff member as verified because registration OTP is still pending. The staff member must verify the OTP sent to their email/phone."
        });
      }
      staff.isVerified = isTryingToVerify;
    }

    await staff.save();

    // Sync to UserModel
    const userSync = {
      fullName: staff.fullName,
      email: staff.email,
      phone: staff.phone,
      department: staff.staffDepartment,
      adminDepartment: staff.adminDepartment,
      role: staff.role,
      isDeptAdmin: staff.isDeptAdmin,
      isVerified: staff.isVerified
    };
    await User.findOneAndUpdate({ id: safeId }, { $set: userSync });

    // Sync to AdminStaffModel if present or promoting
    if (staff.isDeptAdmin || staff.role === "admin") {
      await AdminStaffModel.findOneAndUpdate(
        { id: safeId },
        {
          id: safeId,
          fullName: staff.fullName,
          adminDepartment: staff.adminDepartment,
          isDeptAdmin: staff.isDeptAdmin
        },
        { upsert: true, new: true }
      );
    } else {
      // If demoted to regular staff, update AdminStaffModel
      await AdminStaffModel.findOneAndUpdate(
        { id: safeId },
        { isDeptAdmin: false, adminDepartment: staff.staffDepartment }
      );
    }

    res.status(200).json({
      message: `✅ Staff member ${safeId} (${staff.fullName}) updated successfully.`,
      staff
    });
  } catch (err) {
    console.error("Error updating live staff:", err);
    res.status(500).json({ message: "Failed to update staff member", error: err.message });
  }
};

// =========================================================================
// 6️⃣ DELETE LIVE REGISTERED STAFF
// =========================================================================
export const deleteLiveStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const safeId = id.toString().trim().toUpperCase();

    // Protection: Never delete Master Admin
    if (safeId === "10001") {
      return res.status(403).json({ message: "❌ Deletion of the Master Admin account is strictly prohibited." });
    }

    const staff = await StaffUser.findOne({ id: safeId });
    if (!staff) {
      return res.status(404).json({ message: `Staff member with ID ${safeId} not found.` });
    }

    if (staff.isMasterAdmin) {
      return res.status(403).json({ message: "❌ Master Admin accounts cannot be deleted." });
    }

    const staffName = staff.fullName || safeId;

    // 🔥 Safety: Reset all assigned grievances so they are not orphaned
    const grievanceResetResult = await Grievance.updateMany(
      {
        $or: [
          { assignedTo: safeId },
          { assignedTo: staffName }
        ]
      },
      {
        $set: {
          status: "Pending",
          assignedTo: null
        }
      }
    );

    const resetCount = grievanceResetResult.modifiedCount || 0;
    console.log(`🔄 Reset ${resetCount} grievances previously assigned to deleted staff ${safeId}.`);

    // Remove from all 3 collections
    await Promise.all([
      StaffUser.deleteOne({ id: safeId }),
      User.deleteOne({ id: safeId }),
      AdminStaffModel.deleteOne({ id: safeId })
    ]);

    res.status(200).json({
      message: `✅ Staff member ${staffName} (${safeId}) has been deleted successfully.`,
      resetGrievancesCount: resetCount
    });
  } catch (err) {
    console.error("Error deleting live staff:", err);
    res.status(500).json({ message: "Failed to delete staff member", error: err.message });
  }
};
