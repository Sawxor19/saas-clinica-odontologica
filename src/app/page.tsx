import Link from "next/link";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowUpRight,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardList,
  Clock3,
  Database,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  WalletCards,
  Workflow,
} from "lucide-react";
import styles from "./page.module.css";

type Feature = {
  title: string;
  description: string;
  icon: LucideIcon;
};

type Plan = {
  name: string;
  value: string;
  cadence: string;
  highlight: string;
  focus: string;
};

const heroStats = [
  { label: "Tempo medio de agenda", value: "-37%" },
  { label: "No-show monitorado", value: "98.4%" },
  { label: "Visao de caixa diaria", value: "Tempo real" },
];

const features: Feature[] = [
  {
    title: "Operacao clinica conectada",
    description:
      "Recepcao, dentista e financeiro trabalham em um fluxo unico sem retrabalho.",
    icon: Workflow,
  },
  {
    title: "Odontologia orientada por dados",
    description:
      "Indicadores de agenda, retorno e faturamento com leitura rapida para decisao.",
    icon: ChartNoAxesCombined,
  },
  {
    title: "Prontuario e historico centralizados",
    description: "Linha do tempo clinica por paciente com anexos e contexto completo.",
    icon: ClipboardList,
  },
  {
    title: "Seguranca de nivel empresarial",
    description:
      "Controle de acesso por funcao, trilha de auditoria e isolamento por clinica.",
    icon: ShieldCheck,
  },
  {
    title: "Financeiro previsivel",
    description: "Visual unico para cobrancas, recebimentos e performance da carteira.",
    icon: WalletCards,
  },
  {
    title: "Base confiavel para crescer",
    description:
      "Estrutura preparada para multiprofissional, multiplas unidades e escala.",
    icon: Database,
  },
];

const plans: Plan[] = [
  {
    name: "Trial",
    value: "30 dias",
    cadence: "Cartao obrigatorio",
    highlight: "Ambiente completo para validar o fluxo inteiro.",
    focus: "Sem bloqueios de funcionalidade durante o teste.",
  },
  {
    name: "Mensal",
    value: "R$ 49,90",
    cadence: "por mes",
    highlight: "Entrada rapida para equipes em fase de implantacao.",
    focus: "Maior flexibilidade para ajustar operacao mes a mes.",
  },
  {
    name: "Trimestral",
    value: "R$ 139,90",
    cadence: "a cada 3 meses",
    highlight: "Menos rotinas de renovacao com custo mais eficiente.",
    focus: "Economia frente ao ciclo mensal com previsibilidade.",
  },
  {
    name: "Semestral",
    value: "R$ 269,90",
    cadence: "a cada 6 meses",
    highlight: "Ciclo ideal para planejar expansao com estabilidade.",
    focus: "Melhor relacao entre horizonte operacional e custo.",
  },
  {
    name: "Anual",
    value: "R$ 499,90",
    cadence: "a cada 12 meses",
    highlight: "Maxima eficiencia para operacao de longo prazo.",
    focus: "Maior economia proporcional entre todos os ciclos.",
  },
];

const operationFlow = [
  {
    title: "Intake e recepcao",
    detail: "Dados de entrada, confirmacoes e triagem inicial sem gargalo.",
    icon: CalendarDays,
  },
  {
    title: "Atendimento clinico",
    detail: "Registro estruturado do atendimento e acompanhamento do plano.",
    icon: Stethoscope,
  },
  {
    title: "Monitoramento continuo",
    detail: "Alertas, retorno de paciente e analise de performance em um painel.",
    icon: Activity,
  },
];

