import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersTable } from "@/app/dashboard/users/UsersTable";
import { getUsers } from "@/server/services/users";
import { createStaffAction } from "@/app/dashboard/users/actions";
import { Button } from "@/components/ui/button";
import { getClinicContext } from "@/server/auth/context";
import { FileInput } from "@/components/ui/file-input";
import { can } from "@/server/rbac/permissions";

const PERMISSIONS = [
  { key: "manageUsers", label: "Gerenciar usuários" },
  { key: "manageBilling", label: "Gerenciar assinatura" },
  { key: "viewAudit", label: "Auditoria" },
  { key: "readPatients", label: "Ver pacientes" },
  { key: "writePatients", label: "Editar pacientes" },
  { key: "readSchedule", label: "Ver agenda" },
  { key: "writeSchedule", label: "Editar agenda" },
  { key: "readClinical", label: "Ver prontuário" },
  { key: "writeClinicalNotes", label: "Editar prontuário" },
  { key: "writePrescriptions", label: "Prescrições" },
  { key: "readProcedures", label: "Ver procedimentos" },
  { key: "writeBudgets", label: "Orçamentos" },
  { key: "readFinance", label: "Financeiro" },
  { key: "writePayments", label: "Pagamentos" },
  { key: "manageInventory", label: "Estoque" },
  { key: "manageProcedures", label: "Gerenciar procedimentos" },
] as const;

export default async function UsersPage() {
  const users = await getUsers();
  const { permissions, role } = await getClinicContext();
  const canManage = permissions.manageUsers;
  const roles = [
    { role: "admin", label: "Administrador" },
    { role: "dentist", label: "Dentista" },
    { role: "assistant", label: "Auxiliar" },
    { role: "receptionist", label: "Recepcionista" },
  ] as const;

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Usuários" description="Administre funções e permissões da equipe." />
      <Card>
        <CardHeader>
          <CardTitle>Novo profissional</CardTitle>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <form action={createStaffAction} className="grid gap-3 md:grid-cols-3">
              <input
                className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                name="full_name"
                placeholder="Nome completo"
                required
              />
              <input
                className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                name="email"
                type="email"
                placeholder="Email"
                required
              />
              <input
                className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                name="password"
                type="password"
                placeholder="Senha inicial"
                required
              />
              <select
                name="role"
                className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                required
              >
                <option value="">Perfil</option>
                <option value="dentist">Dentista</option>
                <option value="assistant">Auxiliar</option>
                <option value="receptionist">Recepcionista</option>
                <option value="admin">Administrador</option>
              </select>
              <input
                className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                name="phone"
                placeholder="Telefone"
              />
              <input
                className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                name="cpf"
                placeholder="CPF"
              />
              <input
                className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                name="cro"
                placeholder="CRO (dentista)"
              />
              <input
                className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                name="birth_date"
                type="date"
              />
              <input
                className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                name="address"
                placeholder="Endereço"
              />
              <input
                className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                name="cep"
                placeholder="CEP"
              />
              <FileInput
                name="photo"
                accept="image/*"
                helperText="Foto do profissional (opcional)"
                className="md:col-span-2"
              />
              <div className="md:col-span-3">
                <div className="text-sm font-medium">Permissões de acesso</div>
                <p className="text-xs text-muted-foreground">
                  Marque apenas o que o profissional poderá acessar.
                </p>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {PERMISSIONS.map((permission) => (
                    <label
                      key={permission.key}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        name={`perm_${permission.key}`}
                        className="h-4 w-4 rounded border-input"
                      />
                      <span>{permission.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Button type="submit" size="sm">
                Cadastrar profissional
              </Button>
            </form>
          ) : (
            <div className="text-sm text-muted-foreground">
              Somente administradores podem cadastrar profissionais.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Equipe da clínica</CardTitle>
        </CardHeader>
        <CardContent>
          <UsersTable users={users} canEdit={canManage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Permissões por perfil</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {roles.map((item) => {
            const permissions = can(item.role);
            return (
              <div key={item.role} className="rounded-lg border p-4 text-sm">
                <div className="font-medium">{item.label}</div>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {Object.entries(permissions)
                    .filter(([, enabled]) => enabled)
                    .map(([key]) => (
                      <li key={key}>• {key}</li>
                    ))}
                </ul>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
