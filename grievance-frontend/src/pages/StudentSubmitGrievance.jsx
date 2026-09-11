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
          if (Array.isArray(data) && data.length > 0) {
            setIssueTypes(data);
          } else {
            setIssueTypes([{ _id: "general", issueName: "General Issue / Inquiry" }]);
          }
        } else {
          setIssueTypes([{ _id: "general", issueName: "General Issue / Inquiry" }]);
        }
      } catch (error) {
        console.error("Error fetching issue types:", error);
        setIssueTypes([{ _id: "general", issueName: "General Issue / Inquiry" }]);
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
    if (!selectedIssueType) {
      setMsg("Please select an issue type.");
      setStatusType("error");
      return;
    }

    setIsSubmitting(true);
    setMsg("Submitting...");
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
      school: formData.school || "Student Program",
      category: activeDepartment,
      message: formData.message,
      attachment: attachmentUrl || "",
      issueTypeId: selectedIssueType && selectedIssueType !== "general" ? selectedIssueType : null
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
            <h1>Student Dashboard</h1>
            <p>
              Welcome, <strong>{formData.name || userId}</strong>
              {formData.school && (
                <span
                  className="status-badge status-assigned"
                  style={{
                    marginLeft: "10px",
                    fontSize: "0.8rem",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                >
                  <GraduationCapIcon width="14" height="14" /> {formData.school.toUpperCase()}
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
        <div className="card">
          <h2>Submit {activeDepartment} Grievance</h2>

          {loading ? (
            <p>Loading your details...</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="input-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    readOnly
                    className="read-only-input"
                  />
                </div>
                <div className="input-group">
                  <label>Registration ID</label>
                  <input
                    type="text"
                    name="regid"
                    value={formData.regid}
                    readOnly
                    className="read-only-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="input-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    readOnly
                    className="read-only-input"
                  />
                </div>
                <div className="input-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    readOnly
                    className="read-only-input"
                  />
                </div>
              </div>

              {/* Program / Course Field (Auto-Filled) */}
              <div className="input-group">
                <label>Program / Course</label>
                <input
                  type="text"
                  name="school"
                  value={formData.school}
                  readOnly
                  className="read-only-input"
                  placeholder="Loading department..."
                />
              </div>

              <div className="input-group">
                <label>Issue Type</label>
                <select
                  value={selectedIssueType}
                  onChange={(e) => setSelectedIssueType(e.target.value)}
                  required
                  style={{
                    padding: "10px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    cursor: "pointer",
                  }}
                >
                  <option value="">Select an issue type</option>
                  {issueTypes.map((issue) => (
                    <option key={issue._id} value={issue._id}>
                      {issue.issueName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Message</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Details..."
                  required
                ></textarea>
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

export default StudentSubmitGrievance;
