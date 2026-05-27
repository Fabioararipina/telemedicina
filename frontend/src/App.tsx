import React, { useState, useEffect } from 'react';
import axios from 'axios';
import medicosImg from './assets/medicos.png';
import personaDonaMariaImg from './assets/persona-dona-maria.png';
import personaSeuJoaoImg from './assets/persona-seu-joao.png';
import personaJoanaImg from './assets/persona-joana.png';
import personaCiceroImg from './assets/persona-cicero.png';
import personaFamiliaSilvaImg from './assets/persona-familia-silva.png';
import personaLuciaImg from './assets/persona-lucia.png';

const API = 'https://saudeagora24h.com.br/api-backend';
const TOTAL_VAGAS = 50;
const WA_LINK = 'https://wa.me/5587996593551';

const PSYCH_POOL = [13, 14, 15, 16, 17];

function getPsych(): number {
  return PSYCH_POOL[Math.floor(Math.random() * PSYCH_POOL.length)];
}

/* ── Types ── */
interface EspItem {
  cat: '24h' | 'adulto' | 'infantil' | 'mental';
  n: string; note: string;
  urgent?: boolean; kids?: boolean; mental?: boolean;
  mediteleId?: string; price?: number;
}
interface MedEsp { id: string; name: string; price: number; clinicSpecialtyId?: string; }
interface PlanData {
  id: string;           // UUID do banco (planos da API) ou tipo string (PLANS_DEFAULT fallback)
  planType?: string;    // INDIVIDUAL | FAMILIAR | AVULSO (sempre preenchido nos planos da API)
  name: string; price: string; strike: string; period: string;
  desc: string; perks: string[]; cta: string; highlight: boolean; tag: string | null;
}
interface PacoteItem { freq: string; n: string; total: string; per: string; save?: string }
interface PacoteData { area: string; color: string; colorSoft: string; items: PacoteItem[] }
interface SelectedPacote { area: string; color: string; colorSoft: string; item: PacoteItem }
type CtaVariant = 'signup' | 'whatsapp' | 'start';
type EspFilter = 'todas' | '24h' | 'adulto' | 'infantil' | 'mental';

/* ── Data ── */
// Especialidades 24h fixas (incluídas no plano)
const ESP_24H: EspItem[] = [
  { cat: '24h', n: 'Clínica Geral',     note: 'incluso no plano', urgent: true },
  { cat: '24h', n: 'Médico da Família', note: 'incluso no plano', urgent: true },
  { cat: '24h', n: 'Pediatria',         note: 'incluso no plano · 0–17 anos', urgent: true, kids: true },
];

// Converte especialidade Meditele para EspItem
function medToEsp(m: MedEsp): EspItem {
  const n = m.name.toLowerCase();
  const isInfantil = n.includes('infantil') || n.includes('pediátr') || n.includes('pediatr');
  const isMental = n.includes('psicolog') || n.includes('psiquiat') || n.includes('nutri') || n.includes('fisio') || n.includes('terapia');
  const cat: EspItem['cat'] = isInfantil ? 'infantil' : isMental ? 'mental' : 'adulto';
  const priceStr = `R$ ${m.price.toFixed(2).replace('.', ',')} / consulta`;
  return {
    cat, n: m.name, note: priceStr,
    kids: isInfantil, mental: isMental && !isInfantil,
    mediteleId: m.id, price: m.price,
  };
}

// Fallback hardcoded (usado se API Meditele ainda não tiver especialidades configuradas)
const ESP_FALLBACK: EspItem[] = [
  { cat: 'adulto',   n: 'Cardiologia',          note: 'R$ 150 / consulta', price: 150 },
  { cat: 'adulto',   n: 'Dermatologia',          note: 'R$ 150 / consulta', price: 150 },
  { cat: 'adulto',   n: 'Endocrinologia',        note: 'R$ 150 / consulta', price: 150 },
  { cat: 'adulto',   n: 'Ginecologia',           note: 'R$ 150 / consulta', price: 150 },
  { cat: 'adulto',   n: 'Geriatria',             note: 'R$ 150 / consulta', price: 150 },
  { cat: 'adulto',   n: 'Ortopedia',             note: 'R$ 150 / consulta', price: 150 },
  { cat: 'adulto',   n: 'Otorrinolaringologia',  note: 'R$ 150 / consulta', price: 150 },
  { cat: 'adulto',   n: 'Urologia',              note: 'R$ 150 / consulta', price: 150 },
  { cat: 'adulto',   n: 'Neurologia',            note: 'R$ 180 / consulta', price: 180 },
  { cat: 'adulto',   n: 'Reumatologia',          note: 'R$ 150 / consulta', price: 150 },
  { cat: 'adulto',   n: 'Gastroenterologia',     note: 'R$ 150 / consulta', price: 150 },
  { cat: 'adulto',   n: 'Pneumologia',           note: 'R$ 150 / consulta', price: 150 },
  { cat: 'adulto',   n: 'Angiologia',            note: 'R$ 150 / consulta', price: 150 },
  { cat: 'adulto',   n: 'Alergologia',           note: 'R$ 150 / consulta', price: 150 },
  { cat: 'adulto',   n: 'Hematologia',           note: 'R$ 150 / consulta', price: 150 },
  { cat: 'adulto',   n: 'Infectologia',          note: 'R$ 150 / consulta', price: 150 },
  { cat: 'adulto',   n: 'Nefrologia',            note: 'R$ 150 / consulta', price: 150 },
  { cat: 'adulto',   n: 'Sexologia Clínica',     note: 'R$ 150 / consulta', price: 150 },
  { cat: 'adulto',   n: 'Nutrologia',            note: 'R$ 150 / consulta', price: 150 },
  { cat: 'adulto',   n: 'Clínica Médica',        note: 'R$ 120 / consulta', price: 120 },
  { cat: 'infantil', n: 'Alergologia Infantil',       note: 'R$ 150 / consulta', price: 150, kids: true },
  { cat: 'infantil', n: 'Endocrinologia Infantil',    note: 'R$ 150 / consulta', price: 150, kids: true },
  { cat: 'infantil', n: 'Neurologia Infantil',        note: 'R$ 180 / consulta', price: 180, kids: true },
  { cat: 'infantil', n: 'Ortopedia Infantil',         note: 'R$ 150 / consulta', price: 150, kids: true },
  { cat: 'infantil', n: 'Pneumologia Infantil',       note: 'R$ 150 / consulta', price: 150, kids: true },
  { cat: 'infantil', n: 'Gastroenterologia Infantil', note: 'R$ 150 / consulta', price: 150, kids: true },
  { cat: 'mental',   n: 'Psicologia',           note: 'R$ 69,90 / consulta', price: 69.90, mental: true },
  { cat: 'mental',   n: 'Psiquiatria',          note: 'R$ 150 / consulta',   price: 150,   mental: true },
  { cat: 'mental',   n: 'Psicologia Infantil',  note: 'R$ 69,90 / consulta', price: 69.90, mental: true, kids: true },
  { cat: 'mental',   n: 'Psiquiatria Infantil', note: 'R$ 150 / consulta',   price: 150,   mental: true, kids: true },
  { cat: 'mental',   n: 'Nutricionista',        note: 'R$ 69,90 / consulta', price: 69.90 },
  { cat: 'mental',   n: 'Fisioterapia',         note: 'R$ 69,90 / consulta', price: 69.90 },
];


// Planos padrão (fallback enquanto carrega ou se API não retornar nada)
const PLANS_DEFAULT: PlanData[] = [
  { id: 'INDIVIDUAL', name: 'Individual', price: '29,90', strike: '39,90', period: '/mês', desc: '1 pessoa, consultas ilimitadas.', perks: ['Clínico 24h ilimitado', '1 especialista por mês', 'Atestado médico'], cta: 'Quero o Individual', highlight: false, tag: null },
  { id: 'FAMILIAR', name: 'Familiar', price: '69,90', strike: '79,90', period: '/mês', desc: 'Titular + 2 dependentes.', perks: ['Tudo do Individual ×3', 'Pediatra 24h', 'Sem coparticipação'], cta: 'Quero o Familiar', highlight: true, tag: 'Mais escolhido' },
  { id: 'AVULSO', name: 'Avulso', price: '49,90', strike: '59,90', period: '30 dias', desc: 'Sem mensalidade. Pagou, falou.', perks: ['1 consulta com clínico', 'Atestado médico', 'Sem fidelidade'], cta: 'Comprar avulsa', highlight: false, tag: null },
];

