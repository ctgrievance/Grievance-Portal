import express from "express";
import {
  createRoutingRule,
  getAllRoutingRules,
  getRoutingRulesByDepartment,
  getRoutingRuleByIssueType,
  updateRoutingRule,
  deleteRoutingRule,
  getRoutingHealthAudit,
  sendDepartmentRoutingReminder,
  broadcastRoutingReminders
} from "../controllers/routingRuleController.js";

const router = express.Router();

// 📊 Audit & Health Endpoints (placed before parameter routes)
router.get("/audit/health-matrix", getRoutingHealthAudit);
router.post("/audit/send-reminder", sendDepartmentRoutingReminder);
router.post("/audit/broadcast-reminders", broadcastRoutingReminders);

router.post("/", createRoutingRule);
router.get("/", getAllRoutingRules);
router.get("/department/:department", getRoutingRulesByDepartment);
router.get("/issue-type/:issueTypeId", getRoutingRuleByIssueType);
router.put("/:id", updateRoutingRule);
router.delete("/:id", deleteRoutingRule);

export default router;
