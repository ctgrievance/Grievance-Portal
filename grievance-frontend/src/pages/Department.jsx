import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "../styles/Dashboard.css";
import StudentNavbar from "../components/StudentNavbar";
import ctLogo from "../assets/ct-logo.png";
import { GraduationCapIcon } from "../components/Icons";

// ✅ 1. DATA: Map Program -> School (Used for Dropdown)
const academicPrograms = {
  "School of Engineering and Technology": [],
  "School of Management Studies": [],
  "School of Hotel Management": [],
  "School of Law": [],
  "School of Pharmaceutical Sciences": [],
  "School of Design and innovation": [],
  "School of Allied Health Sciences": [],
  "School of Social Sciences and Liberal Arts": []
};

// Helper to auto-select if possible
const getSchoolFromProgram = (programName) => {
  return "";
};

function Department() {
  const navigate = useNavigate();
  const role = localStorage.getItem("grievance_role");
  const userId = localStorage.getItem("grievance_id");

  const categoryTitle = "Academic Department";

  const [formData, setFormData] = useState({
    name: "", regid: userId || "", email: "", phone: "", studentProgram: "", school: "", message: "",
  });

  const [attachment, setAttachment] = useState(null);
  const [msg, setMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [statusType, setStatusType] = useState("");
  const [loading, setLoading] = useState(true);
  const [issueTypes, setIssueTypes] = useState([]);
  const [selectedIssueType, setSelectedIssueType] = useState("");
  const [schoolsList, setSchoolsList] = useState(Object.keys(academicPrograms));

  // Fetch dynamic active schools / departments
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/departments`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            // Include all active student-facing departments & schools
            const studentDepts = data
              .filter((d) => d.targetAudience === "both" || d.targetAudience === "student" || !d.targetAudience)
              .map((d) => d.name);
            setSchoolsList(studentDepts.length > 0 ? studentDepts : data.map((d) => d.name));
          }
        }
      } catch (err) {
        console.warn("Could not load dynamic schools:", err);
      }
    };
    fetchSchools();
  }, []);

  useEffect(() => {
    if (!role || role !== "student") navigate("/");
  }, [role, navigate]);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/auth/user/${userId}`);
        const data = await res.json();

        if (res.ok) {
          setFormData((prev) => ({
            ...prev,
            name: data.fullName || "",
            email: data.email || "",
            phone: data.phone || "",
            studentProgram: data.department || data.program || "", // 🔥
            // school is intentionally left blank for manual selection
          }));
        }
        } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchUserDetails();
  }, [userId]);

  // ✅ FETCH ISSUE TYPES DYNAMICALLY BASED ON SELECTED SCHOOL
  useEffect(() => {
    const fetchIssueTypes = async () => {
      if (!formData.school) {
        setIssueTypes([]);
        return;
      }
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/issue-types/department/${encodeURIComponent(formData.school)}`);
        if (!res.ok) {
          console.error("Fetch issue types error");
          setIssueTypes([]);
          return;
        }
        const data = await res.json();
        setIssueTypes(data);
      } catch (error) {
        console.error("Error fetching issue types:", error);
      }
    };
    fetchIssueTypes();
  }, [formData.school]); // Refetch when school changes

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setAttachment(e.target.files[0]);
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIssueType) {
      setMsg("Please select an issue type.");
      setStatusType("error");
      return;
    }

    setIsSubmitting(true);
    setMsg("Submitting...");
    setStatusType("info");

    // 1️⃣ Upload File to MongoDB (GridFS) First
    let attachmentUrl = "";
    if (attachment) {
      const fileData = new FormData();
      fileData.append("file", attachment);
      try {
        const uploadRes = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/upload`, { method: "POST", body: fileData });
        if (!uploadRes.ok) throw new Error("File upload failed");
        const uploadJson = await uploadRes.json();
        attachmentUrl = uploadJson.filename;
      } catch (err) {
        console.error("[FRONTEND] Upload Error:", err);
        setMsg(`Upload Error: ${err.message}`); setStatusType("error"); return;
      }
    }

    // 2️⃣ Submit Grievance as JSON
    const payload = {
      userId,
      name: formData.name,
      regid: formData.regid,
      email: formData.email,
      phone: formData.phone,
      studentProgram: formData.school,
      category: formData.school,
      message: formData.message,
      attachment: attachmentUrl || "",
      issueTypeId: selectedIssueType || null
    };

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();
      if (!res.ok) throw new Error(responseData.message);

      setMsg("✅ Grievance submitted successfully!");
      setStatusType("success");
      setIsSubmitted(true);
      setTimeout(() => setIsSubmitted(false), 5000);
      setFormData(prev => ({ ...prev, message: "" }));
      setSelectedIssueType("");
      setAttachment(null);
      if (document.getElementById("fileInput")) document.getElementById("fileInput").value = "";
    } catch (err) {
      setMsg(`❌ ${err.message}`);
      setStatusType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <img src={ctLogo} alt="CT University" style={{ height: "50px" }} />
          <div className="header-content">
            <h1>Student Dashboard</h1>
            <p>
              Welcome, <strong>{formData.name || userId}</strong>
              {formData.studentProgram && <span className="status-badge status-assigned" style={{ marginLeft: '10px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <GraduationCapIcon width="14" height="14" /> {formData.studentProgram}
              </span>}
            </p>
          </div>
        </div>
        <button className="logout-btn-header" onClick={handleLogout}>Logout</button>
      </header>

      {/* ✅ DYNAMIC NAVBAR */}
      <StudentNavbar activeCategory="department" />

      <main className="dashboard-body">
        <div className="card">
          <h2>Submit {categoryTitle} Grievance</h2>

          {loading ? (
            <p>Loading your details...</p>
          ) : (
            <form onSubmit={handleSubmit}>
              {msg && <div className={`alert-box ${statusType}`}>{msg}</div>}

              <div className="form-row">
                <div className="input-group">
                  <label>Full Name</label>
                  <input type="text" name="name" value={formData.name} readOnly className="read-only-input" />
                </div>
                <div className="input-group">
                  <label>Registration ID</label>
                  <input type="text" name="regid" value={formData.regid} readOnly className="read-only-input" />
                </div>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Email</label>
                  <input type="email" name="email" value={formData.email} readOnly className="read-only-input" />
                </div>
                <div className="input-group">
                  <label>Phone</label>
                  <input type="text" name="phone" value={formData.phone} readOnly className="read-only-input" />
                </div>
              </div>

              {/* ✅ DROPDOWN FOR SCHOOL SELECTION */}
              <div className="input-group">
                <label>Select Your School / Department</label>
                <select name="school" value={formData.school} onChange={handleChange} required>
                  <option value="">-- Select Your School --</option>
                  {schoolsList.map((school) => (
                    <option key={school} value={school}>{school}</option>
                  ))}
                </select>
                <small style={{ color: "#64748b", marginTop: "5px" }}>
                  Please select the specific school your grievance relates to.
                </small>
              </div>

              <div className="input-group">
                <label>Select Issue</label>
                <select
                  value={selectedIssueType}
                  onChange={(e) => setSelectedIssueType(e.target.value)}
                  required
                  style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", cursor: "pointer" }}
                >
                  <option value="">-- Choose an Issue --</option>
                  {issueTypes.map((issue) => (
                    <option key={issue._id} value={issue._id}>
                      {issue.issueName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Message (Optional)</label>
                <textarea name="message" value={formData.message} onChange={handleChange} rows="4" placeholder="Details..."></textarea>
              </div>

              <div className="input-group">
                <label>Attach Document (Optional)</label>
                <input
                  id="fileInput"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="file-input"
                />
              </div>

              <button
                type="submit"
                className={`submit-btn ${isSubmitted ? "submitted" : isSubmitting ? "submitting" : ""}`}
                disabled={isSubmitting || isSubmitted}
                style={
                  isSubmitted
                    ? {
                        background: "linear-gradient(135deg, #16a34a, #15803d)",
                        color: "#ffffff",
                        opacity: 0.88,
                        filter: "blur(0.2px)",
                        cursor: "default",
                        boxShadow: "0 4px 14px rgba(22, 163, 74, 0.35)",
                      }
                    : isSubmitting
                    ? {
                        opacity: 0.75,
                        filter: "blur(0.4px)",
                        cursor: "wait",
                      }
                    : {}
                }
              >
                {isSubmitted ? "✅ Submitted!" : isSubmitting ? "⏳ Submitting..." : "Submit Grievance"}
              </button>

              {msg && (
                <div
                  className={`alert-box ${statusType}`}
                  style={{ marginTop: "15px", textAlign: "center" }}
                >
                  {msg}
                </div>
              )}
            </form>
          )}
        </div>
      </main>

    </div>
  );
}

export default Department;
