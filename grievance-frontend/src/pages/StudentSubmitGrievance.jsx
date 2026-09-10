import React, { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import "../styles/Dashboard.css";
import StudentNavbar from "../components/StudentNavbar";
import ctLogo from "../assets/ct-logo.png";
import { GraduationCapIcon } from "../components/Icons";

function StudentSubmitGrievance() {
  const navigate = useNavigate();
  const { deptName: routeDeptName } = useParams();
  const [searchParams] = useSearchParams();
  const queryDeptName = searchParams.get("dept");

  const initialDept = routeDeptName ? decodeURIComponent(routeDeptName) : (queryDeptName || "");

  const role = localStorage.getItem("grievance_role");
  const userId = localStorage.getItem("grievance_id");

  const [activeDepartment, setActiveDepartment] = useState(initialDept);
  const [departmentsList, setDepartmentsList] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    regid: userId || "",
    email: "",
    phone: "",
    school: "",
    message: "",
  });

  const [attachment, setAttachment] = useState(null);
  const [msg, setMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [statusType, setStatusType] = useState("");
  const [loading, setLoading] = useState(true);
  const [issueTypes, setIssueTypes] = useState([]);
  const [selectedIssueType, setSelectedIssueType] = useState("");

  // Auth Check
  useEffect(() => {
    if (!role || role !== "student") navigate("/");
  }, [role, navigate]);

  // Sync department if URL param changes
  useEffect(() => {
    if (routeDeptName) {
      setActiveDepartment(decodeURIComponent(routeDeptName));
    } else if (queryDeptName) {
      setActiveDepartment(queryDeptName);
    }
  }, [routeDeptName, queryDeptName]);

  // Fetch all active departments
  useEffect(() => {
    const fetchDepts = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/departments`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            const studentDepts = data.filter(
              (d) => d.targetAudience === "both" || d.targetAudience === "student" || !d.targetAudience
            );
            setDepartmentsList(studentDepts);
            if (!activeDepartment && studentDepts.length > 0) {
              setActiveDepartment(studentDepts[0].name);
            }
          }
        }
      } catch (err) {
        console.warn("Could not fetch departments:", err);
      }
    };
    fetchDepts();
  }, []);

  // Fetch Student User Details
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
            school: data.department || data.program || "",
          }));
        }
      } catch (err) {
        console.error("Failed to load user details:", err);
      } finally {
        setLoading(false);
      }
    };
    if (userId) fetchUserDetails();
  }, [userId]);

  // Fetch Issue Types for the active department
  useEffect(() => {
    if (!activeDepartment) {
      setIssueTypes([]);
      return;
    }

    const fetchIssueTypes = async () => {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/issue-types/department/${encodeURIComponent(activeDepartment)}?targetAudience=student`
        );
        if (res.ok) {
          const data = await res.json();
          setIssueTypes(data || []);
        } else {
          setIssueTypes([]);
        }
      } catch (error) {
        console.error("Error fetching issue types:", error);
        setIssueTypes([]);
      }
    };
    fetchIssueTypes();
  }, [activeDepartment]);

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
    if (!activeDepartment) {
      setMsg("Please select a department.");
      setStatusType("error");
      return;
    }

    if (!selectedIssueType) {
      setMsg("Please select an issue type.");
      setStatusType("error");
      return;
    }

    setIsSubmitting(true);
    setMsg("Submitting your grievance...");
    setStatusType("info");

    // 1️⃣ Upload File to MongoDB (GridFS) First if attached
    let attachmentUrl = "";
    if (attachment) {
      const fileData = new FormData();
      fileData.append("file", attachment);
      try {
        const uploadRes = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/upload`, {
          method: "POST",
          body: fileData
        });
        if (!uploadRes.ok) throw new Error("File upload failed");
        const uploadJson = await uploadRes.json();
        attachmentUrl = uploadJson.filename;
      } catch (err) {
        setMsg(`Upload Error: ${err.message}`);
        setStatusType("error");
        setIsSubmitting(false);
        return;
      }
    }

    // 2️⃣ Submit Grievance Payload
    const payload = {
      userId,
      name: formData.name,
      regid: formData.regid,
      email: formData.email,
      phone: formData.phone,
      studentProgram: formData.school || "Student Program",
      school: activeDepartment,
      category: activeDepartment,
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
      if (!res.ok) throw new Error(responseData.message || "Failed to submit grievance");

      setMsg("✅ Grievance submitted successfully!");
      setStatusType("success");
      setIsSubmitted(true);
      setTimeout(() => setIsSubmitted(false), 5000);

      setFormData((prev) => ({ ...prev, message: "" }));
      setSelectedIssueType("");
      setAttachment(null);

      const fileInput = document.getElementById("fileInput");
      if (fileInput) fileInput.value = "";
    } catch (err) {
      setMsg(`❌ ${err.message}`);
      setStatusType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <header className="dashboard-header">
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <img src={ctLogo} alt="CT University" style={{ height: "50px" }} />
          <div className="header-content">
            <h1>Student Grievance Portal</h1>
            <p>
              Welcome, <strong>{formData.name || userId}</strong>{" "}
              {formData.school && (
                <span
                  style={{
                    marginLeft: "10px",
                    background: "#e0f2fe",
                    color: "#0369a1",
                    padding: "2px 10px",
                    borderRadius: "12px",
                    fontSize: "0.8rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                >
                  <GraduationCapIcon width="14" height="14" /> {formData.school}
                </span>
              )}
            </p>
          </div>
        </div>
        <button className="logout-btn-header" onClick={handleLogout}>
          Logout
        </button>
      </header>

      {/* DYNAMIC NAVBAR */}
      <StudentNavbar activeCategory={activeDepartment} />

      {/* BODY */}
      <main className="dashboard-body">
        <div className="card form-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h2>{activeDepartment || "Department"} Grievance Submission</h2>
            {departmentsList.length > 0 && !routeDeptName && (
              <select
                value={activeDepartment}
                onChange={(e) => setActiveDepartment(e.target.value)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  background: "#fff"
                }}
              >
                {departmentsList.map((d) => (
                  <option key={d._id || d.name} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {msg && (
            <div className={`notification-banner ${statusType}`} style={{ marginBottom: "15px" }}>
              {msg}
            </div>
          )}

          {isSubmitted ? (
            <div className="success-screen">
              <div className="success-icon">✓</div>
              <h3>Thank You!</h3>
              <p>Your grievance for <strong>{activeDepartment}</strong> has been submitted.</p>
              <button
                onClick={() => navigate("/student/dashboard")}
                className="btn-primary"
                style={{ marginTop: "15px" }}
              >
                Go to Dashboard
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="grievance-form">
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

              <div className="form-row">
                <div className="input-group">
                  <label>Department / Category</label>
                  <input
                    type="text"
                    value={activeDepartment}
                    readOnly
                    className="read-only-input"
                    style={{ fontWeight: "600", color: "#2563eb" }}
                  />
                </div>

                <div className="input-group">
                  <label>Select Issue Type *</label>
                  <select
                    value={selectedIssueType}
                    onChange={(e) => setSelectedIssueType(e.target.value)}
                    required
                    style={{
                      padding: "10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      cursor: "pointer"
                    }}
                  >
                    <option value="">-- Choose an Issue --</option>
                    {issueTypes.map((issue) => (
                      <option key={issue._id} value={issue._id}>
                        {issue.issueName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label>Grievance Description *</label>
                <textarea
                  name="message"
                  rows="4"
                  required
                  placeholder={`Describe your concern regarding ${activeDepartment} in detail...`}
                  value={formData.message}
                  onChange={handleChange}
                />
              </div>

              <div className="input-group">
                <label>Attachment (Optional)</label>
                <input
                  type="file"
                  id="fileInput"
                  onChange={handleFileChange}
                  accept="image/*,.pdf,.doc,.docx"
                />
                <small style={{ color: "#64748b", marginTop: "4px" }}>
                  Accepted formats: Images, PDF, Word documents (Max 5MB)
                </small>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button
                  type="button"
                  onClick={() => navigate("/student/dashboard")}
                  style={{
                    padding: "10px 20px",
                    background: "#f1f5f9",
                    color: "#475569",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "600"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{ flex: 1 }}
                >
                  {isSubmitting ? "Submitting..." : `Submit to ${activeDepartment}`}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

export default StudentSubmitGrievance;
