import { useState, useEffect } from 'react';
import { Ic } from '../icons';
import { adminApi, type ApiUser, type AsaasFinancial } from '../api';

interface Props {
  user: ApiUser | null;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}

type Phase = 'loading' | 'ready' | 'deleting' | 'done';

const fmtBRL = (v: number) =>
  `R$ ${v.toFixed(2).replace('.', ',')}`;

export function DeletePatientModal({ user, open, onClose, onDeleted }: Props) {
  const [phase,         setPhase]         = useState<Phase>('loading');
  const [financial,     setFinancial]     = useState<AsaasFinancial | null>(null);
  const [fetchError,    setFetchError]    = useState('');
  const [confirm,       setConfirm]       = useState('');
  const [deleteError,   setDeleteError]   = useState('');

  useEffect(() => {
    if (!open || !user) return;
    setPhase('loading');
    setFinancial(null);
    setFetchError('');
    setConfirm('');
    setDeleteError('');

    adminApi.getFinancial(user.id)
      .then(d => { setFinancial(d); setPhase('ready'); })
      .catch(e => {
        setFetchError(e.response?.data?.error ?? 'Não foi possível buscar dados financeiros.');
        setFinancial({ hasAsaas: false, subscriptions: [], pendingPayments: [], overduePayments: [], totalPending: 0, totalOverdue: 0 });
        setPhase('ready');
      });
  }, [open, user]);

  if (!open || !user) return null;

  const canClose = phase !== 'deleting';
  const close = () => { if (canClose) onClose(); };

  const activeSubs  = (financial?.subscriptions ?? []).filter(s => s.status === 'ACTIVE');
  const pendCount   = financial?.pendingPayments.length ?? 0;
  const overdCount  = financial?.overduePayments.length ?? 0;
  const totalToCancel = pendCount + overdCount;
  const totalValue  = (financial?.totalPending ?? 0) + (financial?.totalOverdue ?? 0);

  const nameMatch   = confirm.trim() === user.name.trim();

  const handleDelete = async () => {
    if (!nameMatch) return;
    setPhase('deleting');
    setDeleteError('');
    try {
      await adminApi.deleteUser(user.id);
      setPhase('done');
      onDeleted();
      setTimeout(() => onClose(), 2200);
    } catch (e: any) {
      setDeleteError(e.response?.data?.error ?? 'Erro ao excluir paciente.');
      setPhase('ready');
    }
  };

  const initials = user.name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.54)', zIndex: 1100,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div style={{ background: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 500,
        boxShadow: '0 32px 80px rgba(0,0,0,0.26)', overflow: 'hidden', maxHeight: '92vh',
        display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
        <div style={{ background: 'var(--red-50)', borderBottom: '1px solid var(--red-100)',
          padding: '18px 22px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg, var(--red-500), var(--red-600))',
                color: '#fff', display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 900 }}>
                {initials}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--red-700)' }}>
                  Excluir paciente
                </div>
                <div style={{ fontSize: 12, color: 'var(--red-500)', fontWeight: 700 }}>
                  {user.name} · {user.cpf}
                </div>
              </div>
            </div>
            <button onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--red-400)', padding: 4, borderRadius: 6 }}>
              <Ic.x />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 22px', overflowY: 'auto', flex: 1 }}>

          {/* FASE: carregando */}
          {phase === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 14, padding: '36px 0' }}>
              <Spinner size={28} color="var(--red-500)" />
              <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 700 }}>
                Verificando situação financeira no Asaas…
              </div>
            </div>
          )}

          {/* FASE: pronto ou excluindo */}
          {(phase === 'ready' || phase === 'deleting') && (
            <div style={{ display: 'grid', gap: 16 }}>

              {/* Erro ao buscar financeiro (aviso, não bloqueia) */}
              {fetchError && (
                <div style={{ padding: '10px 14px', borderRadius: 8, background: 'var(--amber-50)',
                  border: '1px solid var(--amber-100)', fontSize: 12, color: 'var(--amber-700)', fontWeight: 700 }}>
                  ⚠️ {fetchError} — situação financeira não disponível.
                </div>
              )}

              {/* Resumo financeiro */}
              {financial?.hasAsaas ? (
                <div style={{ borderRadius: 10, border: '1px solid var(--border)', overflow: 'hidden' }}>
                  <div style={{ padding: '9px 14px', background: 'var(--slate-50)',
                    borderBottom: '1px solid var(--border)',
                    fontSize: 11, fontWeight: 900, color: 'var(--ink-3)',
                    textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Situação financeira — Asaas
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
                    <FinStat
                      label="Assinaturas ativas"
                      value={activeSubs.length}
                      sub={activeSubs.length > 0
                        ? fmtBRL(activeSubs[0].value) + '/mês'
                        : 'nenhuma'}
                      tone={activeSubs.length > 0 ? 'warn' : 'ok'}
                    />
                    <FinStat
                      label="Parcelas pendentes"
                      value={pendCount}
                      sub={pendCount > 0 ? fmtBRL(financial.totalPending) : 'nenhuma'}
                      tone={pendCount > 0 ? 'warn' : 'ok'}
                      border
                    />
                    <FinStat
                      label="Em atraso"
                      value={overdCount}
                      sub={overdCount > 0 ? fmtBRL(financial.totalOverdue) : 'nenhum'}
                      tone={overdCount > 0 ? 'danger' : 'ok'}
                      border
                    />
                  </div>
                  {totalToCancel > 0 && (
                    <div style={{ padding: '9px 14px', background: 'var(--amber-50)',
                      borderTop: '1px solid var(--amber-100)', fontSize: 12,
                      color: 'var(--amber-700)', fontWeight: 700 }}>
                      {totalToCancel} parcela{totalToCancel > 1 ? 's' : ''} serão canceladas
                      &nbsp;·&nbsp; total {fmtBRL(totalValue)}
                    </div>
                  )}
                </div>
              ) : !fetchError && (
                <div style={{ padding: '11px 14px', borderRadius: 9, background: 'var(--slate-50)',
                  border: '1px solid var(--border)', fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>
                  Paciente sem cadastro no Asaas — somente dados locais serão removidos.
                </div>
              )}

              {/* O que acontece */}
              <div style={{ padding: '12px 14px', borderRadius: 9,
                background: 'var(--red-50)', border: '1px solid var(--red-100)' }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: 'var(--red-700)', marginBottom: 8 }}>
                  ⚠️ Esta ação não pode ser desfeita
                </div>
                <ul style={{ margin: '0 0 0 16px', padding: 0,
                  fontSize: 12.5, color: 'var(--red-700)', fontWeight: 700, lineHeight: 1.9 }}>
                  <li>Dados do paciente removidos do banco de dados</li>
                  {activeSubs.length > 0 && (
                    <li>{activeSubs.length} assinatura{activeSubs.length > 1 ? 's' : ''} cancelada{activeSubs.length > 1 ? 's' : ''} no Asaas</li>
                  )}
                  {totalToCancel > 0 && (
                    <li>{totalToCancel} parcela{totalToCancel > 1 ? 's' : ''} pendente{totalToCancel > 1 ? 's' : ''} cancelada{totalToCancel > 1 ? 's' : ''} no Asaas</li>
                  )}
                  <li style={{ color: 'var(--red-500)' }}>
                    <strong>Não</strong> remove o paciente da Meditele — faça manualmente
                  </li>
                </ul>
              </div>

              {/* Input de confirmação */}
              {phase === 'ready' && (
                <div>
                  <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-3)',
                    textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>
                    Digite <strong style={{ color: 'var(--red-600)' }}>{user.name}</strong> para confirmar
                  </label>
                  <input
                    className="input"
                    style={{ width: '100%',
                      borderColor: deleteError ? 'var(--red-500)' : undefined,
                      outlineColor: 'var(--red-500)' }}
                    value={confirm}
                    onChange={e => { setConfirm(e.target.value); setDeleteError(''); }}
                    placeholder={user.name}
                    autoFocus
                  />
                  {deleteError && (
                    <div style={{ fontSize: 12, color: 'var(--red-600)', fontWeight: 700, marginTop: 5 }}>
                      {deleteError}
                    </div>
                  )}
                </div>
              )}

              {phase === 'deleting' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 10, padding: '14px 0', color: 'var(--ink-3)', fontWeight: 700, fontSize: 13 }}>
                  <Spinner size={16} />
                  Excluindo paciente e cancelando cobranças…
                </div>
              )}
            </div>
          )}

          {/* FASE: concluído */}
          {phase === 'done' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 10, padding: '36px 0' }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%',
                background: 'var(--green-100)', display: 'grid', placeItems: 'center' }}>
                <Ic.check style={{ width: 24, height: 24, color: 'var(--green-600)' } as any} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--green-700)' }}>
                Paciente excluído
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600, textAlign: 'center' }}>
                Dados removidos · cobranças canceladas no Asaas
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        {phase === 'ready' && (
          <div style={{ padding: '14px 22px 18px', borderTop: '1px solid var(--border)',
            flexShrink: 0, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={close}>
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={!nameMatch}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 9, border: 'none',
                fontSize: 13, fontWeight: 900, cursor: nameMatch ? 'pointer' : 'default',
                background: nameMatch ? 'var(--red-600)' : 'var(--slate-200)',
                color:      nameMatch ? '#fff'           : 'var(--ink-3)',
                transition: 'background 0.15s',
              }}>
              <Ic.trash />
              Excluir paciente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Helpers internos ── */

function FinStat({ label, value, sub, tone, border }: {
  label: string; value: number; sub: string;
  tone: 'ok' | 'warn' | 'danger'; border?: boolean;
}) {
  const colors = {
    ok:     { num: 'var(--green-700)', bg: 'transparent' },
    warn:   { num: 'var(--amber-600)', bg: 'transparent' },
    danger: { num: 'var(--red-600)',   bg: 'transparent' },
  }[tone];

  return (
    <div style={{ padding: '12px 14px', borderLeft: border ? '1px solid var(--border)' : 'none' }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--ink-3)',
        textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: colors.num,
        fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, marginTop: 3 }}>
        {sub}
      </div>
    </div>
  );
}

function Spinner({ size = 18, color = 'var(--ink-3)' }: { size?: number; color?: string }) {
  return (
    <span style={{
      display: 'inline-block',
      width: size, height: size,
      border: `2.5px solid ${color}`,
      borderTopColor: 'transparent',
      borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  );
}
