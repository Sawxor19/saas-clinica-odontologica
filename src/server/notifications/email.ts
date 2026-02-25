import { logger } from "@/lib/logger";

type BillingEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type EmailApiResponse = {
  id?: string;
};

const billingEmailApiUrl = process.env.BILLING_EMAIL_API_URL || "https://api.resend.com/emails";
const resendApiKey = process.env.RESEND_API_KEY || "";
const billingEmailFrom = process.env.BILLING_EMAIL_FROM || "";
const billingEmailReplyTo = process.env.BILLING_EMAIL_REPLY_TO || "";

export function isBillingEmailConfigured() {
  return Boolean(resendApiKey && billingEmailFrom);
}

export async function sendBillingEmail(input: BillingEmailInput) {
  if (!isBillingEmailConfigured()) {
    logger.warn("Billing email skipped: provider not configured", {
      hasApiKey: Boolean(resendApiKey),
      hasFrom: Boolean(billingEmailFrom),
      to: input.to,
      subject: input.subject,
    });
    return { id: "skipped" } as const;
  }

  const response = await fetch(billingEmailApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: billingEmailFrom,
      to: [input.to],
      reply_to: billingEmailReplyTo || undefined,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!response.ok) {
    const providerError = await response.text();
    throw new Error(
      `Billing email provider request failed (${response.status}): ${providerError.slice(0, 500)}`
    );
  }

  return (await response.json()) as EmailApiResponse;
}
