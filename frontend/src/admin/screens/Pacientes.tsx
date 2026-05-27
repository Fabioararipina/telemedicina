import React, { useState, useEffect } from 'react';
import { Sidebar, Topbar, PageHeader } from '../shell';
import { Ic } from '../icons';
import { adminApi, mapUserToRow, userActiveSub, type ApiUser, type AsaasFinancial } from '../api';
import { NewPatientModal }    from '../components/NewPatientModal';
import { EditPatientModal }    from '../components/EditPatientModal';
import { DeletePatientModal }  from '../components/DeletePatientModal';

// Keyframe para spinner no EditPatientModal
const SPIN_STYLE = `@keyframes spin { to { transform: rotate(360deg); } }`;

interface Props { onNav: (id: string) => void; onSelectUser?: (user: ApiUser) => void; }
interface DetailProps { onNav: (id: string) => void; user?: ApiUser | null; }

const STATUS_PILL: Record<string, { cls: string; label: string }> = {
  ativo:    { cls: 'success', label: 'Ativo' },
  vencido:  { cls: 'danger',  label: 'Vencido' },
  pendente: { cls: 'warn',    label: 'Pendente' },
  inativo:  { cls: 'muted',   label: 'Inativo' },
};

export function ScreenPacientes({ onNav, onSelectUser }: Props) {
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal,   setShowModal]   = useState(false);
  const [editUser,    setEditUser]    = useState<ApiUser | null>(null);
  const [deleteUser,  setDeleteUser]  = useState<ApiUser | null>(null);

  const loadUsers = () => {
    setLoading(true);
    adminApi.getUsers()
      .then(data => { setUsers(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, []);


  const rows = users.map((u, i) => ({ ...mapUserToRow(u, i), _user: u }));

  const filtered = rows.filter(p => {
    const q = search.toLowerCase();
    if (q && !p.name.toLowerCase().includes(q) && !p.cpf.includes(q) && !p.phone.includes(q) && !p.id.toLowerCase().includes(q)) return false;
    if (planFilter && p.planType !== planFilter) return false;
    if (statusFilter && p.status !== statusFilter) return false;
    return true;
  });

  const ativos    = rows.filter(r => r.status === 'ativo').length;
  const pendentes = rows.filter(r => r.status === 'pendente').length;
  const inativos  = rows.filter(r => r.status === 'inativo').length;

  return (
    <div className="sa-shell">
      <Sidebar active="pacientes" onNav={onNav} />
      <main className="sa-main">
        <Topbar breadcrumb={['Gestão', 'Pacientes']} />
        <div className="sa-content">
          <PageHeader
            title="Pacientes"
            subtitle={loading ? 'Carregando…' : `${rows.length} cadastros · ${ativos} ativos · ${pendentes} pendentes`}
            actions={
              <>
                <button className="btn btn-secondary"><Ic.download />Exportar CSV</button>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}><Ic.plus />Novo paciente</button>
              </>
            }
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 18 }}>
            <MiniStat tone="success" value={loading ? '…' : String(ativos)}    label="Ativos"             delta={`${rows.length} total`} />
            <MiniStat tone="warn"    value={loading ? '…' : String(pendentes)} label="Pendentes"          delta="aguardando confirmação" />
            <MiniStat tone="muted"   value={loading ? '…' : String(inativos)}  label="Inativos"           delta="sem assinatura ativa" />
            <MiniStat tone="muted"   value={loading ? '…' : String(rows.length)} label="Total cadastros"  delta="todos os planos" />
          </div>

          <div className="toolbar" style={{ marginBottom: 0, background: 'var(--surface)', padding: 12, borderRadius: 'var(--r-lg) var(--r-lg) 0 0', border: '1px solid var(--border)', borderBottom: 0 }}>
            <div className="input-with-icon" style={{ width: 320 }}>
              <Ic.search />
              <input className="input" placeholder="Buscar nome, CPF, telefone ou ID…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="select" style={{ width: 150 }} value={planFilter} onChange={e => setPlanFilter(e.target.value)}>
              <option value="">Todos planos</option>
              <option value="INDIVIDUAL">Individual</option>
              <option value="FAMILIAR">Familiar</option>
              <option value="AVULSO">Avulso</option>
            </select>
            <select className="select" style={{ width: 150 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">Todos status</option>
              <option value="ativo">Ativo</option>
              <option value="pendente">Pendente</option>
              <option value="inativo">Inativo</option>
            </select>
            <div className="spacer" />
            <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>
              <strong style={{ color: 'var(--ink)' }}>{filtered.length}</strong> resultados
            </span>
          </div>

          <div className="table-wrap" style={{ borderRadius: '0 0 var(--r-lg) var(--r-lg)', borderTop: 0 }}>
            {loading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)', fontWeight: 700 }}>Carregando pacientes…</div>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th style={{ width: 32 }}><input type="checkbox" /></th>
                    <th>Paciente</th>
                    <th>CPF</th>
                    <th>Telefone</th>
                    <th>Plano</th>
                    <th>Status</th>
                    <th>Desde</th>
                    <th className="num">Mensalidade</th>
                    <th style={{ width: 148 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const st = STATUS_PILL[p.status] ?? { cls: 'muted', label: p.status };
                    return (
                      <tr key={p.rawId}>
                        <td><input type="checkbox" /></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="avatar-init" style={{ width: 32, height: 32, fontSize: 11 }}>{p.init}</div>
                            <div>
                              <div style={{ fontWeight: 800 }}>{p.name}</div>
                              <div className="tag-id">{p.id}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-2)' }}>{p.cpf}</td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-2)' }}>{p.phone}</td>
                        <td><span className={`pill ${p.planTone}`}>{p.plan}</span></td>
                        <td><span className={`pill ${st.cls}`}><span className="dot" />{st.label}</span></td>
                        <td style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--ink-2)' }}>{p.since}</td>
                        <td className="num" style={{ fontWeight: 700 }}>{p.value}</td>
                        <td className="actions">
                          <button title="Visualizar" onClick={() => { onSelectUser?.(p._user); onNav('paciente-detail'); }}><Ic.eye /></button>
                          <button title="Editar" onClick={() => setEditUser(p._user)}><Ic.edit /></button>
                          <button title="WhatsApp" onClick={() => p.phone !== '—' && window.open(`https://wa.me/55${p._user.phone?.replace(/\D/g,'')}`, '_blank')}><Ic.whatsapp /></button>
                          <button
                            title="Excluir paciente"
                            onClick={() => setDeleteUser(p._user)}
                            style={{ color: 'var(--red-400)' }}>
                            <Ic.trash />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {!loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--ink-3)', fontWeight: 700 }}>
                <span>Mostrando {filtered.length} de {rows.length}</span>
              </div>
            )}
          </div>
        </div>
      </main>

      <NewPatientModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={loadUsers}
      />

      <EditPatientModal
        user={editUser}
        open={editUser !== null}
        onClose={() => setEditUser(null)}
        onSaved={loadUsers}
      />

      <DeletePatientModal
        user={deleteUser}
        open={deleteUser !== null}
        onClose={() => setDeleteUser(null)}
        onDeleted={() => { setDeleteUser(null); loadUsers(); }}
      />
    </div>
  );
}

