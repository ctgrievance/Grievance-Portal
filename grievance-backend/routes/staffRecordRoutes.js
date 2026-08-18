import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import {
  getAllRecords,
  addRecord,
  updateRecord,
  deleteRecord,
  uploadStaffRecords,
  getUploadProgress,
  clearAllStaffRecords
} from "../controllers/staffRecordController.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Temp storage for uploaded Excel files
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, "../uploads/temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}_${file.originalname}`);
  },
});

const upload = multer({
  storage: tempStorage,
  fileFilter: (req, file, cb) => {
    const allowed = [".xlsx", ".xls"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Only .xlsx and .xls files are allowed"));
    }
  },
});

// GET /api/staff-records

router.get("/", getAllRecords);

// POST /api/staff-records
router.post("/", addRecord);

// PUT /api/staff-records/:id
router.put("/:id", updateRecord);

// POST /api/staff-records/upload  — Excel bulk upload
router.post("/upload", upload.single("file"), uploadStaffRecords);

// GET /api/staff-records/progress/:jobId  — real-time progress polling
router.get("/progress/:jobId", getUploadProgress);

// DELETE /api/staff-records/clear-all — wipe ALL records (must be BEFORE /:id)
router.delete("/clear-all", clearAllStaffRecords);

// DELETE /api/staff-records/:id
router.delete("/:id", deleteRecord);

export default router;
