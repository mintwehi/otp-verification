import twilio from "twilio";
import crypto from "crypto";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default async function handler(req, res) {

  // =========================
  // CORS (Shopify required)
  // =========================
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {

    // =========================
    // ENV CHECK (IMPORTANT FIX)
    // =========================
    const SERVICE_SID = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!SERVICE_SID || !SERVICE_SID.startsWith("VA")) {
      console.error("INVALID VERIFY SERVICE SID:", SERVICE_SID);
      return res.status(500).json({
        error: "Twilio Verify Service SID missing or invalid"
      });
    }

    // =========================
    // SAFE BODY PARSING
    // =========================
    const body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    const { phone, code } = body || {};

    if (!phone || !code) {
      return res.status(400).json({ error: "Missing phone or code" });
    }

    // =========================
    // NORMALIZE PHONE
    // =========================
    const formattedPhone = phone.startsWith("+")
      ? phone
      : `+${phone}`;

    // =========================
    // TWILIO VERIFY CHECK
    // =========================
    const verificationCheck = await client.verify.v2
      .services(SERVICE_SID)
      .verificationChecks.create({
        to: formattedPhone,
        code: code
      });

    if (verificationCheck.status !== "approved") {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // =========================
    // TOKEN GENERATION
    // =========================
    const token = crypto.randomBytes(32).toString("hex");

    global.validTokens = global.validTokens || {};
    global.validTokens[token] = {
      phone: formattedPhone,
      createdAt: Date.now()
    };

    return res.status(200).json({
      success: true,
      token
    });

  } catch (err) {

    console.error("VERIFY OTP FAILED:", err);

    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
}
