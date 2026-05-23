import React from 'react';
import { Ic } from './icons';
import { Sparkline } from './charts';
import logoUrl from '../assets/logo.jpeg';

/* ── Sidebar ── */
interface NavItem {
  id: string;
  label: string;
  icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactElement;
  badge?: string;
  alert?: boolean;
}

interface SidebarProps {
  active: string;
  onNav: (id: string) => void;
}

export function Sidebar({ active, onNav }: SidebarProps) {
  const nav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: Ic.dashboard },
    { id: 'pacientes', label: 'Pacientes', icon: Ic.users, badge: '1.247' },
    { id: 'planos', label: 'Planos', icon: Ic.plans },
  ];
  const navFin: NavItem[] = [
    { id: 'receber', label: 'Contas a Receber', icon: Ic.finance, alert: true, badge: '32' },
    { id: 'pagar', label: 'Contas a Pagar', icon: Ic.finance },
    { id: 'gateway', label: 'Gateway', icon: Ic.finance },
  ];
  const navReports: NavItem[] = [
    { id: 'rep-comercial', label: 'Comercial', icon: Ic.reports },
    { id: 'rep-financeiro', label: 'Financeiro', icon: Ic.reports },
    { id: 'rep-operacional', label: 'Operacional', icon: Ic.reports },
  ];
  const navMisc: NavItem[] = [
    { id: 'vincular-paciente', label: 'Vincular Paciente LSX', icon: Ic.users },
    { id: 'parceiros', label: 'Parceiros & Cupons', icon: Ic.partners },
    { id: 'usuarios', label: 'Usuários', icon: Ic.users },
    { id: 'config', label: 'Configurações', icon: Ic.settings },
  ];

  return (
    <aside className="sa-sidebar">
      <div className="logo-block">
        <img src={logoUrl} alt="Saúde Agora 24h" />
        <div>
          <div className="name">Saúde Agora</div>
          <div className="tag">Gestão · 24h</div>
        </div>
      </div>

      <NavGroup label="Geral" items={nav} active={active} onNav={onNav} />
      <NavGroup label="Financeiro" items={navFin} active={active} onNav={onNav} />
      <NavGroup label="Relatórios" items={navReports} active={active} onNav={onNav} />
      <NavGroup label="Outros" items={navMisc} active={active} onNav={onNav} />

      <div className="user-block">
        <div className="avatar">RM</div>
        <div style={{ minWidth: 0 }}>
          <div className="name">Rafael Moura</div>
          <div className="role">Diretor Comercial</div>
        </div>
      </div>
    </aside>
  );
}

function NavGroup({ label, items, active, onNav }: { label: string; items: NavItem[]; active: string; onNav: (id: string) => void }) {
  return (
    <div>
      <div className="group-label">{label}</div>
      <nav style={{ display: 'grid', gap: 2 }}>
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.id} className={`sa-navitem ${active === it.id ? 'active' : ''} ${it.alert ? 'alert' : ''}`} onClick={() => onNav(it.id)}>
              <span className="icon"><Icon /></span>
              <span>{it.label}</span>
              {it.badge && <span className="badge">{it.badge}</span>}
            </div>
          );
        })}
      </nav>
    </div>
  );
}

/* ── Topbar ── */
interface TopbarProps {
  breadcrumb: string[];
  search?: string;
  actions?: React.ReactNode;
  notif?: number;
}

export function Topbar({ breadcrumb, search = 'Buscar paciente, lead, CPF…', actions, notif = 3 }: TopbarProps) {
  return (
    <div className="sa-topbar">
      <div className="breadcrumb">
        {breadcrumb.map((b, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            <span style={{ color: i === breadcrumb.length - 1 ? 'var(--ink)' : undefined, fontWeight: i === breadcrumb.length - 1 ? 800 : 700 }}>{b}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="right">
        <div className="sa-search">
          <Ic.search />
          <input placeholder={search} />
        </div>
        <span className="kbd">⌘K</span>
        <div className="sa-icon-btn">
          <Ic.bell />
          {notif > 0 && <span className="dot" />}
        </div>
        {actions}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8, borderLeft: '1px solid var(--border)' }}>
          <div className="avatar-init">RM</div>
          <Ic.chev style={{ color: 'var(--ink-3)' }} />
        </div>
      </div>
    </div>
  );
}

/* ── Page Header ── */
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="sa-page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <div className="subtitle">{subtitle}</div>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

/* ── KPI Card ── */
interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  trend?: string;
  trendDir?: 'up' | 'down' | 'neutral';
  spark?: React.ReactNode;
  accent?: string;
}

export function KpiCard({ label, value, sub, trend, trendDir = 'up', spark, accent = 'var(--accent)' }: KpiCardProps) {
  const trendColor = trendDir === 'up' ? 'var(--green-600)' : trendDir === 'down' ? 'var(--red-500)' : 'var(--ink-3)';
  return (
    <div className="card" style={{ padding: 18, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 18, bottom: 18, width: 3, background: accent, borderRadius: '0 3px 3px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>{label}</div>
          <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.02em', marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, fontWeight: 600 }}>{sub}</div>}
        </div>
        {spark && <div style={{ flex: 'none' }}>{spark}</div>}
      </div>
      {trend && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 800, color: trendColor }}>
          {trendDir === 'up' ? <Ic.arrowUp /> : <Ic.arrowDown />}
          <span>{trend}</span>
          <span style={{ color: 'var(--ink-3)', fontWeight: 600 }}>vs mês anterior</span>
        </div>
      )}
    </div>
  );
}

/* ── Re-export Sparkline for convenience ── */
export { Sparkline };
