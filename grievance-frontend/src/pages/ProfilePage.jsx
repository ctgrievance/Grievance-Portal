import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ctLogo from "../assets/ct-logo.png";
import {
  UserIcon,
  MailIcon,
  PhoneIcon,
  ShieldIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ChevronRightIcon,
  GraduationCapIcon,
  ArrowLeftIcon
} from "../components/Icons";
import "../styles/Dashboard.css";

function ProfilePage() {
  const navigate = useNavigate();
  const token = localStorage.getItem("grievance_token");
  const storedId = localStorage.getItem("grievance_id");

  // Profile data
  const [profile, setProfile] = useState({
    id: "",
    fullName: "",
    email: "",
    phone: "",
    role: "",
    department: "",
    isDeptAdmin: false,
    isMasterAdmin: false,
  });

  const [loading, setLoading] = useState(true);
  const [savingBasic, setSavingBasic] = useState(false);
  const [msg, setMsg] = useState("");
  const [statusType, setStatusType] = useState("");

  // Editable fields
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [departmentsList, setDepartmentsList] = useState([]);

  // Email OTP state
  const [showEmailEdit, setShowEmailEdit] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [emailStep, setEmailStep] = useState(1); // 1: input, 2: otp
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailTimer, setEmailTimer] = useState(0);

  // Phone OTP state
  const [showPhoneEdit, setShowPhoneEdit] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState(1); // 1: input, 2: otp
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneTimer, setPhoneTimer] = useState(0);

  // Notification helper
  const showToast = (text, type = "success") => {
    setMsg(text);
    setStatusType(type);
    setTimeout(() => {
      setMsg("");
      setStatusType("");
    }, 4500);
  };

  // Timer countdowns
  useEffect(() => {
    if (emailTimer > 0) {
      const id = setTimeout(() => setEmailTimer(emailTimer - 1), 1000);
      return () => clearTimeout(id);
    }
  }, [emailTimer]);

  useEffect(() => {
    if (phoneTimer > 0) {
      const id = setTimeout(() => setPhoneTimer(phoneTimer - 1), 1000);
      return () => clearTimeout(id);
    }
  }, [phoneTimer]);

  // Fetch departments from super admin's department list
  const fetchDepartments = useCallback(async () => {
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/departments`
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setDepartmentsList(data);
      }
    } catch (err) {
      console.error("Failed to load departments:", err);
    }
  }, []);

  // Fetch current user profile
  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/auth/profile`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!res.ok) {
        throw new Error("Failed to load profile details");
      }

      const data = await res.json();
      setProfile(data);
      setFullName(data.fullName || "");
      // Initialize department from registered profile data
      const assignedDept = data.isMasterAdmin
        ? (data.department || "Super Admin")
        : (data.department || data.school || data.adminDepartment || data.staffDepartment || "");
      setDepartment(assignedDept);
    } catch (err) {
      console.error(err);
      showToast(err.message || "Could not fetch profile details", "error");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
    fetchDepartments();
  }, [fetchProfile, fetchDepartments]);

  // Navigation back to user's dashboard
  const handleBackToDashboard = () => {
    const isMaster = profile.isMasterAdmin || localStorage.getItem("is_master_admin") === "true";
    const isDeptBoss = profile.isDeptAdmin || localStorage.getItem("is_dept_admin") === "true";
    const userRole = (profile.role || localStorage.getItem("grievance_role") || "").toLowerCase();
    const dept = (profile.department || profile.adminDepartment || localStorage.getItem("admin_department") || "").trim().toLowerCase();

    if (isMaster) {
      navigate("/admin/dashboard");
      return;
    }

    if (userRole === "admin" || (userRole === "staff" && isDeptBoss)) {
      if (dept === "accounts") return navigate("/admin/account");
      if (dept === "student welfare") return navigate("/admin/studentwelfare");
      if (dept === "student section") return navigate("/admin/studentsection");
      if (dept === "admission") return navigate("/admin/admission");
      if (dept === "examination") return navigate("/admin/examination");
      if (dept === "hr") return navigate("/admin/hr");
      if (dept === "crc (placement)" || dept === "crc" || dept === "placement") return navigate("/admin/crc");
      if (dept === "transport") return navigate("/admin/transport");
      return navigate("/admin/school");
    }

    if (userRole === "staff") {
      const hasTeamDept = Boolean((profile.adminDepartment || localStorage.getItem("admin_department") || "").trim());
      if (hasTeamDept) {
        navigate("/staff/admin");
      } else {
        navigate("/staff/general");
      }
      return;
    }

    if (userRole === "student") {
      navigate("/student/dashboard");
      return;
    }

    navigate("/");
  };

  // 1. SAVE BASIC PROFILE (Name & Department)
  const handleSaveBasic = async (e) => {
    e.preventDefault();
    setSavingBasic(true);

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/auth/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            fullName,
            department: profile.isMasterAdmin
              ? (department || "Super Admin")
              : (profile.role === "student" ? (profile.department || profile.school || department) : (profile.department || department))
          })
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update profile");

      // Update local storage
      if (data.token) localStorage.setItem("grievance_token", data.token);
      if (data.user?.fullName) localStorage.setItem("grievance_user_name", data.user.fullName);
      if (data.user?.department) localStorage.setItem("admin_department", data.user.department);

      setProfile(prev => ({
        ...prev,
        fullName: data.user.fullName,
        department: data.user.department,
        adminDepartment: data.user.adminDepartment,
        staffDepartment: data.user.staffDepartment
      }));

      showToast("Profile details updated successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to update profile", "error");
    } finally {
      setSavingBasic(false);
    }
  };

  // 2. EMAIL OTP FLOW
  const handleSendEmailOtp = async () => {
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      showToast("Please enter a valid email address", "error");
      return;
    }
    if (newEmail.toLowerCase() === profile.email.toLowerCase()) {
      showToast("New email must be different from your current email", "error");
      return;
    }

    setEmailLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/auth/profile/request-email-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ newEmail })
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send email verification code");

      setEmailStep(2);
      setEmailTimer(60);
      showToast(data.message || "Verification OTP sent to your new email!", "success");
    } catch (err) {
      showToast(err.message || "Error sending email verification code", "error");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.trim().length !== 6) {
      showToast("Please enter the 6-digit verification code", "error");
      return;
    }

    setEmailLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/auth/profile/verify-email-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ newEmail, otp: emailOtp.trim() })
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Email verification failed");

      setProfile(prev => ({ ...prev, email: data.email }));
      setShowEmailEdit(false);
      setEmailOtp("");
      setEmailStep(1);
      showToast("Email address updated and verified successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to verify email OTP", "error");
    } finally {
      setEmailLoading(false);
    }
  };

  // 3. PHONE OTP FLOW
  const handleSendPhoneOtp = async () => {
    const cleanPhone = newPhone.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length !== 10) {
      showToast("Please enter a valid 10-digit mobile number", "error");
      return;
    }
    if (cleanPhone === (profile.phone || "").replace(/\D/g, "")) {
      showToast("New phone number must be different from current phone", "error");
      return;
    }

    setPhoneLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/auth/profile/request-phone-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ newPhone: cleanPhone })
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send phone OTP");

      setPhoneStep(2);
      setPhoneTimer(60);
      showToast(data.message || "Verification code sent to your phone via SMS!", "success");
    } catch (err) {
      showToast(err.message || "Error sending phone verification code", "error");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp || phoneOtp.trim().length !== 6) {
      showToast("Please enter the 6-digit SMS verification code", "error");
      return;
    }

    setPhoneLoading(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/auth/profile/verify-phone-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ newPhone: newPhone.replace(/\D/g, ""), otp: phoneOtp.trim() })
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Phone verification failed");

      setProfile(prev => ({ ...prev, phone: data.phone }));
      setShowPhoneEdit(false);
      setPhoneOtp("");
      setPhoneStep(1);
      showToast("Phone number updated and verified successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to verify phone OTP", "error");
    } finally {
      setPhoneLoading(false);
    }
  };

  // Role display label & badge (Executive, No Emojis)
  const getRoleBadge = () => {
    if (profile.isMasterAdmin) {
      return {
        label: "Master Admin",
        className: "master",
        icon: <ShieldIcon width="12" height="12" />
      };
    }
    if (profile.isDeptAdmin) {
      return {
        label: `Dept Admin - ${profile.adminDepartment || profile.department || "Admin"}`,
        className: "dept",
        icon: <ShieldIcon width="12" height="12" />
      };
    }
    if (profile.role === "staff") {
      return {
        label: profile.department || profile.adminDepartment ? `Staff - ${profile.department || profile.adminDepartment}` : "General Staff",
        className: "staff",
        icon: <UserIcon width="12" height="12" />
      };
    }
    if (profile.role === "student") {
      return {
        label: `Student - ${profile.school || profile.department || "Academic"}`,
        className: "student",
        icon: <GraduationCapIcon width="12" height="12" />
      };
    }
    return {
      label: profile.role ? profile.role.toUpperCase() : "User",
      className: "student",
      icon: <UserIcon width="12" height="12" />
    };
  };

  const badge = getRoleBadge();

  return (
    <div className="dashboard-container" style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      {/* HEADER */}
      <header className="dashboard-header admin-dashboard-header">
        <div className="admin-header-brand-wrap" style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <img src={ctLogo} alt="CT University" className="admin-header-logo" style={{ height: "42px" }} />
          <div className="header-content">
            <h1>User Profile</h1>
            <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Manage your account credentials, department routing, and verified contacts
            </p>
          </div>
        </div>
        <div className="admin-header-actions">
          <button
            className="profile-contact-btn"
            onClick={handleBackToDashboard}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontWeight: "600" }}
          >
            <ArrowLeftIcon width="14" height="14" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </header>

      {/* TOAST NOTIFICATION */}
      {msg && (
        <div
          style={{
            maxWidth: "1280px",
            margin: "16px auto 0",
            padding: "12px 18px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontWeight: "500",
            fontSize: "0.88rem",
            backgroundColor: statusType === "error" ? "#fee2e2" : "#f0fdf4",
            color: statusType === "error" ? "#991b1b" : "#166534",
            border: `1px solid ${statusType === "error" ? "#fca5a5" : "#bbf7d0"}`
          }}
        >
          {statusType === "error" ? <AlertCircleIcon width="18" height="18" /> : <CheckCircleIcon width="18" height="18" />}
          <span>{msg}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "#64748b", fontSize: "1rem" }}>
          Loading profile details...
        </div>
      ) : (
        <div className="profile-page-wrapper">
          <div className="profile-layout-grid">

            {/* LEFT COLUMN: PROFILE SUMMARY & CREDENTIALS CARD */}
            <aside className="profile-sidebar-card">
              <div className="profile-avatar-wrap">
                <div className="profile-avatar-circle">
                  {(profile.fullName || profile.id || "U").charAt(0).toUpperCase()}
                </div>
                <h2 className="profile-avatar-name">
                  {profile.fullName || "University Member"}
                </h2>
                <div className="profile-avatar-id">
                  University ID: {profile.id || storedId}
                </div>
                <span className={`profile-role-badge ${badge.className}`}>
                  {badge.icon}
                  <span>{badge.label}</span>
                </span>
              </div>

              <div className="profile-meta-list">
                <div className="profile-meta-row">
                  <span className="profile-meta-label">Account Status</span>
                  <span className="profile-status-pill">
                    <CheckCircleIcon width="11" height="11" /> Active
                  </span>
                </div>
                <div className="profile-meta-row">
                  <span className="profile-meta-label">University ID</span>
                  <span className="profile-meta-value">{profile.id || storedId}</span>
                </div>
                <div className="profile-meta-row">
                  <span className="profile-meta-label">System Role</span>
                  <span className="profile-meta-value">
                    {profile.isMasterAdmin ? "Super Admin" : (profile.isDeptAdmin ? "Dept Admin" : profile.role?.toUpperCase() || "Staff")}
                  </span>
                </div>
                <div className="profile-meta-row">
                  <span className="profile-meta-label">Department</span>
                  <span className="profile-meta-value">
                    {profile.department || profile.school || (profile.isMasterAdmin ? "Super Admin" : "General")}
                  </span>
                </div>
                <div className="profile-meta-row">
                  <span className="profile-meta-label">Email Verified</span>
                  <span className="profile-verified-pill">
                    <CheckCircleIcon width="11" height="11" /> Verified
                  </span>
                </div>
                <div className="profile-meta-row">
                  <span className="profile-meta-label">Phone Verified</span>
                  {profile.phone ? (
                    <span className="profile-verified-pill">
                      <CheckCircleIcon width="11" height="11" /> Verified
                    </span>
                  ) : (
                    <span style={{ color: "#94a3b8", fontSize: "0.75rem", fontStyle: "italic" }}>Not Set</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="profile-btn-dashboard"
                onClick={handleBackToDashboard}
              >
                <span>Return to Dashboard</span>
                <ChevronRightIcon width="15" height="15" />
              </button>
            </aside>

            {/* RIGHT COLUMN: MAIN SETTINGS & SECURITY CARDS */}
            <main className="profile-content-area">

              {/* CARD 1: BASIC DETAILS */}
              <div className="profile-card">
                <div className="profile-card-header">
                  <div className="profile-card-icon-box">
                    <UserIcon width="18" height="18" />
                  </div>
                  <div>
                    <h3>Personal & Department Details</h3>
                    <p>Review your official system identification, update display name and department routing.</p>
                  </div>
                </div>

                <form onSubmit={handleSaveBasic}>
                  {(!profile.isMasterAdmin && profile.role === "staff" && (!profile.department || profile.department.toLowerCase() === "general" || profile.department.trim() === "")) && (
                    <div
                      style={{
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        borderLeft: "4px solid #f59e0b",
                        borderRadius: "8px",
                        padding: "12px 16px",
                        marginBottom: "18px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        fontSize: "0.85rem",
                        color: "#92400e"
                      }}
                    >
                      <AlertCircleIcon width="18" height="18" style={{ flexShrink: 0, color: "#f59e0b" }} />
                      <div>
                        <strong>Department Selection Required:</strong> Please select your official department from the dropdown below and click Save Basic Details to join your team.
                      </div>
                    </div>
                  )}

                  <div className="profile-form-grid">
                    {/* University ID (Immutable) */}
                    <div className="profile-field-group">
                      <label className="profile-field-label">University ID</label>
                      <input
                        type="text"
                        className="profile-input disabled"
                        value={profile.id || storedId}
                        disabled
                      />
                    </div>

                    {/* Role (Immutable) */}
                    <div className="profile-field-group">
                      <label className="profile-field-label">System Role</label>
                      <input
                        type="text"
                        className="profile-input disabled"
                        value={profile.isMasterAdmin ? "Super Admin" : (profile.isDeptAdmin ? "Department Admin" : profile.role?.toUpperCase() || "Staff")}
                        disabled
                      />
                    </div>

                    {/* Full Name (Editable) */}
                    <div className="profile-field-group">
                      <label className="profile-field-label">Full Name</label>
                      <input
                        type="text"
                        className="profile-input"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    {/* Department */}
                    <div className="profile-field-group">
                      <label className="profile-field-label">
                        {profile.role === "student" ? "Academic School / Department" : "Department"}
                      </label>

                      {profile.role === "student" ? (
                        <input
                          type="text"
                          className="profile-input disabled"
                          value={profile.department || profile.school || department || "General"}
                          disabled
                        />
                      ) : profile.isMasterAdmin ? (
                        <input
                          type="text"
                          className="profile-input"
                          value={department || "Super Admin"}
                          onChange={(e) => setDepartment(e.target.value)}
                          placeholder="Super Admin / Administrative"
                        />
                      ) : (profile.department && profile.department.toLowerCase() !== "general" && profile.department.trim() !== "") ? (
                        <input
                          type="text"
                          className="profile-input disabled"
                          value={profile.department || department}
                          disabled
                        />
                      ) : (
                        <div>
                          <select
                            className="profile-input"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            required
                            style={{ borderColor: "#f59e0b", backgroundColor: "#fffbeb" }}
                          >
                            <option value="">-- Select Department --</option>
                            {departmentsList.map((dept) => (
                              <option key={dept._id || dept.name} value={dept.name}>
                                {dept.name}
                              </option>
                            ))}
                          </select>
                          <span style={{ fontSize: "0.74rem", color: "#b45309", marginTop: "4px", display: "block", fontWeight: "600" }}>
                            Please select your department to join your team (locked once saved)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                    <button
                      type="submit"
                      className="profile-btn-primary"
                      disabled={savingBasic}
                    >
                      {savingBasic ? "Saving..." : "Save Basic Details"}
                    </button>
                  </div>
                </form>
              </div>

              {/* CARD 2: SECURITY & OTP VERIFICATION */}
              <div className="profile-card">
                <div className="profile-card-header">
                  <div className="profile-card-icon-box">
                    <ShieldIcon width="18" height="18" />
                  </div>
                  <div>
                    <h3>Security & Contact Verification</h3>
                    <p>Two-factor OTP authentication is required to update verified email or phone numbers.</p>
                  </div>
                </div>

                {/* EMAIL ITEM */}
                <div className="profile-contact-item">
                  <div className="profile-contact-row">
                    <div className="profile-contact-left">
                      <div className="profile-contact-icon">
                        <MailIcon width="18" height="18" />
                      </div>
                      <div>
                        <div className="profile-contact-lbl">Email Address</div>
                        <div className="profile-contact-val">
                          <span>{profile.email || "Not Provided"}</span>
                          <span className="profile-verified-pill">
                            <CheckCircleIcon width="11" height="11" /> Verified
                          </span>
                        </div>
                      </div>
                    </div>

                    {!showEmailEdit ? (
                      <button
                        type="button"
                        className="profile-contact-btn"
                        onClick={() => {
                          setShowEmailEdit(true);
                          setEmailStep(1);
                          setNewEmail("");
                          setEmailOtp("");
                        }}
                      >
                        Change Email
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowEmailEdit(false)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#64748b",
                          fontSize: "0.84rem",
                          cursor: "pointer",
                          fontWeight: "500",
                          textDecoration: "underline"
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {/* Email Edit OTP Drawer */}
                  {showEmailEdit && (
                    <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px dashed #cbd5e1" }}>
                      {emailStep === 1 ? (
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
                          <div style={{ flex: 1, minWidth: "220px" }}>
                            <label style={{ fontSize: "0.82rem", fontWeight: "600", color: "#334155", marginBottom: "4px", display: "block" }}>
                              New Email Address
                            </label>
                            <input
                              type="email"
                              className="profile-input"
                              placeholder="e.g. yourname@ctuniversity.edu"
                              value={newEmail}
                              onChange={(e) => setNewEmail(e.target.value)}
                            />
                          </div>
                          <button
                            type="button"
                            className="profile-btn-primary"
                            disabled={emailLoading}
                            onClick={handleSendEmailOtp}
                          >
                            {emailLoading ? "Sending Code..." : "Send Verification OTP"}
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p style={{ fontSize: "0.84rem", color: "#166534", margin: "0 0 8px 0", fontWeight: "500" }}>
                            Enter the 6-digit code sent to <strong>{newEmail}</strong>:
                          </p>
                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                            <input
                              type="text"
                              maxLength="6"
                              className="profile-input"
                              placeholder="6-Digit OTP"
                              value={emailOtp}
                              onChange={(e) => setEmailOtp(e.target.value)}
                              style={{
                                letterSpacing: "4px",
                                fontWeight: "700",
                                textAlign: "center",
                                width: "150px"
                              }}
                            />
                            <button
                              type="button"
                              className="profile-btn-primary"
                              disabled={emailLoading}
                              onClick={handleVerifyEmailOtp}
                            >
                              {emailLoading ? "Verifying..." : "Verify & Update Email"}
                            </button>

                            {emailTimer > 0 ? (
                              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                                Resend in {emailTimer}s
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={handleSendEmailOtp}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#0f172a",
                                  fontSize: "0.82rem",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  textDecoration: "underline"
                                }}
                              >
                                Resend OTP
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* PHONE ITEM */}
                <div className="profile-contact-item">
                  <div className="profile-contact-row">
                    <div className="profile-contact-left">
                      <div className="profile-contact-icon">
                        <PhoneIcon width="18" height="18" />
                      </div>
                      <div>
                        <div className="profile-contact-lbl">Phone Number</div>
                        <div className="profile-contact-val">
                          <span>{profile.phone || "Not Provided"}</span>
                          {profile.phone && (
                            <span className="profile-verified-pill">
                              <CheckCircleIcon width="11" height="11" /> Verified
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!showPhoneEdit ? (
                      <button
                        type="button"
                        className="profile-contact-btn"
                        onClick={() => {
                          setShowPhoneEdit(true);
                          setPhoneStep(1);
                          setNewPhone("");
                          setPhoneOtp("");
                        }}
                      >
                        {profile.phone ? "Change Phone" : "Add Phone"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowPhoneEdit(false)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#64748b",
                          fontSize: "0.84rem",
                          cursor: "pointer",
                          fontWeight: "500",
                          textDecoration: "underline"
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {/* Phone Edit OTP Drawer */}
                  {showPhoneEdit && (
                    <div style={{ marginTop: "14px", paddingTop: "14px", borderTop: "1px dashed #cbd5e1" }}>
                      {phoneStep === 1 ? (
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
                          <div style={{ flex: 1, minWidth: "220px" }}>
                            <label style={{ fontSize: "0.82rem", fontWeight: "600", color: "#334155", marginBottom: "4px", display: "block" }}>
                              New Mobile Number (10 digits)
                            </label>
                            <input
                              type="tel"
                              maxLength="10"
                              className="profile-input"
                              placeholder="e.g. 9876543210"
                              value={newPhone}
                              onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ""))}
                            />
                          </div>
                          <button
                            type="button"
                            className="profile-btn-primary"
                            disabled={phoneLoading}
                            onClick={handleSendPhoneOtp}
                          >
                            {phoneLoading ? "Sending SMS..." : "Send Verification OTP"}
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p style={{ fontSize: "0.84rem", color: "#166534", margin: "0 0 8px 0", fontWeight: "500" }}>
                            Enter the 6-digit SMS code sent to <strong>{newPhone}</strong>:
                          </p>
                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                            <input
                              type="text"
                              maxLength="6"
                              className="profile-input"
                              placeholder="SMS OTP"
                              value={phoneOtp}
                              onChange={(e) => setPhoneOtp(e.target.value)}
                              style={{
                                letterSpacing: "4px",
                                fontWeight: "700",
                                textAlign: "center",
                                width: "150px"
                              }}
                            />
                            <button
                              type="button"
                              className="profile-btn-primary"
                              disabled={phoneLoading}
                              onClick={handleVerifyPhoneOtp}
                            >
                              {phoneLoading ? "Verifying..." : "Verify & Update Phone"}
                            </button>

                            {phoneTimer > 0 ? (
                              <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
                                Resend in {phoneTimer}s
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={handleSendPhoneOtp}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#0f172a",
                                  fontSize: "0.82rem",
                                  fontWeight: "600",
                                  cursor: "pointer",
                                  textDecoration: "underline"
                                }}
                              >
                                Resend OTP
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>

            </main>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
