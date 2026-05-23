import { HeartPulse, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacidadePage() {
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
            <h1>Política de Privacidade</h1>
            <p className="legal-updated">Última atualização: 29 de abril de 2026</p>
          </div>

          <div className="legal-content">

            <section className="legal-section">
              <h2>1. Quem somos</h2>
              <p>
                O <strong>Saúde Agora</strong> é uma plataforma de telemedicina que conecta pacientes
                a médicos licenciados para consultas online. Este documento descreve como coletamos,
                usamos e protegemos os seus dados pessoais, em conformidade com a{' '}
                <strong>Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018)</strong>.
              </p>
              <p>
                Para dúvidas sobre esta Política, entre em contato pelo e-mail:{' '}
                <strong>privacidade@saudeagora24h.com.br</strong>
              </p>
            </section>

            <section className="legal-section">
              <h2>2. Quais dados coletamos</h2>
              <p>Coletamos os seguintes dados pessoais durante o uso da plataforma:</p>
              <ul>
                <li><strong>Nome completo</strong> — para identificação do titular e dos dependentes</li>
                <li><strong>Número de WhatsApp</strong> — para comunicação sobre o serviço e envio do link de acesso</li>
                <li><strong>E-mail</strong> — para autenticação e comunicações administrativas</li>
                <li><strong>CPF</strong> — para verificação de identidade e emissão de documentos médicos válidos</li>
                <li><strong>Plano contratado</strong> — para controle de assinatura e acesso às funcionalidades</li>
                <li><strong>Dados de acesso</strong> — logs de acesso à plataforma, para segurança e auditoria</li>
              </ul>
              <p>
                Não coletamos dados de saúde sensíveis (diagnósticos, histórico clínico) diretamente em
                nosso sistema — esses dados são tratados exclusivamente pela plataforma médica parceira
                (LSX Telemedicina), sujeita às suas próprias políticas de privacidade.
              </p>
            </section>

            <section className="legal-section">
              <h2>3. Como usamos seus dados</h2>
              <p>Seus dados são utilizados para as seguintes finalidades:</p>
              <ul>
                <li>Criar e gerenciar sua conta de assinante</li>
                <li>Ativar e controlar seu plano de telemedicina</li>
                <li>Enviar o link de acesso à plataforma médica via WhatsApp</li>
                <li>Comunicar novidades, atualizações e renovações do serviço</li>
                <li>Emitir cobranças e controlar pagamentos</li>
                <li>Cumprir obrigações legais e regulatórias</li>
                <li>Garantir a segurança da plataforma e prevenir fraudes</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>4. Compartilhamento de dados com terceiros</h2>
              <p>
                Seus dados pessoais (nome, CPF, e-mail e telefone) são compartilhados com a{' '}
                <strong>LSX Telemedicina</strong>, nossa plataforma médica parceira, exclusivamente
                para a criação do seu perfil de paciente e viabilização das consultas online.
                A LSX opera como operadora de dados nos termos da LGPD.
              </p>
              <p>
                Não vendemos, alugamos nem compartilhamos seus dados com outros terceiros para fins
                comerciais sem o seu consentimento expresso.
              </p>
              <p>
                Podemos compartilhar dados quando exigido por lei, ordem judicial ou autoridade
                competente.
              </p>
            </section>

            <section className="legal-section">
              <h2>5. Base legal para o tratamento</h2>
              <p>O tratamento dos seus dados se fundamenta nas seguintes bases legais (LGPD, Art. 7º):</p>
              <ul>
                <li><strong>Consentimento</strong> — fornecido no momento do pré-cadastro ou assinatura</li>
                <li><strong>Execução de contrato</strong> — necessário para prestação do serviço contratado</li>
                <li><strong>Cumprimento de obrigação legal</strong> — para emissão de documentos médicos válidos</li>
                <li><strong>Legítimo interesse</strong> — para segurança da plataforma e prevenção a fraudes</li>
              </ul>
            </section>

            <section className="legal-section">
              <h2>6. Armazenamento e segurança</h2>
              <p>
                Seus dados são armazenados em servidores seguros localizados no Brasil, com acesso
                restrito a funcionários autorizados. Utilizamos criptografia de senhas (bcrypt) e
                conexões seguras (HTTPS) para proteger as informações em trânsito e em repouso.
              </p>
              <p>
                Mantemos seus dados pelo período necessário à execução do contrato e pelo prazo
                mínimo exigido por lei (geralmente 5 anos para fins fiscais e legais). Após esse
                período, os dados são anonimizados ou excluídos.
              </p>
            </section>

            <section className="legal-section">
              <h2>7. Seus direitos como titular (LGPD, Art. 18)</h2>
              <p>Você tem os seguintes direitos sobre seus dados pessoais:</p>
              <ul>
                <li><strong>Confirmação e acesso</strong> — saber quais dados temos sobre você</li>
                <li><strong>Correção</strong> — solicitar correção de dados incompletos, inexatos ou desatualizados</li>
                <li><strong>Anonimização ou eliminação</strong> — pedir a exclusão de dados desnecessários</li>
                <li><strong>Portabilidade</strong> — receber seus dados em formato estruturado</li>
                <li><strong>Revogação do consentimento</strong> — cancelar a qualquer momento, sem prejuízo do serviço já prestado</li>
                <li><strong>Oposição</strong> — se opor ao tratamento realizado em desconformidade com a LGPD</li>
              </ul>
              <p>
                Para exercer seus direitos, entre em contato pelo e-mail:{' '}
                <strong>privacidade@saudeagora24h.com.br</strong>. Responderemos em até 15 dias úteis.
              </p>
            </section>

            <section className="legal-section">
              <h2>8. Cookies e rastreamento</h2>
              <p>
                Nosso site pode utilizar cookies técnicos essenciais para o funcionamento da plataforma
                e cookies de análise (como Google Analytics ou Meta Pixel) para compreender o uso do
                serviço e mensurar campanhas de marketing.
              </p>
              <p>
                Ao utilizar nossa plataforma e consentir com esta Política, você também consente com
                o uso desses cookies. Você pode desativá-los nas configurações do seu navegador,
                mas isso pode afetar o funcionamento de algumas funcionalidades.
              </p>
              <p>
                <strong>Importante:</strong> Nosso pixel de rastreamento (Meta/Facebook) captura
                apenas eventos de navegação geral (visita à página, envio de formulário). Nenhum dado
                de saúde, condição médica ou especialidade escolhida é enviado a plataformas de anúncios.
              </p>
            </section>

            <section className="legal-section">
              <h2>9. Alterações nesta Política</h2>
              <p>
                Esta Política de Privacidade pode ser atualizada periodicamente. Notificaremos você
                sobre mudanças relevantes pelo WhatsApp ou e-mail cadastrado. A data da última
                atualização está sempre indicada no topo desta página.
              </p>
            </section>

            <section className="legal-section">
              <h2>10. Contato e Encarregado de Dados (DPO)</h2>
              <p>
                Para qualquer dúvida, solicitação ou reclamação relacionada aos seus dados pessoais:
              </p>
              <ul>
                <li><strong>E-mail:</strong> privacidade@saudeagora24h.com.br</li>
                <li><strong>Site:</strong> saudeagora24h.com.br</li>
              </ul>
              <p>
                Você também pode registrar reclamações perante a{' '}
                <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong> em{' '}
                <strong>gov.br/anpd</strong>.
              </p>
            </section>

          </div>

          <div className="legal-footer-nav">
            <Link to="/termos" className="btn btn-outline">Ver Termos de Serviço</Link>
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
