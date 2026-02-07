import { NextRequest } from "next/server";
import { sendAutomaticReminders } from "@/server/services/reminders";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = process.env.REMINDERS_SECRET;
  if (!secret) {
    return new Response("Missing REMINDERS_SECRET", { status: 500 });
  }
  const header = request.headers.get("x-reminders-secret");
  if (header !== secret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const result = await sendAutomaticReminders();
  return Response.json({ ok: true, sent: result.length });
}
