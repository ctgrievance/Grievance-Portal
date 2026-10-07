import express from "express";
import ExcelJS from "exceljs";
import Grievance from "../models/GrievanceModel.js";

const router = express.Router();

/**
 * Returns pastel badge styling for status values (Green / Yellow / Red)
 */
function getStatusBadgeStyle(rawVal) {
  if (rawVal === null || rawVal === undefined) return null;
  const str = String(rawVal).trim().toLowerCase();

  // 1. Success / Green pastel badge
  if (
    str === "verified" ||
    str === "resolved" ||
    str === "active" ||
    str === "approved" ||
    str === "registered" ||
    str === "completed" ||
    str === "success" ||
    str === "yes" ||
    str === "true" ||
    str.includes("resolved") ||
    str.includes("verified") ||
    str === "5/5 stars" ||
    str === "4/5 stars"
  ) {
    return {
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } }, // pastel emerald-100
      font: { name: "Calibri", size: 10, bold: true, color: { argb: "FF166534" } }, // emerald-800
      border: {
        top: { style: "thin", color: { argb: "FF86EFAC" } },
        bottom: { style: "thin", color: { argb: "FF86EFAC" } },
        left: { style: "thin", color: { argb: "FF86EFAC" } },
        right: { style: "thin", color: { argb: "FF86EFAC" } },
      },
    };
  }

  // 2. Warning / Amber pastel badge
  if (
    str === "pending" ||
    str.includes("pending") ||
    str === "in progress" ||
    str === "in-progress" ||
    str === "assigned" ||
    str === "under review" ||
    str === "awaiting" ||
    str === "open" ||
    str === "processing" ||
    str.includes("progress")
  ) {
    return {
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }, // pastel amber-100
      font: { name: "Calibri", size: 10, bold: true, color: { argb: "FF92400E" } }, // amber-800
      border: {
        top: { style: "thin", color: { argb: "FFFDE68A" } },
        bottom: { style: "thin", color: { argb: "FFFDE68A" } },
        left: { style: "thin", color: { argb: "FFFDE68A" } },
        right: { style: "thin", color: { argb: "FFFDE68A" } },
      },
    };
  }

  // 3. Danger / Red pastel badge
  if (
    str === "rejected" ||
    str === "not registered" ||
    str === "incomplete" ||
    str === "unverified" ||
    str === "failed" ||
    str === "cancelled" ||
    str === "inactive" ||
    str === "closed unresolved" ||
    str === "false" ||
    str === "no" ||
    str.includes("rejected") ||
    str.includes("not registered")
  ) {
    return {
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } }, // pastel red-100
      font: { name: "Calibri", size: 10, bold: true, color: { argb: "FF991B1B" } }, // red-800
      border: {
        top: { style: "thin", color: { argb: "FFFCA5A5" } },
        bottom: { style: "thin", color: { argb: "FFFCA5A5" } },
        left: { style: "thin", color: { argb: "FFFCA5A5" } },
        right: { style: "thin", color: { argb: "FFFCA5A5" } },
      },
    };
  }

  return null;
}

/**
 * Extracts department or school name from a record using direct keys and column headers.
 */
function getRecordDepartment(rec, columns = []) {
  if (!rec || typeof rec !== "object") return "General";

  // 1. Direct department/school keys across all portal schemas
  const directKeys = [
    "School",
    "school",
    "Department",
    "department",
    "category",
    "Category",
    "School / Program",
    "Department / School",
  ];
  for (const k of directKeys) {
    const val = rec[k];
    if (val && typeof val === "string" && val.trim() && !["—", "N/A", "null", "undefined", "-"].includes(val.trim())) {
      return val.trim();
    }
  }

  // 2. Inspect column definitions for department/school keys
  for (const col of columns) {
    const colKey = typeof col === "string" ? col : (col.key || col.label || "");
    const colHeader = typeof col === "string" ? col : (col.label || col.key || "");
    if (/school|dept|department|category/i.test(colKey) || /school|dept|department|category/i.test(colHeader)) {
      let val = rec[colKey];
      if (val === undefined && colHeader) val = rec[colHeader];
      if (val && typeof val === "string" && val.trim() && !["—", "N/A", "null", "undefined", "-"].includes(val.trim())) {
        return val.trim();
      }
    }
  }

  return "General";
}

