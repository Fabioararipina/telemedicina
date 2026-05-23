import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API = 'https://saudeagora24h.com.br/api-backend';
const TOTAL_VAGAS = 50;
const WA_LINK = 'https://wa.me/558799990000';

const EPOCH = new Date('2026-04-19T08:00:00-03:00').getTime();
const BASE_TAKEN = 29;
const PERIOD_MS = 4 * 60 * 60 * 1000;

function getPsych(): number {
  const periods = Math.floor(Math.max(0, Date.now() - EPOCH) / PERIOD_MS);
  const taken = Math.min(BASE_TAKEN + periods * 2, TOTAL_VAGAS - 1);
  return TOTAL_VAGAS - taken;
}

/* ── Types ── */
interface EspItem {
  cat: '24h' | 'adulto' | 'infantil' | 'mental';
  n: string; note: string;
  urgent?: boolean; kids?: boolean; mental?: boolean;
}
interface PlanData {
  id: string; name: string; price: string; strike: string; period: string;
  desc: string; perks: string[]; cta: string; highlight: boolean; tag: string | null;
}
interface PacoteItem { freq: string; n: string; total: string; per: string; save?: string }
interface PacoteData { area: string; color: string; colorSoft: string; items: PacoteItem[] }
type CtaVariant = 'signup' | 'whatsapp' | 'start';
type EspFilter = 'todas' | '24h' | 'adulto' | 'infantil' | 'mental';

/* ── Data ── */
const ESPECIALIDADES: EspItem[] = [
  { cat: '24h', n: 'Clínica Geral', note: 'incluso no plano', urgent: true },
  { cat: '24h', n: 'Médico da Família', note: 'incluso no plano', urgent: true },
  { cat: '24h', n: 'Pediatria', note: 'incluso no plano · 0–17 anos', urgent: true, kids: true },
  { cat: 'adulto', n: 'Cardiologia', note: 'R$ 150 avulsa' },
  { cat: 'adulto', n: 'Dermatologia', note: 'R$ 150 avulsa' },
  { cat: 'adulto', n: 'Endocrinologia', note: 'R$ 150 avulsa' },
  { cat: 'adulto', n: 'Ginecologia', note: 'R$ 150 avulsa' },
  { cat: 'adulto', n: 'Geriatria', note: 'R$ 150 avulsa' },
  { cat: 'adulto', n: 'Ortopedia', note: 'R$ 150 avulsa' },
  { cat: 'adulto', n: 'Otorrinolaringologia', note: 'R$ 150 avulsa' },
  { cat: 'adulto', n: 'Urologia', note: 'R$ 150 avulsa' },
  { cat: 'adulto', n: 'Neurologia', note: 'R$ 180 avulsa' },
  { cat: 'adulto', n: 'Reumatologia', note: 'R$ 150 avulsa' },
  { cat: 'adulto', n: 'Gastroenterologia', note: 'R$ 150 avulsa' },
  { cat: 'adulto', n: 'Pneumologia', note: 'R$ 150 avulsa' },
  { cat: 'adulto', n: 'Angiologia', note: 'R$ 150 avulsa' },
  { cat: 'adulto', n: 'Alergologia', note: 'R$ 150 avulsa' },
  { cat: 'adulto', n: 'Hematologia', note: 'R$ 150 avulsa' },
  { cat: 'adulto', n: 'Infectologia', note: 'R$ 150 avulsa' },
  { cat: 'adulto', n: 'Nefrologia', note: 'R$ 150 avulsa' },
  { cat: 'adulto', n: 'Sexologia Clínica', note: 'R$ 150 avulsa' },
  { cat: 'adulto', n: 'Nutrologia', note: 'R$ 150 avulsa' },
  { cat: 'adulto', n: 'Fisiatria', note: 'R$ 150 avulsa' },
  { cat: 'adulto', n: 'Clínica Médica', note: 'R$ 120 avulsa' },
  { cat: 'infantil', n: 'Alergologia Infantil', note: 'R$ 150 avulsa', kids: true },
  { cat: 'infantil', n: 'Endocrinologia Infantil', note: 'R$ 150 avulsa', kids: true },
  { cat: 'infantil', n: 'Neurologia Infantil', note: 'R$ 180 avulsa', kids: true },
  { cat: 'infantil', n: 'Ortopedia Infantil', note: 'R$ 150 avulsa', kids: true },
  { cat: 'infantil', n: 'Reumatologia Infantil', note: 'R$ 150 avulsa', kids: true },
  { cat: 'infantil', n: 'Pneumologia Infantil', note: 'R$ 150 avulsa', kids: true },
  { cat: 'infantil', n: 'Gastroenterologia Infantil', note: 'R$ 150 avulsa', kids: true },
  { cat: 'mental', n: 'Psicologia', note: 'R$ 69,90 avulsa', mental: true },
  { cat: 'mental', n: 'Psiquiatria', note: 'R$ 150 avulsa', mental: true },
  { cat: 'mental', n: 'Psicologia Infantil', note: 'R$ 69,90 avulsa', mental: true, kids: true },
  { cat: 'mental', n: 'Psiquiatria Infantil', note: 'R$ 150 avulsa', mental: true, kids: true },
  { cat: 'mental', n: 'Nutricionista', note: 'R$ 69,90 avulsa' },
  { cat: 'mental', n: 'Fisioterapia', note: 'R$ 69,90 avulsa' },
];

