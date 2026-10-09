import Grievance from "../models/GrievanceModel.js";
import User from "../models/UserModel.js";
import StaffUser from "../models/StaffUser.js";
import StaffRecord from "../models/StaffRecord.js";
import IssueType from "../models/IssueType.js";
import SystemConfig from "../models/SystemConfig.js";
import StudentUser from "../models/StudentUser.js";
import StudentRecord from "../models/StudentRecord.js";
import nodemailer from "nodemailer";
import { autoAssignGrievance } from "./routingRuleController.js";
import {
  sendStaffRejectionNotificationToAdmin,
  sendGrievanceRejectionToStudent,
} from "../utils/emailService.js";

// 🔧 Helper to normalize department names for comparison (handles "&" vs "and", extra spaces, case)
export const normalizeDept = (dept) =>
  String(dept || "")
    .trim()
    .toLowerCase()
    .replace(/\s*(?:&|and)\s*/g, " and ")
    .replace(/\s+/g, " ");

export const isDeptMatch = (deptA, deptB) => {
  const normA = normalizeDept(deptA);
  const normB = normalizeDept(deptB);
  if (!normA || !normB) return false;
  return normA === normB || normA.includes(normB) || normB.includes(normA);
};

/* =====================================================
   1️⃣ STUDENT → SUBMIT GRIEVANCE
   → Goes to CATEGORY inbox (UNASSIGNED)
   → OR Auto-assigns if routing rule exists
===================================================== */
export const submitGrievance = async (req, res) => {
  try {
    // 🛠️ 0. MAINTENANCE MODE CHECK: Block incoming grievances when active
    const systemConfig = await SystemConfig.findOne({ key: "portal_settings" });
    if (systemConfig && systemConfig.isMaintenanceActive) {
      return res.status(503).json({
        message: systemConfig.maintenanceMessage || "The portal is currently under scheduled maintenance. Grievance submissions are paused.",
        isMaintenance: true,
        reason: systemConfig.maintenanceReason || "Scheduled Maintenance"
      });
    }

    const {
      userId,
      name,
      email,
      phone,
      regid,
      studentProgram,   // ✅ required
      category,         // ✅ ONLY routing key
      message,
      attachment,       // ✅ Extract attachment from JSON body
      issueTypeId,      // ✅ NEW: Issue type for auto-assignment
    } = req.body;

    // 🔒 Safety validation
    if (!studentProgram || !category) {
      return res.status(400).json({
        message: "Student program or category missing",
      });
    }

    // 🔥 SMART AUTO-ASSIGNMENT CHECK
    let assignedStaff = null;
    let assignmentMode = "manual";
    
    if (issueTypeId) {
      const autoAssignment = await autoAssignGrievance(issueTypeId, category);
      if (autoAssignment) {
        assignedStaff = autoAssignment;
        assignmentMode = autoAssignment.assignmentMode;
        console.log(`🤖 Auto-assigned grievance to ${assignedStaff.staffName} (${assignmentMode} mode)`);
      }
    }

    // Determine user type (student or staff)
    const isStaffSubmitter =
      req.body.userType === "staff" ||
      studentProgram === "Staff Member" ||
      studentProgram === "Admin Staff" ||
      (studentProgram && studentProgram.toLowerCase().includes("staff")) ||
      /^\d{5}$/.test(String(userId || "").trim());

    const resolvedUserType = isStaffSubmitter ? "staff" : (req.body.userType || "student");

    // ⏱️ 24-HOUR SINGLE GRIEVANCE LIMIT FOR STUDENTS
    if (resolvedUserType === "student" && userId) {
      const safeUserId = userId.toString().trim();
      const lastGrievance = await Grievance.findOne({
        userId: safeUserId,
        userType: { $ne: "staff" }
      }).sort({ createdAt: -1 });

      if (lastGrievance) {
        const lastSubmissionTime = new Date(lastGrievance.createdAt).getTime();
        const now = Date.now();
        const elapsedMs = now - lastSubmissionTime;
        const cooldownMs = 24 * 60 * 60 * 1000; // 24 hours

        if (elapsedMs < cooldownMs) {
          const remainingMs = cooldownMs - elapsedMs;
          const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
          const remainingMinutes = Math.ceil((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
          const nextAllowedAt = new Date(lastSubmissionTime + cooldownMs);

          return res.status(429).json({
            message: `You can only submit 1 grievance every 24 hours. Next submission available in ${remainingHours}h ${remainingMinutes}m.`,
            canSubmit: false,
            cooldownActive: true,
            remainingMs,
            remainingHours,
            remainingMinutes,
            nextAllowedAt,
            lastSubmissionAt: lastGrievance.createdAt
          });
        }
      }
    }

    const grievance = await Grievance.create({
      userId,
      userType: resolvedUserType,
      name,
      email,
      phone,
      regid,

      studentProgram,
      category,
      message: message || "",

      attachment: attachment || "", // ✅ Save the filename string

      issueTypeId: issueTypeId || null,
      assignmentMode: assignmentMode,

      // Assignment fields
      assignedTo: (assignedStaff && assignedStaff.staffId) ? assignedStaff.staffId : null,
      assignedRole: (assignedStaff && assignedStaff.staffId) ? "staff" : null,
      assignedBy: (assignedStaff && assignedStaff.staffId) ? "SYSTEM_AUTO" : null,
      deadlineDate: (assignedStaff && assignedStaff.staffId) ? calculateDeadline() : null,

      status: (assignedStaff && assignedStaff.staffId) ? "Assigned" : "Pending",

      // Inter-department tracking & Custody
      originatingDepartment: category,
      involvedDepartments: [category],
      involvedStaff: (assignedStaff && assignedStaff.staffId) ? [assignedStaff.staffId] : [],
      currentCustodian: {
        department: category,
        staffId: (assignedStaff && assignedStaff.staffId) ? assignedStaff.staffId : null,
        staffName: (assignedStaff && assignedStaff.staffName) ? assignedStaff.staffName : null,
        assignedAt: new Date(),
        role: (assignedStaff && assignedStaff.staffId) ? "staff" : "admin"
      }
    });

    // 📧 Send email notification to staff if auto-assigned
    if (assignedStaff && assignedStaff.staffId) {
      try {
        await sendAssignmentNotification(grievance, assignedStaff, true);
      } catch (emailError) {
        console.error("Email notification failed (non-blocking):", emailError.message);
        // Continue without failing the submission
      }
    }

    res.status(201).json({
      message: assignedStaff 
        ? "✅ Grievance submitted and auto-assigned successfully"
        : "✅ Grievance submitted successfully",
      grievance,
      autoAssigned: !!assignedStaff,
    });

  } catch (err) {
    console.error("Submit Error Details:", err);
    console.error("Error Stack:", err.stack);
    res.status(500).json({
      message: "Failed to submit grievance",
      error: err.message || "Unknown error"
    });
  }
};

// =====================================================
// ⏱️ CHECK 24-HOUR SUBMISSION LIMIT STATUS
// =====================================================
export const checkSubmissionLimit = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const safeUserId = userId.toString().trim();

    // Staff members and admin staff are exempt
    const isStaff = /^\d{5}$/.test(safeUserId);
    if (isStaff) {
      return res.status(200).json({
        canSubmit: true,
        cooldownActive: false,
        isExempt: true
      });
    }

    const lastGrievance = await Grievance.findOne({
      userId: safeUserId,
      userType: { $ne: "staff" }
    }).sort({ createdAt: -1 });

    if (!lastGrievance) {
      return res.status(200).json({
        canSubmit: true,
        cooldownActive: false
      });
    }

    const lastSubmissionTime = new Date(lastGrievance.createdAt).getTime();
    const now = Date.now();
    const elapsedMs = now - lastSubmissionTime;
    const cooldownMs = 24 * 60 * 60 * 1000; // 24 hours

    if (elapsedMs < cooldownMs) {
      const remainingMs = cooldownMs - elapsedMs;
      const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
      const remainingMinutes = Math.ceil((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
      const nextAllowedAt = new Date(lastSubmissionTime + cooldownMs);

      return res.status(200).json({
        canSubmit: false,
        cooldownActive: true,
        remainingMs,
        remainingHours,
        remainingMinutes,
        nextAllowedAt,
        lastSubmissionAt: lastGrievance.createdAt,
        message: `You can only submit 1 grievance every 24 hours. Next submission available in ${remainingHours}h ${remainingMinutes}m.`
      });
    }

    return res.status(200).json({
      canSubmit: true,
      cooldownActive: false,
      lastSubmissionAt: lastGrievance.createdAt
    });

  } catch (err) {
    console.error("Check submission limit error:", err);
    res.status(500).json({ message: "Failed to check submission limit" });
  }
};

// Helper: Calculate default deadline (7 days from now)
function calculateDeadline() {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 7);
  return deadline;
}

// Helper: Send assignment notification email to staff
async function sendAssignmentNotification(grievance, assignedStaff, isAuto = true) {
  try {
    const staffId = (assignedStaff && typeof assignedStaff === "object") 
      ? assignedStaff.staffId 
      : (grievance.assignedTo || assignedStaff);
    
    let staffName = (assignedStaff && typeof assignedStaff === "object" && assignedStaff.staffName) 
      ? assignedStaff.staffName 
      : (typeof assignedStaff === "string" ? assignedStaff : "Staff Member");
    
    let staffEmail = (assignedStaff && typeof assignedStaff === "object") 
      ? assignedStaff.staffEmail 
      : null;

    // Resolve staff email from database if not directly supplied
    if (!staffEmail && staffId) {
      const staff = await StaffUser.findOne({ id: staffId })
        || await User.findOne({ id: staffId })
        || await StaffRecord.findOne({ id: staffId });
      if (staff) {
        if (staff.email) staffEmail = staff.email;
        if (staff.fullName) staffName = staff.fullName;
      }
    }

    if (!staffEmail) {
      console.warn(`⚠️ Cannot send assignment notification: No email found for staff ID "${staffId}" (${staffName})`);
      return;
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const subject = isAuto 
      ? `🎯 New Grievance Auto-Assigned - ${grievance.category}`
      : `📋 New Grievance Assigned - ${grievance.category}`;
    const heading = isAuto 
      ? "🎯 New Grievance Auto-Assigned" 
      : "📋 New Grievance Assigned";
    const introText = isAuto
      ? "A new grievance has been automatically assigned to you:"
      : "A new grievance has been assigned to you by the department administrator:";

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: staffEmail, // ✅ Send to staff's email (NOT grievance.email which is student)
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <div style="background-color: #2563eb; padding: 20px; color: white;">
            <h2 style="margin: 0; font-size: 1.3rem;">${heading}</h2>
          </div>
          <div style="padding: 20px;">
            <p>Dear <strong>${staffName}</strong>,</p>
            <p>${introText}</p>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <p style="margin: 6px 0;"><strong>Grievance ID:</strong> #${grievance._id}</p>
              <p style="margin: 6px 0;"><strong>Category:</strong> ${grievance.category}</p>
              <p style="margin: 6px 0;"><strong>Student:</strong> ${grievance.name} (${grievance.userId || grievance.regid || 'N/A'})</p>
              <p style="margin: 6px 0;"><strong>Message:</strong> ${grievance.message || 'No description provided'}</p>
              <p style="margin: 6px 0;"><strong>Deadline:</strong> ${grievance.deadlineDate ? new Date(grievance.deadlineDate).toLocaleDateString() : 'N/A'}</p>
            </div>
            <p>Please log in to the portal to view and process this grievance.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #64748b; font-size: 0.9rem;">Best regards,<br><strong>CTU Grievance Portal Team</strong></p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Assignment notification sent to staff ${staffName} (${staffEmail})`);
  } catch (error) {
    console.error("⚠️ Failed to send assignment notification:", error);
  }
}

/* =====================================================
   🆕 POOL ACCEPT MODE: Get grievances available for acceptance
===================================================== */
export const getPoolAcceptGrievances = async (req, res) => {
  try {
    const { staffId, department } = req.query;
    if (!department) return res.json([]);

    const cleanDept = decodeURIComponent(department).trim();
    const deptRegex = new RegExp(`^${cleanDept}$`, "i");

    // Find all routing rules with pool_accept mode for this department
    const RoutingRule = (await import("../models/RoutingRule.js")).default;
    const routingRules = await RoutingRule.find({
      department: { $regex: deptRegex },
      assignmentMode: "pool_accept",
      isActive: true
    }).populate('issueTypeId');

    if (!routingRules || routingRules.length === 0) {
      return res.json([]);
    }

    // Filter rules relevant to this staff member (if staffId provided)
    const targetRules = staffId
      ? routingRules.filter(r => r.assignedStaff?.some(s => String(s.staffId).trim() === String(staffId).trim() && s.isAvailable))
      : routingRules;

    // Get all valid issue type IDs from routing rules
    const issueTypeIds = targetRules
      .map(r => r.issueTypeId?._id || r.issueTypeId)
      .filter(Boolean);

    if (issueTypeIds.length === 0) {
      return res.json([]);
    }

    // Find grievances with these issue types that are still Pending
    const grievances = await Grievance.find({
      category: { $regex: deptRegex },
      issueTypeId: { $in: issueTypeIds },
      status: "Pending",
      assignmentMode: "pool_accept"
    })
      .populate("issueTypeId", "issueName description")
      .sort({ createdAt: -1 });

    res.json(grievances);
  } catch (err) {
    console.error("Error fetching pool accept grievances:", err);
    res.status(500).json({ message: "Failed to fetch pool accept grievances" });
  }
};

/* =====================================================
   🆕 POOL ACCEPT MODE: Staff accepts grievance
===================================================== */
export const acceptGrievance = async (req, res) => {
  try {
    const { grievanceId } = req.params;
    const { staffId, staffName } = req.body;

    if (!staffId) {
      return res.status(400).json({ message: "Staff ID is required to accept" });
    }

    const grievance = await Grievance.findById(grievanceId);
    if (!grievance) {
      return res.status(404).json({ message: "Grievance not found" });
    }

    // Check if grievance is still available for acceptance
    if (grievance.status !== "Pending" || grievance.assignmentMode !== "pool_accept" || grievance.assignedTo) {
      return res.status(400).json({ message: "This grievance is no longer available in the pool (already accepted or resolved)." });
    }

    let resolvedName = staffName || "";
    if (!resolvedName) {
      const staffUser = await User.findOne({ id: staffId }) || await StaffUser.findOne({ id: staffId }) || await StaffRecord.findOne({ id: staffId });
      if (staffUser) resolvedName = staffUser.fullName || staffUser.name || staffId;
    }

    // Assign to staff
    grievance.assignedTo = staffId;
    grievance.assignedRole = "staff";
    grievance.assignedBy = "STAFF_ACCEPT";
    grievance.status = "Assigned";
    grievance.deadlineDate = calculateDeadline();
    grievance.currentCustodian = {
      department: grievance.category,
      staffId: staffId,
      staffName: resolvedName,
      assignedAt: new Date(),
      role: "staff"
    };

    if (!grievance.involvedStaff) grievance.involvedStaff = [];
    if (!grievance.involvedStaff.includes(staffId)) {
      grievance.involvedStaff.push(staffId);
    }

    await grievance.save();

    // Update staff pool load
    try {
      const StaffPool = (await import("../models/StaffPool.js")).default;
      await StaffPool.findOneAndUpdate(
        { staffId },
        { $inc: { currentLoad: 1 } }
      );
    } catch (_) {}

    res.json({ message: "Grievance accepted successfully", grievance });
  } catch (err) {
    console.error("Error accepting grievance:", err);
    res.status(500).json({ message: "Failed to accept grievance" });
  }
};


/* =====================================================
   2️⃣ MASTER ADMIN → SEE ALL GRIEVANCES
===================================================== */
export const getAllGrievances = async (req, res) => {
  try {
    // 🔍 Filter: Don't show if user has "soft deleted" it
    const userId = req.user ? req.user.id : null;
    const query = userId ? { hiddenFor: { $ne: userId } } : {};

    const grievances = await Grievance.find(query)
      .populate("issueTypeId", "issueName description")
      .populate("linkedGrievances", "category status currentCustodian assignedTo updatedAt")
      .sort({ createdAt: -1 });
    res.json(grievances);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch grievances" });
  }
};


/* =====================================================
   3️⃣ CATEGORY ADMIN → VIEW THEIR CATEGORY'S GRIEVANCES
   → Only grievances of THEIR category
===================================================== */
export const getCategoryGrievances = async (req, res) => {
  try {
    // Check for category in params (for /category/:category) or query (for /department/:department?category=)
    const category = req.params.category 
      ? decodeURIComponent(req.params.category).trim()
      : (req.query.category ? decodeURIComponent(req.query.category).trim() : null);
    
    const userId = req.user ? req.user.id : null;

    const grievances = await Grievance.find({
      category,
      hiddenFor: { $ne: userId } // 🔍 Filter hidden
    })
      .populate("issueTypeId", "issueName description")
      .populate("linkedGrievances", "category status currentCustodian assignedTo updatedAt")
      .sort({ createdAt: -1 });

    res.json(grievances);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch category grievances" });
  }
};

/* =====================================================
   🎓 GET GRIEVANCES SUBMITTED BY STUDENTS OF A SCHOOL
   → Allows Department / School HODs to monitor all complaints
     filed by their students across ANY category (Hostel, Accounts, Exam, etc.)
===================================================== */
export const getGrievancesByStudentSchool = async (req, res) => {
  try {
    const rawSchool = req.params.school
      ? decodeURIComponent(req.params.school).trim()
      : (req.query.school ? decodeURIComponent(req.query.school).trim() : null);

    if (!rawSchool) {
      return res.status(400).json({ message: "School / Department parameter is required" });
    }

    const userId = req.user ? req.user.id : null;

    // 1. Clean school name and build search pattern
    const cleanSchool = rawSchool.replace(/\s*-\s*\d+$/, "").trim();
    const escaped = cleanSchool.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = escaped
      .replace(/\s*(?:&|and)\s*/gi, "\\s*(?:&|and)\\s*")
      .replace(/\s+/g, "\\s+");
    const schoolRegex = new RegExp(`^${pattern}`, "i");

    // Extract significant root keywords (e.g. "engineering", "law", "pharmaceutic", "optometry", "management", "design")
    const keywords = [];
    const lower = cleanSchool.toLowerCase();
    if (lower.includes("engineering")) keywords.push("engineering");
    if (lower.includes("allied") && lower.includes("health")) keywords.push("allied");
    if (lower.includes("healthcare") || lower.includes("paramedical")) keywords.push("healthcare", "paramedical");
    if (lower.includes("health science")) keywords.push("health science");
    if (lower.includes("law")) keywords.push("law");
    if (lower.includes("pharmaceutic") || lower.includes("pharmacy")) keywords.push("pharmaceutic", "pharmacy");
    if (lower.includes("management")) keywords.push("management");
    if (lower.includes("design") || lower.includes("innovation")) keywords.push("design", "innovation");
    if (lower.includes("optometry")) keywords.push("optometry");
    if (lower.includes("agriculture")) keywords.push("agriculture");
    if (lower.includes("social science")) keywords.push("social science");
    if (lower.includes("hotel")) keywords.push("hotel");
    if (lower.includes("computer application") || lower.includes("cait")) keywords.push("computer application", "cait");

    const orSchoolConditions = [{ school: schoolRegex }, { department: schoolRegex }];
    keywords.forEach((kw) => {
      const kwRegex = new RegExp(kw, "i");
      orSchoolConditions.push({ school: kwRegex });
      orSchoolConditions.push({ department: kwRegex });
    });

    // 2. Find matching student IDs from StudentUser & StudentRecord
    const [matchingUsers, matchingRecords] = await Promise.all([
      StudentUser.find({ $or: orSchoolConditions }).select("id ctuId fullName program school").lean(),
      StudentRecord.find({ $or: orSchoolConditions }).select("id ctuId fullName program school").lean(),
    ]);

    const studentIdMap = new Map();
    matchingUsers.forEach((u) => {
      if (u.id) studentIdMap.set(u.id.toUpperCase(), u);
      if (u.ctuId) studentIdMap.set(u.ctuId.toUpperCase(), u);
    });
    matchingRecords.forEach((r) => {
      if (r.id && !studentIdMap.has(r.id.toUpperCase())) studentIdMap.set(r.id.toUpperCase(), r);
      if (r.ctuId && !studentIdMap.has(r.ctuId.toUpperCase())) studentIdMap.set(r.ctuId.toUpperCase(), r);
    });

    const studentIds = Array.from(studentIdMap.keys());

    // 3. Query all grievances submitted by these students (across ANY category)
    const orGrievanceConditions = [];
    if (studentIds.length > 0) {
      orGrievanceConditions.push({ userId: { $in: studentIds } });
      orGrievanceConditions.push({ regid: { $in: studentIds } });
    }
    orGrievanceConditions.push({ studentProgram: schoolRegex });
    keywords.forEach((kw) => {
      orGrievanceConditions.push({ studentProgram: new RegExp(kw, "i") });
    });

    const grievances = await Grievance.find({
      $or: orGrievanceConditions,
      hiddenFor: { $ne: userId }
    })
      .populate("issueTypeId", "issueName description")
      .populate("linkedGrievances", "category status currentCustodian assignedTo updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    // 4. Enrich each grievance with student metadata
    const enrichedGrievances = grievances.map((g) => {
      const matchedStudent = studentIdMap.get((g.userId || "").toUpperCase()) || studentIdMap.get((g.regid || "").toUpperCase());
      return {
        ...g,
        studentSchool: matchedStudent?.school || rawSchool,
        studentProgram: g.studentProgram || matchedStudent?.program || "—",
      };
    });

    res.json(enrichedGrievances);
  } catch (err) {
    console.error("Failed to fetch student department grievances:", err);
    res.status(500).json({ message: "Failed to fetch student grievances", error: err.message });
  }
};



/* =====================================================
   4️⃣ CATEGORY ADMIN → ASSIGN TO STAFF (5-digit)
===================================================== */
export const assignToStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { staffId, adminId, deadline } = req.body;

    // Debug: log incoming assign payload
    // console.log(`Assign request for grievance ${id} -> staff: ${staffId}, admin: ${adminId}, deadline: ${deadline}`);

    // ✅ Prevent assigning to self (submitter)
    const existingGrievance = await Grievance.findById(id);
    if (!existingGrievance) return res.status(404).json({ message: "Grievance not found" });

    if (existingGrievance.userId === staffId) {
      return res.status(400).json({ message: "❌ Cannot assign grievance to the staff member who submitted it." });
    }

    // 🔒 STRICT CUSTODY CHECK:
    // When a grievance is assigned/transferred to another department, only administrators of that
    // holding department have the right to assign faculty members.
    const currentHoldingDept = (
      existingGrievance.currentCustodian?.department ||
      existingGrievance.category ||
      ""
    ).trim();

    const requesterId = (adminId || req.user?.id || "").toString().trim().toUpperCase();
    const isMasterAdmin = req.user?.isMasterAdmin || requesterId === "10001";

    if (requesterId && !isMasterAdmin) {
      const requesterUser = await StaffUser.findOne({ id: requesterId }) || await User.findOne({ id: requesterId });
      if (requesterUser) {
        const adminDepts = Array.isArray(requesterUser.adminDepartments) && requesterUser.adminDepartments.length > 0
          ? requesterUser.adminDepartments
          : (requesterUser.adminDepartment ? [requesterUser.adminDepartment] : (requesterUser.department ? [requesterUser.department] : []));

        const isAuthorizedAdmin = adminDepts.some(d => isDeptMatch(d, currentHoldingDept));

        if (!isAuthorizedAdmin && adminDepts.length > 0) {
          return res.status(403).json({
            message: `❌ You do not have permission to assign this grievance. It is assigned to ${currentHoldingDept}. Only ${currentHoldingDept} administrators can assign faculty to it.`
          });
        }
      }
    }

    // 🔒 FACULTY BELONGING CHECK:
    // Ensure the faculty member being assigned belongs to currentHoldingDept!
    // Normalizes "&" vs "and" and checks all department fields associated with the staff member.
    if (staffId && currentHoldingDept) {
      const targetStaff = await StaffUser.findOne({ id: staffId })
        || await User.findOne({ id: staffId })
        || await StaffRecord.findOne({ id: staffId });
      
      if (targetStaff) {
        const staffDepts = [
          targetStaff.staffDepartment,
          targetStaff.department,
          targetStaff.adminDepartment,
          ...(Array.isArray(targetStaff.adminDepartments) ? targetStaff.adminDepartments : [])
        ].filter(Boolean);

        const isBelongsToHoldingDept = staffDepts.length === 0 || staffDepts.some(d => isDeptMatch(d, currentHoldingDept));

        if (!isBelongsToHoldingDept) {
          const displayDept = targetStaff.staffDepartment || targetStaff.department || targetStaff.adminDepartment || "Unknown";
          return res.status(400).json({
            message: `❌ Cannot assign faculty member (${staffId}) of ${displayDept} to a grievance assigned to ${currentHoldingDept}. Please assign a faculty member of ${currentHoldingDept}.`
          });
        }
      }
    }

    // Validate deadline (if provided) must not be before grievance creation date.
    // Compare only by calendar date (ignore time) so a deadline on the same day is allowed.
    let deadlineDate = null;
    if (deadline) {
      const parsed = new Date(deadline);
      if (isNaN(parsed.getTime())) {
        return res.status(400).json({ message: "Invalid deadline date" });
      }

      // Compare date-only values to allow same-day deadlines.
      const parsedDateOnly = new Date(parsed.toISOString().slice(0, 10));
      const createdDateOnly = new Date(existingGrievance.createdAt.toISOString().slice(0, 10));

      if (parsedDateOnly < createdDateOnly) {
        // return res.status(400).json({ message: "Deadline cannot be earlier than grievance creation date" });
        console.warn("⚠️ Warning: Deadline is earlier than grievance creation date (Allowed for Admin override)");
      }

      // Keep the original parsed value (preserve any time if provided)
      deadlineDate = parsed;
    }

    // Resolve staff full name
    let staffFullName = staffId;
    try {
      const staffUser = await StaffUser.findOne({ id: staffId })
        || await User.findOne({ id: staffId })
        || await StaffRecord.findOne({ id: staffId });
      if (staffUser && staffUser.fullName) staffFullName = staffUser.fullName;
    } catch (_) {}

    const isReassign = existingGrievance.assignedTo && existingGrievance.assignedTo !== staffId;
    const isAfterTransfer = existingGrievance.isRerouted && (!existingGrievance.assignedTo || isReassign);

    const update = {
      assignedTo: staffId,
      assignedRole: "staff",
      assignedBy: adminId,
      status: "Assigned",
      deadlineDate: deadlineDate || calculateDeadline(),
      currentCustodian: {
        department: existingGrievance.category,
        staffId: staffId,
        staffName: staffFullName,
        assignedAt: new Date(),
        role: "staff"
      },
      $addToSet: {
        involvedStaff: staffId,
        involvedDepartments: existingGrievance.category
      },
      updatedAt: Date.now(),
    };

    if (isAfterTransfer || isReassign) {
      const hopNum = (existingGrievance.transferHistory?.length || 0) + 1;
      update.$push = {
        transferHistory: {
          hop: hopNum,
          actionType: isReassign ? "FACULTY_REASSIGNMENT" : "FACULTY_ASSIGNMENT",
          fromDepartment: existingGrievance.category,
          toDepartment: existingGrievance.category,
          transferredBy: adminId || "DEPT_ADMIN",
          transferredByName: "Department Admin",
          transferredByRole: "admin",
          reason: isReassign ? `Re-assigned to faculty member ${staffFullName}` : `Assigned to faculty member ${staffFullName}`,
          transferredAt: new Date(),
          assignedToInNewDept: staffId,
          assignedToNameInNewDept: staffFullName,
          statusAtTransfer: "Assigned"
        }
      };
    }

    const grievance = await Grievance.findByIdAndUpdate(id, update, { new: true });

    // 📧 Send email notification to assigned staff (manual assignment, non-blocking)
    try {
      await sendAssignmentNotification(grievance, { staffId }, false);
    } catch (emailError) {
      console.error("Manual assignment email notification failed (non-blocking):", emailError.message);
    }

    // console.log('Assign result (saved grievance):', grievance);

    res.json({
      message: "✅ Assigned to staff successfully",
      grievance,
    });
  } catch (err) {
    console.error("Assign Error:", err);
    res.status(500).json({ message: "Assignment failed" });
  }
};


/* =====================================================
   5️⃣ STAFF → SEE ONLY ASSIGNED GRIEVANCES
===================================================== */
export const getAssignedGrievances = async (req, res) => {
  try {
    const { staffId } = req.params;

    const userId = req.user?.id;
    const hiddenFilter = userId ? { hiddenFor: { $ne: userId } } : {};

    const grievances = await Grievance.find({
      assignedTo: staffId,
      ...hiddenFilter
    })
      .populate("issueTypeId", "issueName description")
      .populate("linkedGrievances", "category status currentCustodian assignedTo updatedAt")
      .sort({ createdAt: -1 });

    res.json(grievances);
  } catch (err) {
    console.error("getAssignedGrievances ERROR:", err);
    res.status(500).json({ message: "Failed to fetch assigned grievances" });
  }
};

/* =====================================================
   ⭐ STAFF → GET DETAILED RATINGS SUMMARY
===================================================== */
export const getStaffRatingsSummary = async (req, res) => {
  try {
    const { staffId } = req.params;
    if (!staffId) {
      return res.status(400).json({ message: "Staff ID is required" });
    }

    const sId = String(staffId).trim().toLowerCase();

    // Look up staff to also get their full name
    const staff = await StaffUser.findOne({ id: staffId })
      || await User.findOne({ id: staffId })
      || await StaffRecord.findOne({ id: staffId });
    const sName = staff ? String(staff.fullName || staff.name || "").trim().toLowerCase() : "";

    // Find all rated grievances
    const ratedGrievances = await Grievance.find({
      $or: [
        { isRated: true },
        { "rating.stars": { $exists: true, $ne: null } }
      ]
    }).select("_id name regid category message assignedTo resolvedBy rating isRated createdAt");

    const matched = ratedGrievances.filter(g => {
      const aTo = g.assignedTo ? String(g.assignedTo).trim().toLowerCase() : "";
      const rBy = g.resolvedBy ? String(g.resolvedBy).trim().toLowerCase() : "";

      if (aTo && (aTo === sId || (sName && aTo === sName) || (sId && aTo.includes(sId)) || (sName && aTo.includes(sName)))) {
        return true;
      }
      if (rBy && (rBy === sId || (sName && rBy === sName) || (sId && rBy.includes(sId)) || (sName && rBy.includes(sName)))) {
        return true;
      }
      return false;
    });

    const totalRatings = matched.length;
    const totalStars = matched.reduce((sum, g) => sum + (Number(g.rating?.stars) || 0), 0);
    const averageRating = totalRatings > 0 ? Number((totalStars / totalRatings).toFixed(1)) : null;

    // Star breakdown 1-5
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    matched.forEach(g => {
      const star = g.rating?.stars;
      if (star && breakdown[star] !== undefined) {
        breakdown[star] += 1;
      }
    });

    const reviews = matched.map(g => ({
      grievanceId: g._id,
      studentName: g.name,
      studentRegId: g.regid,
      category: g.category,
      stars: g.rating?.stars,
      feedback: g.rating?.feedback || "",
      ratedAt: g.rating?.ratedAt || g.createdAt
    })).sort((a, b) => new Date(b.ratedAt) - new Date(a.ratedAt));

    res.json({
      staffId,
      staffName: staff ? (staff.fullName || staff.name) : staffId,
      averageRating,
      totalRatings,
      breakdown,
      reviews
    });
  } catch (err) {
    console.error("getStaffRatingsSummary ERROR:", err);
    res.status(500).json({ message: "Failed to fetch staff ratings summary" });
  }
};


/* =====================================================
   6️⃣ STUDENT → OWN GRIEVANCE HISTORY
===================================================== */
export const getUserGrievances = async (req, res) => {
  try {
    const { userId } = req.params;

    // Ensure users can only see their own (controller is reusable though) or admin sees user's history
    // We already filter by userId, just add the hidden check for the REQUESTER
    const requesterId = req.user ? req.user.id : null;

    const grievances = await Grievance.find({
      userId,
      hiddenFor: { $ne: requesterId } // 🔍 Filter hidden
    })
      .populate("issueTypeId", "issueName description")
      .sort({ createdAt: -1 });

    res.json(grievances);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user grievances" });
  }
};


// ✅ 7️⃣ STAFF / ADMIN → UPDATE STATUS (With Verification Logic)
export const updateGrievanceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolutionRemarks, resolvedBy, verificationAttempts } = req.body;

    // 🔥 If status is "Resolved", switch to "Verification"
    let finalStatus = status;
    let resolutionTime = null;

    if (status === "Resolved") {
      finalStatus = "Verification";
      resolutionTime = Date.now();
    }

    const updateData = {
      status: finalStatus,
      resolutionRemarks,
      resolvedBy,
      updatedAt: Date.now(),
    };

    if (typeof verificationAttempts === "number") {
      updateData.verificationAttempts = verificationAttempts;
    }

    if (finalStatus === "Rejected") {
      updateData.rejectionReason = resolutionRemarks || "Rejected by Administrator";
      updateData.rejectedBy = resolvedBy;
      updateData.rejectedAt = Date.now();
    }

    if (resolutionTime) {
      updateData.resolutionProposedAt = resolutionTime;
    }

    const grievance = await Grievance.findByIdAndUpdate(id, updateData, { new: true });

    // 📧 SEND EMAIL IF STATUS IS VERIFICATION
    if (finalStatus === "Verification") {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
          },
        });

        const html = `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; max-width: 600px;">
            <h2 style="color: #fca5a5;">Action Required: Verify Resolution</h2>
            <p>Dear <strong>${grievance.name}</strong>,</p>
            <p>The staff has proposed a resolution for your grievance related to <strong>${grievance.category}</strong>.</p>
            <div style="background: #fff1f2; padding: 15px; border-left: 4px solid #f43f5e; margin: 20px 0;">
              <strong>Staff Remarks:</strong> ${resolutionRemarks}
            </div>
            <p>Please login to your dashboard to <strong>Accept</strong> or <strong>Reject</strong> this resolution within <strong>36 hours</strong>.</p>
            <p style="color: #64748b; font-size: 0.9rem;">If no action is taken, it will be automatically marked as Resolved.</p>
          </div>
        `;

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: grievance.email,
          subject: "Action Required: Verify Grievance Resolution",
          html
        });
        console.log(`✅ Verification email sent to student ${grievance.email}`);
      } catch (err) {
        console.error("⚠️ Email failed:", err);
      }
    }

    res.json({
      message: status === "Resolved" ? "✅ Resolution submitted for verification" : "✅ Status updated",
      grievance,
    });
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
};


