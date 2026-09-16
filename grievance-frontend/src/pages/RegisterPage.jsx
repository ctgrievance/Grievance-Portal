import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../styles/LoginPage.css";

// Icons
import { UserIcon, LockIcon, MailIcon, PhoneIcon, UsersIcon, BookIcon, EyeIcon, EyeOffIcon, ClipboardIcon, GraduationCapIcon } from "../components/Icons";

const fallbackAcademicDepartments = [
  {
    name: "School of Engineering and Technology",
    programs: ["B.Tech - CSE", "B.Tech - AI", "B.Tech - Civil", "B.Tech - Mech", "BCA", "MCA"]
  },
  {
    name: "School of Management Studies",
    programs: ["BBA", "MBA", "B.Com"]
  },
  {
    name: "School of Law",
    programs: ["BA LL.B", "LL.B", "LL.M"]
  },
  {
    name: "School of Pharmaceutical Sciences",
    programs: ["B.Pharm", "D.Pharm"]
  },
  {
    name: "School of Hotel Management",
    programs: ["BHMCT", "B.Sc Hotel Management"]
  },
  {
    name: "School of Design and innovation",
    programs: ["B.Des", "B.Sc Animation"]
  },
  {
    name: "School of Allied Health Sciences",
    programs: ["BPT", "B.Sc MLT"]
  },
  {
    name: "School of Social Sciences and Liberal Arts",
    programs: ["BA (Hons)", "MA"]
  },
  {
    name: "School of Agriculture and Natural Sciences",
    programs: ["B.Sc Agriculture (Hons)"]
  }
];

