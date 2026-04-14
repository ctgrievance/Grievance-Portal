import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/LoginPage.css";

// Agar aapke paas local logo hai, toh niche wali line uncomment karein:
import ctLogo from "../assets/ct-logo.png";
// const ctLogo = "https://upload.wikimedia.org/wikipedia/commons/9/97/CT_University_logo.png"; 

// ----- ICONS -----
import { UserIcon, LockIcon, PhoneIcon, KeyIcon, EyeIcon, EyeOffIcon, StudentIcon, StaffIcon, AdminIcon } from "../components/Icons";

const getDeptAdminRoute = (department) => {
  if (!department) return "/admin/school";
  const dept = department.trim().toLowerCase();
  
  if (dept === "accounts") return "/admin/account";
  if (dept === "student welfare") return "/admin/studentwelfare";
  if (dept === "student section") return "/admin/studentsection";
  if (dept === "admission") return "/admin/admission";
  if (dept === "examination") return "/admin/examination";
  if (dept === "hr") return "/admin/hr";
  if (dept === "crc (placement)" || dept === "crc" || dept === "placement") return "/admin/crc";
  if (dept === "transport") return "/admin/transport";
  
  return "/admin/school";
};

function LoginPage() {
  const [selectedRole, setSelectedRole] = useState(null);
  const [userId, setUserId] = useState("");
  // const [phone, setPhone] = useState(""); // ❌ Phone not needed for login step 1 anymore
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [message, setMessage] = useState("");
  const [statusType, setStatusType] = useState("");

  const navigate = useNavigate();

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setUserId("");
    setPassword("");
    setOtp("");
    setOtpSent(false);
    setMessage("");
    setStatusType("");
  };

  const handleDirectLogin = (data) => {
    localStorage.setItem("grievance_id", data.user.id.toUpperCase());
    localStorage.setItem("grievance_role", data.user.role.toLowerCase());
    localStorage.setItem("grievance_token", data.token);

    if (data.user.isDeptAdmin) localStorage.setItem("is_dept_admin", "true");
    else localStorage.removeItem("is_dept_admin");

    if (data.user.adminDepartment) localStorage.setItem("admin_department", data.user.adminDepartment);
    else localStorage.removeItem("admin_department");

    if (data.user.isMasterAdmin) localStorage.setItem("is_master_admin", "true");
    else localStorage.removeItem("is_master_admin");

    setMessage("Login successful! Redirecting...");
    setStatusType("success");

    const role = data.user.role.toLowerCase();
    const isDeptAdmin = data.user.isDeptAdmin;

    setTimeout(() => {
      if (role === "student") {
        navigate("/student/dashboard");
      }
      else if (role === "staff") {
        if (isDeptAdmin) {
          navigate(getDeptAdminRoute(data.user.adminDepartment));
        } else if (data.user.adminDepartment) {
          navigate("/staff/admin");
        } else {
          navigate("/staff/general");
        }
      }
      else if (role === "admin") {
        if (data.user.isMasterAdmin) {
          navigate("/admin/dashboard");
        } else {
          navigate(getDeptAdminRoute(data.user.adminDepartment));
        }
      }
    }, 1000);
  };

  // ✅ Step 1: Verify Password & Trigger 2FA
  const handleLoginStep1 = async (e) => {
    e.preventDefault();

    setMessage("Verifying credentials...");
    setStatusType("info");

    try {
      // 🔥 Update Endpoint
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId.toUpperCase(),
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      if (data.requires2FA) {
        setOtpSent(true);
        setMaskedEmail(data.maskedEmail);
        setMessage(`Success! OTP sent to ${data.maskedEmail}`);
        setStatusType("success");
      } else {
        handleDirectLogin(data);
      }
    } catch (err) {
      setMessage(err.message);
      setStatusType("error");
    }
  };

  // ✅ Step 2: Verify OTP
  const handleVerifyLoginOtp = async (e) => {
    e.preventDefault();
    setMessage("Verifying OTP...");
    setStatusType("info");

    try {
      // 🔥 Update Endpoint
      const res = await fetch("http://localhost:5000/api/auth/verify-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId.toUpperCase(),
          otp,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid OTP");

      handleDirectLogin(data);

    } catch (err) {
      setMessage(err.message);
      setStatusType("error");
    }
  };

  return (
    <div className="login-container">
      <div className="login-brand-section">
        <div className="brand-content">
          <img src={ctLogo} alt="University Logo" className="university-logo" />
          <h1>Grievance Portal</h1>
          <p>Secure, transparent, and efficient resolution. Select your role to begin.</p>

          <div className="role-selector">
            <div className={`role-card ${selectedRole === "student" ? "active" : ""}`} onClick={() => handleRoleSelect("student")}>
              <StudentIcon />
              <h3>Student</h3>
            </div>
            <div className={`role-card ${selectedRole === "staff" ? "active" : ""}`} onClick={() => handleRoleSelect("staff")}>
              <StaffIcon />
              <h3>Staff</h3>
            </div>
            <div className={`role-card ${selectedRole === "admin" ? "active" : ""}`} onClick={() => handleRoleSelect("admin")}>
              <AdminIcon />
              <h3>Admin</h3>
            </div>
          </div>
          <div className="brand-footer">© 2025 University Administration</div>
        </div>
      </div>

      <div className="login-form-section">
        <div className="form-wrapper">
          {!selectedRole ? (
            <div className="form-placeholder">
              <h2>Select Your Role</h2>
              <p>Please select your role on the left to activate the form.</p>
            </div>
          ) : (
            <>
              <div className="form-header">
                <h2>Welcome Back, {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}</h2>
                <p>Please login to access your dashboard</p>
              </div>

              {message && <div className={`alert-box ${statusType}`}>{message}</div>}

              {!otpSent ? (
                /* STEP 1: CREDENTIALS */
                <form onSubmit={handleLoginStep1} className="animated-form">
                  <div className="input-group">
                    <label>{selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} ID</label>
                    <div className="input-wrapper id-field">
                      <span className="icon"><UserIcon /></span>
                      <input
                        type="text"
                        placeholder={
                          selectedRole === "student" ? "e.g. 72212871" :
                            selectedRole === "staff" ? "e.g. 25001" : "e.g. 10002"
                        }
                        value={userId}
                        onChange={(e) => setUserId(e.target.value.toUpperCase())}
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Password</label>
                    
                    <div className="input-wrapper password">
                      <span className="icon"><LockIcon /></span>
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="password-toggle"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>
                  

                  <button className="btn-primary" type="submit">Secure Login</button>
                  <div style={{ textAlign: "right", marginBottom: "12px" }}>
  <Link to="/forgot-password" className="forgot-link">
    Forgot Password?
  </Link>
</div>

                </form>
                
              ) : (
                /* STEP 2: OTP */
                <form onSubmit={handleVerifyLoginOtp} className="animated-form">
                  <div className="otp-header">
                    <p>Enter the 2FA Code sent to <strong>{maskedEmail}</strong></p>
                  </div>

                  <div className="input-group">
                    <label>Security Code (Check Email)</label>
                    <div className="input-wrapper otp-field">
                      <span className="icon"><KeyIcon /></span>
                      <input
                        type="text"
                        placeholder="123456"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required
                        autoFocus
                        style={{ letterSpacing: '4px', fontWeight: 'bold' }}
                      />
                    </div>
                  </div>
                  

                  

                  <button className="btn-primary" type="submit">Verify & Login</button>
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setMessage(""); setOtp(""); }}
                    style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', textDecoration: 'underline', marginTop: '10px', fontSize: '14px', display: 'block', width: '100%' }}
                  >
                    Back to credentials
                  </button>
                </form>
              )}

              <div className="form-footer">
                <p>Don’t have an account? <Link to="/register">Register Here</Link></p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;