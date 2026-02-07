import { Badge } from "@/components/ui/badge";

const statusStyles: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  scheduled: { label: "Agendado", variant: "outline" },
  confirmed: { label: "Confirmado", variant: "default" },
  arrived: { label: "Chegou", variant: "secondary" },
  in_progress: { label: "Em atendimento", variant: "secondary" },
  completed: { label: "Finalizado", variant: "secondary" },
  missed: { label: "Faltou", variant: "outline" },
  cancelled: { label: "Cancelado", variant: "outline" },
  paid: { label: "Pago", variant: "default" },
  pending: { label: "Pendente", variant: "outline" },
  overdue: { label: "Vencido", variant: "outline" },
};

export function StatusBadge({ status }: { status: string }) {
  const entry = statusStyles[status] ?? { label: status, variant: "outline" };
  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}
