import AuditLog from "../models/AuditLog.js";

export const getAuditLogs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const collectionName = req.query.collectionName;

    const query = {};
    if (collectionName) {
      if (collectionName === "StudentRecord" || collectionName === "StudentUser") {
        query.collectionName = { $in: ["StudentRecord", "StudentUser"] };
      } else if (collectionName === "StaffRecord" || collectionName === "StaffUser") {
        query.collectionName = { $in: ["StaffRecord", "StaffUser"] };
      } else {
        query.collectionName = collectionName;
      }
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.status(200).json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      logs
    });
  } catch (err) {
    console.error("Error fetching audit logs:", err);
    res.status(500).json({ message: "Failed to fetch audit logs" });
  }
};
