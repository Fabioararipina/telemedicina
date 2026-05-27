import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Sidebar, Topbar, PageHeader } from '../shell';

const BASE  = 'https://saudeagora24h.com.br/api-backend';
const TOKEN = 'saude@admin2026';
const H     = { 'x-admin-token': TOKEN };

/* ── Types ── */
interface GatewayConfig {
  env: 'sandbox' | 'production';
  hasKey: boolean;
  keyMasked: string;
  webhookUrl: string;
  webhookEvents: string[];
  source: 'db' | 'env' | 'none';
  envSource: 'db' | 'env' | 'default';
}

interface TestResult {
  ok: boolean;
  error?: string;
  account?: {
    name: string; email: string; cpfCnpj: string;
    balance: number; env: string;
  };
}

interface AsaasPayment {
  id: string;
  customer: string;
  customerName?: string;
  description: string;
  value: number;
  netValue: number;
  billingType: string;
  status: string;
  dueDate: string;
  paymentDate?: string | null;
  invoiceUrl?: string;
}

const STATUS_MAP: Record<string, { label: string; tone: string }> = {
  PENDING:   { label: 'Aguardando',  tone: 'warn'    },
  RECEIVED:  { label: 'Recebido',    tone: 'success'  },
  CONFIRMED: { label: 'Confirmado',  tone: 'success'  },
  OVERDUE:   { label: 'Vencido',     tone: 'danger'   },
  REFUNDED:  { label: 'Estornado',   tone: 'muted'    },
  CANCELLED: { label: 'Cancelado',   tone: 'muted'    },
  RECEIVED_IN_CASH_UNDONE: { label: 'Desfeito', tone: 'muted' },
};

const BILLING_MAP: Record<string, string> = {
  CREDIT_CARD: 'Cartão',
  BOLETO:      'Boleto',
  PIX:         'Pix',
  UNDEFINED:   '—',
};

function StatusBadge({ status }: { status: string }) {
  const t = STATUS_MAP[status] ?? { label: status, tone: 'muted' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 800,
      background: `var(--st-${t.tone}-bg)`, color: `var(--st-${t.tone})`,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
      {t.label}
    </span>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="card" style={{ padding: '20px 22px', ...style }}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase',
      color: 'var(--ink-3)', marginBottom: 14 }}>
      {children}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: 11, fontWeight: 800, color: 'var(--ink-3)',
      textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
      {children}
    </label>
  );
}

function Alert({ type, children }: { type: 'success' | 'error' | 'info' | 'warn'; children: React.ReactNode }) {
  const colors = {
    success: { bg: 'var(--st-success-bg)', border: 'var(--st-success)',     color: 'var(--green-700)', icon: '✅' },
    error:   { bg: 'var(--st-danger-bg)',  border: 'var(--st-danger)',       color: 'var(--red-600)',   icon: '❌' },
    info:    { bg: 'var(--st-info-bg)',    border: 'var(--st-info)',         color: 'var(--sky-700)',   icon: 'ℹ️' },
    warn:    { bg: 'var(--st-warn-bg)',    border: 'var(--st-warn)',         color: 'var(--amber-600)', icon: '⚠️' },
  }[type];
  return (
    <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 10,
      padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13,
      color: colors.color, fontWeight: 600, lineHeight: 1.5 }}>
      <span>{colors.icon}</span>
      <span>{children}</span>
    </div>
  );
}

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* ══════════════════════════════════════════════════════════════════
   SCREEN
