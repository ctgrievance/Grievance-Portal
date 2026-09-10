import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
import ctLogo from "../assets/ct-logo.png";
import { ClipboardIcon, PaperclipIcon, TrashIcon, AlertCircleIcon, XIcon } from "../components/Icons";
import GrievanceDetailsModal from "../components/GrievanceDetailsModal";

// Helper: format dates for tables
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return new Date(dateString).toLocaleDateString("en-US", options);
};

const schools = [
  "School of Engineering and Technology",
  "School of Management Studies",
  "School of Law",
  "School of Pharmaceutical Sciences",
  "School of Hotel Management",
  "School of Design and innovation",
  "School of Allied Health Sciences",
  "School of Social Sciences and Liberal Arts"
];

function StaffDashboard() {
  const navigate = useNavigate();
  const role = localStorage.getItem("grievance_role");
  const userId = localStorage.getItem("grievance_id"); // e.g. STF001

  // UI State
  const [activeTab, setActiveTab] = useState("submit"); // "submit" | "mine"

  // Staff Info
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffDept, setStaffDept] = useState("");

  // Form Data for submitting grievance as staff
  const [formData, setFormData] = useState({
    name: "",
    staffId: userId || "",
    email: "",
    department: "", // Stores selected School
    message: "",
  });

  const [staffIssueTypes, setStaffIssueTypes] = useState([]);
  const [selectedIssueType, setSelectedIssueType] = useState("");
  const [customIssueTitle, setCustomIssueTitle] = useState("");
  const [attachment, setAttachment] = useState(null); // ✅ Added Attachment State
  const [msg, setMsg] = useState("");
  const [statusType, setStatusType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  // Data for tables
  const [myGrievances, setMyGrievances] = useState([]);

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingMine, setLoadingMine] = useState(true);

  // ✅ FILTER STATES
  const [searchStaffId, setSearchStaffId] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterDepartment, setFilterDepartment] = useState("All");
  const [filterMonth, setFilterMonth] = useState("");

  // ✅ State for "See More" Details Popup
  const [selectedGrievance, setSelectedGrievance] = useState(null);

  // ❌ STAFF REJECTION POPUP STATE
  const [rejectPopup, setRejectPopup] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // ⭐ STAFF RATINGS STATE
  const [ratingData, setRatingData] = useState({
    averageRating: null,
    totalRatings: 0,
    breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    reviews: []
  });

  const [staffMap, setStaffMap] = useState({});
  const [transferredGrievances, setTransferredGrievances] = useState([]);
  const [loadingTransferred, setLoadingTransferred] = useState(false);

  const fetchTransferredGrievances = useCallback(async () => {
    if (!userId) return;
    setLoadingTransferred(true);
    try {
      const token = localStorage.getItem("grievance_token");
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/staff-transfers/${userId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransferredGrievances(data);
      }
    } catch (err) {
      console.error("Error fetching transferred grievances:", err);
    } finally {
      setLoadingTransferred(false);
    }
  }, [userId]);

  const fetchStaffNames = useCallback(async () => {
    try {
      const token = localStorage.getItem("grievance_token");
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin-staff/all`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const map = {};
        data.forEach((staff) => {
          map[staff.id] = staff.fullName;
        });
        setStaffMap(map);
      }
    } catch (error) {
      console.error("Error fetching staff list:", error);
    }
  }, []);

  const fetchMyRatings = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/staff-rating/${userId}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("grievance_token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRatingData(data);
      }
    } catch (err) {
      console.error("Error fetching staff ratings:", err);
    }
  }, [userId]);

  useEffect(() => {
    fetchMyRatings();
    fetchStaffNames();
    fetchTransferredGrievances();
  }, [fetchMyRatings, fetchStaffNames, fetchTransferredGrievances]);

  // Route protection
  useEffect(() => {
    if (!role || role !== "staff") navigate("/");
  }, [role, navigate]);

  // Fetch staff profile
  useEffect(() => {
    const fetchStaffDetails = async () => {
      if (!userId) {
        setLoadingProfile(false);
        return;
      }
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/auth/user/${userId}`);
        const data = await res.json();
        if (res.ok) {
          setStaffName(data.fullName || userId);
          setStaffEmail(data.email || "");
          setStaffDept(data.department || "");
          setFormData((prev) => ({
            ...prev,
            name: data.fullName || "",
            email: data.email || "",
            department: data.department || "",
          }));
        } else {
          setStaffName(userId);
        }
      } catch (err) {
        console.error("Error fetching staff profile:", err);
        setStaffName(userId);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchStaffDetails();
  }, [userId]);

  // Fetch Staff Issue Types when Department is selected
  useEffect(() => {
    if (!formData.department) {
      setStaffIssueTypes([]);
      setSelectedIssueType("");
      return;
    }
    const fetchStaffIssues = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/issue-types/department/${encodeURIComponent(formData.department)}?targetAudience=staff`);
        if (res.ok) {
          const data = await res.json();
          setStaffIssueTypes(data);
        }
      } catch (err) {
        console.error("Error fetching staff issue types:", err);
      }
    };
    fetchStaffIssues();
  }, [formData.department]);

  // Fetch grievances submitted by this staff
  const fetchMyGrievances = async () => {
    if (!userId) return;
    setLoadingMine(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/user/${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch my grievances");
      // preserve scroll
      const prevScrollY = window.scrollY || window.pageYOffset;
      setMyGrievances(data);
      requestAnimationFrame(() => window.scrollTo(0, prevScrollY));
    } catch (err) {
      console.error("Error fetching my grievances:", err);
      setMsg("Failed to load your submitted grievances");
      setStatusType("error");
    } finally {
      setLoadingMine(false);
    }
  };

  // Initial load of my grievances
  useEffect(() => {
    fetchMyGrievances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Validation for form fields (submit grievance)
  const validateField = (name, value) => {
    let error = "";
    if (!value) {
      error = "This field is required";
    } else if (name === "email" && !/\S+@\S+\.\S+/.test(value)) {
      error = "Email address is invalid";
    }
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    validateField(name, value);
  };

  const handleFileChange = (e) => {
    setAttachment(e.target.files[0]);
  };

  const validateForm = () => {
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      if (!formData[key]) {
        newErrors[key] = "This field is required";
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  const handleDeleteGrievance = async (id) => {
    if (!window.confirm("Are you sure you want to remove this grievance from your list?")) return;
    try {
      const token = localStorage.getItem("grievance_token");
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/hide/${id}`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setMyGrievances(prev => prev.filter(g => g._id !== id));
        setSelectedGrievance(null);
        setMsg("✅ Grievance removed from view.");
        setStatusType("success");
        setTimeout(() => setMsg(""), 3000);
      } else {
        throw new Error("Failed to delete.");
      }
    } catch (err) {
      console.error(err);
      alert("Error removing grievance.");
    }
  };

  const handleRejectGrievance = async () => {
    if (!rejectionReason || rejectionReason.trim().length < 5) {
      alert("Please enter a valid rejection reason (minimum 5 characters).");
      return;
    }
    setIsSubmittingReject(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/reject/${rejectPopup._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: rejectionReason.trim(),
          rejectedBy: userId,
          rejectedByName: staffName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to reject grievance");

      setMsg("✅ Grievance rejected. Department Admin has been notified via email.");
      setStatusType("success");

      setMyGrievances((prev) =>
        prev.map((g) => (g._id === rejectPopup._id ? data.grievance : g))
      );
      if (selectedGrievance && selectedGrievance._id === rejectPopup._id) {
        setSelectedGrievance(data.grievance);
      }
      setRejectPopup(null);
      setRejectionReason("");
      setTimeout(() => setMsg(""), 5000);
    } catch (err) {
      console.error("Error rejecting grievance:", err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // Submit grievance as staff
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      setMsg("Please fill out all required fields.");
      setStatusType("error");
      return;
    }

    setMsg("Submitting your grievance...");
    setStatusType("info");
    setIsSubmitting(true);

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
        setMsg(`❌ Upload Error: ${err.message}`); setStatusType("error"); setIsSubmitting(false); return;
      }
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name: formData.name,
          email: formData.email,
          phone: "",
          regid: formData.staffId,
          school: formData.department, // Selected School
          category: formData.department, // Routes to School Admin
          message: customIssueTitle ? `[Topic: ${customIssueTitle}]\n\n${formData.message}` : formData.message,
          studentProgram: "Staff Member", // Required by backend
          userType: "staff",
          attachment: attachmentUrl || "", // ✅ Send filename
          issueTypeId: selectedIssueType || null // ✅ Include staff issue type for auto-assignment
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Submission failed");

      setMsg("✅ Grievance submitted successfully!");
      setStatusType("success");
      setIsSubmitted(true);
      setTimeout(() => setIsSubmitted(false), 5000);

      setFormData((prev) => ({
        ...prev,
        message: "",
      }));
      setSelectedIssueType("");
      setCustomIssueTitle("");
      setErrors({});
      setAttachment(null);
      if (document.getElementById("staffFileInput")) document.getElementById("staffFileInput").value = "";

      fetchMyGrievances();
    } catch (err) {
      setMsg(`Error: ${err.message}`);
      setStatusType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAssignedStatus = async (id, newStatus) => {
    setMsg("Updating grievance status...");
    setStatusType("info");

    const body = { status: newStatus };
    if (newStatus === "Resolved") {
      body.resolvedBy = userId;
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update");

      setMsg("Grievance updated successfully!");
      setStatusType("success");

      fetchMyGrievances();
    } catch (err) {
      console.error("Error updating assigned grievance:", err);
      setMsg(`Error: ${err.message}`);
      setStatusType("error");
    }
  };

  // ✅ FILTER LOGIC
  const filteredMyGrievances = myGrievances.filter((g) => {
    const matchStaff = (g.assignedTo || "").toLowerCase().includes(searchStaffId.toLowerCase());
    const matchStatus = filterStatus === "All" || g.status === filterStatus;
    const matchDept = filterDepartment === "All" || (g.category || g.school || "") === filterDepartment;

    let matchMonth = true;
    if (filterMonth) {
      const gDate = new Date(g.createdAt);
      const [year, month] = filterMonth.split("-");
      matchMonth = gDate.getFullYear() === parseInt(year) && (gDate.getMonth() + 1) === parseInt(month);
    }

    return matchStaff && matchStatus && matchDept && matchMonth;
  });

  // ✅ Unique Departments for Dropdown
  const uniqueDepartments = [...new Set(myGrievances.map(g => g.category || g.school).filter(Boolean))];



  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <img src={ctLogo} alt="CT University" style={{ height: "50px" }} />
          <div className="header-content">
            <h1>Staff Dashboard</h1>
            <p style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              {loadingProfile
                ? "Loading your profile..."
                : <>Welcome, <strong>{staffName || userId}</strong> {staffDept && (
                  <span className="status-badge status-assigned" style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                    <ClipboardIcon width="14" height="14" /> {staffDept}
                  </span>
                )}</>}

              {/* ⭐ Staff Rating Element in Header */}
              <span
                onClick={() => setActiveTab("ratings")}
                style={{
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 12px",
                  borderRadius: "20px",
                  background: ratingData.totalRatings > 0 ? "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)" : "#f1f5f9",
                  border: ratingData.totalRatings > 0 ? "1px solid #fde68a" : "1px solid #e2e8f0",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  color: ratingData.totalRatings > 0 ? "#92400e" : "#64748b",
                  transition: "all 0.2s ease"
                }}
                title="Click to view your ratings & student feedback"
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.04)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                <span style={{ color: ratingData.totalRatings > 0 ? "#f59e0b" : "#94a3b8" }}>★</span>
                <span>
                  {ratingData.totalRatings > 0
                    ? `${Number(ratingData.averageRating).toFixed(1)} / 5 (${ratingData.totalRatings} ${ratingData.totalRatings === 1 ? 'Review' : 'Reviews'})`
                    : "No ratings yet"}
                </span>
              </span>
            </p>
          </div>
        </div>
        <button className="logout-btn-header" onClick={handleLogout}>
          Logout
        </button>
      </header>

      {/* ✅ FIXED NAVBAR TABS (Glass Pill Style) */}
      <nav className="navbar">
        <ul>
          <li className={activeTab === "ratings" ? "active" : ""}>
            <button
              className="tab-link-button"
              onClick={() => setActiveTab("ratings")}
            >
              ⭐ My Ratings ({ratingData.totalRatings > 0 ? Number(ratingData.averageRating).toFixed(1) : 0})
            </button>
          </li>
          <li className={activeTab === "submit" ? "active" : ""}>
            <button
              className="tab-link-button"
              onClick={() => setActiveTab("submit")}
            >
              Submit Grievance
            </button>
          </li>
          <li className={activeTab === "mine" ? "active" : ""}>
            <button
              className="tab-link-button"
              onClick={() => setActiveTab("mine")}
            >
              My Submissions
            </button>
          </li>
          <li className={activeTab === "transferred" ? "active" : ""}>
            <button
              className="tab-link-button"
              onClick={() => setActiveTab("transferred")}
            >
              🔁 Transferred Out ({transferredGrievances.length})
            </button>
          </li>
        </ul>
      </nav>

      <main className="dashboard-body">
        <div className="card">
          {msg && <div className={`alert-box ${statusType}`}>{msg}</div>}

          {/* TAB 1: Submit Grievance */}
          {activeTab === "submit" && (
            <>
              <h2>Submit Staff Grievance</h2>
              <p>Select the relevant School/Department and describe your issue. It will be routed to the Head of Department.</p>

              <form onSubmit={handleSubmit} noValidate>
                <div className="form-row">
                  <div className="input-group">
                    <label>Full Name</label>
                    <input type="text" name="name" value={formData.name} readOnly className="read-only-input" />
                  </div>

                  <div className="input-group">
                    <label>Staff ID</label>
                    <input type="text" name="staffId" value={formData.staffId} readOnly className="read-only-input" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label>Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="you@college.edu" />
                  </div>
                </div>

                {/* ✅ SCHOOL SELECTION DROPDOWN */}
                <div className="input-group">
                  <label>Select School / Department</label>
                  <select name="department" value={formData.department} onChange={handleChange} required>
                    <option value="">-- Select School --</option>
                    {schools.map((school) => <option key={school} value={school}>{school}</option>)}
                  </select>
                  {errors.department && <p className="error-text">{errors.department}</p>}
                </div>

                {formData.department && (
                  <div className="input-group">
                    <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>Grievance / Issue Type</span>
                      <span style={{ fontSize: "0.75rem", color: "#2563eb", fontWeight: "600", background: "#eff6ff", padding: "2px 8px", borderRadius: "10px" }}>
                        ⚡ Linked to Smart Assignment
                      </span>
                    </label>
                    <select
                      value={selectedIssueType}
                      onChange={(e) => setSelectedIssueType(e.target.value)}
                      required
                    >
                      <option value="">-- Select Grievance / Issue Type --</option>
                      {staffIssueTypes.map((it) => (
                        <option key={it._id} value={it._id}>
                          {it.issueName} {it.description ? `- ${it.description}` : ""}
                        </option>
                      ))}
                    </select>
                    <small style={{ color: "#64748b", marginTop: "4px", display: "block" }}>
                      Choose your specific grievance category for auto-routing. Select "Others" if your concern is unlisted.
                    </small>
                  </div>
                )}

                {(() => {
                  const sel = staffIssueTypes.find(i => i._id === selectedIssueType);
                  return sel && (sel.issueName === "Others" || sel.isSystemReserved) ? (
                    <div className="input-group">
                      <label>Specify Custom Grievance Topic / Subject</label>
                      <input
                        type="text"
                        value={customIssueTitle}
                        onChange={(e) => setCustomIssueTitle(e.target.value)}
                        placeholder="e.g., Salary discrepancy, Lab timings dispute, Course material..."
                        required
                      />
                    </div>
                  ) : null;
                })()}

                <div className="input-group">
                  <label>Message / Query</label>
                  <textarea name="message" value={formData.message} onChange={handleChange} placeholder="Describe your issue..." rows="5"></textarea>
                  {errors.message && <p className="error-text">{errors.message}</p>}
                </div>

                <div className="input-group">
                  <label>Attach Document (Optional)</label>
                  <input
                    id="staffFileInput"
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="file-input"
                  />
                </div>

                <div className="form-actions">
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
                </div>

                {msg && (
                  <div
                    className={`alert-box ${statusType}`}
                    style={{ marginTop: "15px", textAlign: "center" }}
                  >
                    {msg}
                  </div>
                )}
              </form>
            </>
          )}

          {/* TAB 2: My Submissions */}
          {activeTab === "mine" && (
            <>
              <h2>My Submitted Grievances</h2>
              <p>These are grievances you have submitted as staff.</p>

              {/* ✅ FILTER BAR */}
              <div className="filter-bar" style={{
                display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px",
                padding: "15px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0"
              }}>
                <input
                  type="text" placeholder="Search Assigned Staff ID..."
                  value={searchStaffId} onChange={(e) => setSearchStaffId(e.target.value)}
                  style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", flex: "1 1 150px" }}
                />
                <select
                  value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", flex: "1 1 120px", cursor: "pointer" }}
                >
                  <option value="All">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Rejected">Rejected</option>
                </select>
                <select
                  value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}
                  style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", flex: "1 1 150px", cursor: "pointer" }}
                >
                  <option value="All">All Departments</option>
                  {uniqueDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                </select>
                <input
                  type="month"
                  value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}
                  style={{ padding: "10px", borderRadius: "6px", border: "1px solid #cbd5e1", flex: "1 1 150px", cursor: "pointer" }}
                />
                <button
                  onClick={() => {
                    setSearchStaffId(""); setFilterStatus("All"); setFilterDepartment("All"); setFilterMonth("");
                  }}
                  style={{ padding: "10px 20px", borderRadius: "6px", border: "none", background: "#64748b", color: "white", cursor: "pointer", fontWeight: "600" }}
                >
                  Reset
                </button>
              </div>

              {loadingMine ? (
                <p>Loading your grievances...</p>
              ) : filteredMyGrievances.length === 0 ? (
                <div className="empty-state"><p>{myGrievances.length === 0 ? "You have not submitted any grievances yet." : "No grievances match your filters."}</p></div>
              ) : (
                <div className="table-container">
                  <table className="grievance-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Message</th>
                        <th>Status</th>
                        <th>Assigned To</th>
                        <th>Submitted At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMyGrievances.map((g) => (
                        <tr key={g._id} onClick={() => setSelectedGrievance(g)} style={{ cursor: "pointer" }}>
                          <td>{g.category}</td>

                          {/* --- FIXED MESSAGE CELL (Max Width 150px + See More) --- */}
                          <td className="message-cell" style={{ maxWidth: '150px' }}>
                            <div
                              style={{ padding: "4px", borderRadius: "4px", transition: "background 0.22s" }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              <span style={{ wordBreak: 'break-all', lineHeight: '1.2', color: "#334155", fontWeight: "500" }}>
                                {g.message.substring(0, 30)}{g.message.length > 30 ? "..." : ""}
                              </span>
                            </div>
                          </td>
                          {/* ---------------------------------------------------- */}

                          <td>
                            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                              <span className={`status-badge status-${g.status.toLowerCase()}`}>
                                {g.status}
                              </span>
                              {g.isRerouted && (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "3px",
                                    fontSize: "0.72rem",
                                    fontWeight: "700",
                                    color: "#9333ea",
                                    background: "#f3e8ff",
                                    padding: "2px 6px",
                                    borderRadius: "12px",
                                    border: "1px solid #e9d5ff",
                                  }}
                                  title={`Re-routed ${g.transferHistory?.length || 1} time(s)`}
                                >
                                  🔁 Re-routed
                                </span>
                              )}
                            </div>
                          </td>
                          <td>{g.assignedTo || "Not Assigned"}</td>
                          <td>{formatDate(g.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* TAB: MY RATINGS & STUDENT FEEDBACK */}
          {activeTab === "ratings" && (
            <div className="ratings-tab-content">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h2 style={{ margin: 0, color: "#0f172a" }}>My Performance & Student Ratings</h2>
                  <p style={{ margin: "4px 0 0 0", color: "#64748b" }}>
                    Feedback and star ratings submitted by students upon resolution of their grievances.
                  </p>
                </div>
                <button
                  onClick={fetchMyRatings}
                  style={{
                    padding: "8px 16px",
                    background: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "600",
                    fontSize: "0.85rem",
                    color: "#334155",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  🔄 Refresh Ratings
                </button>
              </div>

              {/* Top Summary Cards Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "25px" }}>
                {/* Card 1: Score & Stars */}
                <div style={{
                  background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
                  border: "1px solid #fde68a",
                  borderRadius: "16px",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  boxShadow: "0 4px 12px rgba(245, 158, 11, 0.08)"
                }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#92400e", textTransform: "uppercase", letterSpacing: "1px" }}>
                    Average Rating
                  </div>
                  <div style={{ fontSize: "3.5rem", fontWeight: "900", color: "#78350f", lineHeight: 1.1, margin: "8px 0" }}>
                    {ratingData.totalRatings > 0 ? Number(ratingData.averageRating).toFixed(1) : "—"}
                    <span style={{ fontSize: "1.4rem", fontWeight: "600", color: "#b45309" }}> / 5.0</span>
                  </div>
                  <div style={{ fontSize: "1.6rem", color: "#f59e0b", letterSpacing: "3px" }}>
                    {"★".repeat(Math.round(ratingData.averageRating || 0))}
                    <span style={{ color: "#d1d5db" }}>{"★".repeat(5 - Math.round(ratingData.averageRating || 0))}</span>
                  </div>
                  <div style={{ marginTop: "8px", fontSize: "0.85rem", color: "#92400e", fontWeight: "600" }}>
                    Based on {ratingData.totalRatings} {ratingData.totalRatings === 1 ? "student rating" : "student ratings"}
                  </div>
                </div>

                {/* Card 2: Rating Breakdown */}
                <div style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "16px",
                  padding: "20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                }}>
                  <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "#1e293b", marginBottom: "12px" }}>
                    Rating Breakdown
                  </div>
                  {[5, 4, 3, 2, 1].map((stars) => {
                    const count = ratingData.breakdown?.[stars] || 0;
                    const pct = ratingData.totalRatings > 0 ? Math.round((count / ratingData.totalRatings) * 100) : 0;
                    return (
                      <div key={stars} style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0", fontSize: "0.85rem" }}>
                        <span style={{ width: "30px", fontWeight: "600", color: "#475569" }}>{stars} ★</span>
                        <div style={{ flex: 1, height: "10px", background: "#f1f5f9", borderRadius: "5px", overflow: "hidden" }}>
                          <div style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: stars >= 4 ? "#16a34a" : stars === 3 ? "#f59e0b" : "#ef4444",
                            borderRadius: "5px",
                            transition: "width 0.5s ease"
                          }} />
                        </div>
                        <span style={{ width: "45px", textAlign: "right", color: "#64748b", fontSize: "0.8rem" }}>
                          {count} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Student Feedback Reviews List */}
              <h3 style={{ margin: "25px 0 15px 0", color: "#0f172a", fontSize: "1.1rem" }}>
                Student Reviews & Comments ({ratingData.reviews?.length || 0})
              </h3>

              {ratingData.reviews && ratingData.reviews.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
                  {ratingData.reviews.map((rev, i) => (
                    <div
                      key={i}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "18px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.06)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 6px rgba(0,0,0,0.03)";
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                        <div>
                          <div style={{ color: "#f59e0b", fontSize: "1.1rem" }}>
                            {"★".repeat(rev.stars || 0)}
                            <span style={{ color: "#cbd5e1" }}>{"★".repeat(5 - (rev.stars || 0))}</span>
                          </div>
                          <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#1e293b", marginTop: "4px" }}>
                            {rev.studentName}
                            {rev.studentRegId && <span style={{ color: "#64748b", fontWeight: "400", fontSize: "0.78rem" }}> ({rev.studentRegId})</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8", background: "#f8fafc", padding: "3px 8px", borderRadius: "6px" }}>
                          {rev.ratedAt ? new Date(rev.ratedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A"}
                        </span>
                      </div>

                      {rev.feedback ? (
                        <div style={{
                          background: "#f8fafc",
                          borderLeft: "3px solid #f59e0b",
                          padding: "10px 12px",
                          borderRadius: "0 8px 8px 0",
                          color: "#334155",
                          fontSize: "0.9rem",
                          fontStyle: "italic",
                          margin: "10px 0"
                        }}>
                          “{rev.feedback}”
                        </div>
                      ) : (
                        <div style={{ color: "#94a3b8", fontSize: "0.82rem", fontStyle: "italic", margin: "10px 0" }}>
                          (Rating provided without written comment)
                        </div>
                      )}

                      <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "8px" }}>
                        <strong>Category:</strong> {rev.category || "General"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  background: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "14px",
                  padding: "40px",
                  textAlign: "center",
                  color: "#64748b"
                }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>⭐</div>
                  <h4 style={{ margin: "0 0 6px 0", color: "#1e293b" }}>No Ratings Yet</h4>
                  <p style={{ margin: 0, fontSize: "0.9rem", maxWidth: "450px", marginInline: "auto" }}>
                    When students rate the grievances you resolve, their star ratings and feedback will appear right here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TRANSFERRED OUT GRIEVANCES */}
          {activeTab === "transferred" && (
            <div className="transferred-tab-content">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h2 style={{ margin: 0, color: "#0f172a" }}>🔁 Forwarded / Transferred Grievances</h2>
                  <p style={{ margin: "4px 0 0 0", color: "#64748b" }}>
                    Grievances you forwarded to other departments because they were misrouted. Track their live resolution status here.
                  </p>
                </div>
                <button
                  onClick={fetchTransferredGrievances}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#334155",
                    cursor: "pointer",
                    fontWeight: "600",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  🔄 Refresh
                </button>
              </div>

              {loadingTransferred ? (
                <p>Loading transferred grievances...</p>
              ) : transferredGrievances.length === 0 ? (
                <div style={{
                  background: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  borderRadius: "14px",
                  padding: "40px",
                  textAlign: "center",
                  color: "#64748b"
                }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>🔁</div>
                  <h4 style={{ margin: "0 0 6px 0", color: "#1e293b" }}>No Grievances Transferred Yet</h4>
                  <p style={{ margin: 0, fontSize: "0.9rem", maxWidth: "450px", marginInline: "auto" }}>
                    When you receive a grievance that belongs to another department, you can forward it using the "Forward to Department" button in the grievance details.
                  </p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="grievance-table">
                    <thead>
                      <tr>
                        <th>Grievance ID</th>
                        <th>Forwarded To</th>
                        <th>Target Handler</th>
                        <th>Reason for Transfer</th>
                        <th>Live Status</th>
                        <th>Forwarded Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transferredGrievances.map((g) => {
                        const myTransfer = g.transferHistory && [...g.transferHistory].reverse().find(t => t.transferredBy === userId);
                        return (
                          <tr key={g._id} onClick={() => setSelectedGrievance(g)} style={{ cursor: "pointer" }}>
                            <td data-label="Grievance ID" style={{ fontWeight: "700", color: "#334155" }}>
                              {g.userId}
                            </td>
                            <td data-label="Forwarded To">
                              <span style={{
                                fontWeight: "700",
                                color: "#0284c7",
                                background: "#e0f2fe",
                                padding: "3px 8px",
                                borderRadius: "6px"
                              }}>
                                🏢 {myTransfer?.toDepartment || g.category || g.school}
                              </span>
                            </td>
                            <td data-label="Target Handler">
                              {myTransfer?.assignedToNameInNewDept ? (
                                <div>
                                  <span style={{ fontWeight: "600", color: "#1e293b" }}>{myTransfer.assignedToNameInNewDept}</span>
                                  <span style={{ fontSize: "0.8rem", color: "#64748b", display: "block" }}>({myTransfer.assignedToInNewDept})</span>
                                </div>
                              ) : g.assignedTo ? (
                                <div>
                                  <span style={{ fontWeight: "600", color: "#1e293b" }}>{staffMap[g.assignedTo] || g.assignedTo}</span>
                                </div>
                              ) : (
                                <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Auto-routing...</span>
                              )}
                            </td>
                            <td data-label="Reason" style={{ maxWidth: "220px" }}>
                              <span style={{
                                display: "block",
                                fontSize: "0.85rem",
                                color: "#475569",
                                fontStyle: "italic",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap"
                              }} title={myTransfer?.reason}>
                                "{myTransfer?.reason || "Misrouted department"}"
                              </span>
                            </td>
                            <td data-label="Live Status">
                              <span className={`status-badge status-${(g.status || "").toLowerCase().replace(" ", "")}`}>
                                {g.status}
                              </span>
                            </td>
                            <td data-label="Forwarded Date">
                              {myTransfer ? formatDate(myTransfer.transferredAt) : formatDate(g.updatedAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* --- DETAILS POPUP MODAL --- */}
      {selectedGrievance && (
        <GrievanceDetailsModal
          grievance={selectedGrievance}
          staffMap={staffMap}
          onClose={() => setSelectedGrievance(null)}
          onDelete={handleDeleteGrievance}
          onReject={(g) => {
            setRejectPopup(g);
            setRejectionReason("");
          }}
          onTransferred={() => {
            fetchMyGrievances();
            fetchTransferredGrievances();
            setSelectedGrievance(null);
          }}
        />
      )}

      {/* --- STAFF REJECTION MODAL --- */}
      {rejectPopup && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(15, 23, 42, 0.65)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2500,
          backdropFilter: "blur(4px)"
        }}>
          <div style={{
            background: "white", padding: "26px", borderRadius: "14px", width: "470px", maxWidth: "92%",
            boxShadow: "0 20px 40px rgba(0,0,0,0.2)", position: "relative", animation: "modalFadeIn 0.2s ease-out"
          }}>
            <button
              onClick={() => { setRejectPopup(null); setRejectionReason(""); }}
              style={{ position: "absolute", top: "14px", right: "14px", background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
            >
              <XIcon />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
              <div style={{ background: "#fee2e2", padding: "10px", borderRadius: "10px", color: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertCircleIcon width="24" height="24" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#0f172a" }}>Reject Grievance</h3>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  Ticket #{rejectPopup._id?.slice(-8).toUpperCase()} &bull; {rejectPopup.category}
                </span>
              </div>
            </div>

            <div style={{
              background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px",
              padding: "10px 14px", marginBottom: "16px", fontSize: "0.82rem", color: "#1e40af", lineHeight: "1.45"
            }}>
              <strong>📌 Notice to Department Administrator:</strong> When you reject, your Department Administrator will be automatically notified via email with your explanation (just to inform, not a permission).
            </div>

            <p style={{ margin: "0 0 8px 0", fontSize: "0.85rem", color: "#334155", fontWeight: "600" }}>
              Student: <span style={{ fontWeight: "400", color: "#64748b" }}>{rejectPopup.name} {rejectPopup.studentRegId ? `(${rejectPopup.studentRegId})` : ""}</span>
            </p>

            <div style={{ marginBottom: "18px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontWeight: "600", fontSize: "0.88rem", color: "#1e293b" }}>
                Rejection Reason <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain clearly why this grievance is being rejected (e.g. out of university policy, duplicate ticket, invalid details)..."
                rows={4}
                style={{
                  width: "100%", padding: "10px 12px", border: "1.5px solid #cbd5e1", borderRadius: "8px",
                  fontSize: "0.9rem", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit"
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "0.75rem", color: "#94a3b8" }}>
                <span>Minimum 5 characters required</span>
                <span>{rejectionReason.length} chars</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => { setRejectPopup(null); setRejectionReason(""); }}
                disabled={isSubmittingReject}
                style={{
                  padding: "9px 18px", background: "#f1f5f9", color: "#475569", border: "none",
                  borderRadius: "8px", fontWeight: "600", cursor: "pointer", fontSize: "0.88rem"
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectGrievance}
                disabled={isSubmittingReject || rejectionReason.trim().length < 5}
                style={{
                  padding: "9px 20px", background: "#ef4444", color: "white", border: "none",
                  borderRadius: "8px", fontWeight: "600", cursor: (isSubmittingReject || rejectionReason.trim().length < 5) ? "not-allowed" : "pointer",
                  opacity: (isSubmittingReject || rejectionReason.trim().length < 5) ? 0.6 : 1, fontSize: "0.88rem"
                }}
              >
                {isSubmittingReject ? "Rejecting & Notifying..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ SUPER SMOOTH INTERACTIONS (Makhan UI) */}
      <style>{`
        .dashboard-container { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* Smooth Transitions */
        .card, .navbar, input, select, textarea, button, .action-btn, .submit-btn, .logout-btn-header, .logout-floating {
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
        }

        /* Hover Effects */
        .card:hover { box-shadow: 0 15px 30px rgba(0,0,0,0.1) !important; }
        
        button:hover, .action-btn:hover, .submit-btn:hover, .logout-btn-header:hover, .logout-floating:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        button:active, .action-btn:active { transform: scale(0.95); }

        /* Inputs */
        input:focus, select:focus, textarea:focus {
          transform: scale(1.01);
          border-color: #2563eb !important;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.1) !important;
        }

        /* Table */
        tr { transition: background-color 0.2s ease; }
        tr:hover { background-color: #f8fafc !important; }
      `}</style>
    </div>
  );
}

export default StaffDashboard;