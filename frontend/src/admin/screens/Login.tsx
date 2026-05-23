import { Ic } from '../icons';
import logoUrl from '../../assets/logo.jpeg';

interface Props { onNav: (id: string) => void; }

export function ScreenLogin({ onNav }: Props) {
  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', background: 'var(--surface)' }}>
      {/* Left: brand */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(160deg, var(--sky-900) 0%, var(--sky-700) 55%, var(--green-700) 100%)',
        color: '#fff',
        padding: 48,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        overflow: 'hidden',
      }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, opacity: 0.18, background: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.6), transparent 40%), radial-gradient(circle at 90% 10%, rgba(16,185,129,0.6), transparent 35%)' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={logoUrl} alt="" style={{ width: 48, height: 48, borderRadius: 10, background: '#fff', padding: 3, objectFit: 'contain' }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>Saúde Agora 24h</div>
            <div style={{ fontSize: 11, opacity: 0.7, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700 }}>Painel de Gestão</div>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.8, marginBottom: 14 }}>Operação · Maio 2026</div>
          <h1 style={{ fontSize: 38, lineHeight: 1.1, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', maxWidth: '16ch' }}>
            Médico no celular do interior do Nordeste.
          </h1>
          <p style={{ fontSize: 15, marginTop: 14, opacity: 0.85, maxWidth: '38ch', lineHeight: 1.5 }}>
            Painel de gestão comercial e operacional. Acompanhe leads, assinantes, financeiro e indicadores em um só lugar.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 32, maxWidth: 440 }}>
            <BrandStat n="1.247" l="assinantes ativos" />
            <BrandStat n="R$ 41k" l="MRR atual" />
            <BrandStat n="24h" l="médico no app" />
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, fontSize: 11, opacity: 0.6, fontFamily: 'var(--mono)' }}>
          saudeagora24h.com.br · operado por Meditele · CFM 2.314/2022
        </div>
      </div>

      {/* Right: form */}
      <div style={{ padding: 48, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          <h2 style={{ fontSize: 26, marginBottom: 6 }}>Entrar no painel</h2>
          <p style={{ color: 'var(--ink-3)', fontSize: 14, fontWeight: 600, marginBottom: 28 }}>
            Acesso restrito à equipe Saúde Agora.
          </p>
          <div style={{ display: 'grid', gap: 14 }}>
            <label className="field">
              <span className="label">E-mail corporativo</span>
              <input className="input" placeholder="seu.nome@saudeagora24h.com.br" defaultValue="rafael.moura@saudeagora24h.com.br" />
            </label>
            <label className="field">
              <span className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Senha</span>
                <a style={{ color: 'var(--accent)', fontWeight: 700, cursor: 'pointer' }}>Esqueci minha senha</a>
              </span>
              <input className="input" type="password" placeholder="••••••••••" defaultValue="supersecret" />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)', fontWeight: 700, cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked /> Manter conectado neste computador
            </label>
            <button className="btn btn-primary btn-lg" style={{ marginTop: 6 }} onClick={() => onNav('dashboard')}>
              <Ic.lock />Entrar
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0', color: 'var(--ink-3)', fontSize: 11, fontWeight: 700 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              OU
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <button className="btn btn-secondary btn-lg">Entrar com link mágico (e-mail)</button>
          </div>
          <div style={{ marginTop: 32, padding: 14, background: 'var(--surface-2)', borderRadius: 10, fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, lineHeight: 1.55 }}>
            <strong style={{ color: 'var(--ink-2)' }}>🔒 Ambiente seguro.</strong> Todas as ações são auditadas. Acesso baseado em perfil (Admin · Líder · SDR · Financeiro).
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandStat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>{n}</div>
      <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 700, marginTop: 2, lineHeight: 1.3 }}>{l}</div>
    </div>
  );
}