const PLANS: PlanData[] = [
  { id: 'INDIVIDUAL', name: 'Individual', price: '29,90', strike: '39,90', period: '/mês', desc: '1 pessoa, consultas ilimitadas.', perks: ['Clínico 24h ilimitado', '1 especialista por mês', 'Atestado médico'], cta: 'Quero o Individual', highlight: false, tag: null },
  { id: 'FAMILIAR', name: 'Familiar', price: '59,90', strike: '69,90', period: '/mês', desc: 'Titular + 2 dependentes.', perks: ['Tudo do Individual ×3', 'Pediatra 24h', 'Sem coparticipação'], cta: 'Quero o Familiar', highlight: true, tag: 'Mais escolhido' },
  { id: 'AVULSO', name: 'Avulso', price: '49,90', strike: '59,90', period: '30 dias', desc: 'Sem mensalidade. Pagou, falou.', perks: ['1 consulta com clínico', 'Atestado médico', 'Sem fidelidade'], cta: 'Comprar avulsa', highlight: false, tag: null },
];

const PACOTES: PacoteData[] = [
  { area: 'Psicologia', color: '#a855f7', colorSoft: '#faf5ff',
    items: [
      { freq: 'Semanal', n: '4 sessões/mês', total: 'R$ 250,00', per: 'R$ 62,50/sessão', save: '10% off' },
      { freq: 'Quinzenal', n: '2 sessões/mês', total: 'R$ 132,00', per: 'R$ 66,00/sessão' },
    ]},
  { area: 'Fisioterapia', color: '#0284c7', colorSoft: '#f0f9ff',
    items: [
      { freq: 'Semanal', n: '4 sessões/mês', total: 'R$ 250,00', per: 'R$ 62,50/sessão', save: '10% off' },
      { freq: 'Quinzenal', n: '2 sessões/mês', total: 'R$ 132,00', per: 'R$ 66,00/sessão' },
    ]},
  { area: 'Nutrição', color: '#16a34a', colorSoft: '#f0fdf4',
    items: [
      { freq: 'Quinzenal', n: '2 sessões/mês', total: 'R$ 132,00', per: 'R$ 66,00/sessão' },
    ]},
];

const PERSONAS = [
  { name: 'Dona Maria, 58', city: 'Petrolina · PE', pain: 'Dor nas costas. Não quer pegar ônibus pro posto.', fit: 'Clínico geral sem sair do sofá.', color: '#0ea5e9' },
  { name: 'Seu João, 42', city: 'Crato · CE', pain: 'Filho com febre na madrugada de domingo.', fit: 'Pediatra 24h, sem hospital de plantão.', color: '#f59e0b' },
  { name: 'Joana, 29', city: 'Teresina · PI', pain: 'Ansiedade. Não acha vaga em psiquiatra.', fit: 'Psicólogo agora, psiquiatra em 7 dias.', color: '#a855f7' },
  { name: 'Família Silva', city: 'Caruaru · PE', pain: '4 pessoas, plano caro, atendimento ruim.', fit: 'Plano Familiar até 4 pessoas, R$ 59,90.', color: '#10b981' },
  { name: 'Cícero, 67', city: 'Sobral · CE', pain: 'Diabetes, precisa de endócrino regular.', fit: 'Endocrinologia agendada em até 7 dias.', color: '#f87171' },
  { name: 'Lúcia, 34', city: 'Juazeiro · BA', pain: 'Quer acompanhamento nutricional contínuo.', fit: 'Pacote nutrição quinzenal por R$ 132/mês.', color: '#0369a1' },
];

const TESTIMONIALS = [
  { q: 'Resolvi tudo pelo celular numa madrugada. Nunca mais quero hospital de plantão.', n: 'Cícero, 51', c: 'Petrolina · PE' },
  { q: 'Minha mãe não sabia usar app. Hoje liga a chamada com o médico sozinha.', n: 'Lúcia, 34', c: 'Juazeiro · BA' },
  { q: 'Pago menos que a farmácia popular cobrava por mês. E não preciso sair de casa.', n: 'Roberval, 47', c: 'Teresina · PI' },
];

const FAQS = [
  { q: 'O médico é de verdade mesmo?', a: 'Sim. Todos têm CRM ativo, regulamentado pelo CFM. Você vê o nome e o número do registro antes de começar a consulta.' },
  { q: 'Como funciona o atestado?', a: 'Você recebe o atestado em PDF no WhatsApp, com assinatura digital do médico e CRM. Vale pra trabalho e escola.' },
  { q: 'Posso usar pra família toda?', a: 'Sim, no plano Familiar até 3 pessoas (titular + 2 dependentes) compartilham o plano por R$ 59,90/mês.' },
  { q: 'Posso cancelar quando quiser?', a: 'Pode. Pelo próprio app, em 2 toques, sem multa e sem precisar ligar pra ninguém.' },
];

/* ── Shared components ── */

function WaIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function VagasCounter({ remaining }: { remaining: number }) {
  const taken = TOTAL_VAGAS - remaining;
  const pct = (taken / TOTAL_VAGAS) * 100;
  return (
    <div style={{ marginTop: 22, padding: '14px 16px', background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 14, maxWidth: 380, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={{ fontWeight: 800, fontSize: 14 }}>
        Só faltam <span style={{ color: 'var(--green-600)', fontSize: 18 }}>{remaining}</span> vagas com preço de lançamento
      </span>
      <div style={{ height: 8, background: 'var(--slate-200)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--green-500), var(--green-600))' }} />
      </div>
      <div className="pub-mono" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>{taken}/50 preenchidas</span>
        <span>atualiza a cada 4h</span>
      </div>
    </div>
  );
}

function EspChip({ e }: { e: EspItem }) {
  const bg = e.urgent ? 'var(--green-50)' : e.mental ? '#faf5ff' : e.kids ? 'var(--amber-50)' : 'var(--sky-50)';
  const color = e.urgent ? 'var(--green-700)' : e.mental ? '#7e22ce' : e.kids ? 'var(--amber-600)' : 'var(--sky-700)';
  return (
    <div style={{ background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, background: bg, color, display: 'grid', placeItems: 'center', flexShrink: 0, fontWeight: 900, fontSize: 13 }}>
        {e.urgent ? '●' : e.mental ? '✦' : e.kids ? '◆' : '■'}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}>{e.n}</div>
        <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--mono)', marginTop: 2, fontWeight: 700 }}>{e.note}</div>
      </div>
    </div>
  );
}