/* ── Paciente detail ── */
export function ScreenPacienteDetail({ onNav, user }: DetailProps) {
  const [magicLink,    setMagicLink]   = useState<string | null>(null);
  const [mlLoading,    setMlLoading]   = useState(false);
  const [mlError,      setMlError]     = useState<string | null>(null);
  const [showEdit,     setShowEdit]    = useState(false);
  const [showDelete,   setShowDelete]  = useState(false);
  const [detailTab,    setDetailTab]   = useState<'consultas' | 'pagamentos'>('consultas');
  const [financial,    setFinancial]   = useState<AsaasFinancial | null>(null);
  const [finLoading,   setFinLoading]  = useState(false);

  const handleMagicLink = async () => {
    if (!user) return;
    setMlLoading(true);
    setMlError(null);
    setMagicLink(null);
    try {
      const { magicLink: link } = await adminApi.getMagicLink(user.id);
      setMagicLink(link);
    } catch {
      setMlError('Erro ao gerar magic link. Verifique se o paciente possui ID Meditele.');
    } finally {
      setMlLoading(false);
    }
  };

  const row      = user ? mapUserToRow(user, 0) : null;
  const sub      = user ? userActiveSub(user) : null;
  const stInfo   = STATUS_PILL[row?.status ?? 'inativo'] ?? STATUS_PILL['inativo'];

  const displayName = user?.name ?? 'Paciente';
  const initials    = row?.init ?? '??';
  const planLabel   = row?.plan ?? '—';
  const planTone    = row?.planTone ?? 'muted';
  const since       = sub ? new Date(sub.startDate).toLocaleDateString('pt-BR') : (row?.since ?? '—');

  // Carrega dados financeiros quando aba "Pagamentos" é ativada
  const handleTabChange = (tab: 'consultas' | 'pagamentos') => {
    setDetailTab(tab);
    if (tab === 'pagamentos' && !financial && user) {
      setFinLoading(true);
      adminApi.getFinancial(user.id)
        .then(d => setFinancial(d))
        .catch(() => {})
        .finally(() => setFinLoading(false));
    }
  };

  const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
  const fmtBRL  = (v: number) => `R$ ${v.toFixed(2).replace('.', ',')}`;

  return (
    <div className="sa-shell">
      <Sidebar active="pacientes" onNav={onNav} />
      <main className="sa-main">
        <Topbar breadcrumb={['Gestão', 'Pacientes', displayName]} />
        <div className="sa-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
            <button className="btn btn-ghost btn-sm" style={{ padding: 6 }} onClick={() => onNav('pacientes')}>
              <Ic.arrow style={{ transform: 'rotate(180deg)' }} />
            </button>
            <div className="avatar-init" style={{ width: 56, height: 56, fontSize: 20, background: 'linear-gradient(135deg, var(--sky-500), var(--green-500))', color: '#fff' }}>{initials}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontSize: 22 }}>{displayName}</h1>
                <span className={`pill ${stInfo.cls}`}><span className="dot" />{stInfo.label}</span>
                <span className={`pill ${planTone}`}>{planLabel}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink-3)', marginTop: 4, fontWeight: 600 }}>
                {row && <span className="tag-id">{row.id}</span>}
                {user?.cpf && <span>· CPF {user.cpf}</span>}
                {user?.email && <span>· {user.email}</span>}
                {since && <span>· Assinante desde {since}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {user?.phone && (
                <button className="btn btn-secondary" onClick={() => window.open(`https://wa.me/55${user.phone!.replace(/\D/g, '')}`)}>
                  <Ic.whatsapp />Enviar WhatsApp
                </button>
              )}
              <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>
                <Ic.edit />Editar
              </button>
              <button className="btn btn-secondary"
                style={{ color: 'var(--red-600)', borderColor: 'var(--red-200)' }}
                onClick={() => setShowDelete(true)}>
                <Ic.trash />Excluir
              </button>
              <button className="btn btn-primary" onClick={handleMagicLink} disabled={mlLoading || !user?.lsxToken}>
                <Ic.pill />{mlLoading ? 'Gerando…' : 'Gerar magic link'}
              </button>
            </div>
          </div>

          {/* Magic link result */}
          {magicLink && (
            <div className="card" style={{ background: 'var(--st-success-bg)', borderColor: 'color-mix(in oklab, var(--green-500) 30%, transparent)', marginBottom: 18, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--green-700)', marginBottom: 8 }}>MAGIC LINK GERADO · expira em 5 min</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input readOnly value={magicLink} className="input" style={{ flex: 1, fontFamily: 'var(--mono)', fontSize: 11 }} onFocus={e => e.target.select()} />
                <button className="btn btn-secondary" onClick={() => { navigator.clipboard.writeText(magicLink); }}>Copiar</button>
              </div>
            </div>
          )}
          {mlError && (
            <div className="card" style={{ background: 'var(--st-danger-bg)', borderColor: 'color-mix(in oklab, var(--red-500) 25%, transparent)', marginBottom: 18, padding: 14 }}>
              <span style={{ fontSize: 13, color: 'var(--red-600)', fontWeight: 700 }}>{mlError}</span>
            </div>
          )}
          {!user?.lsxToken && user && (
            <div className="card" style={{ background: 'var(--st-warn-bg)', borderColor: 'color-mix(in oklab, var(--amber-500) 25%, transparent)', marginBottom: 18, padding: 14 }}>
              <span style={{ fontSize: 13, color: 'var(--amber-700)', fontWeight: 700 }}>Paciente sem ID Meditele — magic link indisponível.</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18, alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <SmallStat label="Plano"           value={planLabel}             sub={sub ? `desde ${since}` : '—'} />
                <SmallStat label="Status"          value={stInfo.label}          sub={row?.status ?? '—'} />
                <SmallStat label="Próx. vencimento" value={sub?.endDate ? new Date(sub.endDate).toLocaleDateString('pt-BR') : '—'} sub={row?.value ?? '—'} tone="success" />
                <SmallStat label="Mensalidade"     value={row?.value ?? '—'}     sub={sub?.plan.name ?? '—'} />
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', paddingInline: 14 }}>
                  {([
                    { id: 'consultas',  label: 'Consultas' },
                    { id: 'pagamentos', label: 'Pagamentos' },
                  ] as const).map(t => (
                    <div key={t.id} onClick={() => handleTabChange(t.id)}
                      style={{ padding: '14px 18px', fontSize: 13, fontWeight: 800, cursor: 'pointer',
                        color: detailTab === t.id ? 'var(--ink)' : 'var(--ink-3)',
                        borderBottom: detailTab === t.id ? '2px solid var(--accent)' : '2px solid transparent' }}>
                      {t.label}
                    </div>
                  ))}
                </div>

                {/* Aba: Consultas */}
                {detailTab === 'consultas' && (
                  <div style={{ padding: 24, textAlign: 'center' }}>
                    <div style={{ marginBottom: 12, color: 'var(--ink-3)', fontSize: 32 }}>🏥</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--ink-2)', marginBottom: 8 }}>
                      Histórico de consultas
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600, marginBottom: 16, lineHeight: 1.6 }}>
                      O histórico de consultas está disponível<br />
                      diretamente no portal de telemedicina.
                    </div>
                    {user?.lsxToken ? (
                      <button className="btn btn-secondary" onClick={handleMagicLink} disabled={mlLoading}>
                        <Ic.pill />{mlLoading ? 'Gerando…' : 'Abrir portal via magic link'}
                      </button>
                    ) : (
                      <span className="tag-id">Paciente sem ID de telemedicina</span>
                    )}
                  </div>
                )}

                {/* Aba: Pagamentos */}
                {detailTab === 'pagamentos' && (
                  <div style={{ padding: 18 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 14 }}>
                      Situação financeira · Asaas
                    </div>

                    {finLoading ? (
                      <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--ink-3)', fontWeight: 700 }}>
                        Carregando dados financeiros…
                      </div>
                    ) : !financial ? (
                      <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--ink-3)', fontWeight: 700 }}>
                        Sem dados Asaas para este paciente.
                      </div>
                    ) : !financial.hasAsaas ? (
                      <div style={{ padding: '12px 14px', borderRadius: 9, background: 'var(--slate-50)',
                        border: '1px solid var(--border)', fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>
                        Paciente não cadastrado no Asaas.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: 10 }}>
                        {/* Assinaturas */}
                        {financial.subscriptions.length > 0 && (
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                              Assinaturas
                            </div>
                            {financial.subscriptions.map(s => (
                              <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 8, background: 'var(--slate-50)', border: '1px solid var(--border)', marginBottom: 6 }}>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 800 }}>{s.description}</div>
                                  <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}>
                                    {s.cycle} · próx: {s.nextDueDate ? fmtDate(s.nextDueDate) : '—'}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontSize: 14, fontWeight: 900 }}>{fmtBRL(s.value)}</span>
                                  <span className={`pill ${s.status === 'ACTIVE' ? 'success' : 'warn'}`} style={{ fontSize: 10 }}>
                                    {s.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Pendentes */}
                        {financial.pendingPayments.length > 0 && (
                          <PaymentList title="Cobranças pendentes" items={financial.pendingPayments} tone="warn" fmtDate={fmtDate} fmtBRL={fmtBRL} />
                        )}

                        {/* Em atraso */}
                        {financial.overduePayments.length > 0 && (
                          <PaymentList title="Em atraso" items={financial.overduePayments} tone="danger" fmtDate={fmtDate} fmtBRL={fmtBRL} />
                        )}

                        {financial.subscriptions.length === 0 && financial.pendingPayments.length === 0 && financial.overduePayments.length === 0 && (
                          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--green-700)', fontWeight: 700, fontSize: 13 }}>
                            ✓ Sem cobranças pendentes ou em atraso.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right sidebar */}
            <aside style={{ display: 'grid', gap: 14 }}>
              <div className="card">
                <h3 style={{ fontSize: 14, marginBottom: 12 }}>Contato</h3>
                {user?.phone   && <ContactRow icon={<Ic.phone />}    label="Telefone" value={user.phone} />}
                {user?.phone   && <ContactRow icon={<Ic.whatsapp />} label="WhatsApp" value={user.phone} verified />}
                {user?.email   && <ContactRow icon={<Ic.cal />}      label="E-mail"   value={user.email} last />}
              </div>

              <div className="card">
                <h3 style={{ fontSize: 14, marginBottom: 12 }}>Assinatura</h3>
                <ContactRow icon={<Ic.plans />} label="Plano"  value={planLabel} />
                <ContactRow icon={<Ic.check />} label="Status" value={stInfo.label} />
                <ContactRow icon={<Ic.cal />}   label="Início" value={since} last />
              </div>

              {user?.lsxToken && (
                <div className="card" style={{ background: 'var(--st-info-bg)', borderColor: 'color-mix(in oklab, var(--sky-500) 25%, transparent)' }}>
                  <h3 style={{ fontSize: 14, marginBottom: 8, color: 'var(--sky-700)' }}>ID Meditele</h3>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-2)', wordBreak: 'break-all' }}>{user.lsxToken}</div>
                </div>
              )}

              <div className="card">
                <h3 style={{ fontSize: 14, marginBottom: 12 }}>Ações rápidas</h3>
                <div style={{ display: 'grid', gap: 6 }}>
                  {user?.phone && (
                    <QuickAction icon={<Ic.whatsapp />} label="Enviar mensagem"
                      onClick={() => window.open(`https://wa.me/55${user.phone!.replace(/\D/g, '')}`, '_blank')} />
                  )}
                  <QuickAction icon={<Ic.pill />}  label="Gerar novo magic link" onClick={handleMagicLink} />
                  <QuickAction icon={<Ic.edit />}  label="Editar dados" onClick={() => setShowEdit(true)} />
                  <QuickAction icon={<Ic.x />}     label="Cancelar assinatura" danger onClick={() => setShowEdit(true)} />
                  <QuickAction icon={<Ic.trash />} label="Excluir paciente" danger onClick={() => setShowDelete(true)} />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <style>{SPIN_STYLE}</style>

      <EditPatientModal
        user={showEdit ? (user ?? null) : null}
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSaved={() => { setShowEdit(false); }}
      />

      <DeletePatientModal
        user={showDelete ? (user ?? null) : null}
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onDeleted={() => { setShowDelete(false); onNav('pacientes'); }}
      />
    </div>
  );
}

