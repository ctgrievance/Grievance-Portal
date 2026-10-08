import Department from "../models/Department.js";
import Grievance from "../models/GrievanceModel.js";
import User from "../models/UserModel.js";
import StaffUser from "../models/StaffUser.js";
import IssueType from "../models/IssueType.js";
import RoutingRule from "../models/RoutingRule.js";
import AdminStaffModel from "../models/AdminStaffModel.js";

let initializedDefaults = false;
const ensureDefaultPermissions = async () => {
  // Permissions are strictly driven by database configuration without hardcoded overrides
  return;
};

// =====================================================
// 1️⃣ GET ACTIVE DEPARTMENTS (Public & Authenticated)
// Used by forms, dropdowns, registration, transfer modals
// =====================================================
export const getActiveDepartments = async (req, res) => {
  try {
    await ensureDefaultPermissions();
    const { targetAudience, isAcademic } = req.query;
    const filter = { isActive: true };

    if (targetAudience) {
      filter.$or = [
        { targetAudience: targetAudience },
        { targetAudience: "both" },
        { targetAudience: { $exists: false } }
      ];
    }

    if (isAcademic !== undefined) {
      filter.isAcademic = isAcademic === "true";
    }

    const departments = await Department.find(filter).sort({ name: 1 });
    res.status(200).json(departments);
  } catch (error) {
    console.error("Error fetching active departments:", error);
    res.status(500).json({ message: "Failed to fetch departments" });
  }
};

// =====================================================
// 2️⃣ GET ALL DEPARTMENTS WITH STATS (Super Admin View)
// Ultra-fast single-pass batch aggregation (< 100ms)
// =====================================================
export const getAllDepartmentsAdmin = async (req, res) => {
  try {
    await ensureDefaultPermissions();
    const departments = await Department.find({}).sort({ createdAt: -1 });

    // Helper to normalize strings for robust matching across variants (e.g. '&' vs 'and', extra spaces)
    const normKey = (s) =>
      String(s || "")
        .trim()
        .toLowerCase()
        .replace(/\s*(?:&|and)\s*/g, " and ")
        .replace(/\s+/g, " ");

    // 1️⃣ Run all aggregation & collection fetches in parallel (Only 5 fast batch queries instead of 200+)
    const [grievanceStats, issueStats, staffUsers, regularUsers, adminStaffRecs] =
      await Promise.all([
        Grievance.aggregate([
          {
            $group: {
              _id: { $toLower: { $trim: { input: "$category" } } },
              total: { $sum: 1 },
              pending: {
                $sum: {
                  $cond: [{ $in: ["$status", ["Pending", "In Progress", "Assigned"]] }, 1, 0]
                }
              }
            }
          }
        ]),
        IssueType.aggregate([
          { $match: { isActive: true } },
          {
            $group: {
              _id: { $toLower: { $trim: { input: "$department" } } },
              count: { $sum: 1 }
            }
          }
        ]),
        StaffUser.find({
          role: { $in: ["staff", "admin"], $ne: "student" }
        })
          .select("id fullName email role isDeptAdmin isMasterAdmin adminDepartment adminDepartments staffDepartment")
          .lean(),
        User.find({
          role: { $in: ["staff", "admin"], $ne: "student" }
        })
          .select("id fullName email role isDeptAdmin isMasterAdmin adminDepartment adminDepartments staffDepartment")
          .lean(),
        AdminStaffModel.find({ isDeptAdmin: true })
          .select("id fullName email isDeptAdmin adminDepartment adminDepartments")
          .lean()
      ]);

    // 2️⃣ Build lookup maps for O(1) in-memory retrieval
    const grievanceMap = new Map();
    (grievanceStats || []).forEach((g) => {
      if (!g._id) return;
      const k = normKey(g._id);
      const existing = grievanceMap.get(k) || { total: 0, pending: 0 };
      existing.total += g.total || 0;
      existing.pending += g.pending || 0;
      grievanceMap.set(k, existing);
    });

    const issueMap = new Map();
    (issueStats || []).forEach((it) => {
      if (!it._id) return;
      const k = normKey(it._id);
      issueMap.set(k, (issueMap.get(k) || 0) + (it.count || 0));
    });

    // 3️⃣ In-memory enrichment of departments (0ms in RAM)
    const enriched = departments.map((dept) => {
      const deptObj = dept.toObject();
      const deptNorm = normKey(dept.name);

      const checkMatchesDept = (u) => {
        if (!u) return false;
        if (u.adminDepartment && normKey(u.adminDepartment) === deptNorm) return true;
        if (Array.isArray(u.adminDepartments) && u.adminDepartments.some((d) => normKey(d) === deptNorm)) return true;
        if (u.staffDepartment && normKey(u.staffDepartment) === deptNorm) return true;
        return false;
      };

      const checkMatchesAdmin = (u) => {
        if (!u || !u.isDeptAdmin) return false;
        // Authoritative: If adminDepartments array is present and non-empty, match strictly against it
        if (Array.isArray(u.adminDepartments) && u.adminDepartments.length > 0) {
          return u.adminDepartments.some((d) => normKey(d) === deptNorm);
        }
        if (u.adminDepartment && normKey(u.adminDepartment) === deptNorm) return true;
        return false;
      };

      // Count distinct non-master staff
      const uniqueStaffIds = new Set();
      (staffUsers || []).forEach((s) => {
        if (s && s.id && !s.isMasterAdmin && s.role !== "student" && checkMatchesDept(s)) {
          uniqueStaffIds.add(String(s.id).trim().toUpperCase());
        }
      });
      (regularUsers || []).forEach((u) => {
        if (u && u.id && !u.isMasterAdmin && u.role !== "student" && checkMatchesDept(u)) {
          uniqueStaffIds.add(String(u.id).trim().toUpperCase());
        }
      });

      // Resolve admins
      const adminMap = new Map();
      const candidateAdmins = [
        ...(staffUsers || []).filter(checkMatchesAdmin),
        ...(regularUsers || []).filter(checkMatchesAdmin),
        ...(adminStaffRecs || []).filter(checkMatchesAdmin)
      ];

      candidateAdmins.forEach((a) => {
        if (a && a.id) {
          const key = String(a.id).trim().toUpperCase();
          if (!adminMap.has(key)) {
            adminMap.set(key, { ...a });
          } else {
            const existing = adminMap.get(key);
            if (!existing.fullName && a.fullName) existing.fullName = a.fullName;
            if (!existing.email && a.email) existing.email = a.email;
          }
        }
      });
      const deptAdminsList = Array.from(adminMap.values());

      const gStat = grievanceMap.get(deptNorm) || { total: 0, pending: 0 };
      const issueCount = issueMap.get(deptNorm) || 0;

      deptObj.stats = {
        totalGrievances: gStat.total,
        pendingGrievances: gStat.pending,
        assignedStaffCount: uniqueStaffIds.size,
        issueTypesCount: issueCount
      };

      if (deptAdminsList.length > 0) {
        deptObj.currentAdmin = {
          id: deptAdminsList.map((a) => a.id).join(", "),
          fullName: deptAdminsList.map((a) => a.fullName || a.id).join(", "),
          email: deptAdminsList[0].email || ""
        };
        deptObj.currentAdmins = deptAdminsList;
      } else {
        deptObj.currentAdmin = null;
        deptObj.currentAdmins = [];
      }

      return deptObj;
    });

    res.status(200).json(enriched);
  } catch (error) {
    console.error("Error fetching admin departments:", error);
    res.status(500).json({ message: "Failed to load departments" });
  }
};

