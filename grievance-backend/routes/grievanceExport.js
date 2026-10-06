import express from "express";
import ExcelJS from "exceljs";
import Grievance from "../models/GrievanceModel.js";

const router = express.Router();

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

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Grievances");

    sheet.columns = [
      { header: "User ID", key: "userId", width: 18 },
      { header: "User Name", key: "name", width: 26 },
      { header: "Department", key: "department", width: 25 },
      { header: "Message", key: "message", width: 45 },
      { header: "Status", key: "status", width: 15 },
      { header: "Assigned Staff", key: "assignedTo", width: 20 },
      { header: "Created At", key: "createdAt", width: 22 },
    ];

    grievances.forEach((g) => {
      const isStaff =
        g.userType === "staff" ||
        g.studentProgram === "Staff Member" ||
        g.studentProgram === "Admin Staff" ||
        (g.studentProgram && g.studentProgram.toLowerCase().includes("staff")) ||
        /^\d{5}$/.test(String(g.userId || "").trim());
      const roleTag = isStaff ? "Staff" : "Student";
      sheet.addRow({
        userId: g.userId,
        name: `${g.name || "N/A"} [${roleTag}]`,
        department: g.category || g.school || "N/A",
        message: g.message,
        status: g.status,
        assignedTo: g.assignedTo || "Not Assigned",
        createdAt: g.createdAt.toLocaleString(),
      });
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
    const { grievanceIds, columns } = req.body;

    if (!grievanceIds || !grievanceIds.length) {
      return res.status(400).json({ message: "No grievances selected" });
    }

    if (!columns || !columns.length) {
      return res.status(400).json({ message: "No columns selected" });
    }

    // Fetch only selected grievances
    const grievances = await Grievance.find({ _id: { $in: grievanceIds } }).sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Grievances Export");

    // Column mapping
    const columnConfig = {
      userId: { header: "User ID", key: "userId", width: 18 },
      name: { header: "User Name", key: "name", width: 26 },
      category: { header: "Department/Category", key: "category", width: 25 },
      message: { header: "Message", key: "message", width: 50 },
      status: { header: "Status", key: "status", width: 15 },
      assignedTo: { header: "Assigned Staff", key: "assignedTo", width: 25 },
      createdAt: { header: "Created Date", key: "createdAt", width: 22 },
      resolvedAt: { header: "Resolved Date", key: "resolvedAt", width: 22 },
      rating: { header: "Rating", key: "rating", width: 15 },
    };

    // Build columns array based on user selection (in order)
    const selectedColumns = columns
      .filter((col) => columnConfig[col])
      .map((col) => columnConfig[col]);

    sheet.columns = selectedColumns;

    // Style header row
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "1E293B" },
    };
    sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    // Add data rows
    grievances.forEach((g, index) => {
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
        }
      });

      const row = sheet.addRow(rowData);

      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "F8FAFC" },
        };
      }
    });

    // Add borders to all cells
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "E2E8F0" } },
          left: { style: "thin", color: { argb: "E2E8F0" } },
          bottom: { style: "thin", color: { argb: "E2E8F0" } },
          right: { style: "thin", color: { argb: "E2E8F0" } },
        };
      });
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=grievances_export_${new Date().toISOString().split("T")[0]}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel Export Selected Error:", err);
    res.status(500).json({ message: "Excel export failed" });
  }
});

// ✅ EXPORT CUSTOM DATA (with user-selected rows & columns)
router.post("/export-custom", express.json({ limit: "50mb" }), async (req, res) => {
  try {
    const { fileName = "export.xlsx", sheetName = "Export Data", columns, records } = req.body;

    if (!records || !records.length) {
      return res.status(400).json({ message: "No records to export" });
    }

    if (!columns || !columns.length) {
      return res.status(400).json({ message: "No columns selected" });
    }

    const workbook = new ExcelJS.Workbook();
    const sanitizedSheetName = (sheetName || "Export")
      .replace(/[*?:/\\\[\]]/g, "")
      .substring(0, 31) || "Export";
    const sheet = workbook.addWorksheet(sanitizedSheetName);

    // Columns format: can be string[] or { key, label, width }[]
    const formattedColumns = columns.map((col) => {
      const colKey = typeof col === "string" ? col : (col.key || col.label);
      const colHeader = typeof col === "string" ? col : (col.label || col.key);
      const width = typeof col === "object" && col.width ? col.width : Math.max(colHeader.length + 6, 16);
      return {
        header: colHeader,
        key: colKey,
        width: width
      };
    });

    sheet.columns = formattedColumns;

    // Style header row with executive dark-navy theme
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFF" } };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "1E293B" },
    };
    sheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };
    sheet.getRow(1).height = 24;

    // Add data rows
    records.forEach((rec, index) => {
      const rowData = {};
      formattedColumns.forEach((col) => {
        let val = rec[col.key];
        if (val === undefined && col.header) {
          val = rec[col.header];
        }
        if (val === null || val === undefined) {
          val = "";
        }
        rowData[col.key] = val;
      });

      const row = sheet.addRow(rowData);

      // Alternating row background
      if (index % 2 === 0) {
        row.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "F8FAFC" },
        };
      }
    });

    // Add borders to all cells
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "E2E8F0" } },
          left: { style: "thin", color: { argb: "E2E8F0" } },
          bottom: { style: "thin", color: { argb: "E2E8F0" } },
          right: { style: "thin", color: { argb: "E2E8F0" } },
        };
      });
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

