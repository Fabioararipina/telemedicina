import React, { useState, useEffect } from 'react';
import {
  HeartPulse, Smartphone, FileText, Pill, CheckCircle2,
  ChevronDown, ChevronUp, Shield, Clock, Stethoscope, Users, Phone, Zap, Star, X, Flame,
  Baby, Heart, Brain, Bone, Flower2, Activity, Microscope, Eye, Wind,
  SmilePlus, Apple, Ear, PersonStanding, Siren
} from 'lucide-react';
import axios from 'axios';

const API = 'https://saudeagora24h.com.br/api-backend';
const TOTAL_VAGAS = 50;

// Contador psicológico: começa com 29 inscritos, sobe +2 a cada 4 horas
const EPOCH = new Date('2026-04-19T08:00:00-03:00').getTime(); // início da campanha
const BASE_TAKEN = 29; // inscritos simulados no início
const INCREMENT = 2;   // +2 a cada período
const PERIOD_MS = 4 * 60 * 60 * 1000; // 4 horas em ms

function getPsychologicalRemaining(): number {
  const now = Date.now();
  const elapsed = Math.max(0, now - EPOCH);
  const periods = Math.floor(elapsed / PERIOD_MS);
  const taken = Math.min(BASE_TAKEN + periods * INCREMENT, TOTAL_VAGAS - 1);
  return TOTAL_VAGAS - taken;
}

const faqs = [
  {
    q: 'É médico de verdade?',
    a: 'Sim! São profissionais formados, com registro no CRM, prontos para te atender 24 horas por dia, todos os dias da semana. Você terá acesso a um médico de verdade sempre que precisar — de madrugada, no feriado, no fim de semana.'
  },
  {
    q: 'A receita e o atestado valem mesmo?',
    a: 'Valem em todo o Brasil! Você pode usar a receita em qualquer farmácia e o atestado é aceito no trabalho normalmente. Tudo dentro da lei.'
  },
  {
    q: 'Funciona no celular simples?',
    a: 'Funciona! Se o seu celular acessa WhatsApp e YouTube, ele acessa o nosso serviço também. Basta ter internet e instalar o aplicativo gratuitamente.'
  },
  {
    q: 'Quando vou poder usar depois do pré-cadastro?',
    a: 'Assim que a plataforma for lançada, você recebe uma mensagem no seu WhatsApp com o link de acesso. Quem fez o pré-cadastro entra primeiro e garante o preço especial por tempo indeterminado.'
  }
];

const testimonials = [
  {
    name: 'Maria das Graças',
    city: 'Fortaleza, CE',
    color: '#10b981',
    text: 'Minha filha tava com febre alta numa sexta à noite. Em 15 minutos tava falando com um pediatra. Que alívio! A receita chegou no celular na hora mesma.',
    stars: 5
  },
  {
    name: 'João Carlos',
    city: 'Recife, PE',
    color: '#0ea5e9',
    text: 'Precisei de um atestado com urgência pro meu serviço. Nunca pensei que fosse tão fácil. O médico atendeu rápido e meu chefe aceitou tranquilo.',
    stars: 5
  },
  {
    name: 'Dona Raimunda',
    city: 'Teresina, PI',
    color: '#f59e0b',
    text: 'Tenho 67 anos e nunca tinha feito consulta pelo celular. Minha neta me ajudou na primeira vez. Agora eu mesma já sei usar. Muito bom demais!',
    stars: 5
  }
];

