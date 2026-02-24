import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { supabaseServerClient } from "@/server/db/supabaseServer";
import { supabaseAdmin } from "@/server/db/supabaseAdmin";
import { getClinicContext } from "@/server/auth/context";
import { updateProfileAction } from "@/app/dashboard/profile/actions";
import { DeleteAccountCard } from "@/app/dashboard/profile/DeleteAccountCard";

export default async function ProfilePage() {
  const { clinicId } = await getClinicContext();
  const supabase = await supabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, cpf, address, cep, role")
    .eq("user_id", user?.id ?? "")
    .single();

  const { data: clinic } = await supabase
    .from("clinics")
    .select("name, whatsapp_number, timezone, owner_user_id")
    .eq("id", clinicId)
    .single();

  const admin = supabaseAdmin();
  const { count: membershipCount } = await admin
    .from("memberships")
    .select("user_id", { count: "exact", head: true })
    .eq("clinic_id", clinicId);

  const canDeleteOwnAccount =
    profile?.role === "admin" && Boolean(user?.id && clinic?.owner_user_id === user.id);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Meu perfil"
        description="Confira e complete os dados da clinica e do administrador."
      />

      <Card>
        <CardHeader>
          <CardTitle>Assinatura</CardTitle>
        </CardHeader>
        <CardContent>
          <Link href="/billing">
            <Button variant="outline">Gerenciar assinatura</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados da clinica</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" action={updateProfileAction}>
            <Input
              name="clinic_name"
              placeholder="Nome da clinica"
              defaultValue={clinic?.name ?? ""}
              required
            />
            <Input
              name="whatsapp_number"
              placeholder="Telefone/WhatsApp"
              defaultValue={clinic?.whatsapp_number ?? ""}
            />
            <Input
              name="timezone"
              placeholder="Timezone (ex: America/Sao_Paulo)"
              defaultValue={clinic?.timezone ?? ""}
            />
            <Input
              name="address"
              placeholder="Endereco da clinica"
              defaultValue={profile?.address ?? ""}
              className="md:col-span-2"
            />
            <Input name="cep" placeholder="CEP" defaultValue={profile?.cep ?? ""} />
            <Input name="cpf" placeholder="CPF/CNPJ" defaultValue={profile?.cpf ?? ""} />
            <Input
              name="full_name"
              placeholder="Nome do responsavel"
              defaultValue={profile?.full_name ?? ""}
              className="md:col-span-2"
            />
            <div className="md:col-span-2">
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Zona de perigo</CardTitle>
        </CardHeader>
        <CardContent>
          <DeleteAccountCard
            email={user?.email ?? ""}
            canDeleteOwnAccount={canDeleteOwnAccount}
            membershipCount={membershipCount ?? 0}
          />
        </CardContent>
      </Card>
    </div>
  );
}
