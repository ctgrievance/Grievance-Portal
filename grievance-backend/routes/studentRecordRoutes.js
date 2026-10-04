import express from "express";
import multer from "multer";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import fs from "fs";
import { verifyToken } from "../middleware/verifyToken.js";
import {
  getAllStudentRecords,
  uploadStudentRecords,
  addStudentRecord,
  deleteStudentRecord,
  clearAllStudentRecords,
  getUploadProgress,
  updateStudentRecord,
} from "../controllers/studentRecordController.js";

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

// GET /api/student-records  — list with pagination + search
router.get("/", verifyToken, getAllStudentRecords);

// POST /api/student-records/upload  — Excel bulk upload (returns jobId instantly)
router.post("/upload", verifyToken, upload.single("file"), uploadStudentRecords);

// GET /api/student-records/progress/:jobId  — real-time progress polling (unrestricted by jobId)
router.get("/progress/:jobId", getUploadProgress);

// POST /api/student-records  — add single record
router.post("/", verifyToken, addStudentRecord);

// DELETE /api/student-records/clear-all — wipe ALL records (must be BEFORE /:id)
router.delete("/clear-all", verifyToken, clearAllStudentRecords);

// DELETE /api/student-records/:id
router.delete("/:id", verifyToken, deleteStudentRecord);

// PUT /api/student-records/:id  — update single record
router.put("/:id", verifyToken, updateStudentRecord);

export default router;
