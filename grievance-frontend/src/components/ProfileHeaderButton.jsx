import React from "react";
import { useNavigate } from "react-router-dom";
import { UserIcon } from "./Icons";

function ProfileHeaderButton({ className = "" }) {
  const navigate = useNavigate();
  const role = localStorage.getItem("grievance_role")?.toLowerCase();
  const dept = localStorage.getItem("admin_department");
  const isMaster = localStorage.getItem("is_master_admin") === "true";
  const isUnassigned = !isMaster && role === "staff" && (!dept || dept.toLowerCase() === "general" || dept.trim() === "");

  return (
    <button
      type="button"
      className={`header-profile-btn ${className} ${isUnassigned ? "profile-btn-attention" : ""}`}
      onClick={() => navigate("/profile")}
      title={isUnassigned ? "⚠️ Action Required: Select your department in profile" : "View and Edit Profile"}
      aria-label="User Profile"
      style={{ position: "relative" }}
    >
      <UserIcon width="16" height="16" />
      <span>Profile</span>
      {isUnassigned && (
        <span
          className="profile-warning-badge"
          title="Department required - please update"
        >
          !
        </span>
      )}
    </button>
  );
}

export default ProfileHeaderButton;