// =====================================================
// 3️⃣ CREATE DEPARTMENT (Super Admin)
// =====================================================
export const createDepartment = async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      targetAudience,
      isAcademic,
      allowStudentRecords,
      studentRecordsMode,
      allowStaffRecords,
      staffRecordsMode,
      allowRegisteredStudents,
      registeredStudentsMode,
      allowRegisteredStaff,
      registeredStaffMode,
      programs
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Department name is required" });
    }

    const cleanName = name.trim();

    // Check duplicate
    const existing = await Department.findOne({
      name: { $regex: new RegExp(`^${cleanName}$`, "i") }
    });
    if (existing) {
      return res.status(400).json({ message: `Department "${cleanName}" already exists.` });
    }

    const cleanedPrograms = Array.isArray(programs)
      ? Array.from(new Set(programs.map(p => (typeof p === 'string' ? p.trim() : '')).filter(Boolean)))
      : [];

    const newDept = new Department({
      name: cleanName,
      code: code ? code.trim().toUpperCase() : undefined,
      description: description ? description.trim() : "",
      targetAudience: targetAudience || "both",
      isAcademic: !!isAcademic,
      allowStudentRecords: !!allowStudentRecords,
      studentRecordsMode: studentRecordsMode === "read" ? "read" : "write",
      allowStaffRecords: !!allowStaffRecords,
      staffRecordsMode: staffRecordsMode === "read" ? "read" : "write",
      allowRegisteredStudents: !!allowRegisteredStudents,
      registeredStudentsMode: registeredStudentsMode === "read" ? "read" : "write",
      allowRegisteredStaff: !!allowRegisteredStaff,
      registeredStaffMode: registeredStaffMode === "read" ? "read" : "write",
      programs: cleanedPrograms,
      isActive: true
    });

    await newDept.save();

    // Automatically seed an "Others" issue type for this department
    try {
      const existingOthers = await IssueType.findOne({
        department: cleanName,
        issueName: "Others"
      });
      if (!existingOthers) {
        await IssueType.create({
          department: cleanName,
          issueName: "Others",
          description: "General or unlisted issue requiring admin review",
          isActive: true,
          isSystemReserved: true,
          targetAudience: targetAudience === "staff" ? "staff" : "student"
        });
      }
    } catch (err) {
      console.warn("Could not auto-create Others issue type for new dept:", err.message);
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("departments:updated", { action: "create", department: newDept });
    }

    res.status(201).json({
      message: `✅ Department "${newDept.name}" created successfully`,
      department: newDept
    });
  } catch (error) {
    console.error("Error creating department:", error);
    res.status(500).json({ message: error.message || "Failed to create department" });
  }
};

