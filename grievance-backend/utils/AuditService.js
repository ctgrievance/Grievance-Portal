import AuditLog from "../models/AuditLog.js";
import StaffUser from "../models/StaffUser.js";
import UserModel from "../models/UserModel.js";

export const logAuditAction = async (action, collectionName, userTokenInfo, details = {}) => {
  try {
    let fullName = "Unknown Admin";
    let role = "Admin";
    let userId = "UNKNOWN";

    if (userTokenInfo && userTokenInfo.id) {
      userId = userTokenInfo.id;
      // Try to find in StaffUser
      const staffUser = await StaffUser.findOne({ id: userId.toUpperCase() });
      if (staffUser) {
        fullName = staffUser.fullName;
        role = staffUser.isMasterAdmin ? "Master Admin" : (staffUser.isDeptAdmin ? "Dept Admin" : "Staff");
      } else {
        const genUser = await UserModel.findOne({ id: userId.toUpperCase() });
        if (genUser) {
          fullName = genUser.fullName;
          role = genUser.role || "Admin";
        }
      }
    }

    await AuditLog.create({
      action,
      collectionName,
      performedBy: {
        id: userId,
        fullName,
        role
      },
      details
    });
  } catch (err) {
    console.error("Failed to log audit action:", err);
  }
};