interface ApiLpPlan {
  id: string; name: string; price: number; type: string;
  description?: string | null; featured: boolean;
  originalPrice?: number | null; features: string[];
  ctaLabel?: string | null; periodLabel?: string | null;
}

const PACOTES: PacoteData[] = [
  { area: 'Psicologia', color: '#a855f7', colorSoft: '#faf5ff', items: [
    { freq: 'Semanal', n: '4 sessões/mês', total: 'R$ 300,00', per: 'R$ 75,00/sessão', save: '17% off' },
    { freq: 'Quinzenal', n: '2 sessões/mês', total: 'R$ 180,00', per: 'R$ 90,00/sessão' },
  ]},
  { area: 'Fisioterapia', color: '#0284c7', colorSoft: '#f0f9ff', items: [
    { freq: 'Semanal', n: '4 sessões/mês', total: 'R$ 300,00', per: 'R$ 75,00/sessão', save: '12% off' },
    { freq: 'Quinzenal', n: '2 sessões/mês', total: 'R$ 170,00', per: 'R$ 85,00/sessão' },
  ]},
  { area: 'Nutrição', color: '#16a34a', colorSoft: '#f0fdf4', items: [
    { freq: 'Quinzenal', n: '2 sessões/mês', total: 'R$ 170,00', per: 'R$ 85,00/sessão' },
  ]},
];

const PERSONAS = [
  { name: 'Dona Maria, 58', city: 'Araripina · PE', pain: 'Dor nas costas. Não quer pegar ônibus pro posto.', fit: 'Clínico geral sem sair do sofá.', color: '#0ea5e9', photo: personaDonaMariaImg },
  { name: 'Seu João, 42', city: 'Trindade · PE', pain: 'Filho com febre na madrugada de domingo.', fit: 'Pediatra 24h, sem hospital de plantão.', color: '#f59e0b', photo: personaSeuJoaoImg },
  { name: 'Joana, 29', city: 'Ouricuri · PE', pain: 'Ansiedade. Não acha vaga em psiquiatra.', fit: 'Psicólogo agora, psiquiatra em 7 dias.', color: '#a855f7', photo: personaJoanaImg },
  { name: 'Família Silva', city: 'Ipubi · PE', pain: '4 pessoas, plano caro, atendimento ruim.', fit: 'Plano Familiar até 3 pessoas, R$ 69,90.', color: '#10b981', photo: personaFamiliaSilvaImg },
  { name: 'Cícero, 67', city: 'Bodocó · PE', pain: 'Diabetes, precisa de endócrino regular.', fit: 'Endocrinologia agendada em até 7 dias.', color: '#f87171', photo: personaCiceroImg },
  { name: 'Lúcia, 34', city: 'Salgueiro · PE', pain: 'Quer acompanhamento nutricional contínuo.', fit: 'Pacote nutrição quinzenal por R$ 132/mês.', color: '#0369a1', photo: personaLuciaImg },
];

const TESTIMONIALS = [
  { q: 'Resolvi tudo pelo celular numa madrugada. Nunca mais quero hospital de plantão.', n: 'Cícero, 51', c: 'Bodocó · PE', since: 'Cliente desde fev/2025' },
  { q: 'Minha mãe não sabia usar app. Hoje liga a chamada com o médico sozinha.', n: 'Lúcia, 34', c: 'Salgueiro · PE', since: 'Cliente desde jan/2025' },
  { q: 'Pago menos que a farmácia popular cobrava por mês. E não preciso sair de casa.', n: 'Roberval, 47', c: 'Ouricuri · PE', since: 'Cliente desde mar/2025' },
];

const FAQS = [
  { q: 'O médico é de verdade mesmo?', a: 'Sim. Todos têm CRM ativo, regulamentado pelo CFM. Você vê o nome e o número do registro antes de começar a consulta.' },
  { q: 'Como funciona o atestado?', a: 'Você recebe o atestado em PDF no WhatsApp, com assinatura digital do médico e CRM. Vale pra trabalho e escola — tem validade legal igual ao atestado presencial, conforme regulamentação do CFM.' },
  { q: 'Posso usar pra família toda?', a: 'Sim, no plano Familiar até 3 pessoas (titular + 2 dependentes) compartilham o plano por R$ 69,90/mês.' },
  { q: 'Posso cancelar quando quiser?', a: 'Sim. Após o período mínimo de fidelidade de 3 meses, o cancelamento é livre e sem burocracia. Cancelamentos durante o período de fidelidade estão sujeitos a multa de 20% sobre o saldo das mensalidades restantes, conforme nossos Termos e Condições.' },
  { q: 'O médico pode receitar medicamentos controlados?', a: 'Não. A legislação vigente (CFM 2.314/22) não permite receita de controlados por telemedicina. Para outros medicamentos comuns, a prescrição é permitida e chega por PDF no WhatsApp. Controlados exigem consulta presencial.' },
  { q: 'O serviço funciona em emergências?', a: 'A telemedicina não substitui emergências graves. Em casos como dor no peito intensa, falta de ar severa, perda de consciência ou suspeita de AVC, ligue para o SAMU (192) ou vá ao pronto-socorro. Nossos médicos te orientam a identificar exatamente quando o caso exige isso.' },
  { q: 'Posso usar em qualquer estado do Brasil?', a: 'Sim. O serviço funciona em todo o Brasil, desde que você tenha conexão à internet. O médico atende por videochamada — você pode estar em qualquer lugar do país.' },
  { q: 'Quanto tempo dura a consulta?', a: 'Entre 15 e 30 minutos para consultas clínicas. Não há limite rígido — o médico fica até resolver sua dúvida. Consultas com psicólogo duram entre 45 e 50 minutos.' },
  { q: 'O que acontece se o médico achar que preciso ir ao presencial?', a: 'Ele te diz claramente que o caso precisa de avaliação presencial e te orienta qual especialidade ou serviço procurar. Nosso compromisso é nunca empurrar consulta online quando o presencial é o certo.' },
  { q: 'Como funciona o cancelamento na prática?', a: 'Pelo app ou pelo WhatsApp do suporte. Após 3 meses de plano ativo, é só pedir e o plano encerra no fim do ciclo vigente, sem cobrança extra. Se cancelar antes dos 3 meses, aplica-se multa de 20% sobre as mensalidades restantes do período.' },
];

/* ── Icons ── */
function WaIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/* ── Sub-components ── */
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

