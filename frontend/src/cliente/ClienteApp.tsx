import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import logoUrl from '../assets/logo.jpeg';

const BASE = 'https://saudeagora24h.com.br/api-backend';
const WA_SUPORTE = 'https://wa.me/5587988888888'; // TODO: trocar pelo número real

/* ── Tipos ── */
interface UserData {
  id: string; name: string; email: string; cpf: string; phone: string | null;
  hasMeditele: boolean;
  subscription: SubData | null;
  history: HistorySub[];
}
interface SubData {
  id: string; status: string; planName: string; planType: string;
  planPrice: number; startDate: string; endDate: string | null; features: string[];
}
interface HistorySub {
  id: string; status: string; planName: string; planType: string;
  planPrice: number; startDate: string; endDate: string | null; createdAt: string;
}

/* ── Auth helpers ── */
const getToken    = () => localStorage.getItem('cli_token') ?? '';
const getCachedUser = (): UserData | null => {
  try { return JSON.parse(localStorage.getItem('cli_user') ?? 'null'); } catch { return null; }
};
const authH = () => ({ Authorization: `Bearer ${getToken()}` });

/* ── Helpers de formatação ── */
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');
const fmtBRL  = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;
const fmtCPF  = (v: string) => v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
const fmtPhone = (v: string) => {
  const c = v.replace(/\D/g, '');
  return c.length === 11
    ? c.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    : c.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
};
const firtName  = (full: string) => full.split(' ')[0];

/* ── Status config ── */
const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE:    { label: 'Ativo',     color: '#059669', bg: '#d1fae5' },
  PENDING:   { label: 'Pendente',  color: '#d97706', bg: '#fef3c7' },
  SUSPENDED: { label: 'Suspenso',  color: '#dc2626', bg: '#fee2e2' },
  CANCELLED: { label: 'Cancelado', color: '#64748b', bg: '#f1f5f9' },
};
const PLAN_ICON: Record<string, string> = { INDIVIDUAL: '👤', FAMILIAR: '👨‍👩‍👦', AVULSO: '⚡', CORTESIA: '🎁' };

type Screen = 'home' | 'agendar' | 'plano' | 'historico' | 'dados';

/* ── Tipos de agendamento ── */
interface Specialty  { id: number; name: string; price: number; }
interface MedDoctor  { id: number; name: string; specialty: string; price: number; is_real: boolean; }
interface BookingResult {
  consultation_code: string; consultation_id: string;
  scheduled_for: string; patient_link: string; price: number; is_paid: boolean;
}

/* ── Injetar Nunito ── */
function useNunito() {
  useEffect(() => {
    const id = 'nunito-font';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap';
    document.head.appendChild(link);
  }, []);
}

