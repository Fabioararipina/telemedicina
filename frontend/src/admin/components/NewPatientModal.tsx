import { useState } from 'react';
import { Ic } from '../icons';
import { adminApi } from '../api';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

interface Form {
  name: string; email: string; cpf: string; phone: string; planType: string;
}

const EMPTY: Form = { name: '', email: '', cpf: '', phone: '', planType: 'INDIVIDUAL' };

export function NewPatientModal({ open, onClose, onCreated }: Props) {
  const [form, setForm]     = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [ok, setOk]         = useState('');

  if (!open) return null;

  const close = () => { if (!saving) { setForm(EMPTY); setError(''); setOk(''); onClose(); } };

  const set = (k: keyof Form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.cpf.trim()) {
      setError('Nome, e-mail e CPF são obrigatórios.'); return;
    }
    setSaving(true); setError(''); setOk('');
    try {
      const r = await adminApi.createPatient({
        name:     form.name.trim(),
        email:    form.email.trim(),
        cpf:      form.cpf.replace(/\D/g, ''),
        phone:    form.phone.replace(/\D/g, '') || undefined,
        planType: form.planType || undefined,
      });
      const mediteleOk = r.mediteleStatus === 'CREATED';
      const asaasMap: Record<string, string> = {
        ASSINATURA_CRIADA: '✓ Assinatura gerada no Asaas',
        PAGAMENTO_CRIADO:  '✓ Cobrança avulsa gerada no Asaas',
        CLIENTE_CRIADO:    '✓ Cliente criado no Asaas (sem plano)',
        ERRO_ASAAS:        '⚠ Erro ao criar cobrança no Asaas',
        SEM_CHAVE:         '⚠ Chave Asaas não configurada',
      };
      const asaasMsg = asaasMap[(r as any).asaasStatus ?? ''] ?? '';
      const mediteleMsg = mediteleOk
        ? '✓ Sincronizado com a Meditele'
        : '⚠ Meditele não respondeu — sincronize depois';
      setOk(`Paciente criado!\n${mediteleMsg}${asaasMsg ? `\n${asaasMsg}` : ''}`);
      onCreated?.();
      setTimeout(() => { setForm(EMPTY); setOk(''); onClose(); }, 2200);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erro ao criar paciente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div style={{ background: 'var(--surface)', borderRadius: 14, width: '100%', maxWidth: 480, boxShadow: '0 24px 60px rgba(0,0,0,0.18)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900 }}>Novo paciente</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600, marginTop: 2 }}>Cadastra no sistema e sincroniza com a Meditele</div>
          </div>
          <button onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', padding: 4, borderRadius: 6 }}>
            <Ic.x />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'grid', gap: 14 }}>
          <Field label="Nome completo *" value={form.name}  onChange={set('name')}  placeholder="Ex: João da Silva" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="CPF *"     value={form.cpf}   onChange={set('cpf')}   placeholder="000.000.000-00" mono />
            <Field label="Telefone"  value={form.phone} onChange={set('phone')} placeholder="(87) 9 0000-0000" mono />
          </div>
          <Field label="E-mail *" value={form.email} onChange={set('email')} placeholder="paciente@email.com" type="email" />
          <div>
            <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Plano</label>
            <select className="select" style={{ width: '100%' }} value={form.planType} onChange={e => set('planType')(e.target.value)}>
              <option value="INDIVIDUAL">Individual — R$ 29,90/mês</option>
              <option value="FAMILIAR">Familiar — R$ 59,90/mês</option>
              <option value="AVULSO">Avulso — R$ 39,90/mês</option>
            </select>
          </div>

          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#dc2626' }}>{error}</div>}
          {ok    && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#16a34a', whiteSpace: 'pre-line', lineHeight: 1.6 }}>{ok}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={close} disabled={saving}>Cancelar</button>
          <button className="btn btn-primary"   onClick={handleCreate} disabled={saving}>
            {saving ? 'Criando…' : <><Ic.plus />Criar paciente</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = 'text', mono }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; mono?: boolean;
}) {
  return (
    <div>
      <label style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>{label}</label>
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
