import StaffRecord from "../models/StaffRecord.js";
import StaffUser from "../models/StaffUser.js";
import User from "../models/UserModel.js";
import xlsx from "xlsx";
import fs from "fs";

// ─── In-memory job tracker ────────────────────────────────────────────────
const uploadJobs = new Map();
// ─────────────────────────────────────────────────────────────────────────

// ─── Smart field extractor ────────────────────────────────────────────────
const norm = (s) => String(s).toLowerCase().replace(/[\s\-_().\/]/g, "");

const findField = (row, ...keywords) => {
  const rowKeys = Object.keys(row);
  for (const kw of keywords) {
    const kwNorm = norm(kw);
    const exactKey = rowKeys.find((k) => norm(k) === kwNorm);
    if (exactKey !== undefined && String(row[exactKey]).trim() !== "")
      return String(row[exactKey]).trim();
  }
  for (const kw of keywords) {
    const kwNorm = norm(kw);
    const partialKey = rowKeys.find(
      (k) => norm(k).includes(kwNorm) || kwNorm.includes(norm(k))
    );
    if (partialKey !== undefined && String(row[partialKey]).trim() !== "")
      return String(row[partialKey]).trim();
  }
  return "";
};

// ─── Merged cells propagator ──────────────────────────────────────────────
// Expands top-left cell values into all cells covered by Excel merged ranges
export const fillMergedCells = (sheet) => {
  if (!sheet || !sheet["!merges"] || !Array.isArray(sheet["!merges"])) return;
  for (const merge of sheet["!merges"]) {
    const startCellAddress = xlsx.utils.encode_cell(merge.s);
    const cellValue = sheet[startCellAddress];
    if (!cellValue) continue;

    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        if (r === merge.s.r && c === merge.s.c) continue;
        const targetAddress = xlsx.utils.encode_cell({ r, c });
        sheet[targetAddress] = { ...cellValue };
      }
    }
  }
};
// ─────────────────────────────────────────────────────────────────────────