const boardRows = [
  { label: "Agenda ativa", value: "86%", width: "86%" },
  { label: "Pacientes recorrentes", value: "72%", width: "72%" },
  { label: "Receita prevista", value: "91%", width: "91%" },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <div className={styles.background} aria-hidden />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 pb-6 pt-8 md:px-8 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-cyan-500/40 bg-cyan-400/10 text-cyan-200 shadow-[0_0_22px_rgba(34,211,238,0.35)]">
            <Image src="/logo.png" alt="E-Clinic" width={28} height={28} className="h-7 w-7 object-contain" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[0.25em] text-cyan-200/90">
              E-CLINIC DATA
            </p>
            <p className="text-xs text-slate-400">Dental operations intelligence</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login" className={styles.loginButton}>
            Entrar
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid w-full max-w-7xl gap-12 px-6 pb-16 md:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:pb-24">
          <div className={`${styles.reveal} space-y-8`}>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-400/10 px-4 py-2 text-xs uppercase tracking-[0.16em] text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              Software para clinicas orientadas por performance
            </div>

            <div className="space-y-6">
              <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-white md:text-5xl">
                A pagina inicial da sua clinica nao pode parecer comum.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-slate-300 md:text-lg">
                O E-Clinic conecta operacao odontologica, dados de atendimento e leitura financeira
                em uma plataforma com visual executivo e ritmo de equipe real.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link href="/signup" className={styles.ctaButton}>
                Criar conta com trial de 30 dias
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <a href="#planos" className={styles.ghostButton}>
                Ver estrutura de planos
              </a>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {heroStats.map((item, index) => (
                <article
                  key={item.label}
                  className={`${styles.metricCard} ${styles.reveal}`}
                  style={{ animationDelay: `${120 + index * 100}ms` }}
                >
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className={`${styles.reveal} ${styles.dataPanel}`} style={{ animationDelay: "180ms" }}>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium uppercase tracking-[0.16em] text-cyan-200">
                  Painel operacional
                </p>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
                  Online agora
                </span>
              </div>

              <div className="space-y-4">
                {boardRows.map((row) => (
                  <div key={row.label} className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>{row.label}</span>
                      <span>{row.value}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-900/70">
                      <div className={styles.boardBar} style={{ width: row.width }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <article className={styles.smallDataCard}>
                  <Clock3 className="h-4 w-4 text-cyan-200" />
                  <p className="text-xs text-slate-400">Tempo de resposta</p>
                  <p className="text-sm font-semibold text-white">2m 12s</p>
                </article>
                <article className={styles.smallDataCard}>
                  <ChartNoAxesCombined className="h-4 w-4 text-cyan-200" />
                  <p className="text-xs text-slate-400">Conversao diaria</p>
                  <p className="text-sm font-semibold text-white">+14.6%</p>
                </article>
                <article className={styles.smallDataCard}>
                  <Activity className="h-4 w-4 text-cyan-200" />
                  <p className="text-xs text-slate-400">Atividade clinica</p>
                  <p className="text-sm font-semibold text-white">Alta</p>
                </article>
              </div>
            </div>
          </aside>
        </section>

        <section id="planos" className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-8 lg:px-10 lg:pb-24">
          <div className={`${styles.reveal} space-y-3`} style={{ animationDelay: "120ms" }}>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Planos e ciclos</p>
            <h2 className="max-w-3xl text-3xl font-semibold text-white md:text-4xl">
              Estrutura clara de investimento para cada etapa da clinica
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {plans.map((plan, index) => (
              <article
                key={plan.name}
                className={`${styles.planCard} ${styles.reveal}`}
                style={{ animationDelay: `${140 + index * 70}ms` }}
              >
                <p className="text-xs uppercase tracking-[0.16em] text-cyan-200">{plan.name}</p>
                <p className="mt-4 text-3xl font-semibold text-white">{plan.value}</p>
                <p className="mt-1 text-xs text-slate-400">{plan.cadence}</p>
                <p className="mt-5 text-sm font-medium text-slate-100">{plan.highlight}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">{plan.focus}</p>
              </article>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-cyan-500/30 bg-cyan-400/10 p-6 text-sm text-cyan-50 md:flex md:items-center md:justify-between md:gap-8">
            <p className="leading-relaxed">
              Um unico botao de entrada: crie sua conta, valide o trial e siga para o dashboard com
              provisionamento seguro.
            </p>
            <div className="mt-4 text-xs uppercase tracking-[0.16em] text-cyan-100 md:mt-0">
              Checkout Stripe + verificacao de perfil + onboarding guiado
            </div>
          </div>
        </section>

        <section id="recursos" className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-8 lg:px-10 lg:pb-24">
          <div className={`${styles.reveal} space-y-3`} style={{ animationDelay: "80ms" }}>
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Recursos principais</p>
            <h2 className="max-w-3xl text-3xl font-semibold text-white md:text-4xl">
              Dados, clinica e odontologia em uma arquitetura unica
            </h2>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => (
              <article
                key={feature.title}
                className={`${styles.featureCard} ${styles.reveal}`}
                style={{ animationDelay: `${120 + index * 80}ms` }}
              >
                <feature.icon className="h-5 w-5 text-cyan-200" />
                <h3 className="mt-4 text-lg font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 pb-16 md:px-8 lg:px-10 lg:pb-24">
          <div className={`${styles.reveal} ${styles.flowPanel}`} style={{ animationDelay: "120ms" }}>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-200">Fluxo operacional</p>
              <h2 className="text-3xl font-semibold text-white md:text-4xl">
                Da recepcao ao resultado financeiro sem silos
              </h2>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {operationFlow.map((step, index) => (
                <article key={step.title} className={styles.flowStep}>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-xs font-semibold text-cyan-100">
                      {index + 1}
                    </span>
                    <step.icon className="h-4 w-4 text-cyan-200" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-white">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-300">{step.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