// 🆕 ✅ VERIFY RESOLUTION (Student Action)
export const verifyResolution = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, feedback } = req.body; // 'accept' | 'reject'

    const grievance = await Grievance.findById(id);
    if (!grievance) return res.status(404).json({ message: "Grievance not found" });

    let newStatus = "";
    let emailSubject = "";
    let emailBody = "";
    let notifyEmails = [];

    // Find assigned staff email
    let staffEmail = null;
    let deptAdminEmail = null;

    if (grievance.assignedTo) {
      const staff = await StaffUser.findOne({ id: grievance.assignedTo })
        || await User.findOne({ id: grievance.assignedTo })
        || await StaffRecord.findOne({ id: grievance.assignedTo });
      if (staff) staffEmail = staff.email;
    }

    // If Rejected, we also need Dept Admin email (Assigned By usually is Admin)
    if (action === "reject" && grievance.assignedBy) {
      const admin = await StaffUser.findOne({ id: grievance.assignedBy })
        || await User.findOne({ id: grievance.assignedBy })
        || await StaffRecord.findOne({ id: grievance.assignedBy });
      if (admin) deptAdminEmail = admin.email;
    }

    if (action === "accept") {
      newStatus = "Resolved";
      grievance.status = "Resolved";
      grievance.resolutionProposedAt = null;
      grievance.autoClosed = false;

      emailSubject = "Resolution Accepted ✅";
      emailBody = `The student has <strong>ACCEPTED</strong> the resolution for grievance #${id}. Great job!`;
      if (staffEmail) notifyEmails.push(staffEmail);
    } else {
      // 🔒 Check 2-reopen limit
      if ((grievance.verificationAttempts || 0) >= 2) {
        return res.status(400).json({
          message: "Maximum reopen limit (2) reached. Further rejection is not allowed. Please accept the resolution.",
          grievance
        });
      }

      // 🔄 Student Rejected / Reopened the grievance
      newStatus = grievance.assignedTo ? "Assigned" : "Pending";
      grievance.status = newStatus;
      grievance.verificationAttempts = (grievance.verificationAttempts || 0) + 1;
      grievance.resolutionProposedAt = null;
      grievance.autoClosed = false;

      const rejectionFeedback = (feedback || "").trim() || "Resolution rejected by student";
      grievance.rejectionReason = rejectionFeedback;
      grievance.rejectedAt = new Date();
      grievance.rejectedBy = grievance.userId;
      grievance.rejectedByName = grievance.name;

      const reopenNote = `[Reopened #${grievance.verificationAttempts} by Student: ${rejectionFeedback}]`;
      grievance.resolutionRemarks = grievance.resolutionRemarks
        ? `${grievance.resolutionRemarks}\n${reopenNote}`
        : reopenNote;

      emailSubject = "Resolution Rejected ❌ - Grievance Reopened";
      emailBody = `The student has <strong>REJECTED</strong> the proposed resolution for grievance #${id} and reopened it.<br><br><strong>Student Reason / Feedback:</strong> ${rejectionFeedback}<br><br>Please review and take necessary action immediately.`;
      if (staffEmail) notifyEmails.push(staffEmail);
      if (deptAdminEmail && deptAdminEmail !== staffEmail) notifyEmails.push(deptAdminEmail);
    }

    await grievance.save();

    // 📧 SEND EMAILS
    if (notifyEmails.length > 0) {
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
        });

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: notifyEmails, // Array of emails
          subject: `${emailSubject} - Grievance #${id}`,
          html: `<p>${emailBody}</p>`
        });
        console.log(`✅ Verification outcome email sent to: ${notifyEmails.join(", ")}`);
      } catch (err) {
        console.error("⚠️ Failed to send verification outcome email:", err);
      }
    }

    res.json({
      message: action === "accept" ? "Grievance resolved and closed successfully" : "Grievance reopened successfully",
      grievance
    });

  } catch (err) {
    console.error("Verification Error:", err);
    res.status(500).json({ message: "Verification failed" });
  }
};