/* ════════════════════════════════════════════════════════════ LOGIN ════ */
function LoginScreen({ onLogin }: { onLogin: (token: string, user: UserData) => void }) {
  useNunito();
  const [login,    setLogin]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showPw,   setShowPw]   = useState(false);

  const fmtLoginInput = (v: string) => {
    const d = v.replace(/\D/g, '');
    // Se parece CPF (só dígitos), mascara
    if (v === d && d.length <= 14)
      return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3').slice(0, 14);
    return v;
  };

  const handleLogin = async () => {
    if (!login.trim() || !password) { setError('Preencha todos os campos.'); return; }
    setLoading(true); setError('');
    try {
      const r = await axios.post(`${BASE}/api/customer/auth/login`, {
        login: login.replace(/\D/g, '').length >= 11 ? login.replace(/\D/g, '') : login,
        password,
      });
      localStorage.setItem('cli_token', r.data.token);
      // Carrega dados completos
      const me = await axios.get<UserData>(`${BASE}/api/customer/me`, { headers: { Authorization: `Bearer ${r.data.token}` } });
      localStorage.setItem('cli_user', JSON.stringify(me.data));
      onLogin(r.data.token, me.data);
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Erro ao conectar. Verifique sua conexão.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #0ea5e9 0%, #0284c7 40%, #0f172a 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: "'Nunito', sans-serif" }}>

      {/* Card */}
      <div style={{ background: '#fff', borderRadius: 24, width: '100%', maxWidth: 400,
        padding: '36px 28px 28px', boxShadow: '0 24px 80px rgba(0,0,0,0.3)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <img src={logoUrl} alt="Saúde Agora 24h"
            style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover',
              boxShadow: '0 4px 16px rgba(14,165,233,0.3)', marginBottom: 12 }} />
          <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>Saúde Agora 24h</div>
          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Área do Cliente</div>
        </div>

        <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>
          Bem-vindo de volta 👋
        </div>
        <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 24 }}>
          Entre com seu CPF ou e-mail
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              CPF ou E-mail
            </span>
            <input
              style={{ padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                fontSize: 15, fontFamily: 'inherit', outline: 'none' }}
              type="text" value={login} placeholder="000.000.000-00 ou email@email.com"
              onChange={e => setLogin(fmtLoginInput(e.target.value))}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              inputMode="text" autoCapitalize="none" autoCorrect="off"
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Senha
            </span>
            <div style={{ position: 'relative' }}>
              <input
                style={{ padding: '12px 44px 12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                  fontSize: 15, fontFamily: 'inherit', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                type={showPw ? 'text' : 'password'} value={password}
                placeholder="••••••••"
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <button
                type="button" onClick={() => setShowPw(p => !p)}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 0, cursor: 'pointer', fontSize: 16, color: '#94a3b8', padding: 0 }}>
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>
          </label>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2',
              border: '1px solid #fecaca', fontSize: 13, color: '#dc2626', fontWeight: 700 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin} disabled={loading}
            style={{ padding: '14px', borderRadius: 12, border: 0,
              background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              color: '#fff', fontSize: 15, fontWeight: 900, cursor: loading ? 'default' : 'pointer',
              fontFamily: 'inherit', boxShadow: loading ? 'none' : '0 4px 16px rgba(14,165,233,0.4)' }}>
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </div>

        {/* Dica de senha */}
        <div style={{ marginTop: 20, padding: '12px 14px', borderRadius: 10, background: '#f0f9ff',
          border: '1px solid #bae6fd', fontSize: 12, color: '#0369a1', fontWeight: 600, lineHeight: 1.6 }}>
          💡 <strong>Primeira vez aqui?</strong> Se você foi cadastrado por nosso vendedor, sua senha inicial são os
          últimos 6 dígitos do seu CPF.
        </div>

        {/* Suporte */}
        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <a href={WA_SUPORTE} target="_blank" rel="noreferrer"
            style={{ fontSize: 13, color: '#0ea5e9', fontWeight: 700, textDecoration: 'none' }}>
            Precisa de ajuda? Fale no WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ HOME ════ */
