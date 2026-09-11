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
  ChevronRightIcon
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
      if (dept) {
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
      showToast(`Verification code sent to ${newEmail}`, "info");
    } catch (err) {
      showToast(err.message || "Failed to send email OTP", "error");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.length !== 6) {
      showToast("Please enter the complete 6-digit verification code", "error");
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
          body: JSON.stringify({ newEmail, otp: emailOtp })
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid verification code");

      if (data.token) localStorage.setItem("grievance_token", data.token);

      setProfile(prev => ({ ...prev, email: data.email }));
      setShowEmailEdit(false);
      setEmailStep(1);
      setEmailOtp("");
      setNewEmail("");
      showToast("Email address verified and updated successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to verify email code", "error");
    } finally {
      setEmailLoading(false);
    }
  };

  // 3. PHONE OTP FLOW
  const handleSendPhoneOtp = async () => {
    const clean = newPhone.trim();
    if (!clean || !/^\d{10}$/.test(clean)) {
      showToast("Please enter a valid 10-digit phone number", "error");
      return;
    }
    if (clean === profile.phone) {
      showToast("New phone must be different from current phone", "error");
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
          body: JSON.stringify({ newPhone: clean })
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send SMS code");

      setPhoneStep(2);
      setPhoneTimer(60);
      showToast(`SMS verification code sent to ${clean}`, "info");
    } catch (err) {
      showToast(err.message || "Failed to send phone OTP", "error");
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async () => {
    if (!phoneOtp || phoneOtp.length !== 6) {
      showToast("Please enter the complete 6-digit SMS code", "error");
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
          body: JSON.stringify({ newPhone: newPhone.trim(), otp: phoneOtp })
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid verification code");

      setProfile(prev => ({ ...prev, phone: data.phone }));
      setShowPhoneEdit(false);
      setPhoneStep(1);
      setPhoneOtp("");
      setNewPhone("");
      showToast("Phone number verified and updated successfully!", "success");
    } catch (err) {
      showToast(err.message || "Failed to verify SMS code", "error");
    } finally {
      setPhoneLoading(false);
    }
  };

  // Role display label & badge
  const getRoleBadge = () => {
    if (profile.isMasterAdmin) {
      return {
        label: "Super Admin",
        bg: "#fef3c7",
        color: "#92400e",
        border: "#fde68a",
        icon: "👑"
      };
    }
    if (profile.isDeptAdmin) {
      return {
        label: `Dept Admin - ${profile.adminDepartment || profile.department || "Admin"}`,
        bg: "#eff6ff",
        color: "#1e40af",
        border: "#bfdbfe",
        icon: "🛡️"
      };
    }
    if (profile.role === "staff" && (profile.adminDepartment || profile.department)) {
      return {
        label: `Staff Team - ${profile.department || profile.adminDepartment}`,
        bg: "#f0fdf4",
        color: "#166534",
        border: "#bbf7d0",
        icon: "👤"
      };
    }
    if (profile.role === "staff") {
      return {
        label: "General Staff (Unassigned)",
        bg: "#f8fafc",
        color: "#475569",
        border: "#e2e8f0",
        icon: "📋"
      };
    }
    return {
      label: profile.role ? profile.role.toUpperCase() : "User",
      bg: "#f8fafc",
      color: "#475569",
      border: "#e2e8f0",
      icon: "👤"
    };
  };

  const badge = getRoleBadge();

  return (
    <div className="dashboard-container" style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>
      {/* HEADER */}
      <header className="dashboard-header">
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <img src={ctLogo} alt="CT University" style={{ height: "48px" }} />
          <div className="header-content">
            <h1>User Profile</h1>
            <p>Manage your account settings, department assignment, and verified contacts</p>
          </div>
        </div>
        <button
          className="logout-btn-header"
          onClick={handleBackToDashboard}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          ← Back to Dashboard
        </button>
      </header>

      {/* TOAST NOTIFICATION */}
      {msg && (
        <div
          className={`alert-box ${statusType}`}
          style={{
            maxWidth: "900px",
            margin: "20px auto 0",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            gap: "10px"
          }}
        >
          {statusType === "error" ? <AlertCircleIcon width="20" height="20" /> : <CheckCircleIcon width="20" height="20" />}
          <span>{msg}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 20px", color: "#6366f1", fontSize: "1.1rem" }}>
          Loading your profile...
        </div>
      ) : (
        <div style={{ maxWidth: "900px", margin: "25px auto", padding: "0 20px 60px" }}>
          
          {/* USER HERO CARD */}
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "30px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
              border: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "20px",
              marginBottom: "25px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: profile.isMasterAdmin
                    ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"
                    : "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.8rem",
                  fontWeight: "700",
                  boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)"
                }}
              >
                {(profile.fullName || profile.id || "U").charAt(0).toUpperCase()}
              </div>

              <div>
                <h2 style={{ margin: "0 0 6px 0", fontSize: "1.4rem", color: "#1e293b" }}>
                  {profile.fullName || "University Member"}
                </h2>
                <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <span style={{ fontSize: "0.9rem", color: "#64748b", fontWeight: "600" }}>
                    ID: {profile.id || storedId}
                  </span>
                  <span
                    style={{
                      background: badge.bg,
                      color: badge.color,
                      border: `1px solid ${badge.border}`,
                      padding: "3px 10px",
                      borderRadius: "12px",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px"
                    }}
                  >
                    <span>{badge.icon}</span> {badge.label}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={handleBackToDashboard}
              style={{
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: "8px",
                padding: "8px 16px",
                color: "#334155",
                fontWeight: "600",
                fontSize: "0.9rem",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              Dashboard <ChevronRightIcon width="16" height="16" />
            </button>
          </div>

          {/* MAIN PROFILE FORM */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "25px" }}>

            {/* SECTION 1: PERSONAL & DEPARTMENT DETAILS */}
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "28px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
                border: "1px solid #e2e8f0"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                <UserIcon width="22" height="22" color="#4f46e5" />
                <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#1e293b" }}>Basic Information & Department</h3>
              </div>

              <form onSubmit={handleSaveBasic}>
                {(!profile.isMasterAdmin && profile.role === "staff" && (!profile.department || profile.department.toLowerCase() === "general" || profile.department.trim() === "")) && (
                  <div
                    style={{
                      background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                      border: "1px solid #fde68a",
                      borderLeft: "5px solid #f59e0b",
                      borderRadius: "10px",
                      padding: "14px 18px",
                      marginBottom: "20px",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      boxShadow: "0 2px 8px rgba(245, 158, 11, 0.1)"
                    }}
                  >
                    <div style={{ background: "#f59e0b", color: "white", padding: "8px", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <AlertCircleIcon width="20" height="20" />
                    </div>
                    <div>
                      <div style={{ fontWeight: "700", color: "#92400e", fontSize: "0.95rem" }}>
                        ⚠️ Department Selection Required
                      </div>
                      <div style={{ color: "#b45309", fontSize: "0.85rem", marginTop: "2px" }}>
                        You did not choose your department during registration. Please select your official department from the dropdown below and click <strong>Save Basic Details</strong> to join your department team.
                      </div>
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "18px" }}>
                    {/* University ID (Immutable) */}
                    <div className="input-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: "600", color: "#475569", marginBottom: "6px", display: "block" }}>University ID</label>
                      <input
                        type="text"
                        value={profile.id || storedId}
                        disabled
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          backgroundColor: "#f1f5f9",
                          color: "#64748b",
                          cursor: "not-allowed",
                          fontWeight: "600"
                        }}
                      />
                    </div>

                    {/* Role (Immutable) */}
                    <div className="input-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: "600", color: "#475569", marginBottom: "6px", display: "block" }}>System Role</label>
                      <input
                        type="text"
                        value={profile.isMasterAdmin ? "Super Admin" : (profile.isDeptAdmin ? "Department Admin" : profile.role?.toUpperCase() || "Staff")}
                        disabled
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: "1px solid #e2e8f0",
                          backgroundColor: "#f1f5f9",
                          color: "#64748b",
                          cursor: "not-allowed",
                          fontWeight: "600"
                        }}
                      />
                    </div>

                    {/* Full Name (Editable) */}
                    <div className="input-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: "600", color: "#1e293b", marginBottom: "6px", display: "block" }}>Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        required
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: "8px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.95rem"
                        }}
                      />
                    </div>

                    {/* Department (Locked once saved at registration) */}
                    <div className="input-group" style={{ margin: 0 }}>
                      <label style={{ fontWeight: "600", color: "#475569", marginBottom: "6px", display: "block" }}>
                        {profile.role === "student" ? "Academic School / Department" : "Department"}
                      </label>

                      {profile.role === "student" ? (
                        /* 🎓 Student: Strictly read-only, tied to academic school/department saved at registration */
                        <div>
                          <input
                            type="text"
                            value={profile.department || profile.school || department || "General"}
                            disabled
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              borderRadius: "8px",
                              border: "1px solid #e2e8f0",
                              backgroundColor: "#f1f5f9",
                              color: "#64748b",
                              cursor: "not-allowed",
                              fontWeight: "600"
                            }}
                          />
                        </div>
                      ) : profile.isMasterAdmin ? (
                        /* 🛡️ Super Admin */
                        <div>
                          <input
                            type="text"
                            value={department || "Super Admin"}
                            onChange={(e) => setDepartment(e.target.value)}
                            placeholder="Super Admin / Administrative"
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              fontSize: "0.95rem",
                              fontWeight: "500"
                            }}
                          />
                        </div>
                      ) : (profile.department && profile.department.toLowerCase() !== "general" && profile.department.trim() !== "") ? (
                        /* 🏢 Staff with registered department: Locked / Read-only */
                        <div>
                          <input
                            type="text"
                            value={profile.department || department}
                            disabled
                            style={{
                              width: "100%",
                              padding: "10px 14px",
                              borderRadius: "8px",
                              border: "1px solid #e2e8f0",
                              backgroundColor: "#f1f5f9",
                              color: "#64748b",
                              cursor: "not-allowed",
                              fontWeight: "600"
                            }}
                          />
                        </div>
                    ) : (
                      /* ⚠️ Unassigned Staff: Allow initial selection to complete setup */
                      <div>
                        <select
                          value={department}
                          onChange={(e) => setDepartment(e.target.value)}
                          required
                          style={{
                            width: "100%",
                            padding: "10px 14px",
                            borderRadius: "8px",
                            border: "2px solid #f59e0b",
                            fontSize: "0.95rem",
                            backgroundColor: "#fffbeb",
                            boxShadow: "0 0 0 3px rgba(245, 158, 11, 0.15)"
                          }}
                        >
                          <option value="">-- Select Department --</option>
                          {departmentsList.map((dept) => (
                            <option key={dept._id || dept.name} value={dept.name}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                        <span style={{ fontSize: "0.75rem", color: "#b45309", marginTop: "4px", display: "block", fontWeight: "600" }}>
                          ⚠️ Please select your department to join your team (locked once saved)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={savingBasic}
                    style={{ minWidth: "160px", padding: "10px 20px" }}
                  >
                    {savingBasic ? "Saving Changes..." : "Save Basic Details"}
                  </button>
                </div>
              </form>
            </div>

            {/* SECTION 2: VERIFIED CONTACT INFORMATION (WITH OTP) */}
            <div
              style={{
                background: "white",
                borderRadius: "16px",
                padding: "28px",
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.05)",
                border: "1px solid #e2e8f0"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #f1f5f9", paddingBottom: "12px" }}>
                <ShieldIcon width="22" height="22" color="#4f46e5" />
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#1e293b" }}>Contact Security & OTP Verification</h3>
                  <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                    Updating email address or phone number requires OTP verification to protect your account.
                  </p>
                </div>
              </div>

              {/* EMAIL ITEM */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "18px 20px",
                  marginBottom: "20px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ background: "#eff6ff", color: "#2563eb", padding: "10px", borderRadius: "8px" }}>
                      <MailIcon width="20" height="20" />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600" }}>Email Address</div>
                      <div style={{ fontSize: "1rem", color: "#1e293b", fontWeight: "600" }}>
                        {profile.email || "Not Provided"}
                        <span style={{ marginLeft: "10px", color: "#16a34a", fontSize: "0.8rem", fontWeight: "600" }}>✓ Verified</span>
                      </div>
                    </div>
                  </div>

                  {!showEmailEdit ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowEmailEdit(true);
                        setEmailStep(1);
                        setNewEmail("");
                        setEmailOtp("");
                      }}
                      style={{
                        background: "white",
                        border: "1px solid #cbd5e1",
                        padding: "6px 14px",
                        borderRadius: "8px",
                        fontWeight: "600",
                        fontSize: "0.85rem",
                        color: "#2563eb",
                        cursor: "pointer"
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
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        textDecoration: "underline"
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {/* Email Edit OTP Drawer */}
                {showEmailEdit && (
                  <div style={{ marginTop: "18px", paddingTop: "16px", borderTop: "1px dashed #cbd5e1" }}>
                    {emailStep === 1 ? (
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
                        <div style={{ flex: 1, minWidth: "240px" }}>
                          <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "4px", display: "block" }}>
                            New Email Address
                          </label>
                          <input
                            type="email"
                            placeholder="e.g. yourname@ctuniversity.edu"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "9px 12px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              fontSize: "0.9rem"
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={emailLoading}
                          onClick={handleSendEmailOtp}
                          style={{ padding: "9px 18px", fontSize: "0.9rem" }}
                        >
                          {emailLoading ? "Sending Code..." : "Send Verification OTP"}
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: "0.85rem", color: "#166534", margin: "0 0 10px 0", fontWeight: "500" }}>
                          Enter the 6-digit code sent to <strong>{newEmail}</strong>:
                        </p>
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                          <input
                            type="text"
                            maxLength="6"
                            placeholder="6-Digit OTP"
                            value={emailOtp}
                            onChange={(e) => setEmailOtp(e.target.value)}
                            style={{
                              letterSpacing: "4px",
                              fontWeight: "700",
                              textAlign: "center",
                              width: "160px",
                              padding: "9px 12px",
                              borderRadius: "8px",
                              border: "1px solid #2563eb",
                              fontSize: "1rem"
                            }}
                          />
                          <button
                            type="button"
                            className="btn-primary"
                            disabled={emailLoading}
                            onClick={handleVerifyEmailOtp}
                            style={{ padding: "9px 18px", fontSize: "0.9rem" }}
                          >
                            {emailLoading ? "Verifying..." : "Verify & Update Email"}
                          </button>

                          {emailTimer > 0 ? (
                            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                              Resend in {emailTimer}s
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSendEmailOtp}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#2563eb",
                                fontSize: "0.85rem",
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
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "18px 20px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ background: "#ecfdf5", color: "#059669", padding: "10px", borderRadius: "8px" }}>
                      <PhoneIcon width="20" height="20" />
                    </div>
                    <div>
                      <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: "600" }}>Phone Number</div>
                      <div style={{ fontSize: "1rem", color: "#1e293b", fontWeight: "600" }}>
                        {profile.phone || "Not Provided"}
                        {profile.phone && <span style={{ marginLeft: "10px", color: "#16a34a", fontSize: "0.8rem", fontWeight: "600" }}>✓ Verified</span>}
                      </div>
                    </div>
                  </div>

                  {!showPhoneEdit ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowPhoneEdit(true);
                        setPhoneStep(1);
                        setNewPhone("");
                        setPhoneOtp("");
                      }}
                      style={{
                        background: "white",
                        border: "1px solid #cbd5e1",
                        padding: "6px 14px",
                        borderRadius: "8px",
                        fontWeight: "600",
                        fontSize: "0.85rem",
                        color: "#2563eb",
                        cursor: "pointer"
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
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        textDecoration: "underline"
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {/* Phone Edit OTP Drawer */}
                {showPhoneEdit && (
                  <div style={{ marginTop: "18px", paddingTop: "16px", borderTop: "1px dashed #cbd5e1" }}>
                    {phoneStep === 1 ? (
                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
                        <div style={{ flex: 1, minWidth: "240px" }}>
                          <label style={{ fontSize: "0.85rem", fontWeight: "600", color: "#334155", marginBottom: "4px", display: "block" }}>
                            New Mobile Number (10 digits)
                          </label>
                          <input
                            type="tel"
                            maxLength="10"
                            placeholder="e.g. 9876543210"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, ""))}
                            style={{
                              width: "100%",
                              padding: "9px 12px",
                              borderRadius: "8px",
                              border: "1px solid #cbd5e1",
                              fontSize: "0.9rem"
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={phoneLoading}
                          onClick={handleSendPhoneOtp}
                          style={{ padding: "9px 18px", fontSize: "0.9rem" }}
                        >
                          {phoneLoading ? "Sending SMS..." : "Send Verification OTP"}
                        </button>
                      </div>
                    ) : (
                      <div>
                        <p style={{ fontSize: "0.85rem", color: "#166534", margin: "0 0 10px 0", fontWeight: "500" }}>
                          Enter the 6-digit SMS code sent to <strong>{newPhone}</strong>:
                        </p>
                        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                          <input
                            type="text"
                            maxLength="6"
                            placeholder="SMS OTP"
                            value={phoneOtp}
                            onChange={(e) => setPhoneOtp(e.target.value)}
                            style={{
                              letterSpacing: "4px",
                              fontWeight: "700",
                              textAlign: "center",
                              width: "160px",
                              padding: "9px 12px",
                              borderRadius: "8px",
                              border: "1px solid #059669",
                              fontSize: "1rem"
                            }}
                          />
                          <button
                            type="button"
                            className="btn-primary"
                            disabled={phoneLoading}
                            onClick={handleVerifyPhoneOtp}
                            style={{ padding: "9px 18px", fontSize: "0.9rem", backgroundColor: "#059669" }}
                          >
                            {phoneLoading ? "Verifying..." : "Verify & Update Phone"}
                          </button>

                          {phoneTimer > 0 ? (
                            <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                              Resend in {phoneTimer}s
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSendPhoneOtp}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#2563eb",
                                fontSize: "0.85rem",
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

          </div>
        </div>
      )}
    </div>
  );
}

export default ProfilePage;
