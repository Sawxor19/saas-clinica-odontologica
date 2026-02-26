import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getPatient, getPatientAppointments } from "@/server/services/patients";
import { notFound } from "next/navigation";
import { getClinicContext } from "@/server/auth/context";
import {
  addAttachmentAction,
  deleteClinicalDocumentAction,
  deleteAttachmentAction,
  issueClinicalDocumentAction,
  updatePatientPhotoAction,
} from "@/app/dashboard/patients/[id]/actions";
import { getClinicalNotes } from "@/server/services/clinicalNotes";
import { listProfilesByIds } from "@/server/repositories/profiles";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { listProceduresByIds } from "@/server/repositories/procedures";
import { ClinicalNotesForm } from "@/app/dashboard/patients/[id]/ClinicalNotesForm";
import { getAttachments, getAttachmentUrl } from "@/server/services/attachments";
import { Odontogram } from "@/app/dashboard/patients/[id]/Odontogram";
import { getOdontogram } from "@/server/services/odontograms";
import Link from "next/link";
import { anamnesisService } from "@/server/services/anamneses";
import { ClinicalDocumentsForm } from "@/app/dashboard/patients/[id]/ClinicalDocumentsForm";
import { getPrescriptionsByPatient } from "@/server/services/prescriptions";

export default async function PatientDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  if (!resolvedParams?.id || resolvedParams.id === "undefined") {
    notFound();
  }
  const patient = await getPatient(resolvedParams.id);
  const appointments = await getPatientAppointments(resolvedParams.id);
  const { clinicId, permissions } = await getClinicContext();
  const clinicalNotes = permissions.readClinical
    ? await getClinicalNotes(resolvedParams.id)
    : [];
  const issuedDocuments = permissions.readClinical
    ? await getPrescriptionsByPatient(resolvedParams.id)
    : [];
  const authorIds = Array.from(
    new Set([
      ...clinicalNotes.map((note) => note.dentist_id),
      ...issuedDocuments.map((item) => item.dentist_id),
    ])
  );
  const authors = authorIds.length > 0
    ? await listProfilesByIds(clinicId, authorIds)
    : [];
  const authorMap = new Map(authors.map((author) => [author.user_id, author.full_name]));

  const procedureIds = Array.from(
    new Set(appointments.map((item) => item.procedure_id).filter(Boolean))
  ) as string[];
  const procedures = procedureIds.length > 0
    ? await listProceduresByIds(clinicId, procedureIds)
    : [];
  const procedureMap = new Map(procedures.map((item) => [item.id, item.name]));

  const completedAppointments = appointments.filter((item) => item.status === "completed");
  const missedAppointments = appointments.filter((item) => item.status === "missed");
  const attendanceBase = completedAppointments.length + missedAppointments.length;
  const attendanceRate = attendanceBase > 0
    ? Math.round((completedAppointments.length / attendanceBase) * 100)
    : 0;

  const paidAppointments = appointments.filter((item) => item.payment_status === "paid");
  const totalPaid = paidAppointments.reduce(
    (sum, item) => sum + Number(item.charge_amount ?? 0),
    0
  );
  const anamneses = await anamnesisService.listResponsesByPatient(resolvedParams.id);

  const attachments = permissions.readClinical
    ? await getAttachments(resolvedParams.id)
    : [];
  const attachmentsWithUrl = await Promise.all(
    attachments.map(async (item) => ({
      ...item,
      url: await getAttachmentUrl(item.file_path),
    }))
  );
  const issuedDocumentsWithUrl = await Promise.all(
    issuedDocuments.map(async (item) => ({
      ...item,
      url: item.file_path ? await getAttachmentUrl(item.file_path) : null,
    }))
  );

  const odontogram = permissions.readClinical
    ? await getOdontogram(resolvedParams.id)
    : null;
  const photoUrl = patient.photo_path ? await getAttachmentUrl(patient.photo_path) : null;
  const signatureUrl = patient.signature_path
    ? await getAttachmentUrl(patient.signature_path)
    : null;
  const booleanLabel = (value: boolean | null | undefined) => {
    if (value === null || value === undefined) return "-";
    return value ? "Sim" : "Não";
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title={patient.full_name}
        description="Ficha completa com dados pessoais e histórico clínico."
        actions={
          <Badge variant="secondary">
            {patient.status === "intake_pending"
              ? "Cadastro pendente"
              : patient.status ?? "active"}
          </Badge>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dados do paciente</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm text-muted-foreground">
            <div>CPF: {patient.cpf ?? "-"}</div>
            <div>Email: {patient.email ?? "-"}</div>
            <div>Telefone: {patient.phone ?? "-"}</div>
            <div>Endereço: {patient.address ?? "-"}</div>
            <div>CEP: {patient.cep ?? "-"}</div>
            <div>Contato emergência: {patient.emergency_contact ?? "-"}</div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Foto do paciente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Foto do paciente"
                  className="h-40 w-full rounded-md object-cover"
                />
              ) : (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Sem foto cadastrada
                </div>
              )}
              {permissions.writePatients ? (
                <form action={updatePatientPhotoAction} className="space-y-2">
                  <input type="hidden" name="patient_id" value={patient.id} />
                  <FileInput
                    name="photo"
                    accept="image/*"
                    required
                    helperText="Foto do paciente"
                  />
                  <Button size="sm" type="submit">
                    Atualizar foto
                  </Button>
                </form>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assinatura digital</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {signatureUrl ? (
                <img
                  src={signatureUrl}
                  alt="Assinatura do paciente"
                  className="h-40 w-full rounded-md object-contain bg-background"
                />
              ) : (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Sem assinatura cadastrada
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alertas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div>Alergias: {patient.allergies ?? "-"}</div>
              <div>Condições: {patient.chronic_conditions ?? "-"}</div>
              <div>Medicamentos: {patient.medications ?? "-"}</div>
              <div>Alertas clínicos: {patient.alerts ?? "-"}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Habitos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div>Fuma: {booleanLabel(patient.smoker)}</div>
              <div>Bebe: {booleanLabel(patient.drinker)}</div>
              <div>Usa drogas: {booleanLabel(patient.drug_use)}</div>
              {patient.drug_use_details ? (
                <div>Quais: {patient.drug_use_details}</div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Taxa de presença</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {attendanceRate}% ({completedAppointments.length} presença(s))
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Faltas</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {missedAppointments.length} falta(s)
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Consultas registradas</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {appointments.length} consulta(s)
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Consultas realizadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {completedAppointments.length === 0 ? (
              <EmptyState
                title="Sem consultas"
                description="As consultas do paciente aparecerão aqui."
              />
            ) : (
              completedAppointments.map((item) => (
                <div key={item.id} className="flex items-center justify-between">
                  <span>
                    {new Date(item.starts_at).toLocaleDateString("pt-BR")}
                  </span>
                  <span>{procedureMap.get(item.procedure_id) ?? "Procedimento"}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Prontuário</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {permissions.readClinical ? (
              <div className="space-y-4">
                {permissions.writeClinicalNotes ? (
                  <ClinicalNotesForm patientId={patient.id} />
                ) : null}

                {clinicalNotes.length === 0 ? (
                  <EmptyState
                    title="Sem evoluções clínicas"
                    description="As evoluções serão listadas aqui com autor e data."
                  />
                ) : (
                  <div className="space-y-3">
                    {clinicalNotes.map((note) => (
                      <div key={note.id} className="rounded-md border p-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{authorMap.get(note.dentist_id) ?? "Profissional"}</span>
                          <span>
                            {new Date(note.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-foreground whitespace-pre-wrap">
                          {note.note}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              "Você não tem permissão para ver evoluções clínicas."
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Receitas e atestados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {permissions.writePrescriptions ? (
              <ClinicalDocumentsForm
                patientId={patient.id}
                action={issueClinicalDocumentAction}
              />
            ) : (
              <div className="text-sm text-muted-foreground">
                VocÃª nÃ£o tem permissÃ£o para emitir documentos clÃ­nicos.
              </div>
            )}

            {issuedDocumentsWithUrl.length === 0 ? (
              <EmptyState
                title="Nenhum documento emitido"
                description="As receitas, atestados e documentos clÃ­nicos emitidos aparecerÃ£o aqui."
              />
            ) : (
              <div className="space-y-2">
                {issuedDocumentsWithUrl.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md border p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium">
                          {item.title || "Documento clÃ­nico"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {authorMap.get(item.dentist_id) ?? "Profissional"} -{" "}
                          {new Date(item.created_at).toLocaleDateString("pt-BR")}
                        </div>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-1 text-[11px]">
                        {item.document_type === "prescription"
                          ? "Receita"
                          : item.document_type === "certificate"
                            ? "Atestado"
                            : "Documento"}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                      {item.content}
                    </p>
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex text-xs text-primary"
                      >
                        Abrir PDF
                      </a>
                    ) : null}
                    {permissions.writePrescriptions ? (
                      <ConfirmForm
                        action={deleteClinicalDocumentAction}
                        message="Remover este documento clinico?"
                        className="mt-2"
                      >
                        <input type="hidden" name="patient_id" value={patient.id} />
                        <input type="hidden" name="document_id" value={item.id} />
                        <Button size="sm" variant="outline" className="text-destructive" type="submit">
                          Remover documento
                        </Button>
                      </ConfirmForm>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Odontograma</CardTitle>
          </CardHeader>
          <CardContent>
            {permissions.readClinical ? (
              <Odontogram
                patientId={patient.id}
                initialData={(odontogram?.data as Record<string, string>) ?? {}}
              />
            ) : (
              <div className="text-sm text-muted-foreground">
                Você não tem permissão para ver o odontograma.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Procedimentos realizados</CardTitle>
          </CardHeader>
          <CardContent>
            {completedAppointments.length === 0 ? (
              <EmptyState
                title="Sem procedimentos ainda"
                description="Procedimentos realizados aparecerão nesta lista."
              />
            ) : (
              <div className="space-y-2 text-sm text-muted-foreground">
                {completedAppointments.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <span>{procedureMap.get(item.procedure_id) ?? "Procedimento"}</span>
                    <span>
                      {new Date(item.starts_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {paidAppointments.length === 0 ? (
              <EmptyState
                title="Nenhum pagamento registrado"
                description="Registre pagamentos para acompanhar o financeiro do paciente."
              />
            ) : (
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="text-sm font-medium text-foreground">
                  Total pago: R$ {totalPaid.toFixed(2)}
                </div>
                {paidAppointments.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <span>
                        {item.paid_at
                          ? new Date(item.paid_at).toLocaleDateString("pt-BR")
                          : "-"}
                      </span>
                      <span>
                        R$ {Number(item.charge_amount ?? 0).toFixed(2)}
                      </span>
                      <span>{item.payment_method ?? "-"}</span>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Anamneses</CardTitle>
          </CardHeader>
          <CardContent>
            {anamneses.length === 0 ? (
              <EmptyState
                title="Sem anamneses enviadas"
                description="As respostas de anamnese do paciente aparecerao aqui."
              />
            ) : (
              <div className="space-y-2 text-sm">
                {anamneses.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded-md border p-2">
                    <div className="space-y-1">
                      <div className="font-medium">{item.form_title}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(item.submitted_at).toLocaleDateString("pt-BR")} -{" "}
                        {item.status === "signed" ? "Assinada" : "Enviada"}
                      </div>
                    </div>
                    <Link href={`/anamneses/responses/${item.id}`}>
                      <Button variant="outline" size="sm">
                        Abrir
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Documentos e radiografias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {permissions.writeClinicalNotes ? (
              <form action={addAttachmentAction} className="grid gap-3 md:grid-cols-3">
                <input type="hidden" name="patient_id" value={patient.id} />
                <select
                  name="category"
                  className="h-12 rounded-2xl border border-input bg-white px-4 text-sm text-foreground"
                >
                  <option value="document">Documento</option>
                  <option value="radiograph">Radiografia</option>
                  <option value="exam">Exame</option>
                  <option value="prescription">Receita</option>
                  <option value="certificate">Atestado</option>
                  <option value="clinical_document">Documento clinico</option>
                  <option value="contract">Contrato</option>
                </select>
                <FileInput
                  name="file"
                  required
                  helperText="Adicionar documento"
                  className="md:col-span-2"
                />
                <Button type="submit" size="sm" className="md:col-span-3">
                  Enviar anexo
                </Button>
              </form>
            ) : null}

            {attachmentsWithUrl.length === 0 ? (
              <EmptyState
                title="Nenhum documento"
                description="Anexos do paciente aparecerão aqui."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {attachmentsWithUrl.map((item) => (
                  <div key={item.id} className="rounded-md border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{item.file_name}</span>
                      <span className="text-xs text-muted-foreground">{item.category}</span>
                    </div>
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex h-9 items-center justify-center rounded-2xl border border-border bg-white px-3 text-sm text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-muted"
                      >
                        Abrir arquivo
                      </a>
                    ) : (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Link indisponivel no momento. Atualize a pagina para gerar novo acesso.
                      </div>
                    )}
                    {permissions.writeClinicalNotes ? (
                      <ConfirmForm
                        action={deleteAttachmentAction}
                        message="Remover este arquivo?"
                        className="mt-2"
                      >
                        <input type="hidden" name="patient_id" value={patient.id} />
                        <input type="hidden" name="attachment_id" value={item.id} />
                        <input type="hidden" name="file_path" value={item.file_path} />
                        <Button size="sm" variant="outline" className="text-destructive" type="submit">
                          Remover
                        </Button>
                      </ConfirmForm>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
