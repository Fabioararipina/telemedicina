import axios from 'axios';

const BASE = 'https://saudeagora24h.com.br/api-backend';
const ADMIN_TOKEN = 'saude@admin2026';
const H = { 'x-admin-token': ADMIN_TOKEN };

/* ── Types ── */

// ApiPlan — usado dentro de ApiSubscription (Prisma retorna Decimal como string)
export interface ApiPlan {
  id: string;
  name: string;
  price: string;
  type: 'INDIVIDUAL' | 'FAMILIAR' | 'AVULSO' | 'CORTESIA' | string;
}

// AdminPlan — retornado pelo endpoint /api/admin/plans (price já convertido para number)
export interface AdminPlan {
  id: string;
  name: string;
  price: number;
  type: 'INDIVIDUAL' | 'FAMILIAR' | 'AVULSO' | 'CORTESIA' | string;
  description?: string | null;
  mediteleId?: string | null;
  active: boolean;
  activeSubscriptions: number;
  meditele?: MeditelePlan | null;
  // LP fields
  showOnLp: boolean;
  featured: boolean;
  originalPrice?: number | null;
  features?: string | null;   // JSON string
  ctaLabel?: string | null;
  periodLabel?: string | null;
  sortOrder: number;
}

// LpPlan — retornado pelo endpoint público /api/plans
export interface LpPlan {
  id: string;
  name: string;
  price: number;
  type: string;
  description?: string | null;
  mediteleId?: string | null;
  featured: boolean;
  originalPrice?: number | null;
  features: string[];
  ctaLabel?: string | null;
  periodLabel?: string | null;
  checkoutUrl?: string | null;
}

export interface MeditelePlan {
  id: string;
  label: string;
  description: string;
  monthlyPrice: string;
  isFree: boolean;
  maxDependents: number;
  type: string;
  active: boolean;
  checkoutUrl: string | null;
}

export interface ApiSubscription {
  id: string;
  status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'CANCELLED' | string;
  startDate: string;
  endDate: string | null;
  asaasSubscriptionId: string | null;
  plan: ApiPlan;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  cpf: string;
  phone: string | null;
  lsxToken: string | null;
  asaasCustomerId: string | null;
  createdAt: string;
  subscriptions: ApiSubscription[];
}

export interface AsaasPaymentItem {
  id: string;
  value: number;
  dueDate: string;
  status: string;
  description: string;
}

export interface AsaasSubscriptionItem {
  id: string;
  status: string;
  value: number;
  nextDueDate: string;
  cycle: string;
  description: string;
}

export interface AsaasFinancial {
  hasAsaas: boolean;
  asaasCustomerId?: string;
  subscriptions: AsaasSubscriptionItem[];
  pendingPayments: AsaasPaymentItem[];
  overduePayments: AsaasPaymentItem[];
  totalPending: number;
  totalOverdue: number;
}

export interface FinanceSummary {
  hasAsaas: boolean;
  mrr: number;
  overdueCount: number;
  overdueValue: number;
  pendingCount: number;
  pendingValue: number;
  receivedCount: number;
  receivedValue: number;
  totalCount: number;
}

export interface FinancePayment {
  id: string;
  asaasCustomerId: string;
  customerName: string;
  customerPhone: string | null;
  localUserId: string | null;
  plan: string;
  planType: string;
  value: number;
  dueDate: string;
  status: string;
  daysLate: number;
  billingType: string;
  invoiceUrl: string | null;
  paymentDate: string | null;
}

export interface FinancePaymentsResult {
  data: FinancePayment[];
  totalCount: number;
  hasMore: boolean;
}

export interface ApiEmployee {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
  totalSales: number;
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

  syncLsxPreview: () =>
    axios.get(`${BASE}/api/admin/sync-lsx/preview`, { headers: H }).then(r => r.data),

  syncLsx: () =>
    axios.post(`${BASE}/api/admin/sync-lsx`, {}, { headers: H }).then(r => r.data),