function RegisterPage() {
  const [formData, setFormData] = useState({
    id: "",
    ctuId: "",
    role: "",
    studentType: "current",
    fullName: "",
    email: "",
    phone: "",
    password: "",
    program: "",
    department: "",
    school: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [staffDepartments, setStaffDepartments] = useState([]);
  const [academicDepartments, setAcademicDepartments] = useState([]);

  // 🆔 Real-time student verification state
  const [requiresCtuId, setRequiresCtuId] = useState(false);
  const [idChecking, setIdChecking] = useState(false);
  const [idFeedback, setIdFeedback] = useState(null);

  // 🌐 Dynamic API URL resolver matching LoginPage
  const getApiBaseUrl = () => {
    if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
    if (typeof window !== "undefined" && window.location.origin) {
      if (window.location.port === "3000") {
        return `${window.location.protocol}//${window.location.hostname}:5000`;
      }
      return window.location.origin;
    }
    return "http://localhost:5000";
  };

  const checkStudentIdRequirement = async (idToTest) => {
    const queryId = (idToTest || formData.id || "").trim().toUpperCase();
    if (formData.role !== "student" || !queryId || queryId.length < 4) {
      setRequiresCtuId(false);
      setIdFeedback(null);
      return;
    }

    setIdChecking(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(
        `${baseUrl}/api/auth/check-student-id/${encodeURIComponent(queryId)}`
      );

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.warn("Non-JSON response from check-student-id:", res.status);
        return;
      }

      const data = await res.json();

      if (res.ok && data.exists) {
        if (data.isAlreadyRegistered) {
          setIdFeedback({
            type: "warning",
            message: "⚠️ This student account is already registered. Please proceed to login."
          });
        } else {
          setIdFeedback({
            type: "success",
            message: "Registration ID verified"
          });
        }

        setRequiresCtuId(Boolean(data.requiresCtuId));
      } else {
        setRequiresCtuId(false);
        setIdFeedback({
          type: "error",
          message: data.message || "Registration number not found in university records."
        });
      }
    } catch (err) {
      console.error("Error checking student ID:", err);
    } finally {
      setIdChecking(false);
    }
  };

  // Real-time debounce check when student enters Registration ID
  useEffect(() => {
    if (formData.role !== "student" || !formData.id || formData.id.trim().length < 4) {
      setRequiresCtuId(false);
      setIdFeedback(null);
      return;
    }

    const timer = setTimeout(() => {
      checkStudentIdRequirement(formData.id);
    }, 600);

    return () => clearTimeout(timer);
  }, [formData.id, formData.role]);

  useEffect(() => {
    const baseUrl = getApiBaseUrl();
    fetch(`${baseUrl}/api/departments`)
      .then(res => {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return res.json();
        }
        return [];
      })
      .then(data => {
        if (Array.isArray(data)) {
          setStaffDepartments(data);
          const academic = data.filter(d => Boolean(d.isAcademic));
          setAcademicDepartments(academic);
        }
      })
      .catch(err => console.error("Error fetching departments for registration:", err));
  }, []);

  const handleStudentDepartmentChange = (e) => {
    const selectedDeptName = e.target.value;
    setFormData((prev) => ({
      ...prev,
      department: selectedDeptName,
      school: selectedDeptName
    }));
  };

  // 🔐 OTP State
  const [otpPhone, setOtpPhone] = useState("");
  const [otpEmail, setOtpEmail] = useState("");

  const [step, setStep] = useState(1);
  const [msg, setMsg] = useState("");
  const [statusType, setStatusType] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let processedValue = value;
    if (name === "id" || name === "ctuId") {
      processedValue = value.toUpperCase();
    } else if (name === "email") {
      processedValue = value.toLowerCase().trim();
    } else if (name === "phone") {
      // Auto-sanitize phone: extract digits, strip +91 / 0 international prefix
      let digits = value.replace(/\D/g, "");
      if (digits.length > 10 && digits.startsWith("91")) {
        digits = digits.slice(2);
      } else if (digits.length > 10 && digits.startsWith("0")) {
        digits = digits.slice(1);
      }
      processedValue = digits.slice(0, 10);
    }

    setFormData((prev) => {
      const next = { ...prev, [name]: processedValue };
      if (name === "role" && processedValue !== "student") {
        setRequiresCtuId(false);
        setIdFeedback(null);
      }
      return next;
    });

    if (name === "id") {
      setIdFeedback(null);
    }
  };

  const getPasswordStrength = (password) => {
    const reqs = {
      length: password?.length >= 8,
      uppercase: /[A-Z]/.test(password || ""),
      lowercase: /[a-z]/.test(password || ""),
      number: /[0-9]/.test(password || ""),
      special: /[^A-Za-z0-9]/.test(password || "")
    };

    let score = 0;
    if (!password) return { text: "", color: "transparent", percent: 0, level: 0, reqs };
    
    if (reqs.length) score += 1;
    if (reqs.uppercase) score += 1;
    if (reqs.lowercase) score += 1;
    if (reqs.number) score += 1;
    if (reqs.special) score += 1;

    let result = { text: "", color: "transparent", percent: 0, level: 0, reqs };

    if (!reqs.length) {
      result = { text: "Too short (Min 8 chars)", color: "#ef4444", percent: 25, level: 1, reqs };
    } else if (score <= 2) {
      result = { text: "Weak", color: "#f97316", percent: 50, level: 2, reqs };
    } else if (score === 3 || score === 4) {
      result = { text: "Good", color: "#eab308", percent: 75, level: 3, reqs };
    } else if (score === 5) {
      result = { text: "Strong", color: "#22c55e", percent: 100, level: 4, reqs };
    }
    
    return result;
  };

  const strength = getPasswordStrength(formData.password);

  // STEP 1: Request OTP
  // STEP 1: Request OTP
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    // ✅ Password Match & Length Validation
    if (formData.password.length < 8) {
      setMsg("Password must be at least 8 characters long!");
      setStatusType("error");
      return;
    }

    if (formData.password !== confirmPassword) {
      setMsg("Passwords do not match!");
      setStatusType("error");
      return;
    }

    // ✅ Explicit Mobile Phone Validation (Indian 10-digit mobile number)
    const cleanPhone = (formData.phone || "").replace(/\D/g, "");
    if (cleanPhone.length !== 10 || !/^[6-9]\d{9}$/.test(cleanPhone)) {
      setMsg("Please enter a valid 10-digit mobile number (e.g. 9876543210).");
      setStatusType("error");
      return;
    }

    if (formData.role === 'student') {
      if (requiresCtuId && !formData.ctuId?.trim()) {
        setMsg("Please enter your CTU ID as required for your registration number.");
        setStatusType("error");
        return;
      }
      if (!formData.department && !formData.school) {
        setMsg("Please select your academic department / school!");
        setStatusType("error");
        return;
      }
    }

    if (formData.role === 'staff' && !formData.department) {
      setMsg("Please select your department!");
      setStatusType("error");
      return;
    }

    setMsg("Validating details & Sending Verification Codes...");
    setStatusType("info");
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20-second timeout

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/auth/register-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          phone: cleanPhone,
          id: (formData.id || "").trim().toUpperCase(),
          ctuId: (formData.ctuId || "").trim().toUpperCase(),
          email: (formData.email || "").toLowerCase().trim(),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = res.headers.get("content-type");
      let data = {};
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        // Reverse proxy HTML error (e.g. 502 Bad Gateway, 504 Gateway Timeout)
        if (res.status === 502 || res.status === 504) {
          throw new Error("University server is taking longer than usual to respond. Please check your SMS/Email in a moment or try again.");
        }
        throw new Error(`Server temporarily unavailable (${res.status}). Please try again in a moment.`);
      }

      if (!res.ok) throw new Error(data.message || "Failed to send verification codes.");

      setStep(2);
      setMsg("Verification codes sent to Phone and Email!");
      setStatusType("success");
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        setMsg("Connection timed out. The server took too long to respond. Please check your connection and try again.");
      } else if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("NetworkError"))) {
        setMsg("Network connection error. Please check your internet connection.");
      } else {
        setMsg(err.message || "Failed to send OTPs.");
      }
      setStatusType("error");
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setMsg("Finalizing registration...");
    setStatusType("info");
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const baseUrl = getApiBaseUrl();
      const cleanPhone = (formData.phone || "").toString().replace(/\D/g, "").slice(-10);
      const res = await fetch(`${baseUrl}/api/auth/verify-registration`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: (formData.id || "").toString().trim().toUpperCase(),
          ctuId: (formData.ctuId || "").toString().trim().toUpperCase(),
          email: (formData.email || "").toString().toLowerCase().trim(),
          otpPhone: (otpPhone || "").toString().trim(),
          otpEmail: (otpEmail || "").toString().trim(),
          formData: {
            ...formData,
            id: (formData.id || "").toString().trim().toUpperCase(),
            ctuId: (formData.ctuId || "").toString().trim().toUpperCase(),
            email: (formData.email || "").toString().toLowerCase().trim(),
            phone: cleanPhone,
          }
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = res.headers.get("content-type");
      let data = {};
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        if (res.status === 502 || res.status === 504) {
          throw new Error("Verification server took too long to respond. Please try again in a moment.");
        }
        throw new Error(`Server temporarily unavailable (${res.status}). Please try again.`);
      }

      if (!res.ok) throw new Error(data.message || "Invalid OTPs.");

      setMsg("Registration successful! Redirecting to Login...");
      setStatusType("success");
      setTimeout(() => window.location.href = "/", 2000);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        setMsg("Verification timed out. Please try again.");
      } else if (err.message && (err.message.includes("Failed to fetch") || err.message.includes("NetworkError"))) {
        setMsg("Network connection error. Please check your internet connection.");
      } else {
        setMsg(err.message || "Invalid OTPs.");
      }
      setStatusType("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-brand-section">
        <div className="brand-content">
          <h1>{step === 1 ? "Join the Portal" : "Account Verification"}</h1>
          <p>{step === 1 ? "Create your account to access university services." : "We've sent a code to your Phone and Email to ensure account security."}</p>
          <div className="brand-footer">© 2025 University Administration</div>
        </div>
      </div>

      <div className="login-form-section">
        <div className="form-wrapper animated-form">
          <div className="form-header">
            <h2>{step === 1 ? "Register" : "Verify It's You"}</h2>
            <p>{step === 1 ? "Enter details exactly as per University Records." : `Check your phone: ${formData.phone}`}</p>
          </div>

          {msg && <div className={`alert-box ${statusType}`}>{msg}</div>}

          {step === 1 ? (
            /* REGISTRATION FORM */
            <form onSubmit={handleRegisterSubmit}>
              <div className="two-col-row">
                <div className="input-group">
                  <label style={{ minHeight: "20px", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>Role</label>
                  <div className="input-wrapper role-field">
                    <span className="icon"><UsersIcon /></span>
                    <select name="role" value={formData.role} onChange={handleChange} required>
                      <option value="">Select Role</option>
                      <option value="student">Student</option>
                      <option value="staff">Staff</option>
                      {/* 🚫 Admin Role Removed */}
                    </select>
                  </div>
                </div>

                <div className="input-group">
                  <label style={{ minHeight: "20px", display: "flex", alignItems: "center", whiteSpace: "nowrap" }}>
                    {formData.role === "student" ? "Registration No" : "University ID"}
                  </label>
                  <div className="input-wrapper id-field" style={{ position: "relative" }}>
                    <span className="icon"><UserIcon /></span>
                    <input
                      name="id"
                      placeholder={formData.role === "student" ? "e.g. 72615777" : "e.g. 10025"}
                      value={formData.id}
                      onChange={handleChange}
                      onBlur={() => checkStudentIdRequirement(formData.id)}
                      required
                      style={{ paddingRight: (idFeedback?.type === "success" || idChecking) ? "38px" : undefined }}
                    />
                    {idChecking && (
                      <span
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          display: "inline-block",
                          width: "14px",
                          height: "14px",
                          border: "2px solid #6366f1",
                          borderTopColor: "transparent",
                          borderRadius: "50%",
                          animation: "spin 0.6s linear infinite",
                          pointerEvents: "none",
                          zIndex: 3
                        }}
                        title="Checking university records..."
                      />
                    )}
                    {idFeedback && idFeedback.type === "success" && (
                      <span
                        style={{
                          position: "absolute",
                          right: "12px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          pointerEvents: "none",
                          zIndex: 3,
                          animation: "fadeIn 0.25s ease-out"
                        }}
                        title={idFeedback.message || "Record Verified"}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" fill="#16a34a" />
                          <path d="M7.5 12.2l3 3 6-6" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    )}
                  </div>
                  {idFeedback && idFeedback.type !== "success" && (
                    <div style={{
                      fontSize: "0.78rem",
                      marginTop: "6px",
                      color: idFeedback.type === "warning" ? "#b45309" : "#b91c1c",
                      fontWeight: "500",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}>
                      {idFeedback.message}
                    </div>
                  )}
                </div>
              </div>

              {/* 🔒 Real-Time Conditional CTU ID Requirement */}
              {formData.role === "student" && requiresCtuId && (
                <div className="input-group" style={{ animation: "fadeIn 0.3s ease-out" }}>
                  <label>CTU ID</label>
                  <div className="input-wrapper id-field">
                    <span className="icon"><UserIcon /></span>
                    <input
                      name="ctuId"
                      placeholder="e.g. CTU2601710"
                      value={formData.ctuId}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              )}

              {formData.role === 'student' && (
                <div className="input-group">
                  <label>Student Status</label>
                  <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                    <label style={{
                      flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', fontWeight: '500', transition: 'all 0.2s',
                      border: formData.studentType === 'current' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: formData.studentType === 'current' ? '#eff6ff' : 'white',
                      color: formData.studentType === 'current' ? '#2563eb' : '#64748b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}>
                      <input type="radio" name="studentType" value="current" checked={formData.studentType === 'current'} onChange={handleChange} style={{ accentColor: '#2563eb' }} />
                      Current Student
                    </label>
                    <label style={{
                      flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', fontWeight: '500', transition: 'all 0.2s',
                      border: formData.studentType === 'alumni' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: formData.studentType === 'alumni' ? '#eff6ff' : 'white',
                      color: formData.studentType === 'alumni' ? '#2563eb' : '#64748b',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}>
                      <input type="radio" name="studentType" value="alumni" checked={formData.studentType === 'alumni'} onChange={handleChange} style={{ accentColor: '#2563eb' }} />
                      Alumni
                    </label>
                  </div>
                </div>
              )}

              <div className="two-col-row">
                <div className="input-group">
                  <label>Full Name</label>
                  <div className="input-wrapper">
                    <span className="icon"><UserIcon /></span>
                    <input name="fullName" placeholder="Full Name" value={formData.fullName} onChange={handleChange} required />
                  </div>
                </div>

                <div className="input-group">
                  <label>Phone</label>
                  <div className="input-wrapper phone-field">
                    <span className="icon"><PhoneIcon /></span>
                    <input
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength="10"
                      placeholder="9876543210"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="input-group">
                <label>Email</label>
                <div className="input-wrapper email-field">
                  <span className="icon"><MailIcon /></span>
                  <input
                    name="email"
                    type="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                    placeholder={"e.g. name@univ.com or personal@mail.com"}
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="field-hint info"><em>We will verify your Phone number.</em></div>
              </div>

              <div className="two-col-row">
                <div className="input-group">
                  <label>Password</label>
                  <div className="input-wrapper password">
                    <span className="icon"><LockIcon /></span>
                    <input name="password" type={showPassword ? "text" : "password"} placeholder="Create Password" value={formData.password} onChange={handleChange} required />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="password-toggle"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {formData.password && (
                    <div style={{ marginTop: '12px', padding: '0 4px', animation: 'fadeIn 0.3s ease-out' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px', color: strength.color, fontWeight: '600', transition: 'color 0.3s ease' }}>
                        <span style={{ color: '#64748b' }}>Password Strength</span>
                        <span>{strength.text}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', height: '6px' }}>
                        {[1, 2, 3, 4].map((index) => (
                          <div key={index} style={{
                            flex: 1,
                            backgroundColor: index <= strength.level ? strength.color : '#e2e8f0',
                            borderRadius: '3px',
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            boxShadow: index <= strength.level ? `0 0 8px ${strength.color}40` : 'none',
                            transform: index <= strength.level ? 'scaleY(1)' : 'scaleY(0.8)',
                            opacity: index <= strength.level ? 1 : 0.5
                          }}></div>
                        ))}
                      </div>
                      <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem' }}>
                        {[
                          { label: 'Min 8 chars', met: strength.reqs?.length },
                          { label: 'Uppercase', met: strength.reqs?.uppercase },
                          { label: 'Lowercase', met: strength.reqs?.lowercase },
                          { label: 'Number', met: strength.reqs?.number },
                          { label: 'Special Char', met: strength.reqs?.special }
                        ].map((req, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: req.met ? '#16a34a' : '#94a3b8', transition: 'color 0.3s' }}>
                            <div style={{ 
                              width: '12px', height: '12px', borderRadius: '50%', 
                              backgroundColor: req.met ? '#16a34a' : 'transparent',
                              border: `1.5px solid ${req.met ? '#16a34a' : '#cbd5e1'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'all 0.3s'
                            }}>
                              {req.met && <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                            </div>
                            <span style={{ fontWeight: req.met ? '500' : '400' }}>{req.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="input-group" style={{ marginBottom: '15px' }}>
                <label>Confirm Password</label>
                <div className="input-wrapper password" >
                  <span className="icon"><LockIcon /></span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="password-toggle"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {formData.role === 'student' && (
                <div className="input-group">
                  <label>Academic Department / School</label>
                  <div className="input-wrapper program-field">
                    <span className="icon"><GraduationCapIcon /></span>
                    <select
                      name="department"
                      value={formData.department || formData.school || ""}
                      onChange={handleStudentDepartmentChange}
                      required
                    >
                      <option value="">Select Your Academic Department</option>
                      {(academicDepartments.length > 0
                        ? academicDepartments
                        : fallbackAcademicDepartments
                      ).map((dept) => (
                        <option key={dept._id || dept.name} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {formData.role === 'staff' && (
                <div className="input-group">
                  <label>Department</label>
                  <div className="input-wrapper program-field">
                    <span className="icon"><ClipboardIcon /></span>
                    <select name="department" value={formData.department} onChange={handleChange} required>
                      <option value="">Select Your Department</option>
                      {staffDepartments.map(dept => (
                        <option key={dept._id || dept.name} value={dept.name}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Sending..." : "Verify & Register"}
              </button>
            </form>
          ) : (
            /* OTP FORM */
            <form onSubmit={handleVerifyOtp} className="animated-form">

              {/* Phone OTP */}
              <div className="input-group">
                <label>SMS Code (Sent to {formData.phone})</label>
                <div className="input-wrapper otp-field">
                  <span className="icon"><PhoneIcon /></span>
                  <input
                    style={{ letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }}
                    placeholder="SMS Code"
                    maxLength="6"
                    value={otpPhone}
                    onChange={(e) => setOtpPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Email OTP */}
              <div className="input-group">
                <label>Email Code (Sent to {formData.email})</label>
                <div className="input-wrapper otp-field">
                  <span className="icon"><MailIcon /></span>
                  <input
                    style={{ letterSpacing: '4px', textAlign: 'center', fontWeight: 'bold' }}
                    placeholder="Email Code"
                    maxLength="6"
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? "Verifying..." : "Verify & Finish"}
              </button>
              <center>
                <button type="button" onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#4f46e5', cursor: 'pointer', textDecoration: 'underline', marginTop: '10px', fontSize: '14px' }}>
                  Back to edit details
                </button>
              </center>
            </form>
          )}

          <div className="form-footer">
            <p>Already have an account? <Link to="/">Login here</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;