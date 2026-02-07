import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";

export async function sendWhatsAppMessage({
  to,
  from,
  body,
}: {
  to: string;
  from: string;
  body: string;
}) {
  if (!accountSid || !authToken) {
    throw new Error("Missing Twilio credentials");
  }

  const client = twilio(accountSid, authToken);
  return client.messages.create({
    from: `whatsapp:${from}`,
    to: `whatsapp:${to}`,
    body,
  });
}
