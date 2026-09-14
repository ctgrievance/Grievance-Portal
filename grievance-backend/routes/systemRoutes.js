import express from "express";
import SystemConfig from "../models/SystemConfig.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Helper: Get or initialize SystemConfig singleton
export const getSystemConfig = async () => {
  let config = await SystemConfig.findOne({ key: "portal_settings" });
  if (!config) {
    config = await SystemConfig.create({
      key: "portal_settings",
      isMaintenanceActive: false,
      maintenanceMessage: "The Grievance Redressal Portal is currently under scheduled maintenance. Grievance submissions and services are temporarily paused. Please check back shortly.",
      maintenanceReason: "Scheduled System Maintenance",
      activatedAt: null,
      activatedBy: "",
      allowStaffLogin: false
    });
  }
  return config;
};

// =========================================================================
// 1️⃣ GET MAINTENANCE STATUS (Public - Used by frontend to determine banner/screen)
// =========================================================================
router.get("/maintenance-status", async (req, res) => {
  try {
    const config = await getSystemConfig();
    return res.json({
      isMaintenanceActive: Boolean(config.isMaintenanceActive),
      maintenanceMessage: config.maintenanceMessage,
      maintenanceReason: config.maintenanceReason,
      activatedAt: config.activatedAt,
      activatedBy: config.activatedBy,
      allowStaffLogin: Boolean(config.allowStaffLogin)
    });
  } catch (err) {
    console.error("Fetch maintenance status error:", err);
    return res.status(500).json({
      isMaintenanceActive: false,
      message: "Failed to fetch maintenance status"
    });
  }
});

// =========================================================================
// 2️⃣ TOGGLE MAINTENANCE MODE (Super Admin Only)
// =========================================================================
router.post("/maintenance/toggle", verifyToken, async (req, res) => {
  try {
    const requesterId = (req.user?.id || "").toString().trim().toUpperCase();
    const isMaster = Boolean(req.user?.isMasterAdmin) || requesterId === "10001";

    if (!isMaster) {
      return res.status(403).json({
        message: "Access Denied: Only the Super Admin can toggle Maintenance Mode."
      });
    }

    const {
      isMaintenanceActive,
      maintenanceMessage,
      maintenanceReason,
      allowStaffLogin
    } = req.body;

    const config = await getSystemConfig();

    // Determine target state (explicit boolean or toggle existing)
    const targetActive = typeof isMaintenanceActive === "boolean"
      ? isMaintenanceActive
      : !config.isMaintenanceActive;

    config.isMaintenanceActive = targetActive;
    if (maintenanceMessage && maintenanceMessage.trim()) {
      config.maintenanceMessage = maintenanceMessage.trim();
    }
    if (maintenanceReason && maintenanceReason.trim()) {
      config.maintenanceReason = maintenanceReason.trim();
    }
    if (typeof allowStaffLogin === "boolean") {
      config.allowStaffLogin = allowStaffLogin;
    }

    if (targetActive) {
      config.activatedAt = new Date();
      config.activatedBy = requesterId;
    } else {
      config.activatedAt = null;
    }

    await config.save();

    // 🔌 Broadcast event via Socket.IO so all clients update in real-time
    const io = req.app.get("io");
    if (io) {
      io.emit("system:maintenance_updated", {
        isMaintenanceActive: config.isMaintenanceActive,
        maintenanceMessage: config.maintenanceMessage,
        maintenanceReason: config.maintenanceReason,
        activatedAt: config.activatedAt,
        activatedBy: config.activatedBy,
        allowStaffLogin: config.allowStaffLogin
      });
      console.log(`📡 [Socket.IO] Broadcasted maintenance update: active=${config.isMaintenanceActive}`);
    }

    console.log(`🛠️ [MAINTENANCE] Mode set to ${config.isMaintenanceActive ? "ACTIVE" : "INACTIVE"} by Super Admin (${requesterId})`);

    return res.json({
      message: config.isMaintenanceActive
        ? "✅ Maintenance Mode activated. Incoming grievances are paused and maintenance screen is active."
        : "✅ Maintenance Mode deactivated. Portal is live and accepting grievances.",
      config: {
        isMaintenanceActive: config.isMaintenanceActive,
        maintenanceMessage: config.maintenanceMessage,
        maintenanceReason: config.maintenanceReason,
        activatedAt: config.activatedAt,
        activatedBy: config.activatedBy,
        allowStaffLogin: config.allowStaffLogin
      }
    });
  } catch (err) {
    console.error("Toggle maintenance error:", err);
    return res.status(500).json({ message: "Failed to update maintenance mode" });
  }
});

export default router;
