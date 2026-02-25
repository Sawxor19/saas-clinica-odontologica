import { NextRequest } from "next/server";
import { getClinicContext } from "@/server/auth/context";
import { assertPermission } from "@/server/rbac/guard";
import { getFinanceSummary } from "@/server/services/finance";
import { getPayables } from "@/server/services/payables";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";

export const runtime = "nodejs";

function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => {
    const str = String(value ?? "");
    return `"${str.replace(/"/g, '""')}"`;
  };

  const lines = [headers.join(",")];
  rows.forEach((row) => {
    lines.push(headers.map((key) => escape(row[key])).join(","));
  });

  return lines.join("\n");
}

async function buildPdf(title: string, lines: string[]) {
  const doc = new PDFDocument({ margin: 40 });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  doc.fontSize(16).text(title, { align: "left" });
  doc.moveDown();

  if (lines.length === 0) {
    doc.fontSize(10).text("Sem dados para o periodo.");
  } else {
    lines.forEach((line) => {
      doc.fontSize(10).text(line);
    });
  }

  doc.end();
  await new Promise<void>((resolve) => doc.on("end", () => resolve()));

  return Buffer.concat(chunks);
}

function csvResponse(csv: string, filename: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  });
}

function pdfResponse(pdf: Buffer, filename: string) {
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=${filename}`,
    },
  });
}

export async function GET(request: NextRequest) {
  const { permissions } = await getClinicContext();
  assertPermission(permissions, "readFinance");

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "payments";
  const format = searchParams.get("format") ?? "csv";

  if (type === "payables") {
    const payables = await getPayables();
    const rows = payables.map((item) => ({
      name: item.name,
      amount: Number(item.amount ?? 0).toFixed(2),
      due_date: item.due_date,
      payment_method: item.payment_method ?? "",
      installments: item.installments ?? "",
      is_paid: item.is_paid ? "yes" : "no",
    }));

    if (format === "pdf") {
      const lines = rows.map(
        (row) =>
          `${row.name} | R$ ${row.amount} | Vencimento ${row.due_date} | ${row.payment_method} | ${row.installments || ""} | ${row.is_paid}`
      );
      const pdf = await buildPdf("Relatorio - Contas a pagar", lines);
      return pdfResponse(pdf, "payables.pdf");
    }

    return csvResponse(toCsv(rows), "payables.csv");
  }

  if (type === "receivables") {
    const summary = await getFinanceSummary();
    const rows = summary.receivables.map((item) => ({
      due_date: item.due_date ?? "",
      patient: item.patient_name ?? "",
      procedure: item.procedure_name ?? "",
      amount: Number(item.charge_amount ?? 0).toFixed(2),
      status: item.due_status === "overdue" ? "overdue" : "pending",
    }));

    if (format === "pdf") {
      const lines = rows.map(
        (row) =>
          `${row.due_date || "-"} | ${row.patient} | ${row.procedure} | R$ ${row.amount} | ${row.status}`
      );
      const pdf = await buildPdf("Relatorio - Contas a receber", lines);
      return pdfResponse(pdf, "receivables.pdf");
    }

    return csvResponse(toCsv(rows), "receivables.csv");
  }

  const summary = await getFinanceSummary();
  const rows = summary.payments.map((item) => ({
    paid_at: item.paid_at,
    patient: item.patient_name ?? "",
    procedure: item.procedure_name ?? "",
    amount: Number(item.charge_amount ?? 0).toFixed(2),
    method: item.payment_method ?? "",
  }));

  if (format === "pdf") {
    const lines = rows.map(
      (row) => `${row.paid_at ?? "-"} | ${row.patient} | ${row.procedure} | R$ ${row.amount} | ${row.method}`
    );
    const pdf = await buildPdf("Relatorio - Pagamentos", lines);
    return pdfResponse(pdf, "payments.pdf");
  }

  return csvResponse(toCsv(rows), "payments.csv");
}
