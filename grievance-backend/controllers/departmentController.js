import Department from "../models/Department.js";
import Grievance from "../models/GrievanceModel.js";
import User from "../models/UserModel.js";
import StaffUser from "../models/StaffUser.js";
import IssueType from "../models/IssueType.js";
import RoutingRule from "../models/RoutingRule.js";
import AdminStaffModel from "../models/AdminStaffModel.js";

let initializedDefaults = false;
const ensureDefaultPermissions = async () => {
  if (initializedDefaults) return;
  try {
    await Department.updateOne(
      { name: { $regex: /^student section$/i }, allowStudentRecords: { $exists: false } },
      { $set: { allowStudentRecords: true } }
    );
    await Department.updateOne(
      { name: { $regex: /^hr$/i }, allowStaffRecords: { $exists: false } },
      { $set: { allowStaffRecords: true } }
    );
    initializedDefaults = true;
  } catch (e) {
    console.warn("Could not ensure default permissions:", e.message);
  }
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
// =====================================================
export const getAllDepartmentsAdmin = async (req, res) => {
  try {
    await ensureDefaultPermissions();
    const departments = await Department.find({}).sort({ createdAt: -1 });

    // Enrich with live counts and multi-department admin resolution
    const enriched = await Promise.all(
      departments.map(async (dept) => {
        const deptObj = dept.toObject();
        const deptName = dept.name ? dept.name.trim() : "";
        const deptEscaped = deptName.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
        const deptRegex = new RegExp("^" + deptEscaped + "$", "i");

        const adminQuery = {
          $or: [
            { adminDepartment: deptRegex },
            { adminDepartments: deptRegex }
          ],
          isDeptAdmin: true
        };

        const staffCountQuery = {
          $or: [
            { adminDepartment: deptRegex },
            { adminDepartments: deptRegex },
            { staffDepartment: deptRegex }
          ]
        };

        const [totalGrievances, pendingGrievances, staffMembers, userMembers, staffAdmins, userAdmins, adminStaffRecs, issueTypesCount] =
          await Promise.all([
            Grievance.countDocuments({ category: deptRegex }),
            Grievance.countDocuments({
              category: deptRegex,
              status: { $in: ["Pending", "In Progress", "Assigned"] }
            }),
            StaffUser.find(staffCountQuery).select("id").lean(),
            User.find(staffCountQuery).select("id").lean(),
            StaffUser.find(adminQuery).select("id fullName email isDeptAdmin").lean(),
            User.find(adminQuery).select("id fullName email isDeptAdmin").lean(),
            AdminStaffModel.find(adminQuery).select("id fullName isDeptAdmin").lean(),
            IssueType.countDocuments({ department: deptRegex, isActive: true })
          ]);

        // Merge assigned staff to count distinct staff
        const uniqueStaffIds = new Set();
        (staffMembers || []).forEach(s => s && s.id && uniqueStaffIds.add(String(s.id).trim().toUpperCase()));
        (userMembers || []).forEach(u => u && u.id && uniqueStaffIds.add(String(u.id).trim().toUpperCase()));
        const assignedStaffCount = uniqueStaffIds.size;

        // Merge admins across StaffUser, User, and AdminStaffModel
        const adminMap = new Map();
        [...(staffAdmins || []), ...(userAdmins || []), ...(adminStaffRecs || [])].forEach(a => {
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

        deptObj.stats = {
          totalGrievances,
          pendingGrievances,
          assignedStaffCount,
          issueTypesCount
        };

        if (deptAdminsList.length > 0) {
          deptObj.currentAdmin = {
            id: deptAdminsList.map(a => a.id).join(", "),
            fullName: deptAdminsList.map(a => a.fullName || a.id).join(", "),
            email: deptAdminsList[0].email || ""
          };
          deptObj.currentAdmins = deptAdminsList;
        } else {
          deptObj.currentAdmin = null;
          deptObj.currentAdmins = [];
        }

        return deptObj;
      })
    );

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
    const { name, code, description, targetAudience, isAcademic, allowStudentRecords, allowStaffRecords, allowRegisteredStudents, allowRegisteredStaff } = req.body;

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

    const newDept = new Department({
      name: cleanName,
      code: code ? code.trim().toUpperCase() : undefined,
      description: description ? description.trim() : "",
      targetAudience: targetAudience || "both",
      isAcademic: !!isAcademic,
      allowStudentRecords: !!allowStudentRecords,
      allowStaffRecords: !!allowStaffRecords,
      allowRegisteredStudents: !!allowRegisteredStudents,
      allowRegisteredStaff: !!allowRegisteredStaff,
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
    const { name, code, description, targetAudience, isAcademic, isActive, allowStudentRecords, allowStaffRecords, allowRegisteredStudents, allowRegisteredStaff } = req.body;

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
    if (allowStaffRecords !== undefined) dept.allowStaffRecords = !!allowStaffRecords;
    if (allowRegisteredStudents !== undefined) dept.allowRegisteredStudents = !!allowRegisteredStudents;
    if (allowRegisteredStaff !== undefined) dept.allowRegisteredStaff = !!allowRegisteredStaff;

    await dept.save();

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
      const isStudentSection = cleanName.toLowerCase() === "student section";
      const isHR = cleanName.toLowerCase() === "hr";
      return res.status(200).json({
        name: cleanName,
        allowStudentRecords: isStudentSection,
        allowStaffRecords: isHR,
        allowRegisteredStudents: false,
        allowRegisteredStaff: false
      });
    }

    res.status(200).json({
      name: dept.name,
      allowStudentRecords: dept.allowStudentRecords !== undefined ? dept.allowStudentRecords : (dept.name.toLowerCase() === "student section"),
      allowStaffRecords: dept.allowStaffRecords !== undefined ? dept.allowStaffRecords : (dept.name.toLowerCase() === "hr"),
      allowRegisteredStudents: !!dept.allowRegisteredStudents,
      allowRegisteredStaff: !!dept.allowRegisteredStaff
    });
  } catch (error) {
    console.error("Error fetching dept permissions:", error);
    res.status(500).json({ message: "Failed to fetch department permissions" });
  }
};