// ─── Background processor (batch insertMany) ─────────────────────────────
const processUpload = async (jobId, rows, mode = "add") => {
  const job = uploadJobs.get(jobId);
  const BATCH = 200; // rows per batch

  try {
    // 1️⃣ IF MODE IS "CHANGE" (Complete Replace / Overwrite):
    // Clear all existing records before inserting the fresh batch
    if (mode === "change") {
      const del = await StaffRecord.deleteMany({});
      console.log(`🔄 [StaffRecord] Mode 'change': Cleared ${del.deletedCount} existing records.`);
    }

    // 2️⃣ IF MODE IS "REMOVE" (Delete matching records found in Excel):
    if (mode === "remove") {
      let deleted = 0;
      const idsToDelete = [];
      for (const row of rows) {
        let id = findField(
          row,
          "ID", "Staff ID", "StaffID", "Emp ID", "Employee ID", "EmpID",
          "Emp. Code", "Emp Code", "EmpCode", "Employee Code", "EmployeeCode",
          "Faculty ID", "FacultyID", "Faculty Code", "FacultyCode",
          "Staff Code", "StaffCode", "Teacher ID", "Code"
        ).toUpperCase();
        if (id) idsToDelete.push(id);
      }

      if (idsToDelete.length > 0) {
        for (let i = 0; i < idsToDelete.length; i += 500) {
          const chunk = idsToDelete.slice(i, i + 500);
          const res = await StaffRecord.deleteMany({ id: { $in: chunk } });
          deleted += (res.deletedCount || 0);
          job.deleted = deleted;
          job.processed = Math.min(i + 500, idsToDelete.length);
          uploadJobs.set(jobId, job);
        }
      }

      job.status = "done";
      job.deleted = deleted;
      job.processed = rows.length;
      uploadJobs.set(jobId, job);
      console.log(`🗑️ [StaffRecord] Mode 'remove': Deleted ${deleted} staff records.`);
      return;
    }

    // 3️⃣ IF MODE IS "ADD" OR "CHANGE" (Insert / Upsert rows):
    let inserted = 0;
    let skipped = 0;
    let errors = [];
    let skippedRows = [];

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const docs = [];

      for (const row of batch) {
        let id = findField(
          row,
          "ID", "Staff ID", "StaffID", "Emp ID", "Employee ID", "EmpID",
          "Emp. Code", "Emp Code", "EmpCode", "Employee Code", "EmployeeCode",
          "Faculty ID", "FacultyID", "Faculty Code", "FacultyCode",
          "Staff Code", "StaffCode", "Teacher ID", "Code"
        ).toUpperCase();

        if (!id) {
          skipped++;
          skippedRows.push(row);
          continue;
        }

        let roleRaw = findField(row, "Role", "Type", "Staff Type", "Designation");
        let role = roleRaw ? roleRaw.toLowerCase() : "staff";
        if (role !== "admin") role = "staff";

        // Determine staffType (Teaching vs Non-Teaching)
        let staffType = row._sheetStaffType || "";
        if (!staffType) {
          const explicitType = findField(row, "Staff Type", "StaffType", "Category", "Staff Category", "Classification", "Teaching / Non-Teaching");
          if (/faculty|teach/i.test(explicitType)) {
            staffType = "Teaching";
          } else if (/admin|non/i.test(explicitType)) {
            staffType = "Non-Teaching";
          }
        }
        if (!staffType) {
          const desig = findField(row, "Designation", "Post", "Designation / Role");
          if (/professor|lecturer|teacher|faculty|instructor|dean|hod/i.test(desig)) {
            staffType = "Teaching";
          } else {
            staffType = "Non-Teaching";
          }
        }

        docs.push({
          id,
          fullName: findField(row, "Name", "Full Name", "FullName", "Staff Name", "Employee Name", "Emp Name", "Emp. Name", "Faculty Name", "Teacher Name"),
          email: findField(row, "Email", "Email ID", "EmailID", "E-mail", "email", "Mail").toLowerCase(),
          phone: findField(row, "Phone number", "Phone Number", "PhoneNumber", "Phone No", "Mobile", "Mobile No", "Mobile Number", "Contact", "Contact No"),
          department: findField(row, "Department", "Dept", "Faculty", "School", "Deaprtment", "Depart", "Branch"),
          role: role,
          staffType: staffType,
        });
      }

      if (docs.length === 0) {
        job.processed += batch.length;
        uploadJobs.set(jobId, job);
        continue;
      }

      try {
        // Deduplicate within the batch by ID to avoid duplicate key issues on upsert
        const uniqueDocsMap = new Map();
        for (const doc of docs) {
          uniqueDocsMap.set(doc.id, doc);
        }
        const uniqueDocs = Array.from(uniqueDocsMap.values());

        const ops = uniqueDocs.map((doc) => ({
          updateOne: {
            filter: { id: doc.id },
            update: { $set: doc },
            upsert: true,
          },
        }));
        const result = await StaffRecord.bulkWrite(ops, { ordered: false });
        inserted += (result.upsertedCount || 0) + (result.modifiedCount || 0);

        // 🔥 Sync updated name/contact/staffType details to registered accounts while strictly protecting Admin roles
        for (const doc of uniqueDocs) {
          try {
            const existingUser = await User.findOne({ id: doc.id });
            if (existingUser) {
              const syncUpdate = {};
              if (doc.fullName) syncUpdate.fullName = doc.fullName;
              if (doc.email) syncUpdate.email = doc.email;
              if (doc.phone) syncUpdate.phone = doc.phone;
              if (doc.staffType) syncUpdate.staffType = doc.staffType;

              const isAlreadyAdmin = existingUser.isDeptAdmin || existingUser.isMasterAdmin || existingUser.role === "admin";
              if (!isAlreadyAdmin && doc.role) {
                syncUpdate.role = doc.role;
              }

              if (Object.keys(syncUpdate).length > 0) {
                await User.updateOne({ id: doc.id }, { $set: syncUpdate });
                await StaffUser.updateOne({ id: doc.id }, { $set: syncUpdate });
              }
            }
          } catch (syncErr) {
            console.warn("Could not sync user in bulk upload:", syncErr.message);
          }
        }
      } catch (bulkErr) {
        if (bulkErr.result) {
          inserted += (bulkErr.result.upsertedCount || 0) + (bulkErr.result.modifiedCount || 0);
        }
        errors.push(`Batch error: ${bulkErr.message}`);
      }

      job.inserted = inserted;
      job.skipped = skipped;
      job.processed = Math.min(i + BATCH, rows.length);
      uploadJobs.set(jobId, job);
    }

    job.status = "done";
    job.inserted = inserted;
    job.skipped = skipped;
    job.processed = rows.length;
    job.errors = errors.slice(0, 10);
    job.skippedRows = skippedRows;
    console.log("⚠️ Skipped rows count:", skippedRows.length);
    uploadJobs.set(jobId, job);
  } catch (err) {
    const job = uploadJobs.get(jobId);
    if (job) {
      job.status = "error";
      job.errorMessage = err.message;
      uploadJobs.set(jobId, job);
    }
  }
};
// ─────────────────────────────────────────────────────────────────────────
// Fetch with Pagination and Filters
export const getAllRecords = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // Default 20 per page as requested
    const search = req.query.search || "";
    const staffType = (req.query.staffType || "all").toString().trim();
    
    // Build search query for id, name, email, phone, department
    const baseQuery = {};
    if (search) {
      baseQuery.$or = [
        { id: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } }
      ];
    }

    const query = { ...baseQuery };
    if (staffType.toLowerCase() === "teaching") {
      query.staffType = "Teaching";
    } else if (staffType.toLowerCase() === "non-teaching" || staffType.toLowerCase() === "non_teaching" || staffType.toLowerCase() === "admin") {
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: [{ staffType: "Non-Teaching" }, { staffType: { $exists: false } }, { staffType: "" }] }
        ];
        delete query.$or;
      } else {
        query.$or = [{ staffType: "Non-Teaching" }, { staffType: { $exists: false } }, { staffType: "" }];
      }
    }

    const [total, totalTeaching, totalNonTeaching, records] = await Promise.all([
      StaffRecord.countDocuments(query),
      StaffRecord.countDocuments({ ...baseQuery, staffType: "Teaching" }),
      StaffRecord.countDocuments({
        ...baseQuery,
        $or: [{ staffType: "Non-Teaching" }, { staffType: { $exists: false } }, { staffType: "" }]
      }),
      StaffRecord.find(query)
        .sort({ createdAt: -1 }) // Newest first
        .skip((page - 1) * limit)
        .limit(limit)
    ]);

    res.json({
      total,
      totalTeaching,
      totalNonTeaching,
      page,
      totalPages: Math.ceil(total / limit),
      records
    });
  } catch (error) {
    res.status(500).json({ message: "Server error fetching staff records", error });
  }
};

