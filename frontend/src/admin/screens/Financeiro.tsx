import { Sidebar, Topbar, PageHeader, KpiCard } from '../shell';
import { Ic } from '../icons';

interface Props { onNav: (id: string) => void; }

const inadimplentes = [
  { name: 'Roberval A. Silva',    plan: 'Individual', val: 'R$ 29,90', venc: '02/04/2026', atraso: 51, tries: 4, init: 'RS' },
  { name: 'José Carlos Mendes',   plan: 'Familiar',   val: 'R$ 59,90', venc: '15/04/2026', atraso: 38, tries: 3, init: 'JM' },
  { name: 'Yolanda Pereira',      plan: 'Familiar',   val: 'R$ 59,90', venc: '18/04/2026', atraso: 35, tries: 2, init: 'YP' },
  { name: 'Adilson Tavares',      plan: 'Individual', val: 'R$ 29,90', venc: '22/04/2026', atraso: 31, tries: 3, init: 'AT' },
  { name: 'Renan Figueiredo',     plan: 'Individual', val: 'R$ 29,90', venc: '28/04/2026', atraso: 25, tries: 2, init: 'RF' },
  { name: 'Solange Pereira',      plan: 'Familiar',   val: 'R$ 59,90', venc: '01/05/2026', atraso: 22, tries: 1, init: 'SP' },
  { name: 'Cláudia Vieira',       plan: 'Individual', val: 'R$ 29,90', venc: '05/05/2026', atraso: 18, tries: 2, init: 'CV' },
  { name: 'Marcos Anésio',        plan: 'Familiar',   val: 'R$ 59,90', venc: '08/05/2026', atraso: 15, tries: 1, init: 'MA' },
  { name: 'Vera Lúcia Almeida',   plan: 'Individual', val: 'R$ 29,90', venc: '11/05/2026', atraso: 12, tries: 1, init: 'VA' },
  { name: 'Paulo César Reis',     plan: 'Avulso',     val: 'R$ 49,90', venc: '14/05/2026', atraso: 9,  tries: 0, init: 'PR' },
];

