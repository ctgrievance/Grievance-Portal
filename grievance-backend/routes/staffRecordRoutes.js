import express from "express";
import {
  getAllRecords,
  addRecord,
  updateRecord,
  deleteRecord
} from "../controllers/staffRecordController.js";

const router = express.Router();

// GET /api/staff-records
router.get("/", getAllRecords);

// POST /api/staff-records
router.post("/", addRecord);

// PUT /api/staff-records/:id
router.put("/:id", updateRecord);

// DELETE /api/staff-records/:id
router.delete("/:id", deleteRecord);

export default router;
