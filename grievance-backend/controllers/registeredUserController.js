import StudentUser from "../models/StudentUser.js";
import StaffUser from "../models/StaffUser.js";
import User from "../models/UserModel.js";
import AdminStaffModel from "../models/AdminStaffModel.js";
import Grievance from "../models/GrievanceModel.js";
import Department from "../models/Department.js";
import StudentRecord from "../models/StudentRecord.js";
import StaffRecord from "../models/StaffRecord.js";
import xlsx from "xlsx";
import jwt from "jsonwebtoken";
import { logAuditAction } from "../utils/AuditService.js";
import { syncSingleStudentRegistration, syncSingleStaffRegistration } from "../utils/registrationSyncService.js";

// =========================================================================
// 1️⃣ GET LIVE REGISTERED STUDENTS
// =========================================================================
export const getLiveStudents = async (req, res) => {
  try {
    const { search = "", status = "registered", page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;

    const rawDeptParam = req.query.departments || req.query.department || req.query.school || req.query.schools || "all";
    let selectedDepartments = [];
    if (Array.isArray(rawDeptParam)) {
      selectedDepartments = rawDeptParam.map(d => String(d).trim()).filter(d => d && d !== "all");
    } else if (typeof rawDeptParam === "string" && rawDeptParam.trim() !== "all" && rawDeptParam.trim() !== "") {
      selectedDepartments = rawDeptParam.split(",").map(d => d.trim()).filter(d => d && d !== "all");
    }

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

    const andConditions = [];

    // "registered" (default) or "verified" means strictly OTP-verified students
    if (status === "registered" || status === "verified") {
      andConditions.push(verifiedCondition);
    } else if (status === "pending" || status === "incomplete") {
      andConditions.push(pendingCondition);
    }
    // if status === "all", query both

    if (selectedDepartments.length > 0) {
      const schoolOrConditions = selectedDepartments.map(d => {
        const cleanDept = d.toString().trim();
        const escaped = cleanDept.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = escaped
          .replace(/\s*(?:&|and)\s*/gi, "\\s*(?:&|and)\\s*")
          .replace(/\s+/g, "\\s+");
        const regexPattern = new RegExp(`^${pattern}$`, "i");
        return {
          $or: [
            { school: { $regex: regexPattern } },
            { department: { $regex: regexPattern } },
            { program: { $regex: regexPattern } }
          ]
        };
      });
      andConditions.push({ $or: schoolOrConditions });
    }

    if (search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, "i");
      andConditions.push({
        $or: [
          { id: regex },
          { ctuId: regex },
          { fullName: regex },
          { email: regex },
          { phone: regex },
          { school: regex },
          { department: regex },
          { program: regex },
          { studentType: regex }
        ]
      });
    }

    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    const total = await StudentUser.countDocuments(query);
    const rawStudents = await StudentUser.find(query)
      .select("-password -phoneOtp -resetOtp") // retain otp presence check
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    // Format output students and enrich school/ctuId from StudentRecord if needed
    const studentIds = rawStudents.map(s => s.id).filter(Boolean);
    const relatedRecords = await StudentRecord.find({ id: { $in: studentIds } }).select("id school ctuId");
    const recordMap = new Map(relatedRecords.map(r => [r.id, r]));

    const students = rawStudents.map(s => {
      const sObj = s.toObject();
      const matchedRecord = recordMap.get(sObj.id);

      // Resolve school (fallback to StudentRecord if empty or 'xyz')
      if ((!sObj.school || sObj.school.toLowerCase() === "xyz") && matchedRecord?.school) {
        sObj.school = matchedRecord.school;
      }
      if (!sObj.school && sObj.department) {
        sObj.school = sObj.department;
      }

      if (!sObj.ctuId && matchedRecord?.ctuId) {
        sObj.ctuId = matchedRecord.ctuId;
      }
      if (!sObj.ctuId) {
        sObj.ctuId = sObj.id;
      }

      const hasPendingOtp = !sObj.isVerified || !!(sObj.otp && sObj.otp.trim() !== "");
      sObj.otpPending = hasPendingOtp;
      sObj.isOtpVerified = !hasPendingOtp && sObj.isVerified === true;
      delete sObj.otp; // never leak secret OTP to frontend
      return sObj;
    });

    // Counts: Total truly registered (OTP verified) vs Incomplete/Pending OTP
    const [totalRegistered, totalPending, schools, officialDepts] = await Promise.all([
      StudentUser.countDocuments(verifiedCondition),
      StudentUser.countDocuments(pendingCondition),
      StudentRecord.distinct("school"),
      Department.find({ isActive: true }).select("name").sort({ name: 1 })
    ]);

    const normKey = (n) => (n || "").toLowerCase().replace(/\s*&\s*/g, " and ").replace(/\s+/g, " ").trim();
    const officialMap = new Map();
    if (Array.isArray(officialDepts)) {
      officialDepts.forEach(d => {
        const c = (d.name || "").replace(/\s+/g, " ").trim();
        if (c) officialMap.set(normKey(c), c);
      });
    }

    const compMap = new Map();
    if (Array.isArray(schools)) {
      schools.forEach(d => {
        const c = (d || "").replace(/\s+/g, " ").trim();
        if (c && !/^\d+$/.test(c)) {
          const k = normKey(c);
          if (!compMap.has(k)) {
            if (officialMap.has(k)) {
              compMap.set(k, officialMap.get(k));
            } else {
              const titleCased = c.replace(
                /\w\S*/g,
                (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
              );
              compMap.set(k, titleCased);
            }
          }
        }
      });
    }
    const cleanSchools = Array.from(compMap.values()).sort((a, b) => a.localeCompare(b));

    const isExport = req.query.isExport || req.query.export;
    if (isExport === "true" || isExport === true || isExport === "preview" || req.query.preview === "true") {
      const allMatching = await StudentUser.find(query)
        .select("-password -phoneOtp -resetOtp")
        .sort({ createdAt: -1 });

      const allIds = allMatching.map(s => s.id).filter(Boolean);
      const allRelatedRecords = await StudentRecord.find({ id: { $in: allIds } }).select("id school ctuId");
      const allRecordMap = new Map(allRelatedRecords.map(r => [r.id, r]));

      const exportData = allMatching.map((s, idx) => {
        const sObj = s.toObject ? s.toObject() : s;
        const matched = allRecordMap.get(sObj.id);
        const resolvedSchool = (sObj.school && sObj.school.toLowerCase() !== "xyz") ? sObj.school : (matched?.school || sObj.department || "");
        const hasPendingOtp = !sObj.isVerified || !!(sObj.otp && sObj.otp.trim() !== "");
        const isOtpVerified = !hasPendingOtp && sObj.isVerified === true;
        return {
          "S.No": idx + 1,
          "CTU ID": sObj.ctuId || matched?.ctuId || sObj.id || "",
          "Student ID": sObj.id || "",
          "Full Name": sObj.fullName || "",
          "Email": sObj.email || "",
          "Phone": sObj.phone || "",
          "School": resolvedSchool,
          "Program": sObj.program || "",
          "Batch": sObj.batch || "",
          "Student Type": sObj.studentType || "Regular",
          "Status": isOtpVerified ? "VERIFIED" : "PENDING OTP",
          "Registered On": sObj.createdAt ? new Date(sObj.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"
        };
      });

      if (isExport === "preview" || req.query.preview === "true") {
        return res.json({
          success: true,
          type: "live_students",
          count: exportData.length,
          records: exportData,
          departments: cleanSchools
        });
      }

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(exportData);
      xlsx.utils.book_append_sheet(wb, ws, "Registered_Students");
      const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Disposition", `attachment; filename="Registered_Students_${status}_${new Date().toISOString().split("T")[0]}.xlsx"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      return res.send(buffer);
    }

    res.status(200).json({
      total,
      totalRegistered,
      totalVerified: totalRegistered,
      totalPending,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      departments: cleanSchools,
      students
    });
  } catch (err) {
    console.error("Error in getLiveStudents:", err);
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
    const { fullName, email, phone, school, program, studentType, isVerified, ctuId } = req.body;

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
    if (school !== undefined) {
      student.school = school.trim();
      student.department = school.trim();
    }
    if (program !== undefined) student.program = program.trim();
    if (studentType !== undefined) student.studentType = studentType.trim();
    if (ctuId !== undefined) student.ctuId = ctuId.trim().toUpperCase();

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
      school: student.school,
      department: student.school,
      program: student.program,
      studentType: student.studentType,
      isVerified: student.isVerified
    };
    await User.findOneAndUpdate({ id: safeId }, { $set: syncData });

    // Sync to StudentRecord if exists
    await StudentRecord.updateOne(
      { id: safeId },
      {
        $set: {
          fullName: student.fullName,
          email: student.email,
          phone: student.phone,
          ...(school !== undefined ? { school: student.school } : {}),
          ...(program !== undefined ? { program: student.program } : {}),
          ...(studentType !== undefined ? { studentType: student.studentType } : {}),
          ...(ctuId !== undefined ? { ctuId: student.ctuId } : {})
        }
      }
    );

    await logAuditAction("UPDATE", "StudentRecord", req.user, {
      recordId: safeId,
      accountType: "Registered Live Student",
      fullName: student.fullName,
      changes: syncData
    });

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

    // 🔥 Sync registration status to StudentRecord immediately
    await syncSingleStudentRegistration(student, false);
    invalidateComparisonCache();

    await logAuditAction("DELETE", "StudentRecord", req.user, {
      recordId: safeId,
      accountType: "Registered Live Student",
      fullName: student.fullName || "Student",
      email: student.email
    });

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
    const { search = "", department = "all", role = "all", status = "registered", staffType = "all", page = 1, limit = 50 } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;

    let requesterId = "";
    if (req.user && req.user.id) {
      requesterId = String(req.user.id).trim().toUpperCase();
    } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_fallback_secret_key_12345");
        requesterId = String(decoded.id || "").trim().toUpperCase();
      } catch (e) {}
    }

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

    // Hide 10001 from anyone whose ID is NOT 10001
    if (requesterId !== "10001") {
      query.id = { $ne: "10001" };
    }

    if (status === "registered" || status === "verified") {
      Object.assign(query, verifiedCondition);
    } else if (status === "pending" || status === "incomplete") {
      Object.assign(query, pendingCondition);
    }

    if (department && department !== "all") {
      const cleanDept = department.toString().trim();
      const escaped = cleanDept.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = escaped
        .replace(/\s*(?:&|and)\s*/gi, "\\s*(?:&|and)\\s*")
        .replace(/\s+/g, "\\s+");
      const deptRegex = new RegExp(`^${pattern}$`, "i");

      const deptCondition = [
        { staffDepartment: { $regex: deptRegex } },
        { adminDepartment: { $regex: deptRegex } }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: deptCondition }];
        delete query.$or;
      } else {
        query.$or = deptCondition;
      }
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

    // Also pull admin records and staff records for complete role/staffType enrichment
    const [adminRecords, staffRecords] = await Promise.all([
      AdminStaffModel.find({}),
      StaffRecord.find({}).select("id staffType department").lean()
    ]);
    const adminMap = new Map(adminRecords.map(a => [a.id, a]));
    const staffRecordTypeMap = new Map(staffRecords.map(r => [r.id ? r.id.toUpperCase() : "", r.staffType]));

    let enriched = rawStaff.map(s => {
      const sObj = s.toObject();
      const sUpperId = sObj.id ? sObj.id.toUpperCase() : "";
      const adminRec = adminMap.get(s.id);
      if (adminRec) {
        sObj.adminDepartment = adminRec.adminDepartment || sObj.adminDepartment || "";
        sObj.isDeptAdmin = adminRec.isDeptAdmin !== undefined ? adminRec.isDeptAdmin : sObj.isDeptAdmin;
      }
      sObj.staffType = sObj.staffType || staffRecordTypeMap.get(sUpperId) || "Non-Teaching";
      const hasPendingOtp = !sObj.isVerified || !!(sObj.otp && sObj.otp.trim() !== "");
      sObj.otpPending = hasPendingOtp;
      sObj.isOtpVerified = !hasPendingOtp && sObj.isVerified === true;
      delete sObj.otp; // never leak secret OTP to frontend
      return sObj;
    });

    // Calculate verified teaching vs non-teaching counts across ALL registered staff
    let totalTeaching = 0;
    let totalNonTeaching = 0;
    enriched.forEach(s => {
      if (s.isOtpVerified) {
        if (s.staffType === "Teaching") totalTeaching++;
        else totalNonTeaching++;
      }
    });

    // Filter by staffType if requested ("teaching" vs "non-teaching")
    const cleanStaffType = (staffType || "all").toString().toLowerCase().trim();
    if (cleanStaffType === "teaching") {
      enriched = enriched.filter(s => s.staffType === "Teaching");
    } else if (cleanStaffType === "non-teaching" || cleanStaffType === "non_teaching" || cleanStaffType === "admin") {
      enriched = enriched.filter(s => s.staffType !== "Teaching");
    }

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

    // Dynamic deduplication: canonicalize against official departments without hardcoding
    const normalizeKey = (n) => (n || "").toLowerCase().replace(/\s*&\s*/g, " and ").replace(/\s+/g, " ").trim();
    const deptCanonicalMap = new Map();
    if (Array.isArray(deptDocs)) {
      deptDocs.forEach(d => {
        const cleanName = (d.name || "").replace(/\s+/g, " ").trim();
        if (cleanName) {
          const k = normalizeKey(cleanName);
          if (!deptCanonicalMap.has(k)) deptCanonicalMap.set(k, cleanName);
        }
      });
    }

    const allDeptsMap = new Map();
    const candidateDepts = [...(staffDepts || []), ...(adminDepts || [])];
    candidateDepts.forEach(d => {
      const cleanName = (d || "").replace(/\s+/g, " ").trim();
      if (cleanName && !/^\d+$/.test(cleanName)) { // Ignore purely numeric ones
        const k = normalizeKey(cleanName);
        if (!allDeptsMap.has(k)) {
          if (deptCanonicalMap.has(k)) {
            allDeptsMap.set(k, deptCanonicalMap.get(k));
          } else {
            // Title case it because it's not in official depts
            const titleCased = cleanName.replace(
              /\w\S*/g,
              (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
            );
            allDeptsMap.set(k, titleCased);
          }
        }
      }
    });

    const departments = Array.from(allDeptsMap.values()).sort((a, b) => a.localeCompare(b));

    const isExport = req.query.isExport || req.query.export;
    if (isExport === "true" || isExport === true || isExport === "preview" || req.query.preview === "true") {
      const exportData = enriched.map((s, idx) => {
        let authorityRole = "Staff Member";
        if (s.isMasterAdmin) authorityRole = "Master Admin";
        else if (s.isDeptAdmin) authorityRole = "Dept Admin";
        else if (s.role === "admin") authorityRole = "Admin";

        return {
          "S.No": idx + 1,
          "Staff ID": s.id || "",
          "Full Name": s.fullName || "",
          "Category": s.staffType || "Non-Teaching",
          "Email": s.email || "",
          "Phone": s.phone || "",
          "Department": s.staffDepartment || s.adminDepartment || s.department || "",
          "Role & Authority": authorityRole,
          "Status": s.isOtpVerified ? "VERIFIED" : "PENDING OTP",
          "Joined Date": s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"
        };
      });

      if (isExport === "preview" || req.query.preview === "true") {
        return res.status(200).json({
          success: true,
          type: "live_staff",
          count: exportData.length,
          records: exportData,
          departments
        });
      }

      const wb = xlsx.utils.book_new();
      const ws = xlsx.utils.json_to_sheet(exportData);
      xlsx.utils.book_append_sheet(wb, ws, "Registered_Staff");
      const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

      res.setHeader("Content-Disposition", `attachment; filename="Registered_Staff_${status}_${new Date().toISOString().split("T")[0]}.xlsx"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      return res.send(buffer);
    }

    res.status(200).json({
      total,
      totalRegistered,
      totalVerified: totalRegistered,
      totalPending,
      totalAdmins,
      totalRegularStaff,
      totalTeaching,
      totalNonTeaching,
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
    const { fullName, email, phone, department, role, isDeptAdmin, isVerified, staffType } = req.body;

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
      if (staff.isDeptAdmin) {
        staff.adminDepartment = department.trim();
      }
    }
    if (role !== undefined) staff.role = role.trim();
    if (staffType !== undefined && (staffType === "Teaching" || staffType === "Non-Teaching")) {
      staff.staffType = staffType;
      await StaffRecord.updateOne({ id: safeId }, { $set: { staffType } });
    }
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
      staffDepartment: staff.staffDepartment,
      adminDepartment: staff.adminDepartment,
      role: staff.role,
      staffType: staff.staffType || "Non-Teaching",
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
      // If regular staff, remove from AdminStaffModel so they are strictly general staff
      await AdminStaffModel.deleteOne({ id: safeId });
    }

    // 🔥 Sync registration status to StaffRecord immediately
    await syncSingleStaffRegistration(staff, staff.isVerified);
    invalidateComparisonCache();

    await logAuditAction("UPDATE", "StaffRecord", req.user, {
      recordId: safeId,
      accountType: "Registered Live Staff",
      fullName: staff.fullName,
      changes: userSync
    });

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

    // 🔥 Sync registration status to StaffRecord immediately
    await syncSingleStaffRegistration(staff, false);
    invalidateComparisonCache();

    await logAuditAction("DELETE", "StaffRecord", req.user, {
      recordId: safeId,
      accountType: "Registered Live Staff",
      fullName: staffName,
      resetGrievancesCount: resetCount
    });

    res.status(200).json({
      message: `✅ Staff member ${staffName} (${safeId}) has been deleted successfully.`,
      resetGrievancesCount: resetCount
    });
  } catch (err) {
    console.error("Error deleting live staff:", err);
    res.status(500).json({ message: "Failed to delete staff member", error: err.message });
  }
};

// =========================================================================
// CACHING UTILITIES FOR COMPARISON (Zero-Lag Cohort Audits)
// =========================================================================
let cachedStudentsData = null;
let cachedStudentsTimestamp = 0;
let cachedStaffData = null;
let cachedStaffTimestamp = 0;
let cachedSchools = null;
let cachedSchoolsTimestamp = 0;
let cachedDepts = null;
let cachedDeptsTimestamp = 0;

const USER_CACHE_TTL = 30 * 1000; // 30 seconds
const DROPDOWN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const invalidateComparisonCache = () => {
  cachedStudentsData = null;
  cachedStudentsTimestamp = 0;
  cachedStaffData = null;
  cachedStaffTimestamp = 0;
  cachedSchools = null;
  cachedSchoolsTimestamp = 0;
  cachedDepts = null;
  cachedDeptsTimestamp = 0;
};

const getRegisteredStudentsData = async () => {
  const now = Date.now();
  if (cachedStudentsData && (now - cachedStudentsTimestamp < USER_CACHE_TTL)) {
    return cachedStudentsData;
  }

  const verifiedCondition = {
    isVerified: true,
    $or: [{ otp: { $exists: false } }, { otp: null }, { otp: "" }]
  };

  const registeredStudents = await StudentUser.find(verifiedCondition)
    .select("id ctuId fullName email phone createdAt updatedAt isVerified")
    .lean();

  const registeredMap = new Map();
  const registeredIdsSet = new Set();
  const registeredEmailsSet = new Set();

  for (const u of registeredStudents) {
    if (u.id) {
      const raw = String(u.id).trim();
      if (raw) {
        registeredMap.set(raw.toUpperCase(), u);
        registeredIdsSet.add(raw);
        registeredIdsSet.add(raw.toUpperCase());
        registeredIdsSet.add(raw.toLowerCase());
      }
    }
    if (u.ctuId) {
      const raw = String(u.ctuId).trim();
      if (raw) {
        registeredMap.set(raw.toUpperCase(), u);
        registeredIdsSet.add(raw);
        registeredIdsSet.add(raw.toUpperCase());
        registeredIdsSet.add(raw.toLowerCase());
      }
    }
    if (u.email) {
      const cleanEmail = String(u.email).trim().toLowerCase();
      if (cleanEmail) {
        registeredMap.set(cleanEmail, u);
        registeredEmailsSet.add(cleanEmail);
      }
    }
  }

  const studentRegisteredCondition = { isRegistered: true };
  const studentNotRegisteredCondition = { isRegistered: false };

  cachedStudentsData = {
    registeredMap,
    studentRegisteredCondition,
    studentNotRegisteredCondition
  };
  cachedStudentsTimestamp = now;
  return cachedStudentsData;
};

const getRegisteredStaffData = async () => {
  const now = Date.now();
  if (cachedStaffData && (now - cachedStaffTimestamp < USER_CACHE_TTL)) {
    return cachedStaffData;
  }

  const verifiedCondition = {
    isVerified: true,
    $or: [{ otp: { $exists: false } }, { otp: null }, { otp: "" }]
  };

  const registeredStaff = await StaffUser.find(verifiedCondition)
    .select("id fullName email phone role staffDepartment adminDepartment isDeptAdmin isMasterAdmin createdAt updatedAt isVerified")
    .lean();

  const registeredMap = new Map();
  for (const u of registeredStaff) {
    if (u.id) {
      const raw = String(u.id).trim();
      if (raw) {
        registeredMap.set(raw.toUpperCase(), u);
      }
    }
    if (u.email) {
      const cleanEmail = String(u.email).trim().toLowerCase();
      if (cleanEmail) {
        registeredMap.set(cleanEmail, u);
      }
    }
  }

  const staffRegisteredCondition = { isRegistered: true };
  const staffNotRegisteredCondition = { isRegistered: false };

  cachedStaffData = {
    registeredMap,
    staffRegisteredCondition,
    staffNotRegisteredCondition
  };
  cachedStaffTimestamp = now;
  return cachedStaffData;
};

const getCleanSchools = async () => {
  const now = Date.now();
  if (cachedSchools && (now - cachedSchoolsTimestamp < DROPDOWN_CACHE_TTL)) {
    return cachedSchools;
  }
  const [schools, officialDepts] = await Promise.all([
    StudentRecord.distinct("school"),
    Department.find({ isActive: true }).select("name").sort({ name: 1 })
  ]);
  const normKey = (n) => (n || "").toLowerCase().replace(/\s*&\s*/g, " and ").replace(/\s+/g, " ").trim();
  const officialMap = new Map();
  if (Array.isArray(officialDepts)) {
    officialDepts.forEach(d => {
      const c = (d.name || "").replace(/\s+/g, " ").trim();
      if (c) officialMap.set(normKey(c), c);
    });
  }
  const compMap = new Map();
  if (Array.isArray(schools)) {
    schools.forEach(d => {
      const c = (d || "").replace(/\s+/g, " ").trim();
      if (c && !/^\d+$/.test(c)) {
        const k = normKey(c);
        if (!compMap.has(k)) {
          if (officialMap.has(k)) {
            compMap.set(k, officialMap.get(k));
          } else {
            const titleCased = c.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
            compMap.set(k, titleCased);
          }
        }
      }
    });
  }
  cachedSchools = Array.from(compMap.values()).sort((a, b) => a.localeCompare(b));
  cachedSchoolsTimestamp = now;
  return cachedSchools;
};

const getCleanDepartments = async () => {
  const now = Date.now();
  if (cachedDepts && (now - cachedDeptsTimestamp < DROPDOWN_CACHE_TTL)) {
    return cachedDepts;
  }
  const [allDistinctDepts, officialDepts] = await Promise.all([
    StaffRecord.distinct("department"),
    Department.find({ isActive: true }).select("name").sort({ name: 1 })
  ]);
  const normKey = (n) => (n || "").toLowerCase().replace(/\s*&\s*/g, " and ").replace(/\s+/g, " ").trim();
  const officialMap = new Map();
  if (Array.isArray(officialDepts)) {
    officialDepts.forEach(d => {
      const c = (d.name || "").replace(/\s+/g, " ").trim();
      if (c) officialMap.set(normKey(c), c);
    });
  }
  const compMap = new Map();
  if (Array.isArray(allDistinctDepts)) {
    allDistinctDepts.forEach(d => {
      const c = (d || "").replace(/\s+/g, " ").trim();
      if (c && !/^\d+$/.test(c)) {
        const k = normKey(c);
        if (!compMap.has(k)) {
          if (officialMap.has(k)) {
            compMap.set(k, officialMap.get(k));
          } else {
            const titleCased = c.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
            compMap.set(k, titleCased);
          }
        }
      }
    });
  }
  cachedDepts = Array.from(compMap.values()).sort((a, b) => a.localeCompare(b));
  cachedDeptsTimestamp = now;
  return cachedDepts;
};

// =========================================================================
// 7️⃣ COMPARE RECORDS VS REGISTERED USERS (Students or Staff)
// =========================================================================
export const getRecordsComparison = async (req, res) => {
  try {
    // Disable HTTP caching on comparison data so cohort switching is always fresh and never 304-stale
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");

    const {
      type = "students", // "students" | "staff"
      status = "all", // "all" | "registered" | "not_registered"
      search = "",
      department = "all",
      staffType = "all", // "all" | "Teaching" | "Non-Teaching"
      page = 1,
      limit = 50,
      export: isExport = "false"
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(200, Math.max(10, parseInt(limit, 10) || 50));
    const reqType = (type || "").toString().trim().toLowerCase();
    const isStudents = reqType === "students" || reqType === "student";

    const rawDeptParam = req.query.departments || req.query.department || "all";
    let selectedDepartments = [];
    if (Array.isArray(rawDeptParam)) {
      selectedDepartments = rawDeptParam.map(d => String(d).trim()).filter(d => d && d !== "all");
    } else if (typeof rawDeptParam === "string" && rawDeptParam.trim() !== "all" && rawDeptParam.trim() !== "") {
      selectedDepartments = rawDeptParam.split(",").map(d => d.trim()).filter(d => d && d !== "all");
    }

    if (isStudents) {
      // 1️⃣ Fetch cached registered students mapping
      const {
        registeredMap,
        studentRegisteredCondition,
        studentNotRegisteredCondition
      } = await getRegisteredStudentsData();

      // Context conditions (department/school + search)
      const contextConditions = [];

      if (selectedDepartments.length > 0) {
        const schoolOrConditions = selectedDepartments.map(cleanDept => {
          const escaped = cleanDept.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const pattern = escaped
            .replace(/\s*(?:&|and)\s*/gi, "\\s*(?:&|and)\\s*")
            .replace(/\s+/g, "\\s+");
          const regexPattern = new RegExp(`^${pattern}$`, "i");
          return {
            $or: [
              { school: { $regex: regexPattern } },
              { program: { $regex: regexPattern } }
            ]
          };
        });
        contextConditions.push({ $or: schoolOrConditions });
      }

      if (search && search.trim()) {
        const q = search.trim();
        const regex = new RegExp(q, "i");
        contextConditions.push({
          $or: [
            { id: regex },
            { ctuId: regex },
            { fullName: regex },
            { email: regex },
            { phone: regex },
            { school: regex },
            { program: regex },
            { batch: regex },
            { studentType: regex }
          ]
        });
      }

      const baseContextQuery = contextConditions.length > 0 ? { $and: contextConditions } : {};
      const registeredContextQuery = contextConditions.length > 0
        ? { $and: [...contextConditions, studentRegisteredCondition] }
        : studentRegisteredCondition;

      // Dynamic counts and clean schools in parallel
      const [totalRecords, totalRegistered, cleanSchools] = await Promise.all([
        StudentRecord.countDocuments(baseContextQuery),
        StudentRecord.countDocuments(registeredContextQuery),
        getCleanSchools()
      ]);
      const totalNotRegistered = Math.max(0, totalRecords - totalRegistered);
      const registrationRate = totalRecords > 0 ? `${((totalRegistered / totalRecords) * 100).toFixed(1)}%` : "0%";

      // Final query including status filter
      const finalConditions = [...contextConditions];
      if (status === "registered") {
        finalConditions.push(studentRegisteredCondition);
      } else if (status === "not_registered") {
        finalConditions.push(studentNotRegisteredCondition);
      }
      const finalQuery = finalConditions.length > 0 ? { $and: finalConditions } : {};

      // Export to Excel / Preview
      if (isExport === "true" || isExport === true || isExport === "preview" || req.query.preview === "true") {
        const allMatching = await StudentRecord.find(finalQuery).sort({ id: 1 }).lean();
        const exportData = allMatching.map((rec, idx) => {
          const recId = rec.id ? String(rec.id).trim().toUpperCase() : "";
          const recCtu = rec.ctuId ? String(rec.ctuId).trim().toUpperCase() : "";
          const recEmail = rec.email ? String(rec.email).trim().toLowerCase() : "";
          const regInfo = (recId && registeredMap.get(recId)) ||
                          (recCtu && registeredMap.get(recCtu)) ||
                          (recEmail && registeredMap.get(recEmail)) ||
                          null;
          return {
            "S.No": idx + 1,
            "Student ID": rec.id || "",
            "CTU ID": rec.ctuId || "",
            "Full Name": rec.fullName || "",
            "Official Email": rec.email || "",
            "Official Phone": rec.phone || "",
            "School": rec.school || "",
            "Program": rec.program || "",
            "Batch": rec.batch || "",
            "Type": rec.studentType || "",
            "Portal Status": (rec.isRegistered === true || !!regInfo) ? "REGISTERED" : "NOT REGISTERED",
            "Registered Email": rec.registeredEmail || regInfo?.email || "—",
            "Registered Phone": rec.registeredPhone || regInfo?.phone || "—",
            "Registered On": (rec.registeredAt || regInfo?.createdAt) ? new Date(rec.registeredAt || regInfo.createdAt).toLocaleDateString("en-US") : "—"
          };
        });

        if (isExport === "preview" || req.query.preview === "true") {
          return res.json({
            success: true,
            type: "students",
            count: exportData.length,
            records: exportData,
            departments: cleanSchools
          });
        }

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(exportData);
        xlsx.utils.book_append_sheet(wb, ws, "Students_Comparison");
        const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

        res.setHeader("Content-Disposition", `attachment; filename="Students_Comparison_${status}_${new Date().toISOString().split("T")[0]}.xlsx"`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return res.send(buffer);
      }

      // Mathematical totalFiltered without duplicate countDocuments query
      const totalFiltered = status === "registered" ? totalRegistered : status === "not_registered" ? totalNotRegistered : totalRecords;
      const rawRecords = await StudentRecord.find(finalQuery)
        .sort({ createdAt: -1, id: 1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean();

      const records = rawRecords.map(rec => {
        const recId = rec.id ? String(rec.id).trim().toUpperCase() : "";
        const recCtu = rec.ctuId ? String(rec.ctuId).trim().toUpperCase() : "";
        const recEmail = rec.email ? String(rec.email).trim().toLowerCase() : "";
        const regInfo = (recId && registeredMap.get(recId)) ||
                        (recCtu && registeredMap.get(recCtu)) ||
                        (recEmail && registeredMap.get(recEmail)) ||
                        null;
        return {
          ...rec,
          isRegistered: rec.isRegistered === true || !!regInfo,
          registeredAt: rec.registeredAt || regInfo?.createdAt || null,
          registeredEmail: rec.registeredEmail || regInfo?.email || null,
          registeredPhone: rec.registeredPhone || regInfo?.phone || null
        };
      });

      return res.status(200).json({
        type: "students",
        statusFilter: status,
        total: totalFiltered,
        page: pageNum,
        totalPages: Math.ceil(totalFiltered / limitNum) || 1,
        summary: {
          totalRecords,
          totalRegistered,
          totalNotRegistered,
          registrationRate
        },
        departments: cleanSchools,
        records
      });
    } else {
      // 2️⃣ STAFF COMPARISON
      const {
        registeredMap,
        staffRegisteredCondition,
        staffNotRegisteredCondition
      } = await getRegisteredStaffData();

      // Context conditions (department + search)
      const deptSearchConditions = [];

      if (selectedDepartments.length > 0) {
        const staffDeptOrConditions = selectedDepartments.map(cleanDept => {
          const escaped = cleanDept.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const pattern = escaped
            .replace(/\s*(?:&|and)\s*/gi, "\\s*(?:&|and)\\s*")
            .replace(/\s+/g, "\\s+");
          return { department: { $regex: new RegExp(`^${pattern}$`, "i") } };
        });
        deptSearchConditions.push({ $or: staffDeptOrConditions });
      }

      if (search && search.trim()) {
        const q = search.trim();
        const regex = new RegExp(q, "i");
        deptSearchConditions.push({
          $or: [
            { id: regex },
            { fullName: regex },
            { email: regex },
            { phone: regex },
            { department: regex },
            { role: regex }
          ]
        });
      }

      // Category filter condition
      const cleanStaffType = (staffType || "all").toString().trim();
      let categoryCondition = null;
      if (cleanStaffType.toLowerCase() === "teaching") {
        categoryCondition = { staffType: "Teaching" };
      } else if (cleanStaffType.toLowerCase() === "non-teaching" || cleanStaffType.toLowerCase() === "non_teaching") {
        categoryCondition = { staffType: { $ne: "Teaching" } };
      }

      // Dynamic counts for Category pills (Teaching vs Non-Teaching within active department & search)
      const teachingQuery = deptSearchConditions.length > 0
        ? { $and: [...deptSearchConditions, { staffType: "Teaching" }] }
        : { staffType: "Teaching" };

      const nonTeachingQuery = deptSearchConditions.length > 0
        ? { $and: [...deptSearchConditions, { staffType: { $ne: "Teaching" } }] }
        : { staffType: { $ne: "Teaching" } };

      // Active category scope
      const activeCategoryConditions = [...deptSearchConditions];
      if (categoryCondition) {
        activeCategoryConditions.push(categoryCondition);
      }
      const activeCategoryQuery = activeCategoryConditions.length > 0 ? { $and: activeCategoryConditions } : {};

      const registeredCategoryQuery = activeCategoryConditions.length > 0
        ? { $and: [...activeCategoryConditions, staffRegisteredCondition] }
        : staffRegisteredCondition;

      const [totalTeaching, totalNonTeaching, totalRecords, totalRegistered, cleanDepartments] = await Promise.all([
        StaffRecord.countDocuments(teachingQuery),
        StaffRecord.countDocuments(nonTeachingQuery),
        StaffRecord.countDocuments(activeCategoryQuery),
        StaffRecord.countDocuments(registeredCategoryQuery),
        getCleanDepartments()
      ]);
      const totalNotRegistered = Math.max(0, totalRecords - totalRegistered);
      const registrationRate = totalRecords > 0 ? `${((totalRegistered / totalRecords) * 100).toFixed(1)}%` : "0%";

      // Final query for staff table & export
      const finalStaffConditions = [...activeCategoryConditions];
      if (status === "registered") {
        finalStaffConditions.push(staffRegisteredCondition);
      } else if (status === "not_registered") {
        finalStaffConditions.push(staffNotRegisteredCondition);
      }
      const finalStaffQuery = finalStaffConditions.length > 0 ? { $and: finalStaffConditions } : {};

      if (isExport === "true" || isExport === true || isExport === "preview" || req.query.preview === "true") {
        const allMatching = await StaffRecord.find(finalStaffQuery).sort({ id: 1 }).lean();
        const exportData = allMatching.map((rec, idx) => {
          const recId = rec.id ? String(rec.id).trim().toUpperCase() : "";
          const recEmail = rec.email ? String(rec.email).trim().toLowerCase() : "";
          const regInfo = (recId && registeredMap.get(recId)) ||
                          (recEmail && registeredMap.get(recEmail)) ||
                          null;
          return {
            "S.No": idx + 1,
            "Staff ID": rec.id || "",
            "Full Name": rec.fullName || "",
            "Official Email": rec.email || "",
            "Official Phone": rec.phone || "",
            "Role": rec.role || "staff",
            "Staff Category": rec.staffType || "Non-Teaching",
            "Department": rec.department || "",
            "Portal Status": (rec.isRegistered === true || !!regInfo) ? "REGISTERED" : "NOT REGISTERED",
            "Portal Role": rec.registeredRole || regInfo?.role || (regInfo?.isDeptAdmin ? "Dept Admin" : "—"),
            "Registered Email": rec.registeredEmail || regInfo?.email || "—",
            "Registered Phone": rec.registeredPhone || regInfo?.phone || "—",
            "Registered On": (rec.registeredAt || regInfo?.createdAt) ? new Date(rec.registeredAt || regInfo.createdAt).toLocaleDateString("en-US") : "—"
          };
        });

        if (isExport === "preview" || req.query.preview === "true") {
          return res.json({
            success: true,
            type: "staff",
            count: exportData.length,
            records: exportData,
            departments: cleanDepartments
          });
        }

        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.json_to_sheet(exportData);
        xlsx.utils.book_append_sheet(wb, ws, "Staff_Comparison");
        const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

        res.setHeader("Content-Disposition", `attachment; filename="Staff_Comparison_${status}_${new Date().toISOString().split("T")[0]}.xlsx"`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        return res.send(buffer);
      }

      // Mathematical totalFiltered without duplicate countDocuments query
      const totalFiltered = status === "registered" ? totalRegistered : status === "not_registered" ? totalNotRegistered : totalRecords;
      const rawRecords = await StaffRecord.find(finalStaffQuery)
        .sort({ createdAt: -1, id: 1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .lean();

      const records = rawRecords.map(rec => {
        const recId = rec.id ? String(rec.id).trim().toUpperCase() : "";
        const recEmail = rec.email ? String(rec.email).trim().toLowerCase() : "";
        const regInfo = (recId && registeredMap.get(recId)) ||
                        (recEmail && registeredMap.get(recEmail)) ||
                        null;
        return {
          ...rec,
          isRegistered: rec.isRegistered === true || !!regInfo,
          registeredAt: rec.registeredAt || regInfo?.createdAt || null,
          registeredEmail: rec.registeredEmail || regInfo?.email || null,
          registeredPhone: rec.registeredPhone || regInfo?.phone || null,
          registeredRole: rec.registeredRole || regInfo?.role || (regInfo?.isDeptAdmin ? "dept_admin" : null)
        };
      });

      return res.status(200).json({
        type: "staff",
        statusFilter: status,
        staffTypeFilter: cleanStaffType,
        total: totalFiltered,
        page: pageNum,
        totalPages: Math.ceil(totalFiltered / limitNum) || 1,
        summary: {
          totalRecords,
          totalRegistered,
          totalNotRegistered,
          totalTeaching,
          totalNonTeaching,
          registrationRate
        },
        departments: cleanDepartments,
        records
      });
    }
  } catch (err) {
    console.error("Error in getRecordsComparison:", err);
    res.status(500).json({ message: "Failed to compare records vs registered accounts", error: err.message });
  }
};

