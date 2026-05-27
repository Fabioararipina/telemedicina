import React, { useState, useEffect } from 'react';
import { Sidebar, Topbar, PageHeader, KpiCard, Sparkline } from '../shell';
import { Ic } from '../icons';
import { LineChart } from '../charts';
import { adminApi, computeStats, fmtBRL, type DashboardStats } from '../api';
import { NewPatientModal } from '../components/NewPatientModal';

interface Props { onNav: (id: string) => void; }

export function ScreenDashboard({ onNav }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leadsCount, setLeadsCount] = useState<number | null>(null);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    adminApi.getUsers().then(users => setStats(computeStats(users))).catch(console.error);
    adminApi.getLeadsCount().then(d => setLeadsCount(d.count)).catch(console.error);
  }, []);

  const handleDisparar = async () => {
    if (dispatching) return;
    setDispatching(true);
    setDispatchResult(null);
    try {
      const r = await adminApi.dispararLancamento();
      setDispatchResult(`Disparo concluído — ${r.enviados}/${r.total} enviados`);
    } catch {
      setDispatchResult('Erro ao disparar. Tente novamente.');
    } finally {
      setDispatching(false);
    }
  };

  const entradas = [4200,4400,4100,4600,4900,5200,5100,5500,5300,5700,6000,6200,6100,6400,6800,7100,6900,7300,7500,7800,7600,7900,8200,8400,8600,8900,9100,9400];
  const saidas   = [3100,2900,3000,3200,3000,3400,3300,3100,3500,3300,3700,3500,3600,3400,3800,3600,3700,3500,3900,3700,3800,4000,3900,4100,4000,4200,4100,4300];
  const projection = Array.from({ length: 28 }, (_, i) => 9400 + i * 220);

  const loading = stats === null;

  const planMix = stats
    ? [
        { name: 'Familiar',   count: stats.planCounts.FAMILIAR,   color: '#0c4a6e', mrr: fmtBRL(stats.planCounts.FAMILIAR * 59.9) },
        { name: 'Individual', count: stats.planCounts.INDIVIDUAL, color: '#0ea5e9', mrr: fmtBRL(stats.planCounts.INDIVIDUAL * 29.9) },
        { name: 'Avulso',     count: stats.planCounts.AVULSO,     color: '#10b981', mrr: `${fmtBRL(stats.planCounts.AVULSO * 49.9)} (mês)` },
      ]
    : null;

  return (
    <div className="sa-shell">
      <Sidebar active="dashboard" onNav={onNav} />
      <main className="sa-main">
        <Topbar breadcrumb={['Painel', 'Dashboard']} />
        <div className="sa-content">
          <PageHeader
            title="Bom dia, Rafael 👋"
            subtitle="Visão geral do negócio · Dados em tempo real"
            actions={
              <>
                <button className="btn btn-secondary"><Ic.cal />Maio 2026</button>
                <button className="btn btn-secondary"><Ic.download />Exportar</button>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}><Ic.plus />Novo paciente</button>
              </>
            }
          />

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <KpiCard
              label="Assinantes ativos"
              value={loading ? '…' : String(stats!.active)}
              sub={loading ? '' : `${stats!.total} total · ${stats!.pending} pendentes`}
              accent="var(--sky-500)"
              spark={<Sparkline data={[800,850,900,950,1000,1080,1140, stats?.active ?? 1247]} color="var(--sky-500)" />}
            />
            <KpiCard
              label="MRR (receita recorrente)"
              value={loading ? '…' : fmtBRL(stats!.mrr)}
              sub="Assinaturas ativas"
              accent="var(--green-500)"
              spark={<Sparkline data={[12,18,21,26,30,34,38, Math.round((stats?.mrr ?? 42380) / 1000)]} color="var(--green-500)" />}
            />
            <KpiCard
              label="Novos cadastros"
              value={loading ? '…' : String(stats!.newThisWeek)}
              sub={loading ? '' : `Hoje: ${stats!.newToday} · Semana: ${stats!.newThisWeek}`}
              accent="var(--amber-500)"
              spark={<Sparkline data={[3,5,4,7,6,8,7, stats?.newThisWeek ?? 9]} color="var(--amber-500)" />}
            />
            <KpiCard
              label="Ticket médio"
              value={loading ? '…' : fmtBRL(stats!.ticketMedio)}
              sub="Por assinante ativo"
              accent="var(--orange-500)"
              spark={<Sparkline data={[34,35,35,36,35,36,36, Math.round(stats?.ticketMedio ?? 36)]} color="var(--orange-500)" />}
            />
          </div>

          {/* Alert strip */}
          <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <AlertCard
              tone="danger"
              icon={<Ic.alert />}
              title="Assinantes pendentes"
              value={loading ? '…' : `${stats!.pending} assinantes`}
              sub="Aguardando confirmação de pagamento"
              cta="Ver pacientes →"
              onCta={() => onNav('pacientes')}
            />
            <AlertCard
              tone="warn"
              icon={<Ic.whatsapp />}
              title="Leads pré-cadastro"
              value={leadsCount === null ? '…' : `${leadsCount} leads`}
              sub={dispatchResult ?? 'Aguardando disparo de lançamento'}
              cta={dispatching ? 'Enviando…' : 'Disparar WhatsApp para leads →'}
              onCta={handleDisparar}
            />
            <AlertCard
              tone="info"
              icon={<Ic.users />}
              title="Novos cadastros hoje"
              value={loading ? '…' : `${stats!.newToday} pacientes`}
              sub={loading ? '' : `Total na semana: ${stats!.newThisWeek}`}
              cta="Ver lista →"
              onCta={() => onNav('pacientes')}
            />
          </div>

          {/* Receita + Mix */}
          <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>
            <div className="card">
              <div className="card-h">
                <div>
                  <h3>Receita do mês</h3>
                  <p className="sub">Últimos 28 dias · Entradas vs Saídas</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12 }}>
                  <Legend color="var(--green-500)" label="Entradas" />
                  <Legend color="var(--red-500)" label="Saídas" />
                  <Legend color="var(--accent)" label="Projeção" dashed />
                </div>
              </div>
              <LineChart entradas={entradas} saidas={saidas} projection={projection} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                <StatLine label="MRR atual"       value={loading ? '…' : fmtBRL(stats!.mrr)} tone="success" />
                <StatLine label="Assinantes ativos" value={loading ? '…' : String(stats!.active)} />
                <StatLine label="Ticket médio"    value={loading ? '…' : fmtBRL(stats!.ticketMedio)} sub="por assinante" tone="success" />
              </div>
            </div>

            <div className="card">
              <div className="card-h">
                <div>
                  <h3>Mix de planos</h3>
                  <p className="sub">{loading ? 'Carregando…' : `${stats!.active} assinantes ativos`}</p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => onNav('pacientes')}>Detalhes <Ic.arrow /></button>
              </div>
              {planMix
                ? <PlanMixList plans={planMix} total={stats!.active} />
                : <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Carregando…</div>
              }
            </div>
          </div>

          {/* Activity + Renovações */}
          <div style={{ marginTop: 22, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
            <div className="card">
              <div className="card-h">
                <div><h3>Atividade recente</h3><p className="sub">Últimas 24 horas</p></div>
                <button className="btn btn-ghost btn-sm" onClick={() => onNav('pacientes')}>Ver tudo</button>
              </div>
              <ActivityList />
            </div>
            <div className="card">
              <div className="card-h">
                <div><h3>Próximas renovações</h3><p className="sub">7 dias</p></div>
                <button className="btn btn-ghost btn-sm" onClick={handleDisparar} style={{ color: dispatching ? 'var(--ink-3)' : undefined }}>
                  {dispatching ? 'Disparando…' : 'Disparar lote'}
                </button>
              </div>
              <RenovList />
            </div>
          </div>
        </div>
      </main>

      <NewPatientModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}

/* ── Local helpers ── */

function AlertCard({ tone, icon, title, value, sub, cta, onCta }: {
  tone: 'danger' | 'warn' | 'info';
  icon: React.ReactNode;
  title: string;
  value: string;
  sub: string;
  cta: string;
  onCta: () => void;
}) {
  const colors = {
    danger: { bg: 'var(--st-danger-bg)', fg: 'var(--red-600)', border: 'color-mix(in oklab, var(--red-500) 25%, transparent)' },
    warn:   { bg: 'var(--st-warn-bg)',   fg: 'var(--amber-600)', border: 'color-mix(in oklab, var(--amber-500) 30%, transparent)' },
    info:   { bg: 'var(--st-info-bg)',   fg: 'var(--sky-700)',  border: 'color-mix(in oklab, var(--sky-500) 25%, transparent)' },
  }[tone];
  return (
    <div className="card" style={{ borderColor: colors.border, background: colors.bg, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: colors.fg, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {icon}<span>{title}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, marginTop: 8, color: 'var(--ink)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--ink-2)', marginTop: 2, fontWeight: 600 }}>{sub}</div>
      <button className="btn btn-ghost btn-sm" style={{ marginTop: 12, padding: 0, color: colors.fg }} onClick={onCta}>{cta}</button>
    </div>
  );
}

function StatLine({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  const color = tone === 'success' ? 'var(--green-700)' : 'var(--ink)';
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, color, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 700, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--ink-2)', fontWeight: 700 }}>
      <span style={{
        width: 16, height: 2,
        background: dashed ? 'transparent' : color,
        backgroundImage: dashed ? `linear-gradient(90deg, ${color} 50%, transparent 50%)` : 'none',
        backgroundSize: dashed ? '6px 2px' : 'auto',
      }} />
      {label}
    </span>
  );
}