function HomeScreen({ user, onConsultar }: { user: UserData; onConsultar: () => void }) {
  const sub = user.subscription;
  const cfg = STATUS[sub?.status ?? 'PENDING'];
  const isActive = sub?.status === 'ACTIVE';

  return (
    <div>
      {/* Saudação */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', lineHeight: 1.2 }}>
          Olá, {firtName(user.name)}! 👋
        </div>
        <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginTop: 4 }}>
          Aqui está seu acesso à saúde 24h
        </div>
      </div>

      {/* Card consultar */}
      <div style={{
        borderRadius: 20, padding: '24px 22px',
        background: isActive
          ? 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 60%, #0369a1 100%)'
          : 'linear-gradient(135deg, #94a3b8, #64748b)',
        boxShadow: isActive ? '0 8px 32px rgba(14,165,233,0.35)' : '0 4px 16px rgba(0,0,0,0.1)',
        marginBottom: 16, color: '#fff',
      }}>
        <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.8, textTransform: 'uppercase',
          letterSpacing: '0.1em', marginBottom: 8 }}>
          {isActive ? '✅ Plano Ativo' : cfg.label}
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, marginBottom: 4 }}>
          {isActive ? 'Médico agora mesmo' : 'Plano ' + cfg.label.toLowerCase()}
        </div>
        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 20, lineHeight: 1.5 }}>
          {isActive
            ? 'Clínico geral, cardiologia, pediatria e mais — disponível 24h'
            : isActive === false && sub?.status === 'PENDING'
              ? 'Aguardando confirmação do pagamento para liberar o acesso'
              : 'Renove seu plano para ter acesso às consultas'}
        </div>
        <button
          onClick={onConsultar}
          disabled={!isActive || !user.hasMeditele}
          style={{
            width: '100%', padding: '14px', borderRadius: 12,
            border: '1.5px solid rgba(255,255,255,0.3)',
            background: (isActive && user.hasMeditele) ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
            color: '#fff', fontSize: 15, fontWeight: 900, cursor: (isActive && user.hasMeditele) ? 'pointer' : 'default',
            fontFamily: 'inherit', backdropFilter: 'blur(8px)',
          } as any}>
          {!user.hasMeditele ? '⚠️ Conta em configuração' : isActive ? '🩺 Consultar agora' : '🔒 Plano inativo'}
        </button>
        {!user.hasMeditele && (
          <div style={{ fontSize: 11, opacity: 0.7, textAlign: 'center', marginTop: 8 }}>
            Aguarde o suporte ativar sua conta de telemedicina
          </div>
        )}
      </div>

      {/* Mini card do plano */}
      {sub && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '16px 18px',
          border: '1px solid #e2e8f0', marginBottom: 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b',
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
              {PLAN_ICON[sub.planType] ?? '📋'} Seu plano
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>{sub.planName}</div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginTop: 2 }}>
              Desde {fmtDate(sub.startDate)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800,
              background: cfg.bg, color: cfg.color }}>
              {cfg.label}
            </span>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', marginTop: 6 }}>
              {fmtBRL(sub.planPrice)}<span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>/mês</span>
            </div>
          </div>
        </div>
      )}

      {/* Atalhos rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { icon: '📞', label: 'Suporte', sub: 'Fale conosco', href: WA_SUPORTE },
        ].map(item => (
          <a key={item.label} href={item.href} target="_blank" rel="noreferrer"
            style={{ background: '#fff', borderRadius: 14, padding: '14px 16px',
              border: '1px solid #e2e8f0', textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{item.icon}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{item.label}</div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{item.sub}</div>
            </div>
          </a>
        ))}
        <div style={{ background: '#fff', borderRadius: 14, padding: '14px 16px',
          border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>🕐</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>Disponível</div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>24h por dia</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ MEU PLANO ════ */
function PlanoScreen({ user }: { user: UserData }) {
  const sub = user.subscription;
  const cfg = STATUS[sub?.status ?? 'PENDING'];

  if (!sub) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
          Nenhum plano ativo
        </div>
        <div style={{ fontSize: 14, color: '#64748b', fontWeight: 600, marginBottom: 24 }}>
          Você ainda não possui um plano contratado.
        </div>
        <a href={WA_SUPORTE} target="_blank" rel="noreferrer"
          style={{ padding: '12px 24px', borderRadius: 12, background: '#0ea5e9', color: '#fff',
            fontWeight: 800, fontSize: 14, textDecoration: 'none', display: 'inline-block' }}>
          Contratar plano →
        </a>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a' }}>Meu Plano</div>
        <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Detalhes da sua assinatura</div>
      </div>

      {/* Card principal */}
      <div style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)', borderRadius: 20,
        padding: '22px 20px', color: '#fff', marginBottom: 16, boxShadow: '0 8px 24px rgba(14,165,233,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.75, textTransform: 'uppercase',
              letterSpacing: '0.1em', marginBottom: 6 }}>
              {PLAN_ICON[sub.planType] ?? '📋'} {sub.planType}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2 }}>{sub.planName}</div>
          </div>
          <span style={{ padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 800,
            background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }}>
            {cfg.label}
          </span>
        </div>
        <div style={{ marginTop: 16, fontSize: 28, fontWeight: 900 }}>
          {fmtBRL(sub.planPrice)}
          <span style={{ fontSize: 13, opacity: 0.75, fontWeight: 600 }}>/mês</span>
        </div>
      </div>

      {/* Informações */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
        overflow: 'hidden', marginBottom: 16 }}>
        {[
          { label: 'Status',         value: <span style={{ padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 800, background: cfg.bg, color: cfg.color }}>{cfg.label}</span> },
          { label: 'Início',         value: fmtDate(sub.startDate) },
          { label: 'Válido até',     value: sub.endDate ? fmtDate(sub.endDate) : '—' },
          { label: 'Tipo de plano',  value: sub.planType === 'FAMILIAR' ? 'Familiar (até 3 pessoas)' : sub.planType === 'INDIVIDUAL' ? 'Individual' : sub.planType === 'AVULSO' ? '30 dias (avulso)' : sub.planType },
        ].map((row, i, arr) => (
          <div key={row.label} style={{ padding: '14px 18px',
            borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>{row.label}</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{row.value}</span>
          </div>
        ))}
      </div>

      {/* Features */}
      {sub.features.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '16px 18px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase',
            letterSpacing: '0.08em', marginBottom: 12 }}>O que está incluso</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {sub.features.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: '#10b981', fontSize: 16, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suporte */}
      <a href={WA_SUPORTE} target="_blank" rel="noreferrer"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '14px', borderRadius: 12, border: '1.5px solid #e2e8f0',
          background: '#fff', color: '#0ea5e9', fontWeight: 800, fontSize: 14, textDecoration: 'none' }}>
        💬 Dúvidas? Fale com o suporte
      </a>
    </div>
  );
}

