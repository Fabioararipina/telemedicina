import { Sidebar, Topbar, PageHeader, KpiCard, Sparkline } from '../shell';
import { Ic } from '../icons';
import { LineChart, BarChart, Donut } from '../charts';

interface Props { onNav: (id: string) => void; }

const mrrSeries = [12800, 15200, 17800, 20500, 23200, 25900, 28600, 31400, 34100, 36900, 39500, 41250];

const churnByMotivo = [
  { label: 'Financeiro',    v: 18, color: '#ef4444' },
  { label: 'Não usou',      v: 11, color: '#f97316' },
  { label: 'Mudou plano',   v: 7,  color: '#f59e0b' },
  { label: 'Não respondeu', v: 5,  color: '#94a3b8' },
  { label: 'Outro',         v: 3,  color: '#64748b' },
];

const planSplit = [
  { label: 'Individual', value: 547, color: '#0ea5e9' },
  { label: 'Familiar',   value: 482, color: '#0c4a6e' },
  { label: 'Avulso',     value: 114, color: '#10b981' },
];

const especialidades = [
  { label: 'Clínico G', v: 1842, value: '1842', color: '#0284c7' },
  { label: 'Pediatria', v: 612,  value: '612',  color: '#0284c7' },
  { label: 'Ginecolo',  v: 384,  value: '384',  color: '#0284c7' },
  { label: 'Psicologi', v: 311,  value: '311',  color: '#0284c7' },
  { label: 'Dermatol',  v: 247,  value: '247',  color: '#0284c7' },
  { label: 'Cardiolo',  v: 198,  value: '198',  color: '#0284c7' },
  { label: 'Nutrição',  v: 142,  value: '142',  color: '#0284c7' },
  { label: 'Ortopedi',  v: 108,  value: '108',  color: '#0284c7' },
];

export function ScreenRelatorio({ onNav }: Props) {
  const churnTotal = churnByMotivo.reduce((a, x) => a + x.v, 0);

  return (
    <div className="sa-shell">
      <Sidebar active="rep-financeiro" onNav={onNav} />
      <main className="sa-main">
        <Topbar breadcrumb={['Relatórios', 'Financeiro']} />
        <div className="sa-content">
          <PageHeader
            title="Relatório Financeiro"
            subtitle="Últimos 12 meses · 01/06/2025 → 23/05/2026"
            actions={
              <>
                <div style={{ display: 'flex', gap: 0, padding: 3, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}>
                  {['7d', '30d', '90d', '12m', 'Tudo'].map((p, i) => (
                    <button key={p} className={`btn btn-sm ${i === 3 ? 'btn-primary' : 'btn-ghost'}`} style={{ padding: '5px 10px' }}>{p}</button>
                  ))}
                </div>
                <button className="btn btn-secondary"><Ic.download />PDF</button>
                <button className="btn btn-secondary"><Ic.download />CSV</button>
              </>
            }
          />

          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
            <KpiCard label="MRR atual" value="R$ 41.250" trend="+4,2%" trendDir="up" sub="meta R$ 50k até dez/26" accent="var(--sky-500)" spark={<Sparkline data={mrrSeries.slice(-8)} color="var(--sky-500)" />} />
            <KpiCard label="ARR projetado" value="R$ 495k" trend="+38%" trendDir="up" sub="vs 12 meses atrás" accent="var(--green-500)" />
            <KpiCard label="CAC médio" value="R$ 38,20" trend="-12%" trendDir="up" sub="custo p/ converter 1 lead" accent="var(--amber-500)" />
            <KpiCard label="Churn mensal" value="2,8%" trend="-0,4pp" trendDir="up" sub="44 cancelamentos / 1.581" accent="var(--red-500)" />
          </div>

          {/* MRR evolution */}
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-h">
              <div><h3>Evolução do MRR · 12 meses</h3><p className="sub">Receita recorrente mensal · projeção tracejada</p></div>
              <button className="btn btn-ghost btn-sm">Detalhamento</button>
            </div>
            <LineChart
              entradas={mrrSeries}
              saidas={mrrSeries.map(v => Math.round(v * 0.42))}
              projection={mrrSeries.map((v, i) => v + 1800 + i * 80)}
            />
          </div>

          {/* Plan split + Churn */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div className="card">
              <div className="card-h">
                <div><h3>Receita por plano</h3><p className="sub">1.143 assinantes ativos · maio 2026</p></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24, alignItems: 'center' }}>
                <Donut size={140} segments={planSplit} />
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
                  {planSplit.map((s) => {
                    const mrr = s.label === 'Individual' ? 547 * 29.9 : s.label === 'Familiar' ? 482 * 59.9 : (114 * 49.9) / 12;
                    const pct = (s.value / 1143 * 100).toFixed(1);
                    return (
                      <li key={s.label}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13, fontWeight: 800 }}>
                            <span className="dot-status" style={{ background: s.color }} />{s.label}
                          </span>
                          <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', fontWeight: 800 }}>{s.value}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)', fontWeight: 700 }}>
                          R$ {mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mês · {pct}%
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <div className="card">
              <div className="card-h">
                <div><h3>Motivos de cancelamento</h3><p className="sub">Últimos 90 dias · 44 churns</p></div>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
                {churnByMotivo.map((m) => {
                  const pct = (m.v / churnTotal) * 100;
                  return (
                    <li key={m.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                        <span><span className="dot-status" style={{ background: m.color }} />{m.label}</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                          <strong>{m.v}</strong>
                          <span style={{ color: 'var(--ink-3)', marginLeft: 6, fontWeight: 600 }}>{pct.toFixed(0)}%</span>
                        </span>
                      </div>
                      <div style={{ height: 8, background: 'var(--surface-3)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: m.color, borderRadius: 4 }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <div style={{ marginTop: 16, padding: 12, background: 'var(--st-warn-bg)', borderRadius: 8, fontSize: 12, color: 'var(--ink-2)', fontWeight: 600 }}>
                <strong>💡 Insight:</strong> 41% dos cancelamentos por financeiro. Considerar plano semestral com desconto.
              </div>
            </div>
          </div>

          {/* Especialidades */}
          <div className="card">
            <div className="card-h">
              <div><h3>Especialidades mais acessadas</h3><p className="sub">Consultas realizadas via Meditele · maio 2026 · 3.844 consultas</p></div>
              <button className="btn btn-ghost btn-sm">Ver todas</button>
            </div>
            <BarChart data={especialidades} color="var(--sky-600)" h={220} w={920} />
          </div>
        </div>
      </main>
    </div>
  );
}
