import mongoose from "mongoose";

const uploadJobSchema = new mongoose.Schema(
  {
    jobId: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ["student", "staff"], default: "student" },
    status: { type: String, enum: ["processing", "done", "error"], default: "processing" },
    mode: { type: String, default: "add" },
    total: { type: Number, default: 0 },
    processed: { type: Number, default: 0 },
    inserted: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    deleted: { type: Number, default: 0 },
    sheetCount: { type: Number, default: 1 },
    sheetNames: { type: [String], default: [] },
    sheetSummaries: { type: Array, default: [] },
    errors: { type: [String], default: [] },
    errorMessage: { type: String, default: "" },
    startedAt: { type: Number, default: Date.now },
    completedAt: { type: Number },
    createdAt: { type: Date, default: Date.now, expires: 172800 }, // 48-hour TTL auto-cleanup
  },
  { timestamps: true, suppressReservedKeysWarning: true }
);

const UploadJob = mongoose.model("UploadJob", uploadJobSchema);
export default UploadJob;
