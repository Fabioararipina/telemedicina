import { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const BASE = 'https://saudeagora24h.com.br/api-backend';

interface Props {
  employeeName: string;
  token: string;
  onAccepted: () => void;
}

export function TermoFreelancer({ employeeName, token, onAccepted }: Props) {
  const [scrolled,  setScrolled]  = useState(false);
  const [checked,   setChecked]   = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error,     setError]     = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);

  const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const onScroll = () => {
      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
      if (atBottom) setScrolled(true);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const handleAccept = async () => {
    if (!checked || !scrolled) return;
    setAccepting(true); setError('');
    try {
      await axios.post(`${BASE}/api/auth/employee/accept-terms`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onAccepted();
    } catch {
      setError('Erro ao registrar aceite. Tente novamente.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0f172a',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', zIndex: 9999, padding: 24,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 700,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
      }}>

        {/* Header */}
        <div style={{
          padding: '22px 28px 16px', borderBottom: '1px solid #e2e8f0',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b',
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            Saúde Agora 24h · Antes de continuar
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a' }}>
            Contrato de Prestação de Serviços Autônoma
          </div>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 600, marginTop: 4 }}>
            Leia o contrato na íntegra antes de aceitar. Role até o final para habilitar a confirmação.
          </div>
        </div>

        {/* Corpo do termo */}
        <div ref={bodyRef} style={{
          flex: 1, overflowY: 'auto', padding: '24px 28px',
          fontSize: 13.5, lineHeight: 1.9, color: '#1e293b',
        }}>

          <p style={ps}>
            Pelo presente instrumento particular, de um lado, a empresa <strong>Saúde Agora 24h</strong>,
            doravante denominada <strong>CONTRATANTE</strong>, e de outro lado, o(a) Sr(a).{' '}
            <strong>{employeeName}</strong>, doravante denominado(a) <strong>CONTRATADO(A)</strong>,
            têm entre si justo e acordado o seguinte:
          </p>

          <H>Cláusula 1ª — Do Objeto</H>
          <p style={ps}>
            1.1. O presente contrato tem por objeto a prestação de serviços autônomos de <strong>prospecção,
            abordagem e fechamento de vendas</strong> dos planos de telemedicina comercializados pela
            CONTRATANTE, sem exclusividade de território ou horário.
          </p>
          <p style={ps}>
            1.2. A execução dos serviços se dará de forma independente, sem subordinação hierárquica,
            podendo o CONTRATADO(A) definir livremente seus horários, métodos de abordagem e canais
            de captação, desde que respeitadas as diretrizes éticas e comerciais da CONTRATANTE.
          </p>

          <H>Cláusula 2ª — Da Natureza da Relação — Ausência de Vínculo Empregatício</H>
          <p style={ps}>
            2.1. <strong>Fica expressamente estabelecido que a presente relação jurídica é de natureza
            civil, de prestação de serviços autônoma</strong>, regida pelo artigo 593 e seguintes do
            Código Civil Brasileiro (Lei nº 10.406/2002), não gerando, em hipótese alguma, vínculo
            empregatício entre as partes.
          </p>
          <p style={ps}>
            2.2. Não se configura, em nenhuma hipótese, relação de emprego nos termos da Consolidação
            das Leis do Trabalho — CLT (Decreto-Lei nº 5.452/1943), sendo afastados expressamente:
          </p>
          <ul style={ul}>
            <li>Pagamento de salário mínimo garantido, 13º salário ou qualquer remuneração fixa;</li>
            <li>Recolhimento de FGTS pela CONTRATANTE;</li>
            <li>Direito a férias remuneradas, aviso prévio ou verbas rescisórias de qualquer natureza;</li>
            <li>Subordinação hierárquica direta, controle de jornada ou horário fixo;</li>
            <li>Fornecimento obrigatório de equipamentos, ferramentas ou local de trabalho;</li>
            <li>Inclusão em quadro de funcionários ou emissão de carteira assinada.</li>
          </ul>
          <p style={ps}>
            2.3. O CONTRATADO(A) declara expressamente ciência de que <strong>não é empregado(a) da
            CONTRATANTE</strong> e que qualquer tentativa futura de reconhecimento de vínculo empregatício
            perante a Justiça do Trabalho implicará em responsabilidade por perdas e danos, incluindo
            honorários advocatícios e custas processuais incorridas pela CONTRATANTE em sua defesa.
          </p>
          <p style={ps}>
            2.4. O CONTRATADO(A) é responsável pelo recolhimento de todos os tributos incidentes sobre
            os valores recebidos, incluindo contribuição previdenciária (INSS como autônomo), imposto
            de renda (IRPF) e quaisquer outros encargos devidos, isentando a CONTRATANTE de qualquer
            obrigação fiscal decorrente desta relação.
          </p>

          <H>Cláusula 3ª — Da Remuneração — Exclusivamente por Resultado</H>
          <p style={ps}>
            3.1. A remuneração do CONTRATADO(A) será composta <strong>exclusivamente por comissões
            calculadas sobre os resultados efetivos de vendas</strong> que realizar, conforme tabela
            de comissionamento vigente divulgada pela CONTRATANTE.
          </p>
          <p style={ps}>
            3.2. <strong>Não há qualquer garantia de renda mínima, salário base, adiantamento,
            ajuda de custo, vale-transporte, vale-refeição ou qualquer benefício de natureza
            trabalhista.</strong> O CONTRATADO(A) receberá exclusivamente comissão pelas vendas
            concretizadas e confirmadas (pagamento efetivo pelo cliente).
          </p>
          <p style={ps}>
            3.3. Vendas canceladas, estornadas, inadimplentes ou com pagamento não confirmado não
            gerarão direito à comissão. Caso comissão já paga seja revertida por cancelamento
            posterior do cliente dentro do período de garantia, o valor poderá ser deduzido de
            comissões futuras.
          </p>
          <p style={ps}>
            3.4. A CONTRATANTE reserva-se o direito de alterar as condições e percentuais de
            comissionamento mediante comunicação prévia de <strong>30 (trinta) dias</strong> ao
            CONTRATADO(A), não sendo tal alteração motivo para rescisão indenizável.
          </p>

          <H>Cláusula 4ª — Das Responsabilidades e Exclusão de Responsabilidade por Perdas e Danos</H>
          <p style={ps}>
            4.1. O CONTRATADO(A) é o único responsável pelas despesas e riscos inerentes à sua
            atividade, incluindo custos com telefone, internet, transporte, marketing pessoal e
            demais custos operacionais necessários à prestação dos serviços.
          </p>
          <p style={ps}>
            4.2. <strong>A CONTRATANTE não se responsabiliza por quaisquer perdas financeiras,
            frustração de expectativas de ganho, variação de demanda de mercado, sazonalidade
            de vendas ou queda de resultado do CONTRATADO(A)</strong>, sendo tais riscos inerentes
            à atividade autônoma por ele(a) exercida.
          </p>
          <p style={ps}>
            4.3. O CONTRATADO(A) não poderá, em hipótese alguma, firmar contratos, assumir
            obrigações financeiras, emitir notas fiscais, receber valores de clientes em nome
            próprio em substituição à CONTRATANTE, ou praticar qualquer ato que represente a
            empresa sem autorização expressa e por escrito.
          </p>
          <p style={ps}>
            4.4. Eventuais reclamações de clientes decorrentes de informações inverídicas ou
            promessas não autorizadas prestadas pelo CONTRATADO(A) serão de sua exclusiva
            responsabilidade, podendo a CONTRATANTE regressar contra ele(a) pelos danos causados.
          </p>

          <H>Cláusula 5ª — Da Confidencialidade</H>
          <p style={ps}>
            5.1. O CONTRATADO(A) compromete-se a manter em estrito sigilo todas as informações
            comerciais, financeiras, estratégicas e de clientes às quais tiver acesso em razão
            desta contratação, durante a vigência do contrato e por <strong>5 (cinco) anos</strong>{' '}
            após seu término.
          </p>
          <p style={ps}>
            5.2. É vedado o compartilhamento de listas de clientes, estratégias de precificação,
            sistemas internos ou qualquer dado protegido pela Lei Geral de Proteção de Dados
            (LGPD — Lei nº 13.709/2018) com terceiros ou concorrentes, sob pena de rescisão
            imediata e responsabilização por perdas e danos.
          </p>
          <p style={ps}>
            5.3. O acesso ao painel de vendas e às ferramentas digitais da CONTRATANTE é pessoal
            e intransferível. O CONTRATADO(A) é responsável por qualquer uso indevido realizado
            com suas credenciais.
          </p>

          <H>Cláusula 6ª — Da Vigência e Rescisão</H>
          <p style={ps}>
            6.1. O presente contrato é celebrado por prazo <strong>indeterminado</strong>, podendo
            ser rescindido por qualquer das partes a qualquer momento, sem necessidade de aviso
            prévio e sem ônus financeiro para nenhuma das partes, ressalvadas as comissões devidas
            por vendas já concretizadas.
          </p>
          <p style={ps}>
            6.2. A rescisão poderá ser imediata, pela CONTRATANTE, sem necessidade de notificação,
            nos seguintes casos: descumprimento das cláusulas deste contrato; conduta antiética;
            uso indevido de informações confidenciais; prática de atos que causem dano à imagem
            da CONTRATANTE; ou inatividade superior a <strong>15 (quinze) dias corridos</strong>{' '}
            sem nenhuma venda registrada.
          </p>

          <H>Cláusula 7ª — Da Aceitação Eletrônica e Validade Jurídica</H>
          <p style={ps}>
            7.1. O aceite eletrônico deste contrato, realizado pelo CONTRATADO(A) mediante marcação
            de confirmação no sistema digital da CONTRATANTE, tem plena validade jurídica nos termos
            da <strong>Medida Provisória nº 2.200-2/2001</strong> e da{' '}
            <strong>Lei nº 14.063/2020</strong>, equiparando-se à assinatura física para todos os
            fins de direito.
          </p>
          <p style={ps}>
            7.2. O sistema registrará automaticamente a data, horário e endereço IP do aceite,
            constituindo prova eletrônica irrefutável do consentimento do CONTRATADO(A) com
            todos os termos aqui estabelecidos.
          </p>
          <p style={ps}>
            7.3. O CONTRATADO(A) declara que leu, compreendeu e concorda integralmente com todas
            as cláusulas deste instrumento, sem qualquer coação, dolo ou vício de consentimento.
          </p>

          <H>Cláusula 8ª — Do Foro</H>
          <p style={ps}>
            8.1. Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes
            elegem o foro da comarca de <strong>Araripina — PE</strong>, com renúncia expressa
            a qualquer outro, por mais privilegiado que seja.
          </p>

          <p style={{ ...ps, marginTop: 28, color: '#64748b', fontSize: 12.5 }}>
            Aceite registrado eletronicamente em {today} · Saúde Agora 24h
          </p>
        </div>

        {/* Footer fixo */}
        <div style={{
          padding: '16px 28px 22px', borderTop: '1px solid #e2e8f0',
          flexShrink: 0, background: '#f8fafc', borderRadius: '0 0 20px 20px',
        }}>
          {!scrolled && (
            <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 700,
              textAlign: 'center', marginBottom: 12 }}>
              ↓ Role até o final do contrato para habilitar o aceite
            </div>
          )}

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 12,
            cursor: scrolled ? 'pointer' : 'default', marginBottom: 14, opacity: scrolled ? 1 : 0.4 }}>
            <input
              type="checkbox"
              checked={checked}
              disabled={!scrolled}
              onChange={e => setChecked(e.target.checked)}
              style={{ marginTop: 2, width: 16, height: 16, flexShrink: 0, cursor: 'pointer', accentColor: '#1d4ed8' }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#334155', lineHeight: 1.5 }}>
              Li e concordo integralmente com todas as cláusulas do Contrato de Prestação de Serviços
              Autônoma. Declaro ciência de que <strong>não há vínculo empregatício</strong> e que minha
              remuneração é <strong>exclusivamente por resultado de vendas</strong>.
            </span>
          </label>

          {error && (
            <div style={{ padding: '8px 12px', borderRadius: 8, background: '#fef2f2',
              border: '1px solid #fecaca', fontSize: 12, color: '#dc2626', fontWeight: 700, marginBottom: 10 }}>
              {error}
            </div>
          )}

          <button
            onClick={handleAccept}
            disabled={!scrolled || !checked || accepting}
            style={{
              width: '100%', padding: '14px', borderRadius: 10, border: 0,
              background: (scrolled && checked && !accepting) ? '#1d4ed8' : '#cbd5e1',
              color: '#fff', fontSize: 14, fontWeight: 900,
              cursor: (scrolled && checked && !accepting) ? 'pointer' : 'default',
              fontFamily: 'inherit', transition: 'background 0.2s',
            }}>
            {accepting ? 'Registrando aceite…' : '✓ Aceitar e entrar no painel de vendas'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers de estilo ── */
const ps: React.CSSProperties = { margin: '0 0 12px', textAlign: 'justify' };
const ul: React.CSSProperties = { margin: '0 0 12px', paddingLeft: 24 };

function H({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: '22px 0 8px', fontWeight: 900, fontSize: 14, color: '#0f172a',
      borderLeft: '3px solid #1d4ed8', paddingLeft: 10 }}>
      {children}
    </p>
  );
}
