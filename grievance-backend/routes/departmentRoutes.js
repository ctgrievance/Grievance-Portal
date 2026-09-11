import express from "express";
import {
  getActiveDepartments,
  getAllDepartmentsAdmin,
  createDepartment,
  updateDepartment,
  toggleDepartmentStatus,
  deleteDepartment,
  getDepartmentPermissions
} from "../controllers/departmentController.js";

const router = express.Router();

// Public / Form endpoints (Active departments)
router.get("/", getActiveDepartments);
router.get("/permissions/:name", getDepartmentPermissions);

// Admin endpoints
router.get("/all", getAllDepartmentsAdmin);
router.post("/", createDepartment);
router.put("/:id", updateDepartment);
router.patch("/:id/toggle", toggleDepartmentStatus);
router.delete("/:id", deleteDepartment);

export default router;
