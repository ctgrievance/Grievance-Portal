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
// ─────────────────────────────────────────────────────────────────────────

// ─── Background processor (batch insertMany) ─────────────────────────────
const processUpload = async (jobId, rows) => {
  const job = uploadJobs.get(jobId);
  const BATCH = 200; // rows per batch

  try {
    let inserted = 0;
    let skipped = 0;
    let errors = [];
    let skippedRows = [];

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const docs = [];

      for (const row of batch) {
        let id = findField(row, "ID", "Staff ID", "StaffID", "Emp ID", "Employee ID", "EmpID").toUpperCase();

        if (!id) {
          skipped++;
          skippedRows.push(row);
          continue;
        }

        let roleRaw = findField(row, "Role", "Type", "Staff Type");
        let role = roleRaw ? roleRaw.toLowerCase() : "staff";
        if (role !== "admin") role = "staff";

        docs.push({
          id,
          fullName: findField(row, "Name", "Full Name", "FullName", "Staff Name", "Employee Name"),
          email: findField(row, "Email", "Email ID", "EmailID", "E-mail", "email", "Mail").toLowerCase(),
          phone: findField(row, "Phone number", "Phone Number", "PhoneNumber", "Phone No", "Mobile", "Contact", "Contact No"),
          department: findField(row, "Department", "Dept", "Faculty", "School"),
          role: role,
        });
      }

      if (docs.length === 0) {
        job.processed += batch.length;
        uploadJobs.set(jobId, job);
        continue;
      }

      try {
        const ops = docs.map((doc) => ({
          updateOne: {
            filter: { id: doc.id },
            update: { $set: doc },
            upsert: true,
          },
        }));
        const result = await StaffRecord.bulkWrite(ops, { ordered: false });
        inserted += (result.upsertedCount || 0) + (result.modifiedCount || 0);

        // 🔥 Sync updated name/contact details to registered accounts while strictly protecting Admin roles
        for (const doc of docs) {
          try {
            const existingUser = await User.findOne({ id: doc.id });
            if (existingUser) {
              const syncUpdate = {};
              if (doc.fullName) syncUpdate.fullName = doc.fullName;
              if (doc.email) syncUpdate.email = doc.email;
              if (doc.phone) syncUpdate.phone = doc.phone;

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
    
    // Build search query for id, name, email, phone, department
    const query = {};
    if (search) {
      query.$or = [
        { id: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } }
      ];
    }

    const total = await StaffRecord.countDocuments(query);
    const records = await StaffRecord.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      total,
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
    const { id, fullName, email, phone, role, department } = req.body;
    
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
      department
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

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: "" });

    try { fs.unlinkSync(filePath); } catch (_) {}

    if (!rows || rows.length === 0)
      return res.status(400).json({ message: "Excel sheet is empty or invalid" });

    const detectedHeaders = rows[0] ? Object.keys(rows[0]) : [];

    const jobId = `job_${Date.now()}`;
    uploadJobs.set(jobId, {
      status: "processing",
      total: rows.length,
      processed: 0,
      inserted: 0,
      skipped: 0,
      errors: [],
      detectedHeaders,
      startedAt: Date.now(),
    });

    res.json({ jobId, total: rows.length, message: "Upload started" });

    setImmediate(() => processUpload(jobId, rows));
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
