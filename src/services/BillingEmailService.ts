import type Stripe from "stripe";
import { stripe } from "@/server/billing/stripe";
import { logger } from "@/lib/logger";
import { sendBillingEmail } from "@/server/notifications/email";

function asString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function formatDateFromUnix(unix: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(unix * 1000));
}

function formatCurrency(amountInCents: number, currency?: string | null) {
  const safeCurrency = (currency || "BRL").toUpperCase();
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: safeCurrency,
  }).format(amountInCents / 100);
}

export class BillingEmailService {
  async sendCheckoutConfirmation(session: Stripe.Checkout.Session) {
    const email = await this.resolveCheckoutEmail(session);
    if (!email) {
      logger.warn("Checkout confirmation email skipped: email not found", {
        sessionId: session.id,
      });
      return;
    }

    const subscriptionId = asString(session.subscription);
    let trialEndText: string | null = null;
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (subscription.trial_end) {
        trialEndText = formatDateFromUnix(subscription.trial_end);
      }
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const dashboardUrl = appUrl ? `${appUrl}/dashboard` : "";
    const plan = asString(session.metadata?.plan) || "mensal";
    const subject = trialEndText
      ? "Seu teste gratis foi ativado com sucesso"
      : "Assinatura ativada com sucesso";
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        <h2 style="margin:0 0 12px">Contratacao confirmada</h2>
        <p>Recebemos sua contratacao do plano <strong>${plan}</strong>.</p>
        ${
          trialEndText
            ? `<p>Seu periodo de teste esta ativo ate <strong>${trialEndText}</strong>.</p>`
            : "<p>Sua assinatura ja esta ativa para uso.</p>"
        }
        ${
          dashboardUrl
            ? `<p><a href="${dashboardUrl}" target="_blank" rel="noopener noreferrer">Acessar dashboard</a></p>`
            : ""
        }
      </div>
    `;
    const text = trialEndText
      ? `Contratacao confirmada. Seu periodo de teste esta ativo ate ${trialEndText}.`
      : "Contratacao confirmada. Sua assinatura ja esta ativa para uso.";

    await sendBillingEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  async sendInvoiceReceipt(invoice: Stripe.Invoice) {
    const amountPaid = invoice.amount_paid ?? 0;
    if (amountPaid <= 0) {
      return;
    }

    const email = await this.resolveInvoiceEmail(invoice);
    if (!email) {
      logger.warn("Invoice receipt email skipped: email not found", {
        invoiceId: invoice.id,
      });
      return;
    }

    const amountText = formatCurrency(amountPaid, invoice.currency);
    const invoiceNumber = asString(invoice.number);
    const hostedInvoiceUrl = asString(invoice.hosted_invoice_url);
    const invoicePdf = asString(invoice.invoice_pdf);
    const paidAtUnix = invoice.status_transitions?.paid_at || invoice.created;
    const paidAtText = formatDateFromUnix(paidAtUnix);

    const subject = invoiceNumber
      ? `Recibo de pagamento ${invoiceNumber}`
      : "Recibo de pagamento";

    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827">
        <h2 style="margin:0 0 12px">Recibo de pagamento</h2>
        <p>Pagamento confirmado no valor de <strong>${amountText}</strong>.</p>
        <p>Data do pagamento: <strong>${paidAtText}</strong>.</p>
        ${invoiceNumber ? `<p>Fatura: <strong>${invoiceNumber}</strong>.</p>` : ""}
        ${hostedInvoiceUrl ? `<p><a href="${hostedInvoiceUrl}" target="_blank" rel="noopener noreferrer">Ver fatura online</a></p>` : ""}
        ${invoicePdf ? `<p><a href="${invoicePdf}" target="_blank" rel="noopener noreferrer">Baixar PDF do recibo</a></p>` : ""}
      </div>
    `;

    const text = [
      `Pagamento confirmado: ${amountText}.`,
      `Data: ${paidAtText}.`,
      invoiceNumber ? `Fatura: ${invoiceNumber}.` : null,
      hostedInvoiceUrl ? `Fatura online: ${hostedInvoiceUrl}` : null,
      invoicePdf ? `PDF: ${invoicePdf}` : null,
    ]
      .filter(Boolean)
      .join(" ");

    await sendBillingEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  private async resolveCheckoutEmail(session: Stripe.Checkout.Session) {
    const fromCustomerDetails = asString(session.customer_details?.email);
    const fromCustomerEmail = asString(session.customer_email);
    if (fromCustomerDetails || fromCustomerEmail) {
      return fromCustomerDetails || fromCustomerEmail;
    }

    const customerId = asString(session.customer);
    if (!customerId) {
      return null;
    }

    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return null;
    }

    return asString(customer.email);
  }

  private async resolveInvoiceEmail(invoice: Stripe.Invoice) {
    const fromInvoice = asString(invoice.customer_email);
    if (fromInvoice) {
      return fromInvoice;
    }

    const customerId = asString(invoice.customer);
    if (!customerId) {
      return null;
    }

    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) {
      return null;
    }

    return asString(customer.email);
  }
}