function MidCta({ variant, onCta }: { variant: CtaVariant; onCta: () => void }) {
  const map = {
    signup:   { eyebrow: 'Já entendeu como funciona?', title: 'Cria sua conta em 30 segundos.', sub: 'Sem cartão, sem compromisso. Você ainda escolhe se quer entrar.', cta: 'Garantir meu preço de lançamento →', style: 'soft' },
    whatsapp: { eyebrow: 'Ainda em dúvida?', title: 'Manda mensagem no WhatsApp.', sub: 'A gente te responde de verdade — em até 1h, das 8h às 22h.', cta: 'Falar com a gente no WhatsApp', style: 'wa' },
    start:    { eyebrow: 'Já sabe qual plano quer?', title: 'Pega seu preço agora.', sub: 'Quando lançar, você é a primeira pessoa a saber. Preço travado.', cta: 'Quero garantir minha vaga →', style: 'primary' },
  } as const;
  const v = map[variant];
  const dark = v.style === 'primary' || v.style === 'wa';
  const wrapStyle: React.CSSProperties = v.style === 'primary'
    ? { background: 'linear-gradient(135deg, var(--green-600) 0%, var(--green-700) 50%, var(--sky-700) 100%)', color: '#fff' }
    : v.style === 'wa'
    ? { background: 'linear-gradient(135deg, #075E54 0%, #128C7E 60%, #25D366 100%)', color: '#fff' }
    : { background: 'var(--sky-50)', border: '1px solid color-mix(in oklab, var(--sky-500) 22%, transparent)' };
  const btnStyle: React.CSSProperties = v.style === 'primary'
    ? { background: '#fff', color: 'var(--green-700)' }
    : v.style === 'wa'
    ? { background: '#fff', color: '#075E54' }
    : { background: 'var(--green-500)', color: '#fff' };

  return (
    <section style={{ paddingBlock: 36 }}>
      <div className="pub-wrap">
        <div style={{ padding: '24px 22px', borderRadius: 20, display: 'grid', gap: 18, position: 'relative', overflow: 'hidden', ...wrapStyle }}>
          {dark && <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 85% 20%, rgba(255,255,255,0.18), transparent 50%)' }} />}
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, color: dark ? 'rgba(255,255,255,0.85)' : 'var(--sky-700)' }}>{v.eyebrow}</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.15, color: dark ? '#fff' : 'var(--ink)', marginBottom: 6 }}>{v.title}</h2>
            <p style={{ fontSize: 14, lineHeight: 1.5, fontWeight: 600, color: dark ? 'rgba(255,255,255,0.85)' : 'var(--ink-2)' }}>{v.sub}</p>
          </div>
          <button onClick={v.style === 'wa' ? () => window.open(WA_LINK, '_blank') : onCta} className="pub-btn pub-btn-lg" style={{ fontSize: 15, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...btnStyle }}>
            {v.style === 'wa' && <WaIcon size={18} />}
            {v.cta}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ── Modal ── */
interface ModalProps { onClose: () => void; selectedPlan: string; onPlanChange: (id: string) => void; remaining: number }

