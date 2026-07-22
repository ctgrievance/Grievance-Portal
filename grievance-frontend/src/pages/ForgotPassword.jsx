import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "../styles/LoginPage.css"; // Reuse input styles
import { UserIcon, PhoneIcon } from "../components/Icons"; // Updated icons
import ctLogo from "../assets/ct-logo.png";

const ForgotPassword = () => {
  const [userId, setUserId] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusType, setStatusType] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setStatusType("");

    try {
      // Updated API payload: id + phone
      await axios.post(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/auth/forgot-password`,
        { id: userId, phone }
      );

      setMessage("OTP Sent to your verified Phone!");
      setStatusType("success");

      // Store ID as backup for reset step
      localStorage.setItem("reset_id", userId);

      // Navigate to reset page
      setTimeout(() => {
        navigate("/reset-password", {
          state: { id: userId },
        });
      }, 1500);

    } catch (err) {
      setMessage(err.response?.data?.message || "User not found or ID/Phone mismatch");
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
      <div className="forgot-password-card" style={{
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
          <h2 style={{ fontSize: "1.75rem", color: "#1e293b", marginBottom: "10px", fontWeight: "700" }}>Forgot Password?</h2>
          <p style={{ color: "#64748b", fontSize: "0.95rem", lineHeight: "1.5" }}>
            Enter your University ID and Registered Phone to receive a reset OTP.
          </p>
        </div>

        {message && (
          <div className={`alert-box ${statusType}`} style={{ marginBottom: "20px" }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">

          <div className="input-group">
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#334155" }}>University ID</label>
            <div className="input-wrapper id-field">
              <span className="icon"><UserIcon /></span>
              <input
                type="text"
                placeholder="e.g. 72212871"
                value={userId}
                onChange={(e) => setUserId(e.target.value.toUpperCase())}
                autoComplete="off"
                required
                style={{ width: "100%", padding: "12px 12px 12px 40px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", fontSize: "1rem" }}
              />
            </div>
          </div>

          <div className="input-group" style={{ marginTop: "15px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500", color: "#334155" }}>Registered Phone</label>
            <div className="input-wrapper phone-field">
              <span className="icon"><PhoneIcon /></span>
              <input
                type="tel"
                placeholder="e.g. 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="off"
                required
                pattern="[0-9]{10}"
                style={{ width: "100%", padding: "12px 12px 12px 40px", borderRadius: "10px", border: "1px solid #cbd5e1", outline: "none", fontSize: "1rem" }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{
              marginTop: "20px",
              background: loading ? "#94a3b8" : "#2563eb",
              transform: loading ? "none" : ""
            }}
          >
            {loading ? "Verifying..." : "Send Reset OTP"}
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
        }
        .input-wrapper.id-field input, .input-wrapper.phone-field input {
           padding-left: 40px !important;
        }
      `}</style>
    </div>
  );
};

export default ForgotPassword;
