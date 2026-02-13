export default function Home() {
  const pricing = [
    {
      key: "trial",
      name: "Teste 30 dias",
      price: 0.01,
      period: "30 dias",
      highlight: "Teste completo",
    },
    {
      key: "monthly",
      name: "Mensal",
      price: 49.9,
      months: 1,
    },
    {
      key: "quarterly",
      name: "Trimestral",
      price: 139.9,
      months: 3,
    },
    {
      key: "semiannual",
      name: "Semestral",
      price: 269.9,
      months: 6,
    },
    {
      key: "annual",
      name: "Anual",
      price: 499.9,
      months: 12,
    },
  ];

  const monthly = 49.9;

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="text-xl font-semibold">E-Clinic!</div>
        <div className="flex items-center gap-3">
          <a className="text-sm text-muted-foreground" href="/login">
            Entrar
          </a>
          <a
            className="inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            href="/signup"
          >
            Criar conta
          </a>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-10 px-6 pb-24 pt-12 lg:grid-cols-2">
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold leading-tight">
            Cuidando da gestão da sua clínica com inteligência e tecnologia!
          </h1>
          <p className="text-lg text-muted-foreground">
            Pacientes, agenda, prontuário, orçamentos e financeiro em um fluxo
            claro e rápido.
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
              30 dias de teste grátis
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
              Relatórios em tempo real
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1">
              Segurança clínica (LGPD)
            </span>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              className="inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
              href="/signup"
            >
              Testar com cartão
            </a>
            <a
              className="inline-flex h-11 items-center rounded-md border border-input px-5 text-sm"
              href="/login"
            >
              Já tenho conta
            </a>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Reduza faltas com lembretes automáticos",
              "Acompanhe receitas e pendências com 1 clique",
              "Tenha visão completa por profissional e sala",
              "Centralize histórico e anexos do paciente",
            ].map((text) => (
              <div
                key={text}
                className="rounded-lg border border-emerald-400/20 bg-card/60 p-4 text-sm"
              >
                {text}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="grid gap-4">
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Fluxo principal</p>
              <p className="text-sm text-muted-foreground">
                Paciente → Agenda → Prontuário → Orçamento → Pagamento
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Multi-clínica com RBAC</p>
              <p className="text-sm text-muted-foreground">
                Dados isolados por clínica e perfis por função.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Cobrança recorrente</p>
              <p className="text-sm text-muted-foreground">
                Teste 30 dias + planos mensais e anuais com Stripe.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <p className="text-sm font-medium">Equipe mais produtiva</p>
              <p className="text-sm text-muted-foreground">
                Tarefas claras, alertas inteligentes e histórico completo.
              </p>
            </div>
          </div>
        </div>
      </main>
      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 lg:grid-cols-3">
        {[
          {
            title: "Resultados que aparecem",
            text: "Painéis com evolução de receita, atendimento e retorno de pacientes.",
          },
          {
            title: "Experiência premium",
            text: "Fluxos rápidos para recepção, dentistas e financeiro na mesma tela.",
          },
          {
            title: "Suporte especialista",
            text: "Onboarding e suporte para sua clínica crescer com segurança.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-xl border border-emerald-400/20 bg-card/60 p-6"
          >
            <h3 className="text-lg font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </section>
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2 text-center">
            <h2 className="text-3xl font-semibold">Planos e benefícios</h2>
            <p className="text-sm text-muted-foreground">
              Compare os planos e escolha o melhor para sua clínica.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {pricing.map((plan) => {
              const discount = plan.months
                ? Math.round((1 - plan.price / (monthly * plan.months)) * 100)
                : 0;
              return (
                <div
                  key={plan.key}
                  className="rounded-xl border border-emerald-400/20 bg-card/70 p-6"
                >
                  <div className="text-sm text-muted-foreground">{plan.name}</div>
                  <div className="mt-2 text-2xl font-semibold">
                    R$ {plan.price.toFixed(2)}
                  </div>
                  {plan.months ? (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {plan.months} mês(es)
                    </div>
                  ) : (
                    <div className="mt-1 text-xs text-muted-foreground">
                      {plan.period}
                    </div>
                  )}
                  {discount > 0 ? (
                    <div className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                      {discount}% de desconto
                    </div>
                  ) : (
                    <div className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                      {plan.highlight ?? "Sem fidelidade"}
                    </div>
                  )}
                  <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                    <li>✔ Agenda inteligente e lembretes</li>
                    <li>✔ Prontuário completo e anexos</li>
                    <li>✔ Financeiro e relatórios</li>
                    <li>✔ Equipe e permissões</li>
                  </ul>
                  <a
                    className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground"
                    href="/signup"
                  >
                    Quero este plano
                  </a>
                </div>
              );
            })}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-emerald-400/20 bg-card/60 p-5 text-sm">
              <div className="font-medium">Vantagens imediatas</div>
              <p className="mt-2 text-muted-foreground">
                Reduza faltas, aumente a conversão de orçamentos e tenha previsibilidade do caixa.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-400/20 bg-card/60 p-5 text-sm">
              <div className="font-medium">Suporte e onboarding</div>
              <p className="mt-2 text-muted-foreground">
                Treinamento rápido para sua equipe e suporte para ajustar o fluxo ideal.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-400/20 bg-card/60 p-5 text-sm">
              <div className="font-medium">Segurança e LGPD</div>
              <p className="mt-2 text-muted-foreground">
                Dados protegidos com acesso controlado por função e trilhas de auditoria.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/15 via-transparent to-emerald-500/10 p-8 md:p-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">
                Pronto para transformar sua clínica?
              </h2>
              <p className="text-sm text-muted-foreground">
                Comece agora e veja o impacto em poucos dias.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground"
                href="/signup"
              >
                Quero começar agora
              </a>
              <a
                className="inline-flex h-11 items-center rounded-md border border-input px-6 text-sm"
                href="/login"
              >
                Ver minha conta
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
