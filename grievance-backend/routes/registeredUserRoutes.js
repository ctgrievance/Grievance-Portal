import express from "express";
import {
  getLiveStudents,
  updateLiveStudent,
  deleteLiveStudent,
  getLiveStaff,
  updateLiveStaff,
  deleteLiveStaff,
  getRecordsComparison
} from "../controllers/registeredUserController.js";

const router = express.Router();

// Comparison route (records vs registered)
router.get("/compare", getRecordsComparison);

// Student routes
router.get("/students", getLiveStudents);
router.put("/students/:id", updateLiveStudent);
router.delete("/students/:id", deleteLiveStudent);

// Staff / Faculty routes
router.get("/staff", getLiveStaff);
router.put("/staff/:id", updateLiveStaff);
router.delete("/staff/:id", deleteLiveStaff);

export default router;