═══════════════════════════════════════════════════════════════════ */
export function ScreenGateway({ onNav }: { onNav: (id: string) => void }) {
  // Config
  const [cfg,       setCfg]       = useState<GatewayConfig | null>(null);
  const [cfgLoading, setCfgLoading] = useState(true);

  // Form
  const [env,       setEnv]       = useState<'sandbox' | 'production'>('sandbox');
  const [apiKey,    setApiKey]    = useState('');
  const [showKey,   setShowKey]   = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [saveMsg,   setSaveMsg]   = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Test
  const [testing,   setTesting]   = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Payments
  const [payments,  setPayments]  = useState<AsaasPayment[]>([]);
  const [payLoading, setPayLoading] = useState(false);
  const [payError,  setPayError]  = useState('');

  // Copy
  const [copied,    setCopied]    = useState(false);

  const loadConfig = useCallback(async () => {
    setCfgLoading(true);
    try {
      const r = await axios.get<GatewayConfig>(`${BASE}/api/admin/gateway`, { headers: H });
      setCfg(r.data);
      setEnv(r.data.env);
    } catch { /* ignore */ }
    finally { setCfgLoading(false); }
  }, []);

  const loadPayments = useCallback(async () => {
    setPayLoading(true);
    setPayError('');
    try {
      const r = await axios.get<{ data: AsaasPayment[] }>(`${BASE}/api/admin/gateway/payments`, { headers: H });
      setPayments(r.data.data ?? []);
    } catch (e: any) {
      setPayError(e.response?.data?.error ?? 'Erro ao carregar pagamentos.');
    } finally { setPayLoading(false); }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Carrega pagamentos quando conectado
  useEffect(() => {
    if (cfg?.hasKey) loadPayments();
  }, [cfg?.hasKey, loadPayments]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await axios.post(`${BASE}/api/admin/gateway/config`, { env, apiKey: apiKey || undefined }, { headers: H });
      setSaveMsg({ type: 'success', text: 'Configuração salva com sucesso!' });
      setApiKey('');
      await loadConfig();
    } catch (e: any) {
      setSaveMsg({ type: 'error', text: e.response?.data?.error ?? 'Erro ao salvar.' });
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await axios.post<TestResult>(`${BASE}/api/admin/gateway/test`, {}, { headers: H });
      setTestResult(r.data);
    } catch (e: any) {
      setTestResult({ ok: false, error: e.response?.data?.error ?? 'Falha na requisição.' });
    } finally { setTesting(false); }
  };

  const handleCopy = () => {
    if (!cfg) return;
    navigator.clipboard.writeText(cfg.webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isConnected = cfg?.hasKey && testResult?.ok;
  const connStatus  = cfgLoading
    ? 'Carregando…'
    : !cfg?.hasKey
    ? 'Sem credenciais'
    : testResult?.ok
    ? `Conectado · ${testResult.account?.name ?? ''}`
    : testResult
    ? 'Falha na conexão'
    : 'Credenciais configuradas · não testado';

  const connColor = cfgLoading ? 'var(--ink-3)'
    : !cfg?.hasKey ? 'var(--ink-3)'
    : testResult?.ok ? 'var(--green-600)'
    : testResult ? 'var(--red-600)'
    : 'var(--amber-600)';

  return (
    <div className="sa-shell">
      <Sidebar active="gateway" onNav={onNav} />
      <main className="sa-main">
        <Topbar
          breadcrumb={['Financeiro', 'Gateway de Pagamento']}
          actions={
            <button
              onClick={handleTest}
              disabled={testing || !cfg?.hasKey}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8, border: '1.5px solid var(--border)',
                background: '#fff', fontSize: 13, fontWeight: 800, cursor: testing || !cfg?.hasKey ? 'default' : 'pointer',
                color: testing || !cfg?.hasKey ? 'var(--ink-3)' : 'var(--ink-2)',
                opacity: !cfg?.hasKey ? 0.5 : 1,
              }}
            >
              {testing ? (
                <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              ) : '⚡'}
              Testar conexão
            </button>
          }
        />

        <div className="sa-content">
          <PageHeader
            title="Gateway de Pagamento"
            subtitle="Configuração da integração com Asaas · cobranças, assinaturas e webhooks"
          />

          {/* ── Status bar ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
            borderRadius: 10, marginBottom: 22,
            background: isConnected ? 'var(--green-50)' : 'var(--slate-100)',
            border: `1px solid ${isConnected ? 'var(--green-100)' : 'var(--border)'}`,
          }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: connColor, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: connColor }}>{connStatus}</span>
            {testResult?.ok && testResult.account && (
              <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginLeft: 4 }}>
                · {testResult.account.env === 'sandbox' ? '🧪 Sandbox' : '🚀 Produção'}
                · Saldo: {fmtBRL(testResult.account.balance)}
              </span>
            )}
            {testResult && !testResult.ok && (
              <span style={{ fontSize: 12, color: 'var(--red-600)', fontWeight: 600, marginLeft: 4 }}>
                · {testResult.error}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* ── Card: Credenciais ── */}
            <Card>
              <SectionTitle>Credenciais Asaas</SectionTitle>

              {/* Ambiente */}
              <div style={{ marginBottom: 18 }}>
                <FieldLabel>Ambiente</FieldLabel>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {(['sandbox', 'production'] as const).map(e => (
                    <button
                      key={e}
                      onClick={() => setEnv(e)}
                      style={{
                        padding: '10px 14px', borderRadius: 9, cursor: 'pointer', textAlign: 'left',
                        border: `${env === e ? '2px solid' : '1.5px solid'}`,
                        borderColor: env === e ? (e === 'production' ? 'var(--green-500)' : 'var(--sky-500)') : 'var(--border)',
                        background: env === e ? (e === 'production' ? 'var(--green-50)' : 'var(--sky-50)') : '#fff',
                      }}
                    >
                      <div style={{ fontSize: 18, marginBottom: 4 }}>
                        {e === 'sandbox' ? '🧪' : '🚀'}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 900,
                        color: env === e ? (e === 'production' ? 'var(--green-700)' : 'var(--sky-700)') : 'var(--ink-2)' }}>
                        {e === 'sandbox' ? 'Sandbox' : 'Produção'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}>
                        {e === 'sandbox' ? 'Testes e homologação' : 'Cobranças reais'}
                      </div>
                    </button>
                  ))}
                </div>
                {cfg && cfg.envSource !== 'default' && (
                  <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 6, fontWeight: 600 }}>
                    Atual: <strong>{cfg.env}</strong> (via {cfg.envSource === 'db' ? 'banco de dados' : '.env'})
                  </div>
                )}
              </div>

              {/* API Key */}
              <div style={{ marginBottom: 18 }}>
                <FieldLabel>API Key</FieldLabel>
                {cfg?.hasKey && !apiKey && (
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 6, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--green-600)' }}>●</span>
                    Configurada: <code style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{cfg.keyMasked}</code>
                    <span style={{ fontSize: 10, background: cfg.source === 'db' ? 'var(--sky-50)' : 'var(--amber-50)',
                      color: cfg.source === 'db' ? 'var(--sky-700)' : 'var(--amber-600)',
                      padding: '1px 6px', borderRadius: 4, fontWeight: 800 }}>
                      via {cfg.source}
                    </span>
                  </div>
                )}
                <div style={{ position: 'relative' }}>
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={cfg?.hasKey ? 'Nova chave para substituir a atual…' : 'Cole sua API Key aqui'}
                    style={{
                      width: '100%', padding: '9px 40px 9px 12px', borderRadius: 8,
                      border: '1.5px solid var(--border)', fontSize: 13, fontFamily: 'var(--mono)',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                  <button
                    onClick={() => setShowKey(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: 16,
                      color: 'var(--ink-3)', padding: 0 }}>
                    {showKey ? '🙈' : '👁️'}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 5, fontWeight: 600 }}>
                  Encontre em: Asaas → Minha Conta → Integrações → API Key
                </div>
              </div>

              {/* Save message */}
              {saveMsg && (
                <div style={{ marginBottom: 14 }}>
                  <Alert type={saveMsg.type}>{saveMsg.text}</Alert>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving || (!apiKey && env === cfg?.env)}
                style={{
                  width: '100%', padding: '11px', borderRadius: 9, border: 'none',
                  background: saving || (!apiKey && env === cfg?.env) ? 'var(--slate-200)' : 'var(--accent)',
                  color: saving || (!apiKey && env === cfg?.env) ? 'var(--ink-3)' : '#fff',
                  fontSize: 13, fontWeight: 900, cursor: saving || (!apiKey && env === cfg?.env) ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {saving ? (
                  <><span style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Salvando…</>
                ) : '💾 Salvar configuração'}
              </button>

              {/* Test result inline */}
              {testResult && (
                <div style={{ marginTop: 14 }}>
                  <Alert type={testResult.ok ? 'success' : 'error'}>
                    {testResult.ok
                      ? <>Conexão OK · <strong>{testResult.account?.name}</strong> ({testResult.account?.email})</>
                      : <>Falha: {testResult.error}</>}
                  </Alert>
                </div>
              )}
            </Card>

            {/* ── Card: Webhook ── */}
            <Card>
              <SectionTitle>Webhook</SectionTitle>

              <div style={{ marginBottom: 18 }}>
                <FieldLabel>URL de callback</FieldLabel>
                <div style={{ display: 'flex', gap: 8 }}>
                  <code style={{
                    flex: 1, padding: '9px 12px', borderRadius: 8, fontSize: 11,
                    background: 'var(--slate-100)', border: '1.5px solid var(--border)',
                    fontFamily: 'var(--mono)', color: 'var(--ink-2)', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                  }}>
                    {cfg?.webhookUrl ?? '—'}
                  </code>
                  <button
                    onClick={handleCopy}
                    style={{ padding: '9px 14px', borderRadius: 8, border: '1.5px solid var(--border)',
                      background: copied ? 'var(--green-50)' : '#fff', cursor: 'pointer',
                      fontSize: 13, fontWeight: 800, color: copied ? 'var(--green-700)' : 'var(--ink-2)',
                      whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {copied ? '✓ Copiado' : '📋 Copiar'}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <FieldLabel>Eventos necessários</FieldLabel>
                <div style={{ display: 'grid', gap: 6 }}>
                  {(cfg?.webhookEvents ?? ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED', 'PAYMENT_OVERDUE', 'PAYMENT_REFUNDED', 'SUBSCRIPTION_DELETED']).map(ev => (
                    <div key={ev} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                      borderRadius: 7, background: 'var(--slate-50)', border: '1px solid var(--border)' }}>
                      <span style={{ color: 'var(--green-600)', fontWeight: 900, fontSize: 12 }}>✓</span>
                      <code style={{ fontSize: 11.5, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--ink-2)' }}>{ev}</code>
                    </div>
                  ))}
                </div>
              </div>

              <Alert type="info">
                <div>
                  <strong>Registre manualmente no painel Asaas</strong><br />
                  <span style={{ fontSize: 12 }}>
                    Asaas → Configurações → Integrações → Webhooks → Nova URL
                  </span>
                </div>
              </Alert>

              <div style={{ marginTop: 14, padding: '12px 14px', borderRadius: 9,
                background: 'var(--amber-50)', border: '1px solid var(--amber-100)' }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--amber-600)',
                  textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                  O que cada evento faz
                </div>
                {[
                  { ev: 'PAYMENT_CONFIRMED / RECEIVED', desc: 'Ativa assinatura local + envia magic link no WhatsApp' },
                  { ev: 'PAYMENT_OVERDUE',              desc: 'Suspende acesso por inadimplência' },
                  { ev: 'PAYMENT_REFUNDED',             desc: 'Cancela assinatura local' },
                  { ev: 'SUBSCRIPTION_DELETED',         desc: 'Cancela assinatura local' },
                ].map(({ ev, desc }) => (
                  <div key={ev} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12 }}>
                    <code style={{ fontFamily: 'var(--mono)', fontSize: 10.5, color: 'var(--amber-700)',
                      background: 'var(--amber-100)', padding: '1px 5px', borderRadius: 4, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {ev}
                    </code>
                    <span style={{ color: 'var(--ink-2)', fontWeight: 600 }}>{desc}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* ── Pagamentos Recentes ── */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <SectionTitle>Pagamentos Recentes · Asaas</SectionTitle>
              <button
                onClick={loadPayments}
                disabled={payLoading || !cfg?.hasKey}
                style={{ padding: '7px 14px', borderRadius: 7, border: '1.5px solid var(--border)',
                  background: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer',
                  color: 'var(--ink-2)', opacity: !cfg?.hasKey ? 0.4 : 1,
                  display: 'flex', alignItems: 'center', gap: 6 }}>
                {payLoading
                  ? <><span style={{ width: 12, height: 12, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} /> Carregando…</>
                  : '↻ Atualizar'}
              </button>
            </div>

            {!cfg?.hasKey ? (
              <Alert type="warn">Configure a API Key para visualizar os pagamentos.</Alert>
            ) : payLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                Carregando pagamentos…
              </div>
            ) : payError ? (
              <Alert type="error">{payError}</Alert>
            ) : payments.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                Nenhum pagamento encontrado.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      {['ID', 'Descrição', 'Forma', 'Valor', 'Valor Líquido', 'Vencimento', 'Pagamento', 'Status', ''].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '8px 10px',
                          fontSize: 10.5, fontWeight: 900, textTransform: 'uppercase',
                          letterSpacing: '0.08em', color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--slate-50)')}
                        onMouseLeave={e => (e.currentTarget.style.background = '')}>
                        <td style={{ padding: '9px 10px' }}>
                          <code style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--ink-3)' }}>
                            {p.id.slice(0, 8)}…
                          </code>
                        </td>
                        <td style={{ padding: '9px 10px', maxWidth: 200 }}>
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap', fontWeight: 700, color: 'var(--ink)' }}>
                            {p.description || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '9px 10px', whiteSpace: 'nowrap', color: 'var(--ink-2)', fontWeight: 600 }}>
                          {BILLING_MAP[p.billingType] ?? p.billingType}
                        </td>
                        <td style={{ padding: '9px 10px', fontWeight: 900, color: 'var(--ink)',
                          fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          {fmtBRL(p.value)}
                        </td>
                        <td style={{ padding: '9px 10px', fontWeight: 700, color: 'var(--green-700)',
                          fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          {fmtBRL(p.netValue)}
                        </td>
                        <td style={{ padding: '9px 10px', color: 'var(--ink-2)', fontWeight: 600,
                          whiteSpace: 'nowrap', fontFamily: 'var(--mono)', fontSize: 12 }}>
                          {new Date(p.dueDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ padding: '9px 10px', color: 'var(--ink-3)', fontWeight: 600,
                          whiteSpace: 'nowrap', fontFamily: 'var(--mono)', fontSize: 12 }}>
                          {p.paymentDate
                            ? new Date(p.paymentDate + 'T12:00:00').toLocaleDateString('pt-BR')
                            : '—'}
                        </td>
                        <td style={{ padding: '9px 10px' }}>
                          <StatusBadge status={p.status} />
                        </td>
                        <td style={{ padding: '9px 10px' }}>
                          {p.invoiceUrl && (
                            <a href={p.invoiceUrl} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: 11, color: 'var(--sky-600)', fontWeight: 800,
                                textDecoration: 'none', border: '1px solid var(--sky-200)',
                                padding: '3px 8px', borderRadius: 5, whiteSpace: 'nowrap' }}>
                              Ver fatura ↗
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

        </div>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
