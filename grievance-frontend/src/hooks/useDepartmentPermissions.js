import { useState, useEffect } from "react";

export const useDepartmentPermissions = (deptName) => {
  const [permissions, setPermissions] = useState({
    allowStudentRecords: false,
    allowStaffRecords: false,
    allowRegisteredStudents: false,
    allowRegisteredStaff: false,
    loading: true,
  });

  useEffect(() => {
    if (!deptName) {
      setPermissions({
        allowStudentRecords: false,
        allowStaffRecords: false,
        allowRegisteredStudents: false,
        allowRegisteredStaff: false,
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
              allowStaffRecords: !!data.allowStaffRecords,
              allowRegisteredStudents: !!data.allowRegisteredStudents,
              allowRegisteredStaff: !!data.allowRegisteredStaff,
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
        const clean = deptName.toLowerCase();
        setPermissions({
          allowStudentRecords: clean === "student section",
          allowStaffRecords: clean === "hr",
          allowRegisteredStudents: false,
          allowRegisteredStaff: false,
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
