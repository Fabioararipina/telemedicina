import { useState } from 'react';
import './admin.css';
import { Sidebar, Topbar } from './shell';
import { ScreenLogin } from './screens/Login';
import { ScreenDashboard } from './screens/Dashboard';
import { ScreenPacientes, ScreenPacienteDetail } from './screens/Pacientes';
import { ScreenReceber } from './screens/Financeiro';
import { ScreenRelatorio } from './screens/Relatorio';
import { ScreenVincularPaciente } from './screens/VincularPaciente';
import type { ApiUser } from './api';

type ScreenId =
  | 'login'
  | 'dashboard'
  | 'pacientes'
  | 'paciente-detail'
  | 'vincular-paciente'
  | 'receber'
  | 'pagar'
  | 'gateway'
  | 'rep-comercial'
  | 'rep-financeiro'
  | 'rep-operacional'
  | 'planos'
  | 'parceiros'
  | 'usuarios'
  | 'config';

export default function AdminApp() {
  const [screen, setScreen]           = useState<ScreenId>('dashboard');
  const [selectedUser, setSelectedUser] = useState<ApiUser | null>(null);

  const nav = (id: string) => setScreen(id as ScreenId);

  const KNOWN: ScreenId[] = ['login', 'dashboard', 'pacientes', 'paciente-detail', 'vincular-paciente', 'receber', 'rep-financeiro'];

  return (
    <div className="sa-app" style={{ minHeight: '100vh' }}>
      {screen === 'login'           && <ScreenLogin onNav={nav} />}
      {screen === 'dashboard'       && <ScreenDashboard onNav={nav} />}
      {screen === 'pacientes'       && <ScreenPacientes onNav={nav} onSelectUser={setSelectedUser} />}
      {screen === 'paciente-detail' && <ScreenPacienteDetail onNav={nav} user={selectedUser} />}
      {screen === 'vincular-paciente' && <ScreenVincularPaciente onNav={nav} />}
      {screen === 'receber'         && <ScreenReceber onNav={nav} />}
      {screen === 'rep-financeiro'  && <ScreenRelatorio onNav={nav} />}
      {!KNOWN.includes(screen)      && <PlaceholderScreen screen={screen} onNav={nav} />}
    </div>
  );
}

function PlaceholderScreen({ screen, onNav }: { screen: string; onNav: (id: string) => void }) {
  const label = screen.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return (
    <div className="sa-shell">
      <Sidebar active={screen} onNav={onNav} />
      <main className="sa-main">
        <Topbar breadcrumb={[label]} />
        <div className="sa-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
          <div style={{ textAlign: 'center', color: 'var(--ink-3)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink-2)', marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Em desenvolvimento</div>
          </div>
        </div>
      </main>
    </div>
  );
}
