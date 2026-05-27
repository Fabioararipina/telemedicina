import { useState, useEffect, useCallback } from 'react';
import { Sidebar, Topbar, PageHeader, KpiCard } from '../shell';
import { Ic } from '../icons';
import { adminApi, type FinanceSummary, type FinancePayment } from '../api';

interface Props { onNav: (id: string) => void; }

type TabStatus = 'OVERDUE' | 'PENDING' | 'RECEIVED' | '';
const PAGE_SIZE = 10;

const BILLING_LABELS: Record<string, string> = {
  BOLETO: 'Boleto', PIX: 'PIX', CREDIT_CARD: 'Cartão',
  DEBIT_CARD: 'Débito', UNDEFINED: '—', '': '—',
};
const PLAN_TONE: Record<string, string> = {
  INDIVIDUAL: 'muted', FAMILIAR: 'info', AVULSO: 'success', CORTESIA: 'muted',
};

const fmtBRL  = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();

export function ScreenReceber({ onNav }: Props) {
  const [activeTab,   setActiveTab]   = useState<TabStatus>('OVERDUE');
  const [summary,     setSummary]     = useState<FinanceSummary | null>(null);
  const [payments,    setPayments]    = useState<FinancePayment[]>([]);
  const [totalCount,  setTotalCount]  = useState(0);
  const [page,        setPage]        = useState(0);
  const [loadingSum,  setLoadingSum]  = useState(true);
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState<Set<string>>(new Set());
  const [error,       setError]       = useState('');

  // Carrega o resumo uma vez
  useEffect(() => {
    adminApi.getFinanceiroSummary()
      .then(d => setSummary(d))
      .catch(() => {})
      .finally(() => setLoadingSum(false));
  }, []);

  // Carrega pagamentos quando aba ou página muda
  const loadPayments = useCallback(() => {
    setLoading(true);
    setError('');
    setSelected(new Set());
    adminApi.getFinanceiroPayments(activeTab || undefined, page * PAGE_SIZE, PAGE_SIZE)
      .then(d => { setPayments(d.data); setTotalCount(d.totalCount); })
      .catch(e => setError(e.response?.data?.error ?? 'Erro ao buscar pagamentos.'))
      .finally(() => setLoading(false));
  }, [activeTab, page]);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const tabCount = (s: TabStatus) => {
    if (!summary) return 0;
    if (s === 'OVERDUE')  return summary.overdueCount;
    if (s === 'PENDING')  return summary.pendingCount;
    if (s === 'RECEIVED') return summary.receivedCount;
    return summary.totalCount;
  };

  const totalPages     = Math.ceil(totalCount / PAGE_SIZE);
  const selectedTotal  = payments.filter(p => selected.has(p.id)).reduce((a, p) => a + p.value, 0);
  const toggleAll      = () => selected.size === payments.length ? setSelected(new Set()) : setSelected(new Set(payments.map(p => p.id)));
  const toggle         = (id: string) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const switchTab = (s: TabStatus) => { setActiveTab(s); setPage(0); };

  return (
    <div className="sa-shell">
      <Sidebar active="receber" onNav={onNav} />
      <main className="sa-main">
        <Topbar breadcrumb={['Financeiro', 'Contas a Receber']} />
        <div className="sa-content">
          <PageHeader
            title="Contas a Receber"
            subtitle={loadingSum ? 'Carregando…' : 'Dados em tempo real via Asaas'}
            actions={
              <>
                <button className="btn btn-secondary" onClick={loadPayments}><Ic.arrowDown />Atualizar</button>
                <button className="btn btn-secondary"><Ic.download />Extrato CSV</button>
              </>
            }
          />

          {/* ── KPI cards ── */}
          {loadingSum ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 14 }}>
              {[0,1,2,3].map(i => (
                <div key={i} className="card" style={{ height: 100, background: 'var(--slate-50)' }} />
              ))}
            </div>
          ) : summary?.hasAsaas ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 14 }}>
              {/* Recebido (total geral) */}
              <div className="card" style={{ background: 'linear-gradient(135deg,var(--green-50),#fff)', borderColor: 'color-mix(in oklab,var(--green-500) 25%,transparent)' }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--green-700)' }}>
                  Total recebido
                </div>
                <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--green-700)', lineHeight: 1.05, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
                  {fmtBRL(summary.receivedValue)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 700, marginTop: 6 }}>
                  {summary.receivedCount} pagamentos confirmados
                </div>
              </div>
              <KpiCard label="A receber (pendentes)" value={fmtBRL(summary.pendingValue)}
                sub={`${summary.pendingCount} lançamentos`} accent="var(--amber-500)" />
              <KpiCard label="Inadimplência"          value={fmtBRL(summary.overdueValue)}
                sub={`${summary.overdueCount} assinantes em atraso`} accent="var(--red-500)" />
              <KpiCard label="MRR estimado"           value={fmtBRL(summary.mrr)}
                sub="Receita recorrente (assinaturas ativas)" accent="var(--sky-500)" />
            </div>
          ) : (
            <div className="card" style={{ padding: '20px 24px', color: 'var(--amber-700)', fontWeight: 700, fontSize: 13, background: 'var(--amber-50)', borderColor: 'var(--amber-100)' }}>
              ⚠️ Configure o Gateway Asaas para ver dados financeiros reais.
              <button className="btn btn-sm btn-secondary" style={{ marginLeft: 16 }} onClick={() => onNav('gateway')}>
                Configurar Gateway
              </button>
            </div>
          )}

          {/* ── Tabs ── */}
          <div style={{ display: 'flex', gap: 0, marginTop: 22, borderBottom: '1px solid var(--border)' }}>
            {([
              { status: 'OVERDUE'  as TabStatus, label: 'Inadimplentes', color: 'var(--red-500)',   pill: 'danger' },
              { status: 'PENDING'  as TabStatus, label: 'A vencer',      color: 'var(--amber-500)', pill: 'warn'   },
              { status: 'RECEIVED' as TabStatus, label: 'Recebidos',     color: 'var(--accent)',    pill: 'success'},
              { status: ''         as TabStatus, label: 'Todos',         color: 'var(--accent)',    pill: 'muted'  },
            ] as const).map(t => (
              <div key={t.status} onClick={() => switchTab(t.status)}
                style={{
                  padding: '10px 18px', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                  color: activeTab === t.status ? 'var(--ink)' : 'var(--ink-3)',
                  borderBottom: `2px solid ${activeTab === t.status ? t.color : 'transparent'}`,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                {t.label}
                <span className={`pill ${t.pill}`} style={{ padding: '1px 7px' }}>
                  {loadingSum ? '…' : tabCount(t.status)}
                </span>
              </div>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', paddingBottom: 8 }}>
              <button className="btn btn-secondary btn-sm"><Ic.filter />Filtrar</button>
            </div>
          </div>

          {/* ── Bulk bar ── */}
          {selected.size > 0 && (
            <div style={{ background: 'var(--surface-3)', border: '1px solid var(--border)',
              borderRadius: '0 0 10px 10px', padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
              <strong>{selected.size} selecionado{selected.size > 1 ? 's' : ''}</strong>
              <span style={{ color: 'var(--ink-3)' }}>{fmtBRL(selectedTotal)} total</span>
              <div style={{ flex: 1 }} />
              <button className="btn btn-sm btn-secondary"><Ic.whatsapp />Disparar cobrança</button>
              <button className="btn btn-sm btn-secondary"><Ic.check />Registrar pagamento</button>
              <button className="btn btn-sm btn-secondary"><Ic.x />Cancelar</button>
            </div>
          )}

          {/* ── Tabela ── */}
          <div className="table-wrap" style={{ borderRadius: '0 0 var(--r-lg) var(--r-lg)', marginTop: 12 }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontWeight: 700 }}>
                Carregando pagamentos…
              </div>
            ) : error ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--red-600)', fontWeight: 700 }}>
                ⚠️ {error}
              </div>
            ) : payments.length === 0 ? (
              <div style={{ padding: 36, textAlign: 'center', color: 'var(--ink-3)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🎉</div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>
                  {activeTab === 'OVERDUE' ? 'Nenhum inadimplente!' : 'Nenhum pagamento encontrado.'}
                </div>
              </div>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}>
                      <input type="checkbox"
                        checked={selected.size === payments.length && payments.length > 0}
                        onChange={toggleAll} />
                    </th>
                    <th>Assinante</th>
                    <th>Plano</th>
                    <th className="num">Valor</th>
                    <th>Vencimento</th>
                    {activeTab === 'OVERDUE'  && <th>Atraso</th>}
                    {activeTab === 'RECEIVED' && <th>Recebido em</th>}
                    <th>Forma</th>
                    <th style={{ width: 190 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td><input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar-init" style={{ width: 30, height: 30, fontSize: 11 }}>
                            {initials(p.customerName)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 800 }}>{p.customerName}</div>
                            {p.localUserId && (
                              <div className="tag-id" style={{ cursor: 'pointer' }}>ver paciente</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`pill ${PLAN_TONE[p.planType] ?? 'muted'}`}>
                          {p.plan.split(' ')[0]}
                        </span>
                      </td>
                      <td className="num" style={{ fontWeight: 700, color: activeTab === 'OVERDUE' ? 'var(--red-600)' : undefined }}>
                        {fmtBRL(p.value)}
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{fmtDate(p.dueDate)}</td>
                      {activeTab === 'OVERDUE' && (
                        <td>
                          <span className={`pill ${p.daysLate > 30 ? 'danger' : 'warn'}`}>
                            {p.daysLate} dias
                          </span>
                        </td>
                      )}
                      {activeTab === 'RECEIVED' && (
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--green-700)' }}>
                          {p.paymentDate ? fmtDate(p.paymentDate) : '—'}
                        </td>
                      )}
                      <td style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                        {BILLING_LABELS[p.billingType] ?? (p.billingType || '—')}
                      </td>
                      <td className="actions" style={{ textAlign: 'left' }}>
                        {p.customerPhone && (
                          <button className="btn btn-sm btn-ghost" style={{ color: 'var(--green-700)' }}
                            onClick={() => window.open(`https://wa.me/55${p.customerPhone!.replace(/\D/g,'')}`, '_blank')}>
                            <Ic.whatsapp />Cobrar
                          </button>
                        )}
                        {p.invoiceUrl && (
                          <button className="btn btn-sm btn-ghost"
                            onClick={() => window.open(p.invoiceUrl!, '_blank')}>
                            <Ic.eye />Boleto
                          </button>
                        )}
                        <button title="Mais"><Ic.more /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Rodapé + paginação */}
            {!loading && payments.length > 0 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>
                <span>
                  Mostrando {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} de {totalCount}
                </span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-secondary btn-sm" disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}>‹</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pg = Math.max(0, page - 2) + i;
                    if (pg >= totalPages) return null;
                    return (
                      <button key={pg}
                        className={`btn btn-sm ${page === pg ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setPage(pg)}>
                        {pg + 1}
                      </button>
                    );
                  })}
                  <button className="btn btn-secondary btn-sm" disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}>›</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
