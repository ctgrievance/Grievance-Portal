import nodemailer from "nodemailer";
import dotenv from "dotenv";
import User from "../models/UserModel.js";
import StaffUser from "../models/StaffUser.js";
import StaffRecord from "../models/StaffRecord.js";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Cooldown map to prevent spamming recipient with multiple emails in active chat (60s throttle per ticket & recipient)
const chatEmailCooldowns = new Map();

// Periodic cleanup of stale cooldown entries (older than 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of chatEmailCooldowns.entries()) {
    if (now - timestamp > 300000) {
      chatEmailCooldowns.delete(key);
    }
  }
}, 300000);

const escapeHtml = (unsafe) => {
  if (!unsafe) return "";
  return String(unsafe)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Send Promotion Email
export const sendPromotionEmail = async (staffEmail, staffName, newRole, department, staffId) => {
  try {
    const promotionDate = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata"
    });

    const emailSubject = `🎉 Promotion Notification - ${newRole} Role`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Congratulations!</h2>
        <p>Dear ${staffName},</p>
        <p>You have been promoted to <strong>${newRole}</strong> for the <strong>${department}</strong> department.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        
        <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0; font-weight: bold;">📋 Promotion Details:</p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li><strong>Role:</strong> ${newRole}</li>
            <li><strong>Department:</strong> ${department}</li>
            <li><strong>Date & Time:</strong> ${promotionDate}</li>
            <li><strong>Staff ID:</strong> ${staffId}</li>
          </ul>
        </div>

        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0; color: #92400e;"><strong>⚠️ Important:</strong> You may need to logout and login again to see your new dashboard and permissions.</p>
        </div>

        <p>If you have any questions, please contact your administrator.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #64748b; font-size: 0.9rem;">Best regards,<br><strong>Grievance Portal Team</strong></p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: staffEmail,
      subject: emailSubject,
      html: emailBody
    });

    console.log(`✅ Promotion email sent to ${staffEmail}`);
    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    console.error("⚠️ Email sending failed:", error);
    return { success: false, message: "Email could not be sent" };
  }
};

// Send OTP Email
export const sendEmailOtp = async (email, otp) => {
  try {
    const emailSubject = `🔐 Your Registration OTP - Grievance Portal`;
    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #2563eb; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Grievance Portal</h2>
        </div>
        <div style="padding: 20px;">
          <p>Dear User,</p>
          <p>Your One-Time Password (OTP) for registration is:</p>
          <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="color: #1e40af; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p>This OTP is valid for 10 minutes. Please do not share it with anyone.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
        <div style="background-color: #f8fafc; padding: 15px; text-align: center; color: #64748b; font-size: 0.875rem;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} CT University Grievance Portal. All rights reserved.</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: emailSubject,
      html: emailBody
    });

    console.log(`✅ OTP email sent to ${email}`);
    return { success: true, message: "OTP sent successfully" };
  } catch (error) {
    console.error("⚠️ OTP Email sending failed:", error);
    return { success: false, message: "OTP Email could not be sent" };
  }
};