/* ════════════════════════════════════════════════════════ HISTÓRICO ════ */
function HistoricoScreen({ user }: { user: UserData }) {
  const hist = user.history;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a' }}>Histórico</div>
        <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>
          {hist.length} registro{hist.length !== 1 ? 's' : ''} encontrado{hist.length !== 1 ? 's' : ''}
        </div>
      </div>

      {hist.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
          <div style={{ fontWeight: 800, color: '#0f172a' }}>Nenhum registro</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {hist.map(h => {
            const cfg = STATUS[h.status] ?? STATUS.CANCELLED;
            return (
              <div key={h.id} style={{ background: '#fff', borderRadius: 14,
                border: '1px solid #e2e8f0', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>
                      {PLAN_ICON[h.planType] ?? '📋'} {h.planName}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginTop: 2 }}>
                      Início: {fmtDate(h.startDate)}
                      {h.endDate ? ` · Término: ${fmtDate(h.endDate)}` : ''}
                    </div>
                  </div>
                  <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 800,
                    background: cfg.bg, color: cfg.color, flexShrink: 0 }}>
                    {cfg.label}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
                    Contratado em {fmtDate(h.createdAt)}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 900, color: '#0f172a' }}>
                    {fmtBRL(h.planPrice)}/mês
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════ MEUS DADOS ════ */
function DadosScreen({ user, onUpdate }: { user: UserData; onUpdate: (u: UserData) => void }) {
  const [phone, setPhone] = useState(user.phone ? fmtPhone(user.phone) : '');
  const [email, setEmail] = useState(user.email);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]   = useState('');

  const fmtPhoneInput = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    return d.length === 11 ? d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
      : d.length >= 7     ? d.replace(/(\d{2})(\d{4,5})(\d{0,4})/, '($1) $2-$3')
      : d.length >= 3     ? d.replace(/(\d{2})(\d+)/, '($1) $2')
      : d;
  };

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess(false);
    try {
      const r = await axios.put(`${BASE}/api/customer/profile`,
        { phone: phone.replace(/\D/g, '') || undefined, email: email.trim() || undefined },
        { headers: authH() }
      );
      const updated: UserData = { ...user, phone: r.data.phone, email: r.data.email };
      localStorage.setItem('cli_user', JSON.stringify(updated));
      onUpdate(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Erro ao salvar. Tente novamente.');
    } finally { setSaving(false); }
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a' }}>Meus Dados</div>
        <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Gerencie seu perfil</div>
      </div>

      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
          color: '#fff', display: 'grid', placeItems: 'center',
          fontSize: 28, fontWeight: 900, boxShadow: '0 4px 16px rgba(14,165,233,0.3)', marginBottom: 8 }}>
          {user.name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('')}
        </div>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>{user.name}</div>
        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{fmtCPF(user.cpf)}</div>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '20px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gap: 16 }}>

          {/* Nome — readonly */}
          <div>
            <div style={labelStyle}>Nome completo</div>
            <div style={{ padding: '12px 14px', borderRadius: 10, background: '#f8fafc',
              border: '1.5px solid #e2e8f0', fontSize: 14, color: '#64748b', fontWeight: 600 }}>
              {user.name}
            </div>
          </div>

          {/* CPF — readonly */}
          <div>
            <div style={labelStyle}>CPF</div>
            <div style={{ padding: '12px 14px', borderRadius: 10, background: '#f8fafc',
              border: '1.5px solid #e2e8f0', fontSize: 14, color: '#64748b', fontWeight: 600 }}>
              {fmtCPF(user.cpf)}
            </div>
          </div>

          {/* E-mail — editável */}
          <label>
            <div style={labelStyle}>E-mail</div>
            <input
              style={inputStyle} type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </label>

          {/* Telefone — editável */}
          <label>
            <div style={labelStyle}>Telefone / WhatsApp</div>
            <input
              style={inputStyle} type="tel" value={phone}
              onChange={e => setPhone(fmtPhoneInput(e.target.value))}
              placeholder="(87) 99999-0000"
              inputMode="tel"
            />
          </label>

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#fef2f2',
              border: '1px solid #fecaca', fontSize: 13, color: '#dc2626', fontWeight: 700 }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{ padding: '10px 14px', borderRadius: 10, background: '#f0fdf4',
              border: '1px solid #bbf7d0', fontSize: 13, color: '#16a34a', fontWeight: 700 }}>
              ✅ Dados atualizados com sucesso!
            </div>
          )}

          <button
            onClick={handleSave} disabled={saving}
            style={{ padding: '13px', borderRadius: 12, border: 0,
              background: saving ? '#94a3b8' : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
              color: '#fff', fontSize: 14, fontWeight: 900, cursor: saving ? 'default' : 'pointer',
              fontFamily: 'inherit' }}>
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>
        Para alterar nome ou CPF, entre em contato com o suporte.
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
  fontSize: 14, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', outline: 'none',
};