function ActivityList() {
  const items = [
    { type: 'conv',   who: 'Maria Aparecida Lima',  what: 'convertida em assinante',  plan: 'Familiar',             time: 'há 4min',  sdr: 'Joana B.' },
    { type: 'pay',    who: 'Cícero R. de Souza',    what: 'pagamento recebido',        plan: 'R$ 29,90 · Pix',      time: 'há 18min', sdr: null },
    { type: 'lead',   who: 'Lúcia M. dos Santos',   what: 'novo lead via landing',     plan: 'interesse: Individual',time: 'há 22min', sdr: 'auto' },
    { type: 'cancel', who: 'Roberval A. Silva',      what: 'cancelou assinatura',       plan: 'motivo: financeiro',  time: 'há 1h',    sdr: null },
    { type: 'conv',   who: 'Antônio C. Bezerra',    what: 'convertido em assinante',   plan: 'Avulso',              time: 'há 2h',    sdr: 'Lucas T.' },
  ];
  const icons: Record<string, { ico: React.ReactNode; bg: string; fg: string }> = {
    conv:   { ico: <Ic.check />,   bg: 'var(--st-success-bg)', fg: 'var(--green-600)' },
    pay:    { ico: <Ic.finance />, bg: 'var(--st-success-bg)', fg: 'var(--green-600)' },
    lead:   { ico: <Ic.plus />,    bg: 'var(--st-info-bg)',    fg: 'var(--sky-700)' },
    cancel: { ico: <Ic.x />,      bg: 'var(--st-danger-bg)',  fg: 'var(--red-600)' },
  };
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 4 }}>
      {items.map((it, i) => {
        const ic = icons[it.type];
        return (
          <li key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, padding: '10px 0', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: ic.bg, color: ic.fg, display: 'grid', placeItems: 'center' }}>{ic.ico}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13 }}><strong>{it.who}</strong> <span style={{ color: 'var(--ink-3)' }}>{it.what}</span></div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}>
                {it.plan} {it.sdr && <>· SDR: {it.sdr}</>}
              </div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>{it.time}</div>
          </li>
        );
      })}
    </ul>
  );
}