/* ── Local helpers ── */

function MiniStat({ tone, value, label, delta }: { tone: string; value: string; label: string; delta: string }) {
  return (
    <div className="card flat" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <span className={`pill ${tone}`} style={{ padding: '5px 10px' }}><span className="dot" /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2 }}>{label}</div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}>{delta}</div>
      </div>
    </div>
  );
}

function SmallStat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="card flat">
      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, marginTop: 6, color: tone === 'success' ? 'var(--green-700)' : 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ContactRow({ icon, label, value, verified, last }: { icon: React.ReactNode; label: string; value: string; verified?: boolean; last?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '28px 1fr auto', gap: 10, alignItems: 'center', padding: '10px 0', borderBottom: last ? 'none' : '1px solid var(--border)' }}>
      <div style={{ color: 'var(--ink-3)' }}>{icon}</div>
      <div>
        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: label === 'Endereço' ? 'inherit' : 'var(--mono)' }}>{value}</div>
      </div>
      {verified && <span className="pill success" style={{ padding: '2px 6px' }}>✓</span>}
    </div>
  );
}

function PaymentList({ title, items, tone, fmtDate, fmtBRL }: {
  title: string;
  items: { id: string; value: number; dueDate: string; description: string }[];
  tone: 'warn' | 'danger';
  fmtDate: (d: string) => string;
  fmtBRL: (v: number) => string;
}) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 800, color: tone === 'danger' ? 'var(--red-600)' : 'var(--amber-600)',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {title} ({items.length})
      </div>
      {items.map((p, i) => (
        <div key={p.id} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '9px 12px', borderRadius: 8, marginBottom: 5,
          background: tone === 'danger' ? 'var(--red-50)' : 'var(--amber-50)',
          border: `1px solid ${tone === 'danger' ? 'var(--red-100)' : 'var(--amber-100)'}`,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-2)' }}>{p.description || `Cobrança ${i + 1}`}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--mono)' }}>
              {fmtDate(p.dueDate)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 900, color: tone === 'danger' ? 'var(--red-600)' : 'var(--amber-700)' }}>
              {fmtBRL(p.value)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function QuickAction({ icon, label, danger, onClick }: { icon: React.ReactNode; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, fontSize: 13, fontWeight: 700, color: danger ? 'var(--red-600)' : 'var(--ink-2)', textAlign: 'left', width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
      <span style={{ color: danger ? 'var(--red-500)' : 'var(--ink-3)' }}>{icon}</span>
      {label}
    </button>
  );
}
