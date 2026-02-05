const express = require("express");
const axios = require("axios");
const router = express.Router();
const verifyToken = require("../middleware/auth");

const mailjetClient = axios.create({
  baseURL: "https://api.mailjet.com/v3.1",
  auth: {
    username: process.env.MAILJET_API_KEY,
    password: process.env.MAILJET_API_SECRET,
  },
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * POST /mail/send
 * Send an email using Mailjet
 * Requires Bearer token
 */
router.post("/send", verifyToken, async (req, res) => {
  try {
    const {
      toEmail,
      toName,
      subject,
      text,
      html,
      fromEmail,
      fromName,
    } = req.body || {};

    if (!toEmail || !subject || (!text && !html)) {
      return res.status(400).json({
        success: false,
        message: "toEmail, subject, and either text or html are required",
      });
    }

    if (!process.env.MAILJET_API_KEY || !process.env.MAILJET_API_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Mailjet credentials are not configured",
      });
    }

    const senderEmail = fromEmail || process.env.MAILJET_FROM_EMAIL;
    const senderName = fromName || process.env.MAILJET_FROM_NAME || "Mommy First";

    if (!senderEmail) {
      return res.status(400).json({
        success: false,
        message: "fromEmail is required if MAILJET_FROM_EMAIL is not set",
      });
    }

    const payload = {
      Messages: [
        {
          From: {
            Email: senderEmail,
            Name: senderName,
          },
          To: [
            {
              Email: toEmail,
              Name: toName || undefined,
            },
          ],
          Subject: subject,
          TextPart: text || undefined,
          HTMLPart: html || undefined,
        },
      ],
    };

    const response = await mailjetClient.post("/send", payload);

    return res.status(200).json({
      success: true,
      message: "Email sent",
      data: response.data,
    });
  } catch (error) {
    const status = error.response?.status || 500;
    const data = error.response?.data || null;

    return res.status(status).json({
      success: false,
      message: "Failed to send email",
      error: error.message,
      details: data,
    });
  }
});

module.exports = router;