function EspChip({ e, onBook }: { e: EspItem; onBook?: (e: EspItem) => void }) {
  const bg = e.urgent ? 'var(--green-50)' : e.mental ? '#faf5ff' : e.kids ? 'var(--amber-50)' : 'var(--sky-50)';
  const color = e.urgent ? 'var(--green-700)' : e.mental ? '#7e22ce' : e.kids ? 'var(--amber-600)' : 'var(--sky-700)';
  const clickable = !!onBook;
  return (
    <div
      onClick={clickable ? () => onBook!(e) : undefined}
      style={{
        background: '#fff',
        border: `1.5px solid ${clickable ? 'var(--sky-200)' : 'var(--slate-200)'}`,
        borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
        cursor: clickable ? 'pointer' : 'default',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
      onMouseEnter={clickable ? e2 => { (e2.currentTarget as HTMLDivElement).style.borderColor = 'var(--sky-400)'; (e2.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(14,165,233,0.15)'; } : undefined}
      onMouseLeave={clickable ? e2 => { (e2.currentTarget as HTMLDivElement).style.borderColor = 'var(--sky-200)'; (e2.currentTarget as HTMLDivElement).style.boxShadow = 'none'; } : undefined}
    >
      <div style={{ width: 30, height: 30, borderRadius: 8, background: bg, color, display: 'grid', placeItems: 'center', flexShrink: 0, fontWeight: 900, fontSize: 13 }}>
        {e.urgent ? '●' : e.mental ? '✦' : e.kids ? '◆' : '■'}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}>{e.n}</div>
        <div style={{ fontSize: 10.5, color: 'var(--ink-3)', fontFamily: 'var(--mono)', marginTop: 2, fontWeight: 700 }}>{e.note}</div>
      </div>
      {clickable && (
        <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--sky-600)', flexShrink: 0, background: 'var(--sky-50)', padding: '3px 8px', borderRadius: 6, border: '1px solid var(--sky-200)' }}>
          Agendar →
        </span>
      )}
    </div>
  );
}

/* ════════════════════════════════ WIZARD AGENDAMENTO PÚBLICO ════ */

function AgendarEspModal({ esp, onClose }: { esp: EspItem; onClose: () => void }) {
  type Step = 'dados' | 'confirmar' | 'sucesso';
  const [step, setStep]       = useState<Step>('dados');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [waLink, setWaLink]   = useState('');

  const [form, setForm] = useState({ name: '', cpf: '', phone: '', email: '', birthDate: '', gender: '' });

  const fmtCpfInput = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
            .replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3')
            .replace(/(\d{3})(\d{0,3})/, '$1.$2');
  };
  const fmtPhoneInput = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 11);
    return d.length === 11 ? d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
      : d.length >= 7 ? d.replace(/(\d{2})(\d{4,5})(\d{0,4})/, '($1) $2-$3')
      : d.length >= 3 ? d.replace(/(\d{2})(\d+)/, '($1) $2') : d;
  };
  const API_PUB = 'https://saudeagora24h.com.br/api-backend';

  const goConfirm = () => {
    const { name, cpf, phone } = form;
    if (!name.trim()) { setError('Informe seu nome completo.'); return; }
    if (cpf.replace(/\D/g, '').length < 11) { setError('CPF inválido.'); return; }
    if (phone.replace(/\D/g, '').length < 10) { setError('WhatsApp inválido.'); return; }
    setError(''); setStep('confirmar');
  };

  const confirm = async () => {
    setError(''); setLoading(true);
    try {
      const r = await axios.post(`${API_PUB}/api/public/book-specialty`, {
        name: form.name.trim(),
        cpf: form.cpf.replace(/\D/g, ''),
        phone: form.phone.replace(/\D/g, ''),
        email: form.email.trim() || undefined,
        birthDate: form.birthDate || undefined,
        gender: form.gender || undefined,
        specialtyName: esp.n,
        specialtyPrice: esp.price ?? 0,
      });
      setWaLink(r.data.whatsappLink ?? '');
      setStep('sucesso');
    } catch (e: any) { setError(e.response?.data?.error ?? 'Erro ao processar. Tente novamente.'); }
    finally { setLoading(false); }
  };

  const priceStr = esp.price ? `R$ ${esp.price.toFixed(2).replace('.', ',')}` : 'Sob consulta';

  const inpStyle: React.CSSProperties = { padding: '11px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 14, fontFamily: 'inherit', width: '100%', boxSizing: 'border-box', outline: 'none' };
  const lbl: React.CSSProperties = { fontSize: 10.5, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 5, display: 'block' };
  const ErrBox = ({ msg }: { msg: string }) => <div style={{ padding: '10px 12px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#dc2626', fontWeight: 700, marginBottom: 12 }}>⚠️ {msg}</div>;
  const PrimaryBtn = ({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) => (
    <button onClick={onClick} disabled={disabled} style={{ width: '100%', padding: 14, borderRadius: 12, border: 0, background: disabled ? '#94a3b8' : 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: '#fff', fontSize: 15, fontWeight: 900, cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit', boxShadow: disabled ? 'none' : '0 4px 14px rgba(14,165,233,.35)' }}>
      {label}
    </button>
  );

  const EspHeader = () => (
    <div style={{ background: 'linear-gradient(135deg,#e0f2fe,#f0f9ff)', borderRadius: 14, padding: '14px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#0ea5e9', marginBottom: 2 }}>Consulta avulsa</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{esp.n}</div>
        <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, marginTop: 2 }}>Atendimento por telemedicina · 100% online</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#0284c7' }}>{priceStr}</div>
        <div style={{ fontSize: 10.5, color: '#64748b', fontWeight: 700 }}>por consulta</div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (step === 'dados') return (
      <div>
        <EspHeader />
        <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>Seus dados</div>
        <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 16 }}>
          Nossa equipe confirma o agendamento pelo WhatsApp em até 2h.
        </div>
        {error && <ErrBox msg={error} />}
        <div style={{ display: 'grid', gap: 12 }}>
          <div>
            <label style={lbl}>Nome completo *</label>
            <input style={inpStyle} type="text" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Seu nome completo" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>CPF *</label>
              <input style={inpStyle} type="text" value={form.cpf} inputMode="numeric"
                onChange={e => setForm(f => ({ ...f, cpf: fmtCpfInput(e.target.value) }))} placeholder="000.000.000-00" />
            </div>
            <div>
              <label style={lbl}>WhatsApp *</label>
              <input style={inpStyle} type="tel" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: fmtPhoneInput(e.target.value) }))} placeholder="(87) 9 0000-0000" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={lbl}>Nascimento</label>
              <input style={inpStyle} type="date" value={form.birthDate}
                onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} max={new Date().toISOString().split('T')[0]} />
            </div>
            <div>
              <label style={lbl}>Sexo biológico</label>
              <select style={inpStyle} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                <option value="">Selecione…</option>
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>E-mail</label>
            <input style={inpStyle} type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="seu@email.com (opcional)" />
          </div>
          <PrimaryBtn label="Revisar pedido →" onClick={goConfirm} />
        </div>
      </div>
    );

    if (step === 'confirmar') return (
      <div>
        <button onClick={() => { setStep('dados'); setError(''); }}
          style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#0ea5e9', padding: '0 0 14px', fontFamily: 'inherit' }}>
          ← Voltar
        </button>
        <EspHeader />
        <div style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', marginBottom: 12 }}>Confirmar pedido</div>
        {error && <ErrBox msg={error} />}
        <div style={{ background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 16 }}>
          {[
            { l: 'Paciente', v: form.name },
            { l: 'CPF', v: form.cpf },
            { l: 'WhatsApp', v: form.phone },
            { l: 'Especialidade', v: esp.n },
            { l: 'Valor', v: priceStr },
          ].map((row, i, arr) => (
            <div key={row.l} style={{ padding: '11px 16px', display: 'flex', justifyContent: 'space-between', borderBottom: i < arr.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>{row.l}</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', textAlign: 'right', maxWidth: '60%' }}>{row.v}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: '11px 14px', borderRadius: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 12.5, color: '#166534', fontWeight: 700, marginBottom: 16, lineHeight: 1.6 }}>
          ✅ Nossa equipe confirma o horário e envia o link de pagamento pelo WhatsApp em até 2h úteis.
        </div>
        <PrimaryBtn label={loading ? 'Enviando…' : 'Solicitar consulta'} onClick={confirm} disabled={loading} />
      </div>
    );

    if (step === 'sucesso') return (
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>Pedido recebido!</div>
        <div style={{ fontSize: 14, color: '#64748b', fontWeight: 600, marginBottom: 6 }}>
          Nossa equipe vai entrar em contato pelo WhatsApp<br />
          <strong style={{ color: '#0f172a' }}>em até 2h úteis</strong> para confirmar o horário.
        </div>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '14px 16px', margin: '20px 0', textAlign: 'left' }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Resumo do pedido</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{esp.n}</div>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>{priceStr} · pagamento confirmado no WhatsApp</div>
        </div>
        {waLink && (
          <a href={waLink} target="_blank" rel="noreferrer"
            style={{ display: 'block', padding: '14px 16px', borderRadius: 12, background: 'linear-gradient(135deg,#075E54,#25D366)', color: '#fff', fontWeight: 900, fontSize: 15, textDecoration: 'none', boxShadow: '0 4px 14px rgba(37,211,102,.35)', marginBottom: 12 }}>
            💬 Abrir WhatsApp agora
          </a>
        )}
        <button onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 13, color: '#94a3b8', fontWeight: 700, fontFamily: 'inherit' }}>
          Fechar
        </button>
      </div>
    );

    return null;
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 999, padding: 12 }}>
      <div onClick={ev => ev.stopPropagation()} style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', padding: '24px 20px 32px', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' }}>
            {step === 'sucesso' ? 'Pedido confirmado' : 'Consulta avulsa · agendamento'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 22, color: '#94a3b8', lineHeight: 1, padding: 4 }}>×</button>
        </div>
        {renderContent()}
      </div>
    </div>
  );
}

