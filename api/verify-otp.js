import twilio from "twilio";
import crypto from "crypto";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default async function handler(req, res) {

  // ===============================
  // ✅ CORS FIX (REQUIRED FOR SHOPIFY)
  // ===============================
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

    // ===============================
    // SAFETY: ENSURE BODY EXISTS
    // ===============================
    const body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    const { phone, code } = body || {};

    if (!phone || !code) {
      return res.status(400).json({ error: "Missing phone or code" });
    }

    // ===============================
    // VERIFY OTP WITH TWILIO
    // ===============================
   const verificationCheck = await client.verify.v2
  .services(process.env.TWILIO_VERIFY_SERVICE_SID)
  .verificationChecks.create({
    to: phone.startsWith("+") ? phone : `+${phone}`,
    code: code
  });

    if (verificationCheck.status !== "approved") {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // ===============================
    // GENERATE SECURE TOKEN
    // ===============================
    const token = crypto.randomBytes(32).toString("hex");

    // ===============================
    // STORE TOKEN IN MEMORY (DEV)
    // ===============================
    global.validTokens = global.validTokens || {};

    global.validTokens[token] = {
      phone,
      createdAt: Date.now()
    };

    return res.status(200).json({
      success: true,
      token
    });

  } catch (err) {
    console.error("VERIFY OTP ERROR:", err);

    return res.status(500).json({
      error: "Server error",
      details: err.message
    });
  }
}
