import express from "express";
import { getAuditLogs } from "../controllers/auditController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", verifyToken, getAuditLogs);

export default router;
