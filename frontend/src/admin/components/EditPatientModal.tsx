import { useState, useEffect } from 'react';
import { Ic } from '../icons';
import { adminApi, type ApiUser, userActiveSub } from '../api';

interface Props {
  user: ApiUser | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

type Tab = 'dados' | 'assinatura' | 'perigo';

const STATUS_OPTIONS = [
  { value: 'ACTIVE',    label: 'Ativo',      desc: 'Acesso liberado',              color: 'var(--green-600)' },
  { value: 'PENDING',   label: 'Pendente',   desc: 'Aguardando pagamento',         color: 'var(--amber-600)' },
  { value: 'SUSPENDED', label: 'Suspenso',   desc: 'Inadimplente — acesso bloqueado', color: 'var(--red-500)' },
  { value: 'CANCELLED', label: 'Cancelado',  desc: 'Cancela no Asaas também',      color: 'var(--slate-500)' },
];

const ASAAS_RESULT_MSG: Record<string, { label: string; tone: 'success' | 'warn' | 'error' }> = {
  cancelado_asaas:       { label: 'Assinatura cancelada no Asaas',  tone: 'success' },
  status_local_atualizado: { label: 'Atualizado localmente (Asaas não cancelado)', tone: 'warn' },
  sem_assinatura_asaas:  { label: 'Sem ID Asaas — só local',        tone: 'warn' },
  erro_asaas:            { label: 'Erro ao sincronizar com Asaas',   tone: 'error' },
};

export function EditPatientModal({ user, open, onClose, onSaved }: Props) {
  const [tab, setTab] = useState<Tab>('dados');

  // Dados pessoais
  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [dadosMsg, setDadosMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Assinatura
  const [newStatus, setNewStatus] = useState<string>('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'warn' | 'error'; text: string; sub?: string } | null>(null);

  // Exclusão
  const [deletePhase, setDeletePhase] = useState<'idle' | 'confirm' | 'deleting' | 'done'>('idle');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const sub = user ? userActiveSub(user) : null;

  useEffect(() => {
    if (user && open) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone ?? '');
      setNewStatus(sub?.status ?? 'PENDING');
      setTab('dados');
      setDadosMsg(null);
      setStatusMsg(null);
      setDeletePhase('idle');
      setDeleteConfirm('');
      setDeleteError('');
    }
  }, [user, open]);

  if (!open || !user) return null;

  const close = () => { if (!saving && !statusSaving && deletePhase !== 'deleting') onClose(); };

  /* ── Salvar dados pessoais ── */
  const ASAAS_EDIT_MSG: Record<string, string> = {
    atualizado_asaas: '✓ Sincronizado com Asaas',
    sem_id_asaas:     '⚠ Sem ID Asaas — só atualizado localmente',
    erro_asaas:       '⚠ Erro ao sincronizar com Asaas (dados locais salvos)',
  };

  const handleSaveDados = async () => {
    if (!name.trim()) { setDadosMsg({ type: 'error', text: 'Nome não pode ser vazio.' }); return; }
    setSaving(true); setDadosMsg(null);
    try {
      const r = await adminApi.updateUser(user.id, {
        name:  name.trim(),
        email: email.trim(),
        phone: phone.replace(/\D/g, '') || undefined,
      });
      const asaasSub = (r as any).asaasResult ? ` · ${ASAAS_EDIT_MSG[(r as any).asaasResult] ?? ''}` : '';
      setDadosMsg({ type: 'success', text: `Dados salvos!${asaasSub}` });
      onSaved();
    } catch (e: any) {
      setDadosMsg({ type: 'error', text: e.response?.data?.error ?? 'Erro ao salvar.' });
    } finally { setSaving(false); }
  };

  /* ── Alterar status da assinatura ── */
  const handleSaveStatus = async () => {
    if (!newStatus || newStatus === sub?.status) return;
    setStatusSaving(true); setStatusMsg(null);
    try {
      const r = await adminApi.updateSubscriptionStatus(user.id, newStatus as any);
      const detail = ASAAS_RESULT_MSG[r.asaasResult] ?? { label: r.asaasResult, tone: 'warn' as const };
      setStatusMsg({ type: 'success', text: r.message, sub: detail.label });
      onSaved();
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.response?.data?.error ?? 'Erro ao atualizar status.' });
    } finally { setStatusSaving(false); }
  };

  /* ── Excluir paciente ── */
  const handleDelete = async () => {
    if (deleteConfirm !== user.name) {
      setDeleteError('Nome digitado não confere. Digite exatamente como mostrado.');
      return;
    }
    setDeletePhase('deleting');
    try {
      await adminApi.deleteUser(user.id);
      setDeletePhase('done');
      onSaved();
      setTimeout(() => { onClose(); }, 1800);
    } catch (e: any) {
      setDeleteError(e.response?.data?.error ?? 'Erro ao excluir.');
      setDeletePhase('confirm');
    }
  };

  const initials = user.name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.48)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div style={{ background: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 520,
        boxShadow: '0 32px 80px rgba(0,0,0,0.22)', overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--sky-500), var(--green-500))',
                color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 900, flexShrink: 0 }}>
                {initials}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900 }}>{user.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, fontFamily: 'var(--mono)' }}>
                  {user.cpf} · {user.email}
                </div>
              </div>
            </div>
            <button onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4 }}>
              <Ic.x />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, marginTop: 14, borderBottom: '2px solid var(--border)', marginLeft: -22, marginRight: -22, paddingInline: 22 }}>
            {([
              { id: 'dados',      label: '✏️ Dados pessoais' },
              { id: 'assinatura', label: '📋 Assinatura' },
              { id: 'perigo',     label: '🗑️ Excluir' },
            ] as { id: Tab; label: string }[]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 800, fontFamily: 'inherit',
                color: tab === t.id ? (t.id === 'perigo' ? 'var(--red-600)' : 'var(--accent)') : 'var(--ink-3)',
                borderBottom: `2px solid ${tab === t.id ? (t.id === 'perigo' ? 'var(--red-600)' : 'var(--accent)') : 'transparent'}`,
                marginBottom: -2, whiteSpace: 'nowrap',
              }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>

          {/* TAB: Dados pessoais */}
          {tab === 'dados' && (
            <div style={{ display: 'grid', gap: 14 }}>
              <Field label="Nome completo" value={name} onChange={setName} placeholder="Nome completo" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="E-mail" value={email} onChange={setEmail} placeholder="email@exemplo.com" type="email" />
                <Field label="Telefone / WhatsApp" value={phone} onChange={setPhone} placeholder="87 9 9999-9999" mono />
              </div>

              {/* CPF: readonly */}
              <div>
                <label style={labelStyle}>CPF <span style={{ color: 'var(--ink-3)', fontSize: 10 }}>(não editável)</span></label>
                <div style={{ padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--border)',
                  background: 'var(--slate-50)', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-3)' }}>
                  {user.cpf}
                </div>
              </div>

              {/* Meditele / Asaas IDs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <IdInfo label="ID Meditele" value={user.lsxToken} />
                <IdInfo label="ID Asaas"    value={user.asaasCustomerId} />
              </div>

              {dadosMsg && <MsgBanner type={dadosMsg.type}>{dadosMsg.text}</MsgBanner>}
            </div>
          )}

          {/* TAB: Assinatura */}
          {tab === 'assinatura' && (
            <div style={{ display: 'grid', gap: 16 }}>
              {sub ? (
                <>
                  {/* Info atual */}
                  <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--slate-50)', border: '1px solid var(--border)',
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    {[
                      { label: 'Plano',   value: sub.plan.name },
                      { label: 'Status',  value: sub.status },
                      { label: 'Início',  value: new Date(sub.startDate).toLocaleDateString('pt-BR') },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                        <div style={{ fontSize: 13, fontWeight: 800, marginTop: 3 }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* ID Asaas */}
                  {sub.asaasSubscriptionId ? (
                    <div style={{ fontSize: 11, color: 'var(--sky-700)', background: 'var(--sky-50)',
                      border: '1px solid var(--sky-200)', borderRadius: 7, padding: '7px 12px',
                      fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 900 }}>Asaas ID:</span>
                      <span>{sub.asaasSubscriptionId}</span>
                      <span style={{ marginLeft: 'auto', padding: '2px 7px', background: 'var(--green-100)',
                        color: 'var(--green-700)', borderRadius: 4, fontSize: 10, fontWeight: 900 }}>SINCRONIZADO</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--amber-700)', background: 'var(--amber-50)',
                      border: '1px solid var(--amber-100)', borderRadius: 7, padding: '7px 12px', fontWeight: 600 }}>
                      ⚠️ Sem ID Asaas — assinatura criada antes da integração ou manualmente.
                    </div>
                  )}

                  {/* Alterar status */}
                  <div>
                    <label style={labelStyle}>Alterar status da assinatura</label>
                    <div style={{ display: 'grid', gap: 8 }}>
                      {STATUS_OPTIONS.map(opt => (
                        <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 14px', borderRadius: 9, cursor: 'pointer',
                          border: `${newStatus === opt.value ? '2px' : '1.5px'} solid ${newStatus === opt.value ? opt.color : 'var(--border)'}`,
                          background: newStatus === opt.value ? 'var(--slate-50)' : '#fff' }}>
                          <input type="radio" name="status" value={opt.value}
                            checked={newStatus === opt.value}
                            onChange={() => setNewStatus(opt.value)}
                            style={{ accentColor: opt.color }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 900, color: newStatus === opt.value ? opt.color : 'var(--ink)' }}>
                              {opt.label}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}>{opt.desc}</div>
                          </div>
                          {sub.status === opt.value && (
                            <span style={{ fontSize: 10, fontWeight: 900, padding: '2px 7px',
                              background: 'var(--slate-100)', color: 'var(--ink-3)', borderRadius: 4 }}>ATUAL</span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>

                  {newStatus === 'CANCELLED' && (
                    <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--red-50)',
                      border: '1px solid var(--red-100)', fontSize: 12, color: 'var(--red-600)', fontWeight: 600 }}>
                      ⚠️ Isso cancelará a assinatura no Asaas. O cliente perderá acesso imediatamente.
                    </div>
                  )}

                  {statusMsg && (
                    <MsgBanner type={statusMsg.type}>
                      {statusMsg.text}
                      {statusMsg.sub && <><br /><span style={{ fontSize: 11, opacity: 0.8 }}>↳ {statusMsg.sub}</span></>}
                    </MsgBanner>
                  )}
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)', fontSize: 13, fontWeight: 600 }}>
                  Paciente sem assinatura registrada.
                </div>
              )}
            </div>
          )}

          {/* TAB: Perigo / Excluir */}
          {tab === 'perigo' && (
            <div style={{ display: 'grid', gap: 16 }}>
              {deletePhase === 'done' ? (
                <MsgBanner type="success">Paciente excluído com sucesso.</MsgBanner>
              ) : (
                <>
                  <div style={{ padding: '14px 16px', borderRadius: 10, background: 'var(--red-50)',
                    border: '1px solid var(--red-100)' }}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--red-600)', marginBottom: 8 }}>
                      ⚠️ Esta ação não pode ser desfeita
                    </div>
                    <ul style={{ margin: '0 0 0 16px', padding: 0, fontSize: 13, color: 'var(--red-700)',
                      fontWeight: 600, lineHeight: 1.7 }}>
                      <li>Remove o paciente do banco de dados</li>
                      <li>Cancela a assinatura no Asaas (se houver)</li>
                      <li>Remove histórico de cupons e comissões</li>
                      <li><strong>Não remove o paciente da Meditele</strong> — faça isso manualmente no portal</li>
                    </ul>
                  </div>

                  {deletePhase === 'idle' && (
                    <button
                      onClick={() => setDeletePhase('confirm')}
                      style={{ padding: '11px', borderRadius: 9, border: '1.5px solid var(--red-500)',
                        background: '#fff', color: 'var(--red-600)', fontSize: 13, fontWeight: 900, cursor: 'pointer' }}>
                      Quero excluir este paciente
                    </button>
                  )}

                  {deletePhase === 'confirm' && (
                    <div style={{ display: 'grid', gap: 12 }}>
                      <div>
                        <label style={labelStyle}>
                          Digite <strong style={{ color: 'var(--red-600)' }}>{user.name}</strong> para confirmar
                        </label>
                        <input
                          className="input"
                          style={{ width: '100%', borderColor: deleteError ? 'var(--red-500)' : undefined }}
                          value={deleteConfirm}
                          onChange={e => { setDeleteConfirm(e.target.value); setDeleteError(''); }}
                          placeholder={user.name}
                          autoFocus
                        />
                        {deleteError && (
                          <div style={{ fontSize: 12, color: 'var(--red-600)', fontWeight: 600, marginTop: 4 }}>
                            {deleteError}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => { setDeletePhase('idle'); setDeleteConfirm(''); setDeleteError(''); }}
                          style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid var(--border)',
                            background: '#fff', fontSize: 13, fontWeight: 800, cursor: 'pointer', color: 'var(--ink-2)' }}>
                          Cancelar
                        </button>
                        <button onClick={handleDelete}
                          disabled={deleteConfirm !== user.name}
                          style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none',
                            background: deleteConfirm === user.name ? 'var(--red-600)' : 'var(--slate-200)',
                            color: deleteConfirm === user.name ? '#fff' : 'var(--ink-3)',
                            fontSize: 13, fontWeight: 900, cursor: deleteConfirm === user.name ? 'pointer' : 'default' }}>
                          Confirmar exclusão
                        </button>
                      </div>
                    </div>
                  )}

                  {deletePhase === 'deleting' && (
                    <div style={{ textAlign: 'center', padding: 20, color: 'var(--ink-3)', fontSize: 13, fontWeight: 700 }}>
                      Excluindo paciente…
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {tab !== 'perigo' && (
          <div style={{ padding: '14px 22px 18px', borderTop: '1px solid var(--border)', flexShrink: 0,
            display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={close} disabled={saving || statusSaving}>
              Fechar
            </button>
            {tab === 'dados' && (
              <button className="btn btn-primary" onClick={handleSaveDados} disabled={saving}>
                {saving
                  ? <><SpinIcon /> Salvando…</>
                  : <><Ic.check />Salvar dados</>}
              </button>
            )}
            {tab === 'assinatura' && sub && (
              <button className="btn btn-primary" onClick={handleSaveStatus}
                disabled={statusSaving || newStatus === sub.status}>
                {statusSaving
                  ? <><SpinIcon /> Salvando…</>
                  : 'Aplicar status'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Helpers ── */

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, color: 'var(--ink-3)',
  textTransform: 'uppercase', letterSpacing: '0.08em',
  display: 'block', marginBottom: 6,
};

function Field({ label, value, onChange, placeholder, type = 'text', mono }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; mono?: boolean;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        className="input"
        style={{ width: '100%', fontFamily: mono ? 'var(--mono)' : 'inherit', fontSize: mono ? 12 : 13 }}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function IdInfo({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ padding: '8px 10px', borderRadius: 7, background: value ? 'var(--green-50)' : 'var(--slate-50)',
        border: `1px solid ${value ? 'var(--green-100)' : 'var(--border)'}`,
        fontFamily: 'var(--mono)', fontSize: 10.5, color: value ? 'var(--green-700)' : 'var(--ink-3)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {value ?? '— não configurado'}
      </div>
    </div>
  );
}

function MsgBanner({ type, children }: { type: 'success' | 'error' | 'warn'; children: React.ReactNode }) {
  const styles = {
    success: { bg: 'var(--st-success-bg)', border: 'var(--st-success)',  color: 'var(--green-700)' },
    error:   { bg: 'var(--st-danger-bg)',  border: 'var(--st-danger)',    color: 'var(--red-600)'   },
    warn:    { bg: 'var(--st-warn-bg)',    border: 'var(--st-warn)',      color: 'var(--amber-700)' },
  }[type];
  return (
    <div style={{ padding: '10px 14px', borderRadius: 8, background: styles.bg,
      border: `1px solid ${styles.border}`, fontSize: 13, color: styles.color, fontWeight: 600, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

function SpinIcon() {
  return (
    <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent',
      borderRadius: '50%', display: 'inline-block',
      animation: 'spin 0.7s linear infinite' }} />
  );
}