/**
 * Normalizes raw department/school strings to canonical display names
 * and safe, concise Excel sheet tab names (<= 31 characters).
 */
function normalizeDepartment(raw) {
  if (!raw || typeof raw !== "string") {
    return { fullName: "General", tabName: "General" };
  }
  let s = raw.trim();
  if (!s || s === "—" || s === "-" || /^\d+$/.test(s) || ["xyz", "n/a", "null", "undefined", "<blank>"].includes(s.toLowerCase())) {
    return { fullName: "General", tabName: "General" };
  }

  // Strip trailing ERP department numbers like "- 10", "- 30", "- 70"
  s = s.replace(/\s*-\s*\d+\s*$/, "").trim();
  const lower = s.toLowerCase().replace(/\s*&\s*/g, " and ").replace(/\s+/g, " ").trim();

  // Canonical mappings for university schools & faculties
  if (lower.includes("allied") && lower.includes("health")) {
    return {
      fullName: "School of Allied Health Sciences",
      tabName: "School of Allied Health Sci"
    };
  }
  if (lower.includes("healthcare") || (lower.includes("health") && lower.includes("paramedical"))) {
    return {
      fullName: "School of Healthcare & Paramedical Sciences",
      tabName: "School of Healthcare & Para"
    };
  }
  if (lower.includes("health science")) {
    return {
      fullName: "School of Health Sciences",
      tabName: "School of Health Sciences"
    };
  }
  if (lower.includes("optometry")) {
    return {
      fullName: "School of Optometry",
      tabName: "School of Optometry"
    };
  }
  if (lower.includes("pharmaceutic") || lower.includes("pharmacy")) {
    return {
      fullName: "School of Pharmaceutical Sciences",
      tabName: "School of Pharmaceutical Sci"
    };
  }
  if (lower.includes("computer application") || lower.includes("information technology") || lower.includes("cait")) {
    return {
      fullName: "School of Computer Applications & IT",
      tabName: "Computer Applications & IT"
    };
  }
  if (lower.includes("engineering")) {
    return {
      fullName: "School of Engineering and Technology",
      tabName: "School of Engineering & Tech"
    };
  }
  if (lower.includes("hotel") && lower.includes("design")) {
    return {
      fullName: "School of Management, Hotel Management & Design",
      tabName: "Mgmt, Hotel Mgmt & Design"
    };
  }
  if (lower.includes("airline") || lower.includes("tourism") || lower.includes("hotel")) {
    return {
      fullName: "School of Hotel Management, Airlines & Tourism",
      tabName: "Hotel Mgmt, Airlines & Tourism"
    };
  }
  if (lower.includes("management")) {
    return {
      fullName: "School of Management Studies",
      tabName: "School of Management Studies"
    };
  }
  if (lower.includes("design") || lower.includes("innovation")) {
    return {
      fullName: "School of Design and Innovation",
      tabName: "School of Design & Innovation"
    };
  }
  if (lower.includes("social science") || lower.includes("liberal art")) {
    return {
      fullName: "School of Social Sciences and Liberal Arts",
      tabName: "Social Sciences & Liberal Arts"
    };
  }
  if (lower.includes("agriculture") || lower.includes("natural science")) {
    return {
      fullName: "School of Agriculture and Natural Sciences",
      tabName: "Agriculture & Natural Sciences"
    };
  }
  if (lower.includes("humanities") || lower.includes("physical education")) {
    return {
      fullName: "School of Humanities and Physical Education",
      tabName: "Humanities & Physical Ed"
    };
  }
  if (lower.includes("law")) {
    return {
      fullName: "School of Law",
      tabName: "School of Law"
    };
  }

  // Fallback: Title case if all uppercase or lowercase
  let title = s;
  if (s === s.toUpperCase() || s === s.toLowerCase()) {
    title = s.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
  }

  const tab = title.length > 31 ? title.substring(0, 31).trim() : title;
  return { fullName: title, tabName: tab };
}

/**
 * Sanitizes Excel worksheet name according to Excel specifications:
 * - Max length: 31 characters
 * - Forbidden characters: * ? : / \ [ ]
 * - Must be unique within the workbook
 */
