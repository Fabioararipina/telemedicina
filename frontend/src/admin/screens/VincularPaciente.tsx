import { useState, useEffect } from 'react';
import axios from 'axios';
import { Sidebar, Topbar, PageHeader } from '../shell';

interface Props { onNav: (id: string) => void; }

const BASE = 'https://saudeagora24h.com.br/api-backend';
const H = { 'x-admin-token': 'saude@admin2026' };

interface Preview {
  lsxTotal: number;
  localTotal: number;
  toCreate: number;
  toUpdate: number;
  synced: number;
}

interface SyncResult {
  message: string;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export function ScreenVincularPaciente({ onNav }: Props) {
  const [preview, setPreview]       = useState<Preview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [syncing, setSyncing]       = useState(false);
  const [result, setResult]         = useState<SyncResult | null>(null);
  const [error, setError]           = useState('');

  const loadPreview = () => {
    setLoadingPreview(true);
    setResult(null);
    setError('');
    axios.get<Preview>(`${BASE}/api/admin/sync-lsx/preview`, { headers: H })
      .then(r => setPreview(r.data))
      .catch(() => setError('Erro ao conectar com a Meditele.'))
      .finally(() => setLoadingPreview(false));
  };

  useEffect(() => { loadPreview(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    setError('');
    try {
      const r = await axios.post<SyncResult>(`${BASE}/api/admin/sync-lsx`, {}, { headers: H });
      setResult(r.data);
      loadPreview();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Erro durante a sincronização.');
    } finally {
      setSyncing(false);
    }
  };

  const statBox = (label: string, value: number | string, color: string) => (
    <div style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 10, padding: '18px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 32, fontWeight: 900, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-3)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
    </div>
  );

  return (
    <div className="sa-shell">
      <Sidebar active="vincular-paciente" onNav={onNav} />
      <main className="sa-main">
        <Topbar breadcrumb={['Pacientes', 'Sincronização Meditele']} />
        <div className="sa-content">
          <PageHeader
            title="Sincronização Meditele"
            subtitle="Mantém o sistema sincronizado com os pacientes cadastrados no portal de telemedicina."
          />

          {/* Status cards */}
          {loadingPreview ? (
            <div style={{ color: 'var(--ink-3)', fontWeight: 700, fontSize: 14 }}>Consultando Meditele…</div>
          ) : preview && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
                {statBox('Na Meditele', preview.lsxTotal, 'var(--accent)')}
                {statBox('No sistema', preview.localTotal, 'var(--ink)')}
                {statBox('Sincronizados', preview.synced, '#16a34a')}
                {statBox('Pendentes', preview.toCreate + preview.toUpdate, preview.toCreate + preview.toUpdate > 0 ? '#d97706' : '#16a34a')}
              </div>

              {/* Detalhes do que será feito */}
              {(preview.toCreate > 0 || preview.toUpdate > 0) && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 13, fontWeight: 600, color: '#92400e', lineHeight: 1.8 }}>
                  {preview.toCreate > 0 && <div>• <strong>{preview.toCreate}</strong> paciente(s) da Meditele serão importados para o sistema</div>}
                  {preview.toUpdate > 0 && <div>• <strong>{preview.toUpdate}</strong> paciente(s) existentes receberão o ID Meditele vinculado</div>}
                </div>
              )}

              {preview.toCreate === 0 && preview.toUpdate === 0 && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 18px', marginBottom: 24, fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
                  ✓ Tudo sincronizado — nenhuma ação necessária.
                </div>
              )}
            </>
          )}

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#dc2626', marginBottom: 20 }}>{error}</div>
          )}

          {/* Resultado da última sync */}
          {result && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '16px 20px', marginBottom: 24, fontSize: 13, fontWeight: 600, color: '#166534', lineHeight: 1.8 }}>
              <div style={{ fontWeight: 800, marginBottom: 4 }}>✓ Sincronização concluída</div>
              <div>• {result.created} paciente(s) importados</div>
              <div>• {result.updated} paciente(s) atualizados</div>
              <div>• {result.skipped} já estavam sincronizados</div>
              {result.errors.length > 0 && (
                <div style={{ marginTop: 8, color: '#dc2626' }}>⚠ {result.errors.length} erro(s): {result.errors.slice(0, 3).join(', ')}</div>
              )}
            </div>
          )}

          {/* Botões */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={loadPreview} disabled={loadingPreview}
              style={{ padding: '10px 20px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink-2)', opacity: loadingPreview ? 0.6 : 1 }}>
              {loadingPreview ? 'Atualizando…' : '↻ Atualizar status'}
            </button>

            {preview && (preview.toCreate + preview.toUpdate > 0) && (
              <button onClick={handleSync} disabled={syncing}
                style={{ padding: '10px 24px', borderRadius: 8, border: 0, background: 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 800, cursor: syncing ? 'default' : 'pointer', fontFamily: 'inherit', opacity: syncing ? 0.7 : 1 }}>
                {syncing ? 'Sincronizando…' : `Sincronizar agora (${preview.toCreate + preview.toUpdate})`}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