function PlanMixList({ plans, total }: { plans: { name: string; count: number; color: string; mrr: string }[]; total: number }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 14 }}>
      {plans.map((p) => {
        const pct = total > 0 ? (p.count / total) * 100 : 0;
        return (
          <li key={p.name}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="dot-status" style={{ background: p.color }} />
                <span style={{ fontSize: 13.5, fontWeight: 800 }}>{p.name}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{p.count}</div>
                <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontWeight: 700 }}>{p.mrr}</div>
              </div>
            </div>
            <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: p.color, borderRadius: 4 }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function RenovList() {
  const items = [
    { name: 'Cícero R. Souza',  plan: 'Individual', date: 'hoje',      val: 'R$ 29,90', init: 'CS', warn: true },
    { name: 'Antônio Bezerra',  plan: 'Familiar',   date: 'amanhã',    val: 'R$ 59,90', init: 'AB', warn: false },
    { name: 'Helena Costa',     plan: 'Familiar',   date: 'em 2 dias', val: 'R$ 59,90', init: 'HC', warn: false },
    { name: 'Renan Figueiredo', plan: 'Individual', date: 'em 4 dias', val: 'R$ 29,90', init: 'RF', warn: false },
    { name: 'Solange Lopes',    plan: 'Familiar',   date: 'em 6 dias', val: 'R$ 59,90', init: 'SL', warn: false },
  ];
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 2 }}>
      {items.map((r, i) => (
        <li key={i} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 12, padding: '10px 0', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none', alignItems: 'center' }}>
          <div className="avatar-init" style={{ width: 32, height: 32, fontSize: 11 }}>{r.init}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800 }}>{r.name}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 700 }}>
              <span className={`pill ${r.plan === 'Familiar' ? 'info' : 'muted'}`} style={{ fontSize: 10, padding: '1px 6px' }}>{r.plan}</span>
              <span style={{ marginLeft: 6 }}>renova {r.date}</span>
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: r.warn ? 'var(--amber-600)' : 'var(--ink)' }}>{r.val}</div>
        </li>
      ))}
    </ul>
  );
}
