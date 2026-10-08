console.log("✅ grievanceRoutes loaded");

import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import Grievance from "../models/GrievanceModel.js";

import {
  submitGrievance,
  checkSubmissionLimit,
  getAllGrievances,
  getCategoryGrievances,
  getGrievancesByStudentSchool,
  getUserGrievances,
  assignToStaff,
  getAssignedGrievances,
  getStaffRatingsSummary,
  updateGrievanceStatus,
  requestExtension,
  resolveExtension,
  verifyResolution,
  hideGrievance,
  getPoolAcceptGrievances,
  acceptGrievance,
  getGrievanceDetail,
  transferGrievance,
  getStaffTransferHistory,
  getDepartmentTransferHistory,
  rejectGrievanceByStaff,
  clearAllGrievances
} from "../controllers/grievanceController.js";

const router = express.Router();

/* ================= CLEAR ALL (ADMIN / DEV) ================= */
router.delete("/clear-all", clearAllGrievances);

/* ================= STUDENT ================= */

// ✅ Student submits grievance
router.post("/submit", submitGrievance);

// ⏱️ Check 24-hour grievance submission limit
router.get("/submission-limit/:userId", checkSubmissionLimit);

// ✅ Student grievance history
router.get("/user/:userId", getUserGrievances); // Reuse for user grievances

/* ================= MASTER ADMIN ================= */

router.get("/all", getAllGrievances);

/* ================= CATEGORY ADMIN ================= */

router.get("/category/:category", getCategoryGrievances);
router.get("/department/:department", getCategoryGrievances); // Reuse for department grievances
router.get("/by-student-school/:school", getGrievancesByStudentSchool); // All grievances submitted by students of this school
router.put("/assign/:id", assignToStaff);

/* ================= STAFF ================= */

router.get("/assigned/:staffId", getAssignedGrievances);
router.get("/staff-rating/:staffId", getStaffRatingsSummary);

/* ================= UPDATE (STAFF / ADMIN) ================= */

router.put("/update/:id", updateGrievanceStatus);
router.put("/reject/:id", rejectGrievanceByStaff);

/* ================= EXTENSION ================= */

router.post("/extension/request/:id", requestExtension);
router.post("/extension/resolve/:id", resolveExtension);
router.put("/extension/resolve/:id", resolveExtension);

/* ================= 🔁 RE-ROUTING & TRANSFER ================= */

router.post("/transfer/:id", transferGrievance);
router.get("/staff-transfers/:staffId", getStaffTransferHistory);
router.get("/department-transfers/:department", getDepartmentTransferHistory);

/* ================= ⭐ RATING ================= */

router.post("/rate/:id", verifyToken, async (req, res) => {
  try {
    const { stars, feedback } = req.body;
    const grievanceId = req.params.id;

    if (!stars || stars < 1 || stars > 5) {
      return res.status(400).json({ message: "⭐ Mandatory star rating: Please select between 1 to 5 stars." });
    }

    if (stars < 3 && (!feedback || !feedback.trim())) {
      return res.status(400).json({ message: "Feedback is mandatory for ratings below 3 stars" });
    }

    const grievance = await Grievance.findById(grievanceId);
    if (!grievance) {
      return res.status(404).json({ message: "Grievance not found" });
    }

    // ✅ Only grievance owner
    if (grievance.userId.toUpperCase() !== req.user.id.toUpperCase()) {
      return res.status(403).json({ message: "You cannot rate this grievance" });
    }

    // ✅ Only resolved
    if (grievance.status !== "Resolved") {
      return res.status(400).json({ message: "Grievance not resolved yet" });
    }

    // ✅ Prevent re-rating
    if (grievance.isRated) {
      return res.status(400).json({ message: "Already rated" });
    }

    grievance.rating = {
      stars,
      feedback,
      ratedAt: new Date()
    };
    grievance.isRated = true;

    await grievance.save();
    res.json({ message: "✅ Rating submitted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Rating failed" });
  }
});

/* ================= ✅ VERIFICATION (FINAL & SAFE) ================= */

router.post("/verify-resolution/:id", verifyResolution);

/* ================= 🆕 POOL ACCEPT MODE ================= */

router.get("/pool-accept", getPoolAcceptGrievances);
router.post("/accept/:grievanceId", acceptGrievance);

/* ================= GRIEVANCE DETAIL ================= */

router.get("/detail/:grievanceId", getGrievanceDetail);

export default router;