const plans = [
  {
    id: 'INDIVIDUAL',
    name: 'Individual',
    price: '29,90',
    fullPrice: '39,90',
    period: '/mês',
    comparison: '💊 Menos que uma caixinha de remédio!',
    icon: <Stethoscope size={32} />,
    iconBg: '#d1fae5',
    iconColor: '#059669',
    highlight: true,
    badge: 'Mais Popular',
    features: [
      'Pronto-atendimento 24h',
      'Clínico geral ilimitado',
      'Pediatria 24h',
      'Receita e atestado válidos',
      'Descontos em farmácias parceiras',
    ]
  },
  {
    id: 'FAMILIAR',
    name: 'Familiar',
    price: '59,90',
    fullPrice: '69,90',
    period: '/mês',
    comparison: '👨‍👩‍👧 Titular + 2 dependentes incluídos',
    icon: <Users size={32} />,
    iconBg: '#dbeafe',
    iconColor: '#0ea5e9',
    highlight: false,
    badge: null,
    features: [
      'Tudo do plano Individual',
      'Titular + 2 dependentes',
      'Dependente extra: R$ 19,90/mês',
      'Psicologia orientativa',
      'Mais de 25 especialidades',
    ]
  },
  {
    id: 'AVULSO',
    name: 'Consulta Avulsa',
    price: '49,90',
    fullPrice: '59,90',
    period: '/ 1 mês',
    comparison: '🩺 Sem mensalidade — use quando precisar',
    icon: <Phone size={32} />,
    iconBg: '#fef3c7',
    iconColor: '#d97706',
    highlight: false,
    badge: null,
    features: [
      'Acesso por 30 dias',
      'Consultas ilimitadas no período',
      'Receita e atestado válidos',
      'Sem renovação automática',
      'Ideal pra quem quer testar',
    ]
  }
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="faq-item" onClick={() => setOpen(!open)}>
      <div className="faq-question">
        <span>{q}</span>
        {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>
      {open && <div className="faq-answer">{a}</div>}
    </div>
  );
}