/* ════════════════════════════════════════════════ AGENDAR ════ */
function ScreenAgendar({ user }: { user: UserData }) {
  type Step = 'especialidade' | 'dia' | 'horario' | 'medico' | 'confirmar' | 'sucesso';
  const [step,         setStep]         = useState<Step>('especialidade');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  const [specialties,  setSpecialties]  = useState<Specialty[]>([]);
  const [selSpec,      setSelSpec]      = useState<Specialty | null>(null);

  const [days,         setDays]         = useState<string[]>([]);
  const [selDay,       setSelDay]       = useState('');

  const [times,        setTimes]        = useState<string[]>([]);
  const [selTime,      setSelTime]      = useState('');

  const [doctors,      setDoctors]      = useState<MedDoctor[]>([]);
  const [selDoctor,    setSelDoctor]    = useState<MedDoctor | null>(null);

  const [result,       setResult]       = useState<BookingResult | null>(null);

  const isActive = user.subscription?.status === 'ACTIVE';

  // Carregar especialidades ao montar
  useEffect(() => {
    setLoading(true); setError('');
    axios.get<Specialty[]>(`${BASE}/api/customer/specialties`, { headers: authH() })
      .then(r => { setSpecialties(r.data); })
      .catch(e => setError(e.response?.data?.error ?? 'Erro ao carregar especialidades.'))
      .finally(() => setLoading(false));
  }, []);

  const fmtDayBR = (iso: string) => {
    const [y, m, d] = iso.split('-');
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
  };

  const pickSpec = async (sp: Specialty) => {
    setSelSpec(sp); setError(''); setLoading(true);
    try {
      const r = await axios.post(`${BASE}/api/customer/booking/days`,
        { specialtyId: sp.id }, { headers: authH() });
      setDays(r.data);
      setStep('dia');
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Erro ao buscar dias disponíveis.');
    } finally { setLoading(false); }
  };

  const pickDay = async (day: string) => {
    setSelDay(day); setError(''); setLoading(true);
    try {
      const r = await axios.post(`${BASE}/api/customer/booking/times`,
        { specialtyId: selSpec!.id, date: day }, { headers: authH() });
      setTimes(r.data);
      setStep('horario');
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Erro ao buscar horários.');
    } finally { setLoading(false); }
  };

  const pickTime = async (time: string) => {
    setSelTime(time); setError(''); setLoading(true);
    try {
      const r = await axios.post<MedDoctor[]>(`${BASE}/api/customer/booking/doctors`,
        { specialtyId: selSpec!.id, date: selDay, time }, { headers: authH() });
      const list = r.data;
      // Se todos não são reais OU só tem 1, pula seleção de médico
      const hasReal = list.some(d => d.is_real);
      if (!hasReal || list.length <= 1) {
        setDoctors(list);
        setSelDoctor(list[0] ?? null);
        setStep('confirmar');
      } else {
        setDoctors(list);
        setStep('medico');
      }
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Erro ao buscar médicos.');
    } finally { setLoading(false); }
  };

  const pickDoctor = (doc: MedDoctor) => {
    setSelDoctor(doc);
    setStep('confirmar');
  };

  const confirm = async () => {
    setError(''); setLoading(true);
    try {
      const payload: any = {
        specialtyId: selSpec!.id,
        date: selDay,
        time: selTime,
      };
      if (selDoctor?.is_real) {
        payload.doctorId = selDoctor.id;
        payload.isRealDoctor = true;
      }
      const r = await axios.post<BookingResult>(`${BASE}/api/customer/booking/create`,
        payload, { headers: authH() });
      setResult(r.data);
      setStep('sucesso');
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Erro ao criar agendamento. Tente novamente.');
    } finally { setLoading(false); }
  };

  const reset = () => {
    setStep('especialidade'); setSelSpec(null); setSelDay(''); setSelTime('');
    setDoctors([]); setSelDoctor(null); setResult(null); setError('');
  };

  // — Helpers de UI —
  const ChipBtn = ({ label, sub, onClick, accent }: { label: string; sub?: string; onClick: () => void; accent?: boolean }) => (
    <button onClick={onClick} style={{
      width: '100%', textAlign: 'left', padding: '14px 16px', borderRadius: 14,
      border: `1.5px solid ${accent ? '#0ea5e9' : '#e2e8f0'}`,
      background: accent ? '#f0f9ff' : '#fff',
      cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginTop: 2 }}>{sub}</div>}
      </div>
      <span style={{ fontSize: 18, color: '#94a3b8' }}>›</span>
    </button>
  );

  const BackBtn = ({ to, label }: { to: Step; label: string }) => (
    <button onClick={() => { setStep(to); setError(''); }}
      style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 13, fontWeight: 700,
        color: '#0ea5e9', padding: '0 0 16px', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
      ← {label}
    </button>
  );

  const Spinner = () => (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
      <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>Carregando…</div>
    </div>
  );

  const ErrBox = ({ msg }: { msg: string }) => (
    <div style={{ padding: '12px 14px', borderRadius: 10, background: '#fef2f2',
      border: '1px solid #fecaca', fontSize: 13, color: '#dc2626', fontWeight: 700, marginBottom: 12 }}>
      ⚠️ {msg}
    </div>
  );

  if (!isActive) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>Plano inativo</div>
        <div style={{ fontSize: 14, color: '#64748b', fontWeight: 600, marginBottom: 24, lineHeight: 1.6 }}>
          Você precisa de um plano ativo para agendar consultas de especialidade.
        </div>
        <a href={WA_SUPORTE} target="_blank" rel="noreferrer"
          style={{ padding: '12px 24px', borderRadius: 12, background: '#0ea5e9', color: '#fff',
            fontWeight: 800, fontSize: 14, textDecoration: 'none', display: 'inline-block' }}>
          Falar com suporte →
        </a>
      </div>
    );
  }

  /* ── PASSO: ESPECIALIDADE ── */
  if (step === 'especialidade') {
    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a' }}>Agendar consulta</div>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Escolha a especialidade desejada</div>
        </div>
        {error && <ErrBox msg={error} />}
        {loading ? <Spinner /> : (
          specialties.length === 0
            ? <div style={{ textAlign: 'center', padding: 32, color: '#64748b', fontWeight: 700 }}>Nenhuma especialidade disponível no momento.</div>
            : specialties.map(sp => (
              <ChipBtn key={sp.id}
                label={sp.name}
                sub={sp.price > 0 ? `R$ ${sp.price.toFixed(2).replace('.', ',')}` : 'Incluído no plano'}
                onClick={() => pickSpec(sp)}
                accent={false}
              />
            ))
        )}
      </div>
    );
  }

  /* ── PASSO: DIA ── */
  if (step === 'dia') {
    return (
      <div>
        <BackBtn to="especialidade" label="Especialidades" />
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a' }}>{selSpec?.name}</div>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Escolha o dia da consulta</div>
        </div>
        {error && <ErrBox msg={error} />}
        {loading ? <Spinner /> : (
          days.length === 0
            ? <div style={{ textAlign: 'center', padding: 32, color: '#64748b', fontWeight: 700 }}>Nenhum dia disponível para esta especialidade.</div>
            : days.map(d => (
              <ChipBtn key={d} label={fmtDayBR(d)} onClick={() => pickDay(d)} />
            ))
        )}
      </div>
    );
  }

  /* ── PASSO: HORÁRIO ── */
  if (step === 'horario') {
    return (
      <div>
        <BackBtn to="dia" label="Dias" />
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a' }}>{fmtDayBR(selDay)}</div>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Escolha o horário</div>
        </div>
        {error && <ErrBox msg={error} />}
        {loading ? <Spinner /> : (
          times.length === 0
            ? <div style={{ textAlign: 'center', padding: 32, color: '#64748b', fontWeight: 700 }}>Nenhum horário disponível neste dia.</div>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {times.map(t => (
                  <button key={t} onClick={() => pickTime(t)} style={{
                    padding: '14px 8px', borderRadius: 12, border: '1.5px solid #e2e8f0',
                    background: '#fff', cursor: 'pointer', fontFamily: 'inherit',
                    fontSize: 15, fontWeight: 800, color: '#0f172a',
                  }}>
                    {t}
                  </button>
                ))}
              </div>
            )
        )}
      </div>
    );
  }

  /* ── PASSO: MÉDICO ── */
  if (step === 'medico') {
    return (
      <div>
        <BackBtn to="horario" label="Horários" />
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a' }}>Escolha o médico</div>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{selSpec?.name} — {selTime}</div>
        </div>
        {error && <ErrBox msg={error} />}
        {doctors.map(doc => (
          <ChipBtn key={doc.id} label={doc.name}
            sub={doc.price > 0 ? `R$ ${doc.price.toFixed(2).replace('.', ',')}` : undefined}
            onClick={() => pickDoctor(doc)} />
        ))}
      </div>
    );
  }

  /* ── PASSO: CONFIRMAR ── */
  if (step === 'confirmar') {
    const backStep: Step = doctors.some(d => d.is_real) && doctors.length > 1 ? 'medico' : 'horario';
    return (
      <div>
        <BackBtn to={backStep} label="Voltar" />
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a' }}>Confirmar agendamento</div>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Revise os detalhes antes de confirmar</div>
        </div>
        {error && <ErrBox msg={error} />}

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 16 }}>
          {[
            { label: 'Especialidade', value: selSpec?.name ?? '' },
            { label: 'Data',          value: fmtDayBR(selDay) },
            { label: 'Horário',       value: selTime },
            ...(selDoctor?.is_real ? [{ label: 'Médico', value: selDoctor.name }] : []),
            { label: 'Valor',         value: selDoctor?.price ? `R$ ${selDoctor.price.toFixed(2).replace('.', ',')}` : (selSpec?.price ? `R$ ${selSpec.price.toFixed(2).replace('.', ',')}` : 'Incluído no plano') },
          ].map((row, i, arr) => (
            <div key={row.label} style={{
              padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none',
            }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>{row.value}</span>
            </div>
          ))}
        </div>

        {(selDoctor?.price ?? 0) > 0 || (selSpec?.price ?? 0) > 0 ? (
          <div style={{ padding: '12px 14px', borderRadius: 10, background: '#fffbeb',
            border: '1px solid #fde68a', fontSize: 13, color: '#92400e', fontWeight: 700, marginBottom: 16, lineHeight: 1.6 }}>
            💳 O pagamento será realizado diretamente pela plataforma de telemedicina após o agendamento.
          </div>
        ) : null}

        <button onClick={confirm} disabled={loading} style={{
          width: '100%', padding: '15px', borderRadius: 12, border: 0,
          background: loading ? '#94a3b8' : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
          color: '#fff', fontSize: 15, fontWeight: 900, cursor: loading ? 'default' : 'pointer',
          fontFamily: 'inherit', boxShadow: loading ? 'none' : '0 4px 16px rgba(14,165,233,0.35)',
        }}>
          {loading ? 'Agendando…' : '✅ Confirmar agendamento'}
        </button>
      </div>
    );
  }

  /* ── PASSO: SUCESSO ── */
  if (step === 'sucesso' && result) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>Agendado!</div>
        <div style={{ fontSize: 14, color: '#64748b', fontWeight: 600, marginBottom: 24, lineHeight: 1.7 }}>
          Sua consulta foi confirmada.<br />
          <strong style={{ color: '#0f172a' }}>Código: {result.consultation_code}</strong>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0',
          overflow: 'hidden', marginBottom: 20, textAlign: 'left' }}>
          {[
            { label: 'Especialidade', value: selSpec?.name ?? '' },
            { label: 'Data / Hora',   value: `${fmtDayBR(selDay)} às ${selTime}` },
            ...(selDoctor?.is_real ? [{ label: 'Médico', value: selDoctor.name }] : []),
          ].map((row, i, arr) => (
            <div key={row.label} style={{
              padding: '13px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none',
            }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>{row.label}</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a' }}>{row.value}</span>
            </div>
          ))}
        </div>

        <a href={result.patient_link} target="_blank" rel="noreferrer"
          style={{ display: 'block', padding: '15px', borderRadius: 12, border: 0, marginBottom: 12,
            background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
            color: '#fff', fontWeight: 900, fontSize: 15, textDecoration: 'none',
            boxShadow: '0 4px 16px rgba(14,165,233,0.35)' }}>
          🚀 Entrar na consulta
        </a>

        <button onClick={reset} style={{ background: 'none', border: 0, cursor: 'pointer',
          fontSize: 14, color: '#0ea5e9', fontWeight: 700, fontFamily: 'inherit', padding: '8px' }}>
          Agendar outra consulta
        </button>
      </div>
    );
  }

  return null;
}

