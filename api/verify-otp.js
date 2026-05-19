import twilio from "twilio";
import crypto from "crypto";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { phone, code } = req.body;

  try {
    // VERIFY OTP WITH TWILIO
    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: phone,
        code: code
      });

    if (verificationCheck.status !== "approved") {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    // CREATE SECURE TOKEN
    const token = crypto.randomBytes(32).toString("hex");

    // STORE TOKEN IN MEMORY (simple version)
    // For production later, upgrade to Redis
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
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
