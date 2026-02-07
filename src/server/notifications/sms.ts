import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const smsFrom = process.env.TWILIO_SMS_FROM || "";

export async function sendSmsMessage({
  to,
  body,
}: {
  to: string;
  body: string;
}) {
  if (!accountSid || !authToken || !smsFrom) {
    throw new Error("Missing Twilio SMS credentials");
  }

  const client = twilio(accountSid, authToken);
  return client.messages.create({
    from: smsFrom,
    to,
    body,
  });
}