/* ═══════════════════════════════════════════════════ BOTTOM NAV ════ */
function BottomNav({ screen, setScreen }: { screen: Screen; setScreen: (s: Screen) => void }) {
  const items: { id: Screen; icon: string; label: string }[] = [
    { id: 'home',      icon: '🏠', label: 'Início'   },
    { id: 'agendar',   icon: '📅', label: 'Agendar'  },
    { id: 'plano',     icon: '📋', label: 'Plano'    },
    { id: 'historico', icon: '📄', label: 'Histórico' },
    { id: 'dados',     icon: '👤', label: 'Dados'    },
  ];

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#fff', borderTop: '1px solid #e2e8f0',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      padding: '8px 0 max(8px, env(safe-area-inset-bottom))',
      zIndex: 100, boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
    }}>
      {items.map(it => (
        <button
          key={it.id}
          onClick={() => setScreen(it.id)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            background: 'none', border: 0, cursor: 'pointer',
            padding: '6px 12px', borderRadius: 12, fontFamily: 'inherit',
            color: screen === it.id ? '#0ea5e9' : '#94a3b8',
            transform: screen === it.id ? 'translateY(-2px)' : 'none',
            transition: 'all 0.15s',
          }}>
          <span style={{ fontSize: 22, lineHeight: 1 }}>{it.icon}</span>
          <span style={{ fontSize: 10, fontWeight: screen === it.id ? 800 : 600 }}>{it.label}</span>
        </button>
      ))}
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════ HEADER ════ */
function Header({ screen, onLogout }: { user: UserData; screen: Screen; onLogout: () => void }) {
  const titles: Record<Screen, string> = {
    home: 'Início', agendar: 'Agendar', plano: 'Meu Plano', historico: 'Histórico', dados: 'Meus Dados',
  };
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: '#fff', borderBottom: '1px solid #e2e8f0',
      padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={logoUrl} alt="logo" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover' }} />
        <span style={{ fontSize: 15, fontWeight: 900, color: '#0f172a' }}>{titles[screen]}</span>
      </div>
      <button
        onClick={onLogout}
        style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 12, fontWeight: 700,
          color: '#94a3b8', fontFamily: 'inherit', padding: '6px 8px' }}>
        Sair
      </button>
    </header>
  );
}

