const fs = require('fs');

let data = fs.readFileSync('routes/studentRecordRoutes.js', 'utf8');

data = data.replace(/router\.get\("\/", getAllStudentRecords\);/g, 'router.get("/", verifyToken, getAllStudentRecords);');
data = data.replace(/router\.post\("\/upload", upload.single\("file"\), uploadStudentRecords\);/g, 'router.post("/upload", verifyToken, upload.single("file"), uploadStudentRecords);');
data = data.replace(/router\.get\("\/progress\/:jobId", getUploadProgress\);/g, 'router.get("/progress/:jobId", verifyToken, getUploadProgress);');
data = data.replace(/router\.post\("\/", addStudentRecord\);/g, 'router.post("/", verifyToken, addStudentRecord);');
data = data.replace(/router\.delete\("\/clear-all", clearAllStudentRecords\);/g, 'router.delete("/clear-all", verifyToken, clearAllStudentRecords);');
data = data.replace(/router\.delete\("\/:id", deleteStudentRecord\);/g, 'router.delete("/:id", verifyToken, deleteStudentRecord);');
data = data.replace(/router\.put\("\/:id", updateStudentRecord\);/g, 'router.put("/:id", verifyToken, updateStudentRecord);');

if (!data.includes('import { verifyToken }')) {
  data = data.replace(/import {\s*getAllStudentRecords/g, 'import { verifyToken } from "../middleware/verifyToken.js";\nimport {\n  getAllStudentRecords');
}

fs.writeFileSync('routes/studentRecordRoutes.js', data);
