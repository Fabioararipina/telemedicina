import axios from 'axios';

const BASE = 'https://saudeagora24h.com.br/api-backend';
const ADMIN_TOKEN = 'saude@admin2026';
const H = { 'x-admin-token': ADMIN_TOKEN };

/* ── Types ── */

export interface ApiPlan {
  id: string;
  name: string;
  price: string; // Decimal as string from Prisma
  type: 'INDIVIDUAL' | 'FAMILIAR' | 'AVULSO' | string;
}

export interface ApiSubscription {
  id: string;
  status: 'ACTIVE' | 'PENDING' | string;
  startDate: string;
  endDate: string | null;
  plan: ApiPlan;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string | null;
  lsxToken: string | null;
  createdAt: string;
  subscriptions: ApiSubscription[];
}

export interface ApiLead {
  id: string;
  name: string;
  phone: string;
  plan: string;
  createdAt: string;
}

/* ── API calls ── */

export const adminApi = {
  getUsers: () =>
    axios.get<ApiUser[]>(`${BASE}/api/admin/users`, { headers: H }).then(r => r.data),

  getLeads: () =>
    axios.get<ApiLead[]>(`${BASE}/api/admin/leads`, { headers: H }).then(r => r.data),

  getLeadsCount: () =>
    axios.get<{ count: number; remaining: number }>(`${BASE}/api/leads/count`).then(r => r.data),

  dispararLancamento: () =>
    axios.post<{ message: string; total: number; enviados: number; erros: number }>(
      `${BASE}/api/admin/disparar-lancamento`, {}, { headers: H }
    ).then(r => r.data),

  getMagicLink: (userId: string) =>
    axios.post<{ magicLink: string }>(
      `${BASE}/api/admin/users/${userId}/magic-link`, {}, { headers: H }
    ).then(r => r.data),
};

/* ── Helpers ── */

const PLAN_LABEL: Record<string, string> = {
  INDIVIDUAL: 'Individual',
  FAMILIAR: 'Familiar',
  AVULSO: 'Avulso',
};

const PLAN_TONE: Record<string, string> = {
  INDIVIDUAL: 'muted',
  FAMILIAR: 'info',
  AVULSO: 'success',
};

export function userActiveSub(user: ApiUser): ApiSubscription | undefined {
  return user.subscriptions.find(s => s.status === 'ACTIVE')
    ?? user.subscriptions.find(s => s.status === 'PENDING')
    ?? user.subscriptions[0];
}

export function userStatus(user: ApiUser): 'ativo' | 'pendente' | 'inativo' {
  const sub = user.subscriptions[0];
  if (!sub) return 'inativo';
  if (sub.status === 'ACTIVE') return 'ativo';
  if (sub.status === 'PENDING') return 'pendente';
  return 'inativo';
}

export function mapUserToRow(user: ApiUser, index: number) {
  const sub = userActiveSub(user);
  const planType = sub?.plan?.type ?? 'INDIVIDUAL';
  const status = userStatus(user);
  return {
    id: `AS-${String(index + 1).padStart(4, '0')}`,
    rawId: user.id,
    lsxToken: user.lsxToken,
    name: user.name,
    cpf: user.cpf,
    phone: user.phone ?? '—',
    plan: PLAN_LABEL[planType] ?? planType,
    planType,
    planTone: PLAN_TONE[planType] ?? 'muted',
    status,
    since: new Date(user.createdAt).toLocaleDateString('pt-BR'),
    value: sub ? `R$ ${parseFloat(sub.plan.price).toFixed(2).replace('.', ',')}` : '—',
    init: user.name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase(),
  };
}

export interface DashboardStats {
  total: number;
  active: number;
  pending: number;
  newToday: number;
  newThisWeek: number;
  mrr: number;
  ticketMedio: number;
  planCounts: { FAMILIAR: number; INDIVIDUAL: number; AVULSO: number };
}

export function computeStats(users: ApiUser[]): DashboardStats {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const active = users.filter(u => u.subscriptions.some(s => s.status === 'ACTIVE')).length;
  const pending = users.filter(u => u.subscriptions.some(s => s.status === 'PENDING')).length;
  const newToday = users.filter(u => new Date(u.createdAt) >= today).length;
  const newThisWeek = users.filter(u => new Date(u.createdAt) >= weekAgo).length;

  let mrr = 0;
  const planCounts = { FAMILIAR: 0, INDIVIDUAL: 0, AVULSO: 0 };

  users.forEach(u => {
    const sub = u.subscriptions.find(s => s.status === 'ACTIVE');
    if (sub) {
      mrr += parseFloat(sub.plan.price);
      const t = sub.plan.type as keyof typeof planCounts;
      if (t in planCounts) planCounts[t]++;
    }
  });

  const ticketMedio = active > 0 ? mrr / active : 0;

  return { total: users.length, active, pending, newToday, newThisWeek, mrr, ticketMedio, planCounts };
}

export function fmtBRL(n: number): string {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