// Add a new staff record
export const addRecord = async (req, res) => {
  try {
    const { id, fullName, email, phone, role, department, staffType } = req.body;
    
    if (!id || !role) {
      return res.status(400).json({ message: "ID and Role are required" });
    }

    // Check if ID already exists
    const existing = await StaffRecord.findOne({ id: id.toString().trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: "Staff ID already exists" });
    }

    const record = new StaffRecord({
      id: id.toString().trim().toUpperCase(),
      fullName,
      email,
      phone,
      role: role.toLowerCase(),
      department,
      staffType: staffType === "Teaching" ? "Teaching" : "Non-Teaching"
    });

    await record.save();
    res.status(201).json({ message: "Staff record added successfully", record });
  } catch (error) {
    console.error("Add Record Error:", error);
    res.status(500).json({ message: "Failed to add staff record", error });
  }
};

// Update an existing staff record
export const updateRecord = async (req, res) => {
  try {
    const { id } = req.params; // Using the Staff ID (like STF001) as param
    const updateData = req.body;

    // Prevent ID modification if needed, or normalize ID if it is part of body
    if (updateData.id) {
       updateData.id = updateData.id.toString().trim().toUpperCase();
    }

    const cleanId = id.toString().trim().toUpperCase();

    const record = await StaffRecord.findOneAndUpdate(
      { id: cleanId },
      { $set: updateData },
      { new: true }
    );

    if (!record) return res.status(404).json({ message: "Record not found" });

    // 🔥 Sync all relevant fields to StaffUser and User so Manage Staff and Export Records update immediately
    const syncFields = {};
    if (updateData.fullName) syncFields.fullName = updateData.fullName.trim();
    if (updateData.name) syncFields.fullName = updateData.name.trim();
    if (updateData.email) syncFields.email = updateData.email.toLowerCase().trim();
    if (updateData.phone) syncFields.phone = updateData.phone.trim();
    if (updateData.staffType) syncFields.staffType = updateData.staffType;

    // Check if target user is currently an admin to avoid demoting them to staff on verification record update
    const existingUser = await User.findOne({ id: cleanId });
    const isAlreadyAdmin = existingUser && (existingUser.isDeptAdmin || existingUser.isMasterAdmin || existingUser.role === "admin");

    if (updateData.role && !isAlreadyAdmin) {
      syncFields.role = updateData.role.toLowerCase().trim();
    } else if (isAlreadyAdmin) {
      syncFields.role = existingUser.role || "admin";
    }

    if (Object.keys(syncFields).length > 0 || updateData.department) {
      const staffUserUpdate = { ...syncFields };
      if (updateData.department) staffUserUpdate.staffDepartment = updateData.department.trim();
      await StaffUser.findOneAndUpdate(
        { id: cleanId },
        { $set: staffUserUpdate }
      );

      const userUpdate = { ...syncFields };
      if (updateData.department) userUpdate.department = updateData.department.trim();
      await User.findOneAndUpdate(
        { id: cleanId },
        { $set: userUpdate }
      );
      console.log(`🔄 Synced updated staff details for ID ${cleanId} to StaffUser and User.`);
    }

    res.json({ message: "Record updated successfully", record });
  } catch (error) {
    console.error("Update Record Error:", error);
    res.status(500).json({ message: "Failed to update record", error });
  }
};

