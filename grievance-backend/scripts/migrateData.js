// Migration Script: Copy data from old collections to new separated collections
// Run this script ONCE to migrate existing data
// Command: node scripts/migrateData.js

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "../.env") });

// Import all models
import User from "../models/UserModel.js";
import UniversityRecord from "../models/UniversityRecord.js";
import StudentRecord from "../models/StudentRecord.js";
import StaffRecord from "../models/StaffRecord.js";
import StudentUser from "../models/StudentUser.js";
import StaffUser from "../models/StaffUser.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/grievance_portal";

async function migrateData() {
    try {
        console.log("🚀 Starting Data Migration...");
        console.log(`📦 Connecting to: ${MONGO_URI}`);

        await mongoose.connect(MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // ========== MIGRATE UNIVERSITY RECORDS ==========
        console.log("\n📋 Migrating University Records...");

        const allRecords = await UniversityRecord.find({});
        console.log(`Found ${allRecords.length} records in UniversityRecord collection`);

        let studentRecordCount = 0;
        let staffRecordCount = 0;

        for (const record of allRecords) {
            const role = record.role?.toLowerCase() || "student";

            if (role === "student") {
                await StudentRecord.findOneAndUpdate(
                    { id: record.id },
                    {
                        id: record.id,
                        fullName: record.fullName || "",
                        email: record.email || "",
                        program: record.program || "",
                        studentType: ""
                    },
                    { upsert: true, new: true }
                );
                studentRecordCount++;
            } else {
                await StaffRecord.findOneAndUpdate(
                    { id: record.id },
                    {
                        id: record.id,
                        fullName: record.fullName || "",
                        email: record.email || "",
                        role: role,
                        department: record.department || ""
                    },
                    { upsert: true, new: true }
                );
                staffRecordCount++;
            }
        }

        console.log(`✅ Migrated ${studentRecordCount} Student Records`);
        console.log(`✅ Migrated ${staffRecordCount} Staff Records`);

        // ========== MIGRATE USERS ==========
        console.log("\n👥 Migrating Users...");

        const allUsers = await User.find({});
        console.log(`Found ${allUsers.length} users in User collection`);

        let studentUserCount = 0;
        let staffUserCount = 0;

        for (const user of allUsers) {
            const role = user.role?.toLowerCase() || "student";

            if (role === "student") {
                await StudentUser.findOneAndUpdate(
                    { id: user.id },
                    {
                        id: user.id,
                        fullName: user.fullName || "",
                        email: user.email || "",
                        phone: user.phone || "",
                        password: user.password,
                        isVerified: user.isVerified || false,
                        otp: user.otp,
                        otpExpires: user.otpExpires,
                        phoneOtp: user.phoneOtp,
                        phoneOtpExpires: user.phoneOtpExpires,
                        resetOtp: user.resetOtp,
                        resetOtpExpires: user.resetOtpExpires,
                        program: user.program || "",
                        studentType: user.studentType || ""
                    },
                    { upsert: true, new: true }
                );
                studentUserCount++;
            } else {
                await StaffUser.findOneAndUpdate(
                    { id: user.id },
                    {
                        id: user.id,
                        role: role,
                        fullName: user.fullName || "",
                        email: user.email || "",
                        phone: user.phone || "",
                        password: user.password,
                        isVerified: user.isVerified || false,
                        otp: user.otp,
                        otpExpires: user.otpExpires,
                        phoneOtp: user.phoneOtp,
                        phoneOtpExpires: user.phoneOtpExpires,
                        resetOtp: user.resetOtp,
                        resetOtpExpires: user.resetOtpExpires,
                        staffDepartment: user.staffDepartment || "",
                        isDeptAdmin: user.isDeptAdmin || false,
                        adminDepartment: user.adminDepartment || "",
                        isMasterAdmin: user.isMasterAdmin || false
                    },
                    { upsert: true, new: true }
                );
                staffUserCount++;

                // Log Master Admin migration
                if (user.isMasterAdmin) {
                    console.log(`👑 Master Admin migrated: ${user.id} - ${user.fullName}`);
                }
            }
        }

        console.log(`✅ Migrated ${studentUserCount} Student Users`);
        console.log(`✅ Migrated ${staffUserCount} Staff Users`);

        // ========== SUMMARY ==========
        console.log("\n🎉 Migration Complete!");
        console.log("=====================");
        console.log(`📊 University Records: ${allRecords.length} total`);
        console.log(`   └── StudentRecord: ${studentRecordCount}`);
        console.log(`   └── StaffRecord: ${staffRecordCount}`);
        console.log(`👥 Users: ${allUsers.length} total`);
        console.log(`   └── StudentUser: ${studentUserCount}`);
        console.log(`   └── StaffUser: ${staffUserCount}`);
        console.log("\n✅ Old collections are preserved as backup!");
        console.log("   - universityrecords (backup)");
        console.log("   - users (backup)");

    } catch (error) {
        console.error("❌ Migration Error:", error);
    } finally {
        await mongoose.disconnect();
        console.log("\n🔌 Disconnected from MongoDB");
    }
}

// Run migration
migrateData();
