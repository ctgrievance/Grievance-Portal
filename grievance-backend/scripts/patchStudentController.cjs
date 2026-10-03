const fs = require('fs');

let data = fs.readFileSync('controllers/studentRecordController.js', 'utf8');

if (!data.includes('logAuditAction')) {
  data = data.replace('import fs from "fs";', 'import fs from "fs";\nimport { logAuditAction } from "../utils/AuditService.js";');

  // Patch processUpload signature
  data = data.replace('const processUpload = async (jobId, rows, mode = "add") => {', 'const processUpload = async (jobId, rows, mode = "add", reqUser = null) => {');

  // Log in processUpload at the very end
  data = data.replace(/job\.status = "completed";\n\s*uploadJobs\.set\(jobId, job\);\n\s*\} catch \(err\) \{/g, 'job.status = "completed";\n    uploadJobs.set(jobId, job);\n    if(reqUser) { await logAuditAction("UPLOAD", "StudentRecord", reqUser, { mode, totalRows: rows.length, success: job.success, errors: job.errors.length }); }\n  } catch (err) {');

  // Pass req.user to processUpload
  data = data.replace(/processUpload\(jobId, allRows, mode\);/g, 'processUpload(jobId, allRows, mode, req.user);');

  // Log ADD
  data = data.replace(/res\.status\(201\)\.json\(\{ message: "Record added successfully", record \}\);/g, 'await logAuditAction("ADD", "StudentRecord", req.user, { recordId: id.trim().toUpperCase(), fullName });\n    res.status(201).json({ message: "Record added successfully", record });');

  // Log UPDATE
  data = data.replace(/res\.status\(200\)\.json\(\{ message: "Record updated", record \}\);/g, 'await logAuditAction("UPDATE", "StudentRecord", req.user, { recordId: cleanId });\n    res.status(200).json({ message: "Record updated", record });');

  // Log DELETE
  data = data.replace(/res\.status\(200\)\.json\(\{ message: "Record deleted" \}\);/g, 'await logAuditAction("DELETE", "StudentRecord", req.user, { recordId: id.trim().toUpperCase() });\n    res.status(200).json({ message: "Record deleted" });');

  // Log CLEAR_ALL
  data = data.replace(/res\.status\(200\)\.json\(\{ message: `Cleared \$\{result\.deletedCount\} student records\.` \}\);/g, 'await logAuditAction("CLEAR_ALL", "StudentRecord", req.user, { deletedCount: result.deletedCount });\n    res.status(200).json({ message: `Cleared ${result.deletedCount} student records.` });');

  fs.writeFileSync('controllers/studentRecordController.js', data);
  console.log("Patched successfully!");
} else {
  console.log("Already patched.");
}
