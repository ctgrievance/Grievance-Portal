import StudentUser from "../models/StudentUser.js";
import StaffUser from "../models/StaffUser.js";
import StudentRecord from "../models/StudentRecord.js";
import StaffRecord from "../models/StaffRecord.js";

/**
 * Sync single student registration status to StudentRecord
 */
export const syncSingleStudentRegistration = async (studentUser, isRegistered = true) => {
  try {
    if (!studentUser) return;
    const cleanId = studentUser.id ? String(studentUser.id).trim().toUpperCase() : "";
    const cleanCtu = studentUser.ctuId ? String(studentUser.ctuId).trim().toUpperCase() : "";
    const cleanEmail = studentUser.email ? String(studentUser.email).trim().toLowerCase() : "";

    const orClauses = [];
    if (cleanId) {
      orClauses.push({ id: cleanId }, { id: cleanId.toLowerCase() });
    }
    if (cleanCtu) {
      orClauses.push({ ctuId: cleanCtu }, { ctuId: cleanCtu.toLowerCase() });
    }
    if (cleanEmail) {
      orClauses.push({ email: cleanEmail });
    }

    if (orClauses.length === 0) return;

    if (isRegistered) {
      await StudentRecord.updateMany(
        { $or: orClauses },
        {
          $set: {
            isRegistered: true,
            registeredUserId: studentUser.id,
            registeredAt: studentUser.createdAt || new Date(),
            registeredEmail: studentUser.email || null,
            registeredPhone: studentUser.phone || null
          }
        }
      );
    } else {
      await StudentRecord.updateMany(
        { $or: orClauses },
        {
          $set: {
            isRegistered: false,
            registeredUserId: null,
            registeredAt: null,
            registeredEmail: null,
            registeredPhone: null
          }
        }
      );
    }
  } catch (err) {
    console.error("Error in syncSingleStudentRegistration:", err);
  }
};

/**
 * Sync single staff registration status to StaffRecord
 */
export const syncSingleStaffRegistration = async (staffUser, isRegistered = true) => {
  try {
    if (!staffUser) return;
    const cleanId = staffUser.id ? String(staffUser.id).trim().toUpperCase() : "";
    const cleanEmail = staffUser.email ? String(staffUser.email).trim().toLowerCase() : "";

    const orClauses = [];
    if (cleanId) orClauses.push({ id: cleanId }, { id: cleanId.toLowerCase() });
    if (cleanEmail) orClauses.push({ email: cleanEmail });

    if (orClauses.length === 0) return;

    if (isRegistered) {
      await StaffRecord.updateMany(
        { $or: orClauses },
        {
          $set: {
            isRegistered: true,
            registeredUserId: staffUser.id,
            registeredAt: staffUser.createdAt || new Date(),
            registeredEmail: staffUser.email || null,
            registeredPhone: staffUser.phone || null,
            registeredRole: staffUser.role || (staffUser.isDeptAdmin ? "dept_admin" : null)
          }
        }
      );
    } else {
      await StaffRecord.updateMany(
        { $or: orClauses },
        {
          $set: {
            isRegistered: false,
            registeredUserId: null,
            registeredAt: null,
            registeredEmail: null,
            registeredPhone: null,
            registeredRole: null
          }
        }
      );
    }
  } catch (err) {
    console.error("Error in syncSingleStaffRegistration:", err);
  }
};

/**
 * Full bulk sync across all records
 */
export const syncAllRegistrationStatuses = async () => {
  console.log("⚡ Starting full registration status sync...");
  const t0 = performance.now();

  const verifiedStudentCondition = {
    isVerified: true,
    $or: [{ otp: { $exists: false } }, { otp: null }, { otp: "" }]
  };
  const verifiedStaffCondition = {
    isVerified: true,
    $or: [{ otp: { $exists: false } }, { otp: null }, { otp: "" }]
  };

  const [verifiedStudents, verifiedStaff] = await Promise.all([
    StudentUser.find(verifiedStudentCondition).select("id ctuId email phone createdAt").lean(),
    StaffUser.find(verifiedStaffCondition).select("id email phone role isDeptAdmin createdAt").lean()
  ]);

  // 1. Reset all StudentRecords to false first
  await StudentRecord.updateMany({}, { $set: { isRegistered: false, registeredUserId: null, registeredAt: null, registeredEmail: null, registeredPhone: null } });

  // 2. Bulk operations for registered students
  const studentOps = [];
  for (const s of verifiedStudents) {
    const ids = [];
    if (s.id) ids.push(String(s.id).trim().toUpperCase());
    if (s.ctuId) ids.push(String(s.ctuId).trim().toUpperCase());
    const email = s.email ? String(s.email).trim().toLowerCase() : "";

    const or = [];
    ids.forEach(i => {
      or.push({ id: i }, { id: i.toLowerCase() }, { ctuId: i }, { ctuId: i.toLowerCase() });
    });
    if (email) or.push({ email });

    if (or.length > 0) {
      studentOps.push({
        updateMany: {
          filter: { $or: or },
          update: {
            $set: {
              isRegistered: true,
              registeredUserId: s.id,
              registeredAt: s.createdAt || new Date(),
              registeredEmail: s.email || null,
              registeredPhone: s.phone || null
            }
          }
        }
      });
    }
  }

  if (studentOps.length > 0) {
    for (let i = 0; i < studentOps.length; i += 1000) {
      const chunk = studentOps.slice(i, i + 1000);
      await StudentRecord.bulkWrite(chunk, { ordered: false });
    }
  }

  // 3. Reset all StaffRecords to false first
  await StaffRecord.updateMany({}, { $set: { isRegistered: false, registeredUserId: null, registeredAt: null, registeredEmail: null, registeredPhone: null, registeredRole: null } });

  // 4. Bulk operations for registered staff
  const staffOps = [];
  for (const st of verifiedStaff) {
    const id = st.id ? String(st.id).trim().toUpperCase() : "";
    const email = st.email ? String(st.email).trim().toLowerCase() : "";
    const or = [];
    if (id) or.push({ id }, { id: id.toLowerCase() });
    if (email) or.push({ email });

    if (or.length > 0) {
      staffOps.push({
        updateMany: {
          filter: { $or: or },
          update: {
            $set: {
              isRegistered: true,
              registeredUserId: st.id,
              registeredAt: st.createdAt || new Date(),
              registeredEmail: st.email || null,
              registeredPhone: st.phone || null,
              registeredRole: st.role || (st.isDeptAdmin ? "dept_admin" : null)
            }
          }
        }
      });
    }
  }

  if (staffOps.length > 0) {
    for (let i = 0; i < staffOps.length; i += 1000) {
      const chunk = staffOps.slice(i, i + 1000);
      await StaffRecord.bulkWrite(chunk, { ordered: false });
    }
  }

  const elapsed = (performance.now() - t0).toFixed(0);
  console.log(`✅ Full registration sync completed in ${elapsed}ms (${verifiedStudents.length} students, ${verifiedStaff.length} staff)`);
  return { studentsCount: verifiedStudents.length, staffCount: verifiedStaff.length, elapsedMs: elapsed };
};
