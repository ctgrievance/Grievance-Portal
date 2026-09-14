import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getSocket } from "../services/socket";

const MaintenanceContext = createContext({
  isMaintenanceActive: false,
  maintenanceMessage: "",
  maintenanceReason: "",
  activatedAt: null,
  activatedBy: "",
  allowStaffLogin: false,
  loading: true,
  refreshStatus: () => {},
  toggleMaintenance: async () => {}
});

export const useMaintenance = () => useContext(MaintenanceContext);

export const MaintenanceProvider = ({ children }) => {
  const [maintenanceState, setMaintenanceState] = useState({
    isMaintenanceActive: false,
    maintenanceMessage: "The Grievance Redressal Portal is currently under scheduled maintenance. Grievance submissions and services are temporarily paused. Please check back shortly.",
    maintenanceReason: "Scheduled System Maintenance",
    activatedAt: null,
    activatedBy: "",
    allowStaffLogin: false
  });
  const [loading, setLoading] = useState(true);

  // Fetch status from backend API
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/system/maintenance-status`
      );
      if (res.ok) {
        const data = await res.json();
        setMaintenanceState({
          isMaintenanceActive: Boolean(data.isMaintenanceActive),
          maintenanceMessage: data.maintenanceMessage || "",
          maintenanceReason: data.maintenanceReason || "Scheduled System Maintenance",
          activatedAt: data.activatedAt || null,
          activatedBy: data.activatedBy || "",
          allowStaffLogin: Boolean(data.allowStaffLogin)
        });
      }
    } catch (err) {
      console.warn("Could not check maintenance status:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Real-time socket listener + initial fetch + 30s polling fallback
  useEffect(() => {
    fetchStatus();

    // 🔌 Socket real-time listener
    const socket = getSocket();
    const handleMaintenanceUpdate = (updatedConfig) => {
      console.log("🛠️ [Real-time] Maintenance status changed:", updatedConfig);
      setMaintenanceState({
        isMaintenanceActive: Boolean(updatedConfig.isMaintenanceActive),
        maintenanceMessage: updatedConfig.maintenanceMessage || "",
        maintenanceReason: updatedConfig.maintenanceReason || "Scheduled System Maintenance",
        activatedAt: updatedConfig.activatedAt || null,
        activatedBy: updatedConfig.activatedBy || "",
        allowStaffLogin: Boolean(updatedConfig.allowStaffLogin)
      });
    };

    if (socket) {
      socket.on("system:maintenance_updated", handleMaintenanceUpdate);
    }

    // Polling fallback every 30s
    const interval = setInterval(fetchStatus, 30000);

    return () => {
      if (socket) {
        socket.off("system:maintenance_updated", handleMaintenanceUpdate);
      }
      clearInterval(interval);
    };
  }, [fetchStatus]);

  // Toggle maintenance method (for Super Admin)
  const toggleMaintenance = async ({ isMaintenanceActive, maintenanceMessage, maintenanceReason, allowStaffLogin }) => {
    const token = localStorage.getItem("grievance_token");
    const res = await fetch(
      `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/system/maintenance/toggle`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          isMaintenanceActive,
          maintenanceMessage,
          maintenanceReason,
          allowStaffLogin
        })
      }
    );

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to update maintenance mode");
    }

    if (data.config) {
      setMaintenanceState({
        isMaintenanceActive: Boolean(data.config.isMaintenanceActive),
        maintenanceMessage: data.config.maintenanceMessage || "",
        maintenanceReason: data.config.maintenanceReason || "",
        activatedAt: data.config.activatedAt || null,
        activatedBy: data.config.activatedBy || "",
        allowStaffLogin: Boolean(data.config.allowStaffLogin)
      });
    }

    return data;
  };

  return (
    <MaintenanceContext.Provider
      value={{
        ...maintenanceState,
        loading,
        refreshStatus: fetchStatus,
        toggleMaintenance
      }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
};
