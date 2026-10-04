import RoutingRule from "../models/RoutingRule.js";
import IssueType from "../models/IssueType.js";
import StaffUser from "../models/StaffUser.js";
import User from "../models/UserModel.js";
import StaffRecord from "../models/StaffRecord.js";
import Grievance from "../models/GrievanceModel.js";

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
    const { assignedStaff, assignmentMode, isActive } = req.body;

    const updateData = { updatedAt: Date.now() };
    if (assignedStaff) {
      updateData.assignedStaff = assignedStaff.map(staff => ({
        staffId: staff.staffId,
        staffName: staff.staffName,
        staffEmail: staff.staffEmail || "",
        isAvailable: staff.isAvailable !== undefined ? staff.isAvailable : true,
        roundRobinIndex: staff.roundRobinIndex || 0
      }));
    }
    if (assignmentMode) updateData.assignmentMode = assignmentMode;
    if (isActive !== undefined) updateData.isActive = isActive;

    const routingRule = await RoutingRule.findByIdAndUpdate(id, updateData, { new: true });

    if (!routingRule) {
      return res.status(404).json({ message: "Routing rule not found" });
    }

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

export default {
  createRoutingRule,
  getAllRoutingRules,
  getRoutingRulesByDepartment,
  getRoutingRuleByIssueType,
  updateRoutingRule,
  deleteRoutingRule,
  autoAssignGrievance
};
