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
import { optionalVerifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Comparison route (records vs registered)
router.get("/compare", getRecordsComparison);

// Student routes
router.get("/students", getLiveStudents);
router.put("/students/:id", optionalVerifyToken, updateLiveStudent);
router.delete("/students/:id", optionalVerifyToken, deleteLiveStudent);

// Staff / Faculty routes
router.get("/staff", optionalVerifyToken, getLiveStaff);
router.put("/staff/:id", optionalVerifyToken, updateLiveStaff);
router.delete("/staff/:id", optionalVerifyToken, deleteLiveStaff);

export default router;
