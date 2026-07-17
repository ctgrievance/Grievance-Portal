const AdminStaffModel = require("../models/AdminStaffModel");
const UserModel = require("../models/UserModel");
const GrievanceModel = require("../models/GrievanceModel");

/**
 * 1️⃣ Get All Staff
 * Used by Master Admin & Dept Admins
 */
exports.getAllStaff = async (req, res) => {
  try {
    const users = await UserModel.find({ role: "staff" }).select("-password");

    // 🔥 Fix: Filter out students (Student IDs are exactly 8 digits)
    // Sometimes students might have 'role: staff' due to data errors, so we exclude them by ID length.
    const validStaffUsers = users.filter((user) => user.id.length !== 8);

    const staffWithDetails = await Promise.all(
      validStaffUsers.map(async (user) => {
        const adminRecord = await AdminStaffModel.findOne({ id: user.id });
        return {
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          department: user.department,
          role: user.role, // ✅ Necessary for frontend filtering
          adminDepartment: adminRecord ? adminRecord.adminDepartment : "",
          isDeptAdmin: adminRecord ? adminRecord.isDeptAdmin : false,
        };
      })
    );

    res.json(staffWithDetails);
  } catch (err) {
    console.error("Get All Staff Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

/**
 * 2️⃣ Promote / Demote Staff
 * FINAL, SAFE, PRODUCTION-READY
 */
exports.manageRole = async (req, res) => {
  const { requesterId, targetStaffId, action, department } = req.body;

  try {
    /* ================= AUTH CHECK ================= */
    let requester = null;

    // Master Admin
    if (requesterId !== "10001") {
      requester = await AdminStaffModel.findOne({ id: requesterId });
      if (!requester || !requester.isDeptAdmin) {
        return res
          .status(403)
          .json({ message: "Access Denied: You cannot manage staff." });
      }
    }

    /* ================= PROMOTE ================= */
    if (action === "promote") {
      let staffRecord = await AdminStaffModel.findOne({ id: targetStaffId });

      if (!staffRecord) {
        const userDetails = await UserModel.findOne({ id: targetStaffId });
        if (!userDetails) {
          return res.status(404).json({ message: "User not found" });
        }

        staffRecord = new AdminStaffModel({
          id: targetStaffId,
          fullName: userDetails.fullName,
        });
      }

      staffRecord.adminDepartment = department;

      if (requesterId === "10001") {
        staffRecord.isDeptAdmin = true; // Boss
      } else {
        if (requester.adminDepartment !== department) {
          return res.status(403).json({
            message: "You can only assign staff to your own department.",
          });
        }
        staffRecord.isDeptAdmin = false; // Team member
      }

      await staffRecord.save();

      // 🔥 Sync the adminDepartment to StaffUser and User so they log into the correct dashboard
      try {
        console.log(`🔄 Syncing promote for ${targetStaffId} to Dept: ${staffRecord.adminDepartment}`);
        const UserModule = await import("../models/UserModel.js");
        const UserModelToUse = UserModule.default || UserModule;
        const uRes = await UserModelToUse.findOneAndUpdate(
          { id: targetStaffId },
          { adminDepartment: staffRecord.adminDepartment, isDeptAdmin: staffRecord.isDeptAdmin },
          { new: true }
        );
        console.log(`✅ UserModel update result:`, uRes ? uRes.adminDepartment : "Not found");

        const StaffUserModule = await import("../models/StaffUser.js");
        const StaffUserModelToUse = StaffUserModule.default || StaffUserModule;
        const suRes = await StaffUserModelToUse.findOneAndUpdate(
          { id: targetStaffId },
          { adminDepartment: staffRecord.adminDepartment, isDeptAdmin: staffRecord.isDeptAdmin },
          { new: true }
        );
        console.log(`✅ StaffUser update result:`, suRes ? suRes.adminDepartment : "Not found");
      } catch (err) {
        console.error("❌ Error syncing role to user models during promote", err);
      }

      return res.json({
        message: `Success: ${staffRecord.fullName} assigned to ${department}.`,
      });
    }

    /* ================= DEMOTE (🔥 FINAL FIX) ================= */
    if (action === "demote") {
      // 1️⃣ Find staff
      const staffRecord = await AdminStaffModel.findOne({ id: targetStaffId });

      // 2️⃣ Remove from department/admin
      if (staffRecord) {
        staffRecord.isDeptAdmin = false;
        staffRecord.adminDepartment = "";
        await staffRecord.save();
      }

      // 🔥 Sync the adminDepartment removal to StaffUser and User
      try {
        const UserModule = await import("../models/UserModel.js");
        const UserModelToUse = UserModule.default || UserModule;
        await UserModelToUse.findOneAndUpdate(
          { id: targetStaffId },
          { adminDepartment: "", isDeptAdmin: false }
        );

        const StaffUserModule = await import("../models/StaffUser.js");
        const StaffUserModelToUse = StaffUserModule.default || StaffUserModule;
        await StaffUserModelToUse.findOneAndUpdate(
          { id: targetStaffId },
          { adminDepartment: "", isDeptAdmin: false }
        );
      } catch (err) {
        console.error("Error syncing role to user models during demote", err);
      }

      // 3️⃣ 🔥 FORCE RESET ALL ASSIGNED GRIEVANCES
      const result = await GrievanceModel.updateMany(
        {
          $or: [
            { assignedTo: targetStaffId },
            { assignedTo: String(targetStaffId) },
            { assignedTo: staffRecord?.fullName },
          ],
        },
        {
          $set: {
            status: "Pending",
            assignedTo: null,
          },
        }
      );

      console.log("Grievances reset:", result.modifiedCount);

      return res.json({
        message: `Staff removed. ${result.modifiedCount} grievances moved to Pending.`,
      });
    }

    return res.status(400).json({ message: "Invalid action" });
  } catch (err) {
    console.error("Manage Role Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

/**
 * 3️⃣ Check Admin Status
 */
exports.checkAdminStatus = async (req, res) => {
  const { id } = req.params;

  try {
    // Master Admin
    if (id === "10001") {
      return res.json({
        isAdmin: true,
        isDeptAdmin: true,
        departments: ["All"],
        adminDepartment: "All",
      });
    }

    const admin = await AdminStaffModel.findOne({ id });
    if (admin && admin.adminDepartment) {
      return res.json({
        isAdmin: true,
        isDeptAdmin: admin.isDeptAdmin,
        departments: [admin.adminDepartment],
        adminDepartment: admin.adminDepartment,
      });
    }

    return res.json({
      isAdmin: false,
      isDeptAdmin: false,
      departments: [],
    });
  } catch (err) {
    console.error("Check Admin Status Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};
