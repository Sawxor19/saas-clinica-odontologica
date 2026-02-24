import { NextResponse } from "next/server";
import { z } from "zod";
import { getProvisioningStatus } from "@/server/services/provisioning.service";

const querySchema = z
  .object({
    intentId: z.string().uuid().optional(),
    sessionId: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.intentId || value.sessionId), {
    message: "intentId or session_id is required",
  });

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    intentId: url.searchParams.get("intentId") ?? undefined,
    sessionId: url.searchParams.get("session_id") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  try {
    const result = await getProvisioningStatus({
      intentId: parsed.data.intentId ?? null,
      checkoutSessionId: parsed.data.sessionId ?? null,
    });

    return NextResponse.json({
      ready: result.ready,
      clinicId: result.clinicId,
      job: result.job
        ? {
            jobId: result.job.job_id,
            status: result.job.status,
            errorMessage: result.job.error_message,
            updatedAt: result.job.updated_at,
          }
        : null,
      subscription: result.subscription,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Failed to load provisioning status" },
      { status: 500 }
    );
  }
}
