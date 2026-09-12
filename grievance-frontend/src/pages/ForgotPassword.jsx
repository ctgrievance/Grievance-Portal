import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "../styles/LoginPage.css";
import { UserIcon, KeyIcon, LockIcon, EyeIcon, EyeOffIcon } from "../components/Icons";
import ctLogo from "../assets/ct-logo.png";

const MailIcon = (props) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const ForgotPassword = () => {
  // 1: Enter ID, 2: Submit OTP, 3: Set New Password
  const [step, setStep] = useState(1);
  const [userId, setUserId] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");

  // Step 2 Fields (OTP Verification)
  const [otp, setOtp] = useState("");

  // Step 3 Fields (New Password)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Feedback & Loading
  const [message, setMessage] = useState("");
  const [statusType, setStatusType] = useState(""); // 'success' | 'error'
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const navigate = useNavigate();

  // Handle Resend Countdown
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const getApiBaseUrl = () => {
    if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
    if (typeof window !== "undefined" && window.location.origin) {
      if (window.location.port === "3000") return "http://localhost:5000";
      return window.location.origin;
    }
    return "http://localhost:5000";
  };

  // ✅ STEP 1: Send OTP to registered Email
  const handleRequestEmailOtp = async () => {
    const cleanId = userId.trim().toUpperCase();
    if (!cleanId) {
      setMessage("Please enter your University ID.");
      setStatusType("error");
      return;
    }

    setLoading(true);
    setMessage("");
    setStatusType("");

    try {
      const baseUrl = getApiBaseUrl();
      const res = await axios.post(`${baseUrl}/api/auth/forgot-password`, {
        id: cleanId
      });

      const data = res.data;
      setMaskedEmail(data.maskedEmail || "");
      setStep(2); // Move to OTP submission step
      setResendTimer(30);
      setMessage(data.message || `Password reset OTP sent to your registered email (${data.maskedEmail}).`);
      setStatusType("success");

    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to find account. Please verify your University ID.");
      setStatusType("error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ STEP 2: Verify OTP first (Password fields ONLY unlock after this succeeds)
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    const cleanId = userId.trim().toUpperCase();
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length < 6) {
      setMessage("Please enter the complete 6-digit OTP code.");
      setStatusType("error");
      return;
    }

    setLoading(true);
    setMessage("");
    setStatusType("");

    try {
      const baseUrl = getApiBaseUrl();
      const res = await axios.post(`${baseUrl}/api/auth/verify-reset-otp`, {
        id: cleanId,
        otp: cleanOtp
      });

      setMessage(res.data?.message || "✅ OTP verified successfully! Now set your new password.");
      setStatusType("success");
      setStep(3); // 🔥 Unlock Password fields only now!

    } catch (err) {
      setMessage(err.response?.data?.message || "Invalid or expired OTP code. Please check your email and try again.");
      setStatusType("error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ STEP 3: Set New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();

    const cleanId = userId.trim().toUpperCase();
    const cleanOtp = otp.trim();

    if (!newPassword) {
      setMessage("Please enter a new password.");
      setStatusType("error");
      return;
    }

    if (newPassword.length < 3) {
      setMessage("Password must be at least 3 characters long.");
      setStatusType("error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match. Please check.");
      setStatusType("error");
      return;
    }

    setLoading(true);
    setMessage("");
    setStatusType("");

    try {
      const baseUrl = getApiBaseUrl();
      const res = await axios.post(`${baseUrl}/api/auth/reset-password`, {
        id: cleanId,
        otp: cleanOtp,
        newPassword
      });

      setMessage(res.data?.message || "Password reset successful! Redirecting to login...");
      setStatusType("success");

      setTimeout(() => {
        navigate("/");
      }, 1500);

    } catch (err) {
      setMessage(err.response?.data?.message || "Password reset failed. Please try again.");
      setStatusType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="login-container"
      style={{
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        minHeight: "100vh",
        padding: "20px"
      }}
    >
      <div
        className="forgot-password-card"
        style={{
          background: "#ffffff",
          width: "100%",
          maxWidth: "480px",
          borderRadius: "24px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)",
          padding: "36px 32px",
          animation: "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          position: "relative"
        }}
      >
        {/* Step Indicator Progress */}
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginBottom: "20px" }}>
          <div style={{ height: "4px", width: "40px", borderRadius: "2px", background: step >= 1 ? "#2563eb" : "#e2e8f0", transition: "all 0.3s" }} />
          <div style={{ height: "4px", width: "40px", borderRadius: "2px", background: step >= 2 ? "#2563eb" : "#e2e8f0", transition: "all 0.3s" }} />
          <div style={{ height: "4px", width: "40px", borderRadius: "2px", background: step >= 3 ? "#2563eb" : "#e2e8f0", transition: "all 0.3s" }} />
        </div>

        {/* Header with University Logo */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <img src={ctLogo} alt="CT University Logo" style={{ height: "64px", marginBottom: "16px", objectFit: "contain" }} />
          <h2 style={{ fontSize: "1.65rem", color: "#0f172a", marginBottom: "8px", fontWeight: "700", letterSpacing: "-0.02em" }}>
            {step === 1 && "Forgot Password?"}
            {step === 2 && "Enter Verification Code"}
            {step === 3 && "Set New Password"}
          </h2>
          <p style={{ color: "#64748b", fontSize: "0.92rem", lineHeight: "1.5", margin: "0 auto", maxWidth: "360px" }}>
            {step === 1 && "Enter your University ID to receive a password reset OTP on your registered email."}
            {step === 2 && "Enter the 6-digit OTP code sent to your email to verify your identity."}
            {step === 3 && "Your OTP has been verified. Enter and confirm your new password."}
          </p>
        </div>

        {/* Feedback Alert Box */}
        {message && (
          <div
            className={`alert-box ${statusType}`}
            style={{
              marginBottom: "20px",
              padding: "12px 16px",
              borderRadius: "12px",
              fontSize: "0.88rem",
              lineHeight: "1.4",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: statusType === "success" ? "#ecfdf5" : "#fef2f2",
              color: statusType === "success" ? "#065f46" : "#991b1b",
              border: `1px solid ${statusType === "success" ? "#a7f3d0" : "#fecaca"}`
            }}
          >
            <span>{statusType === "success" ? "✅" : "⚠️"}</span>
            <span style={{ flex: 1 }}>{message}</span>
          </div>
        )}

        {/* ================= STEP 1: ENTER UNIVERSITY ID ================= */}
        {step === 1 && (
          <form onSubmit={(e) => { e.preventDefault(); handleRequestEmailOtp(); }} autoComplete="off">
            <div className="input-group" style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#334155", fontSize: "0.9rem" }}>
                University ID / Registration No.
              </label>
              <div className="input-wrapper id-field" style={{ position: "relative" }}>
                <span className="icon" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }}>
                  <UserIcon />
                </span>
                <input
                  type="text"
                  placeholder="Enter Here"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value.toUpperCase())}
                  autoComplete="off"
                  required
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "14px 14px 14px 44px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    outline: "none",
                    fontSize: "1rem",
                    transition: "all 0.2s ease"
                  }}
                />
              </div>
              <span style={{ fontSize: "0.78rem", color: "#64748b", marginTop: "6px", display: "block" }}>
                Supports Student IDs (8 digits), Staff IDs (5 digits), & Admin IDs.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || !userId.trim()}
              className="btn-primary"
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                background: loading ? "#94a3b8" : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                color: "#ffffff",
                fontWeight: "600",
                fontSize: "1rem",
                border: "none",
                cursor: loading || !userId.trim() ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
                transition: "all 0.2s ease"
              }}
            >
              {loading ? "Searching & Sending Email OTP..." : "Send Reset OTP to Email →"}
            </button>
          </form>
        )}

        {/* ================= STEP 2: SUBMIT OTP (NO PASSWORD FIELDS YET!) ================= */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} autoComplete="off">
            {/* Email Destination Info Card */}
            <div
              style={{
                background: "#f8fafc",
                border: "1.5px solid #e2e8f0",
                borderRadius: "14px",
                padding: "16px",
                marginBottom: "20px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <span style={{ fontSize: "0.8rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b" }}>
                  Delivery Destination
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    padding: "3px 8px",
                    borderRadius: "20px",
                    background: "#dcfce7",
                    color: "#166534",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#22c55e" }} />
                  OTP Sent via Email
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "#eff6ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <MailIcon />
                </div>
                <div>
                  <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
                    Registered Email Address
                  </div>
                  <div style={{ fontSize: "0.98rem", fontWeight: "700", color: "#0f172a", letterSpacing: "0.3px" }}>
                    {maskedEmail || "Linked Email Address"}
                  </div>
                </div>
              </div>
            </div>

            {/* OTP Input Field */}
            <div className="input-group" style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ fontWeight: "600", color: "#334155", fontSize: "0.88rem" }}>
                  6-Digit Verification Code
                </label>
                {resendTimer > 0 ? (
                  <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    Resend in <strong>{resendTimer}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestEmailOtp}
                    disabled={loading}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#2563eb",
                      fontSize: "0.8rem",
                      fontWeight: "600",
                      cursor: "pointer",
                      padding: 0
                    }}
                  >
                    Resend OTP
                  </button>
                )}
              </div>
              <div className="input-wrapper otp-field" style={{ position: "relative" }}>
                <span className="icon" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }}>
                  <KeyIcon />
                </span>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  autoComplete="one-time-code"
                  required
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "14px 14px 14px 44px",
                    borderRadius: "12px",
                    border: "1.5px solid #cbd5e1",
                    letterSpacing: "6px",
                    fontWeight: "700",
                    fontSize: "1.2rem",
                    outline: "none",
                    textAlign: "center"
                  }}
                />
              </div>
            </div>

            {/* Submit OTP Button */}
            <button
              type="submit"
              disabled={loading || otp.length < 6}
              className="btn-primary"
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                background: loading || otp.length < 6
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                color: "#ffffff",
                fontWeight: "600",
                fontSize: "1rem",
                border: "none",
                cursor: loading || otp.length < 6 ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
                transition: "all 0.2s ease"
              }}
            >
              {loading ? "Verifying OTP..." : "Verify OTP Code →"}
            </button>

            {/* Change ID Button */}
            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => { setStep(1); setMessage(""); setStatusType(""); }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  fontSize: "0.85rem",
                  fontWeight: "500",
                  cursor: "pointer"
                }}
              >
                ← Change University ID ({userId})
              </button>
            </div>
          </form>
        )}

        {/* ================= STEP 3: SET NEW PASSWORD (ONLY SHOWN AFTER OTP VERIFIED!) ================= */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} autoComplete="off">
            {/* New Password */}
            <div className="input-group" style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#334155", fontSize: "0.88rem" }}>
                New Password
              </label>
              <div className="input-wrapper password" style={{ position: "relative" }}>
                <span className="icon" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }}>
                  <LockIcon />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "12px 42px 12px 44px",
                    borderRadius: "10px",
                    border: "1.5px solid #cbd5e1",
                    outline: "none",
                    fontSize: "0.95rem"
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    cursor: "pointer"
                  }}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="input-group" style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", color: "#334155", fontSize: "0.88rem" }}>
                Confirm New Password
              </label>
              <div className="input-wrapper password" style={{ position: "relative" }}>
                <span className="icon" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }}>
                  <LockIcon />
                </span>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-type new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  style={{
                    width: "100%",
                    padding: "12px 42px 12px 44px",
                    borderRadius: "10px",
                    border: `1.5px solid ${confirmPassword && newPassword ? (confirmPassword === newPassword ? "#22c55e" : "#ef4444") : "#cbd5e1"}`,
                    outline: "none",
                    fontSize: "0.95rem"
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    cursor: "pointer"
                  }}
                >
                  {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {confirmPassword && newPassword && confirmPassword !== newPassword && (
                <span style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "4px", display: "block" }}>
                  Passwords do not match
                </span>
              )}
            </div>

            {/* Submit Password Button */}
            <button
              type="submit"
              disabled={loading || !newPassword || newPassword !== confirmPassword}
              className="btn-primary"
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                background: loading || !newPassword || newPassword !== confirmPassword
                  ? "#94a3b8"
                  : "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
                color: "#ffffff",
                fontWeight: "600",
                fontSize: "1rem",
                border: "none",
                cursor: loading || !newPassword || newPassword !== confirmPassword ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.3)",
                transition: "all 0.2s ease"
              }}
            >
              {loading ? "Updating Password..." : "Update Password & Login"}
            </button>
          </form>
        )}

        {/* Back to Login Footer */}
        <div style={{ textAlign: "center", marginTop: "24px", borderTop: "1px solid #f1f5f9", paddingTop: "16px" }}>
          <Link
            to="/"
            style={{
              color: "#64748b",
              textDecoration: "none",
              fontWeight: "500",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.9rem",
              transition: "color 0.2s"
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#2563eb")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#64748b")}
          >
            ← Back to Login
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .input-wrapper input:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15) !important;
        }
      `}</style>
    </div>
  );
};

export default ForgotPassword;