// ... (Existing Routes Below) //

// ✅ Request Extension (Staff)
export const requestExtension = async (req, res) => {
  try {
    const { id } = req.params;
    const { requestedDate, reason } = req.body;

    const grievance = await Grievance.findByIdAndUpdate(
      id,
      {
        extensionRequest: {
          requestedDate: new Date(requestedDate),
          reason,
          status: "Pending"
        }
      },
      { new: true }
    );

    res.json({ message: "Extension requested successfully", grievance });
  } catch (err) {
    res.status(500).json({ message: "Request failed" });
  }
};

// ✅ Resolve Extension (Admin)
// ✅ Resolve Extension (Admin)
export const resolveExtension = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    const act = (action || "").toLowerCase();

    const grievance = await Grievance.findById(id);
    if (!grievance) return res.status(404).json({ message: "Grievance not found" });

    if (act === 'approve') {
      grievance.deadlineDate = grievance.extensionRequest.requestedDate;
      grievance.extensionRequest.status = "Approved";
    } else {
      grievance.extensionRequest.status = "Rejected"; // Keep record of rejection
    }

    await grievance.save();

    // 📧 SEND EMAIL NOTIFICATION TO STAFF
    try {
      if (grievance.assignedTo) {
        const staff = await StaffUser.findOne({ id: grievance.assignedTo })
          || await User.findOne({ id: grievance.assignedTo })
          || await StaffRecord.findOne({ id: grievance.assignedTo });

        if (staff && staff.email) {
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
          });

          const isApproved = action === 'approve';
          const subject = isApproved ? "Extension Request Approved ✅" : "Extension Request Rejected ❌";
          const color = isApproved ? "#16a34a" : "#dc2626";
          const message = isApproved
            ? `Good news! Your request to extend the deadline for grievance <strong>#${grievance._id}</strong> has been approved. The new deadline is now <strong>${new Date(grievance.deadlineDate).toDateString()}</strong>.`
            : `Your request to extend the deadline for grievance <strong>#${grievance._id}</strong> has been rejected. The original deadline remains unchanged.`;

          const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; max-width: 600px;">
              <h2 style="color: ${color}; margin-top: 0;">${subject}</h2>
              <p style="color: #334155; font-size: 16px;">Dear <strong>${staff.fullName}</strong>,</p>
              <p style="color: #475569; line-height: 1.6;">${message}</p>
              
              <div style="background: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid ${color};">
                <p style="margin: 5px 0;"><strong>Extension Reason:</strong> ${grievance.extensionRequest.reason}</p>
                ${isApproved ? `<p style="margin: 5px 0;"><strong>New Deadline:</strong> ${new Date(grievance.deadlineDate).toDateString()}</p>` : ''}
              </div>

              <p style="color: #94a3b8; font-size: 14px;">Please login to the portal to view more details.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #cbd5e1; font-size: 12px; text-align: center;">CTU Grievance Portal Notification System</p>
            </div>
          `;

          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: staff.email,
            subject: `${subject} - CTU Grievance Portal`,
            html: html
          });

          console.log(`✅ Extension notification email sent to ${staff.email} (${action})`);
        }
      }
    } catch (emailErr) {
      console.error("⚠️ Failed to send extension notification email:", emailErr);
      // Don't fail the request just because email failed
    }

    res.json({ message: `Extension ${action}d successfully`, grievance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Action failed" });
  }
};

// ✅ Get Grievance Details with Assigned Staff Info
export const getGrievanceDetail = async (req, res) => {
  try {
    const { grievanceId } = req.params;

    const grievance = await Grievance.findById(grievanceId);
    if (!grievance) {
      return res.status(404).json({ error: "Grievance not found" });
    }

    // Fetch assigned staff details if available
    let staffInfo = null;
    if (grievance.assignedTo) {
      const staff = await StaffUser.findOne({ id: grievance.assignedTo })
        || await User.findOne({ id: grievance.assignedTo })
        || await StaffRecord.findOne({ id: grievance.assignedTo });
      if (staff) {
        staffInfo = {
          id: staff.id,
          name: staff.fullName || staff.name || grievance.assignedTo,
          department: grievance.category
        };
      }
    }

    res.json({
      _id: grievance._id,
      name: grievance.name,
      userId: grievance.userId,
      email: grievance.email,
      userType: grievance.userType,
      message: grievance.message,
      regid: grievance.regid,
      category: grievance.category,
      status: grievance.status,
      assignedStaff: staffInfo,
      createdAt: grievance.createdAt,
      deadlineDate: grievance.deadlineDate || null
    });
  } catch (err) {
    console.error("Error fetching grievance details:", err);
    res.status(500).json({ error: "Failed to fetch grievance details" });
  }
};

// ✅ Hide Grievance (Soft Delete)
export const hideGrievance = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id; // From verifyToken

    await Grievance.findByIdAndUpdate(id, {
      $addToSet: { hiddenFor: userId }
    });

    res.json({ message: "Grievance hidden successfully" });
  } catch (err) {
    console.error("Hide Error:", err);
    res.status(500).json({ message: "Failed to hide grievance" });
  }
};

/* =====================================================
   🔁 DEPARTMENT RE-ROUTING & MULTI-HOP TRANSFER
===================================================== */
export const transferGrievance = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      targetDepartment,
      targetDepartments, // array of strings for multi-department forwarding
      departmentAssignments, // array of { department, staffId, staffName, issueTypeId }
      staffAssignments, // map of { [dept]: { staffId, staffName, issueTypeId } }
      targetIssueTypeId,
      targetStaffId,
      targetStaffName,
      reason,
      transferredBy,
      transferredByName,
      transferredByRole = "staff"
    } = req.body;

    // Build department -> staff assignment lookup map
    const assignmentsMap = {};
    if (Array.isArray(departmentAssignments)) {
      departmentAssignments.forEach((da) => {
        if (da && da.department) {
          assignmentsMap[da.department.trim().toLowerCase()] = {
            staffId: da.staffId || null,
            staffName: da.staffName || null,
            issueTypeId: da.issueTypeId || null
          };
        }
      });
    }
    if (staffAssignments && typeof staffAssignments === "object") {
      Object.entries(staffAssignments).forEach(([dept, a]) => {
        if (dept && a) {
          assignmentsMap[dept.trim().toLowerCase()] = {
            staffId: a.staffId || null,
            staffName: a.staffName || null,
            issueTypeId: a.issueTypeId || null
          };
        }
      });
    }

    // Normalize target departments list
    let deptsToForward = [];
    if (Array.isArray(departmentAssignments) && departmentAssignments.length > 0) {
      deptsToForward = departmentAssignments.map(da => da.department?.trim()).filter(Boolean);
    } else if (Array.isArray(targetDepartments) && targetDepartments.length > 0) {
      deptsToForward = targetDepartments
        .map((d) => (typeof d === "string" ? d.trim() : (d?.department?.trim() || "")))
        .filter(Boolean);
    } else if (targetDepartment && typeof targetDepartment === "string" && targetDepartment.trim()) {
      deptsToForward = [targetDepartment.trim()];
    }

    if (deptsToForward.length === 0 || !reason || !reason.trim()) {
      return res.status(400).json({ message: "At least one target department and a transfer reason are mandatory." });
    }

    if (transferredByRole === "master_admin" || transferredBy?.toString().toUpperCase() === "10001") {
      return res.status(403).json({ message: "Super Admin cannot transfer or re-route grievances. Re-routing is managed by department staff." });
    }

    const grievance = await Grievance.findById(id);
    if (!grievance) {
      return res.status(404).json({ message: "Grievance not found." });
    }

    if (grievance.status === "Resolved" || grievance.status === "Rejected") {
      return res.status(400).json({ message: "Cannot transfer a resolved or rejected grievance." });
    }

    const senderStaffId = (transferredBy || req.user?.id || "STAFF").toString().trim().toUpperCase();

    // 🔒 REQUIREMENT 1: One faculty can forward the grievance ONLY ONCE
    if (transferredByRole !== "master_admin" && senderStaffId) {
      const alreadyForwarded = grievance.transferHistory?.some(
        (t) => t.transferredBy && t.transferredBy.toString().trim().toUpperCase() === senderStaffId
      );
      if (alreadyForwarded) {
        return res.status(400).json({
          message: "You have already forwarded this grievance once. You can only view its journey and cannot forward it again."
        });
      }
    }

    // Authorization check: Only current assignee, department admin, or department faculty of current category can forward
    const isAssignee = Boolean(
      senderStaffId &&
      ((grievance.assignedTo && grievance.assignedTo.toString().trim().toUpperCase() === senderStaffId) ||
       (grievance.currentCustodian?.staffId && grievance.currentCustodian.staffId.toString().trim().toUpperCase() === senderStaffId))
    );
    const currentHoldingDept = (grievance.currentCustodian?.department || grievance.category || "").trim().toLowerCase();

    // Check if sender is admin or faculty/staff member of the current holding department
    let isCurrentDeptAdmin = false;
    let isDeptStaff = false;

    if (senderStaffId && senderStaffId !== "10001" && transferredByRole !== "master_admin") {
      try {
        const idRegex = new RegExp(`^${senderStaffId}$`, "i");
        const staffUser =
          (await User.findOne({ id: { $regex: idRegex } })) ||
          (await StaffUser.findOne({ id: { $regex: idRegex } })) ||
          (await User.findOne({ id: senderStaffId })) ||
          (await StaffUser.findOne({ id: senderStaffId }));

        if (staffUser) {
          const staffDepts = [];
          if (Array.isArray(staffUser.adminDepartments)) {
            staffUser.adminDepartments.forEach((d) => d && staffDepts.push(d));
          }
          if (staffUser.adminDepartment) staffDepts.push(staffUser.adminDepartment);
          if (staffUser.staffDepartment) staffDepts.push(staffUser.staffDepartment);
          if (staffUser.department) staffDepts.push(staffUser.department);
          if (staffUser.school) staffDepts.push(staffUser.school);

          const hasDeptAuth = staffDepts.some((d) => isDeptMatch(d, currentHoldingDept));
          if (hasDeptAuth) {
            if (
              transferredByRole === "admin" ||
              staffUser.isDeptAdmin ||
              staffUser.role === "admin" ||
              req.user?.isDeptAdmin
            ) {
              isCurrentDeptAdmin = true;
            }
            isDeptStaff = true;
          }
        }
      } catch (staffErr) {
        console.warn("Could not verify department membership during transfer:", staffErr.message);
      }
    }

    if (!isAssignee && !isCurrentDeptAdmin && !isDeptStaff && transferredByRole !== "master_admin") {
      return res.status(403).json({
        message: `❌ You do not have the right to forward this grievance. It is assigned to ${grievance.category}. Only administrators or assigned faculty of ${grievance.category} can forward or reassign it.`
      });
    }

    const oldDepartment = grievance.category;
    const isMultiTransfer = deptsToForward.length > 1;

    // Remove duplicates
    const uniqueDepts = Array.from(new Set(deptsToForward));

    // ==========================================
    // CASE A: SINGLE DEPARTMENT TRANSFER / INTERNAL REASSIGNMENT
    // ==========================================
    if (!isMultiTransfer) {
      const targetDept = uniqueDepts[0];
      const isSameDepartment = oldDepartment === targetDept;
      const deptAssign = assignmentsMap[targetDept.toLowerCase()];
      const resolvedStaffId = deptAssign?.staffId || targetStaffId || null;
      const resolvedStaffName = deptAssign?.staffName || targetStaffName || resolvedStaffId;

      if (isSameDepartment) {
        if (resolvedStaffId && resolvedStaffId === grievance.assignedTo) {
          return res.status(400).json({
            message: "The grievance is already assigned to this faculty member. Please select a different faculty member to reassign."
          });
        }
        if (!resolvedStaffId && !grievance.assignedTo) {
          return res.status(400).json({
            message: "The grievance is already unassigned and under the custody of the Department Administrator."
          });
        }
      }

      let finalIssueTypeId = deptAssign?.issueTypeId || targetIssueTypeId || (isSameDepartment ? grievance.issueTypeId : null);
      if (!finalIssueTypeId) {
        const defaultIssue = await IssueType.findOne({
          department: targetDept,
          isActive: true,
          $or: [
            { issueName: { $regex: /other/i } },
            { issueName: { $regex: /general/i } }
          ]
        }) || await IssueType.findOne({ department: targetDept, isActive: true });

        if (defaultIssue) finalIssueTypeId = defaultIssue._id;
      }

      let assignedStaff = null;
      let assignmentMode = "manual";

      // If internal reassignment within same department, honor the selected staff
      if (isSameDepartment && resolvedStaffId) {
        assignedStaff = {
          staffId: resolvedStaffId,
          staffName: resolvedStaffName || resolvedStaffId,
          assignmentMode: "manual"
        };
        assignmentMode = "manual";
      } else {
        // Forwarding to another department: NEVER assign faculty on forward.
        // Grievance lands in the destination department pool (Unassigned).
        // Destination department admin will manually assign faculty.
        assignedStaff = null;
        assignmentMode = "manual";
      }

      const newAssignedTo = (assignedStaff && assignedStaff.staffId) ? assignedStaff.staffId : null;
      const newAssignedName = (assignedStaff && assignedStaff.staffName) ? assignedStaff.staffName : null;
      const newDeadline = calculateDeadline();
      const currentHop = (grievance.transferHistory?.length || 0) + 1;

      const transferEntry = {
        hop: currentHop,
        actionType: isSameDepartment ? "FACULTY_REASSIGNMENT" : "DEPARTMENT_TRANSFER",
        fromDepartment: oldDepartment,
        toDepartment: targetDept,
        transferredBy: senderStaffId,
        transferredByName: transferredByName || "Staff Member",
        transferredByRole: transferredByRole || "staff",
        reason: reason.trim(),
        transferredAt: new Date(),
        assignedToInNewDept: newAssignedTo,
        assignedToNameInNewDept: newAssignedName,
        statusAtTransfer: grievance.status
      };

      grievance.category = targetDept;
      grievance.issueTypeId = finalIssueTypeId;
      grievance.assignedTo = newAssignedTo;
      grievance.assignedRole = newAssignedTo ? "staff" : null;
      grievance.assignedBy = newAssignedTo ? (targetStaffId ? senderStaffId : "SYSTEM_REROUTED") : null;
      grievance.assignmentMode = assignmentMode;
      grievance.status = newAssignedTo ? "Assigned" : "Pending";
      grievance.deadlineDate = newDeadline;
      grievance.isRerouted = true;
      grievance.transferHistory.push(transferEntry);

      grievance.originatingDepartment = grievance.originatingDepartment || oldDepartment;
      if (!grievance.involvedDepartments.includes(oldDepartment)) {
        grievance.involvedDepartments.push(oldDepartment);
      }
      if (!grievance.involvedDepartments.includes(targetDept)) {
        grievance.involvedDepartments.push(targetDept);
      }

      if (senderStaffId && !grievance.involvedStaff.map(s => s.toUpperCase()).includes(senderStaffId)) {
        grievance.involvedStaff.push(senderStaffId);
      }
      if (newAssignedTo) {
        const receiverStaffId = newAssignedTo.toString().trim().toUpperCase();
        if (!grievance.involvedStaff.map(s => s.toUpperCase()).includes(receiverStaffId)) {
          grievance.involvedStaff.push(receiverStaffId);
        }
      }

      grievance.currentCustodian = {
        department: targetDept,
        staffId: newAssignedTo,
        staffName: newAssignedName,
        assignedAt: new Date(),
        role: newAssignedTo ? "staff" : "admin"
      };

      grievance.extensionRequest = {
        requestedDate: null,
        reason: "",
        status: "None"
      };

      await grievance.save();

      if (assignedStaff && assignedStaff.staffId) {
        try {
          await sendAssignmentNotification(grievance, assignedStaff, true);
        } catch (emailError) {
          console.error("Transfer assignment email notification failed:", emailError.message);
        }
      }

      try {
        if (req.app && req.app.get("io")) {
          const io = req.app.get("io");
          io.emit("grievanceTransferred", {
            grievanceId: grievance._id,
            fromDepartment: oldDepartment,
            toDepartment: targetDept,
            assignedTo: newAssignedTo,
            transferEntry,
            currentCustodian: grievance.currentCustodian
          });
        }
      } catch (socketErr) {
        console.warn("Socket notification warning:", socketErr.message);
      }

      return res.json({
        message: isSameDepartment
          ? `✅ Grievance returned to ${targetDept} Department Administrator.`
          : `✅ Grievance successfully forwarded to ${targetDept} Department Administrator (Pool).`,
        grievance
      });
    }

    // ==========================================
    // CASE B: MULTI-DEPARTMENT FORWARDING (2+ DEPARTMENTS)
    // ==========================================
    // Primary department is the first destination, secondary departments are the others
    const destinationDepts = uniqueDepts.filter(d => d !== oldDepartment);
    const primaryDept = destinationDepts[0] || uniqueDepts[0];
    const secondaryDepts = destinationDepts.slice(1);

    // Primary Department Setup
    let primaryIssueTypeId = null;
    const primaryDefaultIssue = await IssueType.findOne({
      department: primaryDept,
      isActive: true,
      $or: [{ issueName: { $regex: /other/i } }, { issueName: { $regex: /general/i } }]
    }) || await IssueType.findOne({ department: primaryDept, isActive: true });
    if (primaryDefaultIssue) primaryIssueTypeId = primaryDefaultIssue._id;

    // Destination departments are strictly unassigned pool
    let primaryAssignedStaff = null;
    let primaryAssignmentMode = "manual";
    const primaryAssignedTo = null;
    const primaryAssignedName = null;
    const currentHop = (grievance.transferHistory?.length || 0) + 1;

    const primaryTransferEntry = {
      hop: currentHop,
      actionType: "MULTI_DEPARTMENT_TRANSFER",
      fromDepartment: oldDepartment,
      toDepartment: primaryDept,
      transferredBy: senderStaffId,
      transferredByName: transferredByName || "Staff Member",
      transferredByRole: transferredByRole || "staff",
      reason: `${reason.trim()} [Simultaneously forwarded to: ${uniqueDepts.join(", ")}]`,
      transferredAt: new Date(),
      assignedToInNewDept: null,
      assignedToNameInNewDept: null,
      statusAtTransfer: grievance.status
    };

    grievance.category = primaryDept;
    grievance.issueTypeId = primaryIssueTypeId;
    grievance.assignedTo = null;
    grievance.assignedRole = null;
    grievance.assignedBy = null;
    grievance.assignmentMode = primaryAssignmentMode;
    grievance.status = "Pending";
    grievance.deadlineDate = calculateDeadline();
    grievance.isRerouted = true;
    grievance.isMultiForwarded = true;
    grievance.forwardedDepartments = uniqueDepts;
    grievance.originatingDepartment = grievance.originatingDepartment || oldDepartment;
    grievance.transferHistory.push(primaryTransferEntry);

    // Track all involved departments
    for (const d of [oldDepartment, ...uniqueDepts]) {
      if (!grievance.involvedDepartments.includes(d)) {
        grievance.involvedDepartments.push(d);
      }
    }
    if (senderStaffId && !grievance.involvedStaff.map(s => s.toUpperCase()).includes(senderStaffId)) {
      grievance.involvedStaff.push(senderStaffId);
    }

    grievance.currentCustodian = {
      department: primaryDept,
      staffId: null,
      staffName: null,
      assignedAt: new Date(),
      role: "admin"
    };

    grievance.extensionRequest = { requestedDate: null, reason: "", status: "None" };

    // Create linked child instances for secondary departments
    const createdChildren = [];
    const allLinkedIds = [];

    for (const secDept of secondaryDepts) {
      let secIssueTypeId = null;
      const secDefaultIssue = await IssueType.findOne({
        department: secDept,
        isActive: true,
        $or: [{ issueName: { $regex: /other/i } }, { issueName: { $regex: /general/i } }]
      }) || await IssueType.findOne({ department: secDept, isActive: true });
      if (secDefaultIssue) secIssueTypeId = secDefaultIssue._id;

      let secAssignedStaff = null;
      let secAssignmentMode = "manual";
      const secAssignedTo = null;
      const secAssignedName = null;

      const child = new Grievance({
        userId: grievance.userId,
        userType: grievance.userType,
        name: grievance.name,
        email: grievance.email,
        phone: grievance.phone,
        regid: grievance.regid,
        studentProgram: grievance.studentProgram,
        category: secDept,
        issueTypeId: secIssueTypeId,
        assignmentMode: secAssignmentMode,
        message: grievance.message,
        attachment: grievance.attachment,
        assignedTo: secAssignedTo,
        assignedRole: secAssignedTo ? "staff" : null,
        assignedBy: secAssignedTo ? "SYSTEM_REROUTED" : null,
        status: secAssignedTo ? "Assigned" : "Pending",
        deadlineDate: calculateDeadline(),
        originatingDepartment: grievance.originatingDepartment || oldDepartment,
        involvedDepartments: Array.from(new Set([oldDepartment, ...uniqueDepts])),
        involvedStaff: [senderStaffId, ...(secAssignedTo ? [secAssignedTo] : [])],
        currentCustodian: {
          department: secDept,
          staffId: secAssignedTo,
          staffName: secAssignedName,
          assignedAt: new Date(),
          role: secAssignedTo ? "staff" : "admin"
        },
        isRerouted: true,
        isMultiForwarded: true,
        forwardedDepartments: uniqueDepts,
        parentGrievanceId: grievance._id,
        linkedGrievances: [grievance._id],
        transferHistory: [
          {
            hop: 1,
            actionType: "MULTI_DEPARTMENT_TRANSFER",
            fromDepartment: oldDepartment,
            toDepartment: secDept,
            transferredBy: senderStaffId,
            transferredByName: transferredByName || "Staff Member",
            transferredByRole: transferredByRole || "staff",
            reason: `${reason.trim()} [Simultaneously forwarded to: ${uniqueDepts.join(", ")}]`,
            transferredAt: new Date(),
            assignedToInNewDept: secAssignedTo,
            assignedToNameInNewDept: secAssignedName,
            statusAtTransfer: "Pending"
          }
        ]
      });

      await child.save();
      createdChildren.push(child);
      allLinkedIds.push(child._id);

      if (secAssignedStaff && secAssignedStaff.staffId) {
        try {
          await sendAssignmentNotification(child, secAssignedStaff, true);
        } catch (emailError) {
          console.error("Multi-transfer email notification error for", secDept, emailError.message);
        }
      }
    }

    // Link all child tickets to primary and to each other
    grievance.linkedGrievances = Array.from(new Set([...(grievance.linkedGrievances || []), ...allLinkedIds]));
    await grievance.save();

    for (const child of createdChildren) {
      child.linkedGrievances = Array.from(
        new Set([grievance._id, ...allLinkedIds.filter((id) => id.toString() !== child._id.toString())])
      );
      await child.save();
    }

    if (primaryAssignedStaff && primaryAssignedStaff.staffId) {
      try {
        await sendAssignmentNotification(grievance, primaryAssignedStaff, true);
      } catch (emailError) {
        console.error("Multi-transfer primary email notification failed:", emailError.message);
      }
    }

    try {
      if (req.app && req.app.get("io")) {
        const io = req.app.get("io");
        io.emit("grievanceTransferred", {
          grievanceId: grievance._id,
          fromDepartment: oldDepartment,
          forwardedDepartments: uniqueDepts,
          isMultiForwarded: true,
          currentCustodian: grievance.currentCustodian
        });
      }
    } catch (socketErr) {
      console.warn("Socket notification warning:", socketErr.message);
    }

    res.json({
      message: `✅ Grievance successfully forwarded to ${uniqueDepts.length} departments: ${uniqueDepts.join(", ")}.`,
      grievance,
      linkedCount: createdChildren.length,
      forwardedDepartments: uniqueDepts
    });
  } catch (err) {
    console.error("Transfer Grievance Error:", err);
    res.status(500).json({ message: "Failed to transfer grievance", error: err.message });
  }
};

/* =====================================================
   🔁 GET DEPARTMENT'S INTER-DEPARTMENT / FORWARDED GRIEVANCES
   → Grievances that passed through this department at any point
===================================================== */
export const getDepartmentTransferHistory = async (req, res) => {
  try {
    const { department } = req.params;
    const deptName = decodeURIComponent(department).trim();

    const grievances = await Grievance.find({
      $or: [
        { category: deptName, isRerouted: true },
        { involvedDepartments: deptName },
        { forwardedDepartments: deptName },
        { "transferHistory.fromDepartment": deptName },
        { "transferHistory.toDepartment": deptName }
      ]
    })
      .populate("issueTypeId", "issueName description")
      .populate("linkedGrievances", "category status currentCustodian assignedTo updatedAt")
      .sort({ updatedAt: -1 });

    res.json(grievances);
  } catch (err) {
    console.error("Get Department Transfer History Error:", err);
    res.status(500).json({ message: "Failed to fetch department transfer history" });
  }
};

/* =====================================================
   🔁 GET STAFF'S TRANSFERRED OUT / HANDLED GRIEVANCES
===================================================== */
export const getStaffTransferHistory = async (req, res) => {
  try {
    const { staffId } = req.params;
    const sId = staffId.trim().toUpperCase();

    const grievances = await Grievance.find({
      $or: [
        { "transferHistory.transferredBy": { $regex: new RegExp(`^${sId}$`, "i") } },
        { involvedStaff: { $regex: new RegExp(`^${sId}$`, "i") } }
      ]
    })
      .populate("issueTypeId", "issueName description")
      .populate("linkedGrievances", "category status currentCustodian assignedTo updatedAt")
      .sort({ updatedAt: -1 });

    res.json(grievances);
  } catch (err) {
    console.error("Get Staff Transfer History Error:", err);
    res.status(500).json({ message: "Failed to fetch staff transfer history" });
  }
};

/* =====================================================
   ❌ STAFF REJECTS GRIEVANCE
   → Sets status: "Rejected"
   → Saves rejectionReason, rejectedBy, rejectedByName, rejectedAt
   → Sends informational notification email to Dept Admin(s)
   → Sends rejection update email to Student
===================================================== */
export const rejectGrievanceByStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, rejectedBy, rejectedByName } = req.body;

    if (!reason || !reason.trim() || reason.trim().length < 5) {
      return res.status(400).json({ message: "A valid rejection reason (minimum 5 characters) is required." });
    }

    const grievance = await Grievance.findById(id);
    if (!grievance) {
      return res.status(404).json({ message: "Grievance not found." });
    }

    if (grievance.status === "Resolved") {
      return res.status(400).json({ message: "Cannot reject a resolved grievance." });
    }
    if (grievance.status === "Rejected") {
      return res.status(400).json({ message: "This grievance is already marked as rejected." });
    }

    const staffId = (rejectedBy || req.user?.id || "STAFF").toString().trim().toUpperCase();
    let staffFullName = rejectedByName ? rejectedByName.trim() : "";

    // Resolve staff name if not provided
    if (!staffFullName && staffId) {
      const staffUser =
        (await StaffUser.findOne({ id: staffId })) ||
        (await User.findOne({ id: staffId })) ||
        (await StaffRecord.findOne({ id: staffId }));
      if (staffUser) staffFullName = staffUser.fullName || staffId;
      else staffFullName = staffId;
    }

    const trimmedReason = reason.trim();

    grievance.status = "Rejected";
    grievance.rejectionReason = trimmedReason;
    grievance.resolutionRemarks = trimmedReason; // Keep in sync
    grievance.rejectedBy = staffId;
    grievance.rejectedByName = staffFullName;
    grievance.rejectedAt = new Date();
    grievance.updatedAt = new Date();

    await grievance.save();

    // 📧 Fire asynchronous email notifications (non-blocking for fast UI response)
    (async () => {
      try {
        // 1. Find Department Admin(s) of this grievance's category
        const deptName = grievance.category ? grievance.category.trim() : "";
        const deptAdmins = await StaffUser.find({
          adminDepartment: { $regex: new RegExp(`^${deptName}$`, "i") },
          isDeptAdmin: true
        }).select("email fullName id");

        const adminEmailsSent = new Set();

        for (const admin of deptAdmins) {
          if (admin.email && !adminEmailsSent.has(admin.email.toLowerCase())) {
            adminEmailsSent.add(admin.email.toLowerCase());
            await sendStaffRejectionNotificationToAdmin({
              grievance,
              staffName: staffFullName,
              staffId,
              rejectionReason: trimmedReason,
              adminEmail: admin.email,
              adminName: admin.fullName
            });
          }
        }

        // Fallback: check User collection if no admin email found in StaffUser
        if (adminEmailsSent.size === 0) {
          const fallbackAdmins = await User.find({
            adminDepartment: { $regex: new RegExp(`^${deptName}$`, "i") },
            isDeptAdmin: true
          }).select("email fullName id");

          for (const admin of fallbackAdmins) {
            if (admin.email && !adminEmailsSent.has(admin.email.toLowerCase())) {
              adminEmailsSent.add(admin.email.toLowerCase());
              await sendStaffRejectionNotificationToAdmin({
                grievance,
                staffName: staffFullName,
                staffId,
                rejectionReason: trimmedReason,
                adminEmail: admin.email,
                adminName: admin.fullName
              });
            }
          }
        }

        // 2. Notify student
        if (grievance.email) {
          await sendGrievanceRejectionToStudent({
            grievance,
            rejectionReason: trimmedReason,
            staffName: staffFullName
          });
        }
      } catch (notifyErr) {
        console.error("⚠️ Background rejection notification error:", notifyErr);
      }
    })();

    res.json({
      message: "✅ Grievance rejected successfully. Department Admin has been notified via email.",
      grievance
    });
  } catch (err) {
    console.error("Staff Reject Grievance Error:", err);
    res.status(500).json({ message: "Failed to reject grievance", error: err.message });
  }
};

/* =====================================================
   🗑️ CLEAR ALL GRIEVANCES (ADMIN / DEV)
===================================================== */
export const clearAllGrievances = async (req, res) => {
  try {
    const Message = (await import("../models/MessageModel.js")).default;
    const StaffPool = (await import("../models/StaffPool.js")).default;

    const grievanceResult = await Grievance.deleteMany({});
    const messageResult = await Message.deleteMany({});
    await StaffPool.updateMany({}, { $set: { assignedGrievanceIds: [], currentLoad: 0 } });

    res.json({
      message: `✅ Cleared all grievances (${grievanceResult.deletedCount}) and chat messages (${messageResult.deletedCount}).`,
      deletedGrievances: grievanceResult.deletedCount,
      deletedMessages: messageResult.deletedCount
    });
  } catch (err) {
    console.error("Clear All Grievances Error:", err);
    res.status(500).json({ message: "Failed to clear grievances", error: err.message });
  }
};


