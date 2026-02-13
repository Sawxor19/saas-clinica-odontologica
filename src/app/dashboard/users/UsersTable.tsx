"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { removeUserAction, updateUserRoleAction } from "@/app/dashboard/users/actions";

type UserRow = {
  user_id: string;
  full_name: string;
  role: string;
  phone?: string | null;
  cpf?: string | null;
  cro?: string | null;
  birth_date?: string | null;
  address?: string | null;
  cep?: string | null;
  photo_url?: string | null;
  created_at: string;
};

const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador" },
  { value: "dentist", label: "Dentista" },
  { value: "assistant", label: "Auxiliar" },
  { value: "receptionist", label: "Recepcionista" },
];

export function UsersTable({
  users,
  canEdit = false,
}: {
  users: UserRow[];
  canEdit?: boolean;
}) {
  const [roleMap, setRoleMap] = useState<Record<string, string>>({});

  return (
    <div className="space-y-3">
      {users.map((user) => {
        const selectedRole = roleMap[user.user_id] ?? user.role;
        return (
          <div key={user.user_id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted">
                  {user.photo_url ? (
                    <Image
                      src={user.photo_url}
                      alt={user.full_name}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                      unoptimized
                    />
                  ) : null}
                </div>
                <div>
                  <div className="text-sm font-medium">{user.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {user.phone ?? "Sem telefone"} · CPF {user.cpf ?? "-"}
                  </div>
                  {user.cro ? (
                    <div className="text-xs text-muted-foreground">CRO {user.cro}</div>
                  ) : null}
                  <div className="text-xs text-muted-foreground">
                    Desde {new Date(user.created_at).toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <form action={updateUserRoleAction} className="flex items-center gap-2">
                  <input type="hidden" name="user_id" value={user.user_id} />
                  <select
                    name="role"
                    className="h-10 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                    value={selectedRole}
                    onChange={(event) =>
                      setRoleMap((prev) => ({ ...prev, [user.user_id]: event.target.value }))
                    }
                    disabled={!canEdit}
                  >
                    {ROLE_OPTIONS.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  {canEdit ? (
                    <Button type="submit" size="sm">
                      Editar
                    </Button>
                  ) : null}
                </form>
                {canEdit ? (
                  <form
                    action={removeUserAction}
                    onSubmit={(event) => {
                      if (!window.confirm("Remover este usuário?")) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="user_id" value={user.user_id} />
                    <Button type="submit" size="sm" variant="destructive">
                      Remover
                    </Button>
                  </form>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
      {users.length === 0 ? (
        <div className="text-sm text-muted-foreground">Nenhum usuário encontrado.</div>
      ) : null}
    </div>
  );
}