function Modal({ onClose, selectedPlan, onPlanChange, remaining }: ModalProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [consent, setConsent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) { setError('Você precisa aceitar a Política de Privacidade para continuar.'); return; }
    setLoading(true); setError('');
    try {
      await axios.post(`${API}/api/pre-cadastro`, { ...formData, plan: selectedPlan });
      setSuccess(true);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string } } };
      setError(ax.response?.data?.error || 'Deu um problema. Tenta de novo!');
    } finally { setLoading(false); }
  };

  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(12,74,110,0.6)', zIndex: 50, display: 'grid', placeItems: 'center', padding: 20, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: 18, padding: 22, maxWidth: 380, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <img src="/logo.png" alt="Saúde Agora 24h" style={{ height: 32 }} />
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--slate-100)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)', fontSize: 20, lineHeight: 1, border: 0, cursor: 'pointer' }}>×</button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, marginBottom: 10 }}>Você está na lista!</h2>
            <p style={{ fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.55 }}>
              Assim que a plataforma for lançada, você recebe uma mensagem no WhatsApp com tudo certinho. 👊
            </p>
            <button onClick={onClose} className="pub-btn pub-btn-primary pub-btn-block" style={{ marginTop: 22 }}>Fechar</button>
          </div>
        ) : (
          <>
            <span className="pub-pill live" style={{ marginBottom: 10 }}>{remaining} vagas restantes</span>
            <h2 style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.15, marginBottom: 6 }}>Garanta seu preço de lançamento</h2>
            <p style={{ fontSize: 13.5, color: 'var(--ink-2)', marginBottom: 18 }}>Te chamamos no WhatsApp assim que abrir. Sem cartão agora.</p>

            <div style={{ display: 'grid', gap: 8, marginBottom: 18 }}>
              {PLANS.map(p => (
                <button key={p.id} onClick={() => onPlanChange(p.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: `1.5px solid ${selectedPlan === p.id ? 'var(--green-500)' : 'var(--slate-200)'}`, borderRadius: 12, background: selectedPlan === p.id ? 'var(--green-50)' : '#fff', textAlign: 'left', cursor: 'pointer', width: '100%' }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selectedPlan === p.id ? 'var(--green-500)' : 'var(--slate-300)'}`, background: selectedPlan === p.id ? 'var(--green-500)' : '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                    {selectedPlan === p.id && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>
                      {p.name}
                      {p.tag && <span style={{ marginLeft: 6, background: 'var(--green-500)', color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 900, verticalAlign: 'middle' }}>{p.tag.toUpperCase()}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>R$ {p.price}{p.period}</div>
                  </div>
                </button>
              ))}
            </div>

            {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#b91c1c', marginBottom: 14 }}>{error}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
              <label>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6, color: 'var(--ink-2)' }}>Seu nome</span>
                <input className="pub-input" placeholder="Como te chamamos?" required value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })} />
              </label>
              <label>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 800, marginBottom: 6, color: 'var(--ink-2)' }}>WhatsApp</span>
                <input className="pub-input" placeholder="(00) 0 0000-0000" inputMode="tel" required value={formData.phone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })} />
              </label>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12, color: 'var(--ink-2)', fontWeight: 600, cursor: 'pointer' }}>
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 2, flexShrink: 0 }} />
                <span>Li e concordo com a <a href="/privacidade" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky-700)', fontWeight: 800 }}>Política de Privacidade</a> e os <a href="/termos" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky-700)', fontWeight: 800 }}>Termos de Serviço</a></span>
              </label>
              <button type="submit" className="pub-btn pub-btn-primary pub-btn-block" disabled={loading || !consent} style={{ marginTop: 4 }}>
                {loading ? '⏳ Salvando...' : '✅ Quero Garantir Minha Vaga'}
              </button>
              <p style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', fontWeight: 700 }}>Gratuito agora. Você paga apenas quando a plataforma for lançada.</p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

/* ── App ── */
export default function App() {
  const [remaining, setRemaining] = useState(getPsych);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('FAMILIAR');
  const [faqOpen, setFaqOpen] = useState(-1);
  const [espFilter, setEspFilter] = useState<EspFilter>('todas');

  useEffect(() => {
    axios.get(`${API}/api/leads/count`)
      .then(r => setRemaining(Math.min(r.data.remaining, getPsych())))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('plano')?.toUpperCase();
    if (p && ['INDIVIDUAL', 'FAMILIAR', 'AVULSO'].includes(p)) { setSelectedPlan(p); setShowModal(true); }
  }, []);

  const openModal = (planId: string) => { setSelectedPlan(planId); setShowModal(true); };

  const espTabs: { id: EspFilter; l: string; c: number }[] = [
    { id: 'todas', l: 'Todas', c: ESPECIALIDADES.length },
    { id: '24h', l: 'Sem agendar (24h)', c: ESPECIALIDADES.filter(e => e.cat === '24h').length },
    { id: 'adulto', l: 'Adultos', c: ESPECIALIDADES.filter(e => e.cat === 'adulto').length },
    { id: 'infantil', l: 'Infantil', c: ESPECIALIDADES.filter(e => e.cat === 'infantil').length },
    { id: 'mental', l: 'Saúde mental', c: ESPECIALIDADES.filter(e => e.cat === 'mental').length },
  ];
  const visibleEsp = espFilter === 'todas' ? ESPECIALIDADES : ESPECIALIDADES.filter(e => e.cat === espFilter);

  return (
    <>
      {/* ── HEADER ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 5, background: 'rgba(255,255,255,0.92)', backdropFilter: 'saturate(160%) blur(10px)', borderBottom: '1px solid var(--slate-200)' }}>
        <div className="pub-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBlock: 12 }}>
          <img src="/logo.png" alt="Saúde Agora 24h" style={{ height: 36 }} />
          <button className="pub-btn pub-btn-primary" style={{ padding: '9px 16px', fontSize: 13 }} onClick={() => openModal('FAMILIAR')}>
            Garantir minha vaga
          </button>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ paddingBlock: '36px 48px', background: 'linear-gradient(180deg, var(--sky-50) 0%, transparent 60%)' }}>
        <div className="pub-wrap">
          <span className="pub-pill live" style={{ marginBottom: 16 }}>Lançamento · {remaining} vagas restantes</span>
          <h1 style={{ fontSize: 38, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.02em', color: 'var(--sky-900)', margin: '0 0 14px' }}>
            Médico de verdade<br />
            <span style={{ color: 'var(--green-600)' }}>no seu celular,</span><br />
            24h por dia.
          </h1>
          <p style={{ fontSize: 17, color: 'var(--ink-2)', marginBottom: 22, maxWidth: '34ch' }}>
            Consulta com clínico geral em até 5 minutos. Atendimento humano, sem fila, sem hospital, sem sair de casa.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380 }}>
            <button className="pub-btn pub-btn-primary pub-btn-lg pub-btn-block" onClick={() => openModal('FAMILIAR')}>
              Garantir meu preço especial →
            </button>
            <div className="pub-mono" style={{ textAlign: 'center' }}>sem cartão · 30 segundos · cancela quando quiser</div>
          </div>
          <VagasCounter remaining={remaining} />
          <ul style={{ listStyle: 'none', padding: 0, margin: '18px 0 0', display: 'grid', gap: 6, fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 700 }}>
            <li>✓ Sem mensalidade no 1º mês</li>
            <li>✓ Atestado médico em PDF</li>
            <li>✓ Atende família inteira no plano Familiar</li>
          </ul>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ background: 'var(--sky-900)', color: '#fff', paddingBlock: 28 }}>
        <div className="pub-wrap" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 22 }}>
          {[{ n: '100%', l: 'atendimento BR' }, { n: '+500', l: 'médicos com CRM' }, { n: '+30', l: 'especialidades' }, { n: '24h', l: 'todo dia' }].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 32, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}>{s.n}</div>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 700, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMO FUNCIONA ── */}
      <section className="pub-section">
        <div className="pub-wrap">
          <span className="pub-eyebrow">Como funciona</span>
          <h2 className="pub-h2">Médico em 3 toques no celular.</h2>
          <p className="pub-lead">Funciona até com sinal fraco. Sem precisar baixar app gigante.</p>
          <ol style={{ listStyle: 'none', padding: 0, margin: '26px 0 0', display: 'grid', gap: 14 }}>
            {[
              { n: '1', t: 'Cadastre-se pelo celular', d: 'Nome, WhatsApp e plano. 30 segundos, sem cartão.' },
              { n: '2', t: 'Abra o app e diga o que sente', d: 'Sem formulário comprido. Você fala, a gente entende.' },
              { n: '3', t: 'Médico em até 5 minutos', d: 'Chamada de vídeo. Atestado e orientações direto no WhatsApp.' },
            ].map(s => (
              <li key={s.n} className="pub-card" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--green-50)', color: 'var(--green-700)', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 20 }}>{s.n}</div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 4 }}>{s.t}</h3>
                  <p style={{ fontSize: 14, color: 'var(--ink-2)' }}>{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <MidCta variant="signup" onCta={() => openModal('FAMILIAR')} />

      {/* ── PERSONAS ── */}
      <section className="pub-section" style={{ background: 'var(--green-50)' }}>
        <div className="pub-wrap">
          <span className="pub-eyebrow" style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}>Para quem é</span>
          <h2 className="pub-h2">Feito pra família real, do interior.</h2>
          <p className="pub-lead">Atende do bebê à vovó. Veja se a gente serve pra você:</p>
          <div style={{ display: 'grid', gap: 14, marginTop: 24 }}>
            {PERSONAS.map((p, i) => (
              <article key={i} className="pub-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${p.color}, color-mix(in oklab, ${p.color} 40%, white))`, color: '#fff', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 900 }}>
                    {p.name.split(',')[0].split(' ').slice(0, 2).map(w => w[0]).join('')}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 900 }}>{p.name}</div>
                    <div className="pub-mono" style={{ fontSize: 10 }}>{p.city}</div>
                  </div>
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--ink-2)', marginBottom: 10, lineHeight: 1.5 }}>
                  <strong style={{ color: 'var(--ink)' }}>Situação:</strong> {p.pain}
                </p>
                <p style={{ fontSize: 13, color: 'var(--green-700)', fontWeight: 800, padding: '8px 10px', background: 'var(--green-50)', borderRadius: 8 }}>→ {p.fit}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── ESPECIALIDADES ── */}
      <section className="pub-section" style={{ background: 'var(--slate-50)' }}>
        <div className="pub-wrap">
          <span className="pub-eyebrow">Especialidades</span>
          <h2 className="pub-h2">{ESPECIALIDADES.length}+ especialidades, do bebê à vovó.</h2>
          <p className="pub-lead">3 sempre disponíveis 24h, sem agendar. As outras, com hora marcada em até 7 dias.</p>
          <div style={{ display: 'flex', gap: 6, marginTop: 22, overflowX: 'auto', paddingBottom: 4 }}>
            {espTabs.map(t => (
              <button key={t.id} onClick={() => setEspFilter(t.id)} style={{ padding: '8px 14px', borderRadius: 999, border: `1.5px solid ${espFilter === t.id ? 'var(--sky-700)' : 'var(--slate-200)'}`, background: espFilter === t.id ? 'var(--sky-900)' : '#fff', color: espFilter === t.id ? '#fff' : 'var(--ink-2)', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}>
                {t.l}
                <span style={{ background: espFilter === t.id ? 'rgba(255,255,255,0.18)' : 'var(--slate-100)', color: espFilter === t.id ? '#fff' : 'var(--ink-3)', padding: '1px 7px', borderRadius: 999, fontSize: 10.5, fontWeight: 900 }}>{t.c}</span>
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginTop: 16 }}>
            {visibleEsp.map(e => <EspChip key={e.n} e={e} />)}
          </div>
          <div style={{ marginTop: 18, padding: 14, background: '#fff', borderRadius: 12, border: '1px solid var(--slate-200)', fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55, fontWeight: 600 }}>
            <strong style={{ color: 'var(--ink)' }}>Como funciona o agendamento:</strong> você pede pelo app, nossa equipe analisa o caso e marca em até 7 dias úteis. Casos graves entram com prioridade máxima.
          </div>
        </div>
      </section>

      {/* ── SAÚDE MENTAL ── */}
      <section className="pub-section">
        <div className="pub-wrap">
          <div style={{ background: 'linear-gradient(135deg, #7e22ce 0%, #6d28d9 50%, var(--sky-900) 100%)', borderRadius: 22, padding: 28, color: '#fff', position: 'relative', overflow: 'hidden' }}>
            <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 0%, rgba(168,85,247,0.5), transparent 50%), radial-gradient(circle at 20% 100%, rgba(14,165,233,0.4), transparent 50%)' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} /> Pronto atendimento · 9h às 23h
              </div>
              <h2 style={{ color: '#fff', fontSize: 26, lineHeight: 1.1, marginBottom: 12 }}>
                Falar com um psicólogo agora,<br />sem precisar marcar.
              </h2>
              <p style={{ fontSize: 15, opacity: 0.92, maxWidth: '44ch', marginBottom: 20 }}>
                Psicólogos de plantão pra te escutar. Crise, ansiedade, dúvida do dia a dia — sem julgamento e sem fila grande.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'grid', gap: 8, fontSize: 14, fontWeight: 700 }}>
                {['Escuta qualificada e acolhimento inicial', 'Orientação imediata em momentos difíceis', 'Encaminhamento pra terapia contínua se precisar'].map(s => (
                  <li key={s} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', opacity: 0.95 }}>
                    <span style={{ color: '#86efac', fontWeight: 900, flexShrink: 0 }}>✓</span> {s}
                  </li>
                ))}
              </ul>
              <button onClick={() => openModal('INDIVIDUAL')} className="pub-btn" style={{ background: '#fff', color: '#6d28d9', padding: '14px 22px', fontSize: 15, fontWeight: 900 }}>
                Falar com psicólogo agora →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── PACOTES ── */}
      <section className="pub-section">
        <div className="pub-wrap">
          <span className="pub-eyebrow">Acompanhamento contínuo</span>
          <h2 className="pub-h2">Pacotes pra cuidar todo mês, mais barato.</h2>
          <p className="pub-lead">Quando você precisa de acompanhamento, não só de uma consulta avulsa.</p>
          <div style={{ display: 'grid', gap: 14, marginTop: 22 }}>
            {PACOTES.map(p => (
              <article key={p.area} className="pub-card" style={{ padding: 18 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: p.colorSoft, color: p.color, borderRadius: 999, fontSize: 11, fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />{p.area}
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {p.items.map(it => (
                    <div key={it.freq} style={{ border: '1px solid var(--slate-200)', borderRadius: 12, padding: 14, background: '#fff' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ fontWeight: 900, fontSize: 13.5 }}>{it.freq}</div>
                        {it.save && <span style={{ padding: '2px 8px', borderRadius: 999, background: 'var(--green-50)', color: 'var(--green-700)', fontSize: 10, fontWeight: 900 }}>{it.save}</span>}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700, marginBottom: 8 }}>{it.n}</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--sky-900)', letterSpacing: '-0.02em' }}>{it.total}</div>
                      <div className="pub-mono" style={{ marginTop: 2 }}>{it.per}</div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <MidCta variant="whatsapp" onCta={() => openModal('FAMILIAR')} />

      {/* ── BENEFÍCIOS ── */}
      <section className="pub-section">
        <div className="pub-wrap">
          <span className="pub-eyebrow">O que está incluído</span>
          <h2 className="pub-h2">Tudo no app, sem letrinha miúda.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 22 }}>
            {[
              { s: '●', t: 'Clínico geral 24h', d: 'Todo dia, inclusive feriado e madrugada.' },
              { s: '◆', t: 'Especialistas agendados', d: 'Em até 48h, por chamada de vídeo.' },
              { s: '■', t: 'Atendimento humanizado', d: 'Médico te escuta com calma, sem ser empurrado.' },
              { s: '▲', t: 'Atestado médico', d: 'Pro trabalho e pra escola, em PDF.' },
              { s: '★', t: 'Pedido de exames', d: 'Imprime ou leva no celular ao laboratório.' },
              { s: '✚', t: 'Histórico no app', d: 'Tudo guardado pra mostrar pro próximo médico.' },
            ].map(it => (
              <div key={it.t} className="pub-card" style={{ padding: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--sky-50)', color: 'var(--sky-700)', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 900 }}>{it.s}</div>
                <h3 style={{ fontSize: 14.5, fontWeight: 900, marginTop: 12, marginBottom: 4 }}>{it.t}</h3>
                <p style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{it.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUANDO PRESENCIAL ── */}
      <section className="pub-section" style={{ background: 'var(--slate-50)' }}>
        <div className="pub-wrap">
          <span className="pub-eyebrow" style={{ background: 'var(--amber-50)', color: 'var(--amber-600)' }}>Honestidade</span>
          <h2 className="pub-h2">A gente avisa quando é melhor ir ao presencial.</h2>
          <p className="pub-lead">Telemedicina resolve a maioria dos casos, mas existem situações em que o presencial é mais seguro.</p>
          <div style={{ display: 'grid', gap: 12, marginTop: 22 }}>
            {[
              { i: '🩺', t: 'Precisa de exame físico', d: 'Ausculta, palpação ou outro procedimento que só dá pra fazer com o médico do seu lado.' },
              { i: '🚨', t: 'Sinais de gravidade', d: 'Quadros agudos que precisam de pronto-socorro imediato — a gente te orienta a procurar.' },
              { i: '🧪', t: 'Exame imediato', d: 'Quando o caso não pode esperar exame laboratorial ou de imagem.' },
              { i: '🤔', t: 'Limitação diagnóstica', d: 'Situações em que só a presença do médico garante segurança no diagnóstico.' },
            ].map(m => (
              <div key={m.t} className="pub-card" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 14, padding: 18 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--amber-50)', fontSize: 22, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{m.i}</div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 900, marginBottom: 4 }}>{m.t}</h3>
                  <p style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{m.d}</p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 18, padding: '14px 16px', background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 12, display: 'flex', gap: 12, alignItems: 'center', fontSize: 13, fontWeight: 700, color: 'var(--ink-2)' }}>
            <span style={{ fontSize: 22 }}>💚</span>
            <span>Nosso compromisso: <strong style={{ color: 'var(--ink)' }}>nunca empurrar consulta online se o seu caso pede presencial.</strong></span>
          </div>
        </div>
      </section>

      {/* ── PLANOS ── */}
      <section id="planos" className="pub-section">
        <div className="pub-wrap">
          <span className="pub-eyebrow">Planos</span>
          <h2 className="pub-h2">Escolha o seu. Sem fidelidade.</h2>
          <p className="pub-lead">Preços de lançamento garantidos só pras primeiras {TOTAL_VAGAS} pessoas.</p>
          <div style={{ display: 'grid', gap: 14, marginTop: 24 }}>
            {PLANS.map(p => (
              <article key={p.id} style={{ padding: 22, position: 'relative', borderRadius: 14, border: `${p.highlight ? 2 : 1}px solid ${p.highlight ? 'var(--green-500)' : 'var(--slate-200)'}`, background: p.highlight ? 'linear-gradient(180deg, var(--green-50), #fff 40%)' : '#fff' }}>
                {p.tag && <span style={{ position: 'absolute', top: -12, left: 18, background: 'var(--green-500)', color: '#fff', padding: '4px 10px', borderRadius: 999, fontSize: 10.5, fontWeight: 900, letterSpacing: '0.06em' }}>{p.tag.toUpperCase()}</span>}
                <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>{p.name}</h3>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>{p.desc}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-2)' }}>R$</span>
                  <span style={{ fontSize: 44, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em', color: 'var(--sky-900)' }}>{p.price}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 700 }}>{p.period}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', textDecoration: 'line-through', marginBottom: 16 }}>Normal R$ {p.strike}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px', display: 'grid', gap: 8 }}>
                  {p.perks.map(k => (
                    <li key={k} style={{ display: 'flex', gap: 8, fontSize: 14, color: 'var(--ink-2)' }}>
                      <span style={{ color: 'var(--green-500)', fontWeight: 900 }}>✓</span> {k}
                    </li>
                  ))}
                </ul>
                <button onClick={() => remaining > 0 && openModal(p.id)} disabled={remaining === 0} className={`pub-btn pub-btn-block ${p.highlight ? 'pub-btn-primary' : 'pub-btn-outline'}`}>
                  {remaining === 0 ? 'Vagas esgotadas' : p.cta}
                </button>
              </article>
            ))}
          </div>
          <p style={{ marginTop: 18, fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', fontWeight: 600 }}>
            Pix · cartão · boleto · sem juros · cancele a qualquer momento pelo app
          </p>
        </div>
      </section>

      <MidCta variant="start" onCta={() => openModal('FAMILIAR')} />

      {/* ── DEPOIMENTOS ── */}
      <section className="pub-section">
        <div className="pub-wrap">
          <span className="pub-eyebrow">Quem já usa</span>
          <h2 className="pub-h2">Gente do interior usando todo dia.</h2>
          <div style={{ display: 'grid', gap: 14, marginTop: 22 }}>
            {TESTIMONIALS.map((t, i) => (
              <figure key={i} style={{ margin: 0, background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 14, padding: 18 }}>
                <div style={{ fontSize: 36, color: 'var(--green-500)', fontWeight: 900, lineHeight: 0.6, marginBottom: 6 }}>"</div>
                <blockquote style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{t.q}</blockquote>
                <figcaption style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--sky-100)', border: '1px solid var(--slate-200)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 900, color: 'var(--sky-700)', flexShrink: 0 }}>
                    {t.n.split(',')[0].slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>{t.n}</div>
                    <div className="pub-mono">{t.c}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONFORMIDADE ── */}
      <section className="pub-section" style={{ background: 'var(--sky-900)', color: '#fff' }}>
        <div className="pub-wrap">
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#86efac', background: 'rgba(16,185,129,0.15)', padding: '5px 10px', borderRadius: 6, marginBottom: 12 }}>Conformidade</span>
          <h2 style={{ color: '#fff', fontSize: 26, lineHeight: 1.15 }}>Operação 100% dentro da lei.</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, marginTop: 8, maxWidth: '44ch' }}>
            Plataforma operada pela LSX Medical com gestão clínica auditada, sigilo profissional e proteção total dos seus dados.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginTop: 22 }}>
            {[
              { t: 'LGPD', d: 'Seus dados são seus. Nunca vendemos, nunca compartilhamos.', icon: '🔒' },
              { t: 'CFM 2.314/2022', d: 'Resolução do Conselho Federal de Medicina sobre telemedicina.', icon: '⚖️' },
              { t: 'Auditoria clínica', d: 'Operação acompanhada por equipe médica auditora.', icon: '🏛️' },
              { t: 'Sigilo profissional', d: 'Tudo o que você diz ao médico fica entre você e ele(a).', icon: '🤫' },
            ].map(it => (
              <div key={it.t} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{it.icon}</div>
                <div style={{ fontSize: 13.5, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{it.t}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, lineHeight: 1.5 }}>{it.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="pub-section" style={{ background: 'var(--green-50)' }}>
        <div className="pub-wrap">
          <span className="pub-eyebrow" style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}>Perguntas frequentes</span>
          <h2 className="pub-h2">Dúvidas que todo mundo tem.</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: '22px 0 0', display: 'grid', gap: 10 }}>
            {FAQS.map((item, i) => (
              <li key={i} style={{ background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 12 }}>
                <button onClick={() => setFaqOpen(faqOpen === i ? -1 : i)} style={{ width: '100%', textAlign: 'left', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontWeight: 800, fontSize: 15, background: 'none', border: 0, cursor: 'pointer' }}>
                  <span>{item.q}</span>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--sky-50)', color: 'var(--sky-700)', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 900, flexShrink: 0, transition: 'transform 0.2s', transform: faqOpen === i ? 'rotate(45deg)' : 'rotate(0)' }}>+</span>
                </button>
                {faqOpen === i && <div style={{ padding: '0 18px 18px', fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.55 }}>{item.a}</div>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section style={{ paddingBlock: 64, background: 'linear-gradient(160deg, var(--sky-900) 0%, var(--sky-700) 55%, var(--green-700) 100%)', color: '#fff' }}>
        <div className="pub-wrap" style={{ textAlign: 'center' }}>
          <span className="pub-pill live" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
            {remaining} vagas com preço de lançamento
          </span>
          <h2 style={{ fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1.15, marginTop: 14 }}>
            Médico no celular,<br />por menos que uma caixinha de remédio.
          </h2>
          <p style={{ marginTop: 12, opacity: 0.9, fontSize: 16, maxWidth: '32ch', marginInline: 'auto' }}>
            Garante seu preço agora. Quando lançar, você é o primeiro a saber.
          </p>
          <button onClick={() => openModal('FAMILIAR')} className="pub-btn pub-btn-lg" style={{ marginTop: 22, background: '#fff', color: 'var(--sky-900)', maxWidth: 320, width: '100%' }}>
            Garantir minha vaga →
          </button>
          <div className="pub-mono" style={{ marginTop: 12, color: 'rgba(255,255,255,0.7)' }}>sem cartão · 30 segundos</div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: '#0b1220', color: '#cbd5e1', paddingBlock: '44px 24px' }}>
        <div className="pub-wrap">
          <div style={{ display: 'grid', gap: 28 }}>
            <div>
              <div style={{ display: 'inline-flex', padding: '8px 12px', background: '#fff', borderRadius: 10 }}>
                <img src="/logo.png" alt="Saúde Agora 24h" style={{ height: 30 }} />
              </div>
              <p style={{ marginTop: 16, fontSize: 13.5, opacity: 0.72, lineHeight: 1.55, maxWidth: '36ch' }}>
                Plataforma de telemedicina operada pela <strong style={{ color: '#fff' }}>LSX Medical</strong>. Médicos brasileiros com CRM ativo. Atendimento 24h, todos os dias do ano.
              </p>
              <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
                {[
                  { icon: <WaIcon size={16} />, label: '(87) 9 9999-0000', sub: 'Suporte · 8h às 22h, todos os dias' },
                  { icon: '📍', label: 'Petrolina · Pernambuco', sub: 'Cobertura nacional pelo app' },
                ].map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid #1e293b', color: '#86efac', display: 'grid', placeItems: 'center', flexShrink: 0 }}>{c.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{c.label}</div>
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 1 }}>{c.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {[
              { title: 'Produto', links: ['Como funciona', 'Para quem é', 'Especialidades', 'Saúde mental', 'Planos e preços'] },
              { title: 'Empresa', links: ['Sobre nós', 'Imprensa', 'Contato'] },
              { title: 'Ajuda & legal', links: ['Central de ajuda', 'Política de Privacidade', 'Termos de uso', 'LGPD', 'Cancelamento'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontWeight: 900, color: '#fff', marginBottom: 14, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em' }}>{col.title}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
                  {col.links.map(l => <li key={l}><a href="#" style={{ color: '#cbd5e1', fontSize: 13.5, fontWeight: 600, opacity: 0.8 }}>{l}</a></li>)}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 36, padding: '20px 0', borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b' }}>
            <div style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>Operação regulamentada</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {[{ l: 'LGPD', s: 'Lei 13.709/18' }, { l: 'CFM', s: 'Res. 2.314/22' }, { l: 'Sigilo médico', s: 'Garantido' }, { l: '+500 médicos', s: 'CRM ativo' }].map(s => (
                <div key={s.l} style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}>
                  <div style={{ color: '#fff', fontWeight: 900 }}>{s.l}</div>
                  <div style={{ color: '#64748b', fontWeight: 700, fontSize: 10, marginTop: 1 }}>{s.s}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>Formas de pagamento</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Pix', 'Visa', 'Master', 'Elo', 'Boleto'].map(b => (
                <div key={b} style={{ padding: '6px 10px', height: 28, background: '#fff', color: '#0f172a', borderRadius: 6, fontSize: 10, fontWeight: 900, display: 'grid', placeItems: 'center', minWidth: 44 }}>{b}</div>
              ))}
            </div>
          </div>

          <div style={{ paddingTop: 20, display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between', fontSize: 11, color: '#64748b', fontWeight: 700 }}>
            <span>© 2026 Saúde Agora 24h · CNPJ XX.XXX.XXX/0001-XX · saudeagora24h.com.br</span>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ l: 'IG', t: 'Instagram' }, { l: 'FB', t: 'Facebook' }, { l: 'TT', t: 'TikTok' }].map(s => (
                <span key={s.l} title={s.t} style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid #1e293b', color: '#cbd5e1', fontSize: 10, fontWeight: 900, display: 'grid', placeItems: 'center' }}>{s.l}</span>
              ))}
            </div>
          </div>

          <p style={{ marginTop: 18, padding: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11, color: '#64748b', lineHeight: 1.6, fontWeight: 600 }}>
            <strong style={{ color: '#94a3b8' }}>Aviso médico:</strong> as informações apresentadas neste site não substituem consulta médica nem servem como diagnóstico. Em caso de emergência grave, procure o pronto-socorro mais próximo ou ligue para o SAMU (192).
          </p>
        </div>
      </footer>

      {/* ── WHATSAPP FAB ── */}
      <a href={WA_LINK} target="_blank" rel="noopener noreferrer" title="Falar no WhatsApp"
        style={{ position: 'fixed', bottom: 20, right: 20, width: 56, height: 56, borderRadius: '50%', background: '#25D366', color: '#fff', display: 'grid', placeItems: 'center', boxShadow: '0 6px 20px rgba(37,211,102,0.45)', zIndex: 40, textDecoration: 'none' }}>
        <WaIcon size={26} />
      </a>

      {/* ── MODAL ── */}
      {showModal && (
        <Modal onClose={() => setShowModal(false)} selectedPlan={selectedPlan} onPlanChange={setSelectedPlan} remaining={remaining} />
      )}
    </>
  );
}
