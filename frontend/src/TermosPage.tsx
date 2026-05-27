import React from 'react';
import { Link } from 'react-router-dom';

export default function TermosPage() {
  return (
    <div style={{ fontFamily: 'Nunito, system-ui, sans-serif', color: '#1e293b', background: '#fff', lineHeight: 1.6, fontSize: 16 }}>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #e2e8f0', zIndex: 10 }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <img src="/logo.png" alt="Saúde Agora 24h" style={{ height: 32 }} />
          </a>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: '#0369a1', textDecoration: 'none', padding: '8px 14px', border: '1.5px solid #bae6fd', borderRadius: 999, background: '#f0f9ff' }}>
            ← Voltar ao site
          </Link>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 24px 80px' }}>

        {/* Title */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#0369a1', background: '#f0f9ff', padding: '5px 10px', borderRadius: 6, marginBottom: 12 }}>Legal</div>
          <h1 style={{ fontSize: 36, fontWeight: 900, lineHeight: 1.1, color: '#0c4a6e', margin: '0 0 10px' }}>Termos e Condições de Uso</h1>
          <p style={{ fontSize: 13.5, color: '#64748b', fontWeight: 700 }}>Última atualização: 23 de maio de 2026</p>
          <div style={{ marginTop: 16, padding: '14px 16px', background: '#fefce8', border: '1px solid #fde047', borderRadius: 10, fontSize: 13, fontWeight: 700, color: '#713f12', lineHeight: 1.5 }}>
            ⚠️ <strong>Em caso de emergência médica, ligue imediatamente para o SAMU (192) ou dirija-se ao pronto-socorro mais próximo.</strong> A telemedicina não substitui atendimento de urgência presencial.
          </div>
        </div>

        <div style={{ display: 'grid', gap: 32 }}>

          <Section n="1" title="Aceitação dos Termos">
            <p>Ao realizar o cadastro ou assinar qualquer plano do <strong>Saúde Agora 24h</strong>, você declara ter lido, compreendido e concordado integralmente com estes Termos e Condições e com nossa <Link to="/privacidade" style={linkStyle}>Política de Privacidade</Link>.</p>
            <p>Se você não concordar com algum destes termos, não realize o cadastro ou cancele sua assinatura antes do próximo ciclo de cobrança.</p>
          </Section>

          <Section n="2" title="Descrição do Serviço">
            <p>O Saúde Agora 24h é uma plataforma intermediária que conecta usuários a médicos e profissionais de saúde licenciados pelo CRM para realização de consultas online (telemedicina). As consultas ocorrem por meio da plataforma <strong>Meditele</strong>, nossa parceira técnica.</p>
            <p>O Saúde Agora 24h <strong>não é um plano de saúde</strong> nos termos da Lei nº 9.656/1998 e não se caracteriza como seguro saúde. Trata-se de um serviço de acesso a consultas médicas por telemedicina, regulamentado pela <strong>Resolução CFM nº 2.314/2022</strong>.</p>
          </Section>

          <Section n="3" title="Planos e Preços">
            <p>Os planos disponíveis e seus respectivos preços são:</p>
            <ul style={ulStyle}>
              <li><strong>Individual — R$ 29,90/mês:</strong> acesso para 1 pessoa, clínico geral 24h, receitas e atestados digitais válidos em todo o Brasil.</li>
              <li><strong>Familiar — R$ 59,90/mês:</strong> titular + 2 dependentes incluídos, acesso a mais de 25 especialidades por agendamento e psicologia orientativa.</li>
              <li><strong>Consulta Avulsa — R$ 49,90 por 30 dias:</strong> acesso sem renovação automática, ideal para uso pontual. Não está sujeito ao período de fidelidade.</li>
            </ul>
            <p>Os preços especiais de lançamento são garantidos aos primeiros 50 assinantes e mantidos enquanto a assinatura estiver ativa e sem interrupção. Após cancelamento, o reingresso ocorrerá pela tabela vigente na data da nova contratação.</p>
            <p>Reservamo-nos o direito de reajustar os preços mediante aviso prévio de <strong>30 dias</strong> por WhatsApp ou e-mail.</p>
          </Section>

          <Section n="4" title="Ativação e Pagamento">
            <p>O acesso ao plano é ativado após a confirmação do pagamento pela equipe comercial. O pagamento pode ser realizado via <strong>Pix, cartão de crédito, cartão de débito ou boleto bancário</strong>.</p>
            <p>A cobrança é mensal, renovada automaticamente na mesma data de ativação do plano. O assinante será notificado via WhatsApp com <strong>3 dias de antecedência</strong> antes de cada renovação.</p>
            <p>Em caso de inadimplência superior a 5 dias corridos, o acesso poderá ser suspenso até a regularização do pagamento, sem cancelamento automático do plano.</p>
          </Section>

          <Section n="5" title="Cancelamento e Multa por Rescisão Antecipada">
            <Alert>
              Os planos mensais do Saúde Agora 24h possuem <strong>período mínimo de fidelidade de 3 (três) meses</strong> a partir da data de ativação.
            </Alert>

            <h3 style={h3Style}>5.1 — Cancelamento após o período de fidelidade</h3>
            <p>Após cumprido o período mínimo de 3 meses, o cancelamento é <strong>livre e sem multa</strong>, podendo ser solicitado a qualquer momento diretamente pelo WhatsApp do suporte ou pelo painel do assinante, com efeito no último dia do ciclo já pago.</p>

            <h3 style={h3Style}>5.2 — Cancelamento durante o período de fidelidade (multa)</h3>
            <p>O cancelamento solicitado <strong>antes do término do 3º mês</strong> de vigência estará sujeito a uma multa rescisória de <strong>20% (vinte por cento)</strong> calculada sobre o valor total das mensalidades restantes até o fim do período mínimo de fidelidade.</p>
            <p><strong>Fórmula:</strong> Multa = Nº de meses restantes × Valor da mensalidade × 20%</p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', margin: '4px 0', fontSize: 13.5, lineHeight: 1.8 }}>
              <strong>Exemplos:</strong>
              <ul style={{ ...ulStyle, marginTop: 8 }}>
                <li>Plano Individual (R$ 29,90/mês), cancelamento no 1º mês → 2 meses restantes → <strong>multa: R$ 11,96</strong> (R$ 59,80 × 20%)</li>
                <li>Plano Individual (R$ 29,90/mês), cancelamento no 2º mês → 1 mês restante → <strong>multa: R$ 5,98</strong> (R$ 29,90 × 20%)</li>
                <li>Plano Familiar (R$ 59,90/mês), cancelamento no 1º mês → 2 meses restantes → <strong>multa: R$ 23,96</strong> (R$ 119,80 × 20%)</li>
              </ul>
            </div>

            <p>A multa será cobrada no ato do cancelamento antecipado, via Pix ou boleto, com prazo de pagamento de <strong>5 dias úteis</strong>. O não pagamento da multa implica manutenção do débito e possível registro em órgãos de proteção ao crédito.</p>

            <h3 style={h3Style}>5.3 — Direito de arrependimento (CDC)</h3>
            <p>Em conformidade com o Art. 49 do Código de Defesa do Consumidor (Lei nº 8.078/1990), o assinante tem direito ao <strong>cancelamento sem multa e com reembolso integral</strong> se solicitar em até <strong>7 dias corridos</strong> após a primeira ativação, desde que não tenha realizado consultas no período.</p>
            <p>Após a realização de qualquer consulta, o direito de arrependimento fica condicionado ao ressarcimento do custo da(s) consulta(s) realizada(s), à razão de R$ 50,00 por consulta avulsa com clínico geral.</p>

            <h3 style={h3Style}>5.4 — Consulta Avulsa (30 dias)</h3>
            <p>A Consulta Avulsa não possui renovação automática e não está sujeita ao período de fidelidade ou multa rescisória. O acesso encerra automaticamente ao término dos 30 dias.</p>
          </Section>

          <Section n="6" title="Reembolso">
            <ul style={ulStyle}>
              <li><strong>Arrependimento (até 7 dias, sem consultas realizadas):</strong> reembolso integral, sem multa.</li>
              <li><strong>Após 7 dias ou com consultas realizadas:</strong> não há reembolso proporcional por dias não utilizados. O cancelamento apenas interrompe futuras cobranças (observadas as regras de multa do item 5).</li>
              <li><strong>Falha técnica da plataforma:</strong> caso o serviço fique indisponível por período superior a 72 horas consecutivas por falha nossa, o período de indisponibilidade será creditado no próximo ciclo.</li>
            </ul>
            <p>Solicitações de reembolso devem ser feitas pelo e-mail: <strong>suporte@saudeagora24h.com.br</strong></p>
          </Section>

          <Section n="7" title="Responsabilidades do Usuário">
            <p>Ao utilizar o Saúde Agora 24h, você se compromete a:</p>
            <ul style={ulStyle}>
              <li>Fornecer dados cadastrais verdadeiros, completos e atualizados</li>
              <li>Não compartilhar suas credenciais de acesso com terceiros não autorizados</li>
              <li>Utilizar o serviço apenas para fins legítimos de saúde</li>
              <li>Não praticar fraudes, como uso indevido de planos familiares por pessoas não cadastradas</li>
              <li>Comunicar qualquer uso não autorizado da sua conta imediatamente</li>
            </ul>
            <p>O uso indevido pode resultar em suspensão ou cancelamento imediato da conta, <strong>sem direito a reembolso</strong>, além de aplicação da multa prevista no item 5.2.</p>
          </Section>

          <Section n="8" title="Limitação de Responsabilidade">
            <p>O Saúde Agora 24h atua como intermediário tecnológico e não se responsabiliza por:</p>
            <ul style={ulStyle}>
              <li>Diagnósticos, prescrições ou orientações fornecidas pelos médicos parceiros</li>
              <li>Resultados de tratamentos indicados nas consultas</li>
              <li>Indisponibilidade temporária da plataforma Meditele por motivos alheios ao nosso controle</li>
              <li>Danos decorrentes do uso indevido das credenciais pelo próprio usuário</li>
            </ul>
            <p>A responsabilidade médica pelo atendimento é integralmente dos profissionais de saúde que realizam as consultas, nos termos do Código de Ética Médica.</p>
          </Section>

          <Section n="9" title="Propriedade Intelectual">
            <p>Todo o conteúdo da plataforma Saúde Agora 24h — incluindo marca, logotipo, layout, textos e funcionalidades — é de propriedade exclusiva do Saúde Agora 24h, protegido pela Lei nº 9.610/1998 e pela Lei nº 9.279/1996.</p>
            <p>É vedada a reprodução, cópia ou uso comercial de qualquer conteúdo sem autorização prévia e expressa.</p>
          </Section>

          <Section n="10" title="Alterações nestes Termos">
            <p>Podemos atualizar estes Termos periodicamente. Alterações relevantes serão comunicadas por WhatsApp ou e-mail com pelo menos <strong>15 dias de antecedência</strong>. O uso continuado do serviço após esse prazo implica aceitação dos novos termos.</p>
          </Section>

          <Section n="11" title="Foro e Legislação Aplicável">
            <p>Estes Termos são regidos pelas leis brasileiras. Para resolução de controvérsias, fica eleito o foro da comarca de <strong>Araripina, Pernambuco</strong>, com renúncia a qualquer outro, por mais privilegiado que seja.</p>
          </Section>

          <Section n="12" title="Contato e Suporte">
            <ul style={ulStyle}>
              <li><strong>E-mail:</strong> suporte@saudeagora24h.com.br</li>
              <li><strong>WhatsApp:</strong> disponível no painel do assinante após ativação</li>
              <li><strong>Site:</strong> saudeagora24h.com.br</li>
            </ul>
          </Section>

        </div>

        {/* Footer nav */}
        <div style={{ marginTop: 48, paddingTop: 32, borderTop: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/privacidade" style={{ ...btnOutlineStyle }}>Ver Política de Privacidade</Link>
          <Link to="/" style={{ ...btnPrimaryStyle }}>← Voltar ao site</Link>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ background: '#0b1220', color: '#64748b', paddingBlock: '28px 20px', textAlign: 'center', fontSize: 13 }}>
        <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'center' }}>
          <img src="/logo.png" alt="Saúde Agora 24h" style={{ height: 28, filter: 'brightness(0) invert(1) opacity(0.5)' }} />
        </div>
        <p style={{ margin: '6px 0 2px' }}>© 2026 Saúde Agora 24h · Todos os direitos reservados.</p>
        <p style={{ margin: 0, fontSize: 11 }}>Em caso de emergência ligue 192 (SAMU).</p>
      </footer>
    </div>
  );
}

