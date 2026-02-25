import { NextResponse } from "next/server";
import { supabaseServerClient } from "@/server/db/supabaseServer";
import { BillingService } from "@/services/BillingService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const priceId = process.env.STRIPE_PRICE_ID;

  if (!appUrl || !priceId) {
    return NextResponse.json(
      { error: "Variaveis STRIPE_PRICE_ID e NEXT_PUBLIC_APP_URL sao obrigatorias." },
      { status: 500 }
    );
  }

  const supabase = await supabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Nao autenticado." }, { status: 401 });
  }

  try {
    const service = new BillingService();
    const url = await service.createCheckoutSession({
      userId: user.id,
      email: user.email ?? null,
      appUrl,
      priceId,
    });
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Falha ao criar checkout." },
      { status: 400 }
    );
  }
}
