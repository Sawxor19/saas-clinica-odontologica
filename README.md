# Clinic SaaS

Sistema multiclínica de gestão odontológica com Supabase, Stripe e Next.js (App Router).

## Arquitetura geral
- UI: Next.js + Tailwind + shadcn/ui
- Camadas: UI → Server Actions/Handlers → Services → Repositories → Supabase
- Auth: Supabase Auth (email/senha)
- Billing: Stripe Checkout + Webhooks
- Storage: Supabase Storage (provider abstrato)
- Segurança: RBAC centralizado + RLS no banco

## Fluxo do usuário
1. Cadastro (/signup) com CPF + telefone
2. Verificação de e-mail e OTP (/signup/verify)
3. Checkout no Stripe (/signup/billing)
4. Webhook cria clínica e assinatura
5. Login e acesso ao dashboard

## Configuração do Supabase
1. Crie um projeto no Supabase.
2. Em Authentication, habilite Email/Password.
3. Crie um bucket chamado `clinic-attachments` (Storage).
4. Execute as migrations SQL na ordem:
```
sql/001_schema.sql
sql/002_rls.sql
sql/003_seed.sql
sql/004_add_patient_fields.sql
sql/005_add_patient_cep.sql
sql/006_patient_intake.sql
sql/007_add_intake_patient_id.sql
sql/008_add_rooms_and_appointments_fields.sql
sql/009_materials_and_procedures.sql
sql/010_add_appointment_payment_fields.sql
sql/011_add_appointment_procedure_and_charge.sql
sql/012_payables.sql
sql/013_add_payables_installments.sql
sql/014_add_patient_photo.sql
sql/015_odontograms.sql
sql/016_add_attachments_category.sql
sql/017_add_profile_fields.sql
sql/018_add_appointment_arrived_status.sql
sql/019_add_profile_permissions.sql
sql/020_add_clinic_timezone.sql
sql/021_budget_items_rls.sql
sql/022_signup_verification.sql
sql/023_signup_verification_rls.sql
```

## Configuração do Stripe
1. Crie os produtos e preços para os planos: Mensal, Trimestral, Semestral e Anual.
2. Copie os Price IDs para o `.env`.
3. Configure um webhook apontando para `/api/stripe/webhook`.
4. Copie o webhook secret para o `.env`.

## Variáveis de ambiente
Crie um `.env.local` baseado em `.env.example`.

Obrigatórias:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_TRIAL
- STRIPE_PRICE_MONTHLY
- STRIPE_PRICE_QUARTERLY
- STRIPE_PRICE_SEMIANNUAL
- STRIPE_PRICE_ANNUAL
- NEXT_PUBLIC_APP_URL
- SIGNUP_ENCRYPTION_KEY (32 bytes em hex)
- SIGNUP_HMAC_SECRET (opcional, se não usar SIGNUP_ENCRYPTION_KEY para HMAC)
- REMINDERS_SECRET

Para WhatsApp/SMS:
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_SMS_FROM

Observações:
- SIGNUP_ENCRYPTION_KEY deve ter 32 bytes em hex e também é usado como HMAC para CPF/telefone.
- REMINDERS_SECRET é obrigatório para `/api/reminders` (use o header `x-reminders-secret`).

## Fluxo de verificação
- `/api/signup/intent` cria o usuário (Supabase Auth) e registra o intent.
- `/api/signup/check-email` valida `email_confirmed_at`.
- `/api/signup/send-phone-otp` envia OTP (Twilio).
- `/api/signup/verify-phone` valida OTP.
- `/api/billing/checkout` cria o checkout após verificação.

## Segurança e LGPD
- CPF não é armazenado em texto puro; usamos `cpf_hash` (HMAC-SHA256).
- Telefone é armazenado como `phone_hash` (HMAC-SHA256) e `phone_e164` com acesso restrito.
- `signup_intents` e `signup_audit_logs` são acessíveis apenas via Service Role.

## Timezone da clínica
O campo `clinics.timezone` controla a agenda e os lembretes.
Valor padrão: `America/Sao_Paulo`.
Pode ser atualizado em `/dashboard/profile`.

## Jobs e automações
- Lembretes: agende um cron para `POST /api/reminders` com header `x-reminders-secret`. Restrinja por IP/cron no provedor (ex: Vercel Cron + allowlist).
- Limpeza: rode `npm run cleanup:expired` diariamente para remover `patient_intake_links` expirados/usados e `signup_intents` com mais de 7 dias.

## Rodar local
1. Instale dependências
2. Inicie o servidor
3. Abra http://localhost:3000

## Testes (Playwright)
- Configure `E2E_BASE_URL` e credenciais de teste no ambiente.
- Rode: `npm run test`

## Deploy (Vercel)
1. Crie um projeto na Vercel.
2. Configure as variáveis de ambiente.
3. Faça o deploy.

## Como vender o produto
- Posicione como SaaS simples e acessível para clínicas pequenas.
- Use trial pago com cartão obrigatório para reduzir inadimplência.
- Mantenha onboarding rápido e suporte humanizado no início.

## Como adicionar um novo módulo
Checklist:
- Criar tabela + RLS + policies no SQL
- Criar repository e service
- Criar rotas UI
- Adicionar permissões no RBAC
- Adicionar testes mínimos

## Sobre o Next.js
Este projeto usa [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) para otimizar e carregar automaticamente o [Geist](https://vercel.com/font), uma nova família de fontes da Vercel.

## Saiba mais
Para entender melhor o Next.js, consulte:
- [Documentação do Next.js](https://nextjs.org/docs) - recursos e API do Next.js.
- [Learn Next.js](https://nextjs.org/learn) - tutorial interativo de Next.js.

Você também pode visitar o [repositório do Next.js no GitHub](https://github.com/vercel/next.js) — feedbacks e contribuições são bem-vindos.

## Deploy na Vercel
A forma mais simples de fazer deploy do seu app Next.js é usar a [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme), criada pelos autores do Next.js.

Confira a [documentação de deploy do Next.js](https://nextjs.org/docs/app/building-your-application/deploying) para mais detalhes.
