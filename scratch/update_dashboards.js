const fs = require('fs');
const files = fs.readdirSync('.').filter(f => f.endsWith('AdminDashboard.jsx'));

files.forEach(file => {
  if (file === 'SchoolAdminDashboard.jsx') return;
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/useDepartmentPermissions\(["'][^"']+["']\)/, 'useDepartmentPermissions(adminDept)');
  fs.writeFileSync(file, content);
});