function sanitizeSheetName(rawName, existingNames = new Set()) {
  let clean = String(rawName || "Sheet")
    .replace(/[*?:/\\\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) clean = "Department";

  let base = clean.substring(0, 31).trim().replace(/[-_\s]+$/, "").trim();
  if (!base) base = clean.substring(0, 31).trim();
  if (!base) base = "Department";

  let candidate = base;
  let counter = 2;
  while (existingNames.has(candidate.toLowerCase())) {
    const suffix = ` (${counter})`;
    const maxLen = 31 - suffix.length;
    const trimmedBase = base.substring(0, maxLen).trim().replace(/[-_\s]+$/, "").trim() || "Dept";
    candidate = `${trimmedBase}${suffix}`;
    counter++;
  }

  existingNames.add(candidate.toLowerCase());
  return candidate;
}

/**
 * Applies corporate dashboard styling to a worksheet:
 * 1. Deep Navy Blue merged title banner & subtitle
 * 2. Bold white table headers with auto-filter enabled
 * 3. Alternate rows zebra striping (white & soft-gray #F8FAFC)
 * 4. Status column soft pastel badge colors (green/yellow/red)
 * 5. Dynamic calculated column widths so text is never cut off
 */
function populateWorksheet(sheet, {
  title = "DATA EXPORT REPORT",
  subtitle,
  columns = [],
  records = [],
}) {
  // 5. PROPER COLUMN WIDTHS: Normalize column metadata and calculate widths based on content
  const formattedColumns = columns.map((col) => {
    const colKey = typeof col === "string" ? col : (col.key || col.label);
    const colHeader = typeof col === "string" ? col : (col.label || col.key);

    const isLongTextCol =
      /message|description|details|address|remarks/i.test(colKey) ||
      /message|description|details|remarks/i.test(colHeader);

    let maxContentLen = (colHeader || "").length;
    records.forEach((rec) => {
      let val = rec[colKey];
      if (val === undefined && colHeader) val = rec[colHeader];
      if (val !== null && val !== undefined) {
        const strVal = String(val);
        const lines = strVal.split("\n");
        lines.forEach((l) => {
          if (l.length > maxContentLen) maxContentLen = l.length;
        });
      }
    });

    const calculatedWidth = Math.max(maxContentLen + 4, 15);
    const finalWidth = isLongTextCol
      ? Math.min(calculatedWidth, 48)
      : Math.min(calculatedWidth, 38);

    const userWidth = typeof col === "object" && col.width ? col.width : null;

    return {
      header: colHeader,
      key: colKey,
      width: userWidth ? Math.max(userWidth, finalWidth) : finalWidth,
      isLongText: isLongTextCol,
    };
  });

  const totalCols = Math.max(formattedColumns.length, 1);
  const bannerMergeCols = Math.max(totalCols, 4);

  // Set column widths in Excel worksheet
  formattedColumns.forEach((col, idx) => {
    sheet.getColumn(idx + 1).width = col.width;
  });

  // 1. TOP PAR DEEP NAVY BLUE MERGED TITLE BANNER
  sheet.mergeCells(1, 1, 1, bannerMergeCols);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = String(title || "DATA EXPORT").toUpperCase();
  titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" }, // Deep Navy Blue (#0F172A)
  };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(1).height = 42;

  for (let c = 2; c <= bannerMergeCols; c++) {
    sheet.getCell(1, c).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" },
    };
  }

  // SUBTITLE BANNER (Row 2)
  const defaultSubtitle = `Generated on: ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} | Total Records: ${records.length} | CT University Grievance Portal`;
  sheet.mergeCells(2, 1, 2, bannerMergeCols);
  const subCell = sheet.getCell(2, 1);
  subCell.value = subtitle || defaultSubtitle;
  subCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FFCBD5E1" } };
  subCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1E293B" }, // Navy Slate (#1E293B)
  };
  subCell.alignment = { vertical: "middle", horizontal: "center" };
  sheet.getRow(2).height = 24;

  for (let c = 2; c <= bannerMergeCols; c++) {
    sheet.getCell(2, c).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" },
    };
  }

  // Row 3: Blank separator row
  sheet.getRow(3).height = 10;

  // 2. BOLD WHITE TABLE HEADERS WITH AUTO-FILTER ENABLED (Row 4)
  const headerRow = sheet.getRow(4);
  headerRow.values = formattedColumns.map((c) => c.header);
  headerRow.height = 28;

  headerRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E293B" }, // Executive dark navy header
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "medium", color: { argb: "FF0F172A" } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      left: { style: "thin", color: { argb: "FF334155" } },
      right: { style: "thin", color: { argb: "FF334155" } },
    };
  });

  // Enable Auto-filter on row 4 across all table columns
  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: totalCols },
  };

  const isStatusColumn = (col) => {
    const key = String(col.key || "").toLowerCase();
    const header = String(col.header || "").toLowerCase();
    return (
      key.includes("status") ||
      header.includes("status") ||
      key.includes("verified") ||
      header.includes("verification") ||
      key.includes("state")
    );
  };

  // 3. ALTERNATE ROWS PAR ZEBRA STRIPING (White aur Soft-Gray) & 4. STATUS PASTEL BADGES
  records.forEach((rec, recIdx) => {
    const rowValues = formattedColumns.map((col) => {
      let val = rec[col.key];
      if (val === undefined && col.header) val = rec[col.header];
      if (val === null || val === undefined) return "";
      if (typeof val === "boolean") return val ? "Yes" : "No";
      if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) {
        return new Date(val).toLocaleString();
      }
      return val;
    });

    const row = sheet.addRow(rowValues);
    row.height = 22;

    const isEven = recIdx % 2 === 0;
    const zebraColor = isEven ? "FFFFFFFF" : "FFF8FAFC"; // White & Soft-Gray (#F8FAFC)

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colMeta = formattedColumns[colNumber - 1];
      if (!colMeta) return;

      cell.font = { name: "Calibri", size: 10, color: { argb: "FF1E293B" } };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      if (colMeta.isLongText) {
        cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
      } else if (/id|date|phone|rating|roll/i.test(colMeta.key)) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        cell.alignment = { vertical: "middle", horizontal: "left" };
      }

      // 4. SOFT PASTEL BADGE COLORS ON STATUS COLUMN
      const isStatusCol = isStatusColumn(colMeta);
      const badgeStyle = getStatusBadgeStyle(cell.value);

      if (isStatusCol && badgeStyle) {
        cell.fill = badgeStyle.fill;
        cell.font = badgeStyle.font;
        cell.border = badgeStyle.border;
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (badgeStyle) {
        cell.fill = badgeStyle.fill;
        cell.font = badgeStyle.font;
        cell.border = badgeStyle.border;
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (isStatusCol) {
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: zebraColor },
        };
      } else {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: zebraColor },
        };
      }
    });
  });
}

