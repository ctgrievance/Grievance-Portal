import React from "react";

/**
 * Returns 'staff' or 'student' based on the grievance submitter's data.
 * Works seamlessly with newly submitted grievances (userType) and existing records (studentProgram / id).
 */
export const getSubmitterRole = (grievance) => {
  if (!grievance) return "student";
  if (grievance.userType) return grievance.userType.toLowerCase();
  if (
    grievance.studentProgram === "Staff Member" ||
    grievance.studentProgram === "Admin Staff"
  ) {
    return "staff";
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
    backgroundColor: isStaff ? "#fef3c7" : "#e0e7ff",
    color: isStaff ? "#92400e" : "#3730a3",
    border: isStaff ? "1px solid #fde68a" : "1px solid #c7d2fe",
    ...style,
  };

  return (
    <span className={`user-role-badge ${isStaff ? "badge-staff" : "badge-student"}`} style={defaultStyle}>
      {isStaff ? "Staff" : "Student"}
    </span>
  );
};
