import React, { useState } from 'react';
import { Sidebar, Topbar, PageHeader } from '../shell';
import { adminApi } from '../api';

interface Props { onNav: (id: string) => void; }

const FIELD_STYLE: React.CSSProperties = {
  width: '100%', border: '1.5px solid var(--border)', borderRadius: 8,
  padding: '10px 12px', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
  color: 'var(--ink)', background: 'var(--surface)', outline: 'none',
  boxSizing: 'border-box',
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 12, fontWeight: 800, letterSpacing: '0.06em',
  textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6, display: 'block',
};

export function ScreenVincularPaciente({ onNav }: Props) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', cpf: '', lsxPatientId: '', planType: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError]   = useState('');

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const res = await adminApi.vincularPaciente({
        name: form.name.trim(),
        phone: form.phone.replace(/\D/g, ''),
        email: form.email.trim(),
        cpf: form.cpf.replace(/\D/g, ''),
        lsxPatientId: form.lsxPatientId.trim(),
        planType: form.planType || undefined,
      });
      setSuccess(`✓ ${res.message}`);
      setForm({ name: '', phone: '', email: '', cpf: '', lsxPatientId: '', planType: '' });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao vincular paciente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="sa-shell">
      <Sidebar active="vincular-paciente" onNav={onNav} />
      <main className="sa-main">
        <Topbar breadcrumb={['Pacientes', 'Vincular Paciente LSX']} />
        <div className="sa-content">
          <PageHeader
            title="Vincular Paciente LSX"
            subtitle="Registre no sistema um paciente que já existe no portal LSX/Meditele, permitindo o login por telefone."
          />

          {/* Instrução */}
          <div style={{ background: 'var(--blue-50, #eff6ff)', border: '1px solid var(--blue-200, #bfdbfe)', borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 13, fontWeight: 600, color: 'var(--ink-2)', lineHeight: 1.6 }}>
            <strong>Como obter o ID LSX do paciente:</strong><br />
            Acesse <a href="https://saudeagora.clinica.lsxmedical.com/pacientes" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>saudeagora.clinica.lsxmedical.com/pacientes</a> → clique no paciente → copie o UUID da URL (ex: <code style={{ background: 'var(--surface-2)', borderRadius: 4, padding: '1px 5px' }}>.../pacientes/a1b2c3d4-…</code>)
          </div>

          <div className="card" style={{ maxWidth: 600, padding: 28 }}>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={LABEL_STYLE}>Nome completo *</label>
                  <input style={FIELD_STYLE} value={form.name} onChange={set('name')} placeholder="Eduardo Sandoval Sá Cruz" required />
                </div>
                <div>
                  <label style={LABEL_STYLE}>Telefone (WhatsApp) *</label>
                  <input style={FIELD_STYLE} value={form.phone} onChange={set('phone')} placeholder="(87) 99209-7209" required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={LABEL_STYLE}>E-mail *</label>
                  <input style={FIELD_STYLE} type="email" value={form.email} onChange={set('email')} placeholder="email@exemplo.com" required />
                </div>
                <div>
                  <label style={LABEL_STYLE}>CPF *</label>
                  <input style={FIELD_STYLE} value={form.cpf} onChange={set('cpf')} placeholder="161.226.924-92" required />
                </div>
              </div>

              <div>
                <label style={LABEL_STYLE}>ID do Paciente no LSX *</label>
                <input style={FIELD_STYLE} value={form.lsxPatientId} onChange={set('lsxPatientId')} placeholder="a1b2c3d4-e5f6-7890-abcd-ef1234567890" required />
              </div>

              <div>
                <label style={LABEL_STYLE}>Plano (opcional)</label>
                <select style={FIELD_STYLE} value={form.planType} onChange={set('planType')}>
                  <option value="">— Sem plano vinculado —</option>
                  <option value="INDIVIDUAL">Individual — R$ 29,90/mês</option>
                  <option value="FAMILIAR">Familiar — R$ 59,90/mês</option>
                  <option value="AVULSO">Avulso — R$ 49,90</option>
                </select>
              </div>

              {error   && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#dc2626' }}>{error}</div>}
              {success && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#16a34a' }}>{success}</div>}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid var(--border)' }}>
                <button type="button" onClick={() => onNav('pacientes')}
                  style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink-2)' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  style={{ padding: '10px 24px', borderRadius: 8, border: 0, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: loading ? 'default' : 'pointer', fontFamily: 'inherit', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Vinculando…' : 'Vincular Paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