/**
 * Builds a corporate dashboard styled Excel workbook:
 * If multiple departments are present, creates a Master Consolidated sheet AND
 * separate worksheets for each department with tab names as the department names!
 */
function buildCorporateDashboardWorkbook({
  sheetName = "Export Data",
  title = "DATA EXPORT REPORT",
  subtitle,
  columns = [],
  records = [],
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CT University Grievance Portal";
  workbook.created = new Date();

  // Group records by department (canonicalized to merge case/spelling variants into single tabs)
  const deptGroups = new Map();
  records.forEach((rec) => {
    const rawDept = getRecordDepartment(rec, columns) || "General";
    const deptInfo = normalizeDepartment(rawDept);
    const key = deptInfo.fullName.toLowerCase();
    if (!deptGroups.has(key)) {
      deptGroups.set(key, {
        fullName: deptInfo.fullName,
        tabName: deptInfo.tabName,
        records: []
      });
    }
    deptGroups.get(key).records.push(rec);
  });

  const existingSheetNames = new Set();
  const validGroups = Array.from(deptGroups.values()).filter(
    (g) => g.fullName && g.fullName !== "—" && g.records.length > 0
  );

  // If multiple departments exist, split into separate department tabs!
  if (validGroups.length > 1) {
    // 1. Master Consolidated Tab (Named with user's custom sheetName)
    const masterTabName = sanitizeSheetName(sheetName || "All Records", existingSheetNames);
    const masterSheet = workbook.addWorksheet(masterTabName, {
      views: [{ showGridLines: true }],
    });
    populateWorksheet(masterSheet, {
      title: title || `${(sheetName || "DATA EXPORT").toUpperCase()} - ALL RECORDS`,
      subtitle: subtitle || `Master Consolidated View | Total: ${records.length} Records across ${validGroups.length} Departments`,
      columns,
      records,
    });

    // 2. Individual Department Tabs (Single canonical tab per school/department)
    validGroups.forEach((group) => {
      const deptTabName = sanitizeSheetName(group.tabName || group.fullName, existingSheetNames);
      const deptSheet = workbook.addWorksheet(deptTabName, {
        views: [{ showGridLines: true }],
      });
      populateWorksheet(deptSheet, {
        title: `${group.fullName.toUpperCase()} REPORT`,
        subtitle: `Department: ${group.fullName} | Total Records: ${group.records.length} | Generated: ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`,
        columns,
        records: group.records,
      });
    });
  } else if (validGroups.length === 1) {
    // Single department or uniform dataset
    const singleTabName = sanitizeSheetName(sheetName || validGroups[0].tabName || "Export Data", existingSheetNames);
    const singleSheet = workbook.addWorksheet(singleTabName, {
      views: [{ showGridLines: true }],
    });
    populateWorksheet(singleSheet, {
      title,
      subtitle,
      columns,
      records,
    });
  } else {
    // Empty dataset fallback
    const singleTabName = sanitizeSheetName(sheetName || "Export Data", existingSheetNames);
    const singleSheet = workbook.addWorksheet(singleTabName, {
      views: [{ showGridLines: true }],
    });
    populateWorksheet(singleSheet, {
      title,
      subtitle,
      columns,
      records,
    });
  }

  return workbook;
}

// ✅ EXPORT ALL FILTERED GRIEVANCES
router.get("/export", async (req, res) => {
  try {
    const {
      searchStudentId,
      searchStaffId,
      filterStatus,
      filterDepartment,
      filterMonth,
    } = req.query;

    let query = {};

    if (searchStudentId) {
      query.userId = { $regex: searchStudentId, $options: "i" };
    }

    if (searchStaffId) {
      query.assignedTo = { $regex: searchStaffId, $options: "i" };
    }

    if (filterStatus && filterStatus !== "All") {
      query.status = filterStatus;
    }

    if (filterDepartment && filterDepartment !== "All") {
      query.$or = [
        { category: filterDepartment },
        { school: filterDepartment },
      ];
    }

    if (filterMonth) {
      const [year, month] = filterMonth.split("-");
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      query.createdAt = { $gte: start, $lte: end };
    }

    const grievances = await Grievance.find(query).sort({ createdAt: -1 });

    const exportRecords = grievances.map((g) => {
      const isStaff =
        g.userType === "staff" ||
        g.studentProgram === "Staff Member" ||
        g.studentProgram === "Admin Staff" ||
        (g.studentProgram && g.studentProgram.toLowerCase().includes("staff")) ||
        /^\d{5}$/.test(String(g.userId || "").trim());
      const roleTag = isStaff ? "Staff" : "Student";
      return {
        userId: g.userId || "N/A",
        name: `${g.name || "N/A"} [${roleTag}]`,
        department: g.category || g.school || "N/A",
        message: g.message || "N/A",
        status: g.status || "N/A",
        assignedTo: g.assignedTo || "Not Assigned",
        createdAt: g.createdAt ? g.createdAt.toLocaleString() : "N/A",
      };
    });

    const columns = [
      { header: "User ID", key: "userId", width: 18 },
      { header: "User Name", key: "name", width: 26 },
      { header: "Department", key: "department", width: 25 },
      { header: "Message", key: "message", width: 48 },
      { header: "Status", key: "status", width: 16 },
      { header: "Assigned Staff", key: "assignedTo", width: 22 },
      { header: "Created At", key: "createdAt", width: 22 },
    ];

    const workbook = buildCorporateDashboardWorkbook({
      sheetName: "Filtered Grievances",
      title: "GRIEVANCES MANAGEMENT AUDIT REPORT",
      columns,
      records: exportRecords,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=filtered_grievances.xlsx"
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel Export Error:", err);
    res.status(500).json({ message: "Excel export failed" });
  }
});

// ✅ EXPORT SELECTED GRIEVANCES (with custom columns)
router.post("/export-selected", async (req, res) => {
  try {
    const { grievanceIds, columns, sheetName = "Grievances Export", fileName } = req.body;

    if (!grievanceIds || !grievanceIds.length) {
      return res.status(400).json({ message: "No grievances selected" });
    }

    if (!columns || !columns.length) {
      return res.status(400).json({ message: "No columns selected" });
    }

    // Fetch only selected grievances
    const grievances = await Grievance.find({ _id: { $in: grievanceIds } }).sort({ createdAt: -1 });

    const columnConfig = {
      userId: { header: "User ID", key: "userId", width: 18 },
      name: { header: "User Name", key: "name", width: 26 },
      category: { header: "Department/Category", key: "category", width: 25 },
      message: { header: "Message", key: "message", width: 48 },
      status: { header: "Status", key: "status", width: 16 },
      assignedTo: { header: "Assigned Staff", key: "assignedTo", width: 24 },
      createdAt: { header: "Created Date", key: "createdAt", width: 22 },
      resolvedAt: { header: "Resolved Date", key: "resolvedAt", width: 22 },
      rating: { header: "Rating", key: "rating", width: 16 },
    };

    const selectedColumns = columns
      .filter((col) => columnConfig[col])
      .map((col) => columnConfig[col]);

    const mappedRecords = grievances.map((g) => {
      const rowData = {};
      columns.forEach((col) => {
        switch (col) {
          case "userId":
            rowData.userId = g.userId || "N/A";
            break;
          case "name": {
            const isStaff =
              g.userType === "staff" ||
              g.studentProgram === "Staff Member" ||
              g.studentProgram === "Admin Staff" ||
              (g.studentProgram && g.studentProgram.toLowerCase().includes("staff")) ||
              /^\d{5}$/.test(String(g.userId || "").trim());
            const roleTag = isStaff ? "Staff" : "Student";
            rowData.name = `${g.name || "N/A"} [${roleTag}]`;
            break;
          }
          case "category":
            rowData.category = g.category || g.school || "N/A";
            break;
          case "message":
            rowData.message = g.message || "N/A";
            break;
          case "status":
            rowData.status = g.status || "N/A";
            break;
          case "assignedTo":
            rowData.assignedTo = g.assignedTo || "Not Assigned";
            break;
          case "createdAt":
            rowData.createdAt = g.createdAt ? g.createdAt.toLocaleString() : "N/A";
            break;
          case "resolvedAt":
            rowData.resolvedAt = g.resolvedAt ? g.resolvedAt.toLocaleString() : "N/A";
            break;
          case "rating":
            rowData.rating = g.rating?.stars ? `${g.rating.stars}/5 Stars` : "No Rating";
            break;
          default:
            rowData[col] = g[col] || "N/A";
        }
      });
      return rowData;
    });

    const reportTitle = `${(sheetName || "Selected Grievances").toUpperCase()} REPORT`;
    const reportSubtitle = `Generated on: ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} | Total Records: ${mappedRecords.length} | CT University Portal`;

    const workbook = buildCorporateDashboardWorkbook({
      sheetName,
      title: reportTitle,
      subtitle: reportSubtitle,
      columns: selectedColumns,
      records: mappedRecords,
    });

    const outFileName = fileName || `grievances_export_${new Date().toISOString().split("T")[0]}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${outFileName}"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel Export Selected Error:", err);
    res.status(500).json({ message: "Excel export failed" });
  }
});

// ✅ EXPORT CUSTOM DATA (Corporate Dashboard Look for all modals & custom tables)
router.post("/export-custom", express.json({ limit: "50mb" }), async (req, res) => {
  try {
    const { fileName = "export.xlsx", sheetName = "Export Data", columns, records } = req.body;

    if (!records || !records.length) {
      return res.status(400).json({ message: "No records to export" });
    }

    if (!columns || !columns.length) {
      return res.status(400).json({ message: "No columns selected" });
    }

    const reportTitle = `${(sheetName || fileName.replace(/\.xlsx$/i, "") || "Data Export").toUpperCase()} REPORT`;
    const reportSubtitle = `Generated on: ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} | Total Records: ${records.length} | CT University Portal`;

    const workbook = buildCorporateDashboardWorkbook({
      sheetName,
      title: reportTitle,
      subtitle: reportSubtitle,
      columns,
      records,
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileName}"`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Custom Excel Export Error:", err);
    res.status(500).json({ message: "Excel export failed" });
  }
});

export default router;
