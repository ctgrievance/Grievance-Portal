import express from "express";
import multer from "multer";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import fs from "fs";
import { verifyToken } from "../middleware/verifyToken.js";
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

// Temp storage for uploaded Excel files (safe for local & serverless like Vercel/AWS Lambda)
const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(os.tmpdir(), "uploads_temp");
    if (!fs.existsSync(tempDir)) {
      try {
        fs.mkdirSync(tempDir, { recursive: true });
      } catch (err) {
        return cb(err);
      }
    }
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
router.get("/", verifyToken, getAllRecords);

// POST /api/staff-records
router.post("/", verifyToken, addRecord);

// PUT /api/staff-records/:id
router.put("/:id", verifyToken, updateRecord);

// POST /api/staff-records/upload  — Excel bulk upload
router.post("/upload", verifyToken, upload.single("file"), uploadStaffRecords);

// GET /api/staff-records/progress/:jobId  — real-time progress polling (unrestricted by jobId)
router.get("/progress/:jobId", getUploadProgress);

// DELETE /api/staff-records/clear-all — wipe ALL records (must be BEFORE /:id)
router.delete("/clear-all", verifyToken, clearAllStaffRecords);

// DELETE /api/staff-records/:id
router.delete("/:id", verifyToken, deleteRecord);

export default router;