// =====================================================
// 4️⃣ UPDATE DEPARTMENT (Super Admin)
// Supports renaming with safe cascade updates
// =====================================================
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      code,
      description,
      targetAudience,
      isAcademic,
      isActive,
      allowStudentRecords,
      studentRecordsMode,
      allowStaffRecords,
      staffRecordsMode,
      allowRegisteredStudents,
      registeredStudentsMode,
      allowRegisteredStaff,
      registeredStaffMode,
      programs
    } = req.body;

    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ message: "Department not found" });
    }

    const oldName = dept.name;
    const newName = name ? name.trim() : oldName;

    // Check name collision if name changed
    if (newName.toLowerCase() !== oldName.toLowerCase()) {
      const collision = await Department.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${newName}$`, "i") }
      });
      if (collision) {
        return res.status(400).json({ message: `Department name "${newName}" is already taken.` });
      }

      // Safe Cascade Rename across related collections
      await Promise.all([
        Grievance.updateMany({ category: oldName }, { $set: { category: newName } }),
        User.updateMany({ adminDepartment: oldName }, { $set: { adminDepartment: newName } }),
        User.updateMany({ adminDepartments: oldName }, { $set: { "adminDepartments.$": newName } }),
        StaffUser.updateMany({ adminDepartment: oldName }, { $set: { adminDepartment: newName } }),
        StaffUser.updateMany({ adminDepartments: oldName }, { $set: { "adminDepartments.$": newName } }),
        AdminStaffModel.updateMany({ adminDepartment: oldName }, { $set: { adminDepartment: newName } }),
        AdminStaffModel.updateMany({ adminDepartments: oldName }, { $set: { "adminDepartments.$": newName } }),
        IssueType.updateMany({ department: oldName }, { $set: { department: newName } }),
        RoutingRule.updateMany({ department: oldName }, { $set: { department: newName } })
      ]);
      console.log(`🔄 Cascaded department rename: "${oldName}" -> "${newName}"`);
    }

    dept.name = newName;
    if (code !== undefined) dept.code = code.trim().toUpperCase();
    if (description !== undefined) dept.description = description.trim();
    if (targetAudience !== undefined) dept.targetAudience = targetAudience;
    if (isAcademic !== undefined) dept.isAcademic = !!isAcademic;
    if (isActive !== undefined) dept.isActive = !!isActive;
    if (allowStudentRecords !== undefined) dept.allowStudentRecords = !!allowStudentRecords;
    if (studentRecordsMode !== undefined) dept.studentRecordsMode = studentRecordsMode === "read" ? "read" : "write";
    if (allowStaffRecords !== undefined) dept.allowStaffRecords = !!allowStaffRecords;
    if (staffRecordsMode !== undefined) dept.staffRecordsMode = staffRecordsMode === "read" ? "read" : "write";
    if (allowRegisteredStudents !== undefined) dept.allowRegisteredStudents = !!allowRegisteredStudents;
    if (registeredStudentsMode !== undefined) dept.registeredStudentsMode = registeredStudentsMode === "read" ? "read" : "write";
    if (allowRegisteredStaff !== undefined) dept.allowRegisteredStaff = !!allowRegisteredStaff;
    if (registeredStaffMode !== undefined) dept.registeredStaffMode = registeredStaffMode === "read" ? "read" : "write";
    if (programs !== undefined && Array.isArray(programs)) {
      dept.programs = Array.from(new Set(programs.map(p => (typeof p === 'string' ? p.trim() : '')).filter(Boolean)));
    }

    await dept.save();

    const ioUpdate = req.app.get("io");
    if (ioUpdate) {
      ioUpdate.emit("departments:updated", { action: "update", department: dept });
    }

    res.status(200).json({
      message: `✅ Department "${dept.name}" updated successfully`,
      department: dept
    });
  } catch (error) {
    console.error("Error updating department:", error);
    res.status(500).json({ message: error.message || "Failed to update department" });
  }
};

// =====================================================
// 5️⃣ TOGGLE ACTIVE STATUS (Super Admin)
// Safe Soft-Delete / Re-enable
// =====================================================
export const toggleDepartmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ message: "Department not found" });
    }

    dept.isActive = !dept.isActive;
    await dept.save();

    const ioToggle = req.app.get("io");
    if (ioToggle) {
      ioToggle.emit("departments:updated", { action: "toggle", department: dept });
    }

    res.status(200).json({
      message: `Department "${dept.name}" is now ${dept.isActive ? "ACTIVE" : "INACTIVE"}`,
      isActive: dept.isActive,
      department: dept
    });
  } catch (error) {
    console.error("Error toggling department status:", error);
    res.status(500).json({ message: "Failed to update department status" });
  }
};

// =====================================================
// 6️⃣ SAFE DELETE DEPARTMENT (Super Admin)
// Strict Guard: Rejects if grievances or staff are linked
// =====================================================
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const dept = await Department.findById(id);
    if (!dept) {
      return res.status(404).json({ message: "Department not found" });
    }

    // Safety Checks: count linked records
    const [grievanceCount, staffUserCount, legacyUserCount] = await Promise.all([
      Grievance.countDocuments({ category: dept.name }),
      StaffUser.countDocuments({ adminDepartment: dept.name }),
      User.countDocuments({ adminDepartment: dept.name })
    ]);

    const totalStaff = Math.max(staffUserCount, legacyUserCount);

    if (grievanceCount > 0 || totalStaff > 0) {
      return res.status(400).json({
        message: `❌ Cannot delete "${dept.name}". There are currently ${grievanceCount} grievance(s) and ${totalStaff} staff member(s) linked to this department. Please reassign or clear linked records before deleting to preserve audit history and prevent broken accounts.`,
        stats: {
          grievances: grievanceCount,
          staff: totalStaff
        }
      });
    }

    // If completely clear, remove linked IssueTypes and RoutingRules
    await Promise.all([
      IssueType.deleteMany({ department: dept.name }),
      RoutingRule.deleteMany({ department: dept.name })
    ]);

    await Department.findByIdAndDelete(id);

    const ioDel = req.app.get("io");
    if (ioDel) {
      ioDel.emit("departments:updated", { action: "delete", id });
    }

    res.status(200).json({
      message: `✅ Department "${dept.name}" and its empty configurations were permanently deleted.`
    });
  } catch (error) {
    console.error("Error deleting department:", error);
    res.status(500).json({ message: error.message || "Failed to delete department" });
  }
};

// =====================================================
// 7️⃣ GET DEPARTMENT PERMISSIONS (Live check for Dashboards)
// =====================================================
export const getDepartmentPermissions = async (req, res) => {
  try {
    await ensureDefaultPermissions();
    const { name } = req.params;
    if (!name) return res.status(400).json({ message: "Department name is required" });

    const cleanName = decodeURIComponent(name).trim();
    let dept = await Department.findOne({
      name: { $regex: new RegExp(`^${cleanName}$`, "i") }
    });

    if (!dept) {
      // Fallback robust matching for "&" vs "and" variations
      const allDepts = await Department.find({});
      const normQuery = cleanName.toLowerCase().replace(/&/g, 'and');
      dept = allDepts.find(d => d.name.toLowerCase().replace(/&/g, 'and') === normQuery);
    }

    if (!dept) {
      return res.status(200).json({
        name: cleanName,
        allowStudentRecords: false,
        studentRecordsMode: "write",
        allowStaffRecords: false,
        staffRecordsMode: "write",
        allowRegisteredStudents: false,
        registeredStudentsMode: "write",
        allowRegisteredStaff: false,
        registeredStaffMode: "write"
      });
    }

    res.status(200).json({
      name: dept.name,
      allowStudentRecords: !!dept.allowStudentRecords,
      studentRecordsMode: dept.studentRecordsMode || "write",
      allowStaffRecords: !!dept.allowStaffRecords,
      staffRecordsMode: dept.staffRecordsMode || "write",
      allowRegisteredStudents: !!dept.allowRegisteredStudents,
      registeredStudentsMode: dept.registeredStudentsMode || "write",
      allowRegisteredStaff: !!dept.allowRegisteredStaff,
      registeredStaffMode: dept.registeredStaffMode || "write"
    });
  } catch (error) {
    console.error("Error fetching dept permissions:", error);
    res.status(500).json({ message: "Failed to fetch department permissions" });
  }
};