export function ScreenReceber({ onNav }: Props) {
  return (
    <div className="sa-shell">
      <Sidebar active="receber" onNav={onNav} />
      <main className="sa-main">
        <Topbar breadcrumb={['Financeiro', 'Contas a Receber']} />
        <div className="sa-content">
          <PageHeader
            title="Contas a Receber"
            subtitle="Maio 2026 · Atualizado em tempo real via Asaas"
            actions={
              <>
                <button className="btn btn-secondary"><Ic.cal />Maio 2026</button>
                <button className="btn btn-secondary"><Ic.download />Extrato CSV</button>
                <button className="btn btn-primary"><Ic.plus />Lançamento manual</button>
              </>
            }
          />

          {/* Big stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 14 }}>
            <div className="card" style={{ background: 'linear-gradient(135deg, var(--green-50), #fff)', borderColor: 'color-mix(in oklab, var(--green-500) 25%, transparent)' }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--green-700)' }}>Recebido no mês</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--green-700)', lineHeight: 1.05, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
                R$ 42.380,<span style={{ fontSize: 22 }}>50</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 700, marginTop: 6 }}>
                <span style={{ color: 'var(--green-700)' }}>↑ 8,1%</span> vs abril · 87% da previsão
              </div>
              <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99, marginTop: 12, overflow: 'hidden' }}>
                <div style={{ width: '87%', height: '100%', background: 'var(--green-500)', borderRadius: 99 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ink-3)', marginTop: 6, fontWeight: 700 }}>
                <span>R$ 42.380,50</span>
                <span>Previsto R$ 48.700,00</span>
              </div>
            </div>
            <KpiCard label="A receber este mês" value="R$ 6.319,50" sub="125 lançamentos pendentes" accent="var(--amber-500)" />
            <KpiCard label="Inadimplência" value="R$ 1.184,40" sub="32 assinantes · 2,5% da base" accent="var(--red-500)" />
            <KpiCard label="MRR" value="R$ 41.250,00" trend="+4,2%" trendDir="up" sub="Receita recorrente" accent="var(--sky-500)" />
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginTop: 22, borderBottom: '1px solid var(--border)' }}>
            {[
              { l: 'Inadimplentes', c: 32, active: true, tone: 'danger' as const },
              { l: 'A vencer',      c: 125, active: false, tone: undefined },
              { l: 'Recebidos',     c: 287, active: false, tone: undefined },
              { l: 'Todos',         c: 444, active: false, tone: undefined },
            ].map((t, i) => (
              <div key={i} style={{ padding: '10px 18px', fontSize: 13, fontWeight: 800, color: t.active ? 'var(--ink)' : 'var(--ink-3)', borderBottom: t.active ? '2px solid var(--red-500)' : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {t.l}
                <span className={`pill ${t.tone === 'danger' ? 'danger' : 'muted'}`} style={{ padding: '1px 7px' }}>{t.c}</span>
              </div>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, paddingBottom: 8 }}>
              <button className="btn btn-secondary btn-sm"><Ic.filter />Filtrar</button>
            </div>
          </div>

          {/* Bulk action bar */}
          <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '0 0 10px 10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
            <strong>4 selecionados</strong>
            <span style={{ color: 'var(--ink-3)' }}>R$ 209,30 total</span>
            <div style={{ flex: 1 }} />
            <button className="btn btn-sm btn-secondary"><Ic.whatsapp />Disparar cobrança</button>
            <button className="btn btn-sm btn-secondary"><Ic.check />Registrar pagamento</button>
            <button className="btn btn-sm btn-secondary"><Ic.x />Cancelar lançamento</button>
          </div>

          {/* Table */}
          <div className="table-wrap" style={{ borderRadius: '0 0 var(--r-lg) var(--r-lg)', marginTop: 12 }}>
            <table className="data">
              <thead>
                <tr>
                  <th style={{ width: 32 }}><input type="checkbox" /></th>
                  <th>Assinante</th>
                  <th>Plano</th>
                  <th className="num">Valor</th>
                  <th>Venceu em</th>
                  <th>Atraso</th>
                  <th>Tentativas</th>
                  <th style={{ width: 200 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {inadimplentes.map((p, i) => (
                  <tr key={i}>
                    <td><input type="checkbox" defaultChecked={i < 4} /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="avatar-init" style={{ width: 30, height: 30, fontSize: 11 }}>{p.init}</div>
                        <div>
                          <div style={{ fontWeight: 800 }}>{p.name}</div>
                          <div className="tag-id">AS-0{200 + i}</div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`pill ${p.plan === 'Familiar' ? 'info' : p.plan === 'Avulso' ? 'success' : 'muted'}`}>{p.plan}</span></td>
                    <td className="num" style={{ fontWeight: 700, color: 'var(--red-600)' }}>{p.val}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{p.venc}</td>
                    <td>
                      <span className={`pill ${p.atraso > 30 ? 'danger' : 'warn'}`}>{p.atraso} dias</span>
                    </td>
                    <td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.tries}× WhatsApp</td>
                    <td className="actions" style={{ textAlign: 'left' }}>
                      <button className="btn btn-sm btn-ghost" style={{ color: 'var(--green-700)' }}><Ic.whatsapp />Cobrar</button>
                      <button className="btn btn-sm btn-ghost"><Ic.check />Pago</button>
                      <button title="Mais"><Ic.more /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>
              <span>Mostrando 1–10 de 32 inadimplentes</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-secondary btn-sm">‹</button>
                <button className="btn btn-primary btn-sm">1</button>
                <button className="btn btn-secondary btn-sm">2</button>
                <button className="btn btn-secondary btn-sm">3</button>
                <button className="btn btn-secondary btn-sm">4</button>
                <button className="btn btn-secondary btn-sm">›</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
