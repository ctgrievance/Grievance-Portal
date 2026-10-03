const fs = require('fs');

// Patch staffRecordRoutes.js
let routeData = fs.readFileSync('routes/staffRecordRoutes.js', 'utf8');

routeData = routeData.replace(/router\.get\("\/", getAllStaffRecords\);/g, 'router.get("/", verifyToken, getAllStaffRecords);');
routeData = routeData.replace(/router\.post\("\/upload", upload.single\("file"\), uploadStaffRecords\);/g, 'router.post("/upload", verifyToken, upload.single("file"), uploadStaffRecords);');
routeData = routeData.replace(/router\.get\("\/progress\/:jobId", getUploadProgress\);/g, 'router.get("/progress/:jobId", verifyToken, getUploadProgress);');
routeData = routeData.replace(/router\.post\("\/", addStaffRecord\);/g, 'router.post("/", verifyToken, addStaffRecord);');
routeData = routeData.replace(/router\.delete\("\/clear-all", clearAllStaffRecords\);/g, 'router.delete("/clear-all", verifyToken, clearAllStaffRecords);');
routeData = routeData.replace(/router\.delete\("\/:id", deleteStaffRecord\);/g, 'router.delete("/:id", verifyToken, deleteStaffRecord);');
routeData = routeData.replace(/router\.put\("\/:id", updateStaffRecord\);/g, 'router.put("/:id", verifyToken, updateStaffRecord);');

if (!routeData.includes('import { verifyToken }')) {
  routeData = routeData.replace(/import {\s*getAllStaffRecords/g, 'import { verifyToken } from "../middleware/verifyToken.js";\nimport {\n  getAllStaffRecords');
}

fs.writeFileSync('routes/staffRecordRoutes.js', routeData);
console.log("Patched staffRecordRoutes.js");

// Patch staffRecordController.js
let controllerData = fs.readFileSync('controllers/staffRecordController.js', 'utf8');

if (!controllerData.includes('logAuditAction')) {
  controllerData = controllerData.replace('import fs from "fs";', 'import fs from "fs";\nimport { logAuditAction } from "../utils/AuditService.js";');

  // Patch processUpload signature
  controllerData = controllerData.replace('const processUpload = async (jobId, rows, mode = "add") => {', 'const processUpload = async (jobId, rows, mode = "add", reqUser = null) => {');

  // Log in processUpload at the very end
  controllerData = controllerData.replace(/job\.status = "completed";\n\s*uploadJobs\.set\(jobId, job\);\n\s*\} catch \(err\) \{/g, 'job.status = "completed";\n    uploadJobs.set(jobId, job);\n    if(reqUser) { await logAuditAction("UPLOAD", "StaffRecord", reqUser, { mode, totalRows: rows.length, success: job.success, errors: job.errors.length }); }\n  } catch (err) {');

  // Pass req.user to processUpload
  controllerData = controllerData.replace(/processUpload\(jobId, allRows, mode\);/g, 'processUpload(jobId, allRows, mode, req.user);');

  // Log ADD
  controllerData = controllerData.replace(/res\.status\(201\)\.json\(\{ message: "Record added successfully", record \}\);/g, 'await logAuditAction("ADD", "StaffRecord", req.user, { recordId: id.trim().toUpperCase(), fullName });\n    res.status(201).json({ message: "Record added successfully", record });');

  // Log UPDATE
  controllerData = controllerData.replace(/res\.status\(200\)\.json\(\{ message: "Record updated", record \}\);/g, 'await logAuditAction("UPDATE", "StaffRecord", req.user, { recordId: cleanId });\n    res.status(200).json({ message: "Record updated", record });');

  // Log DELETE
  controllerData = controllerData.replace(/res\.status\(200\)\.json\(\{ message: "Record deleted" \}\);/g, 'await logAuditAction("DELETE", "StaffRecord", req.user, { recordId: id.trim().toUpperCase() });\n    res.status(200).json({ message: "Record deleted" });');

  // Log CLEAR_ALL
  controllerData = controllerData.replace(/res\.status\(200\)\.json\(\{ message: `Cleared \$\{result\.deletedCount\} staff records\.` \}\);/g, 'await logAuditAction("CLEAR_ALL", "StaffRecord", req.user, { deletedCount: result.deletedCount });\n    res.status(200).json({ message: `Cleared ${result.deletedCount} staff records.` });');

  fs.writeFileSync('controllers/staffRecordController.js', controllerData);
  console.log("Patched staffRecordController.js");
} else {
  console.log("Already patched controller");
}