// Delete a staff record
export const deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await StaffRecord.findOneAndDelete({ id: id.toString().trim().toUpperCase() });
    
    if (!record) return res.status(404).json({ message: "Record not found" });
    res.json({ message: "Record deleted successfully" });
  } catch (error) {
    console.error("Delete Record Error:", error);
    res.status(500).json({ message: "Failed to delete record", error });
  }
};

// Upload Excel -> returns jobId instantly, processes in background
export const uploadStaffRecords = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const mode = (req.body.mode || "add").toLowerCase().trim(); // "add" | "remove" | "change"
    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);

    // ✅ Multi-Tab Extraction: iterate over ALL sheets in workbook
    let allRows = [];
    const sheetSummaries = [];
    const sheetNames = workbook.SheetNames || [];

    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      // 🔥 Expand merged cells so values (like Department) are propagated to all merged rows
      fillMergedCells(sheet);

      // Detect sheet category: "Faculty" / "Teach" -> Teaching, "Admin" / "Non-Teach" / "Staff" -> Non-Teaching
      const sName = sheetName.toLowerCase().trim();
      let defaultStaffType = "";
      if (sName.includes("faculty") || sName.includes("teach") || sName.includes("academic") || sName.includes("prof")) {
        defaultStaffType = "Teaching";
      } else if (sName.includes("admin") || sName.includes("non-teach") || sName.includes("non teach") || sName.includes("staff")) {
        defaultStaffType = "Non-Teaching";
      }

      const sheetRows = xlsx.utils.sheet_to_json(sheet, { defval: "" });
      if (sheetRows && sheetRows.length > 0) {
        // Tag each row with detected sheet category
        const taggedRows = sheetRows.map(row => ({
          ...row,
          _sheetName: sheetName,
          _sheetStaffType: defaultStaffType
        }));
        sheetSummaries.push({ 
          name: sheetName, 
          rowCount: sheetRows.length,
          category: defaultStaffType || "General"
        });
        allRows.push(...taggedRows);
      }
    }

    try { fs.unlinkSync(filePath); } catch (_) {}

    if (!allRows || allRows.length === 0)
      return res.status(400).json({ message: "Excel file has no records across any sheets/tabs" });

    const detectedHeaders = allRows[0] ? Object.keys(allRows[0]) : [];
    console.log(`📊 Multi-Sheet Excel: ${sheetNames.length} tabs found (${sheetNames.join(", ")}). Total rows: ${allRows.length}. Mode: ${mode}`);

    const jobId = `job_${Date.now()}`;
    uploadJobs.set(jobId, {
      status: "processing",
      mode,
      total: allRows.length,
      processed: 0,
      inserted: 0,
      skipped: 0,
      deleted: 0,
      sheetCount: sheetNames.length,
      sheetNames,
      sheetSummaries,
      errors: [],
      detectedHeaders,
      startedAt: Date.now(),
    });

    res.json({
      jobId,
      total: allRows.length,
      sheetCount: sheetNames.length,
      sheetNames,
      mode,
      message: `Upload started in '${mode}' mode across ${sheetNames.length} sheet tab(s)`
    });

    setImmediate(() => processUpload(jobId, allRows, mode));
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ message: "Failed to process Excel file", error: error.message });
  }
};

// GET progress for a specific upload job
export const getUploadProgress = (req, res) => {
  const { jobId } = req.params;
  const job = uploadJobs.get(jobId);
  if (!job) return res.status(404).json({ message: "Job not found" });
  res.json(job);
};

// Clear ALL staff records
export const clearAllStaffRecords = async (req, res) => {
  try {
    const result = await StaffRecord.deleteMany({});
    res.json({ message: `✅ Cleared ${result.deletedCount} staff records.`, deleted: result.deletedCount });
  } catch (error) {
    res.status(500).json({ message: "Failed to clear records", error: error.message });
  }
};