/* ── helpers ── */
const linkStyle: React.CSSProperties = { color: '#0369a1', fontWeight: 800 };
const ulStyle: React.CSSProperties = { paddingLeft: 20, margin: '8px 0', display: 'grid', gap: 6, fontSize: 14.5 };
const h3Style: React.CSSProperties = { fontSize: 15, fontWeight: 900, color: '#0c4a6e', margin: '20px 0 8px' };
const btnPrimaryStyle: React.CSSProperties = { background: '#0369a1', color: '#fff', padding: '10px 20px', borderRadius: 10, fontWeight: 800, fontSize: 14, textDecoration: 'none', display: 'inline-block' };
const btnOutlineStyle: React.CSSProperties = { border: '1.5px solid #bae6fd', color: '#0369a1', padding: '10px 20px', borderRadius: 10, fontWeight: 800, fontSize: 14, textDecoration: 'none', display: 'inline-block' };

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0c4a6e', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: '#f0f9ff', color: '#0369a1', fontSize: 13, fontWeight: 900, display: 'grid', placeItems: 'center', flexShrink: 0 }}>{n}</span>
        {title}
      </h2>
      <div style={{ display: 'grid', gap: 10, fontSize: 14.5, color: '#334155', lineHeight: 1.65 }}>
        {children}
      </div>
    </section>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff7ed', border: '1.5px solid #fdba74', borderRadius: 10, padding: '13px 16px', fontSize: 14, fontWeight: 700, color: '#7c2d12', lineHeight: 1.55, margin: '4px 0 16px' }}>
      ⚠️ {children}
    </div>
  );
}
