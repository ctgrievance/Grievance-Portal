import mongoose from "mongoose";

const systemConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: "portal_settings",
      unique: true,
      index: true
    },
    isMaintenanceActive: {
      type: Boolean,
      default: false
    },
    maintenanceMessage: {
      type: String,
      default: "The Grievance Redressal Portal is currently under scheduled maintenance. Grievance submissions and services are temporarily paused. Please check back shortly."
    },
    maintenanceReason: {
      type: String,
      default: "Scheduled System Maintenance"
    },
    activatedAt: {
      type: Date,
      default: null
    },
    activatedBy: {
      type: String,
      default: ""
    },
    allowStaffLogin: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

const SystemConfig = mongoose.model("SystemConfig", systemConfigSchema);
export default SystemConfig;
