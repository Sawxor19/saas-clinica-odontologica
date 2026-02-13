import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const smsFrom = process.env.TWILIO_SMS_FROM || "";

export function isSmsConfigured() {
  return Boolean(accountSid && authToken && smsFrom);
}

export async function sendSmsMessage({
  to,
  body,
}: {
  to: string;
  body: string;
}) {
  if (!isSmsConfigured()) {
    if (process.env.NODE_ENV !== "production") {
      return { sid: "dev-sms", status: "skipped" } as const;
    }
    throw new Error("Missing Twilio SMS credentials");
  }

  const client = twilio(accountSid, authToken);
  return client.messages.create({
    from: smsFrom,
    to,
    body,
  });
}
