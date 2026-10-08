import RoutingRule from "../models/RoutingRule.js";
import IssueType from "../models/IssueType.js";
import StaffUser from "../models/StaffUser.js";
import User from "../models/UserModel.js";
import StaffRecord from "../models/StaffRecord.js";
import Grievance from "../models/GrievanceModel.js";
import Department from "../models/Department.js";
import { sendRoutingReminderEmail } from "../utils/emailService.js";

// Create Routing Rule
export const createRoutingRule = async (req, res) => {
  try {
    const { issueTypeId, department, assignedStaff, assignmentMode, targetAudience } = req.body;

    if (!issueTypeId || !department || !assignedStaff || !assignmentMode) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate issue type exists
    const issueType = await IssueType.findById(issueTypeId);
    if (!issueType) {
      return res.status(404).json({ message: "Issue type not found" });
    }

    const audience = targetAudience || issueType.targetAudience || "student";

    // For single assign mode, enforce exactly 1 staff member
    const finalStaff = assignmentMode === "single" && Array.isArray(assignedStaff)
      ? assignedStaff.slice(0, 1)
      : assignedStaff;

    // Check if routing rule already exists for this issue type and department
    const deptRegex = new RegExp(`^${(department || "").trim()}$`, "i");
    const existingRule = await RoutingRule.findOne({ issueTypeId, department: { $regex: deptRegex }, isActive: true });
    if (existingRule) {
      return res.status(400).json({ message: "An active routing rule already exists for this issue type in this department" });
    }

    const routingRule = new RoutingRule({
      issueTypeId,
      department: department.trim(),
      targetAudience: audience,
      assignedStaff: finalStaff.map(staff => ({
        staffId: staff.staffId,
        staffName: staff.staffName,
        staffEmail: staff.staffEmail || "",
        isAvailable: staff.isAvailable !== undefined ? staff.isAvailable : true,
        roundRobinIndex: 0
      })),
      assignmentMode
    });

    await routingRule.save();
    res.status(201).json({ message: "Routing rule created successfully", routingRule });
  } catch (error) {
    console.error("Error creating routing rule:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get All Routing Rules
export const getAllRoutingRules = async (req, res) => {
  try {
    const { department, targetAudience } = req.query;
    const filter = { isActive: true };
    if (department) filter.department = department;
    if (targetAudience) {
      if (targetAudience === "student") {
        filter.$or = [{ targetAudience: "student" }, { targetAudience: { $exists: false } }, { targetAudience: null }];
      } else {
        filter.targetAudience = targetAudience;
      }
    }
    const routingRules = await RoutingRule.find(filter)
      .populate('issueTypeId')
      .sort({ department: 1 });
    res.status(200).json(routingRules);
  } catch (error) {
    console.error("Error fetching routing rules:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get Routing Rules by Department
export const getRoutingRulesByDepartment = async (req, res) => {
  try {
    const { department } = req.params;
    const { targetAudience } = req.query;

    const filter = { department, isActive: true };
    const audience = targetAudience || "student";
    if (audience === "student") {
      filter.$or = [{ targetAudience: "student" }, { targetAudience: { $exists: false } }, { targetAudience: null }];
    } else {
      filter.targetAudience = audience;
    }

    const routingRules = await RoutingRule.find(filter)
      .populate('issueTypeId')
      .sort({ 'issueTypeId.issueName': 1 });
    res.status(200).json(routingRules);
  } catch (error) {
    console.error("Error fetching department routing rules:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get Routing Rule by Issue Type
export const getRoutingRuleByIssueType = async (req, res) => {
  try {
    const { issueTypeId } = req.params;
    const routingRule = await RoutingRule.findOne({ issueTypeId, isActive: true })
      .populate('issueTypeId');
    
    if (!routingRule) {
      return res.status(404).json({ message: "No routing rule found for this issue type" });
    }
    
    res.status(200).json(routingRule);
  } catch (error) {
    console.error("Error fetching routing rule:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update Routing Rule
export const updateRoutingRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { issueTypeId, department, assignedStaff, assignmentMode, targetAudience, isActive } = req.body;

    const existingRule = await RoutingRule.findById(id);
    if (!existingRule) {
      return res.status(404).json({ message: "Routing rule not found" });
    }

    const updateData = { updatedAt: Date.now() };

    if (issueTypeId) {
      const issueType = await IssueType.findById(issueTypeId);
      if (!issueType) {
        return res.status(404).json({ message: "Issue type not found" });
      }

      // Check if duplicate active rule already exists for this issueTypeId in this department
      const targetDept = department || existingRule.department;
      const deptRegex = new RegExp(`^${(targetDept || "").trim()}$`, "i");
      const duplicateRule = await RoutingRule.findOne({
        _id: { $ne: id },
        issueTypeId,
        department: { $regex: deptRegex },
        isActive: true
      });

      if (duplicateRule) {
        return res.status(400).json({
          message: "An active routing rule already exists for this issue type in this department"
        });
      }

      updateData.issueTypeId = issueTypeId;
    }

    if (department) updateData.department = department.trim();
    if (targetAudience) updateData.targetAudience = targetAudience;
    if (assignmentMode) updateData.assignmentMode = assignmentMode;
    if (isActive !== undefined) updateData.isActive = isActive;

    if (assignedStaff) {
      const mode = assignmentMode || existingRule.assignmentMode || "single";
      const finalStaff = mode === "single" && Array.isArray(assignedStaff)
        ? assignedStaff.slice(0, 1)
        : assignedStaff;

      updateData.assignedStaff = finalStaff.map(staff => ({
        staffId: staff.staffId,
        staffName: staff.staffName,
        staffEmail: staff.staffEmail || "",
        isAvailable: staff.isAvailable !== undefined ? staff.isAvailable : true,
        roundRobinIndex: staff.roundRobinIndex || 0
      }));
    }

    const routingRule = await RoutingRule.findByIdAndUpdate(id, updateData, { new: true })
      .populate('issueTypeId');

    res.status(200).json({ message: "Routing rule updated successfully", routingRule });
  } catch (error) {
    console.error("Error updating routing rule:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete Routing Rule (Soft delete)
export const deleteRoutingRule = async (req, res) => {
  try {
    const { id } = req.params;
    const routingRule = await RoutingRule.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: Date.now() },
      { new: true }
    );

    if (!routingRule) {
      return res.status(404).json({ message: "Routing rule not found" });
    }

    res.status(200).json({ message: "Routing rule deleted successfully" });
  } catch (error) {
    console.error("Error deleting routing rule:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Auto-assign grievance based on routing rule
export const autoAssignGrievance = async (issueTypeId, department) => {
  try {
    console.log(`🤖 Auto-assignment requested: issueTypeId=${issueTypeId}, department=${department}`);
    
    // Look up active routing rule with case-insensitive department matching
    const deptRegex = new RegExp(`^${(department || "").trim()}$`, "i");
    const routingRule = await RoutingRule.findOne({
      issueTypeId,
      department: { $regex: deptRegex },
      isActive: true
    });
    
    if (!routingRule) {
      console.log(`❌ No routing rule found for issueTypeId=${issueTypeId}, department=${department}`);
      return null; // No routing rule found, will use manual assignment
    }

    console.log(`✅ Found routing rule: ${routingRule._id}, mode=${routingRule.assignmentMode}`);

    const rawAvailableStaff = routingRule.assignedStaff.filter(s => s.isAvailable);
    
    if (rawAvailableStaff.length === 0) {
      console.log(`❌ No available staff in routing rule`);
      return null; // No available staff, will use manual assignment
    }

    // 🛡️ RUNTIME VALIDATION & SELF-HEALING:
    // Ensure candidates are active staff members in this department, and NOT Department Admins or Super Admins
    const validStaffCandidates = [];
    const staleStaffIds = [];

    for (const candidate of rawAvailableStaff) {
      if (!candidate.staffId) continue;

      const userRecord = await User.findOne({ id: candidate.staffId }).lean()
        || await StaffUser.findOne({ id: candidate.staffId }).lean();

      if (!userRecord) {
        console.log(`⚠️ Staff ${candidate.staffId} (${candidate.staffName}) not found in User/StaffUser database.`);
        staleStaffIds.push(candidate.staffId);
        continue;
      }

      // Department Admins and Master Admin must NEVER be auto-assigned staff tickets
      if (userRecord.isDeptAdmin || userRecord.isMasterAdmin || userRecord.role === "admin") {
        console.log(`⚠️ Excluding ${candidate.staffName} (${candidate.staffId}) from auto-assignment because they are an Administrator.`);
        staleStaffIds.push(candidate.staffId);
        continue;
      }

      // Department mismatch check
      const userDept = (userRecord.adminDepartment || userRecord.staffDepartment || "").trim().toLowerCase();
      const ruleDept = (department || "").trim().toLowerCase();
      if (userDept && userDept !== ruleDept) {
        console.log(`⚠️ Excluding ${candidate.staffName} (${candidate.staffId}) from auto-assignment because their department (${userDept}) does not match rule department (${ruleDept}).`);
        staleStaffIds.push(candidate.staffId);
        continue;
      }

      validStaffCandidates.push(candidate);
    }

    // Self-heal: Clean stale staff IDs from this routing rule in the background
    if (staleStaffIds.length > 0) {
      RoutingRule.updateOne(
        { _id: routingRule._id },
        { $pull: { assignedStaff: { staffId: { $in: staleStaffIds } } } }
      ).catch(cleanErr => console.error("Self-healing routing rule error:", cleanErr));
    }

    if (validStaffCandidates.length === 0) {
      console.log(`❌ No eligible staff candidates remaining after validation in routing rule for ${department}`);
      return null;
    }

    console.log(`✅ Eligible available staff: ${validStaffCandidates.length}`);

    let assignedStaff;
    const mode = routingRule.assignmentMode;

    if (mode === "single") {
      // 🎯 1. SINGLE ASSIGN: Always assign directly to the 1 dedicated staff
      assignedStaff = validStaffCandidates[0];
    } else if (mode === "round_robin") {
      // 🔄 2. ROUND ROBIN (Series Rotation & Workload Balancing):
      // Calculate current active ticket load for each candidate
      const candidateStats = await Promise.all(
        validStaffCandidates.map(async (candidate) => {
          let activeCount = 0;
          try {
            activeCount = await Grievance.countDocuments({
              assignedTo: candidate.staffId,
              status: { $in: ["Pending", "Assigned", "In Progress", "In-Progress"] }
            });
          } catch (_) {}
          return {
            candidate,
            rrIndex: Number(candidate.roundRobinIndex) || 0,
            activeCount
          };
        })
      );

      // Sort: 1st by lowest roundRobinIndex (series turn), 2nd by lowest activeCount (tie-breaker for load balance)
      candidateStats.sort((a, b) => {
        if (a.rrIndex !== b.rrIndex) return a.rrIndex - b.rrIndex;
        return a.activeCount - b.activeCount;
      });

      assignedStaff = candidateStats[0].candidate;
      
      // Increment roundRobinIndex for next assignment in series
      await RoutingRule.updateOne(
        { _id: routingRule._id, "assignedStaff.staffId": assignedStaff.staffId },
        { $inc: { "assignedStaff.$.roundRobinIndex": 1 } }
      );
    } else if (mode === "pool_accept") {
      // 👥 3. OPEN TEAM POOL: Tickets stay in open queue for all assigned staff until one clicks Accept
      assignedStaff = { staffId: null, staffName: null };
    }

    console.log(`✅ Assigned to: ${assignedStaff.staffName} (${assignedStaff.staffId}) in ${mode} mode`);

    // Resolve staff email if not present in rule
    let staffEmail = assignedStaff.staffEmail || "";
    if (!staffEmail && assignedStaff.staffId) {
      try {
        const staffUser = await StaffUser.findOne({ id: assignedStaff.staffId })
          || await User.findOne({ id: assignedStaff.staffId })
          || await StaffRecord.findOne({ id: assignedStaff.staffId });
        if (staffUser && staffUser.email) {
          staffEmail = staffUser.email;
        }
      } catch (lookupErr) {
        console.warn("⚠️ Could not lookup staff email:", lookupErr.message);
      }
    }

    return {
      staffId: assignedStaff.staffId,
      staffName: assignedStaff.staffName,
      staffEmail,
      assignmentMode: mode
    };
  } catch (error) {
    console.error("❌ Error in auto-assignment:", error);
    return null;
  }
};

/**
 * 📊 GET ROUTING HEALTH AUDIT
 * Aggregates all departments, their issue types, and routing rules.
 * Flags unrouted issue types and sorts departments by highest deficit first.
 */
export const getRoutingHealthAudit = async (req, res) => {
  try {
    // 1. Fetch departments from Department collection and distinct IssueType departments
    const officialDepts = await Department.find({ isActive: true }).lean();
    const issueTypeDepts = await IssueType.distinct("department", { isActive: true });

    // Map of normalized department name -> metadata
    const deptMap = new Map();

    officialDepts.forEach((d) => {
      if (d.name) {
        const key = d.name.trim().toLowerCase();
        deptMap.set(key, {
          name: d.name.trim(),
          code: d.code || "",
          description: d.description || "",
          targetAudience: d.targetAudience || "both",
          lastRoutingReminderAt: d.lastRoutingReminderAt || null,
          lastRoutingReminderTo: d.lastRoutingReminderTo || ""
        });
      }
    });

    issueTypeDepts.forEach((name) => {
      if (name && name.trim()) {
        const key = name.trim().toLowerCase();
        if (!deptMap.has(key)) {
          deptMap.set(key, {
            name: name.trim(),
            code: "",
            description: "",
            targetAudience: "both",
            lastRoutingReminderAt: null,
            lastRoutingReminderTo: ""
          });
        }
      }
    });

    // 2. Fetch all active issue types
    const allIssues = await IssueType.find({ isActive: true })
      .sort({ targetAudience: 1, issueName: 1 })
      .lean();

    // 3. Fetch all active routing rules
    const allRules = await RoutingRule.find({ isActive: true }).lean();

    // 4. Fetch all department administrators
    const adminUsers = await User.find({ isDeptAdmin: true })
      .select("id fullName email adminDepartment adminDepartments")
      .lean();

    // 5. Aggregate metrics per department
    const departmentAudits = [];

    deptMap.forEach((deptMeta, deptKey) => {
      const deptName = deptMeta.name;

      // Filter issues for this department
      const deptIssues = allIssues.filter(
        (i) => (i.department || "").trim().toLowerCase() === deptKey
      );

      // Filter rules for this department
      const deptRules = allRules.filter(
        (r) => (r.department || "").trim().toLowerCase() === deptKey
      );

      const routedIssues = [];
      const unroutedIssues = [];

      deptIssues.forEach((issue) => {
        // A valid routing rule must match issueTypeId, be active, and have at least 1 available assigned staff
        const matchedRule = deptRules.find((r) => {
          const ruleIssueId = r.issueTypeId?._id || r.issueTypeId;
          const hasStaff =
            Array.isArray(r.assignedStaff) &&
            r.assignedStaff.length > 0 &&
            r.assignedStaff.some((s) => s.isAvailable !== false);
          return String(ruleIssueId) === String(issue._id) && hasStaff;
        });

        if (matchedRule) {
          routedIssues.push({
            issueId: issue._id,
            issueName: issue.issueName,
            targetAudience: issue.targetAudience || "student",
            assignmentMode: matchedRule.assignmentMode,
            staffCount: matchedRule.assignedStaff.length
          });
        } else {
          unroutedIssues.push({
            issueId: issue._id,
            issueName: issue.issueName,
            description: issue.description || "",
            targetAudience: issue.targetAudience || "student",
            createdAt: issue.createdAt
          });
        }
      });

      // Find department admins
      const admins = adminUsers
        .filter((u) => {
          const primary = (u.adminDepartment || "").trim().toLowerCase();
          if (primary === deptKey) return true;
          if (Array.isArray(u.adminDepartments)) {
            return u.adminDepartments.some(
              (d) => (d || "").trim().toLowerCase() === deptKey
            );
          }
          return false;
        })
        .map((u) => ({
          id: u.id,
          fullName: u.fullName || "Department Admin",
          email: u.email || ""
        }));

      const totalIssues = deptIssues.length;
      const routedCount = routedIssues.length;
      const unroutedCount = unroutedIssues.length;
      const coveragePercent =
        totalIssues > 0 ? Math.round((routedCount / totalIssues) * 100) : (totalIssues === 0 ? 0 : 100);

      departmentAudits.push({
        department: deptName,
        code: deptMeta.code,
        description: deptMeta.description,
        admins,
        totalIssues,
        routedCount,
        unroutedCount,
        coveragePercent,
        needsAttention: unroutedCount > 0,
        unroutedIssues,
        routedIssues,
        lastRoutingReminderAt: deptMeta.lastRoutingReminderAt,
        lastRoutingReminderTo: deptMeta.lastRoutingReminderTo
      });
    });

    // 6. Sort departments by DEFICIT FIRST:
    // 1st: Highest unroutedCount first
    // 2nd: Lowest coveragePercent first
    // 3rd: Total issues created
    departmentAudits.sort((a, b) => {
      if (a.unroutedCount !== b.unroutedCount) {
        return b.unroutedCount - a.unroutedCount; // most missing rules on top
      }
      if (a.coveragePercent !== b.coveragePercent) {
        return a.coveragePercent - b.coveragePercent; // lowest coverage first
      }
      if (a.totalIssues !== b.totalIssues) {
        return b.totalIssues - a.totalIssues; // active departments over empty
      }
      return a.department.localeCompare(b.department);
    });

    // 7. Calculate overall health stats
    const totalDepartments = departmentAudits.length;
    const needsAttentionCount = departmentAudits.filter((d) => d.needsAttention).length;
    const fullyConfiguredCount = departmentAudits.filter(
      (d) => d.totalIssues > 0 && d.unroutedCount === 0
    ).length;
    const noIssuesCount = departmentAudits.filter((d) => d.totalIssues === 0).length;
    const totalUnroutedIssues = departmentAudits.reduce(
      (sum, d) => sum + d.unroutedCount,
      0
    );

    res.status(200).json({
      summary: {
        totalDepartments,
        needsAttentionCount,
        fullyConfiguredCount,
        noIssuesCount,
        totalUnroutedIssues
      },
      departments: departmentAudits
    });
  } catch (error) {
    console.error("Error generating routing health audit:", error);
    res.status(500).json({ message: "Failed to generate routing audit" });
  }
};

/**
 * 📧 SEND DEPARTMENT ROUTING REMINDER EMAIL
 * Sends a targeted notification email to the Department Admin listing their unrouted issues.
 */
export const sendDepartmentRoutingReminder = async (req, res) => {
  try {
    const { department, recipientEmail, customNote, superAdminName } = req.body;

    if (!department || !recipientEmail) {
      return res.status(400).json({
        message: "Department name and recipient email are required"
      });
    }

    const deptRegex = new RegExp(`^${(department || "").trim()}$`, "i");

    // Fetch unrouted issues for this department
    const deptIssues = await IssueType.find({
      department: { $regex: deptRegex },
      isActive: true
    }).lean();

    const deptRules = await RoutingRule.find({
      department: { $regex: deptRegex },
      isActive: true
    }).lean();

    const unroutedIssues = deptIssues.filter((issue) => {
      const rule = deptRules.find((r) => {
        const rIssueId = r.issueTypeId?._id || r.issueTypeId;
        const hasStaff =
          Array.isArray(r.assignedStaff) &&
          r.assignedStaff.length > 0 &&
          r.assignedStaff.some((s) => s.isAvailable !== false);
        return String(rIssueId) === String(issue._id) && hasStaff;
      });
      return !rule;
    });

    // Lookup recipient admin's name
    const adminUser = await User.findOne({
      email: recipientEmail.trim().toLowerCase()
    }).lean();
    const adminName = adminUser ? adminUser.fullName : "Department Administrator";

    // Send email via emailService
    const emailResult = await sendRoutingReminderEmail({
      toEmail: recipientEmail.trim(),
      adminName,
      department: department.trim(),
      unroutedIssues,
      customNote: customNote || "",
      superAdminName: superAdminName || "Super Administrator"
    });

    if (!emailResult.success) {
      return res.status(500).json({
        message: emailResult.message || "Failed to send reminder email"
      });
    }

    // Update timestamp in Department collection
    const updatedDept = await Department.findOneAndUpdate(
      { name: { $regex: deptRegex } },
      {
        lastRoutingReminderAt: new Date(),
        lastRoutingReminderTo: recipientEmail.trim()
      },
      { new: true }
    );

    res.status(200).json({
      message: `Reminder email successfully sent to ${recipientEmail}`,
      department: department.trim(),
      recipientEmail: recipientEmail.trim(),
      sentAt: new Date(),
      unroutedCount: unroutedIssues.length,
      updatedDept
    });
  } catch (error) {
    console.error("Error sending department routing reminder:", error);
    res.status(500).json({ message: "Internal server error sending reminder" });
  }
};

/**
 * 📢 BROADCAST ROUTING REMINDERS TO ALL INCOMPLETE DEPARTMENTS
 * Sends an email notification to all department admins whose departments have unrouted categories.
 */
export const broadcastRoutingReminders = async (req, res) => {
  try {
    const { customNote, superAdminName } = req.body;

    // 1. Fetch all active issue types, routing rules, and admin users
    const allIssues = await IssueType.find({ isActive: true }).lean();
    const allRules = await RoutingRule.find({ isActive: true }).lean();
    const adminUsers = await User.find({ isDeptAdmin: true })
      .select("id fullName email adminDepartment adminDepartments")
      .lean();

    // Group issues by department
    const deptMap = new Map();
    allIssues.forEach((issue) => {
      const deptName = (issue.department || "").trim();
      if (!deptName) return;
      const deptKey = deptName.toLowerCase();
      if (!deptMap.has(deptKey)) {
        deptMap.set(deptKey, { name: deptName, issues: [] });
      }
      deptMap.get(deptKey).issues.push(issue);
    });

    const results = [];
    const now = new Date();

    for (const [deptKey, deptData] of deptMap.entries()) {
      const deptRules = allRules.filter(
        (r) => (r.department || "").trim().toLowerCase() === deptKey
      );

      const unrouted = deptData.issues.filter((issue) => {
        const rule = deptRules.find((r) => {
          const rIssueId = r.issueTypeId?._id || r.issueTypeId;
          const hasStaff =
            Array.isArray(r.assignedStaff) &&
            r.assignedStaff.length > 0 &&
            r.assignedStaff.some((s) => s.isAvailable !== false);
          return String(rIssueId) === String(issue._id) && hasStaff;
        });
        return !rule;
      });

      if (unrouted.length === 0) continue; // All routed, skip!

      // Find department admin
      const admins = adminUsers.filter((u) => {
        const primary = (u.adminDepartment || "").trim().toLowerCase();
        if (primary === deptKey) return true;
        if (Array.isArray(u.adminDepartments)) {
          return u.adminDepartments.some(
            (d) => (d || "").trim().toLowerCase() === deptKey
          );
        }
        return false;
      });

      if (admins.length === 0) continue;

      const targetAdmin = admins[0];
      if (!targetAdmin.email) continue;

      try {
        await sendRoutingReminderEmail({
          toEmail: targetAdmin.email.trim(),
          adminName: targetAdmin.fullName || "Department Administrator",
          department: deptData.name,
          unroutedIssues: unrouted,
          customNote: customNote || "",
          superAdminName: superAdminName || "Super Administrator"
        });

        const deptRegex = new RegExp(`^${deptData.name}$`, "i");
        await Department.findOneAndUpdate(
          { name: { $regex: deptRegex } },
          {
            lastRoutingReminderAt: now,
            lastRoutingReminderTo: targetAdmin.email.trim()
          }
        );

        results.push({
          department: deptData.name,
          adminEmail: targetAdmin.email,
          unroutedCount: unrouted.length,
          status: "sent"
        });
      } catch (err) {
        console.error(`Failed to send broadcast reminder to ${deptData.name}:`, err);
        results.push({
          department: deptData.name,
          adminEmail: targetAdmin.email,
          status: "failed",
          error: err.message
        });
      }
    }

    const sentCount = results.filter((r) => r.status === "sent").length;
    const failedCount = results.filter((r) => r.status === "failed").length;

    res.status(200).json({
      message: `Broadcast complete: reminders sent to ${sentCount} department administrators.`,
      sentCount,
      failedCount,
      sentAt: now,
      results
    });
  } catch (error) {
    console.error("Error broadcasting routing reminders:", error);
    res.status(500).json({ message: "Failed to broadcast reminders" });
  }
};

export default {
  createRoutingRule,
  getAllRoutingRules,
  getRoutingRulesByDepartment,
  getRoutingRuleByIssueType,
  updateRoutingRule,
  deleteRoutingRule,
  autoAssignGrievance,
  getRoutingHealthAudit,
  sendDepartmentRoutingReminder,
  broadcastRoutingReminders
};
