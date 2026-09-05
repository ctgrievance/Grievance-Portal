import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Dashboard.css";
// IMPORT CHAT COMPONENT
import ChatPopup from "../components/ChatPopup";
import ChatNotificationToast from "../components/ChatNotificationToast";
import { connectSocketUser } from "../services/socket";
import { playNotificationSound } from "../utils/soundAlert";
import ExportPreviewModal from "../components/ExportPreviewModal";
import GrievanceDetailsModal from "../components/GrievanceDetailsModal";
import ctLogo from "../assets/ct-logo.png";
import { ShieldIcon, BellIcon, PaperclipIcon, EyeIcon, ClockIcon, XIcon, TrashIcon, DownloadIcon } from "../components/Icons";

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

// Date-only formatter for deadlines (no time)
const formatDateDateOnly = (dateString) => {
  if (!dateString) return "-";
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString("en-US", options);
};

// Deadline status helper: returns { label, color, isOverdue, badge }
const getDeadlineStatus = (deadlineDateStr, status) => {
  if (!deadlineDateStr) return { label: "-", color: "#64748b", isOverdue: false };
  if (status === "Resolved" || status === "Rejected") return { label: formatDateDateOnly(deadlineDateStr), color: "#64748b", isOverdue: false };
  const now = new Date();
  const deadline = new Date(deadlineDateStr);
  const hoursLeft = (deadline - now) / (1000 * 60 * 60);
  if (hoursLeft < 0) return { label: formatDateDateOnly(deadlineDateStr), color: "#dc2626", isOverdue: true, badge: "OVERDUE" };
  if (hoursLeft < 24) return { label: formatDateDateOnly(deadlineDateStr), color: "#d97706", isOverdue: false, badge: "DUE SOON" };
  return { label: formatDateDateOnly(deadlineDateStr), color: "#16a34a", isOverdue: false };
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

function AdminStaffDashboard() {
  const navigate = useNavigate();

  // ✅ Get Details from LocalStorage (Faster & Error Free)
  const role = localStorage.getItem("grievance_role")?.toLowerCase();
  const staffId = localStorage.getItem("grievance_id")?.toUpperCase();
  const myDepartment = localStorage.getItem("admin_department"); // From Login Response
  const isDeptAdmin = localStorage.getItem("is_dept_admin") === "true";

  // UI State
  const [activeTab, setActiveTab] = useState("assigned"); // "assigned" | "submit" | "mine" | "pool"
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [grievances, setGrievances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [statusType, setStatusType] = useState("");

  // --- CHAT STATE ---
  const [showChat, setShowChat] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(null);

  // --- NOTIFICATION STATE ---
  const [unreadMap, setUnreadMap] = useState({});
  const [chatNotification, setChatNotification] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "" });

  // ✅ State for "See More" Details Popup
  const [selectedGrievance, setSelectedGrievance] = useState(null);

  // --- SUBMISSION STATE ---
  const [formData, setFormData] = useState({
    department: "",
    message: "",
  });
  const [staffIssueTypes, setStaffIssueTypes] = useState([]);
  const [selectedIssueType, setSelectedIssueType] = useState("");
  const [customIssueTitle, setCustomIssueTitle] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [myGrievances, setMyGrievances] = useState([]);
  const [loadingMine, setLoadingMine] = useState(false);

  // ✅ POOL ACCEPT STATE
  const [poolGrievances, setPoolGrievances] = useState([]);
  const [loadingPool, setLoadingPool] = useState(false);

  // ✅ FILTER STATES
  const [searchId, setSearchId] = useState(""); // Acts as Student ID or Staff ID based on tab
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterDepartment, setFilterDepartment] = useState("All");
  const [filterMonth, setFilterMonth] = useState("");

  // EXTENSION REQUEST STATES
  const [extensionPopup, setExtensionPopup] = useState(null); // { grievance }
  const [extDate, setExtDate] = useState("");
  const [extReason, setExtReason] = useState("");

  // EXPORT MODAL STATE
  const [showExportModal, setShowExportModal] = useState(false);

  // ⭐ STAFF RATINGS STATE
  const [ratingData, setRatingData] = useState({
    averageRating: null,
    totalRatings: 0,
    breakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    reviews: []
  });
  const [loadingRatings, setLoadingRatings] = useState(false);
  const [staffMap, setStaffMap] = useState({});

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
    if (!staffId) return;
    try {
      setLoadingRatings(true);
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/staff-rating/${staffId}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("grievance_token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRatingData(data);
      }
    } catch (err) {
      console.error("Error fetching staff ratings:", err);
    } finally {
      setLoadingRatings(false);
    }
  }, [staffId]);

  // 🔁 TRANSFERRED OUT STATE & FETCHER
  const [transferredGrievances, setTransferredGrievances] = useState([]);
  const [loadingTransferred, setLoadingTransferred] = useState(false);

  const fetchTransferredGrievances = useCallback(async () => {
    if (!staffId) return;
    try {
      setLoadingTransferred(true);
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/staff-transfers/${staffId}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("grievance_token")}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTransferredGrievances(data || []);
      }
    } catch (err) {
      console.error("Error fetching transferred grievances:", err);
    } finally {
      setLoadingTransferred(false);
    }
  }, [staffId]);

  useEffect(() => {
    fetchMyRatings();
    fetchStaffNames();
    fetchTransferredGrievances();
  }, [fetchMyRatings, fetchStaffNames, fetchTransferredGrievances]);


  // 1. Authorization Check
  useEffect(() => {
    // Must be Staff
    if (!role || role !== "staff") {
      navigate("/");
      return;
    }

    // Must belong to a department (Rajesh has dept, General Staff does not)
    if (!myDepartment) {
      // Redirect General Staff back to General Dashboard
      navigate("/staff/general");
      return;
    }

    // Optional: If Boss tries to access Worker View, redirect them to Boss View?
    // For now, we allow Boss to see this view if they really want, but usually App.js handles it.

  }, [role, myDepartment, navigate]);

  // 2. Fetch User Name
  useEffect(() => {
    const fetchStaffInfo = async () => {
      try {
        const userRes = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/auth/user/${staffId}`);
        const userData = await userRes.json();
        if (userRes.ok) {
          setStaffName(userData.fullName || staffId);
          setStaffEmail(userData.email || "");
        }
      } catch (err) {
        console.error("Error fetching staff info:", err);
      }
    };
    if (staffId) fetchStaffInfo();
  }, [staffId]);

  // 3. Fetch Assigned Grievances (optimized to avoid flicker)
  const fetchAssignedGrievances = useCallback(async () => {
    if (!staffId) return;
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/assigned/${staffId}`);
      if (res.ok) {
        const data = await res.json();
        setGrievances(data);
      }
    } catch (err) {
      console.error("Error fetching assigned grievances:", err);
    }
  }, [staffId]);

  // Track last user scroll time and keep a ref for current grievances to do cheap change detection
  const lastUserScrollRef = useRef(0);
  const grievancesRef = useRef(grievances);
  const isFetchingRef = useRef(false);
  useEffect(() => { grievancesRef.current = grievances; }, [grievances]);

  useEffect(() => {
    const onScroll = () => { lastUserScrollRef.current = Date.now(); };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!staffId) return;

    let canceled = false;
    let timerId = null;
    const POLL_DELAY = 30000; // 30s

    const pollOnce = async () => {
      if (canceled) return;

      // Avoid overlapping polls
      if (isFetchingRef.current) {
        timerId = setTimeout(pollOnce, 1000);
        return;
      }

      // Set loading to true to show skeleton only for the very first attempts
      setLoading(true);

      // Skip if tab is hidden
      if (document.hidden) {
        setLoading(false);
        timerId = setTimeout(pollOnce, POLL_DELAY);
        return;
      }

      // Skip while user is interacting
      if (selectedGrievance) { setLoading(false); timerId = setTimeout(pollOnce, POLL_DELAY); return; }
      if (Date.now() - lastUserScrollRef.current < 2000) { setLoading(false); timerId = setTimeout(pollOnce, 2000); return; }

      isFetchingRef.current = true;
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/assigned/${staffId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to fetch data");

        // Cheap change detection: compare signatures (id + updatedAt/createdAt)
        const oldSig = (grievancesRef.current || []).map(g => `${g._id}:${g.updatedAt || g.createdAt}`).join('|');
        const newSig = (data || []).map(g => `${g._id}:${g.updatedAt || g.createdAt}`).join('|');
        if (oldSig !== newSig) {
          const prevScrollY = window.scrollY || window.pageYOffset;
          setGrievances(data);
          requestAnimationFrame(() => window.scrollTo(0, prevScrollY));
          if (data.length === 0) { setMsg("No grievances currently assigned to you."); setStatusType("info"); }
        }
      } catch (err) {
        console.error(new Date().toISOString(), "Error polling assigned grievances:", err);
        setMsg("Failed to load your assigned grievances.");
        setStatusType("error");
      } finally {
        isFetchingRef.current = false;
        setLoading(false);
        if (!canceled) timerId = setTimeout(pollOnce, POLL_DELAY);
      }
    };

    // Start polling loop
    pollOnce();

    return () => { canceled = true; if (timerId) clearTimeout(timerId); };
  }, [staffId, selectedGrievance]);

  // --- 4. REAL-TIME SOCKET CHAT & NOTIFICATIONS ---
  useEffect(() => {
    if (!staffId) return;

    const socket = connectSocketUser(staffId);

    const handleChatNotification = (notif) => {
      if (!notif) return;

      const isForMyGrievance = grievances.some(g => String(g._id) === String(notif.grievanceId)) ||
        (notif.assignedTo && notif.assignedTo.toUpperCase() === staffId.toUpperCase());

      const isFromOther = notif.senderId !== staffId;

      if (isForMyGrievance && isFromOther) {
        if (!showChat || currentChatId !== notif.grievanceId) {
          setUnreadMap((prev) => ({ ...prev, [notif.grievanceId]: true }));
          setChatNotification(notif);
          playNotificationSound();
        }
      }
    };

    socket.on("chat_notification", handleChatNotification);
    socket.on("global_chat_notification", handleChatNotification);

    return () => {
      socket.off("chat_notification", handleChatNotification);
      socket.off("global_chat_notification", handleChatNotification);
    };
  }, [staffId, grievances, showChat, currentChatId]);

  // Initial check for unread messages on load
  useEffect(() => {
    if (!staffId || grievances.length === 0) return;

    let isMounted = true;
    const checkInitialUnread = async () => {
      const initialMap = {};
      await Promise.all(grievances.map(async (g) => {
        try {
          const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/chat/${g._id}`);
          if (res.ok) {
            const msgs = await res.json();
            if (msgs.length > 0) {
              const lastMsg = msgs[msgs.length - 1];
              const isStudentSender = (lastMsg.senderRole !== "staff" && lastMsg.senderId !== staffId);
              if (isStudentSender) {
                initialMap[g._id] = true;
              }
            }
          }
        } catch (err) {
          // ignore
        }
      }));

      if (isMounted) {
        setUnreadMap(prev => ({ ...prev, ...initialMap }));
      }
    };

    checkInitialUnread();
    return () => { isMounted = false; };
  }, [grievances.length, staffId]);

  // --- CHAT FUNCTIONS ---
  const openChat = (grievanceId) => {
    setCurrentChatId(grievanceId);
    setShowChat(true);
    // Remove red dot immediately
    setUnreadMap(prev => ({ ...prev, [grievanceId]: false }));
    setChatNotification(prev => (prev && prev.grievanceId === grievanceId ? null : prev));
  };

  const closeChat = () => {
    setShowChat(false);
    setCurrentChatId(null);
  };

  const updateStatus = async (id, newStatus) => {
    setMsg("Updating status...");
    setStatusType("info");
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/update/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          resolvedBy: staffId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");

      setMsg("Status updated successfully!");
      setStatusType("success");

      setGrievances((prev) =>
        prev.map((g) => (g._id === id ? data.grievance : g))
      );
    } catch (err) {
      console.error("Error updating grievance:", err);
      setMsg(`Error: ${err.message}`);
      setStatusType("error");
    }
  };

  const handleExtensionRequest = async () => {
    if (!extDate || !extReason) return alert("Please fill all fields");
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/extension/request/${extensionPopup._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestedDate: extDate, reason: extReason })
      });
      const data = await res.json();
      if (res.ok) {
        alert("Extension Requested!");
        setExtensionPopup(null);
        setExtDate("");
        setExtReason("");
        // Assuming fetchMyTasks() is a function to refresh the assigned grievances list
        // If not, you might need to call the polling function or manually update state
        // For now, let's assume a refresh function exists or trigger a re-fetch.
        // A simple way to trigger re-fetch is to clear grievances and let useEffect re-run.
        // Optimistic update: Update the specific grievance in the local state
        setGrievances(prev => prev.map(g => {
          if (g._id === extensionPopup._id) {
            return {
              ...g,
              extensionRequest: { ...g.extensionRequest, status: "Pending", requestedDate: extDate, reason: extReason }
            };
          }
          return g;
        }));
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert("Failed to request extension");
    }
  };

  // --- SUBMISSION HANDLERS ---
  const handleFileChange = (e) => {
    setAttachment(e.target.files[0]);
  };

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

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.department || !formData.message) {
      setMsg("Please fill all required fields.");
      setStatusType("error");
      return;
    }

    setMsg("Submitting your grievance...");
    setStatusType("info");
    setIsSubmitting(true);

    // 1️⃣ Upload File
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
        setMsg(`❌ Upload Error: ${err.message}`);
        setStatusType("error");
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: staffId,
          name: staffName,
          email: staffEmail,
          phone: "",
          regid: staffId,
          school: formData.department, // Selected School
          category: formData.department, // Routes to School Admin
          message: customIssueTitle ? `[Topic: ${customIssueTitle}]\n\n${formData.message}` : formData.message,
          studentProgram: "Admin Staff", // Required by backend
          attachment: attachmentUrl || "",
          issueTypeId: selectedIssueType || null // ✅ Include staff issue type for auto-assignment
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Submission failed");

      setMsg("✅ Grievance submitted successfully!");
      setStatusType("success");
      setIsSubmitted(true);
      setTimeout(() => setIsSubmitted(false), 5000);
      setFormData({ department: "", message: "" });
      setSelectedIssueType("");
      setCustomIssueTitle("");
      setAttachment(null);
      if (document.getElementById("adminStaffFile")) document.getElementById("adminStaffFile").value = "";

      fetchMySubmissions(); // Refresh list
    } catch (err) {
      setMsg(`❌ Error: ${err.message}`);
      setStatusType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchMySubmissions = async () => {
    if (!staffId) return;
    setLoadingMine(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/user/${staffId}`);
      const data = await res.json();
      if (res.ok) setMyGrievances(data);
    } catch (err) {
      console.error("Error fetching my submissions:", err);
    } finally {
      setLoadingMine(false);
    }
  };

  // Load my submissions when tab changes
  useEffect(() => { if (activeTab === "mine") fetchMySubmissions(); }, [activeTab]);

  // ✅ Fetch Pool Accept Grievances
  useEffect(() => {
    if (activeTab === "pool" && myDepartment) {
      fetchPoolGrievances();
    }
  }, [activeTab, myDepartment]);

  const fetchPoolGrievances = async () => {
    if (!myDepartment) return;
    setLoadingPool(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/pool-accept?staffId=${staffId}&department=${encodeURIComponent(myDepartment)}`);
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Fetch pool grievances error:", errorText);
        return;
      }
      const data = await res.json();
      console.log("Fetched pool grievances:", data);
      setPoolGrievances(data);
    } catch (err) {
      console.error("Error fetching pool grievances:", err);
    } finally {
      setLoadingPool(false);
    }
  };

  const handleAcceptGrievance = async (grievanceId) => {
    if (!window.confirm("Are you sure you want to accept this grievance?")) return;

    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/accept/${grievanceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ staffId, staffName })
      });

      if (res.ok) {
        setMsg("Grievance accepted successfully!");
        setStatusType("success");
        fetchPoolGrievances(); // Refresh pool
        setTimeout(() => setMsg(""), 3000);
      } else {
        const error = await res.json();
        setMsg(error.message || "Failed to accept grievance");
        setStatusType("error");
      }
    } catch (err) {
      console.error("Error accepting grievance:", err);
      setMsg("Failed to accept grievance");
      setStatusType("error");
    }
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
        setGrievances(prev => prev.filter(g => g._id !== id));
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

  // ✅ FILTER LOGIC
  const getFilteredData = (data, type) => {
    return data.filter((g) => {
      // 1. Search ID (Student ID for Assigned, Staff ID for Mine)
      let matchId = true;
      if (searchId) {
        const q = searchId.toLowerCase();
        if (type === "assigned") {
          matchId = (g.userId || "").toLowerCase().includes(q) || (g.name || "").toLowerCase().includes(q);
        } else {
          matchId = (g.assignedTo || "").toLowerCase().includes(q);
        }
      }

      // 2. Common Filters
      const matchStatus = filterStatus === "All" || g.status === filterStatus;
      const matchDept = filterDepartment === "All" || (g.category || g.school || "") === filterDepartment;

      let matchMonth = true;
      if (filterMonth) {
        const gDate = new Date(g.createdAt);
        const [year, month] = filterMonth.split("-");
        matchMonth = gDate.getFullYear() === parseInt(year) && (gDate.getMonth() + 1) === parseInt(month);
      }

      return matchId && matchStatus && matchDept && matchMonth;
    });
  };

  // Get Unique Departments for Dropdown
  const currentList = activeTab === "assigned" ? grievances : myGrievances;
  const uniqueDepartments = [...new Set(currentList.map(g => g.category || g.school).filter(Boolean))];

  const handleOpenExportModal = () => setShowExportModal(true);
  const handleExportSelected = (selectedData, selectedColumns) => {
    const token = localStorage.getItem("grievance_token");
    fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/export-selected`, {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ grievanceIds: selectedData.map((g) => g._id), columns: selectedColumns }),
    }).then((res) => { if (!res.ok) throw new Error(); return res.blob(); })
      .then((blob) => {
        const url = window.URL.createObjectURL(blob); const a = document.createElement("a");
        a.href = url; a.download = `staff_grievances_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a); a.click(); a.remove();
        setMsg("Export successful!"); setStatusType("success"); setTimeout(() => setMsg(""), 3000);
      }).catch(() => alert("Excel export failed"));
  };

  return (
    <div className="dashboard-container">
      {/* Toast Notification */}
      {toast.show && (
        <div className="toast-notification">
          <span><BellIcon width="20" height="20" /></span>
          {toast.message}
        </div>
      )}

      <header className="dashboard-header">
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <img src={ctLogo} alt="CT University" style={{ height: "50px" }} />
          <div className="header-content">
            <h1>Admin Staff Dashboard</h1>
            <p style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              Welcome, {staffName || staffId}
              {/* ✅ Badge for Team Member */}
              <span className="status-badge status-assigned" style={{ fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <ShieldIcon width="14" height="14" /> Team: {myDepartment}
              </span>

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

      {/* ✅ TABS NAVBAR (Pill Style) */}
      <nav className="navbar">
        <ul>
          <li className={activeTab === "assigned" ? "active" : ""}>
            <button onClick={() => setActiveTab("assigned")} className="tab-link-button">
              My Assigned Tasks
            </button>
          </li>
          <li className={activeTab === "pool" ? "active" : ""}>
            <button onClick={() => setActiveTab("pool")} className="tab-link-button">
              Pool Accept Queue
            </button>
          </li>
          <li className={activeTab === "ratings" ? "active" : ""}>
            <button onClick={() => setActiveTab("ratings")} className="tab-link-button">
              ⭐ My Ratings ({ratingData.totalRatings > 0 ? Number(ratingData.averageRating).toFixed(1) : 0})
            </button>
          </li>
          <li className={activeTab === "submit" ? "active" : ""}>
            <button onClick={() => setActiveTab("submit")} className="tab-link-button">
              Submit Grievance
            </button>
          </li>
          <li className={activeTab === "mine" ? "active" : ""}>
            <button onClick={() => setActiveTab("mine")} className="tab-link-button">
              My Submissions
            </button>
          </li>
          <li className={activeTab === "transferred" ? "active" : ""}>
            <button onClick={() => { setActiveTab("transferred"); fetchTransferredGrievances(); }} className="tab-link-button">
              🔁 Transferred Out ({transferredGrievances.length})
            </button>
          </li>
        </ul>
      </nav>

      <main className="dashboard-body">
        <div className="card">
          {msg && <div className={`alert-box ${statusType}`}>{msg}</div>}

          {/* TAB 1: ASSIGNED TASKS */}
          {activeTab === "assigned" && (
            <>
              <h2>Assigned Grievances</h2>
              <p style={{ marginBottom: "1rem", color: "#64748b" }}>These grievances have been specifically assigned to you.</p>

              {/* ✅ FILTER BAR */}
              <div className="filter-bar" style={{
                display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px",
                padding: "15px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0"
              }}>
                <input
                  type="text" placeholder="Search Student ID..."
                  value={searchId} onChange={(e) => setSearchId(e.target.value)}
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
                    setSearchId(""); setFilterStatus("All"); setFilterDepartment("All"); setFilterMonth("");
                  }}
                  style={{ padding: "10px 20px", borderRadius: "6px", border: "none", background: "#64748b", color: "white", cursor: "pointer", fontWeight: "600" }}
                >
                  Reset
                </button>
                <button onClick={handleOpenExportModal} style={{ padding: "10px 20px", borderRadius: "6px", border: "none", background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)", color: "white", cursor: "pointer", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 6px rgba(22, 163, 74, 0.2)" }} onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"} onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}><DownloadIcon width="16" height="16" /> Export</button>
              </div>

              {loading ? (
                <div className="table-container">
                  <table className="grievance-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>ID</th>
                        <th>Message</th>
                        <th>Submitted At</th>
                        <th className="deadline-col">Deadline</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4].map(i => (
                        <tr key={i} className="skeleton-row">
                          <td><div className="skeleton skeleton-text" style={{ width: 80 }} /></td>
                          <td><div className="skeleton skeleton-text" style={{ width: 120 }} /></td>
                          <td><div className="skeleton skeleton-text" style={{ width: 80 }} /></td>
                          <td className="message-cell"><div className="skeleton skeleton-text" style={{ width: 180 }} /></td>
                          <td><div className="skeleton skeleton-text" style={{ width: 90 }} /></td>
                          <td className="deadline-col"><div className="skeleton skeleton-text" style={{ width: 90 }} /></td>
                          <td><div className="skeleton skeleton-pill" /></td>
                          <td><div className="skeleton skeleton-btn" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : getFilteredData(grievances, "assigned").length === 0 ? (
                <div className="empty-state">
                  <p>{grievances.length === 0 ? "No grievances found assigned to your ID." : "No grievances match your filters."}</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="grievance-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>ID</th>
                        <th>Message</th>
                        <th>Submitted At</th>
                        <th className="deadline-col">Deadline</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredData(grievances, "assigned").map((g) => (
                        <tr key={g._id} onClick={() => setSelectedGrievance(g)} style={{ cursor: "pointer" }}>
                          <td>{g.name}</td>
                          <td>{g.email}</td>
                          <td>{g.regid || "-"}</td>
                          <td className="message-cell" style={{ maxWidth: '150px' }}>
                            <div
                              style={{
                                padding: "4px",
                                borderRadius: "4px",
                                transition: "background 0.22s"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#f1f5f9"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              <span style={{ wordBreak: 'break-all', lineHeight: '1.2', color: "#334155", fontWeight: "500" }}>{g.message.substring(0, 30)}{g.message.length > 30 ? "..." : ""}</span>
                            </div>
                          </td>
                          <td>{formatDate(g.createdAt)}</td>
                          <td className="deadline-col">
                            {(() => {
                              const ds = getDeadlineStatus(g.deadlineDate || g.deadline || g.deadline_date, g.status);
                              return (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px' }}>
                                  <span style={{ color: ds.color, fontWeight: ds.isOverdue ? '700' : '500' }}>{ds.label}</span>
                                  {ds.badge && <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', fontWeight: '700', background: ds.isOverdue ? '#fef2f2' : '#fffbeb', color: ds.color, border: `1px solid ${ds.color}30` }}>{ds.badge}</span>}
                                </div>
                              );
                            })()}
                          </td>
                          <td>
                            <span className={`status-badge status-${g.status.toLowerCase()}`}>{g.status}</span>
                            {g.status === "Resolved" && g.rating?.stars && (
                              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px", fontSize: "0.8rem", color: "#f59e0b" }}>
                                <span>{"★".repeat(g.rating.stars)}</span>
                                <span style={{ fontWeight: "700", color: "#b45309", fontSize: "0.75rem" }}>{g.rating.stars}.0</span>
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button className="action-btn resolve-btn" onClick={(e) => { e.stopPropagation(); updateStatus(g._id, "Resolved"); }} disabled={g.status === "Resolved" || g.status === "Rejected"} style={{ opacity: (g.status === "Resolved" || g.status === "Rejected") ? 0.5 : 1, cursor: (g.status === "Resolved" || g.status === "Rejected") ? "not-allowed" : "pointer" }}>Resolve</button>
                              {g.extensionRequest?.status === "Pending" && (
                                <span style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', background: '#fffbeb', color: '#b45309', border: '1px solid #fcd34d', fontWeight: '600' }}>⏳ Pending</span>
                              )}
                              <button
                                className="action-btn chat-btn"
                                onClick={(e) => { e.stopPropagation(); setCurrentChatId(g._id); setShowChat(true); }}
                                style={{ background: "#3b82f6", color: "white", position: "relative" }}
                              >
                                Chat
                                {unreadMap[g._id] && <span className="notification-dot"></span>}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* TAB 2: POOL ACCEPT QUEUE */}
          {activeTab === "pool" && (
            <>
              <h2>Pool Accept Queue</h2>
              <p style={{ marginBottom: "1rem", color: "#64748b" }}>
                Grievances available for you to accept (Pool Accept Mode). First to accept gets assigned!
              </p>

              {loadingPool ? (
                <p>Loading pool grievances...</p>
              ) : poolGrievances.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", background: "white", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
                  <p style={{ color: "#64748b", margin: 0 }}>No grievances available in the pool</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="grievance-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>ID</th>
                        <th>Message</th>
                        <th>Submitted At</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poolGrievances.map((g) => (
                        <tr key={g._id}>
                          <td>{g.name}</td>
                          <td>{g.email}</td>
                          <td>{g.regid || "-"}</td>
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
                          <td>{formatDate(g.createdAt)}</td>
                          <td>
                            <span className={`status-badge status-${g.status.toLowerCase().replace(" ", "")}`}>
                              {g.status}
                            </span>
                          </td>
                          <td className="action-cell">
                            <button
                              onClick={() => handleAcceptGrievance(g._id)}
                              style={{
                                padding: "8px 16px",
                                background: "#16a34a",
                                color: "white",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                fontWeight: "600",
                                transition: "all 0.2s"
                              }}
                              onMouseOver={(e) => e.currentTarget.style.transform = "translateY(-2px)"}
                              onMouseOut={(e) => e.currentTarget.style.transform = "translateY(0)"}
                            >
                              Accept
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* TAB 3: SUBMIT GRIEVANCE */}
          {activeTab === "submit" && (
            <>
              <h2>Submit Staff Grievance</h2>
              <p>Select the relevant School/Department. It will be routed to the Head of Department.</p>

              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="input-group">
                    <label>Full Name</label>
                    <input type="text" value={staffName} readOnly className="read-only-input" />
                  </div>
                  <div className="input-group">
                    <label>Staff ID</label>
                    <input type="text" value={staffId} readOnly className="read-only-input" />
                  </div>
                </div>

                <div className="input-group">
                  <label>Email</label>
                  <input type="email" value={staffEmail} readOnly className="read-only-input" />
                </div>

                <div className="input-group">
                  <label>Select School / Department</label>
                  <select name="department" value={formData.department} onChange={handleChange} required>
                    <option value="">-- Select School --</option>
                    {schools.map((school) => <option key={school} value={school}>{school}</option>)}
                  </select>
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
                  <label>Message</label>
                  <textarea name="message" value={formData.message} onChange={handleChange} placeholder="Describe your issue..." rows="5" required></textarea>
                </div>

                <div className="input-group">
                  <label>Attach Document (Optional)</label>
                  <input id="adminStaffFile" type="file" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" className="file-input" />
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
            </>
          )}

          {/* TAB 3: MY SUBMISSIONS */}
          {activeTab === "mine" && (
            <>
              <h2>My Submitted Grievances</h2>

              {/* ✅ FILTER BAR (For My Submissions) */}
              <div className="filter-bar" style={{
                display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px",
                padding: "15px", background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0"
              }}>
                <input
                  type="text" placeholder="Search Assigned Staff ID..."
                  value={searchId} onChange={(e) => setSearchId(e.target.value)}
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
                    setSearchId(""); setFilterStatus("All"); setFilterDepartment("All"); setFilterMonth("");
                  }}
                  style={{ padding: "10px 20px", borderRadius: "6px", border: "none", background: "#64748b", color: "white", cursor: "pointer", fontWeight: "600" }}
                >
                  Reset
                </button>
              </div>

              {loadingMine ? <p>Loading...</p> : getFilteredData(myGrievances, "mine").length === 0 ? <p>No submissions match your filters.</p> : (
                <div className="table-container">
                  <table className="grievance-table">
                    <thead>
                      <tr>
                        <th>Category</th>
                        <th>Message</th>
                        <th>Status</th>
                        <th>Assigned To</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredData(myGrievances, "mine").map((g) => (
                        <tr key={g._id} onClick={() => setSelectedGrievance(g)} style={{ cursor: "pointer" }}>
                          <td>{g.category}</td>
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
                          <td>
                            <span className={`status-badge status-${g.status.toLowerCase()}`}>
                              {g.status}
                            </span>
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

          {/* TAB 5: 🔁 TRANSFERRED OUT GRIEVANCES */}
          {activeTab === "transferred" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.3rem", color: "#1e293b", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>🔁</span> Transferred Out Grievances
                  </h2>
                  <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.9rem" }}>
                    Grievances you have re-routed to other departments, with their live status and handling details.
                  </p>
                </div>
                <button
                  onClick={fetchTransferredGrievances}
                  style={{
                    padding: "8px 16px",
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    color: "#334155",
                    fontWeight: "600",
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  🔄 Refresh
                </button>
              </div>

              {loadingTransferred ? (
                <div style={{ textAlign: "center", padding: "40px", color: "#64748b" }}>
                  Loading transferred grievances...
                </div>
              ) : transferredGrievances.length > 0 ? (
                <div className="table-responsive">
                  <table className="grievance-table">
                    <thead>
                      <tr>
                        <th>Grievance ID</th>
                        <th>Student</th>
                        <th>Forwarded To</th>
                        <th>Forwarded Date</th>
                        <th>Transfer Reason</th>
                        <th>Current Status</th>
                        <th>Current Staff</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transferredGrievances.map((g) => {
                        const myTransfer = g.transferHistory?.filter(
                          t => t.transferredBy?.toUpperCase() === staffId
                        ).slice(-1)[0] || g.transferHistory?.slice(-1)[0];

                        return (
                          <tr key={g._id}>
                            <td>
                              <span style={{ fontWeight: "700", fontFamily: "monospace", color: "#2563eb" }}>
                                #{g._id.slice(-6)}
                              </span>
                            </td>
                            <td>
                              <strong>{g.name}</strong>
                              <span style={{ display: "block", fontSize: "0.8rem", color: "#64748b" }}>
                                {g.userId || g.regid} • {g.studentProgram}
                              </span>
                            </td>
                            <td>
                              <span
                                style={{
                                  background: "#eff6ff",
                                  color: "#1d4ed8",
                                  border: "1px solid #bfdbfe",
                                  padding: "3px 8px",
                                  borderRadius: "6px",
                                  fontWeight: "700",
                                  fontSize: "0.8rem",
                                  display: "inline-block"
                                }}
                              >
                                {myTransfer?.toDepartment || g.category}
                              </span>
                            </td>
                            <td style={{ fontSize: "0.85rem", color: "#475569" }}>
                              {myTransfer?.transferredAt
                                ? new Date(myTransfer.transferredAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })
                                : "N/A"}
                            </td>
                            <td style={{ maxWidth: "220px", fontSize: "0.85rem" }}>
                              <div style={{ background: "#f8fafc", padding: "6px 8px", borderRadius: "6px", border: "1px dashed #cbd5e1", fontStyle: "italic", color: "#334155", wordBreak: "break-word" }}>
                                “{myTransfer?.reason || "Re-routed to correct department"}”
                              </div>
                            </td>
                            <td>
                              <span className={`status-badge status-${g.status.toLowerCase()}`}>
                                {g.status}
                              </span>
                            </td>
                            <td style={{ fontSize: "0.85rem", color: "#334155" }}>
                              {g.assignedTo ? (
                                <span>
                                  <strong>{staffMap[g.assignedTo] || g.assignedTo}</strong>
                                </span>
                              ) : (
                                <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Unassigned</span>
                              )}
                            </td>
                            <td>
                              <button
                                onClick={() => setSelectedGrievance(g)}
                                style={{
                                  padding: "6px 12px",
                                  backgroundColor: "#2563eb",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "6px",
                                  fontWeight: "600",
                                  fontSize: "0.8rem",
                                  cursor: "pointer"
                                }}
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
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
                  <div style={{ fontSize: "2.5rem", marginBottom: "10px" }}>🔁</div>
                  <h4 style={{ margin: "0 0 6px 0", color: "#1e293b" }}>No Transferred Grievances</h4>
                  <p style={{ margin: 0, fontSize: "0.9rem", maxWidth: "450px", marginInline: "auto" }}>
                    If you re-route a grievance that belongs to another department, its transfer record and live resolution tracking will appear here.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* --- DETAILS POPUP MODAL --- */}
          {selectedGrievance && (
            <GrievanceDetailsModal
              grievance={selectedGrievance}
              staffMap={staffMap}
              onClose={() => setSelectedGrievance(null)}
              onDelete={handleDeleteGrievance}
              onTransferred={(message) => {
                setMsg(message);
                setStatusType("success");
                fetchAssignedGrievances();
                fetchTransferredGrievances();
                setSelectedGrievance(null);
                setTimeout(() => setMsg(""), 4000);
              }}
              onRequestExtension={(g) => {
                setExtensionPopup(g);
                setExtDate("");
                setExtReason("");
              }}
            />
          )}
          {/* --------------------------------------- */}
        </div>
      </main>

      {/* ✅ Chat Popup (Using Reusable Component) */}
      <ChatPopup
        isOpen={showChat}
        onClose={closeChat}
        grievanceId={currentChatId}
        currentUserId={staffId}
        currentUserRole="staff"
      />

      {/* 🔔 Real-Time Chat Notification Toast */}
      <ChatNotificationToast
        notification={chatNotification}
        onOpenChat={openChat}
        onClose={() => setChatNotification(null)}
      />

      {/* ✅ SUPER SMOOTH INTERACTIONS (Makhan UI) */}
      <style>{`
        .dashboard-container { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* Smooth Transitions */
        .card, .navbar, input, select, textarea, button, .action-btn, .submit-btn, .logout-btn-header {
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
        }

        /* Hover Effects */
        .card:hover { box-shadow: 0 15px 30px rgba(0,0,0,0.1) !important; }
        
        button:hover, .action-btn:hover, .submit-btn:hover, .logout-btn-header:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        button:active, .action-btn:active { transform: scale(0.95); }

        /* Reject Button Style */
        .reject-btn { background-color: #fef2f2; color: #dc2626; border: 1px solid #fee2e2; }
        .reject-btn:hover {
          background-color: #dc2626; color: white; border-color: #dc2626;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);
        }

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
      {/* --- EXTENSION REQUEST MODAL --- */}
      {extensionPopup && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          background: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 2000
        }}>
          <div style={{ background: "white", padding: "20px", borderRadius: "8px", width: "400px", position: "relative" }}>
            <button onClick={() => setExtensionPopup(null)} style={{ position: "absolute", top: "10px", right: "10px", background: "none", border: "none", cursor: "pointer" }}>
              <XIcon />
            </button>
            <h3 style={{ marginBottom: "15px" }}>Request Deadline Extension</h3>
            <p style={{ fontSize: "0.9rem", color: "#64748b", marginBottom: "10px" }}>Current Deadline: {formatDateDateOnly(extensionPopup.deadlineDate)}</p>

            <div style={{ marginBottom: "15px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>New Proposed Date</label>
              <input
                type="date"
                value={extDate}
                onChange={(e) => setExtDate(e.target.value)}
                min={(() => {
                  const baseDateStr = extensionPopup.deadlineDate || extensionPopup.deadline || extensionPopup.deadline_date;
                  const baseDate = baseDateStr ? new Date(baseDateStr) : new Date();
                  baseDate.setDate(baseDate.getDate() + 1); // Move to next day
                  return baseDate.toISOString().split('T')[0];
                })()}
                style={{ width: "95%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
              />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "5px", fontWeight: "500" }}>Reason</label>
              <textarea
                value={extReason}
                onChange={(e) => setExtReason(e.target.value)}
                placeholder="Why do you need more time?"
                style={{ width: "95%", padding: "8px", border: "1px solid #cbd5e1", borderRadius: "4px", minHeight: "80px" }}
              />
            </div>

            <button
              onClick={handleExtensionRequest}
              style={{ width: "100%", padding: "10px", background: "#6366f1", color: "white", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
            >
              Submit Request
            </button>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportPreviewModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} grievances={getFilteredData(grievances, "assigned")} staffMap={staffMap} onExport={handleExportSelected} />

    </div>
  );
}

export default AdminStaffDashboard;