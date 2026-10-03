const fs = require('fs');

let data = fs.readFileSync('server.js', 'utf8');

if (!data.includes('auditRoutes')) {
  data = data.replace('import studentRecordRoutes from "./routes/studentRecordRoutes.js";', 'import studentRecordRoutes from "./routes/studentRecordRoutes.js";\nimport auditRoutes from "./routes/auditRoutes.js";');
  
  data = data.replace('app.use("/api/system", systemRoutes);', 'app.use("/api/system", systemRoutes);\napp.use("/api/audit-logs", auditRoutes);');
  
  fs.writeFileSync('server.js', data);
  console.log("server.js patched");
}