// Send LinkedIn-Style Chat Message Email Notification
export const sendChatMessageEmail = async ({
  grievance,
  senderId,
  senderRole,
  senderName,
  messageText,
  hasAttachment,
  attachmentName,
}) => {
  try {
    if (!grievance) return { success: false, message: "No grievance provided" };

    const isStaffSender =
      senderRole === "staff" ||
      senderRole === "admin" ||
      (senderId && grievance.userId && senderId.toUpperCase() !== grievance.userId.toUpperCase());

    let recipientEmail = null;
    let recipientName = "User";
    let senderDisplayName = senderName || "Staff Member";
    let senderDesignation = "Department Staff Member";
    let departmentName = grievance.category || grievance.school || "University Department";
    let ticketDisplayId = grievance.userId || (grievance._id ? grievance._id.toString().slice(-6).toUpperCase() : "TICKET");

    if (isStaffSender) {
      // 1. Recipient is the student/complainant who submitted the grievance
      recipientEmail = grievance.email;
      recipientName = grievance.name || "Student";

      // Fallback lookup if student email is not on grievance document
      if (!recipientEmail && grievance.userId) {
        const studentUser = await User.findOne({ id: grievance.userId });
        if (studentUser && studentUser.email) recipientEmail = studentUser.email;
      }

      // Resolve staff's real full name & designation from database
      if (senderId) {
        const staff =
          (await StaffUser.findOne({ id: senderId })) ||
          (await User.findOne({ id: senderId })) ||
          (await StaffRecord.findOne({ id: senderId }));

        if (staff) {
          if (staff.fullName) senderDisplayName = staff.fullName;
          if (staff.adminDepartment || staff.department) {
            departmentName = staff.adminDepartment || staff.department;
          }
          if (staff.isDeptAdmin) senderDesignation = "Department Administrator";
          else if (staff.role === "admin" || staff.isMasterAdmin) senderDesignation = "Portal Administrator";
          else senderDesignation = "Department Staff Member";
        }
      }
    } else {
      // 2. Sender is student -> Recipient is the assigned staff member
      if (!grievance.assignedTo) {
        console.log("ℹ️ Chat email skipped: No staff currently assigned to this grievance.");
        return { success: false, message: "No assigned staff" };
      }

      const staff =
        (await StaffUser.findOne({ id: grievance.assignedTo })) ||
        (await User.findOne({ id: grievance.assignedTo })) ||
        (await StaffRecord.findOne({ id: grievance.assignedTo }));

      if (!staff || !staff.email) {
        console.warn(`⚠️ Chat email skipped: No email found for assigned staff "${grievance.assignedTo}"`);
        return { success: false, message: "No staff email found" };
      }

      recipientEmail = staff.email;
      recipientName = staff.fullName || "Staff Member";

      senderDisplayName = grievance.name || senderName || "Student";
      senderDesignation = grievance.studentProgram ? `Student (${grievance.studentProgram})` : "Student";
    }

    if (!recipientEmail) {
      console.warn(`⚠️ Chat email skipped: Recipient email could not be resolved.`);
      return { success: false, message: "No recipient email found" };
    }

    // Anti-flood throttle (at most 1 email per recipient per grievance every 60 seconds)
    const cooldownKey = `${grievance._id}:${recipientEmail.toLowerCase()}`;
    const lastSent = chatEmailCooldowns.get(cooldownKey);
    const now = Date.now();
    if (lastSent && now - lastSent < 60000) {
      console.log(`⏳ Chat email to ${recipientEmail} throttled (cooldown active: ${Math.round((60000 - (now - lastSent)) / 1000)}s left)`);
      return { success: false, message: "Throttled by cooldown" };
    }
    chatEmailCooldowns.set(cooldownKey, now);

    // Prepare initials for LinkedIn-style avatar circle
    const initials =
      senderDisplayName
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .substring(0, 2)
        .toUpperCase() || "GP";

    const portalUrl = process.env.CLIENT_URL || "http://localhost:3000";
    const previewMessage = escapeHtml(messageText || (hasAttachment ? "Shared an attachment" : "Sent a message"));

    const emailSubject = isStaffSender
      ? `💬 ${senderDisplayName} from Grievance Portal is trying to reach you`
      : `💬 ${senderDisplayName} sent a reply on Grievance #${ticketDisplayId}`;

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(emailSubject)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          
          <!-- TOP HERO BRAND HEADER -->
          <tr>
            <td style="background: linear-gradient(135deg, #0a66c2 0%, #004182 100%); padding: 24px 30px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <div style="font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: 0.5px;">CT UNIVERSITY</div>
                    <div style="font-size: 11px; color: #bae6fd; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">Official Grievance Redressal Portal</div>
                  </td>
                  <td align="right">
                    <span style="background: rgba(255, 255, 255, 0.2); color: #ffffff; padding: 5px 12px; border-radius: 14px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">
                      💬 NEW MESSAGE
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN BODY CONTENT -->
          <tr>
            <td style="padding: 30px 30px 24px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #475569;">
                Hello <strong>${escapeHtml(recipientName)}</strong>,
              </p>

              <!-- LINKEDIN-STYLE SENDER INTRO -->
              <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px;">
                <tr>
                  <td width="52" valign="top">
                    <!-- SENDER AVATAR / INITIALS -->
                    <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #0a66c2 0%, #3b82f6 100%); color: #ffffff; font-size: 17px; font-weight: 700; line-height: 48px; text-align: center; box-shadow: 0 2px 6px rgba(10, 102, 194, 0.25);">
                      ${initials}
                    </div>
                  </td>
                  <td style="padding-left: 14px;" valign="middle">
                    <h3 style="margin: 0; color: #0f172a; font-size: 16px; font-weight: 700;">${escapeHtml(senderDisplayName)}</h3>
                    <p style="margin: 2px 0 0 0; color: #64748b; font-size: 13px;">
                      ${escapeHtml(senderDesignation)} • ${escapeHtml(departmentName)}
                    </p>
                    <p style="margin: 4px 0 0 0; color: #0a66c2; font-size: 12px; font-weight: 600;">
                      ${isStaffSender ? "is trying to reach you regarding your grievance" : "replied to the grievance chat"}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- MESSAGE SPEECH BUBBLE (LinkedIn Quoted Message) -->
              <div style="background: #ffffff; border: 1px solid #cbd5e1; border-left: 5px solid #0a66c2; border-radius: 0 10px 10px 0; padding: 18px 20px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
                <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                  Message Preview:
                </div>
                <div style="font-size: 15px; color: #1e293b; line-height: 1.6; font-style: italic; word-break: break-word;">
                  "${previewMessage}"
                </div>
                ${
                  hasAttachment
                    ? `
                <div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #e2e8f0; font-size: 13px; color: #0284c7; font-weight: 600;">
                  📎 Attachment: ${escapeHtml(attachmentName || "File attached")}
                </div>`
                    : ""
                }
              </div>

              <!-- GRIEVANCE TICKET META CARD -->
              <table width="100%" cellspacing="0" cellpadding="0" style="background: #f1f5f9; border-radius: 8px; padding: 12px 16px; margin-bottom: 28px; font-size: 13px; color: #334155;">
                <tr>
                  <td><strong>Ticket:</strong> #${escapeHtml(ticketDisplayId)}</td>
                  <td align="right"><strong>Department:</strong> ${escapeHtml(departmentName)}</td>
                </tr>
              </table>

              <!-- CTA BUTTON -->
              <table width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 12px;">
                <tr>
                  <td align="center">
                    <a href="${portalUrl}" target="_blank" style="background: linear-gradient(135deg, #0a66c2 0%, #004182 100%); color: #ffffff; text-decoration: none; padding: 14px 34px; border-radius: 26px; font-size: 15px; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(10, 102, 194, 0.35);">
                      View Message & Reply →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="text-align: center; margin: 8px 0 0 0; font-size: 12px; color: #94a3b8;">
                Quick response helps resolve grievances faster.
              </p>
            </td>
          </tr>

          <!-- EMAIL FOOTER -->
          <tr>
            <td style="background-color: #f8fafc; padding: 22px 30px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.5;">
              <p style="margin: 0 0 4px 0;">This email was sent automatically by the <strong>CT University Grievance Portal</strong>.</p>
              <p style="margin: 0;">Please do not reply directly to this email address. Use the button above to log into the portal and respond in chat.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: emailSubject,
      html: emailHtml,
    });

    console.log(`✅ LinkedIn-style chat notification email sent to ${recipientEmail} from ${senderDisplayName}`);
    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    console.error("⚠️ Failed to send chat email notification:", error);
    return { success: false, message: error.message };
  }
};

export default transporter;
