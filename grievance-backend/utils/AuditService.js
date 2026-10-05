import AuditLog from "../models/AuditLog.js";
import StaffUser from "../models/StaffUser.js";
import UserModel from "../models/UserModel.js";
import AdminStaffModel from "../models/AdminStaffModel.js";

export const logAuditAction = async (action, collectionName, userTokenInfo, details = {}) => {
  try {
    let fullName = "Super Admin";
    let role = "Admin";
    let userId = "10001";

    if (userTokenInfo && (userTokenInfo.id || userTokenInfo._id)) {
      userId = (userTokenInfo.id || userTokenInfo._id).toString().toUpperCase();
      
      if (userTokenInfo.fullName) {
        fullName = userTokenInfo.fullName;
      }

      if (userTokenInfo.isMasterAdmin || userId === "10001") {
        role = "Master Admin";
      } else if (userTokenInfo.isDeptAdmin) {
        role = "Dept Admin";
      } else if (userTokenInfo.role) {
        role = userTokenInfo.role;
      }

      // Try to find in StaffUser
      const staffUser = await StaffUser.findOne({ id: userId });
      if (staffUser && staffUser.fullName) {
        fullName = staffUser.fullName;
        if (!userTokenInfo.isMasterAdmin && userId !== "10001") {
          role = staffUser.isMasterAdmin ? "Master Admin" : (staffUser.isDeptAdmin ? "Dept Admin" : (staffUser.role || "Staff"));
        }
      } else {
        // Try AdminStaffModel
        const adminStaff = await AdminStaffModel.findOne({ id: userId });
        if (adminStaff && adminStaff.fullName) {
          fullName = adminStaff.fullName;
        } else {
          // Try UserModel
          const genUser = await UserModel.findOne({ id: userId });
          if (genUser && genUser.fullName) {
            fullName = genUser.fullName;
            if (!userTokenInfo.isMasterAdmin && userId !== "10001") {
              role = genUser.role || "Admin";
            }
          }
        }
      }
    } else if (userTokenInfo && userTokenInfo.fullName) {
      fullName = userTokenInfo.fullName;
      if (userTokenInfo.role) role = userTokenInfo.role;
    }

    if (userId === "10001" && fullName === "Super Admin") {
      fullName = "CT University Super Admin";
    }

    const createdLog = await AuditLog.create({
      action,
      collectionName,
      performedBy: {
        id: userId,
        fullName,
        role
      },
      details
    });

    console.log(`📝 [AuditLog] ${action} on ${collectionName} by ${fullName} (${userId} - ${role})`);
    return createdLog;
  } catch (err) {
    console.error("Failed to log audit action:", err);
  }
};
