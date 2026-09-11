import React from "react";
import { useNavigate } from "react-router-dom";
import { UserIcon } from "./Icons";

function ProfileHeaderButton({ className = "" }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className={`header-profile-btn ${className}`}
      onClick={() => navigate("/profile")}
      title="View and Edit Profile"
      aria-label="User Profile"
    >
      <UserIcon width="16" height="16" />
      <span>Profile</span>
    </button>
  );
}

export default ProfileHeaderButton;