function VagasBar({ remaining }: { remaining: number }) {
  const taken = TOTAL_VAGAS - remaining;
  const pct = Math.min(100, (taken / TOTAL_VAGAS) * 100);
  return (
    <div className="vagas-bar-wrap">
      <div className="vagas-bar-header">
        <span className="vagas-fire"><Flame size={16} /> Condição especial de lançamento</span>
        <span className="vagas-count"><strong>{remaining}</strong> vagas restantes de {TOTAL_VAGAS}</span>
      </div>
      <div className="vagas-bar-track">
        <div className="vagas-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function App() {
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('INDIVIDUAL');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [remaining, setRemaining] = useState(getPsychologicalRemaining);
  const [formData, setFormData] = useState({ name: '', phone: '' });
  const [consentChecked, setConsentChecked] = useState(false);

  useEffect(() => {
    axios.get(`${API}/api/leads/count`)
      .then(r => {
        // Mostra o menor entre o real e o psicológico (mais urgência)
        const real = r.data.remaining;
        const psych = getPsychologicalRemaining();
        setRemaining(Math.min(real, psych));
      })
      .catch(() => {});
  }, []);

  const handleOpenModal = (planId: string) => {
    setSelectedPlan(planId);
    setShowModal(true);
    setSuccess(false);
    setError('');
    setFormData({ name: '', phone: '' });
    setConsentChecked(false);
  };

  // Abre modal direto se veio com ?plano=INDIVIDUAL|FAMILIAR|AVULSO
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plano = params.get('plano')?.toUpperCase();
    if (plano && ['INDIVIDUAL', 'FAMILIAR', 'AVULSO'].includes(plano)) {
      handleOpenModal(plano);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentChecked) {
      setError('Você precisa aceitar a Política de Privacidade e os Termos de Serviço para continuar.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API}/api/pre-cadastro`, {
        ...formData,
        plan: selectedPlan
      });
      setSuccess(true);
      setRemaining(res.data.remaining);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Deu um problema. Tenta de novo!');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlanData = plans.find(p => p.id === selectedPlan)!;

  return (
    <>
      {/* ── HEADER ── */}
      <header className="header">
        <div className="container header-content">
          <a href="/" className="logo">
            <img src="/logo.png" alt="Saúde Agora" style={{ height: '48px', width: 'auto' }} />
          </a>
          <button className="btn btn-primary btn-sm" onClick={() => handleOpenModal('INDIVIDUAL')}>
            Garantir Vaga
          </button>
        </div>
      </header>

      <main>
        {/* ── HERO ── */}
        <section className="hero">
          <div className="container hero-inner">
            <div className="hero-badge">🚀 Lançamento em breve — garanta seu preço especial!</div>
            <h1 className="hero-title">
              Cansado de ficar<br />
              <span>horas na fila do SUS?</span>
            </h1>
            <p className="hero-subtitle">
              Com o <strong>Saúde Agora</strong>, você fala com um médico de verdade pelo celular,
              a qualquer hora do dia ou da noite. Receita e atestado com validade em todo o Brasil.{' '}
              <strong>Por menos do que uma caixinha de remédio por mês.</strong>
            </p>
            <button className="btn btn-cta" onClick={() => handleOpenModal('INDIVIDUAL')}>
              🔒 Garantir Meu Preço Especial
            </button>
            <div className="hero-price-hint">
              A partir de <strong>R$ 29,90/mês</strong> — somente para os {TOTAL_VAGAS} primeiros
            </div>
            <div className="hero-trust">
              <span><Shield size={16} /> Seguro e Confiável</span>
              <span><Clock size={16} /> 24h por dia</span>
              <span><FileText size={16} /> Receita Digital</span>
            </div>
          </div>
        </section>

        {/* ── PROVA SOCIAL BRASIL ── */}
        <div className="social-proof-bar">
          <div className="container social-proof-inner">
            <div className="sp-item">
              <span className="sp-num">🇧🇷</span>
              <span className="sp-label">Disponível nos 26 estados + DF</span>
            </div>
            <div className="sp-divider" />
            <div className="sp-item">
              <span className="sp-num">+500</span>
              <span className="sp-label">Médicos cadastrados</span>
            </div>
            <div className="sp-divider" />
            <div className="sp-item">
              <span className="sp-num">+30</span>
              <span className="sp-label">Especialidades disponíveis</span>
            </div>
            <div className="sp-divider" />
            <div className="sp-item">
              <span className="sp-num">24h</span>
              <span className="sp-label">Atendimento todo dia</span>
            </div>
          </div>
        </div>

        {/* ── COMO FUNCIONA ── */}
        <section className="how-it-works">
          <div className="container">
            <h2 className="section-title">Como funciona?</h2>
            <p className="section-sub">É muito mais simples do que você imagina</p>
            <div className="steps-grid">
              <div className="step-card">
                <div className="step-number">1</div>
                <div className="step-icon"><Phone size={36} /></div>
                <h3>Faz o pré-cadastro</h3>
                <p>Garante seu lugar na lista e trava o preço especial de lançamento.</p>
              </div>
              <div className="step-arrow">→</div>
              <div className="step-card">
                <div className="step-number">2</div>
                <div className="step-icon"><Smartphone size={36} /></div>
                <h3>Recebe no WhatsApp</h3>
                <p>Na data do lançamento, você recebe o link de acesso direto no seu celular.</p>
              </div>
              <div className="step-arrow">→</div>
              <div className="step-card">
                <div className="step-number">3</div>
                <div className="step-icon"><Stethoscope size={36} /></div>
                <h3>Consulta na hora</h3>
                <p>Médico de verdade atende em minutos. Receita e atestado chegam no celular.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── HUMANOS ── */}
        <section className="humanos">
          <div className="container">
            <h2 className="section-title">Para quem é o Saúde Agora?</h2>
            <p className="section-sub">Para quem não pode esperar dias por uma consulta — nem pagar caro por ela</p>
            <div className="humanos-grid">
              <div className="humano-card">
                <div className="humano-foto-wrap">
                  <img
                    src="https://images.unsplash.com/photo-1584515933487-779824d29309?auto=format&fit=crop&w=600&q=80"
                    alt="Mãe com filho doente"
                    className="humano-foto"
                  />
                </div>
                <div className="humano-texto">
                  <h3>A mãe que não pode esperar</h3>
                  <p>Filho com febre de madrugada. Fila no UPA, espera de horas. Com o Saúde Agora, você fala com um pediatra agora mesmo e recebe a receita na hora.</p>
                </div>
              </div>
              <div className="humano-card">
                <div className="humano-foto-wrap">
                  <img
                    src="https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=600&q=80"
                    alt="Trabalhador precisando de atestado"
                    className="humano-foto"
                  />
                </div>
                <div className="humano-texto">
                  <h3>O trabalhador que não pode faltar</h3>
                  <p>Acordou mal, mas tem medo de perder o dia de serviço. Fala com o médico, pega o atestado digital e resolve tudo sem sair de casa.</p>
                </div>
              </div>
              <div className="humano-card">
                <div className="humano-foto-wrap">
                  <img
                    src="https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&w=600&q=80"
                    alt="Idosa sendo cuidada pela família"
                    className="humano-foto"
                  />
                </div>
                <div className="humano-texto">
                  <h3>A família que cuida dos mais velhos</h3>
                  <p>Levar vovó ao médico todo mês custa tempo e dinheiro. Com o Saúde Agora, ela tem acesso a geriatra e clínico geral sem precisar sair de casa.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── BENEFÍCIOS ── */}
        <section className="benefits">
          <div className="container">
            <h2 className="section-title">O que está incluído?</h2>
            <p className="section-sub">Tudo que você precisa, no celular, sem complicação</p>
            <div className="benefits-grid">
              <div className="benefit-card">
                <Clock size={40} className="benefit-icon" />
                <h3>24h por dia, 7 dias por semana</h3>
                <p>Feriado, madrugada, fim de semana — sempre tem médico disponível pra você.</p>
              </div>
              <div className="benefit-card">
                <FileText size={40} className="benefit-icon" />
                <h3>Receita e atestado válidos</h3>
                <p>Com validade em todo o Brasil. Funciona em qualquer farmácia ou empresa.</p>
              </div>
              <div className="benefit-card">
                <Stethoscope size={40} className="benefit-icon" />
                <h3>Várias especialidades</h3>
                <p>Clínico geral, pediatria, ginecologia e muito mais — tudo com médico de verdade, 24h por dia.</p>
              </div>
              <div className="benefit-card">
                <Pill size={40} className="benefit-icon" />
                <h3>Desconto em farmácias</h3>
                <p>Cupons de desconto em farmácias parceiras. Terminou a consulta, já vai economizar.</p>
              </div>
              <div className="benefit-card">
                <Zap size={40} className="benefit-icon" />
                <h3>Zero carência</h3>
                <p>Assinou hoje, já consulta hoje. Sem prazo de espera, sem burocracia.</p>
              </div>
              <div className="benefit-card">
                <Shield size={40} className="benefit-icon" />
                <h3>Cancela quando quiser</h3>
                <p>Sem fidelidade, sem multa. Você tem controle total sobre sua assinatura.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── ESPECIALIDADES ── */}
        <section className="especialidades">
          <div className="container">
            <h2 className="section-title">Especialidades disponíveis</h2>
            <p className="section-sub">Médico certo para o que você precisa</p>

            <div className="esp-bloco">
              <div className="esp-bloco-header esp-24h">
                <Siren size={18} /> Pronto Atendimento — disponível 24h por dia, 7 dias por semana
              </div>
              <div className="esp-grid">
                {[
                  { icon: <Siren size={28} />, name: 'Pronto Atendimento' },
                  { icon: <Stethoscope size={28} />, name: 'Clínico Geral' },
                  { icon: <Baby size={28} />, name: 'Pediatria' },
                  { icon: <Users size={28} />, name: 'Medicina da Família' },
                ].map((esp, i) => (
                  <div className="esp-card" key={i}>
                    <span className="esp-icon">{esp.icon}</span>
                    <span className="esp-name">{esp.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="esp-bloco">
              <div className="esp-bloco-header esp-agend">
                <Clock size={18} /> Psicologia — atendimento orientativo das 09h às 18h
              </div>
              <div className="esp-grid">
                {[
                  { icon: <SmilePlus size={28} />, name: 'Psicologia' },
                ].map((esp, i) => (
                  <div className="esp-card" key={i}>
                    <span className="esp-icon">{esp.icon}</span>
                    <span className="esp-name">{esp.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="esp-bloco">
              <div className="esp-bloco-header esp-agend">
                <FileText size={18} /> Especialidades por agendamento — mais de 30 áreas disponíveis
              </div>
              <div className="esp-grid">
                {[
                  { icon: <Heart size={28} />, name: 'Cardiologia' },
                  { icon: <Microscope size={28} />, name: 'Dermatologia' },
                  { icon: <Activity size={28} />, name: 'Endocrinologia' },
                  { icon: <Flower2 size={28} />, name: 'Ginecologia' },
                  { icon: <PersonStanding size={28} />, name: 'Geriatria' },
                  { icon: <Brain size={28} />, name: 'Neurologia' },
                  { icon: <Apple size={28} />, name: 'Nutrição' },
                  { icon: <Bone size={28} />, name: 'Ortopedia' },
                  { icon: <Wind size={28} />, name: 'Pneumologia' },
                  { icon: <Ear size={28} />, name: 'Reumatologia' },
                  { icon: <PersonStanding size={28} />, name: 'Urologia' },
                  { icon: <Eye size={28} />, name: 'Gastroenterologia' },
                  { icon: <Pill size={28} />, name: 'Psiquiatria' },
                ].map((esp, i) => (
                  <div className="esp-card" key={i}>
                    <span className="esp-icon">{esp.icon}</span>
                    <span className="esp-name">{esp.name}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* ── PLANOS ── */}
        <section id="planos" className="plans">
          <div className="container">
            <h2 className="section-title">Condição especial de lançamento</h2>
            <p className="section-sub">
              Aproveite a condição especial de lançamento. Reserve seu plano com valor diferenciado —
              depois ele vai subir. <strong>Para reservar não paga nada agora.</strong> Somente no dia
              da abertura avisaremos você para ter acesso à saúde 24 horas por dia.
            </p>

            <VagasBar remaining={remaining} />

            <div className="plans-grid-3">
              {plans.map(plan => (
                <div key={plan.id} className={`plan-card ${plan.highlight ? 'highlight' : ''}`}>
                  {plan.badge && <div className="plan-badge">{plan.badge}</div>}
                  <div className="plan-icon-wrap" style={{ background: plan.iconBg, color: plan.iconColor }}>
                    {plan.icon}
                  </div>
                  <h3 className="plan-name">{plan.name}</h3>
                  <div className="plan-price">
                    <span className="price-was">De R$ {plan.fullPrice}</span>
                    <div className="price-now-row">
                      <span className="price-value">R$ {plan.price}</span>
                      <span className="price-period">{plan.period}</span>
                    </div>
                  </div>
                  <p className="plan-comparison">{plan.comparison}</p>
                  <ul className="plan-features">
                    {plan.features.map((f, i) => (
                      <li key={i}><CheckCircle2 size={18} /> {f}</li>
                    ))}
                  </ul>
                  <button
                    className={`btn btn-full ${plan.highlight ? 'btn-primary' : 'btn-outline'}`}
                    onClick={() => handleOpenModal(plan.id)}
                    disabled={remaining === 0}
                  >
                    {remaining === 0 ? 'Vagas esgotadas' : `Garantir por R$ ${plan.price}${plan.period}`}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── DEPOIMENTOS ── */}
        <section className="testimonials">
          <div className="container">
            <h2 className="section-title">O que as pessoas estão falando</h2>
            <p className="section-sub">Pessoas reais, histórias reais</p>
            <div className="testimonials-grid">
              {testimonials.map((t, i) => (
                <div className="testimonial-card" key={i}>
                  <div className="stars">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <Star key={j} size={16} fill="#f59e0b" color="#f59e0b" />
                    ))}
                  </div>
                  <p className="testimonial-text">"{t.text}"</p>
                  <div className="testimonial-author">
                    <div className="avatar" style={{ background: t.color }}>{t.name.charAt(0)}</div>
                    <div>
                      <div className="author-name">{t.name}</div>
                      <div className="author-city">{t.city}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="faq">
          <div className="container">
            <h2 className="section-title">Perguntas que todo mundo faz</h2>
            <p className="section-sub">Respondemos com transparência</p>
            <div className="faq-list">
              {faqs.map((item, i) => <FAQItem key={i} q={item.q} a={item.a} />)}
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ── */}
        <section className="final-cta">
          <div className="container">
            <h2>Não perde essa chance!</h2>
            <p>
              São só {TOTAL_VAGAS} vagas com preço especial de lançamento.<br />
              Garanta o seu agora e aguarde o contato no WhatsApp.
            </p>
            <button className="btn btn-white" onClick={() => handleOpenModal('INDIVIDUAL')}>
              🔒 Garantir Meu Preço Especial
            </button>
            <p className="cta-sub">Gratuito para se cadastrar • Sem compromisso agora</p>
          </div>
        </section>
      </main>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="container">
          <div className="footer-logo">
            <HeartPulse size={24} />
            Saúde Agora
          </div>
          <div className="footer-links">
            <a href="/privacidade" className="footer-link">Política de Privacidade</a>
            <span className="footer-link-sep">·</span>
            <a href="/termos" className="footer-link">Termos de Serviço</a>
          </div>
          <p>© 2026 Saúde Agora. Todos os direitos reservados.</p>
          <p className="footer-disclaimer">
            O Saúde Agora conecta pacientes a profissionais de saúde licenciados.
            Não substitui emergências — em caso de emergência ligue 192 (SAMU).
          </p>
        </div>
      </footer>

      {/* ── MODAL DE PRÉ-CADASTRO ── */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="modal">
            <button className="modal-close" onClick={() => setShowModal(false)}>
              <X size={20} />
            </button>

            {success ? (
              <div className="success-state">
                <div className="success-icon">🎉</div>
                <h2>Você está na lista!</h2>
                <p>
                  Perfeito, <strong>{formData.name.split(' ')[0]}</strong>! Seu pré-cadastro no plano{' '}
                  <strong>{selectedPlanData.name}</strong> foi confirmado.
                  <br /><br />
                  Assim que a plataforma for lançada, você recebe uma mensagem no seu WhatsApp com tudo certinho. 👊
                </p>
                <button className="btn btn-primary btn-full" onClick={() => setShowModal(false)}>
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <div className="modal-plan-tag" style={{ background: selectedPlanData.iconBg, color: selectedPlanData.iconColor }}>
                  {selectedPlanData.name} — R$ {selectedPlanData.price}{selectedPlanData.period}
                </div>
                <h2 className="modal-title">
                  Garanta seu preço especial
                  <span className="modal-price">Só para os {TOTAL_VAGAS} primeiros</span>
                </h2>

                {error && <div className="form-error">{error}</div>}

                <form onSubmit={handleSubmit} className="checkout-form">
                  <div className="form-group">
                    <label>Seu nome completo</label>
                    <input
                      type="text" name="name" required
                      placeholder="Ex: Maria das Graças Silva"
                      value={formData.name} onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Seu WhatsApp</label>
                    <input
                      type="text" name="phone" required
                      placeholder="(87) 99999-9999"
                      value={formData.phone} onChange={handleInputChange}
                    />
                  </div>

                  <div className="order-summary">
                    <span>📋 Plano {selectedPlanData.name}</span>
                    <strong>R$ {selectedPlanData.price}{selectedPlanData.period}</strong>
                  </div>

                  <label className="consent-label">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={e => setConsentChecked(e.target.checked)}
                      className="consent-checkbox"
                    />
                    <span>
                      Li e concordo com a{' '}
                      <a href="/privacidade" target="_blank" rel="noopener noreferrer" className="consent-link">
                        Política de Privacidade
                      </a>{' '}
                      e os{' '}
                      <a href="/termos" target="_blank" rel="noopener noreferrer" className="consent-link">
                        Termos de Serviço
                      </a>
                    </span>
                  </label>

                  <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading || !consentChecked}>
                    {loading ? '⏳ Salvando...' : '✅ Quero Garantir Minha Vaga'}
                  </button>
                  <p className="form-disclaimer">
                    Gratuito agora. Você paga apenas quando a plataforma for lançada.
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default App;