function MidCta({ variant, desktop, onCta }: { variant: CtaVariant; desktop: boolean; onCta: () => void }) {
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
    <section style={{ paddingBlock: desktop ? 56 : 36 }}>
      <div className="pub-wrap">
        <div style={{ padding: desktop ? '32px 40px' : '24px 22px', borderRadius: 20, display: 'grid', gridTemplateColumns: desktop ? '1.4fr auto' : '1fr', gap: desktop ? 28 : 18, position: 'relative', overflow: 'hidden', alignItems: 'center', ...wrapStyle }}>
          {dark && <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 85% 20%, rgba(255,255,255,0.18), transparent 50%)' }} />}
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, color: dark ? 'rgba(255,255,255,0.85)' : 'var(--sky-700)' }}>{v.eyebrow}</div>
            <h2 style={{ fontSize: desktop ? 28 : 22, fontWeight: 900, lineHeight: 1.15, color: dark ? '#fff' : 'var(--ink)', marginBottom: 6 }}>{v.title}</h2>
            <p style={{ fontSize: 14, lineHeight: 1.5, fontWeight: 600, color: dark ? 'rgba(255,255,255,0.85)' : 'var(--ink-2)', maxWidth: '44ch' }}>{v.sub}</p>
          </div>
          <div style={{ position: 'relative' }}>
            <button onClick={v.style === 'wa' ? () => window.open(WA_LINK, '_blank') : onCta} className="pub-btn pub-btn-lg" style={{ fontSize: 15, padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: desktop ? 'auto' : '100%', whiteSpace: 'nowrap', ...btnStyle }}>
              {v.style === 'wa' && <WaIcon size={18} />}
              {v.cta}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Checkout Modal ── */
interface ModalProps { onClose: () => void; selectedPlan: string; onPlanChange: (id: string) => void; plans: PlanData[] }

