import IssueType from "../models/IssueType.js";

// Create Issue Type
export const createIssueType = async (req, res) => {
  try {
    const { department, issueName, description, targetAudience } = req.body;
    const audience = targetAudience === "staff" ? "staff" : "student";

    if (!department || !issueName) {
      return res.status(400).json({ message: "Department and issue name are required" });
    }

    // Check if issue name already exists for this department and targetAudience
    const existingIssue = await IssueType.findOne({
      department,
      issueName: { $regex: new RegExp(`^${issueName.trim()}$`, "i") },
      targetAudience: audience,
      isActive: true
    });
    if (existingIssue) {
      return res.status(400).json({ message: `Issue type with this name already exists for ${audience}s` });
    }

    const issueType = new IssueType({
      department,
      issueName: issueName.trim(),
      description: description || "",
      targetAudience: audience
    });

    await issueType.save();
    res.status(201).json({ message: "Issue type created successfully", issueType });
  } catch (error) {
    console.error("Error creating issue type:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get All Issue Types
export const getAllIssueTypes = async (req, res) => {
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
    const issueTypes = await IssueType.find(filter).sort({ department: 1, issueName: 1 });
    res.status(200).json(issueTypes);
  } catch (error) {
    console.error("Error fetching issue types:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get Issue Types by Department
export const getIssueTypesByDepartment = async (req, res) => {
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

    let issueTypes = await IssueType.find(filter).sort({ issueName: 1 });

    // Ensure permanent "Others" category exists for this department and audience
    const hasOthers = issueTypes.some(i => i.issueName === "Others" || i.isSystemReserved);
    if (!hasOthers && department) {
      try {
        let othersDoc = await IssueType.findOne({ department, issueName: "Others", targetAudience: audience });
        if (!othersDoc) {
          othersDoc = await IssueType.create({
            department,
            issueName: "Others",
            description: "General or unlisted issue type requiring manual admin assignment",
            isActive: true,
            isSystemReserved: true,
            targetAudience: audience
          });
        }
        if (othersDoc.isActive) {
          issueTypes.push(othersDoc);
        }
      } catch (err) {
        console.warn("Could not auto-create Others issue type:", err.message);
      }
    }

    // Place "Others" at the end of the list for clean UI
    const others = issueTypes.filter(i => i.issueName === "Others" || i.isSystemReserved);
    const nonOthers = issueTypes.filter(i => i.issueName !== "Others" && !i.isSystemReserved);
    issueTypes = [...nonOthers, ...others];

    res.status(200).json(issueTypes);
  } catch (error) {
    console.error("Error fetching department issue types:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update Issue Type
export const updateIssueType = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, isActive } = req.body;

    const issueType = await IssueType.findByIdAndUpdate(
      id,
      { description, isActive, updatedAt: Date.now() },
      { new: true }
    );

    if (!issueType) {
      return res.status(404).json({ message: "Issue type not found" });
    }

    res.status(200).json({ message: "Issue type updated successfully", issueType });
  } catch (error) {
    console.error("Error updating issue type:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Delete Issue Type (Soft delete)
export const deleteIssueType = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await IssueType.findById(id);

    if (!existing) {
      return res.status(404).json({ message: "Issue type not found" });
    }

    if (existing.isSystemReserved || existing.issueName === "Others") {
      return res.status(400).json({ message: "❌ Permanent system categories (such as 'Others') cannot be deleted." });
    }

    existing.isActive = false;
    existing.updatedAt = Date.now();
    await existing.save();

    res.status(200).json({ message: "Issue type deleted successfully" });
  } catch (error) {
    console.error("Error deleting issue type:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export default {
  createIssueType,
  getAllIssueTypes,
  getIssueTypesByDepartment,
  updateIssueType,
  deleteIssueType
};
