/**
 * Grievance Origin & Transfer Classification Helpers
 * 
 * Classifies grievances into:
 * 1. Direct Grievances: Submitted directly by students/complainants to this department.
 * 2. Forwarded Grievances: Forwarded into this department from other departments.
 */

/**
 * Determines whether a grievance was forwarded into the given department from another department.
 *
 * @param {Object} g - Grievance object
 * @param {string} currentDeptName - Name of the department currently viewing the grievance
 * @returns {boolean} true if forwarded into this department, false if directly submitted to this department
 */
export function isForwardedGrievance(g, currentDeptName) {
  if (!g) return false;

  const currentDept = (currentDeptName || g.category || "").trim().toLowerCase();

  // 1. If child ticket created from a multi-forward transfer
  if (g.parentGrievanceId) return true;

  // 2. If originatingDepartment is explicitly different from current viewing department
  if (g.originatingDepartment) {
    const origDept = g.originatingDepartment.trim().toLowerCase();
    if (origDept && origDept !== currentDept) {
      return true;
    }
  }

  // 3. Inspect transferHistory for any incoming transfer from a different department
  if (Array.isArray(g.transferHistory) && g.transferHistory.length > 0) {
    const hasIncomingExternalTransfer = g.transferHistory.some((t) => {
      const fromDept = (t.fromDepartment || "").trim().toLowerCase();
      const toDept = (t.toDepartment || "").trim().toLowerCase();

      // If action is department transfer or multi-dept transfer
      if (t.actionType === "DEPARTMENT_TRANSFER" || t.actionType === "MULTI_DEPARTMENT_TRANSFER") {
        return true;
      }

      // If transfer was from another department into current department
      if (fromDept && toDept && fromDept !== toDept) {
        if (!currentDept || toDept === currentDept) {
          return true;
        }
      }

      return false;
    });

    if (hasIncomingExternalTransfer) {
      return true;
    }
  }

  // 4. Fallback check: isRerouted is true and originatingDepartment does not match current dept
  if (g.isRerouted && g.originatingDepartment) {
    const origDept = g.originatingDepartment.trim().toLowerCase();
    if (origDept !== currentDept) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts incoming transfer details for a forwarded grievance.
 * 
 * @param {Object} g - Grievance object
 * @param {string} currentDeptName - Name of current department
 * @returns {Object} { fromDepartment, transferredBy, transferredByName, reason, transferredAt }
 */
export function getIncomingTransferInfo(g, currentDeptName) {
  const fallback = {
    fromDepartment: g?.originatingDepartment || "Another Department",
    transferredBy: "Staff Member",
    transferredByName: "Staff Member",
    reason: "Forwarded to department pool",
    transferredAt: g?.updatedAt || g?.createdAt || new Date()
  };

  if (!g || !Array.isArray(g.transferHistory) || g.transferHistory.length === 0) {
    return fallback;
  }

  const currentDept = (currentDeptName || g.category || "").trim().toLowerCase();

  // Find incoming transfers that brought this grievance to the current department
  const incoming = g.transferHistory.filter((t) => {
    const fromDept = (t.fromDepartment || "").trim().toLowerCase();
    const toDept = (t.toDepartment || "").trim().toLowerCase();
    return (
      (t.actionType === "DEPARTMENT_TRANSFER" || t.actionType === "MULTI_DEPARTMENT_TRANSFER") ||
      (fromDept && toDept && fromDept !== toDept && (!currentDept || toDept === currentDept))
    );
  });

  const entry = incoming.length > 0 ? incoming[incoming.length - 1] : g.transferHistory[g.transferHistory.length - 1];
  if (!entry) return fallback;

  return {
    fromDepartment: entry.fromDepartment || g.originatingDepartment || "Another Department",
    transferredBy: entry.transferredBy || "Staff Member",
    transferredByName: entry.transferredByName || entry.transferredBy || "Staff Member",
    transferredByRole: entry.transferredByRole || "staff",
    reason: entry.reason || "Forwarded to department",
    transferredAt: entry.transferredAt || g.updatedAt || g.createdAt
  };
}

/**
 * Splits a list of grievances into Direct and Forwarded categories.
 *
 * @param {Array} grievances - Array of grievance objects
 * @param {string} currentDeptName - Current department name
 * @returns {Object} { directGrievances, forwardedGrievances, unassignedForwardedCount }
 */
export function splitGrievancesByOrigin(grievances = [], currentDeptName) {
  const directGrievances = [];
  const forwardedGrievances = [];

  grievances.forEach((g) => {
    if (isForwardedGrievance(g, currentDeptName)) {
      forwardedGrievances.push(g);
    } else {
      directGrievances.push(g);
    }
  });

  const unassignedForwardedCount = forwardedGrievances.filter((g) => !g.assignedTo).length;

  return {
    directGrievances,
    forwardedGrievances,
    unassignedForwardedCount
  };
}
