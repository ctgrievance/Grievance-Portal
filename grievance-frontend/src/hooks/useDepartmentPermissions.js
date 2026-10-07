import { useState, useEffect } from "react";

export const useDepartmentPermissions = (deptName) => {
  const [permissions, setPermissions] = useState({
    allowStudentRecords: false,
    studentRecordsMode: "write",
    allowStaffRecords: false,
    staffRecordsMode: "write",
    allowRegisteredStudents: false,
    registeredStudentsMode: "write",
    allowRegisteredStaff: false,
    registeredStaffMode: "write",
    loading: true,
  });

  useEffect(() => {
    if (!deptName) {
      setPermissions({
        allowStudentRecords: false,
        studentRecordsMode: "write",
        allowStaffRecords: false,
        staffRecordsMode: "write",
        allowRegisteredStudents: false,
        registeredStudentsMode: "write",
        allowRegisteredStaff: false,
        registeredStaffMode: "write",
        loading: false,
      });
      return;
    }

    let isMounted = true;

    const fetchPermissions = async () => {
      try {
        const res = await fetch(
          `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/departments/permissions/${encodeURIComponent(deptName)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setPermissions({
              allowStudentRecords: !!data.allowStudentRecords,
              studentRecordsMode: data.studentRecordsMode || "write",
              allowStaffRecords: !!data.allowStaffRecords,
              staffRecordsMode: data.staffRecordsMode || "write",
              allowRegisteredStudents: !!data.allowRegisteredStudents,
              registeredStudentsMode: data.registeredStudentsMode || "write",
              allowRegisteredStaff: !!data.allowRegisteredStaff,
              registeredStaffMode: data.registeredStaffMode || "write",
              loading: false,
            });
          }
          return;
        }
      } catch (err) {
        console.warn("Could not fetch department permissions:", err);
      }

      // Graceful fallback if offline or request fails
      if (isMounted) {
        setPermissions({
          allowStudentRecords: false,
          studentRecordsMode: "write",
          allowStaffRecords: false,
          staffRecordsMode: "write",
          allowRegisteredStudents: false,
          registeredStudentsMode: "write",
          allowRegisteredStaff: false,
          registeredStaffMode: "write",
          loading: false,
        });
      }
    };

    fetchPermissions();

    return () => {
      isMounted = false;
    };
  }, [deptName]);

  return permissions;
};

export default useDepartmentPermissions;