/* ══════════════════════════════════════════════════════ MODAL MAGIC LINK ════ */
function MagicLinkModal({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [link, setLink]   = useState('');
  const [err,  setErr]    = useState('');
  const opened = useRef(false);

  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    axios.get(`${BASE}/api/customer/magic-link`, { headers: authH() })
      .then(r => { setLink(r.data.magicLink); setState('ready'); })
      .catch(e => { setErr(e.response?.data?.error ?? 'Erro ao gerar link.'); setState('error'); });
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 999, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: '20px 20px 20px 20px', width: '100%', maxWidth: 440,
        padding: '24px 24px 28px', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}>

        {state === 'loading' && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 12, animation: 'spin 1s linear infinite' }}>⏳</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>Gerando seu acesso…</div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginTop: 4 }}>Aguarde um momento</div>
          </div>
        )}

        {state === 'error' && (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#dc2626' }}>Não foi possível conectar</div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginTop: 6, marginBottom: 20 }}>{err}</div>
            <button onClick={onClose} style={{ padding: '12px 24px', borderRadius: 12, border: 0,
              background: '#f1f5f9', color: '#0f172a', fontWeight: 800, fontSize: 14,
              cursor: 'pointer', fontFamily: 'inherit' }}>
              Fechar
            </button>
          </div>
        )}

        {state === 'ready' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🩺</div>
            <div style={{ fontWeight: 900, fontSize: 18, color: '#0f172a', marginBottom: 4 }}>
              Seu link está pronto!
            </div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 20, lineHeight: 1.6 }}>
              Você será conectado à sua consulta. O link é válido por <strong>5 minutos</strong>.
            </div>
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
              style={{ display: 'block', padding: '14px', borderRadius: 12, border: 0,
                background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                color: '#fff', fontWeight: 900, fontSize: 15, textDecoration: 'none',
                boxShadow: '0 4px 16px rgba(14,165,233,0.35)', marginBottom: 10 }}>
              🚀 Abrir consulta agora
            </a>
            <button onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer',
              fontSize: 13, color: '#94a3b8', fontWeight: 700, fontFamily: 'inherit' }}>
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════ ROOT ════ */
export function ClienteApp() {
  useNunito();
  const [user,   setUser]   = useState<UserData | null>(getCachedUser);
  const [screen, setScreen] = useState<Screen>('home');
  const [showMagicLink, setShowMagicLink] = useState(false);

  // Validar token + sincronizar dados ao carregar
  useEffect(() => {
    const token = getToken();
    if (!token || !user) return;
    axios.get<UserData>(`${BASE}/api/customer/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { localStorage.setItem('cli_user', JSON.stringify(r.data)); setUser(r.data); })
      .catch(() => handleLogout());
  }, []);

  const handleLogin = (_token: string, u: UserData) => setUser(u);

  const handleLogout = () => {
    localStorage.removeItem('cli_token');
    localStorage.removeItem('cli_user');
    setUser(null);
    setScreen('home');
  };

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Nunito', sans-serif" }}>
      <Header user={user} screen={screen} onLogout={handleLogout} />

      <main style={{ padding: '20px 16px 88px', maxWidth: 480, margin: '0 auto' }}>
        {screen === 'home'      && <HomeScreen     user={user} onConsultar={() => setShowMagicLink(true)} />}
        {screen === 'agendar'   && <ScreenAgendar  user={user} />}
        {screen === 'plano'     && <PlanoScreen    user={user} />}
        {screen === 'historico' && <HistoricoScreen user={user} />}
        {screen === 'dados'     && <DadosScreen    user={user} onUpdate={setUser} />}
      </main>

      <BottomNav screen={screen} setScreen={setScreen} />

      {showMagicLink && <MagicLinkModal onClose={() => setShowMagicLink(false)} />}
    </div>
  );
}