  vincularPaciente: (data: {
    name: string; phone: string; email: string; cpf: string;
    lsxPatientId: string; planType?: string;
  }) =>
    axios.post<{ message: string; userId: string }>(
      `${BASE}/api/admin/vincular-paciente`, data, { headers: H }
    ).then(r => r.data),

  createPatient: (data: {
    name: string; email: string; cpf: string; phone?: string; planType?: string;
  }) =>
    axios.post<{ message: string; userId: string; mediteleStatus: string }>(
      `${BASE}/api/admin/create-patient`, data, { headers: H }
    ).then(r => r.data),

  getPlans: () =>
    axios.get<AdminPlan[]>(`${BASE}/api/admin/plans`, { headers: H }).then(r => r.data),

  createPlan: (data: { name: string; price: number; type: string; description?: string; mediteleId?: string }) =>
    axios.post<AdminPlan>(`${BASE}/api/admin/plans`, data, { headers: H }).then(r => r.data),

  getMeditelePlans: () =>
    axios.get<MeditelePlan[]>(`${BASE}/api/admin/plans/meditele`, { headers: H }).then(r => r.data),

  updatePlan: (id: string, data: Partial<{
    name: string; price: number; type: string; description: string; mediteleId: string; active: boolean;
    showOnLp: boolean; featured: boolean; originalPrice: number | null;
    features: string; ctaLabel: string; periodLabel: string; sortOrder: number;
  }>) =>
    axios.put<AdminPlan>(`${BASE}/api/admin/plans/${id}`, data, { headers: H }).then(r => r.data),

  getPublicPlans: () =>
    axios.get<LpPlan[]>(`${BASE}/api/plans`).then(r => r.data),

  updateUser: (id: string, data: { name?: string; email?: string; phone?: string }) =>
    axios.put<{ message: string }>(`${BASE}/api/admin/users/${id}`, data, { headers: H }).then(r => r.data),

  updateSubscriptionStatus: (userId: string, status: 'ACTIVE' | 'PENDING' | 'SUSPENDED' | 'CANCELLED') =>
    axios.post<{ message: string; asaasResult: string }>(
      `${BASE}/api/admin/users/${userId}/subscription/status`,
      { status },
      { headers: H },
    ).then(r => r.data),

  deleteUser: (id: string) =>
    axios.delete<{ message: string }>(`${BASE}/api/admin/users/${id}`, { headers: H }).then(r => r.data),

  getFinancial: (userId: string) =>
    axios.get<AsaasFinancial>(`${BASE}/api/admin/users/${userId}/financial`, { headers: H }).then(r => r.data),

  getFinanceiroSummary: () =>
    axios.get<FinanceSummary>(`${BASE}/api/admin/financeiro/summary`, { headers: H }).then(r => r.data),

  getFinanceiroPayments: (status?: string, offset = 0, limit = 10) =>
    axios.get<FinancePaymentsResult>(`${BASE}/api/admin/financeiro/payments`, {
      headers: H,
      params: { ...(status ? { status } : {}), offset, limit },
    }).then(r => r.data),

  // ── Employees ──────────────────────────────────────────────────────────
  getEmployees: () =>
    axios.get<ApiEmployee[]>(`${BASE}/api/admin/employees`, { headers: H }).then(r => r.data),

  createEmployee: (data: { name: string; email: string; password: string; role?: string }) =>
    axios.post<ApiEmployee>(`${BASE}/api/admin/employees`, data, { headers: H }).then(r => r.data),

  updateEmployee: (id: string, data: { name?: string; email?: string; password?: string; role?: string; active?: boolean }) =>
    axios.put<ApiEmployee>(`${BASE}/api/admin/employees/${id}`, data, { headers: H }).then(r => r.data),

  getEmployeeSales: (id: string, offset = 0, limit = 20) =>
    axios.get(`${BASE}/api/admin/employees/${id}/sales`, {
      headers: H, params: { offset, limit },
    }).then(r => r.data),
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
