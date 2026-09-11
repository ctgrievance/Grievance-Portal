import React from "react";

/**
 * Returns 'staff' or 'student' based on the grievance submitter's data.
 * Works seamlessly with newly submitted grievances (userType) and existing records (studentProgram / id).
 */
export const getSubmitterRole = (grievance) => {
  if (!grievance) return "student";

  // 1. Explicit userType === "staff"
  if (grievance.userType && grievance.userType.toLowerCase() === "staff") {
    return "staff";
  }

  // 2. Check studentProgram for Staff / Admin Staff
  const program = (grievance.studentProgram || "").trim().toLowerCase();
  if (
    program === "staff member" ||
    program === "admin staff" ||
    program === "staff" ||
    program.includes("staff")
  ) {
    return "staff";
  }

  // 3. CT University Staff ID check (Staff IDs are 5-digit employee numbers e.g. 26170, 26144, 24166; student IDs are 8 digits e.g. 72311390)
  const userIdStr = String(grievance.userId || grievance.regid || "").trim();
  if (/^\d{5}$/.test(userIdStr)) {
    return "staff";
  }

  if (grievance.userType && grievance.userType.toLowerCase() === "student") {
    return "student";
  }

  return "student";
};

/**
 * UserRoleBadge component
 * Displays a colorful, accessible badge indicating whether a user is Staff or Student.
 */
export const UserRoleBadge = ({ grievance, role, style = {} }) => {
  const resolvedRole = role || getSubmitterRole(grievance);
  const isStaff = resolvedRole === "staff";

  const defaultStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.68rem",
    fontWeight: "700",
    padding: "2px 7px",
    borderRadius: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    lineHeight: "1.2",
    whiteSpace: "nowrap",
    backgroundColor: isStaff ? "#f8fafc" : "#f1f5f9",
    color: isStaff ? "#0f172a" : "#475569",
    border: isStaff ? "1px solid #cbd5e1" : "1px solid #e2e8f0",
    ...style,
  };

  return (
    <span className={`user-role-badge ${isStaff ? "badge-staff" : "badge-student"}`} style={defaultStyle}>
      {isStaff ? "Staff" : "Student"}
    </span>
  );
};