function fmtCpf(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`;
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
}

function fmtPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

function CField({ label, hint, ...props }: { label: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10.5, fontWeight: 900, marginBottom: 5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</label>
      <input className="pub-input" style={{ width: '100%' }} {...props} />
      {hint && <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

function Modal({ onClose, selectedPlan, onPlanChange, plans }: ModalProps) {
  const [step,      setStep]      = useState<'form' | 'success'>('form');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [link,      setLink]      = useState('');
  const [countdown, setCountdown] = useState(0);
  const [consent,   setConsent]   = useState(false);
  const [form, setForm] = useState({ name: '', cpf: '', email: '', phone: '', password: '', birthDate: '', gender: '' });

  const activePlan = plans.find(p => p.id === selectedPlan) ?? plans[0];
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) { setError('Aceite os Termos e Condições para continuar.'); return; }
    const cpfClean = form.cpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) { setError('CPF inválido — informe os 11 dígitos.'); return; }
    if (!form.birthDate) { setError('Informe a data de nascimento.'); return; }
    if (!form.gender) { setError('Informe o sexo biológico.'); return; }
    if (form.password.length < 6) { setError('Senha muito curta (mínimo 6 caracteres).'); return; }
    setLoading(true); setError('');
    try {
      // Se selectedPlan parece um UUID, envia como planId; senão, como planType
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedPlan);
      const r = await axios.post(`${API}/api/checkout`, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        cpf: cpfClean,
        phone: form.phone.replace(/\D/g, ''),
        password: form.password,
        birthDate: form.birthDate,
        gender: form.gender,
        ...(isUUID ? { planId: selectedPlan } : { planType: selectedPlan }),
      });
      // invoiceUrl = link de pagamento Asaas; link = magic link de acesso
      const invoice = r.data.invoiceUrl ?? '';
      setLink(invoice);
      setStep('success');
      // Se tiver link de pagamento, inicia contagem regressiva e redireciona
      if (invoice) {
        setCountdown(5);
        const tick = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) { clearInterval(tick); window.location.href = invoice; return 0; }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao criar conta. Tente novamente.');
    } finally { setLoading(false); }
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(12,74,110,0.65)', zIndex: 50, display: 'grid', placeItems: 'center', padding: '20px 16px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: '#fff', borderRadius: 20, maxWidth: 420, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.28)', maxHeight: '93vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px 14px', borderBottom: '1px solid var(--slate-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1, borderRadius: '20px 20px 0 0' }}>
          <img src="/logo.png" alt="Saúde Agora 24h" style={{ height: 28 }} />
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--slate-100)', display: 'grid', placeItems: 'center', color: 'var(--ink-2)', fontSize: 18, border: 0, cursor: 'pointer' }}>×</button>
        </div>

        {/* Success */}
        {step === 'success' ? (
          <div style={{ padding: '36px 28px', textAlign: 'center' }}>
            {/* Ícone animado */}
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', border: '2px solid #86efac', display: 'grid', placeItems: 'center', fontSize: 40, margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(34,197,94,.2)' }}>✅</div>

            <h2 style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>Cadastro criado!</h2>
            <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
              Plano <strong style={{ color: '#0f172a' }}>{activePlan?.name}</strong> registrado com sucesso.
            </p>

            {link ? (
              <>
                {/* Resumo do plano */}
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 20px', marginBottom: 20, textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Valor</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: '#0284c7' }}>
                      {activePlan?.price ? `R$ ${activePlan.price}` : '—'}<span style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8' }}>/mês</span>
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['💳 Cartão', '🏦 PIX', '📄 Boleto'].map(m => (
                      <span key={m} style={{ fontSize: 12, fontWeight: 700, color: '#475569', background: '#e2e8f0', borderRadius: 6, padding: '3px 8px' }}>{m}</span>
                    ))}
                  </div>
                </div>

                {/* Countdown + botão */}
                <a href={link} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '16px 20px', borderRadius: 14, background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: '#fff', fontWeight: 900, fontSize: 16, textDecoration: 'none', boxShadow: '0 6px 20px rgba(14,165,233,.4)', marginBottom: 12 }}>
                  💳 Finalizar pagamento
                  {countdown > 0 && (
                    <span style={{ marginLeft: 4, background: 'rgba(255,255,255,.25)', borderRadius: 20, padding: '2px 10px', fontSize: 13, fontWeight: 700 }}>{countdown}s</span>
                  )}
                </a>

                {countdown > 0 && (
                  <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 8 }}>
                    Redirecionando automaticamente em {countdown}s…
                  </p>
                )}

                <p style={{ fontSize: 11.5, color: '#64748b', marginBottom: 20, lineHeight: 1.7 }}>
                  🔒 Pagamento seguro via Asaas · Plano ativado automaticamente após confirmação.
                </p>
              </>
            ) : (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '16px 20px', marginBottom: 20, textAlign: 'left' }}>
                <p style={{ fontSize: 14, color: '#166534', fontWeight: 700, margin: 0, lineHeight: 1.6 }}>
                  ✅ Cadastro registrado!<br />
                  <span style={{ fontWeight: 500, color: '#15803d' }}>Nossa equipe entrará em contato pelo WhatsApp em instantes para ativar seu plano.</span>
                </p>
              </div>
            )}

            <button onClick={onClose} style={{ background: 'none', border: 0, cursor: 'pointer', fontSize: 13, color: '#94a3b8', fontWeight: 700, fontFamily: 'inherit', textDecoration: 'underline' }}>
              Fechar
            </button>
          </div>
        ) : (
          <div style={{ padding: '16px 20px 22px' }}>

            {/* Plano selector */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', marginBottom: 8 }}>Escolha seu plano</div>
              <div style={{ display: 'grid', gap: 7 }}>
                {plans.map((p: PlanData) => (
                  <button key={p.id} onClick={() => onPlanChange(p.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 13px', border: `${selectedPlan === p.id ? '2px solid var(--green-500)' : '1.5px solid var(--slate-200)'}`, borderRadius: 11, background: selectedPlan === p.id ? 'var(--green-50)' : '#fff', textAlign: 'left', cursor: 'pointer', width: '100%' }}>
                    <span style={{ width: 17, height: 17, borderRadius: '50%', border: `2px solid ${selectedPlan === p.id ? 'var(--green-500)' : 'var(--slate-300)'}`, background: selectedPlan === p.id ? 'var(--green-500)' : '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                      {selectedPlan === p.id && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
                    </span>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 900, fontSize: 13.5 }}>
                        {p.name}
                        {p.tag && <span style={{ marginLeft: 6, background: 'var(--green-500)', color: '#fff', fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 900, verticalAlign: 'middle' }}>{p.tag.toUpperCase()}</span>}
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: 900, color: selectedPlan === p.id ? 'var(--green-700)' : 'var(--ink-2)' }}>R$ {p.price}<span style={{ fontWeight: 600, fontSize: 11 }}>{p.period}</span></span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ height: 1, background: 'var(--slate-100)', margin: '2px 0 16px' }} />

            {/* Dados */}
            <div style={{ fontSize: 10.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink-3)', marginBottom: 12 }}>Seus dados</div>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 11 }}>
              <CField label="Nome completo" type="text" required autoComplete="name"
                value={form.name} onChange={set('name')} placeholder="Seu nome completo" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
                <CField label="CPF" type="text" required inputMode="numeric"
                  value={form.cpf} onChange={e => setForm(f => ({ ...f, cpf: fmtCpf(e.target.value) }))}
                  placeholder="000.000.000-00" maxLength={14} />
                <CField label="WhatsApp" type="tel" required
                  value={form.phone} onChange={e => setForm(f => ({ ...f, phone: fmtPhone(e.target.value) }))}
                  placeholder="(00) 9 0000-0000" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 11 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10.5, fontWeight: 900, marginBottom: 5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Data de nascimento
                  </label>
                  <input className="pub-input" type="date" required style={{ width: '100%' }}
                    value={form.birthDate} onChange={set('birthDate')} max={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10.5, fontWeight: 900, marginBottom: 5, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Sexo biológico
                  </label>
                  <select className="pub-input" required style={{ width: '100%' }}
                    value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                    <option value="">Selecione…</option>
                    <option value="male">Masculino</option>
                    <option value="female">Feminino</option>
                  </select>
                </div>
              </div>
              <CField label="E-mail" type="email" required autoComplete="email"
                value={form.email} onChange={set('email')} placeholder="seu@email.com" />
              <CField label="Senha de acesso" type="password" required autoComplete="new-password"
                value={form.password} onChange={set('password')}
                placeholder="Mínimo 6 caracteres"
                hint="Você usará para acessar o painel" />

              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '9px 13px', fontSize: 13, color: '#b91c1c', fontWeight: 600 }}>{error}</div>
              )}

              <label style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 12, color: 'var(--ink-2)', fontWeight: 600, cursor: 'pointer', lineHeight: 1.5 }}>
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} style={{ marginTop: 2, flexShrink: 0, width: 14, height: 14 }} />
                <span>
                  Li e concordo com os{' '}
                  <a href="/termos" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky-700)', fontWeight: 800 }}>Termos e Condições</a>
                  {' '}e a{' '}
                  <a href="/privacidade" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--sky-700)', fontWeight: 800 }}>Política de Privacidade</a>
                </span>
              </label>

              <button type="submit" disabled={loading || !consent} className="pub-btn pub-btn-primary pub-btn-block"
                style={{ marginTop: 2, opacity: loading || !consent ? 0.72 : 1, fontSize: 15, padding: '14px 20px' }}>
                {loading ? '⏳ Criando sua conta...' : `Garantir meu plano ${activePlan?.name ?? ''} →`}
              </button>

              <p style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'center', fontWeight: 600, lineHeight: 1.55, margin: 0 }}>
                🔒 Dados criptografados · Nossa equipe confirma o pagamento pelo WhatsApp
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   APP
══════════════════════════════════════════ */
export default function App() {
  const [desktop, setDesktop] = useState(() => window.innerWidth >= 1024);
  const [remaining] = useState(getPsych);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('FAMILIAR');
  const [faqOpen, setFaqOpen] = useState(-1);
  const [espFilter, setEspFilter] = useState<EspFilter>('todas');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [apiPlans, setApiPlans] = useState<PlanData[] | null>(null);
  const [medEsp, setMedEsp] = useState<MedEsp[]>([]);
  const [agendarEsp, setAgendarEsp] = useState<EspItem | null>(null);
  const [selectedPacote, setSelectedPacote] = useState<SelectedPacote | null>(null);

  // Lista final de especialidades (24h fixas + Meditele ou fallback)
  const allEsp: EspItem[] = [
    ...ESP_24H,
    ...(medEsp.length > 0 ? medEsp.map(medToEsp) : ESP_FALLBACK),
  ];

  useEffect(() => {
    const onResize = () => setDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    axios.get<MedEsp[]>(`${API}/api/public/specialties`)
      .then(r => setMedEsp(r.data))
      .catch(() => {}); // silencioso — usa fallback
  }, []);

  useEffect(() => {
    axios.get(`${API}/api/leads/count`).catch(() => {});
  }, []);

  useEffect(() => {
    axios.get<ApiLpPlan[]>(`${API}/api/plans`)
      .then(r => {
        if (r.data.length > 0) {
          setApiPlans(r.data.map(p => ({
            id: p.id,           // UUID real do banco
            planType: p.type,   // INDIVIDUAL / FAMILIAR / AVULSO
            name: p.name,
            price: p.price.toFixed(2).replace('.', ','),
            strike: p.originalPrice != null ? p.originalPrice.toFixed(2).replace('.', ',') : '',
            period: p.periodLabel ?? '/mês',
            desc: p.description ?? '',
            perks: p.features ?? [],
            cta: p.ctaLabel ?? `Quero o ${p.name}`,
            highlight: p.featured,
            tag: p.featured ? 'Mais escolhido' : null,
          })));
        }
      })
      .catch(() => {});
  }, []);

  // URL direta por planId (UUID) ou por tipo legado (?plano=INDIVIDUAL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planId  = params.get('planId');   // UUID — link direto por plano
    const planoTipo = params.get('plano')?.toUpperCase(); // legado — tipo

    if (planId) {
      // Busca o plano pelo UUID (pode ser um plano oculto da LP)
      axios.get<ApiLpPlan>(`${API}/api/plans/${planId}`)
        .then(r => {
          const extra: PlanData = {
            id: r.data.id,
            planType: r.data.type,
            name: r.data.name,
            price: r.data.price.toFixed(2).replace('.', ','),
            strike: r.data.originalPrice != null ? r.data.originalPrice.toFixed(2).replace('.', ',') : '',
            period: r.data.periodLabel ?? '/mês',
            desc: r.data.description ?? '',
            perks: r.data.features ?? [],
            cta: r.data.ctaLabel ?? `Quero o ${r.data.name}`,
            highlight: r.data.featured,
            tag: r.data.featured ? 'Mais escolhido' : null,
          };
          setApiPlans(prev => {
            const withoutDup = (prev ?? []).filter(p => p.id !== extra.id);
            return [extra, ...withoutDup];
          });
          setSelectedPlan(r.data.id);
          setShowModal(true);
        })
        .catch(() => {});
    } else if (planoTipo && ['INDIVIDUAL', 'FAMILIAR', 'AVULSO'].includes(planoTipo)) {
      setSelectedPlan(planoTipo);
      setShowModal(true);
    }
  }, []);

  // Se chamado com tipo legado (FAMILIAR etc.) e os planos da API já carregaram, usa o UUID real
  const openModal = (planIdOrType: string) => {
    const isType = ['INDIVIDUAL', 'FAMILIAR', 'AVULSO', 'CORTESIA'].includes(planIdOrType.toUpperCase());
    if (isType && apiPlans && apiPlans.length > 0) {
      const match = apiPlans.find(p => (p.planType ?? '').toUpperCase() === planIdOrType.toUpperCase());
      setSelectedPlan(match ? match.id : planIdOrType);
    } else {
      setSelectedPlan(planIdOrType);
    }
    setShowModal(true);
  };

  const handleLogin = async () => {
    if (!loginEmail.trim()) { setLoginError('Informe o e-mail.'); return; }
    if (!loginPassword) { setLoginError('Informe a senha.'); return; }
    setLoginLoading(true);
    setLoginError('');
    try {
      const r = await axios.post(`${API}/api/customer/auth/login`, { login: loginEmail.trim().toLowerCase(), password: loginPassword });
      localStorage.setItem('cli_token', r.data.token);
      window.location.href = '/cliente';
    } catch (e: any) {
      setLoginError(e.response?.data?.error || 'E-mail ou senha incorretos.');
    } finally {
      setLoginLoading(false);
    }
  };

  const espTabs: { id: EspFilter; l: string; c: number }[] = [
    { id: 'todas',    l: 'Todas',            c: allEsp.length },
    { id: '24h',      l: 'Sem agendar (24h)', c: allEsp.filter(e => e.cat === '24h').length },
    { id: 'adulto',   l: 'Adultos',           c: allEsp.filter(e => e.cat === 'adulto').length },
    { id: 'infantil', l: 'Infantil',          c: allEsp.filter(e => e.cat === 'infantil').length },
    { id: 'mental',   l: 'Saúde mental',      c: allEsp.filter(e => e.cat === 'mental').length },
  ];
  const visibleEsp = espFilter === 'todas' ? allEsp : allEsp.filter(e => e.cat === espFilter);

  return (
    <div className="pub" style={{ fontFamily: 'Nunito, system-ui, sans-serif', color: 'var(--ink)', background: '#fff', lineHeight: 1.5, fontSize: 16 }}>

      {/* ── HEADER ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 5, background: 'rgba(255,255,255,0.92)', backdropFilter: 'saturate(160%) blur(10px)', borderBottom: '1px solid var(--slate-200)' }}>
        <div className="pub-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBlock: desktop ? 14 : 12, gap: 16 }}>
          <img src="/logo.png" alt="Saúde Agora 24h" style={{ height: desktop ? 38 : 34, flexShrink: 0 }} />

          {desktop && (
            <nav style={{ display: 'flex', gap: 20, fontSize: 14, fontWeight: 700, color: 'var(--ink-2)', flexShrink: 1, overflow: 'hidden' }}>
              {['Como funciona', 'Médicos', 'Especialidades', 'Planos', 'Perguntas'].map(l => (
                <a key={l} href={`#${l.toLowerCase().replace(' ', '-')}`} style={{ cursor: 'pointer', textDecoration: 'none', color: 'var(--ink-2)', whiteSpace: 'nowrap' }}>{l}</a>
              ))}
            </nav>
          )}

          {desktop ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
              <form
                id="header-login-form"
                autoComplete="on"
                onSubmit={e => { e.preventDefault(); handleLogin(); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', border: `1.5px solid ${loginError ? '#ef4444' : 'var(--slate-200)'}`, borderRadius: 12, background: '#fff', padding: '3px 3px 3px 10px' }}>
                  <input
                    name="email"
                    value={loginEmail}
                    onChange={e => { setLoginEmail(e.target.value); setLoginError(''); }}
                    type="email"
                    autoComplete="email"
                    style={{ border: 0, outline: 0, background: 'transparent', fontSize: 13, fontWeight: 700, width: 100, color: 'var(--ink)', fontFamily: 'inherit' }}
                    placeholder="E-mail"
                  />
                  <div style={{ width: 1, height: 16, background: 'var(--slate-200)', margin: '0 4px', flexShrink: 0 }} />
                  <input
                    name="current-password"
                    value={loginPassword}
                    onChange={e => { setLoginPassword(e.target.value); setLoginError(''); }}
                    type="password"
                    autoComplete="current-password"
                    style={{ border: 0, outline: 0, background: 'transparent', fontSize: 13, fontWeight: 700, width: 76, color: 'var(--ink)', fontFamily: 'inherit' }}
                    placeholder="Senha"
                  />
                  <button
                    type="submit"
                    disabled={loginLoading}
                    style={{ background: 'var(--sky-700)', color: '#fff', borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', border: 0, cursor: loginLoading ? 'default' : 'pointer', fontFamily: 'inherit', opacity: loginLoading ? 0.7 : 1, marginLeft: 4 }}
                  >{loginLoading ? '...' : 'Entrar'}</button>
                </div>
              </form>
              {loginError && <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 600 }}>{loginError}</span>}
            </div>
          ) : (
            <button className="pub-btn pub-btn-primary" style={{ padding: '9px 16px', fontSize: 13 }} onClick={() => openModal('FAMILIAR')}>
              Garantir minha vaga
            </button>
          )}
        </div>
      </header>

      {/* ── HERO ── */}
      <section id="como-funciona" style={{ paddingBlock: desktop ? '72px 88px' : '36px 48px', background: 'linear-gradient(180deg, var(--sky-50) 0%, transparent 60%)' }}>
        <div className="pub-wrap" style={desktop ? { display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 56, alignItems: 'center' } : {}}>
          <div>
            <span className="pub-pill live" style={{ marginBottom: 16 }}>Lançamento · {remaining} vagas restantes</span>
            <h1 className="pub-hero-h1" style={{ fontSize: 38, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.02em', color: 'var(--sky-900)', margin: '0 0 14px' }}>
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
              <div className="pub-mono" style={{ textAlign: 'center', fontSize: 13 }}>sem cartão · 30 segundos · cancela quando quiser</div>
            </div>
            <VagasCounter remaining={remaining} />
            <ul style={{ listStyle: 'none', padding: 0, margin: '18px 0 0', display: 'grid', gap: 6, fontSize: 13.5, color: 'var(--ink-2)', fontWeight: 700 }}>
              <li>✓ Atestado médico em PDF</li>
              <li>✓ Atende família inteira no plano Familiar</li>
            </ul>
          </div>
          {desktop && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={medicosImg} alt="Consulta médica online" style={{ width: '100%', height: 'auto', borderRadius: 20 }} />
            </div>
          )}
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ background: 'var(--sky-900)', color: '#fff', paddingBlock: 28 }}>
        <div className="pub-wrap" style={{ display: 'grid', gridTemplateColumns: desktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: desktop ? 0 : 22 }}>
          {[{ n: '100%', l: 'atendimento BR' }, { n: '+500', l: 'médicos com CRM' }, { n: '+30', l: 'especialidades' }, { n: '24h', l: 'todo dia' }].map((s, i) => (
            <div key={i} style={{ textAlign: desktop ? 'center' : 'left', padding: desktop ? '8px 0' : 0 }}>
              <div style={{ fontSize: desktop ? 44 : 32, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.02em' }}>{s.n}</div>
              <div style={{ fontSize: desktop ? 13 : 12, opacity: 0.8, fontWeight: 700, marginTop: 4 }}>{s.l}</div>
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
          <ol style={{ listStyle: 'none', padding: 0, margin: '26px 0 0', display: 'grid', gridTemplateColumns: desktop ? 'repeat(3, 1fr)' : '1fr', gap: 14 }}>
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

      <MidCta variant="signup" desktop={desktop} onCta={() => openModal('FAMILIAR')} />

      {/* ── PARA QUEM É (PERSONAS) ── */}
      <section className="pub-section" style={{ background: 'var(--green-50)' }}>
        <div className="pub-wrap">
          <span className="pub-eyebrow" style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}>Para quem é</span>
          <h2 className="pub-h2">Feito pra família real, do interior.</h2>
          <p className="pub-lead">Atende do bebê à vovó. Veja se a gente serve pra você:</p>
          <div style={{ display: 'grid', gridTemplateColumns: desktop ? 'repeat(3, 1fr)' : '1fr', gap: 14, marginTop: 24 }}>
            {PERSONAS.map((p, i) => (
              <article key={i} className="pub-card" style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: `linear-gradient(135deg, ${p.color}, color-mix(in oklab, ${p.color} 40%, white))`, color: '#fff', flexShrink: 0, display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 900, overflow: 'hidden' }}>
                    {p.photo
                      ? <img src={p.photo} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }} />
                      : p.name.split(',')[0].split(' ').slice(0, 2).map((w: string) => w[0]).join('')}
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
      <section id="especialidades" className="pub-section" style={{ background: 'var(--slate-50)' }}>
        <div className="pub-wrap">
          <span className="pub-eyebrow">Especialidades</span>
          <h2 className="pub-h2">{allEsp.length}+ especialidades, do bebê à vovó.</h2>
          <p className="pub-lead">3 sempre disponíveis 24h, sem agendar. As outras, com hora marcada em até 7 dias.</p>

          {/* Strip 24h — destaque principal */}
          <div style={{ marginTop: 20, padding: '18px 20px', background: 'linear-gradient(135deg, var(--green-600), var(--green-700))', borderRadius: 16, color: '#fff' }}>
            <div style={{ fontSize: 10.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.13em', opacity: 0.85, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#86efac', display: 'inline-block' }} />
              Disponíveis agora · sem agendar · incluso no plano
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: desktop ? 'repeat(3, 1fr)' : '1fr', gap: 8 }}>
              {ESP_24H.map(e => (
                <div key={e.n} style={{ background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.22)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(255,255,255,0.18)', display: 'grid', placeItems: 'center', fontSize: 17, flexShrink: 0 }}>
                    {e.kids ? '◆' : '●'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 14, color: '#fff' }}>{e.n}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.78)', fontWeight: 700, marginTop: 2 }}>
                      {e.kids ? '0–17 anos · 24h por dia' : '24h por dia · todo dia'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, marginTop: 22, overflowX: 'auto', paddingBottom: 4 }}>
            {espTabs.map(t => (
              <button key={t.id} onClick={() => setEspFilter(t.id)} style={{ padding: '8px 14px', borderRadius: 999, border: `1.5px solid ${espFilter === t.id ? 'var(--sky-700)' : 'var(--slate-200)'}`, background: espFilter === t.id ? 'var(--sky-900)' : '#fff', color: espFilter === t.id ? '#fff' : 'var(--ink-2)', fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}>
                {t.l}
                <span style={{ background: espFilter === t.id ? 'rgba(255,255,255,0.18)' : 'var(--slate-100)', color: espFilter === t.id ? '#fff' : 'var(--ink-3)', padding: '1px 7px', borderRadius: 999, fontSize: 10.5, fontWeight: 900 }}>{t.c}</span>
              </button>
            ))}
          </div>
          <div className="esp-chip-grid">
            {visibleEsp.map(e => (
              <EspChip key={e.n} e={e} onBook={e.price && e.price > 0 ? () => setAgendarEsp(e) : undefined} />
            ))}
          </div>
          <div style={{ marginTop: 18, padding: 14, background: '#fff', borderRadius: 12, border: '1px solid var(--slate-200)', fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.55, fontWeight: 600 }}>
            <strong style={{ color: 'var(--ink)' }}>Como funciona o agendamento:</strong> você pede pelo app, nossa equipe analisa o caso e marca em até 7 dias úteis. Casos graves entram com prioridade máxima.
          </div>
        </div>
      </section>

      {/* ── SAÚDE MENTAL ── */}
      <section className="pub-section">
        <div className="pub-wrap">
          <div style={{ background: 'linear-gradient(135deg, #7e22ce 0%, #6d28d9 50%, var(--sky-900) 100%)', borderRadius: 22, padding: desktop ? 48 : 28, color: '#fff', position: 'relative', overflow: 'hidden', display: 'grid', gridTemplateColumns: desktop ? '1.4fr 1fr' : '1fr', gap: desktop ? 48 : 0, alignItems: 'center' }}>
            <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 80% 0%, rgba(168,85,247,0.5), transparent 50%), radial-gradient(circle at 20% 100%, rgba(14,165,233,0.4), transparent 50%)' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', padding: '5px 12px', borderRadius: 999, fontSize: 11, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} /> Pronto atendimento · 9h às 23h
              </div>
              <h2 style={{ color: '#fff', fontSize: desktop ? 34 : 26, lineHeight: 1.1, marginBottom: 12 }}>
                Falar com um psicólogo agora,<br />sem precisar marcar.
              </h2>
              <p style={{ fontSize: desktop ? 17 : 15, opacity: 0.92, maxWidth: '44ch', marginBottom: 20 }}>
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
            {desktop && (
              <div style={{ position: 'relative', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 18, padding: 22, backdropFilter: 'blur(10px)' }}>
                <div className="pub-mono" style={{ color: '#cbd5e1', marginBottom: 10 }}>Acolhimento ao vivo · agora</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7, #6d28d9)', color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900, border: '2px solid rgba(255,255,255,0.3)' }}>BC</div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 15, color: '#fff' }}>Dra. Bianca Costa</div>
                    <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 700, fontFamily: 'var(--mono)' }}>Psicologia · CRP/PE 02-5544</div>
                    <div style={{ fontSize: 11, color: '#86efac', fontWeight: 800, marginTop: 4 }}>● Disponível agora</div>
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.08)', padding: 14, borderRadius: 12, fontSize: 13, fontStyle: 'italic', lineHeight: 1.5, borderLeft: '3px solid #a855f7' }}>
                  "Tô aqui pra te ouvir. Pode começar do início ou de onde você quiser. Não tem pressa."
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <span style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.15)', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>Sigilo profissional</span>
                  <span style={{ padding: '5px 10px', background: 'rgba(255,255,255,0.15)', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>15–45min</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── PACOTES ── */}
      <section className="pub-section">
        <div className="pub-wrap">
          <span className="pub-eyebrow">Acompanhamento contínuo</span>
          <h2 className="pub-h2">Pacotes pra cuidar todo mês, mais barato.</h2>
          <p className="pub-lead">Quando você precisa de acompanhamento, não só de uma consulta avulsa.</p>
          <div style={{ display: 'grid', gridTemplateColumns: desktop ? 'repeat(3, 1fr)' : '1fr', gap: 14, marginTop: 22 }}>
            {PACOTES.map(p => (
              <article key={p.area} className="pub-card" style={{ padding: 18 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: p.colorSoft, color: p.color, borderRadius: 999, fontSize: 11, fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 12 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />{p.area}
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {p.items.map(it => (
                    <div
                      key={it.freq}
                      onClick={() => setSelectedPacote({ area: p.area, color: p.color, colorSoft: p.colorSoft, item: it })}
                      style={{ border: `1.5px solid ${p.color}33`, borderRadius: 12, padding: 14, background: '#fff', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = p.color; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 2px 10px ${p.color}22`; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${p.color}33`; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ fontWeight: 900, fontSize: 13.5 }}>{it.freq}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {it.save && <span style={{ padding: '2px 8px', borderRadius: 999, background: 'var(--green-50)', color: 'var(--green-700)', fontSize: 10, fontWeight: 900 }}>{it.save}</span>}
                          <span style={{ fontSize: 11, fontWeight: 900, color: p.color, background: p.colorSoft, padding: '2px 8px', borderRadius: 6 }}>Contratar →</span>
                        </div>
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

      <MidCta variant="whatsapp" desktop={desktop} onCta={() => openModal('FAMILIAR')} />

      {/* ── BENEFÍCIOS ── */}
      <section className="pub-section">
        <div className="pub-wrap">
          <span className="pub-eyebrow">O que está incluído</span>
          <h2 className="pub-h2">Tudo no app, sem letrinha miúda.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: desktop ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: 12, marginTop: 22 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: desktop ? 'repeat(2, 1fr)' : '1fr', gap: 12, marginTop: 22 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: desktop ? `repeat(${(apiPlans ?? PLANS_DEFAULT).length}, 1fr)` : '1fr', gap: 14, marginTop: 24, alignItems: 'start' }}>
            {(apiPlans ?? PLANS_DEFAULT).map(p => (
              <article key={p.id} style={{ padding: 22, position: 'relative', borderRadius: 14, border: `${p.highlight ? 2 : 1}px solid ${p.highlight ? 'var(--green-500)' : 'var(--slate-200)'}`, background: p.highlight ? 'linear-gradient(180deg, var(--green-50), #fff 40%)' : '#fff' }}>
                {p.tag && <span style={{ position: 'absolute', top: -12, left: 18, background: 'var(--green-500)', color: '#fff', padding: '4px 10px', borderRadius: 999, fontSize: 10.5, fontWeight: 900, letterSpacing: '0.06em' }}>{p.tag.toUpperCase()}</span>}
                <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 6 }}>{p.name}</h3>
                <p style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>{p.desc}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink-2)' }}>R$</span>
                  <span style={{ fontSize: 44, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.03em', color: 'var(--sky-900)' }}>{p.price}</span>
                  <span style={{ fontSize: 13, color: 'var(--ink-2)', fontWeight: 700 }}>{p.period}</span>
                </div>
                {p.strike && <div style={{ fontSize: 12, color: 'var(--ink-3)', textDecoration: 'line-through', marginBottom: 16 }}>Normal R$ {p.strike}</div>}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 18px', display: 'grid', gap: 8 }}>
                  {p.perks.map(k => (
                    <li key={k} style={{ display: 'flex', gap: 8, fontSize: 14, color: 'var(--ink-2)' }}>
                      <span style={{ color: 'var(--green-500)', fontWeight: 900 }}>✓</span> {k}
                    </li>
                  ))}
                </ul>
                <button onClick={() => remaining > 0 && openModal(p.id)} disabled={remaining === 0} className={`pub-btn pub-btn-block ${p.highlight ? 'pub-btn-primary' : 'pub-btn-outline'}`} style={{ whiteSpace: 'normal', lineHeight: 1.3 }}>
                  {remaining === 0 ? 'Vagas esgotadas' : p.cta}
                </button>
              </article>
            ))}
          </div>
          <p style={{ marginTop: 18, fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', fontWeight: 600 }}>Pix · cartão · boleto · sem juros · cancele a qualquer momento pelo app</p>
        </div>
      </section>

      <MidCta variant="start" desktop={desktop} onCta={() => openModal('FAMILIAR')} />

      {/* ── DEPOIMENTOS ── */}
      <section className="pub-section">
        <div className="pub-wrap">
          <span className="pub-eyebrow">Quem já usa</span>
          <h2 className="pub-h2">Gente do interior usando todo dia.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: desktop ? 'repeat(3, 1fr)' : '1fr', gap: 14, marginTop: 22 }}>
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
                    <div style={{ fontSize: 10.5, color: '#94a3b8', fontWeight: 600, marginTop: 2 }}>{t.since}</div>
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
          <h2 style={{ color: '#fff', fontSize: desktop ? 36 : 26, lineHeight: 1.15 }}>Operação 100% dentro da lei.</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15, marginTop: 8, maxWidth: '44ch' }}>
            Plataforma operada pela Meditele com gestão clínica auditada, sigilo profissional e proteção total dos seus dados.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: desktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: 12, marginTop: 22 }}>
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
      <section id="perguntas" className="pub-section" style={{ background: 'var(--green-50)' }}>
        <div className="pub-wrap">
          <span className="pub-eyebrow" style={{ background: 'var(--green-100)', color: 'var(--green-700)' }}>Perguntas frequentes</span>
          <h2 className="pub-h2">Dúvidas que todo mundo tem.</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: '22px 0 0', display: 'grid', gap: 10, maxWidth: desktop ? 740 : 'none' }}>
            {FAQS.map((item, i) => (
              <li key={i} style={{ background: '#fff', border: '1px solid var(--slate-200)', borderRadius: 12 }}>
                <button onClick={() => setFaqOpen(faqOpen === i ? -1 : i)} style={{ width: '100%', textAlign: 'left', padding: '16px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, fontWeight: 800, fontSize: 15, background: 'none', border: 0, cursor: 'pointer', fontFamily: 'inherit' }}>
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
          <h2 style={{ fontSize: desktop ? 40 : 30, fontWeight: 900, color: '#fff', lineHeight: 1.15, marginTop: 14 }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: desktop ? '1.6fr 1fr 1fr 1fr' : '1fr', gap: desktop ? 32 : 28 }}>
            <div>
              <div style={{ display: 'inline-flex', padding: '8px 12px', background: '#fff', borderRadius: 10 }}>
                <img src="/logo.png" alt="Saúde Agora 24h" style={{ height: 30 }} />
              </div>
              <p style={{ marginTop: 16, fontSize: 13.5, opacity: 0.72, lineHeight: 1.55, maxWidth: '36ch' }}>
                Plataforma de telemedicina operada pela <strong style={{ color: '#fff' }}>Meditele</strong>. Médicos brasileiros com CRM ativo. Atendimento 24h, todos os dias do ano.
              </p>
              <div style={{ marginTop: 20, display: 'grid', gap: 10 }}>
                {[
                  { icon: <WaIcon size={16} />, label: '(87) 9 9659-3551', sub: 'Suporte · 8h às 22h, todos os dias', href: 'https://wa.me/5587996593551' as string | null },
                  { icon: '🇧🇷', label: 'Todos os estados do Brasil', sub: 'Atendimento 100% online · sem fronteiras', href: null },
                ].map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid #1e293b', color: '#86efac', display: 'grid', placeItems: 'center', flexShrink: 0 }}>{c.icon}</div>
                    <div>
                      {c.href
                        ? <a href={c.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, fontWeight: 800, color: '#fff', textDecoration: 'none' }}>{c.label}</a>
                        : <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{c.label}</div>
                      }
                      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, marginTop: 1 }}>{c.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {[
              { title: 'Produto', links: [
                { l: 'Como funciona', href: '#como-funciona' },
                { l: 'Para quem é', href: '#' },
                { l: 'Especialidades', href: '#especialidades' },
                { l: 'Saúde mental', href: '#' },
                { l: 'Planos e preços', href: '#planos' },
              ]},
              { title: 'Empresa', links: [
                { l: 'Sobre nós', href: '#' },
                { l: 'Imprensa', href: '#' },
                { l: 'Contato', href: 'https://wa.me/5587996593551' },
              ]},
              { title: 'Ajuda & legal', links: [
                { l: 'Central de ajuda', href: '#' },
                { l: 'Política de Privacidade', href: '/privacidade' },
                { l: 'Termos de uso', href: '/termos' },
                { l: 'LGPD', href: '/privacidade' },
                { l: 'Cancelamento', href: '/termos' },
              ]},
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontWeight: 900, color: '#fff', marginBottom: 14, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.14em' }}>{col.title}</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
                  {col.links.map(link => <li key={link.l}><a href={link.href} style={{ color: '#cbd5e1', fontSize: 13.5, fontWeight: 600, opacity: 0.8, textDecoration: 'none' }}>{link.l}</a></li>)}
                </ul>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 36, padding: '20px 0', borderTop: '1px solid #1e293b', borderBottom: '1px solid #1e293b', display: 'grid', gridTemplateColumns: desktop ? '1fr 1fr' : '1fr', gap: 20, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>Operação regulamentada</div>
              <div style={{ display: 'grid', gridTemplateColumns: desktop ? 'repeat(4, 1fr)' : 'repeat(2, 1fr)', gap: 8 }}>
                {[{ l: 'LGPD', s: 'Lei 13.709/18' }, { l: 'CFM', s: 'Res. 2.314/22' }, { l: 'Sigilo médico', s: 'Garantido' }, { l: '+500 médicos', s: 'CRM ativo' }].map(s => (
                  <div key={s.l} style={{ padding: '7px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}>
                    <div style={{ color: '#fff', fontWeight: 900 }}>{s.l}</div>
                    <div style={{ color: '#64748b', fontWeight: 700, fontSize: 10, marginTop: 1 }}>{s.s}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: desktop ? 'flex' : 'block', justifyContent: 'flex-end', alignItems: 'center', gap: 28 }}>
              <div style={{ marginTop: desktop ? 0 : 20 }}>
                <div style={{ fontSize: 10, fontWeight: 900, color: '#94a3b8', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>Formas de pagamento</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['Pix', 'Visa', 'Master', 'Elo', 'Boleto'].map(b => (
                    <div key={b} style={{ padding: '6px 10px', height: 28, background: '#fff', color: '#0f172a', borderRadius: 6, fontSize: 10, fontWeight: 900, display: 'grid', placeItems: 'center', minWidth: 44 }}>{b}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 20, display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between', fontSize: 11, color: '#64748b', fontWeight: 700 }}>
            <span>© 2026 Saúde Agora 24h · CNPJ 61.402.802/0001-12 · saudeagora24h.com.br</span>
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

      {/* ── MODAL CHECKOUT ── */}
      {showModal && <Modal onClose={() => setShowModal(false)} selectedPlan={selectedPlan} onPlanChange={setSelectedPlan} plans={apiPlans ?? PLANS_DEFAULT} />}

      {/* ── MODAL PACOTE ── */}
      {selectedPacote && (
        <div
          onClick={() => setSelectedPacote(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 999, padding: 16 }}
        >
          <div
            onClick={ev => ev.stopPropagation()}
            style={{ background: '#fff', borderRadius: '20px 20px 20px 20px', width: '100%', maxWidth: 480, padding: '28px 24px 32px', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}
          >
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', background: selectedPacote.colorSoft, color: selectedPacote.color, borderRadius: 999, fontSize: 11, fontWeight: 900, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
              {selectedPacote.area}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>
              Pacote {selectedPacote.item.freq}
            </div>
            <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginBottom: 12 }}>
              {selectedPacote.item.n}
            </div>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#0f172a', marginBottom: 2 }}>
              {selectedPacote.item.total}
              <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>/mês</span>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace', fontWeight: 700, marginBottom: 20 }}>
              {selectedPacote.item.per}
              {selectedPacote.item.save && <span style={{ marginLeft: 8, color: '#16a34a', fontWeight: 900 }}> · {selectedPacote.item.save}</span>}
            </div>
            <div style={{ padding: '12px 14px', borderRadius: 10, background: '#f0f9ff', border: '1px solid #bae6fd', fontSize: 13, color: '#0369a1', fontWeight: 600, marginBottom: 20, lineHeight: 1.6 }}>
              📅 Sessões agendadas semanalmente ou quinzenalmente, por videochamada. O pagamento é realizado mensalmente.
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <button
                onClick={() => { setSelectedPacote(null); setShowModal(true); setSelectedPlan('INDIVIDUAL'); }}
                style={{ padding: '15px', borderRadius: 12, border: 0, background: `linear-gradient(135deg, ${selectedPacote.color}, ${selectedPacote.color}cc)`, color: '#fff', fontSize: 15, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 16px ${selectedPacote.color}44` }}
              >
                Criar conta e contratar →
              </button>
              <button
                onClick={() => setSelectedPacote(null)}
                style={{ padding: '13px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── WIZARD AGENDAMENTO ESPECIALIDADE ── */}
      {agendarEsp && <AgendarEspModal esp={agendarEsp} onClose={() => setAgendarEsp(null)} />}
    </div>
  );
}
