import { HeartPulse, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermosPage() {
  return (
    <>
      <header className="header">
        <div className="container header-content">
          <a href="/" className="logo">
            <img src="/logo.png" alt="Saúde Agora" style={{ height: '48px', width: 'auto' }} />
          </a>
          <Link to="/" className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ArrowLeft size={16} /> Voltar
          </Link>
        </div>
      </header>

      <main className="legal-page">
        <div className="container legal-container">
          <div className="legal-header">
            <h1>Termos de Serviço</h1>
            <p className="legal-updated">Última atualização: 29 de abril de 2026</p>
          </div>

          <div className="legal-content">

            <section className="legal-section">
              <h2>1. Aceitação dos Termos</h2>
              <p>
                Ao realizar o pré-cadastro ou assinar qualquer plano do <strong>Saúde Agora</strong>,
                você declara ter lido, compreendido e concordado integralmente com estes Termos de
                Serviço e com nossa{' '}
                <Link to="/privacidade" className="legal-link">Política de Privacidade</Link>.
              </p>
              <p>
                Se você não concordar com algum destes termos, não realize o cadastro ou cancele
                sua assinatura antes do próximo ciclo de cobrança.
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Descrição do serviço</h2>
              <p>
                O Saúde Agora é uma plataforma intermediária que conecta usuários a médicos e
                profissionais de saúde licenciados pelo CRM para realização de consultas online
                (telemedicina). As consultas ocorrem por meio da plataforma LSX Telemedicina,
                nossa parceira técnica.
              </p>
              <p>
                O Saúde Agora <strong>não é um plano de saúde</strong> nos termos da Lei nº 9.656/1998
                e não se caracteriza como seguro saúde. Trata-se de um serviço de acesso a
                consultas médicas por telemedicina, regulamentado pela Resolução CFM nº 2.314/2022.
              </p>
              <div className="legal-alert">
                ⚠️ <strong>Em caso de emergência médica, ligue imediatamente para o SAMU (192)
                ou dirija-se ao pronto-socorro mais próximo.</strong> A telemedicina não substitui
                atendimento de urgência presencial.
              </div>
            </section>

            <section className="legal-section">
              <h2>3. Planos e preços</h2>
              <p>Os planos disponíveis e seus respectivos preços são:</p>
              <ul>
                <li>
                  <strong>Individual — R$ 29,90/mês:</strong> acesso para 1 pessoa, consultas
                  ilimitadas com clínico geral e pediatria 24h, receitas e atestados válidos em
                  todo o Brasil, descontos em farmácias parceiras.
                </li>
                <li>
                  <strong>Familiar — R$ 59,90/mês:</strong> titular + 2 dependentes incluídos,
                  acesso à psicologia orientativa e mais de 25 especialidades por agendamento.
                  Dependente adicional: R$ 19,90/mês por pessoa.
                </li>
                <li>
                  <strong>Consulta Avulsa — R$ 49,90 por 30 dias:</strong> acesso sem renovação
                  automática, ideal para uso pontual.
                </li>
              </ul>
              <p>
                Os preços especiais de lançamento são garantidos aos primeiros 50 inscritos e
                mantidos enquanto a assinatura estiver ativa e sem interrupção. Após cancelamento,
                o reingresso ocorrerá pela tabela vigente na data da nova contratação.
              </p>
              <p>
                Reservamo-nos o direito de reajustar os preços mediante aviso prévio de 30 dias
                por WhatsApp ou e-mail.
              </p>
            </section>

            <section className="legal-section">
              <h2>4. Pré-cadastro e condições de lançamento</h2>
              <p>
                O pré-cadastro é gratuito e não gera qualquer cobrança. Ele garante sua posição
                na lista de lançamento e reserva o preço especial para quando a plataforma
                for oficialmente aberta.
              </p>
              <p>
                Ao ser lançada a plataforma, você receberá uma mensagem no WhatsApp informado no
                pré-cadastro com o link de acesso e as instruções de ativação. A cobrança do
                plano escolhido só ocorrerá após a sua confirmação de ativação.
              </p>
              <p>
                O número de vagas com preço especial é limitado a 50 pré-cadastros. O Saúde Agora
                não garante disponibilidade além desse limite.
              </p>
            </section>

            <section className="legal-section">
              <h2>5. Cancelamento</h2>
              <p>
                Você pode cancelar sua assinatura a qualquer momento, sem multa e sem fidelidade,
                diretamente pelo WhatsApp do suporte ou pelo painel do assinante.
              </p>
              <p>
                O cancelamento será efetivado ao final do período já pago. Você mantém acesso ao
                serviço até o último dia do ciclo vigente. Não há cobrança proporcional por dias
                não utilizados no mês corrente.
              </p>
              <p>
                Para a Consulta Avulsa (30 dias sem renovação automática), não há necessidade de
                cancelamento — o acesso encerra automaticamente ao término do período.
              </p>
            </section>

            <section className="legal-section">
              <h2>6. Reembolso</h2>
              <p>
                O Saúde Agora adota a seguinte política de reembolso:
              </p>
              <ul>
                <li>
                  <strong>Arrependimento (primeiros 7 dias):</strong> em conformidade com o
                  Código de Defesa do Consumidor (Art. 49, Lei nº 8.078/1990), o assinante
                  tem direito ao reembolso integral se solicitar o cancelamento em até 7 dias
                  corridos após a primeira ativação, desde que não tenha realizado consultas
                  no período.
                </li>
                <li>
                  <strong>Após 7 dias:</strong> não há reembolso proporcional por dias não
                  utilizados no ciclo vigente. O cancelamento apenas interrompe futuras cobranças.
                </li>
                <li>
                  <strong>Falha técnica da plataforma:</strong> caso o serviço fique indisponível
                  por período superior a 72 horas consecutivas por falha nossa, o período de
                  indisponibilidade será creditado no próximo ciclo.
                </li>
              </ul>
              <p>
                Solicitações de reembolso devem ser feitas pelo e-mail:{' '}
                <strong>suporte@saudeagora24h.com.br</strong>
              </p>
            </section>

            <section className="legal-section">
              <h2>7. Responsabilidades do usuário</h2>
              <p>Ao utilizar o Saúde Agora, você se compromete a:</p>
              <ul>
                <li>Fornecer dados cadastrais verdadeiros, completos e atualizados</li>
                <li>Não compartilhar suas credenciais de acesso com terceiros não autorizados</li>
                <li>Utilizar o serviço apenas para fins legítimos de saúde</li>
                <li>Não praticar fraudes, como uso indevido de planos familiares</li>
                <li>Comunicar qualquer uso não autorizado da sua conta imediatamente</li>
              </ul>
              <p>
                O uso indevido pode resultar em suspensão ou cancelamento imediato da conta,
                sem direito a reembolso.
              </p>
            </section>

            <section className="legal-section">
              <h2>8. Limitação de responsabilidade</h2>
              <p>
                O Saúde Agora atua como intermediário tecnológico e não se responsabiliza por:
              </p>
              <ul>
                <li>Diagnósticos, prescrições ou orientações fornecidas pelos médicos parceiros</li>
                <li>Resultados de tratamentos indicados nas consultas</li>
                <li>Indisponibilidade temporária da plataforma LSX por motivos alheios ao nosso controle</li>
                <li>Danos decorrentes do uso indevido das credenciais pelo próprio usuário</li>
              </ul>
              <p>
                A responsabilidade médica pelo atendimento é integralmente dos profissionais de
                saúde que realizam as consultas, nos termos do Código de Ética Médica e da
                legislação vigente.
              </p>
            </section>

            <section className="legal-section">
              <h2>9. Propriedade intelectual</h2>
              <p>
                Todo o conteúdo da plataforma Saúde Agora — incluindo marca, logotipo, layout,
                textos e funcionalidades — é de propriedade exclusiva do Saúde Agora e protegido
                pela Lei nº 9.610/1998 (Lei de Direitos Autorais) e pela Lei nº 9.279/1996
                (Lei de Propriedade Industrial).
              </p>
              <p>
                É vedada a reprodução, cópia ou uso comercial de qualquer conteúdo sem autorização
                prévia e expressa.
              </p>
            </section>

            <section className="legal-section">
              <h2>10. Alterações nos Termos</h2>
              <p>
                Podemos atualizar estes Termos periodicamente. Alterações relevantes serão
                comunicadas por WhatsApp ou e-mail com pelo menos 15 dias de antecedência.
                O uso continuado do serviço após esse prazo implica aceitação dos novos termos.
              </p>
            </section>

            <section className="legal-section">
              <h2>11. Foro e legislação aplicável</h2>
              <p>
                Estes Termos são regidos pelas leis brasileiras. Para resolução de controvérsias,
                fica eleito o foro da comarca de <strong>Araripina, Pernambuco</strong>, com
                renúncia a qualquer outro, por mais privilegiado que seja.
              </p>
            </section>

            <section className="legal-section">
              <h2>12. Contato e suporte</h2>
              <ul>
                <li><strong>E-mail:</strong> suporte@saudeagora24h.com.br</li>
                <li><strong>WhatsApp:</strong> disponível no painel do assinante após ativação</li>
                <li><strong>Site:</strong> saudeagora24h.com.br</li>
              </ul>
            </section>

          </div>

          <div className="legal-footer-nav">
            <Link to="/privacidade" className="btn btn-outline">Ver Política de Privacidade</Link>
            <Link to="/" className="btn btn-primary">Voltar ao site</Link>
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-logo">
            <HeartPulse size={24} />
            Saúde Agora
          </div>
          <p>© 2026 Saúde Agora. Todos os direitos reservados.</p>
          <p className="footer-disclaimer">
            O Saúde Agora conecta pacientes a profissionais de saúde licenciados.
            Não substitui emergências — em caso de emergência ligue 192 (SAMU).
          </p>
        </div>
      </footer>
    </>
  );
}
