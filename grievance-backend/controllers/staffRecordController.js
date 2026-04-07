import StaffRecord from "../models/StaffRecord.js";

// Fetch with Pagination and Filters
export const getAllRecords = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20; // Default 20 per page as requested
    const search = req.query.search || "";
    
    // Build search query for id, name, email, phone, department
    const query = {};
    if (search) {
      query.$or = [
        { id: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } }
      ];
    }

    const total = await StaffRecord.countDocuments(query);
    const records = await StaffRecord.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      total,
      page,
      totalPages: Math.ceil(total / limit),
      records
    });
  } catch (error) {
    res.status(500).json({ message: "Server error fetching staff records", error });
  }
};

// Add a new staff record
export const addRecord = async (req, res) => {
  try {
    const { id, fullName, email, phone, role, department } = req.body;
    
    if (!id || !role) {
      return res.status(400).json({ message: "ID and Role are required" });
    }

    // Check if ID already exists
    const existing = await StaffRecord.findOne({ id: id.toString().trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: "Staff ID already exists" });
    }

    const record = new StaffRecord({
      id: id.toString().trim().toUpperCase(),
      fullName,
      email,
      phone,
      role: role.toLowerCase(),
      department
    });

    await record.save();
    res.status(201).json({ message: "Staff record added successfully", record });
  } catch (error) {
    console.error("Add Record Error:", error);
    res.status(500).json({ message: "Failed to add staff record", error });
  }
};

// Update an existing staff record
export const updateRecord = async (req, res) => {
  try {
    const { id } = req.params; // Using the Staff ID (like STF001) as param
    const updateData = req.body;

    // Prevent ID modification if needed, or normalize ID if it is part of body
    if (updateData.id) {
       updateData.id = updateData.id.toString().trim().toUpperCase();
    }

    const record = await StaffRecord.findOneAndUpdate(
      { id: id.toString().trim().toUpperCase() },
      { $set: updateData },
      { new: true }
    );

    if (!record) return res.status(404).json({ message: "Record not found" });
    res.json({ message: "Record updated successfully", record });
  } catch (error) {
    console.error("Update Record Error:", error);
    res.status(500).json({ message: "Failed to update record", error });
  }
};

// Delete a staff record
export const deleteRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await StaffRecord.findOneAndDelete({ id: id.toString().trim().toUpperCase() });
    
    if (!record) return res.status(404).json({ message: "Record not found" });
    res.json({ message: "Record deleted successfully" });
  } catch (error) {
    console.error("Delete Record Error:", error);
    res.status(500).json({ message: "Failed to delete record", error });
  }
};
