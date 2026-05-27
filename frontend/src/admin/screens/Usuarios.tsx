import { useState, useEffect } from 'react';
import { Sidebar, Topbar, PageHeader } from '../shell';
import { Ic } from '../icons';
import { adminApi } from '../api';

interface Props { onNav: (id: string) => void; }

export interface ApiEmployee {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  totalSales: number;
}

const ROLE_LABEL: Record<string, string> = { ADMIN: 'Admin', SUPERVISOR: 'Supervisor', VENDEDOR: 'Vendedor' };
const ROLE_TONE:  Record<string, string> = { ADMIN: 'danger', SUPERVISOR: 'info', VENDEDOR: 'success' };

const initials = (name: string) =>
  name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();

/* ── Modal Criar / Editar ── */
interface ModalProps {
  emp: ApiEmployee | null; // null = criar
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function EmployeeModal({ emp, open, onClose, onSaved }: ModalProps) {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [role,     setRole]     = useState('VENDEDOR');
  const [active,   setActive]   = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (!open) return;
    setName(emp?.name     ?? '');
    setEmail(emp?.email   ?? '');
    setPassword('');
    setRole(emp?.role     ?? 'VENDEDOR');
    setActive(emp?.active ?? true);
    setError('');
  }, [open, emp]);

  if (!open) return null;

  const isEdit = !!emp;

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) { setError('Nome e e-mail são obrigatórios.'); return; }
    if (!isEdit && !password.trim()) { setError('Senha obrigatória para novo usuário.'); return; }
    setSaving(true); setError('');
    try {
      if (isEdit) {
        await adminApi.updateEmployee(emp.id, { name, email, role, active, ...(password ? { password } : {}) });
      } else {
        await adminApi.createEmployee({ name, email, password, role });
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.response?.data?.error ?? 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, width: '100%', maxWidth: 440,
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 900 }}>
            {isEdit ? 'Editar usuário' : 'Novo usuário'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)' }}>
            <Ic.x />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px', display: 'grid', gap: 14 }}>

          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nome completo</span>
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Maria Silva" />
          </label>

          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>E-mail (login)</span>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="maria@saudeagora.com" />
          </label>

          <label style={{ display: 'grid', gap: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {isEdit ? 'Nova senha (deixe em branco para manter)' : 'Senha inicial'}
            </span>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label style={{ display: 'grid', gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Perfil</span>
              <select className="input" value={role} onChange={e => setRole(e.target.value)}>
                <option value="VENDEDOR">Vendedor</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>

            {isEdit && (
              <label style={{ display: 'grid', gap: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status</span>
                <select className="input" value={active ? 'true' : 'false'} onChange={e => setActive(e.target.value === 'true')}>
                  <option value="true">Ativo</option>
                  <option value="false">Inativo</option>
                </select>
              </label>
            )}
          </div>

          {error && (
            <div style={{ padding: '9px 12px', borderRadius: 8, background: 'var(--red-50)',
              border: '1px solid var(--red-100)', fontSize: 12, color: 'var(--red-600)', fontWeight: 700 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 22px 18px', borderTop: '1px solid var(--border)',
          display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar usuário'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Tela principal ── */
export function ScreenUsuarios({ onNav }: Props) {
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]   = useState<ApiEmployee | null>(null);

  const load = () => {
    setLoading(true);
    adminApi.getEmployees()
      .then(d => setEmployees(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (emp: ApiEmployee) => { setEditing(emp); setModalOpen(true); };

  const activeCount = employees.filter(e => e.active).length;
  const totalSales  = employees.reduce((s, e) => s + e.totalSales, 0);

  return (
    <div className="sa-shell">
      <Sidebar active="usuarios" onNav={onNav} />
      <main className="sa-main">
        <Topbar breadcrumb={['Outros', 'Usuários']} />
        <div className="sa-content">
          <PageHeader
            title="Usuários"
            subtitle="Gerencie os vendedores e supervisores que acessam o painel de vendas"
            actions={
              <button className="btn btn-primary" onClick={openCreate}>
                <Ic.plus /> Novo usuário
              </button>
            }
          />

          {/* KPIs rápidos */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Total de usuários', value: employees.length, color: 'var(--accent)' },
              { label: 'Usuários ativos',   value: activeCount,      color: 'var(--green-600)' },
              { label: 'Vendas registradas',value: totalSales,       color: 'var(--sky-600)' },
            ].map(k => (
              <div key={k.label} className="card" style={{ padding: '14px 18px' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{k.label}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: k.color, marginTop: 6, fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Tabela */}
          <div className="table-wrap">
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontWeight: 700 }}>Carregando…</div>
            ) : employees.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>👥</div>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>Nenhum usuário cadastrado</div>
                <div style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 20 }}>Crie o primeiro vendedor para começar.</div>
                <button className="btn btn-primary" onClick={openCreate}><Ic.plus />Novo usuário</button>
              </div>
            ) : (
              <table className="data">
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>E-mail</th>
                    <th>Perfil</th>
                    <th className="num">Vendas</th>
                    <th>Status</th>
                    <th>Criado em</th>
                    <th style={{ width: 80 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} style={{ opacity: emp.active ? 1 : 0.5 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar-init" style={{ width: 32, height: 32, fontSize: 11,
                            background: emp.active ? 'var(--accent)' : 'var(--slate-300)' }}>
                            {initials(emp.name)}
                          </div>
                          <span style={{ fontWeight: 800 }}>{emp.name}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--ink-2)' }}>{emp.email}</td>
                      <td><span className={`pill ${ROLE_TONE[emp.role] ?? 'muted'}`}>{ROLE_LABEL[emp.role] ?? emp.role}</span></td>
                      <td className="num" style={{ fontWeight: 700 }}>{emp.totalSales}</td>
                      <td>
                        <span className={`pill ${emp.active ? 'success' : 'muted'}`}>
                          {emp.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>
                        {new Date(emp.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="actions">
                        <button className="btn btn-sm btn-ghost" onClick={() => openEdit(emp)}>
                          <Ic.edit />Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Dica painel vendedor */}
          <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 10,
            background: 'var(--sky-50)', border: '1px solid var(--sky-100)',
            fontSize: 13, color: 'var(--sky-700)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>💡</span>
            <span>Os vendedores acessam o painel de vendas em <strong>saudeagora24h.com.br/painel</strong> com o e-mail e senha cadastrados aqui.</span>
          </div>
        </div>
      </main>

      <EmployeeModal
        emp={editing}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={load}
      />
    </div>
  );
}
