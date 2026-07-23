import React, { useEffect, useState } from "react";

function AssignStaffPopup({
  isOpen,
  onClose,
  department,
  grievanceId,
  adminId,
  onAssigned,
}) {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [msg, setMsg] = useState("");
  const [statusType, setStatusType] = useState("");

  // Deadline states
  const [grievanceCreatedAt, setGrievanceCreatedAt] = useState(null);
  const [deadline, setDeadline] = useState("");

  // Helper to get local date string YYYY-MM-DD
  const toLocalYYYYMMDD = (d) => {
    if (!d) return "";
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };


  /* ================= FETCH STAFF ================= */
  useEffect(() => {
    if (!isOpen) return;

    // Default deadline = 7 days from assignment date
    const initDate = new Date();
    initDate.setDate(initDate.getDate() + 7);
    setDeadline(toLocalYYYYMMDD(initDate));

    const fetchStaffAndGrievance = async () => {
      try {
        setLoading(true);
        setMsg("");

        // Fetch staff list
        const staffRes = await fetch(
          `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/admin/staff/${encodeURIComponent(department)}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("grievance_token")}` } }
        );
        const staffData = await staffRes.json();
        if (!staffRes.ok) throw new Error(staffData.message || "Failed to load staff");

        // ✅ Fix: Filter out Students (8-digit IDs)
        const validStaff = staffData.filter(s => s.id.length !== 8);
        setStaffList(validStaff);

        // Fetch grievance detail to read createdAt and existing deadline
        if (grievanceId) {
          const gRes = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/detail/${grievanceId}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("grievance_token")}` }
          });
          const gData = await gRes.json();
          if (gRes.ok) {
            if (gData.createdAt) setGrievanceCreatedAt(new Date(gData.createdAt));
            if (gData.deadlineDate) {
              const d = new Date(gData.deadlineDate);
              // Format for date input yyyy-mm-dd using local time
              setDeadline(toLocalYYYYMMDD(d));
            } else {
              // Default deadline = 7 days from assignment date
              const defaultDate = new Date();
              defaultDate.setDate(defaultDate.getDate() + 7);
              setDeadline(toLocalYYYYMMDD(defaultDate));
            }
          }
        }

      } catch (err) {
        setMsg("❌ Failed to load staff list or grievance data");
        setStatusType("error");
      } finally {
        setLoading(false);
      }
    };

    fetchStaffAndGrievance();
  }, [isOpen, department, grievanceId]);

  if (!isOpen) return null;

  /* ================= ASSIGN HANDLER ================= */
  const handleAssign = async () => {
    if (!selectedStaffId) {
      setMsg("Please select a staff member");
      setStatusType("error");
      return;
    }

    try {
      setAssigning(true);
      setMsg("Assigning grievance...");
      setStatusType("info");

      const res = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/grievances/assign/${grievanceId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("grievance_token")}`
          },
          body: JSON.stringify({
            staffId: selectedStaffId, // ✅ correct field
            adminId: adminId,          // ✅ dept admin ID
            deadline: deadline || null
          }),
        }
      );

      const data = await res.json();
      console.log("Assign response:", data);
      if (!res.ok) throw new Error(data.message);

      if (onAssigned) {
        const msgText = deadline ? `✅ Assigned to ${selectedStaffId} (Deadline: ${deadline})` : `✅ Assigned to ${selectedStaffId}`;
        onAssigned(msgText, "success");
      }

      setSelectedStaffId("");
      setDeadline("");
      onClose();
    } catch (err) {
      setMsg(err.message);
      setStatusType("error");
    } finally {
      setAssigning(false);
    }
  };

  /* ================= UI ================= */
  return (
    <div className="assign-modal-overlay">
      <div className="assign-modal">
        <div className="assign-modal-header">
          <h3>Assign Staff – {department}</h3>
          <button className="assign-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <p className="assign-modal-subtitle">
          Select a staff member to handle this grievance.
        </p>

        {msg && <div className={`alert-box ${statusType}`}>{msg}</div>}

        {loading ? (
          <p>Loading staff...</p>
        ) : staffList.length === 0 ? (
          <div className="empty-state">
            <p>No staff found for this department.</p>
          </div>
        ) : (
          <div>
            <div className="assign-staff-list">
              {staffList.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`staff-pill ${selectedStaffId === s.id ? "selected" : ""
                    }`}
                  onClick={() => setSelectedStaffId(s.id)}
                >
                  {s.fullName} ({s.id})
                </button>
              ))}
            </div>

            <div style={{ marginTop: 12, padding: '0 24px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#334155' }}>Select Deadline</label>
              <input
                type="date"
                value={deadline}
                min={grievanceCreatedAt ? toLocalYYYYMMDD(grievanceCreatedAt) : toLocalYYYYMMDD(new Date())}
                onChange={(e) => setDeadline(e.target.value)}
                style={{ padding: '10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '1rem', width: '100%' }}
              />
              <div style={{ fontSize: '12px', color: '#64748b' }}>
                * Deadline must be on or after: {grievanceCreatedAt ? grievanceCreatedAt.toLocaleDateString() : 'Submission Date'}
              </div>
            </div>
          </div>
        )}

        <div className="assign-modal-footer">
          <button
            className="assign-cancel-btn"
            onClick={onClose}
            disabled={assigning}
          >
            Cancel
          </button>
          <button
            className="assign-confirm-btn"
            onClick={handleAssign}
            disabled={assigning || !selectedStaffId}
          >
            {assigning ? "Assigning..." : "Assign"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssignStaffPopup;
