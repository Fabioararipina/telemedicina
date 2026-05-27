import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import logoUrl from '../assets/logo.jpeg';
import { TermoFreelancer } from './TermoFreelancer';

const BASE = 'https://saudeagora24h.com.br/api-backend';

/* ── Tipos ── */
interface Employee { id: string; name: string; email: string; role: string; termsAccepted?: boolean; }
interface DashData {
  total: number; active: number;
  today: number; week: number; month: number;
  recent: SaleRow[];
}
interface SaleRow {
  id: string; customerName: string; plan: string; planType: string;
  status: string; value: number; createdAt: string;
  customerCpf?: string; customerPhone?: string;
}
interface MySalesData { totalCount: number; data: SaleRow[]; }

const STATUS_LABEL: Record<string, string> = { ACTIVE: 'Ativo', PENDING: 'Pendente', SUSPENDED: 'Suspenso', CANCELLED: 'Cancelado' };
const fmtBRL  = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

/* ── Auth helpers ── */
const getToken   = () => localStorage.getItem('emp_token') ?? '';
const getEmployee= (): Employee | null => { try { return JSON.parse(localStorage.getItem('emp_user') ?? 'null'); } catch { return null; } }
const authHeader = () => ({ Authorization: `Bearer ${getToken()}` });

/* ════════════════════════════════════════════════════════ LOGIN ════ */
function LoginPage({ onLogin }: { onLogin: (token: string, emp: Employee) => void }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleLogin = async () => {
    if (!email || !password) { setError('Preencha e-mail e senha.'); return; }
    setLoading(true); setError('');
    try {
      const r = await axios.post(`${BASE}/api/auth/employee/login`, { email, password });
      onLogin(r.data.token, r.data.employee);
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Erro ao conectar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 400,
        boxShadow: '0 40px 100px rgba(0,0,0,0.3)' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <img src={logoUrl} alt="Saúde Agora" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, color: '#0f172a' }}>Saúde Agora 24h</div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Painel de Vendas</div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>E-mail</span>
            <input
              style={{ padding: '10px 14px', borderRadius: 9, border: '1.5px solid #e2e8f0',
                fontSize: 14, fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s' }}
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'}
              onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </label>

          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Senha</span>
            <input
              style={{ padding: '10px 14px', borderRadius: 9, border: '1.5px solid #e2e8f0',
                fontSize: 14, fontFamily: 'inherit', outline: 'none', transition: 'border-color 0.15s' }}
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'}
              onBlur={e => e.currentTarget.style.borderColor = '#e2e8f0'}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </label>

          {error && (
            <div style={{ padding: '9px 12px', borderRadius: 8, background: '#fef2f2',
              border: '1px solid #fecaca', fontSize: 12, color: '#dc2626', fontWeight: 700 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{ marginTop: 6, padding: '12px', borderRadius: 10, border: 0,
              background: loading ? '#94a3b8' : '#1d4ed8', color: '#fff',
              fontSize: 14, fontWeight: 900, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            {loading ? 'Entrando…' : 'Entrar no painel'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════ SHELL ════ */
type Screen = 'dashboard' | 'nova-venda' | 'minhas-vendas';

function PainelShell({ employee, onLogout, children, screen, setScreen }: {
  employee: Employee; onLogout: () => void;
  children: React.ReactNode; screen: Screen; setScreen: (s: Screen) => void;
}) {
  const nav = [
    { id: 'dashboard'    as Screen, label: 'Dashboard',      icon: '📊' },
    { id: 'nova-venda'   as Screen, label: 'Nova Venda',     icon: '➕' },
    { id: 'minhas-vendas'as Screen, label: 'Minhas Vendas',  icon: '📋' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f8fafc' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: '#0f172a', display: 'flex', flexDirection: 'column',
        flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={logoUrl} alt="logo" style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'cover' }} />
            <div>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: 13 }}>Saúde Agora</div>
              <div style={{ color: '#64748b', fontWeight: 600, fontSize: 11 }}>Painel de Vendas</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {nav.map(it => (
            <div key={it.id}
              onClick={() => setScreen(it.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 9, cursor: 'pointer',
                marginBottom: 2,
                background: screen === it.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: screen === it.id ? '#fff' : '#94a3b8',
                fontWeight: screen === it.id ? 800 : 600,
                fontSize: 13, transition: 'all 0.15s',
              }}>
              <span>{it.icon}</span>
              <span>{it.label}</span>
            </div>
          ))}
        </nav>

        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1d4ed8',
              color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>
              {employee.name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('')}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: '#e2e8f0', fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{employee.name}</div>
              <div style={{ color: '#475569', fontSize: 11, fontWeight: 600 }}>{employee.role === 'SUPERVISOR' ? 'Supervisor' : 'Vendedor'}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}

/* ════════════════════════════════════════════════ DASHBOARD ════ */
function ScreenDashboard({ employee }: { employee: Employee }) {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get<DashData>(`${BASE}/api/sales/dashboard`, { headers: authHeader() })
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>Carregando…</div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>
          Olá, {employee.name.split(' ')[0]}! 👋
        </h1>
        <p style={{ color: '#64748b', fontWeight: 600, fontSize: 13, margin: '4px 0 0' }}>
          Aqui estão seus números de vendas.
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
        {[
          { label: 'Hoje',        value: data?.today  ?? 0, color: '#16a34a' },
          { label: 'Esta semana', value: data?.week   ?? 0, color: '#0284c7' },
          { label: 'Últimos 30d', value: data?.month  ?? 0, color: '#7c3aed' },
          { label: 'Total geral', value: data?.total  ?? 0, color: '#0f172a' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px',
            border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k.label}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: k.color, lineHeight: 1.1, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>venda{k.value !== 1 ? 's' : ''}</div>
          </div>
        ))}
      </div>

      {/* Últimas vendas */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0',
          fontSize: 13, fontWeight: 900, color: '#0f172a' }}>
          Últimas vendas
        </div>
        {(data?.recent ?? []).length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>
            Nenhuma venda registrada ainda.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Cliente', 'Plano', 'Status', 'Valor', 'Data'].map(h => (
                  <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800,
                    color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.recent.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 16px', fontWeight: 700 }}>{s.customerName}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 800,
                      background: '#f1f5f9', color: '#475569' }}>{s.plan}</span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 800,
                      background: s.status === 'ACTIVE' ? '#dcfce7' : s.status === 'PENDING' ? '#fef9c3' : '#f1f5f9',
                      color: s.status === 'ACTIVE' ? '#16a34a' : s.status === 'PENDING' ? '#a16207' : '#64748b' }}>
                      {STATUS_LABEL[s.status] ?? s.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px', fontWeight: 700, color: '#0f172a' }}>{fmtBRL(s.value)}</td>
                  <td style={{ padding: '10px 16px', color: '#64748b', fontFamily: 'monospace', fontSize: 12 }}>{fmtDate(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════ NOVA VENDA ════ */
interface PlanOption { id: string; name: string; type: string; price: number; periodLabel: string; }

function ScreenNovaVenda() {
  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [cpf,       setCpf]       = useState('');
  const [phone,     setPhone]     = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender,    setGender]    = useState('');
  const [planId,    setPlanId]    = useState('');
  const [plans,     setPlans]     = useState<PlanOption[]>([]);
  const [saving,    setSaving]    = useState(false);
  const [result,    setResult]    = useState<any>(null);
  const [error,     setError]     = useState('');

  useEffect(() => {
    axios.get<PlanOption[]>(`${BASE}/api/sales/plans`, { headers: authHeader() })
      .then(r => {
        setPlans(r.data);
        if (r.data.length > 0) setPlanId(r.data[0].id);
      })
      .catch(() => {});
  }, []);

  const fmtCpf   = (v: string) => v.replace(/\D/g,'').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4').slice(0,14);
  const fmtPhone = (v: string) => v.replace(/\D/g,'').replace(/(\d{2})(\d{5})(\d{4})/,'($1) $2-$3').slice(0,15);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !cpf.trim()) {
      setError('Nome, e-mail e CPF são obrigatórios.'); return;
    }
    if (!birthDate) { setError('Informe a data de nascimento do cliente.'); return; }
    if (!gender)    { setError('Informe o sexo biológico do cliente.'); return; }
    setSaving(true); setError(''); setResult(null);
    try {
      const r = await axios.post(`${BASE}/api/sales/checkout`,
        { name, email, cpf: cpf.replace(/\D/g,''), phone: phone.replace(/\D/g,''), planId, birthDate, gender },
        { headers: authHeader() }
      );
      setResult(r.data);
      setName(''); setEmail(''); setCpf(''); setPhone(''); setBirthDate(''); setGender('');
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Erro ao registrar venda.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>Nova Venda</h1>
        <p style={{ color: '#64748b', fontWeight: 600, fontSize: 13, margin: '4px 0 0' }}>
          Cadastre o cliente e registre a venda.
        </p>
      </div>

      {result && (
        <div style={{ marginBottom: 24, padding: '16px 20px', borderRadius: 12,
          background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 13, color: '#166534', fontWeight: 600, lineHeight: 1.8 }}>
          <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6 }}>✅ Venda registrada!</div>
          <div>Cliente: <strong>{result.customerName}</strong></div>
          <div>Plano: <strong>{result.plan}</strong></div>
          {result.invoiceUrl && (
            <div style={{ marginTop: 10 }}>
              <a href={result.invoiceUrl} target="_blank" rel="noreferrer"
                style={{ display: 'inline-block', padding: '8px 16px', borderRadius: 8,
                  background: '#16a34a', color: '#fff', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>
                📄 Abrir link de pagamento
              </a>
            </div>
          )}
          {result.mediteleStatus === 'FAILED' && (
            <div style={{ marginTop: 8, color: '#d97706', fontWeight: 700, fontSize: 12 }}>
              ⚠️ Paciente não criado na Meditele (erro na API deles) — vincule manualmente.
            </div>
          )}
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
        padding: '24px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'grid', gap: 16 }}>

        <Field label="Nome completo *">
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Ex: João da Silva" />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="CPF *">
            <input style={inputStyle} value={cpf} onChange={e => setCpf(fmtCpf(e.target.value))} placeholder="000.000.000-00" />
          </Field>
          <Field label="Telefone / WhatsApp">
            <input style={inputStyle} value={phone} onChange={e => setPhone(fmtPhone(e.target.value))} placeholder="(87) 99999-0000" />
          </Field>
        </div>

        <Field label="E-mail *">
          <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="joao@email.com" />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="Data de nascimento *">
            <input style={inputStyle} type="date" value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]} />
          </Field>
          <Field label="Sexo biológico *">
            <select style={inputStyle} value={gender} onChange={e => setGender(e.target.value)}>
              <option value="">Selecione…</option>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
            </select>
          </Field>
        </div>

        <Field label="Plano">
          <select style={inputStyle} value={planId} onChange={e => setPlanId(e.target.value)}>
            {plans.length === 0
              ? <option value="">Carregando planos…</option>
              : plans.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {fmtBRL(p.price)}{p.periodLabel}
                  </option>
                ))
            }
          </select>
        </Field>

        {error && (
          <div style={{ padding: '9px 12px', borderRadius: 8, background: '#fef2f2',
            border: '1px solid #fecaca', fontSize: 12, color: '#dc2626', fontWeight: 700 }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving}
          style={{ padding: '13px', borderRadius: 10, border: 0,
            background: saving ? '#94a3b8' : '#1d4ed8', color: '#fff',
            fontSize: 14, fontWeight: 900, cursor: saving ? 'default' : 'pointer', fontFamily: 'inherit' }}>
          {saving ? 'Registrando…' : 'Registrar venda'}
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 14px', borderRadius: 9, border: '1.5px solid #e2e8f0',
  fontSize: 14, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', outline: 'none',
};
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gap: 5 }}>
      <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      {children}
    </label>
  );
}

/* ════════════════════════════════════════════════ MINHAS VENDAS ════ */
const PAGE_SIZE = 15;

function ScreenMinhasVendas() {
  const [data,    setData]    = useState<MySalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(0);

  const load = useCallback(() => {
    setLoading(true);
    axios.get<MySalesData>(`${BASE}/api/sales/my-sales`,
      { headers: authHeader(), params: { offset: page * PAGE_SIZE, limit: PAGE_SIZE } })
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil((data?.totalCount ?? 0) / PAGE_SIZE);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', margin: 0 }}>Minhas Vendas</h1>
        <p style={{ color: '#64748b', fontWeight: 600, fontSize: 13, margin: '4px 0 0' }}>
          {data ? `${data.totalCount} venda${data.totalCount !== 1 ? 's' : ''} registrada${data.totalCount !== 1 ? 's' : ''}` : '…'}
        </p>
      </div>

      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontWeight: 700 }}>Carregando…</div>
        ) : (data?.data ?? []).length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Nenhuma venda ainda</div>
          </div>
        ) : (
          <>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['Cliente', 'CPF', 'Telefone', 'Plano', 'Status', 'Valor', 'Data'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 800,
                      color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em',
                      borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.data.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 16px', fontWeight: 700 }}>{s.customerName}</td>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12, color: '#475569' }}>{s.customerCpf}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#475569' }}>{s.customerPhone || '—'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 800,
                        background: '#f1f5f9', color: '#475569' }}>{s.plan}</span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 800,
                        background: s.status === 'ACTIVE' ? '#dcfce7' : s.status === 'PENDING' ? '#fef9c3' : '#f1f5f9',
                        color: s.status === 'ACTIVE' ? '#16a34a' : s.status === 'PENDING' ? '#a16207' : '#64748b' }}>
                        {STATUS_LABEL[s.status] ?? s.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px', fontWeight: 700 }}>{fmtBRL(s.value)}</td>
                    <td style={{ padding: '10px 16px', color: '#64748b', fontFamily: 'monospace', fontSize: 12 }}>{fmtDate(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid #e2e8f0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: 12, color: '#64748b', fontWeight: 700 }}>
                <span>Página {page + 1} de {totalPages} · {data?.totalCount} vendas</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
                    style={pageBtn(page === 0)}>‹ Anterior</button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
                    style={pageBtn(page >= totalPages - 1)}>Próxima ›</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function pageBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '6px 12px', borderRadius: 7, border: '1px solid #e2e8f0',
    background: disabled ? '#f8fafc' : '#fff', color: disabled ? '#cbd5e1' : '#0f172a',
    fontSize: 12, fontWeight: 700, cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
  };
}

/* ════════════════════════════════════════════════ ROOT ════ */
export function PainelApp() {
  const [employee, setEmployee] = useState<Employee | null>(getEmployee);
  const [screen,   setScreen]   = useState<Screen>('dashboard');

  // Valida token ao carregar e sincroniza termsAccepted do servidor
  useEffect(() => {
    const token = getToken();
    if (!token || !employee) return;
    axios.get(`${BASE}/api/auth/employee/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        const updated: Employee = {
          id: r.data.id, name: r.data.name,
          email: r.data.email, role: r.data.role,
          termsAccepted: r.data.termsAccepted,
        };
        localStorage.setItem('emp_user', JSON.stringify(updated));
        setEmployee(updated);
      })
      .catch(() => { handleLogout(); });
  }, []);

  const handleLogin = (token: string, emp: Employee) => {
    localStorage.setItem('emp_token', token);
    localStorage.setItem('emp_user', JSON.stringify(emp));
    setEmployee(emp);
  };

  const handleLogout = () => {
    localStorage.removeItem('emp_token');
    localStorage.removeItem('emp_user');
    setEmployee(null);
  };

  if (!employee) return <LoginPage onLogin={handleLogin} />;

  // Bloqueia o painel até o termo ser aceito
  if (!employee.termsAccepted) {
    return (
      <TermoFreelancer
        employeeName={employee.name}
        token={getToken()}
        onAccepted={() => setEmployee(e => e ? { ...e, termsAccepted: true } : e)}
      />
    );
  }

  return (
    <PainelShell employee={employee} onLogout={handleLogout} screen={screen} setScreen={setScreen}>
      {screen === 'dashboard'     && <ScreenDashboard employee={employee} />}
      {screen === 'nova-venda'    && <ScreenNovaVenda />}
      {screen === 'minhas-vendas' && <ScreenMinhasVendas />}
    </PainelShell>
  );
}
