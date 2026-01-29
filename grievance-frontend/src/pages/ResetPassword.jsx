import React, { useState } from "react";
import axios from "axios";
import { useLocation, useNavigate, Link } from "react-router-dom";
import "../styles/LoginPage.css";
import { UserIcon, KeyIcon, LockIcon, EyeIcon, EyeOffIcon } from "../components/Icons";
import ctLogo from "../assets/ct-logo.png";

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Auto-read userId from router state or localStorage
  const [userId, setUserId] = useState(
    location.state?.id || localStorage.getItem("reset_id") || ""
  );

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [statusType, setStatusType] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setStatusType("");

    try {
      const res = await axios.post(
        "http://localhost:5000/api/auth/reset-password",
        { id: userId, otp, newPassword }
      );

      setMessage("Password Reset Successful! Redirecting...");
      setStatusType("success");

      // cleanup
      localStorage.removeItem("reset_id");

      setTimeout(() => {
        navigate("/"); // back to login
      }, 1500);

    } catch (err) {
      setMessage(err.response?.data?.message || "Reset failed. Please check OTP.");
      setStatusType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{
      justifyContent: "center",
      alignItems: "center",
      background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
      minHeight: "100vh"
    }}>
      <div className="reset-password-card" style={{
        background: "white",
        width: "100%",
        maxWidth: "450px",
        borderRadius: "24px",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        padding: "40px",
        margin: "20px",
        animation: "slideUp 0.5s ease-out"
      }}>
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <img src={ctLogo} alt="Logo" style={{ height: "60px", marginBottom: "20px" }} />
          <h2 style={{ fontSize: "1.75rem", color: "#1e293b", marginBottom: "10px", fontWeight: "700" }}>Reset Password</h2>
          <p style={{ color: "#64748b", fontSize: "0.95rem", lineHeight: "1.5" }}>
            Enter the OTP sent to your email and choose a new password.
          </p>
        </div>

        {message && (
          <div className={`alert-box ${statusType}`} style={{ marginBottom: "20px" }}>
            {message}
          </div>
        )}

        <form onSubmit={handleReset} autoComplete="off">

          {/* User ID Field (Read Only) */}
          <div className="input-group">
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#334155" }}>University ID</label>
            <div className="input-wrapper id-field" style={{ opacity: 0.7 }}>
              <span className="icon"><UserIcon /></span>
              <input
                type="text"
                value={userId}
                disabled
                readOnly
                style={{ width: "100%", padding: "12px 12px 12px 40px", borderRadius: "10px", border: "1px solid #cbd5e1", background: "#f1f5f9", cursor: "not-allowed" }}
              />
            </div>
          </div>

          {/* OTP Field */}
          <div className="input-group">
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#334155" }}>Email OTP Code</label>
            <div className="input-wrapper otp-field">
              <span className="icon"><KeyIcon /></span>
              <input
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                autoComplete="off"
                required
                style={{ width: "100%", padding: "12px 12px 12px 40px", borderRadius: "10px", border: "1px solid #cbd5e1", letterSpacing: "2px", fontWeight: "600" }}
              />
            </div>
          </div>

          {/* New Password Field */}
          <div className="input-group">
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#334155" }}>New Password</label>
            <div className="input-wrapper password">
              <span className="icon"><LockIcon /></span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
                style={{ width: "100%", padding: "12px 40px 12px 40px", borderRadius: "10px", border: "1px solid #cbd5e1" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="password-toggle"
                style={{ right: "12px" }}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{
              marginTop: "20px",
              background: loading ? "#94a3b8" : "#2563eb",
              transform: loading ? "none" : ""
            }}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
        <div style={{ textAlign: "center", marginTop: "24px" }}>
          <Link to="/" style={{
            color: "#64748b",
            textDecoration: "none",
            fontWeight: "500",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "0.9rem",
            transition: "color 0.2s"
          }}
            onMouseOver={(e) => e.target.style.color = "#2563eb"}
            onMouseOut={(e) => e.target.style.color = "#64748b"}
          >
            ← Back to Login
          </Link>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .input-wrapper input:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1) !important;
          outline: none;
        }
        .input-wrapper.id-field input {
           padding-left: 40px !important;
        }
      `}</style>
    </div>
  );
};

export default ResetPassword;
