import { useState, useEffect } from 'react';
import { Sidebar, Topbar, PageHeader } from '../shell';
import { Ic } from '../icons';
import { adminApi, fmtBRL, type AdminPlan, type MeditelePlan } from '../api';

interface Props { onNav: (id: string) => void; }

const LP_BASE = 'https://saudeagora24h.com.br';

function CopyLinkBtn({ planId, planName }: { planId: string; planName: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${LP_BASE}/?planId=${planId}`;
  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      title={`Copiar link direto para "${planName}"`}
      style={{
        padding: '4px 10px', borderRadius: 7, border: '1px solid var(--border)',
        background: copied ? 'var(--green-50)' : '#fff',
        color: copied ? 'var(--green-700)' : 'var(--ink-2)',
        fontSize: 11, fontWeight: 700, cursor: 'pointer',
        fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4,
        transition: 'all 0.15s',
      }}>
      {copied ? '✓ Copiado!' : '🔗 Copiar link'}
    </button>
  );
}

const TYPE_OPTIONS = [
  { value: 'INDIVIDUAL', label: 'Individual' },
  { value: 'FAMILIAR',   label: 'Familiar'   },
  { value: 'AVULSO',     label: 'Avulso'     },
  { value: 'CORTESIA',   label: 'Cortesia'   },
];

export function ScreenPlanos({ onNav }: Props) {
  const [meditele, setMeditele] = useState<MeditelePlan[]>([]);
  const [local, setLocal]       = useState<AdminPlan[]>([]);
  const [loading, setLoading]   = useState(true);

  // modal state
  const [modal, setModal] = useState<{
    mode: 'create' | 'edit';
    mp: MeditelePlan;          // plano Meditele de origem
    plan?: AdminPlan;          // plano local existente (edit mode)
  } | null>(null);

  const load = () => {
    setLoading(true);
    Promise.all([adminApi.getMeditelePlans(), adminApi.getPlans()])
      .then(([m, p]) => { setMeditele(m); setLocal(p); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Para cada plano Meditele, acha o local vinculado (se houver)
  const linked = (mp: MeditelePlan) => local.find(p => p.mediteleId === mp.id);

  const totalMRR = local
    .filter(p => p.active && p.price > 0)
    .reduce((s, p) => s + p.price * p.activeSubscriptions, 0);

  const configured = meditele.filter(mp => linked(mp)).length;

  return (
    <div className="sa-shell">
      <Sidebar active="planos" onNav={onNav} />
      <main className="sa-main">
        <Topbar breadcrumb={['Gestão', 'Planos']} />
        <div className="sa-content">
          <PageHeader
            title="Planos"
            subtitle="Planos importados da Meditele. Configure o preço de venda de cada um na sua plataforma."
          />

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            <KpiChip label="Planos na Meditele"  value={loading ? '…' : String(meditele.length)}  color="var(--sky-500)" />
            <KpiChip label="Configurados aqui"   value={loading ? '…' : String(configured)}       color="var(--green-500)" />
            <KpiChip label="Aguardando config."  value={loading ? '…' : String(meditele.length - configured)} color={meditele.length - configured > 0 ? 'var(--amber-500)' : 'var(--green-500)'} />
            <KpiChip label="MRR estimado"        value={loading ? '…' : fmtBRL(totalMRR)}          color="var(--accent)" />
          </div>

          {/* Lista de planos */}
          {loading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontWeight: 700 }}>Carregando planos da Meditele…</div>
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {meditele.map(mp => {
                const lp = linked(mp);
                return (
                  <PlanRow
                    key={mp.id}
                    mp={mp}
                    lp={lp}
                    onConfigure={() => setModal({ mode: lp ? 'edit' : 'create', mp, plan: lp })}
                  />
                );
              })}
              {meditele.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontWeight: 600, fontSize: 13 }}>
                  Nenhum plano encontrado na Meditele.
                </div>
              )}
            </div>
          )}

          {/* Legenda */}
          <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 10, fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, lineHeight: 1.8 }}>
            <strong style={{ color: 'var(--ink-2)' }}>Fluxo de configuração:</strong>{' '}
            Os planos vêm da Meditele (portal deles). Você define o preço de venda aqui na sua plataforma.
            Os planos da Meditele devem estar com <strong>mensalidade R$ 0,00</strong> no portal deles — você é quem faz a cobrança.
          </div>
        </div>
      </main>

      {modal && (
        <ConfigModal
          mode={modal.mode}
          mp={modal.mp}
          plan={modal.plan}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}

/* ── Linha de plano ── */
function PlanRow({ mp, lp, onConfigure }: {
  mp: MeditelePlan;
  lp?: AdminPlan;
  onConfigure: () => void;
}) {
  const meditelePrice = parseFloat(mp.monthlyPrice);
  const isOkMeditele  = mp.isFree || meditelePrice === 0;

  return (
    <div className="card" style={{ padding: '18px 22px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>

        {/* Coluna esquerda: info Meditele */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 900 }}>{mp.label}</span>
            {isOkMeditele
              ? <span className="pill success" style={{ fontSize: 10 }}>Meditele: Gratuito ✓</span>
              : <span className="pill danger"  style={{ fontSize: 10 }}>Meditele: R$ {meditelePrice.toFixed(2).replace('.', ',')} ⚠</span>
            }
            {mp.maxDependents > 0 && (
              <span className="pill info" style={{ fontSize: 10 }}>+{mp.maxDependents} dependente(s)</span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginBottom: 10 }}>
            {mp.description}
          </div>

          {/* Divisor */}
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 10 }} />

          {/* Lado Saúde Agora */}
          {lp ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 3, height: 36, background: 'var(--accent)', borderRadius: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Saúde Agora — Preço de venda</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
                  <span style={{ fontSize: 22, fontWeight: 900, color: lp.price === 0 ? 'var(--green-600)' : 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
                    {lp.price === 0 ? 'Grátis' : fmtBRL(lp.price)}
                  </span>
                  {lp.price > 0 && <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>/mês</span>}
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginLeft: 4 }}>·</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-2)', fontWeight: 700 }}>{lp.activeSubscriptions} assinantes ativos</span>
                  {lp.price > 0 && lp.activeSubscriptions > 0 && (
                    <>
                      <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>·</span>
                      <span style={{ fontSize: 12, color: 'var(--green-700)', fontWeight: 800 }}>MRR {fmtBRL(lp.price * lp.activeSubscriptions)}</span>
                    </>
                  )}
                  {!lp.active && <span className="pill muted" style={{ fontSize: 10 }}>Inativo</span>}
                </div>
                {lp.description && <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}>{lp.description}</div>}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 3, height: 28, background: 'var(--border)', borderRadius: 2, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--amber-600)' }}>
                ⚠ Preço de venda não configurado — este plano não está disponível para vendas
              </span>
            </div>
          )}
        </div>

        {/* Botão configurar + copiar link */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, paddingTop: 2 }}>
          {mp.checkoutUrl && (
            <a href={mp.checkoutUrl} target="_blank" rel="noreferrer"
              style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 700, textDecoration: 'none' }}>
              Link ativação ↗
            </a>
          )}
          {lp?.active && (
            <CopyLinkBtn planId={lp.id} planName={lp.name} />
          )}
          <button
            className={`btn ${lp ? 'btn-secondary' : 'btn-primary'}`}
            onClick={onConfigure}
          >
            {lp ? <><Ic.edit />Editar preço</> : <><Ic.plus />Configurar preço</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Modal configuração/edição ── */
function ConfigModal({ mode, mp, plan, onClose, onSaved }: {
  mode: 'create' | 'edit';
  mp: MeditelePlan;
  plan?: AdminPlan;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name,          setName]          = useState(plan?.name          ?? mp.label);
  const [price,         setPrice]         = useState(plan != null ? String(plan.price).replace('.', ',') : '');
  const [description,   setDescription]   = useState(plan?.description   ?? mp.description ?? '');
  const [type,          setType]          = useState(plan?.type          ?? (mp.isFree ? 'CORTESIA' : 'INDIVIDUAL'));
  const [active,        setActive]        = useState(plan?.active        ?? true);
  // LP fields
  const [showOnLp,      setShowOnLp]      = useState(plan?.showOnLp      ?? false);
  const [featured,      setFeatured]      = useState(plan?.featured      ?? false);
  const [originalPrice, setOriginalPrice] = useState(
    plan?.originalPrice != null ? String(plan.originalPrice).replace('.', ',') : ''
  );
  const [features,      setFeatures]      = useState(
    plan?.features ? JSON.parse(plan.features).join('\n') : ''
  );
  const [ctaLabel,      setCtaLabel]      = useState(plan?.ctaLabel      ?? `Quero o ${mp.label.split(' ')[0]}`);
  const [periodLabel,   setPeriodLabel]   = useState(plan?.periodLabel   ?? '/mês');

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const save = async () => {
    const priceNum = parseFloat(price.replace(',', '.'));
    if (isNaN(priceNum) || priceNum < 0) { setError('Informe um preço válido (ex: 29,90).'); return; }
    const origNum = originalPrice ? parseFloat(originalPrice.replace(',', '.')) : null;
    const featuresJson = features.trim()
      ? JSON.stringify(features.split('\n').map((s: string) => s.trim()).filter(Boolean))
      : '[]';

    setSaving(true); setError('');
    try {
      if (mode === 'create') {
        await adminApi.createPlan({ name, price: priceNum, type, description, mediteleId: mp.id });
        // after create, update with LP fields using the new plan id — handled by reload
      } else {
        await adminApi.updatePlan(plan!.id, {
          name, price: priceNum, type, description, active,
          showOnLp, featured,
          originalPrice: origNum,
          features: featuresJson,
          ctaLabel, periodLabel,
        });
      }
      onSaved();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const meditelePrice = parseFloat(mp.monthlyPrice);

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}
      onClick={e => { if (e.target === e.currentTarget && !saving) onClose(); }}
    >
      <div style={{ background: 'var(--surface)', borderRadius: 14, width: '100%', maxWidth: 540, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', overflow: 'hidden', margin: 'auto' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>
              {mode === 'create' ? 'Configurar plano' : 'Editar plano'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 3 }}>
              Meditele: <strong>{mp.label}</strong> ·{' '}
              {mp.isFree || meditelePrice === 0
                ? <span style={{ color: 'var(--green-600)' }}>Gratuito lá ✓</span>
                : <span style={{ color: 'var(--red-500)' }}>R$ {meditelePrice.toFixed(2).replace('.', ',')} lá ⚠</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}><Ic.x /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'grid', gap: 16 }}>

          {meditelePrice > 0 && !mp.isFree && (
            <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#92400e' }}>
              ⚠ R$ {meditelePrice.toFixed(2).replace('.', ',')} no portal Meditele. Ajuste para R$ 0,00 lá para evitar cobrança dupla.
            </div>
          )}

          {/* Básico */}
          <SectionTitle>Configuração geral</SectionTitle>
          <MField label="Nome do plano" value={name} onChange={setName} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <MField label="Preço de venda (R$) *" value={price} onChange={setPrice} placeholder="29,90" mono hint="O que você cobra" />
            <div>
              <label style={lbl}>Tipo</label>
              <select className="select" style={{ width: '100%' }} value={type} onChange={e => setType(e.target.value)}>
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <MField label="Descrição curta" value={description} onChange={setDescription} placeholder="Ex: Consultas ilimitadas para o titular" />

          {mode === 'edit' && (
            <div>
              <label style={lbl}>Status para vendas</label>
              <select className="select" style={{ width: '100%' }} value={active ? 'true' : 'false'} onChange={e => setActive(e.target.value === 'true')}>
                <option value="true">✓ Ativo</option>
                <option value="false">✗ Inativo</option>
              </select>
            </div>
          )}

          {/* Landing Page */}
          {mode === 'edit' && (
            <>
              <div style={{ height: 1, background: 'var(--border)' }} />
              <SectionTitle>Landing page</SectionTitle>

              {/* Checkboxes */}
              <div style={{ display: 'grid', gap: 10 }}>
                <CheckRow
                  checked={showOnLp}
                  onChange={setShowOnLp}
                  label="Exibir na landing page"
                  hint="O plano aparece na seção de planos do site"
                />
                <CheckRow
                  checked={featured}
                  onChange={setFeatured}
                  label='Tag "Mais escolhido"'
                  hint="Destaca este plano com borda verde e badge"
                  disabled={!showOnLp}
                />
              </div>

              {showOnLp && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <MField label='Preço "Normal" riscado (opcional)' value={originalPrice} onChange={setOriginalPrice} placeholder="Ex: 39,90" mono hint='Aparece como "Normal R$X" riscado' />
                    <MField label='Rótulo do período' value={periodLabel} onChange={setPeriodLabel} placeholder="/mês ou 30 dias" hint='Ex: "/mês" ou "30 dias"' />
                  </div>
                  <MField label="Texto do botão CTA" value={ctaLabel} onChange={setCtaLabel} placeholder="Ex: Quero o Individual" />
                  <div>
                    <label style={lbl}>Benefícios (um por linha)</label>
                    <textarea
                      className="input"
                      rows={4}
                      style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
                      value={features}
                      onChange={e => setFeatures(e.target.value)}
                      placeholder={'Clínico 24h ilimitado\n1 especialista por mês\nAtestado médico'}
                    />
                    <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, marginTop: 4 }}>Cada linha vira um item com ✓ na LP</div>
                  </div>
                </>
              )}
            </>
          )}

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#dc2626' }}>{error}</div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Salvando…' : mode === 'create' ? <><Ic.plus />Confirmar</> : '✓ Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckRow({ checked, onChange, label, hint, disabled }: {
  checked: boolean; onChange: (v: boolean) => void;
  label: string; hint?: string; disabled?: boolean;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1 }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => !disabled && onChange(e.target.checked)}
        style={{ marginTop: 2, width: 16, height: 16, cursor: disabled ? 'default' : 'pointer', accentColor: 'var(--accent)' }}
      />
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{label}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, marginTop: 1 }}>{hint}</div>}
      </div>
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, fontWeight: 900, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{children}</div>;
}

/* ── helpers ── */

const lbl: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: 'var(--ink-3)',
  textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6,
};

function MField({ label, value, onChange, placeholder, mono, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; mono?: boolean; hint?: string;
}) {
  return (
    <div>
      <label style={lbl}>{label}</label>
      <input
        className="input"
        style={{ width: '100%', fontFamily: mono ? 'var(--mono)' : 'inherit' }}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {hint && <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function KpiChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card flat" style={{ padding: '14px 16px' }}>
      <div style={{ fontSize: 22, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-3)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  );
}
