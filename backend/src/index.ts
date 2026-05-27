import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import path from 'path';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'saude-agora-jwt-2026';

// ── JWT middleware para vendedores ──────────────────────────────────────────
interface EmployeePayload { id: string; role: string; name: string; }
function employeeAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) { res.status(401).json({ error: 'Token não fornecido.' }); return; }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as EmployeePayload;
    (req as any).employee = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
}
function supervisorAuth(req: Request, res: Response, next: NextFunction) {
  employeeAuth(req, res, () => {
    const emp = (req as any).employee as EmployeePayload;
    if (emp.role === 'VENDEDOR') { res.status(403).json({ error: 'Acesso negado.' }); return; }
    next();
  });
}

// Meditele API config
const MEDITELE_API_URL = process.env.MEDITELE_API_URL || 'https://gateway.meditele.com.br';
const MEDITELE_CLINIC_ID = process.env.MEDITELE_CLINIC_ID || '';
const MEDITELE_API_KEY = process.env.MEDITELE_API_KEY || '';

// ── Asaas config ──────────────────────────────────────────────────────────────
// Lê do banco (Config table) primeiro, cai no .env como fallback
async function getAsaasConfig(): Promise<{ apiKey: string; apiUrl: string; env: string }> {
  const [keyRec, envRec] = await Promise.all([
    prisma.config.findUnique({ where: { key: 'ASAAS_API_KEY' } }).catch(() => null),
    prisma.config.findUnique({ where: { key: 'ASAAS_ENV'    } }).catch(() => null),
  ]);
  const env    = envRec?.value || process.env.ASAAS_ENV    || 'sandbox';
  const apiKey = keyRec?.value || process.env.ASAAS_API_KEY || '';
  const apiUrl = env === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';
  return { apiKey, apiUrl, env };
}

const PLAN_LABELS: Record<string, string> = {
  INDIVIDUAL: 'Plano Individual',
  FAMILIAR:   'Plano Familiar',
  AVULSO:     'Consulta Avulsa 30 dias',
  CORTESIA:   'Cortesia 30 dias',
};

type AsaasCfg = { apiKey: string; apiUrl: string; env: string };

/** Cria ou reutiliza cliente na Asaas. Retorna o customerId. */
async function getOrCreateAsaasCustomer(
  data: { name: string; cpfCnpj: string; email: string; phone?: string },
  cfg: AsaasCfg,
): Promise<string | null> {
  const h = { access_token: cfg.apiKey, 'Content-Type': 'application/json' };
  try {
    const search = await axios.get(`${cfg.apiUrl}/customers`, {
      headers: h,
      params: { cpfCnpj: data.cpfCnpj.replace(/\D/g, ''), limit: 1 },
    });
    const existing = search.data?.data?.[0];
    if (existing) {
      console.log(`[ASAAS] Cliente já existe: ${existing.id}`);
      return existing.id as string;
    }
    const res = await axios.post(`${cfg.apiUrl}/customers`, {
      name:        data.name,
      cpfCnpj:    data.cpfCnpj.replace(/\D/g, ''),
      email:       data.email,
      mobilePhone: data.phone?.replace(/\D/g, '') || undefined,
    }, { headers: h });
    console.log(`[ASAAS] Cliente criado: ${res.data.id}`);
    return res.data.id as string;
  } catch (err: any) {
    console.error('[ASAAS] Erro ao criar cliente:', err.response?.data ?? err.message);
    return null;
  }
}

/** Cria assinatura recorrente mensal (INDIVIDUAL, FAMILIAR). */
async function createAsaasSubscription(
  customerId: string, value: number, planType: string, cfg: AsaasCfg,
): Promise<{ asaasId: string; invoiceUrl: string } | null> {
  const h = { access_token: cfg.apiKey, 'Content-Type': 'application/json' };
  try {
    const nextDue = new Date();
    nextDue.setDate(nextDue.getDate() + 1);
    const nextDueDate = nextDue.toISOString().slice(0, 10);

    const sub = await axios.post(`${cfg.apiUrl}/subscriptions`, {
      customer:    customerId,
      billingType: 'UNDEFINED',
      value,
      nextDueDate,
      cycle:       'MONTHLY',
      description: `${PLAN_LABELS[planType] ?? planType} - Saúde Agora 24h`,
    }, { headers: h });

    const asaasId = sub.data.id as string;

    await new Promise(r => setTimeout(r, 800));
    const pays = await axios.get(
      `${cfg.apiUrl}/subscriptions/${asaasId}/payments`,
      { headers: h },
    );
    const firstPay = pays.data?.data?.[0];
    const invoiceUrl: string =
      firstPay?.invoiceUrl ??
      `${cfg.env === 'production' ? 'https://www.asaas.com' : 'https://sandbox.asaas.com'}/i/${firstPay?.id ?? ''}`;

    console.log(`[ASAAS] Assinatura criada: ${asaasId} | link: ${invoiceUrl}`);
    return { asaasId, invoiceUrl };
  } catch (err: any) {
    console.error('[ASAAS] Erro ao criar assinatura:', err.response?.data ?? err.message);
    return null;
  }
}

/** Cria pagamento avulso 30 dias (AVULSO). */
async function createAsaasPayment(
  customerId: string, value: number, planType: string, cfg: AsaasCfg,
): Promise<{ asaasId: string; invoiceUrl: string } | null> {
  const h = { access_token: cfg.apiKey, 'Content-Type': 'application/json' };
  try {
    const due = new Date();
    due.setDate(due.getDate() + 1);
    const dueDate = due.toISOString().slice(0, 10);

    const pay = await axios.post(`${cfg.apiUrl}/payments`, {
      customer:    customerId,
      billingType: 'UNDEFINED',
      value,
      dueDate,
      description: `${PLAN_LABELS[planType] ?? planType} - Saúde Agora 24h`,
    }, { headers: h });

    const asaasId   = pay.data.id as string;
    const invoiceUrl: string =
      pay.data.invoiceUrl ??
      `${cfg.env === 'production' ? 'https://www.asaas.com' : 'https://sandbox.asaas.com'}/i/${asaasId}`;

    console.log(`[ASAAS] Pagamento avulso criado: ${asaasId} | link: ${invoiceUrl}`);
    return { asaasId, invoiceUrl };
  } catch (err: any) {
    console.error('[ASAAS] Erro ao criar pagamento:', err.response?.data ?? err.message);
    return null;
  }
}

// URLs de checkout por plano (Meditele portal)
const MEDITELE_CHECKOUT_URLS: Record<string, string> = {
  INDIVIDUAL:  `https://saudeagora.paciente.lsxmedical.com/assinar?clinicId=${MEDITELE_CLINIC_ID}&planId=f046ae38-010a-41c0-867c-3b3c1f7bb6a1`,
  FAMILIAR:    `https://saudeagora.paciente.lsxmedical.com/assinar?clinicId=${MEDITELE_CLINIC_ID}&planId=bc95c87d-9ad4-458f-b641-01253e131c19`,
  AVULSO:      `https://saudeagora.paciente.lsxmedical.com/assinar?clinicId=${MEDITELE_CLINIC_ID}&planId=65ed3333-d589-46b5-9a40-0ceb27072544`,
};

const mediteleHeaders = {
  'x-api-key': MEDITELE_API_KEY,
  'Content-Type': 'application/json',
};

// Cria paciente na Meditele e retorna o ID gerado
const createMeditelePatient = async (data: {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  birthDate: string;  // YYYY-MM-DD
  gender: string;     // 'male' | 'female'
}): Promise<string | null> => {
  try {
    const res = await axios.post(
      `${MEDITELE_API_URL}/clinic/patient`,
      { ...data, clinicId: MEDITELE_CLINIC_ID },
      { headers: mediteleHeaders }
    );
    const patientId = res.data?.id || res.data?.patientId || res.data?.data?.id;
    console.log(`[MEDITELE] Paciente criado: ${patientId}`);
    return patientId ?? null;
  } catch (err: any) {
    console.error('[MEDITELE] Falha ao criar paciente:', err.response?.data || err.message);
    return null;
  }
};

// Busca paciente na Meditele por telefone — retorna o ID do paciente ou null
const findPatientByPhone = async (phone: string): Promise<string | null> => {
  try {
    const clean = phone.replace(/\D/g, '');
    const res = await axios.get(
      `${MEDITELE_API_URL}/clinic/patients/paginated`,
      { headers: mediteleHeaders, params: { phone: clean, limit: 1 } }
    );
    const patient = res.data?.data?.attributes?.[0];
    return patient?.id ?? null;
  } catch (err: any) {
    console.error('[MEDITELE] Falha ao buscar paciente por telefone:', err.response?.data || err.message);
    return null;
  }
};

// Gera magic link de acesso do paciente (expira em 5 minutos — gerar só na hora de enviar)
const getMagicLink = async (patientId: string): Promise<string | null> => {
  try {
    const res = await axios.post(
      `${MEDITELE_API_URL}/auth/patients/${patientId}/login-token`,
      {},
      { headers: mediteleHeaders }
    );
    const loginUrl = res.data?.data?.loginUrls?.[0]?.loginUrl;
    if (!loginUrl) {
      console.error('[MEDITELE] loginUrl não encontrado na resposta:', JSON.stringify(res.data));
      return null;
    }
    return loginUrl;
  } catch (err: any) {
    console.error('[MEDITELE] Falha ao gerar magic link:', err.response?.data || err.message);
    return null;
  }
};

// Serviço de Notificação — substitua pela sua API de WhatsApp (Evolution, Z-API, etc.)
const sendNotification = async (phone: string, message: string) => {
  console.log(`\n[NOTIFICAÇÃO WHATSAPP] Enviando para ${phone}:\n${message}\n`);
};

// --- ROTAS DE USUÁRIO E VENDAS ---

app.post('/api/checkout', async (req: Request, res: Response) => {
  const { name, email, cpf, phone, password, planType, planId, birthDate, gender } = req.body;

  if (!name || !email || !cpf || !password) {
    return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
  }

  try {
    // 1. Verifica duplicidade
    const existingUser = await prisma.user.findFirst({ where: { OR: [{ email }, { cpf }] } });
    if (existingUser) {
      return res.status(400).json({ error: 'E-mail ou CPF já cadastrado no sistema.' });
    }

    // 2. Cria usuário local (status PENDING até pagamento)
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, cpf, phone, passwordHash },
    });

    // 3. Associa ao plano — por planId (UUID ou ID custom) ou por planType
    let plan = planId
      ? await prisma.plan.findFirst({ where: { id: planId, active: true } })
      : null;

    if (!plan && planType) {
      // Tenta por tipo (INDIVIDUAL, FAMILIAR, etc.)
      plan = await prisma.plan.findFirst({
        where: { type: planType, active: true },
        orderBy: [{ showOnLp: 'desc' }, { sortOrder: 'desc' }, { createdAt: 'desc' }],
      });
      // Se não achou por tipo, tenta por ID (ex: 'plan-individual-promo')
      if (!plan) {
        plan = await prisma.plan.findFirst({ where: { id: planType, active: true } });
      }
    }

    // Tipo efetivo para uso no Asaas e notificações
    const effectivePlanType: string = plan?.type ?? planType ?? 'INDIVIDUAL';
    console.log(`[CHECKOUT] plan=${plan?.id ?? 'null'} type=${effectivePlanType} price=${plan?.price ?? 0}`);

    let localSub: { id: string } | null = null;
    if (plan) {
      localSub = await prisma.subscription.create({
        data: { userId: user.id, planId: plan.id, status: 'PENDING' },
      });
    }

    // 4. Cria paciente na Meditele (não bloqueia o checkout se falhar)
    const meditelePatientId = await createMeditelePatient({ name, cpf, email, phone: phone || '', birthDate: birthDate || '', gender: gender || '' });
    let magicLink: string | null = null;
    if (meditelePatientId) {
      await prisma.user.update({ where: { id: user.id }, data: { lsxToken: meditelePatientId } });
      magicLink = await getMagicLink(meditelePatientId);
    }

    // 5. Asaas — cria cliente + cobrança/assinatura
    let invoiceUrl: string | null = null;
    let asaasSubId: string | null = null;

    const asaasCfg = await getAsaasConfig();
    if (!asaasCfg.apiKey) {
      console.warn('[CHECKOUT] ASAAS_API_KEY não configurada — cobrança não gerada.');
    } else {
      const value = plan ? parseFloat((plan.price as any).toString()) : 0;
      if (value <= 0) {
        console.warn(`[CHECKOUT] Valor inválido (${value}) para plano ${plan?.id ?? 'null'} — cobrança Asaas ignorada.`);
      } else {
        const customerId = await getOrCreateAsaasCustomer({ name, cpfCnpj: cpf, email, phone }, asaasCfg);
        if (customerId) {
          await prisma.user.update({ where: { id: user.id }, data: { asaasCustomerId: customerId } });

          const isRecurring = effectivePlanType !== 'AVULSO' && effectivePlanType !== 'CORTESIA';
          console.log(`[ASAAS] Criando ${isRecurring ? 'assinatura' : 'pagamento avulso'} | cliente=${customerId} valor=${value} tipo=${effectivePlanType}`);

          const asaasResult = isRecurring
            ? await createAsaasSubscription(customerId, value, effectivePlanType, asaasCfg)
            : await createAsaasPayment(customerId, value, effectivePlanType, asaasCfg);

          if (asaasResult) {
            invoiceUrl = asaasResult.invoiceUrl;
            asaasSubId = asaasResult.asaasId;
            if (localSub) {
              await prisma.subscription.update({
                where: { id: localSub.id },
                data: { asaasSubscriptionId: asaasSubId },
              });
            }
          } else {
            console.error(`[ASAAS] Falha ao criar cobrança para userId=${user.id}`);
          }
        }
      }
    }

    // 6. Notificação WhatsApp
    const payMsg = invoiceUrl
      ? `\n\n💳 *Finalize seu pagamento aqui:*\n${invoiceUrl}`
      : '';
    const mediteleUrl = MEDITELE_CHECKOUT_URLS[effectivePlanType] ?? MEDITELE_CHECKOUT_URLS['INDIVIDUAL'];
    const accessMsg = magicLink
      ? `\n\n🔑 *Acesse sua conta (link válido por 5 min):*\n${magicLink}`
      : `\n\n🔑 *Acesse sua conta:*\n${mediteleUrl}`;

    await sendNotification(
      phone || 'Desconhecido',
      `Olá ${name}! 👋\n\nSeu cadastro no *Saúde Agora 24h* foi criado — plano *${plan?.name ?? PLAN_LABELS[effectivePlanType] ?? effectivePlanType}*.${payMsg}${accessMsg}\n\nQualquer dúvida, é só chamar! 😊`,
    );

    res.status(201).json({
      message: 'Cadastro realizado! Finalize o pagamento para ativar seu plano.',
      user: { id: user.id, name: user.name, email: user.email },
      invoiceUrl: invoiceUrl ?? undefined,
      magicLink:  magicLink  ?? undefined,
      mediteleStatus: meditelePatientId ? 'CREATED' : 'FAILED',
    });
  } catch (error) {
    console.error('[CHECKOUT ERROR]', error);
    res.status(500).json({ error: 'Erro interno ao processar cadastro.' });
  }
});

// --- ROTAS DE PARCEIROS E CUPONS ---

app.post('/api/partners', async (req: Request, res: Response) => {
  const { name, type, contact } = req.body;
  const partner = await prisma.partner.create({ data: { name, type, contact } });
  res.json(partner);
});

app.post('/api/coupons', async (req: Request, res: Response) => {
  const { code, discountDesc, partnerId } = req.body;
  const coupon = await prisma.coupon.create({
    data: { code, discountDesc, partnerId }
  });
  res.json(coupon);
});

app.post('/api/track-coupon', async (req: Request, res: Response) => {
  const { couponCode, userId, purchaseValue } = req.body;
  
  const coupon = await prisma.coupon.findUnique({ where: { code: couponCode }, include: { partner: true } });
  if (!coupon) return res.status(404).json({ error: 'Cupom inválido' });

  const usage = await prisma.couponUse.create({
    data: {
      couponId: coupon.id,
      userId,
      purchaseValue
    }
  });

  const commissionAmount = Number(purchaseValue) * 0.10; 
  await prisma.commission.create({
    data: {
      partnerId: coupon.partnerId,
      couponUseId: usage.id,
      amount: commissionAmount,
      status: 'PENDING'
    }
  });

  res.json({ message: 'Uso rastreado e comissão gerada!', commissionAmount });
});

// --- PRÉ-CADASTRO (LISTA DE LANÇAMENTO) ---

const VAGAS_LANCAMENTO = 50;

app.get('/api/leads/count', async (req: Request, res: Response) => {
  const count = await prisma.lead.count();
  res.json({ count, remaining: Math.max(0, VAGAS_LANCAMENTO - count) });
});

app.post('/api/pre-cadastro', async (req: Request, res: Response) => {
  const { name, phone, plan } = req.body;

  if (!name || !phone || !plan) {
    return res.status(400).json({ error: 'Preencha todos os campos.' });
  }

  const count = await prisma.lead.count();
  if (count >= VAGAS_LANCAMENTO) {
    return res.status(400).json({ error: 'As vagas da condição especial já foram preenchidas.' });
  }

  const existing = await prisma.lead.findUnique({ where: { phone } });
  if (existing) {
    return res.status(400).json({ error: 'Este WhatsApp já está na lista! Aguarde o contato.' });
  }

  await prisma.lead.create({ data: { name, phone, plan } });
  const newCount = await prisma.lead.count();

  res.status(201).json({
    message: 'Pré-cadastro realizado com sucesso!',
    remaining: Math.max(0, VAGAS_LANCAMENTO - newCount)
  });
});

app.get('/admin', (req: Request, res: Response) => {
  res.sendFile(path.resolve(__dirname, '../admin.html'));
});

// --- ROTAS ADMIN ---

const adminAuth = (req: Request, res: Response, next: Function) => {
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Não autorizado.' });
  }
  next();
};

app.get('/api/admin/leads', adminAuth, async (req: Request, res: Response) => {
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(leads);
});

app.get('/api/admin/users', adminAuth, async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    include: { subscriptions: { include: { plan: true } } }
  });
  res.json(users);
});

// Disparo de lançamento: envia WhatsApp com link de checkout para todos os leads
app.post('/api/admin/disparar-lancamento', adminAuth, async (req: Request, res: Response) => {
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'asc' } });
  let enviados = 0;
  let erros = 0;

  for (const lead of leads) {
    try {
      const checkoutUrl = MEDITELE_CHECKOUT_URLS[lead.plan] ?? MEDITELE_CHECKOUT_URLS['INDIVIDUAL'];
      await sendNotification(
        lead.phone,
        `Olá ${lead.name.split(' ')[0]}! 🎉\n\nChegou a hora! O Saúde Agora está no ar.\n\nVocê garantiu o preço especial de lançamento. Clique no link abaixo para ativar seu plano agora:\n\n${checkoutUrl}\n\nQualquer dúvida, é só responder aqui. Saúde!`
      );
      enviados++;
    } catch {
      erros++;
    }
  }

  res.json({ message: 'Disparo concluído', total: leads.length, enviados, erros });
});

app.post('/api/admin/users/:id/magic-link', adminAuth, async (req: Request, res: Response) => {
  const userId = req.params.id as string;
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: 'Usuário não encontrado.' });
      return;
    }
    if (!user.lsxToken) {
      res.status(400).json({ error: 'Usuário não possui ID Meditele.' });
      return;
    }
    const link = await getMagicLink(user.lsxToken);
    if (!link) {
      res.status(502).json({ error: 'Falha ao gerar magic link na Meditele.' });
      return;
    }
    res.json({ magicLink: link });
  } catch (err: any) {
    console.error('[MAGIC LINK]', err);
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// --- SINCRONIZAÇÃO LSX ↔ BANCO LOCAL ---

// Busca todos os pacientes da LSX (resolve paginação)
const fetchAllLsxPatients = async (): Promise<any[]> => {
  const all: any[] = [];
  let page = 1;
  while (true) {
    const res = await axios.get(`${MEDITELE_API_URL}/clinic/patients/paginated`, {
      headers: mediteleHeaders, params: { page, limit: 50 },
    });
    const items: any[] = res.data?.data?.attributes ?? [];
    all.push(...items);
    const total: number = res.data?.data?.pagination?.total ?? 0;
    if (all.length >= total || items.length === 0) break;
    page++;
  }
  return all;
};

// Preview: mostra o que será sincronizado sem alterar nada
app.get('/api/admin/sync-lsx/preview', adminAuth, async (req: Request, res: Response) => {
  try {
    const lsxPatients = await fetchAllLsxPatients();
    const localUsers  = await prisma.user.findMany({ select: { cpf: true, lsxToken: true } });
    const localCpfs   = new Set(localUsers.map(u => u.cpf));

    const toCreate  = lsxPatients.filter(p => !localCpfs.has(p.cpf?.replace(/\D/g, '')));
    const toUpdate  = lsxPatients.filter(p => {
      const cpf = p.cpf?.replace(/\D/g, '');
      const local = localUsers.find(u => u.cpf === cpf);
      return local && !local.lsxToken;
    });
    const synced = lsxPatients.length - toCreate.length - toUpdate.length;

    res.json({
      lsxTotal: lsxPatients.length,
      localTotal: localUsers.length,
      toCreate: toCreate.length,
      toUpdate: toUpdate.length,
      synced,
    });
  } catch (err: any) {
    console.error('[SYNC PREVIEW]', err);
    res.status(500).json({ error: 'Erro ao buscar dados da LSX.' });
  }
});

// Executa a sincronização
app.post('/api/admin/sync-lsx', adminAuth, async (req: Request, res: Response) => {
  try {
    const lsxPatients = await fetchAllLsxPatients();
    const localUsers  = await prisma.user.findMany({ select: { id: true, cpf: true, lsxToken: true } });
    const localByCpf  = new Map(localUsers.map(u => [u.cpf, u]));

    let created = 0, updated = 0, skipped = 0;
    const errors: string[] = [];

    for (const p of lsxPatients) {
      const cpf = p.cpf?.replace(/\D/g, '');
      if (!cpf) { skipped++; continue; }

      const local = localByCpf.get(cpf);

      if (!local) {
        // Não existe localmente — criar
        try {
          const passwordHash = await bcrypt.hash(Math.random().toString(36) + cpf, 10);
          await prisma.user.create({
            data: {
              name: p.name?.trim() || 'Paciente LSX',
              email: p.email || `${cpf}@lsx.sync`,
              cpf,
              phone: p.phone?.replace(/\D/g, '') || null,
              passwordHash,
              lsxToken: p.id,
            },
          });
          created++;
        } catch (e: any) {
          errors.push(`CPF ${cpf}: ${e.message}`);
        }
      } else if (!local.lsxToken) {
        // Existe mas sem lsxToken — atualizar
        await prisma.user.update({
          where: { id: local.id },
          data: { lsxToken: p.id },
        });
        updated++;
      } else {
        skipped++;
      }
    }

    res.json({ message: 'Sincronização concluída.', created, updated, skipped, errors });
  } catch (err: any) {
    console.error('[SYNC]', err);
    res.status(500).json({ error: 'Erro durante a sincronização.' });
  }
});

// --- VINCULAR PACIENTE LSX AO BANCO LOCAL (mantido para compatibilidade) ---

app.post('/api/admin/vincular-paciente', adminAuth, async (req: Request, res: Response) => {
  const { name, phone, email, cpf, lsxPatientId, planType } = req.body;

  if (!name || !phone || !email || !cpf || !lsxPatientId) {
    res.status(400).json({ error: 'Campos obrigatórios: name, phone, email, cpf, lsxPatientId.' });
    return;
  }

  const cleanCpf = String(cpf).replace(/\D/g, '');

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { cpf: cleanCpf }] },
  });
  if (existing) {
    res.status(400).json({ error: 'E-mail ou CPF já cadastrado no sistema.' });
    return;
  }

  // Gera hash aleatório — login é via magic link, não senha
  const passwordHash = await bcrypt.hash(Math.random().toString(36) + Date.now(), 10);

  try {
    const user = await prisma.user.create({
      data: { name, phone, email, cpf: cleanCpf, passwordHash, lsxToken: lsxPatientId },
    });

    if (planType) {
      const plan = await prisma.plan.findFirst({ where: { type: planType } });
      if (plan) {
        await prisma.subscription.create({
          data: { userId: user.id, planId: plan.id, status: 'ACTIVE' },
        });
      }
    }

    res.status(201).json({ message: 'Paciente vinculado com sucesso.', userId: user.id });
  } catch (err: any) {
    console.error('[VINCULAR]', err);
    res.status(500).json({ error: 'Erro interno ao vincular paciente.' });
  }
});

// --- CRIAR NOVO PACIENTE (admin) ---

app.post('/api/admin/create-patient', adminAuth, async (req: Request, res: Response) => {
  const { name, phone, email, cpf, planType, birthDate, gender } = req.body;

  if (!name || !email || !cpf) {
    res.status(400).json({ error: 'Nome, e-mail e CPF são obrigatórios.' });
    return;
  }

  const cleanCpf = String(cpf).replace(/\D/g, '');
  const cleanPhone = phone ? String(phone).replace(/\D/g, '') : null;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { cpf: cleanCpf }] },
  });
  if (existing) {
    res.status(400).json({ error: 'E-mail ou CPF já cadastrado no sistema.' });
    return;
  }

  try {
    // 1. Cria usuário local (senha aleatória — login é via magic link)
    const passwordHash = await bcrypt.hash(Math.random().toString(36) + Date.now(), 10);
    const user = await prisma.user.create({
      data: { name, email, cpf: cleanCpf, phone: cleanPhone, passwordHash },
    });

    // 2. Cria assinatura local se informado o plano
    let localSub: { id: string } | null = null;
    let plan: { id: string; price: any; type: string } | null = null;
    if (planType) {
      plan = await prisma.plan.findFirst({ where: { type: planType } });
      if (plan) {
        localSub = await prisma.subscription.create({
          data: { userId: user.id, planId: plan.id, status: 'ACTIVE' },
        });
      }
    }

    // 3. Cria cliente + cobrança no Asaas
    let asaasStatus = 'SEM_CHAVE';
    try {
      const cfg = await getAsaasConfig();
      if (cfg.apiKey) {
        const asaasCustomerId = await getOrCreateAsaasCustomer(
          { name, cpfCnpj: cleanCpf, email, phone: cleanPhone || undefined },
          cfg,
        );
        if (asaasCustomerId) {
          await prisma.user.update({ where: { id: user.id }, data: { asaasCustomerId } });

          if (plan && localSub) {
            const priceVal = parseFloat(plan.price as any);
            if (plan.type === 'INDIVIDUAL' || plan.type === 'FAMILIAR') {
              const asaasSub = await createAsaasSubscription(asaasCustomerId, priceVal, plan.type, cfg);
              if (asaasSub) {
                await prisma.subscription.update({
                  where: { id: localSub.id },
                  data: { asaasSubscriptionId: asaasSub.asaasId },
                });
                asaasStatus = 'ASSINATURA_CRIADA';
              } else {
                asaasStatus = 'ERRO_ASAAS';
              }
            } else {
              // AVULSO / CORTESIA — pagamento único
              const asaasPay = await createAsaasPayment(asaasCustomerId, priceVal, plan.type, cfg);
              if (asaasPay) {
                await prisma.subscription.update({
                  where: { id: localSub.id },
                  data: { asaasSubscriptionId: asaasPay.asaasId },
                });
                asaasStatus = 'PAGAMENTO_CRIADO';
              } else {
                asaasStatus = 'ERRO_ASAAS';
              }
            }
          } else {
            asaasStatus = 'CLIENTE_CRIADO';
          }
        } else {
          asaasStatus = 'ERRO_ASAAS';
        }
      }
    } catch (asaasErr: any) {
      console.error('[CREATE PATIENT] Asaas error:', asaasErr?.message ?? asaasErr);
      asaasStatus = 'ERRO_ASAAS';
    }

    // 4. Cria paciente na Meditele
    const mediteleId = await createMeditelePatient({
      name,
      cpf: cleanCpf,
      email,
      phone: cleanPhone || '',
      birthDate: birthDate || '',
      gender: gender || '',
    });

    if (mediteleId) {
      await prisma.user.update({ where: { id: user.id }, data: { lsxToken: mediteleId } });
    }

    res.status(201).json({
      message: 'Paciente criado com sucesso.',
      userId: user.id,
      mediteleStatus: mediteleId ? 'CREATED' : 'FAILED',
      asaasStatus,
    });
  } catch (err: any) {
    console.error('[CREATE PATIENT]', err);
    res.status(500).json({ error: 'Erro interno ao criar paciente.' });
  }
});

// --- GESTÃO DE PLANOS (admin) ---

// Listar planos locais + planos Meditele em paralelo
app.get('/api/admin/plans', adminAuth, async (req: Request, res: Response) => {
  try {
    const [localPlans, mediteleRes] = await Promise.all([
      prisma.plan.findMany({
        orderBy: { createdAt: 'asc' },
        include: { _count: { select: { subscriptions: { where: { status: 'ACTIVE' } } } } },
      }),
      axios.get(`${MEDITELE_API_URL}/clinic/patient-plans`, { headers: mediteleHeaders })
        .catch(() => ({ data: { data: { attributes: [] } } })),
    ]);

    const mediteleById: Record<string, any> = {};
    for (const p of (mediteleRes.data?.data?.attributes ?? [])) {
      mediteleById[p.id] = p;
    }

    const plans = localPlans.map(p => ({
      ...p,
      price: parseFloat(p.price as any),
      activeSubscriptions: p._count.subscriptions,
      meditele: p.mediteleId ? (mediteleById[p.mediteleId] ?? null) : null,
    }));

    res.json(plans);
  } catch (err: any) {
    console.error('[PLANS]', err);
    res.status(500).json({ error: 'Erro ao carregar planos.' });
  }
});

// Criar plano local vinculado a um plano Meditele
app.post('/api/admin/plans', adminAuth, async (req: Request, res: Response) => {
  const { name, price, type, description, mediteleId } = req.body;
  if (!name || price == null || !type) {
    res.status(400).json({ error: 'name, price e type são obrigatórios.' });
    return;
  }
  try {
    // Evitar duplicidade por mediteleId
    if (mediteleId) {
      const exists = await prisma.plan.findFirst({ where: { mediteleId } });
      if (exists) {
        res.status(400).json({ error: 'Já existe um plano local vinculado a esse plano Meditele.' });
        return;
      }
    }
    const plan = await prisma.plan.create({
      data: { name, price, type, description, mediteleId, active: true },
    });
    res.status(201).json({ ...plan, price: parseFloat(plan.price as any), activeSubscriptions: 0 });
  } catch (err: any) {
    console.error('[CREATE PLAN]', err);
    res.status(500).json({ error: 'Erro ao criar plano.' });
  }
});

// Listar planos Meditele (direto da API deles)
app.get('/api/admin/plans/meditele', adminAuth, async (req: Request, res: Response) => {
  try {
    const r = await axios.get(`${MEDITELE_API_URL}/clinic/patient-plans`, { headers: mediteleHeaders });
    res.json(r.data?.data?.attributes ?? []);
  } catch (err: any) {
    res.status(502).json({ error: 'Erro ao buscar planos na Meditele.' });
  }
});

// Atualizar plano local
app.put('/api/admin/plans/:id', adminAuth, async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const { name, price, type, description, mediteleId, active,
          showOnLp, featured, originalPrice, features, ctaLabel, periodLabel, sortOrder } = req.body;
  try {
    // Verifica se o plano existe antes de tentar atualizar
    const exists = await prisma.plan.findUnique({ where: { id } });
    if (!exists) {
      res.status(404).json({ error: `Plano com id "${id}" não encontrado no banco de dados.` });
      return;
    }

    const plan = await prisma.plan.update({
      where: { id },
      data: {
        ...(name          !== undefined && { name }),
        ...(price         !== undefined && { price }),
        ...(type          !== undefined && { type }),
        ...(description   !== undefined && { description }),
        ...(mediteleId    !== undefined && { mediteleId }),
        ...(active        !== undefined && { active }),
        ...(showOnLp      !== undefined && { showOnLp }),
        ...(featured      !== undefined && { featured }),
        ...(originalPrice !== undefined && { originalPrice: originalPrice === '' ? null : (originalPrice ?? null) }),
        ...(features      !== undefined && { features }),
        ...(ctaLabel      !== undefined && { ctaLabel }),
        ...(periodLabel   !== undefined && { periodLabel }),
        ...(sortOrder     !== undefined && { sortOrder }),
        updatedAt: new Date(),
      },
    });
    res.json({ ...plan, price: parseFloat(plan.price as any) });
  } catch (err: any) {
    console.error('[UPDATE PLAN] id:', id, '| error:', err?.message ?? err);
    res.status(500).json({ error: 'Erro ao atualizar plano.', detail: err?.message });
  }
});

// ── Webhook Asaas ────────────────────────────────────────────────────────────
// Registre a URL no painel Asaas: https://saudeagora24h.com.br/api-backend/api/webhooks/asaas
// Eventos: PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_OVERDUE,
//          PAYMENT_REFUNDED, SUBSCRIPTION_DELETED
app.post('/api/webhooks/asaas', async (req: Request, res: Response) => {
  const { event, payment, subscription } = req.body;
  console.log(`[ASAAS WEBHOOK] ${event}`, JSON.stringify(req.body).slice(0, 200));

  try {
    // ID da assinatura Asaas (pode vir em payment.subscription ou subscription.id)
    const asaasSubId: string | undefined =
      payment?.subscription ?? subscription?.id;

    if (!asaasSubId && !payment?.id) {
      res.json({ received: true }); return;
    }

    // Busca assinatura local pelo ID Asaas
    const localSub = asaasSubId
      ? await prisma.subscription.findFirst({ where: { asaasSubscriptionId: asaasSubId } })
      : await prisma.subscription.findFirst({ where: { asaasSubscriptionId: payment?.id } });

    if (!localSub) {
      // Pode ser o primeiro pagamento ainda com asaasSubId = payment.id (avulso)
      console.log(`[ASAAS WEBHOOK] Assinatura local não encontrada para ${asaasSubId ?? payment?.id}`);
      res.json({ received: true }); return;
    }

    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED': {
        await prisma.subscription.update({
          where: { id: localSub.id },
          data: { status: 'ACTIVE', updatedAt: new Date() },
        });
        console.log(`[ASAAS WEBHOOK] Assinatura ${localSub.id} ATIVADA`);

        // Notifica paciente
        const userRecord = await prisma.user.findUnique({ where: { id: localSub.userId } });
        if (userRecord?.phone) {
          let accessMsg = '';
          if (userRecord.lsxToken) {
            const ml = await getMagicLink(userRecord.lsxToken);
            accessMsg = ml ? `\n\n🔑 Acesse agora: ${ml}` : '';
          }
          await sendNotification(
            userRecord.phone,
            `✅ Pagamento confirmado! Seu plano no *Saúde Agora 24h* está ativo.${accessMsg}\n\nBem-vindo(a)! Em caso de dúvida, é só chamar. 😊`,
          );
        }
        break;
      }

      case 'PAYMENT_OVERDUE': {
        await prisma.subscription.update({
          where: { id: localSub.id },
          data: { status: 'SUSPENDED', updatedAt: new Date() },
        });
        console.log(`[ASAAS WEBHOOK] Assinatura ${localSub.id} SUSPENSA (inadimplência)`);
        break;
      }

      case 'PAYMENT_REFUNDED':
      case 'SUBSCRIPTION_DELETED': {
        await prisma.subscription.update({
          where: { id: localSub.id },
          data: { status: 'CANCELLED', endDate: new Date(), updatedAt: new Date() },
        });
        console.log(`[ASAAS WEBHOOK] Assinatura ${localSub.id} CANCELADA`);
        break;
      }

      default:
        console.log(`[ASAAS WEBHOOK] Evento ignorado: ${event}`);
    }
  } catch (err: any) {
    console.error('[ASAAS WEBHOOK ERROR]', err?.message ?? err);
  }

  res.json({ received: true });
});

// Endpoint público — busca um plano específico por UUID (para URLs diretas)
app.get('/api/plans/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const plan = await prisma.plan.findFirst({ where: { id, active: true } });
    if (!plan) { res.status(404).json({ error: 'Plano não encontrado.' }); return; }
    res.json({
      ...plan,
      price: parseFloat(plan.price as any),
      originalPrice: plan.originalPrice ? parseFloat(plan.originalPrice as any) : null,
      features: plan.features ? JSON.parse(plan.features as string) : [],
    });
  } catch { res.status(500).json({ error: 'Erro interno.' }); }
});

// Endpoint público — planos visíveis na landing page
app.get('/api/plans', async (req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { active: true, showOnLp: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json(plans.map(p => ({
      ...p,
      price: parseFloat(p.price as any),
      originalPrice: p.originalPrice ? parseFloat(p.originalPrice as any) : null,
      features: p.features ? JSON.parse(p.features) : [],
    })));
  } catch (err) {
    res.status(500).json({ error: 'Erro ao carregar planos.' });
  }
});

// --- LOGIN PÚBLICO VIA TELEFONE ---

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { phone } = req.body;
  if (!phone) {
    res.status(400).json({ error: 'Informe o telefone.' });
    return;
  }

  const clean = String(phone).replace(/\D/g, '');
  if (clean.length < 8) {
    res.status(400).json({ error: 'Telefone inválido.' });
    return;
  }

  // Busca direto na Meditele por telefone
  const patientId = await findPatientByPhone(clean);
  if (!patientId) {
    res.status(404).json({ error: 'Nenhum assinante encontrado com este telefone.' });
    return;
  }

  const link = await getMagicLink(patientId);
  if (!link) {
    res.status(502).json({ error: 'Não foi possível gerar o link de acesso. Tente novamente em instantes.' });
    return;
  }

  res.json({ magicLink: link });
});

app.post('/api/webhook/consulta-finalizada', async (req: Request, res: Response) => {
  const { patientId, consultId } = req.body;
  console.log(`[WEBHOOK] Consulta ${consultId} finalizada para paciente Meditele ${patientId}`);

  try {
    const user = await prisma.user.findFirst({ where: { lsxToken: patientId } });
    if (!user || !user.phone) {
      res.sendStatus(200);
      return;
    }

    // Busca cupom ativo de algum parceiro
    const coupon = await prisma.coupon.findFirst({ where: { isActive: true } });
    const couponMsg = coupon
      ? `\n\n💊 Use o cupom *${coupon.code}* em farmácias parceiras e garanta seu desconto: ${coupon.discountDesc}`
      : '';

    await sendNotification(
      user.phone,
      `Olá ${user.name}! Sua consulta foi concluída. 👨‍⚕️\n\nAcesse seu histórico e receitas pelo app Saúde Agora.${couponMsg}`
    );
  } catch (err) {
    console.error('[WEBHOOK] Erro:', err);
  }

  res.sendStatus(200);
});

// ── CRUD de Usuários (admin) ──────────────────────────────────────────────────

// PUT /api/admin/users/:id — atualiza dados pessoais (local + Asaas)
app.put('/api/admin/users/:id', adminAuth, async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { name, email, phone } = req.body;
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) { res.status(404).json({ error: 'Usuário não encontrado.' }); return; }

    // Verifica conflito de email
    if (email && email !== user.email) {
      const conflict = await prisma.user.findFirst({ where: { email, NOT: { id } } });
      if (conflict) { res.status(400).json({ error: 'E-mail já em uso por outro cadastro.' }); return; }
    }

    // 1. Atualiza local
    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name  !== undefined && name  !== '' && { name }),
        ...(email !== undefined && email !== '' && { email }),
        ...(phone !== undefined && { phone: phone || null }),
        updatedAt: new Date(),
      },
    });

    // 2. Sync Asaas — atualiza o customer se tiver ID
    let asaasResult = 'sem_id_asaas';
    if (user.asaasCustomerId) {
      const cfg = await getAsaasConfig();
      if (cfg.apiKey) {
        const h = { access_token: cfg.apiKey, 'Content-Type': 'application/json' };
        try {
          await axios.put(`${cfg.apiUrl}/customers/${user.asaasCustomerId}`, {
            ...(name  !== undefined && name  !== '' && { name }),
            ...(email !== undefined && email !== '' && { email }),
            ...(phone !== undefined && phone !== '' && { mobilePhone: phone.replace(/\D/g, '') }),
          }, { headers: h });
          asaasResult = 'atualizado_asaas';
          console.log(`[ASAAS] Customer ${user.asaasCustomerId} atualizado`);
        } catch (e: any) {
          console.error('[ASAAS] Erro ao atualizar customer:', e.response?.data ?? e.message);
          asaasResult = 'erro_asaas';
        }
      }
    }

    res.json({ message: 'Paciente atualizado.', asaasResult, user: updated });
  } catch (err: any) {
    console.error('[UPDATE USER]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users/:id/subscription/status — altera status + sync Asaas
app.post('/api/admin/users/:id/subscription/status', adminAuth, async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { status } = req.body as { status: string }; // ACTIVE | PENDING | SUSPENDED | CANCELLED

  const VALID = ['ACTIVE', 'PENDING', 'SUSPENDED', 'CANCELLED'];
  if (!VALID.includes(status)) {
    res.status(400).json({ error: `Status inválido. Use: ${VALID.join(', ')}` }); return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!user) { res.status(404).json({ error: 'Usuário não encontrado.' }); return; }

    const sub = user.subscriptions[0];
    if (!sub)  { res.status(404).json({ error: 'Assinatura não encontrada.' }); return; }

    // 1. Atualiza local
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status,
        ...(status === 'CANCELLED' ? { endDate: new Date() } : {}),
        updatedAt: new Date(),
      },
    });

    // 2. Sync Asaas
    let asaasResult = 'sem_assinatura_asaas';
    if (sub.asaasSubscriptionId) {
      const cfg = await getAsaasConfig();
      if (cfg.apiKey) {
        const h = { access_token: cfg.apiKey, 'Content-Type': 'application/json' };
        try {
          if (status === 'CANCELLED') {
            await axios.delete(`${cfg.apiUrl}/subscriptions/${sub.asaasSubscriptionId}`, { headers: h });
            asaasResult = 'cancelado_asaas';
          } else if (status === 'ACTIVE') {
            // Reativa ou cria nova cobrança se necessário
            asaasResult = 'status_local_atualizado';
          } else {
            asaasResult = 'status_local_atualizado';
          }
        } catch (e: any) {
          console.error('[ASAAS] Sync status:', e.response?.data ?? e.message);
          asaasResult = 'erro_asaas';
        }
      }
    }

    res.json({ message: 'Status atualizado.', asaasResult });
  } catch (err: any) {
    console.error('[SUBSCRIPTION STATUS]', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/users/:id/retry-charge — cria assinatura + cobrança Asaas para usuário sem pagamento
app.post('/api/admin/users/:id/retry-charge', adminAuth, async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { planId, planType } = req.body; // um dos dois obrigatório

  if (!planId && !planType) {
    res.status(400).json({ error: 'Informe planId ou planType.' }); return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id }, include: { subscriptions: true } });
    if (!user) { res.status(404).json({ error: 'Usuário não encontrado.' }); return; }

    // Busca plano (mesma lógica do checkout corrigido)
    let plan = planId
      ? await prisma.plan.findFirst({ where: { id: planId, active: true } })
      : null;
    if (!plan && planType) {
      plan = await prisma.plan.findFirst({ where: { type: planType, active: true }, orderBy: [{ showOnLp: 'desc' }, { sortOrder: 'desc' }] });
      if (!plan) plan = await prisma.plan.findFirst({ where: { id: planType, active: true } });
    }
    if (!plan) { res.status(404).json({ error: 'Plano não encontrado.' }); return; }

    const effectivePlanType = plan.type;
    const value = parseFloat((plan.price as any).toString());

    // Cria assinatura local se não existir
    let localSub = user.subscriptions.find(s => s.planId === plan!.id && s.status !== 'CANCELLED');
    if (!localSub) {
      localSub = await prisma.subscription.create({
        data: { userId: user.id, planId: plan.id, status: 'PENDING' },
      });
    }

    // Asaas
    const asaasCfg = await getAsaasConfig();
    if (!asaasCfg.apiKey) { res.status(500).json({ error: 'Asaas não configurado.' }); return; }
    if (value <= 0) { res.status(400).json({ error: `Plano ${plan.name} tem valor ${value} — cobrança não gerada.` }); return; }

    // Reutiliza ou cria customer Asaas
    const customerId = user.asaasCustomerId
      ?? await getOrCreateAsaasCustomer({ name: user.name, cpfCnpj: user.cpf, email: user.email, phone: user.phone || '' }, asaasCfg);

    if (!customerId) { res.status(502).json({ error: 'Falha ao obter cliente Asaas.' }); return; }

    if (!user.asaasCustomerId) {
      await prisma.user.update({ where: { id }, data: { asaasCustomerId: customerId } });
    }

    const isRecurring = effectivePlanType !== 'AVULSO' && effectivePlanType !== 'CORTESIA';
    const asaasResult = isRecurring
      ? await createAsaasSubscription(customerId, value, effectivePlanType, asaasCfg)
      : await createAsaasPayment(customerId, value, effectivePlanType, asaasCfg);

    if (!asaasResult) { res.status(502).json({ error: 'Falha ao criar cobrança na Asaas.' }); return; }

    await prisma.subscription.update({
      where: { id: localSub.id },
      data: { asaasSubscriptionId: asaasResult.asaasId },
    });

    console.log(`[RETRY CHARGE] userId=${user.id} plan=${plan.name} asaasId=${asaasResult.asaasId} invoice=${asaasResult.invoiceUrl}`);

    res.json({
      success: true,
      plan: plan.name,
      value,
      invoiceUrl: asaasResult.invoiceUrl,
      asaasId: asaasResult.asaasId,
      subscriptionId: localSub.id,
    });
  } catch (err: any) {
    console.error('[RETRY CHARGE]', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id — remove paciente (cancela assinaturas + remove customer no Asaas)
app.delete('/api/admin/users/:id', adminAuth, async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { subscriptions: true, coupons: true },
    });
    if (!user) { res.status(404).json({ error: 'Usuário não encontrado.' }); return; }

    const asaasLog: string[] = [];
    const cfg = await getAsaasConfig();

    if (cfg.apiKey) {
      const h = { access_token: cfg.apiKey, 'Content-Type': 'application/json' };

      // 1a. Cancela cada assinatura ativa no Asaas
      for (const sub of user.subscriptions) {
        if (sub.asaasSubscriptionId) {
          try {
            await axios.delete(`${cfg.apiUrl}/subscriptions/${sub.asaasSubscriptionId}`, { headers: h });
            asaasLog.push(`assinatura ${sub.asaasSubscriptionId} cancelada`);
          } catch (e: any) {
            const msg = e.response?.data?.errors?.[0]?.description ?? e.message;
            asaasLog.push(`assinatura ${sub.asaasSubscriptionId}: ${msg}`);
          }
        }
      }

      // 1b. Cancela parcelas pendentes e em atraso do cliente
      if (user.asaasCustomerId) {
        try {
          const [pendRes, overdRes] = await Promise.allSettled([
            axios.get(`${cfg.apiUrl}/payments`, { headers: h, params: { customer: user.asaasCustomerId, status: 'PENDING', limit: 100 } }),
            axios.get(`${cfg.apiUrl}/payments`, { headers: h, params: { customer: user.asaasCustomerId, status: 'OVERDUE', limit: 100 } }),
          ]);
          const allPays = [
            ...(pendRes.status === 'fulfilled' ? pendRes.value.data?.data ?? [] : []),
            ...(overdRes.status === 'fulfilled' ? overdRes.value.data?.data ?? [] : []),
          ];
          for (const pay of allPays) {
            try {
              await axios.delete(`${cfg.apiUrl}/payments/${pay.id}`, { headers: h });
              asaasLog.push(`parcela ${pay.id} cancelada`);
            } catch (e: any) {
              asaasLog.push(`parcela ${pay.id}: erro`);
            }
          }
          if (allPays.length) console.log(`[DELETE USER] ${allPays.length} parcelas canceladas no Asaas`);
        } catch (e: any) {
          asaasLog.push(`parcelas: erro ao buscar`);
        }
      }

      // 1c. Remove o customer no Asaas (histórico financeiro permanece no painel Asaas)
      if (user.asaasCustomerId) {
        try {
          await axios.delete(`${cfg.apiUrl}/customers/${user.asaasCustomerId}`, { headers: h });
          asaasLog.push(`customer ${user.asaasCustomerId} removido`);
        } catch (e: any) {
          const msg = e.response?.data?.errors?.[0]?.description ?? e.message;
          asaasLog.push(`customer: ${msg}`);
        }
      }
    }

    // 2. Remove comissões → cupons → assinaturas → usuário (ordem respeita FK)
    const couponUseIds = user.coupons.map(c => c.id);
    if (couponUseIds.length) {
      await prisma.commission.deleteMany({ where: { couponUseId: { in: couponUseIds } } });
      await prisma.couponUse.deleteMany({ where: { userId: id } });
    }
    await prisma.subscription.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    console.log(`[DELETE USER] ${id} removido. Asaas: ${asaasLog.join(' | ') || 'sem sync'}`);
    res.json({ message: 'Paciente removido com sucesso.', asaasLog });
  } catch (err: any) {
    console.error('[DELETE USER]', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users/:id/financial — resumo financeiro do paciente no Asaas
app.get('/api/admin/users/:id/financial', adminAuth, async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  try {
    const user = await prisma.user.findUnique({ where: { id }, include: { subscriptions: true } });
    if (!user) { res.status(404).json({ error: 'Usuário não encontrado.' }); return; }

    if (!user.asaasCustomerId) {
      res.json({ hasAsaas: false, subscriptions: [], pendingPayments: [], overduePayments: [], totalPending: 0, totalOverdue: 0 });
      return;
    }

    const cfg = await getAsaasConfig();
    if (!cfg.apiKey) {
      res.json({ hasAsaas: false, subscriptions: [], pendingPayments: [], overduePayments: [], totalPending: 0, totalOverdue: 0 });
      return;
    }

    const h = { access_token: cfg.apiKey, 'Content-Type': 'application/json' };

    const [subsRes, pendRes, overdRes] = await Promise.allSettled([
      axios.get(`${cfg.apiUrl}/subscriptions`, { headers: h, params: { customer: user.asaasCustomerId, limit: 20 } }),
      axios.get(`${cfg.apiUrl}/payments`, { headers: h, params: { customer: user.asaasCustomerId, status: 'PENDING', limit: 100 } }),
      axios.get(`${cfg.apiUrl}/payments`, { headers: h, params: { customer: user.asaasCustomerId, status: 'OVERDUE', limit: 100 } }),
    ]);

    const subs  = subsRes.status === 'fulfilled' ? (subsRes.value.data?.data ?? [])  : [];
    const pends = pendRes.status === 'fulfilled' ? (pendRes.value.data?.data ?? [])  : [];
    const ovrds = overdRes.status === 'fulfilled' ? (overdRes.value.data?.data ?? []) : [];

    const totalPending = pends.reduce((acc: number, p: any) => acc + (p.value ?? 0), 0);
    const totalOverdue = ovrds.reduce((acc: number, p: any) => acc + (p.value ?? 0), 0);

    res.json({
      hasAsaas: true,
      asaasCustomerId: user.asaasCustomerId,
      subscriptions: subs.map((s: any) => ({
        id: s.id, status: s.status, value: s.value,
        nextDueDate: s.nextDueDate, cycle: s.cycle, description: s.description ?? '',
      })),
      pendingPayments: pends.map((p: any) => ({
        id: p.id, value: p.value, dueDate: p.dueDate, status: p.status, description: p.description ?? '',
      })),
      overduePayments: ovrds.map((p: any) => ({
        id: p.id, value: p.value, dueDate: p.dueDate, status: p.status, description: p.description ?? '',
      })),
      totalPending,
      totalOverdue,
    });
  } catch (err: any) {
    console.error('[FINANCIAL]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Financeiro (Asaas) ───────────────────────────────────────────────────────

// GET /api/admin/financeiro/summary — KPIs do painel financeiro
app.get('/api/admin/financeiro/summary', adminAuth, async (req: Request, res: Response) => {
  const cfg = await getAsaasConfig();
  if (!cfg.apiKey) {
    return res.json({
      hasAsaas: false, mrr: 0,
      overdueCount: 0, overdueValue: 0,
      pendingCount: 0, pendingValue: 0,
      receivedCount: 0, receivedValue: 0, totalCount: 0,
    });
  }
  const h = { access_token: cfg.apiKey, 'Content-Type': 'application/json' };
  try {
    const [overdueR, pendingR, receivedR, subsR] = await Promise.allSettled([
      axios.get(`${cfg.apiUrl}/payments`, { headers: h, params: { status: 'OVERDUE',   limit: 100 }, timeout: 10000 }),
      axios.get(`${cfg.apiUrl}/payments`, { headers: h, params: { status: 'PENDING',   limit: 100 }, timeout: 10000 }),
      axios.get(`${cfg.apiUrl}/payments`, { headers: h, params: { status: 'RECEIVED',  limit: 100 }, timeout: 10000 }),
      axios.get(`${cfg.apiUrl}/subscriptions`, { headers: h, params: { status: 'ACTIVE', limit: 100 }, timeout: 10000 }),
    ]);
    const od = overdueR.status  === 'fulfilled' ? overdueR.value.data  : { data: [], totalCount: 0 };
    const pd = pendingR.status  === 'fulfilled' ? pendingR.value.data  : { data: [], totalCount: 0 };
    const rd = receivedR.status === 'fulfilled' ? receivedR.value.data : { data: [], totalCount: 0 };
    const sb = subsR.status     === 'fulfilled' ? subsR.value.data     : { data: [], totalCount: 0 };

    const sum = (arr: any[]) => arr.reduce((a: number, p: any) => a + (p.value ?? 0), 0);
    const overdueCount   = od.totalCount  ?? (od.data  ?? []).length;
    const pendingCount   = pd.totalCount  ?? (pd.data  ?? []).length;
    const receivedCount  = rd.totalCount  ?? (rd.data  ?? []).length;

    res.json({
      hasAsaas: true,
      mrr:           sum(sb.data ?? []),
      overdueCount,  overdueValue:  sum(od.data ?? []),
      pendingCount,  pendingValue:  sum(pd.data ?? []),
      receivedCount, receivedValue: sum(rd.data ?? []),
      totalCount:    overdueCount + pendingCount + receivedCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/financeiro/payments — pagamentos paginados + enriquecidos com dados locais
app.get('/api/admin/financeiro/payments', adminAuth, async (req: Request, res: Response) => {
  const { status, limit = '10', offset = '0' } = req.query as Record<string, string>;
  const cfg = await getAsaasConfig();
  if (!cfg.apiKey) return res.json({ data: [], totalCount: 0, hasMore: false });

  const h = { access_token: cfg.apiKey, 'Content-Type': 'application/json' };
  try {
    const params: Record<string, any> = { limit: Math.min(Number(limit), 100), offset: Number(offset) };
    if (status) params.status = status;

    const asaasRes = await axios.get(`${cfg.apiUrl}/payments`, { headers: h, params, timeout: 10000 });
    const rawPays: any[] = asaasRes.data?.data ?? [];
    const totalCount: number = asaasRes.data?.totalCount ?? rawPays.length;
    const hasMore: boolean = asaasRes.data?.hasMore ?? false;

    // Enriquece com dados do banco local
    const customerIds = [...new Set(rawPays.map((p: any) => p.customer).filter(Boolean))];
    const localUsers = customerIds.length
      ? await prisma.user.findMany({
          where: { asaasCustomerId: { in: customerIds } },
          select: {
            id: true, name: true, phone: true, asaasCustomerId: true,
            subscriptions: {
              select: { plan: { select: { name: true, type: true } } },
              where: { status: { in: ['ACTIVE', 'PENDING'] } },
              orderBy: { createdAt: 'desc' }, take: 1,
            },
          },
        })
      : [];
    const userMap: Record<string, typeof localUsers[0]> = {};
    for (const u of localUsers) { if (u.asaasCustomerId) userMap[u.asaasCustomerId] = u; }

    const now = new Date();
    const payments = rawPays.map((p: any) => {
      const user = userMap[p.customer];
      const plan = user?.subscriptions?.[0]?.plan;
      const daysLate = p.status === 'OVERDUE'
        ? Math.max(0, Math.floor((now.getTime() - new Date(p.dueDate).getTime()) / 86400000))
        : 0;
      return {
        id:             p.id,
        asaasCustomerId: p.customer ?? '',
        customerName:   user?.name   ?? (p.description ?? '').split(' - ')[0] ?? '—',
        customerPhone:  user?.phone  ?? null,
        localUserId:    user?.id     ?? null,
        plan:           plan?.name   ?? (p.description ?? '').split(' - ')[0] ?? '—',
        planType:       plan?.type   ?? '',
        value:          p.value      ?? 0,
        dueDate:        p.dueDate,
        status:         p.status,
        daysLate,
        billingType:    p.billingType ?? '',
        invoiceUrl:     p.invoiceUrl  ?? null,
        paymentDate:    p.paymentDate ?? null,
      };
    });

    res.json({ data: payments, totalCount, hasMore });
  } catch (err: any) {
    console.error('[FINANCEIRO PAYMENTS]', err);
    res.status(502).json({ error: err.message, data: [], totalCount: 0 });
  }
});

// ── Gateway Admin Endpoints ──────────────────────────────────────────────────

const WEBHOOK_URL = 'https://saudeagora24h.com.br/api-backend/api/webhooks/asaas';
const WEBHOOK_EVENTS = [
  'PAYMENT_CONFIRMED',
  'PAYMENT_RECEIVED',
  'PAYMENT_OVERDUE',
  'PAYMENT_REFUNDED',
  'SUBSCRIPTION_DELETED',
];

// GET /api/admin/gateway — config atual (chave mascarada)
app.get('/api/admin/gateway', adminAuth, async (req: Request, res: Response) => {
  try {
    const cfg = await getAsaasConfig();
    const keyMasked = cfg.apiKey.length > 12
      ? cfg.apiKey.slice(0, 8) + '••••' + cfg.apiKey.slice(-4)
      : cfg.apiKey ? '••••••••' : '';

    // Verifica de onde vem (DB ou env)
    const dbKey = await prisma.config.findUnique({ where: { key: 'ASAAS_API_KEY' } }).catch(() => null);
    const dbEnv = await prisma.config.findUnique({ where: { key: 'ASAAS_ENV'    } }).catch(() => null);

    res.json({
      env:           cfg.env,
      hasKey:        !!cfg.apiKey,
      keyMasked,
      webhookUrl:    WEBHOOK_URL,
      webhookEvents: WEBHOOK_EVENTS,
      source:        dbKey ? 'db' : (process.env.ASAAS_API_KEY ? 'env' : 'none'),
      envSource:     dbEnv ? 'db' : (process.env.ASAAS_ENV    ? 'env' : 'default'),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/gateway/config — salva credenciais no banco
app.post('/api/admin/gateway/config', adminAuth, async (req: Request, res: Response) => {
  const { env, apiKey } = req.body;
  try {
    if (env) {
      await prisma.config.upsert({
        where:  { key: 'ASAAS_ENV' },
        update: { value: env },
        create: { key: 'ASAAS_ENV', value: env },
      });
    }
    if (apiKey !== undefined && apiKey !== '') {
      await prisma.config.upsert({
        where:  { key: 'ASAAS_API_KEY' },
        update: { value: apiKey },
        create: { key: 'ASAAS_API_KEY', value: apiKey },
      });
    }
    res.json({ message: 'Configuração salva com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/gateway/test — testa conexão com a Asaas
app.post('/api/admin/gateway/test', adminAuth, async (req: Request, res: Response) => {
  try {
    const cfg = await getAsaasConfig();
    if (!cfg.apiKey) {
      return res.status(400).json({ ok: false, error: 'API Key não configurada.' });
    }
    const r = await axios.get(`${cfg.apiUrl}/myAccount`, {
      headers: { access_token: cfg.apiKey, 'Content-Type': 'application/json' },
      timeout: 8000,
    });
    res.json({
      ok: true,
      account: {
        name:       r.data.name,
        email:      r.data.email,
        cpfCnpj:    r.data.cpfCnpj,
        balance:    r.data.balance ?? 0,
        env:        cfg.env,
      },
    });
  } catch (err: any) {
    const detail = err.response?.data?.errors?.[0]?.description ?? err.message;
    res.json({ ok: false, error: detail });
  }
});

// GET /api/admin/gateway/payments — pagamentos recentes na Asaas
app.get('/api/admin/gateway/payments', adminAuth, async (req: Request, res: Response) => {
  try {
    const cfg = await getAsaasConfig();
    if (!cfg.apiKey) {
      return res.json({ data: [], totalCount: 0 });
    }
    const limit  = Number(req.query.limit  ?? 20);
    const offset = Number(req.query.offset ?? 0);
    const r = await axios.get(`${cfg.apiUrl}/payments`, {
      headers: { access_token: cfg.apiKey, 'Content-Type': 'application/json' },
      params:  { limit, offset },
      timeout: 10000,
    });
    res.json(r.data);
  } catch (err: any) {
    res.status(502).json({ error: 'Erro ao buscar pagamentos na Asaas.', data: [] });
  }
});

// GET /api/admin/gateway/subscriptions — assinaturas ativas na Asaas
app.get('/api/admin/gateway/subscriptions', adminAuth, async (req: Request, res: Response) => {
  try {
    const cfg = await getAsaasConfig();
    if (!cfg.apiKey) {
      return res.json({ data: [], totalCount: 0 });
    }
    const r = await axios.get(`${cfg.apiUrl}/subscriptions`, {
      headers: { access_token: cfg.apiKey, 'Content-Type': 'application/json' },
      params:  { limit: 20, offset: 0 },
      timeout: 10000,
    });
    res.json(r.data);
  } catch (err: any) {
    res.status(502).json({ error: 'Erro ao buscar assinaturas na Asaas.', data: [] });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO VENDEDORES
// ═══════════════════════════════════════════════════════════════════════════

// POST /api/auth/employee/login
app.post('/api/auth/employee/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ error: 'Email e senha obrigatórios.' }); return; }
  try {
    const emp = await prisma.employee.findUnique({ where: { email } });
    if (!emp || !emp.active) { res.status(401).json({ error: 'Credenciais inválidas.' }); return; }
    const ok = await bcrypt.compare(password, emp.passwordHash);
    if (!ok) { res.status(401).json({ error: 'Credenciais inválidas.' }); return; }
    const token = jwt.sign({ id: emp.id, role: emp.role, name: emp.name }, JWT_SECRET, { expiresIn: '12h' });
    res.json({
      token,
      employee: {
        id: emp.id, name: emp.name, email: emp.email, role: emp.role,
        termsAccepted: !!emp.termsAcceptedAt,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// POST /api/auth/employee/accept-terms
app.post('/api/auth/employee/accept-terms', employeeAuth, async (req: Request, res: Response) => {
  const { id } = (req as any).employee as EmployeePayload;
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0].trim()
           || req.socket.remoteAddress
           || 'unknown';
  try {
    await prisma.employee.update({
      where: { id },
      data: { termsAcceptedAt: new Date(), termsAcceptedIp: ip },
    });
    res.json({ message: 'Termo aceito com sucesso.', acceptedAt: new Date().toISOString() });
  } catch {
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// GET /api/auth/employee/me
app.get('/api/auth/employee/me', employeeAuth, async (req: Request, res: Response) => {
  const { id } = (req as any).employee as EmployeePayload;
  try {
    const emp = await prisma.employee.findUnique({ where: { id }, select: { id: true, name: true, email: true, role: true, active: true, createdAt: true, termsAcceptedAt: true } });
    if (!emp) { res.status(404).json({ error: 'Usuário não encontrado.' }); return; }
    res.json({ ...emp, termsAccepted: !!emp.termsAcceptedAt });
  } catch { res.status(500).json({ error: 'Erro interno.' }); }
});

// GET /api/admin/employees — listar todos
app.get('/api/admin/employees', adminAuth, async (req: Request, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { subscriptions: true } } },
    });
    res.json(employees.map(e => ({
      id: e.id, name: e.name, email: e.email, role: e.role,
      active: e.active, createdAt: e.createdAt,
      totalSales: e._count.subscriptions,
    })));
  } catch { res.status(500).json({ error: 'Erro interno.' }); }
});

// POST /api/admin/employees — criar vendedor
app.post('/api/admin/employees', adminAuth, async (req: Request, res: Response) => {
  const { name, email, password, role = 'VENDEDOR' } = req.body;
  if (!name || !email || !password) { res.status(400).json({ error: 'name, email e password são obrigatórios.' }); return; }
  try {
    const exists = await prisma.employee.findUnique({ where: { email } });
    if (exists) { res.status(400).json({ error: 'E-mail já cadastrado.' }); return; }
    const passwordHash = await bcrypt.hash(password, 10);
    const emp = await prisma.employee.create({ data: { name, email, passwordHash, role } });
    res.status(201).json({ id: emp.id, name: emp.name, email: emp.email, role: emp.role, active: emp.active, createdAt: emp.createdAt, totalSales: 0 });
  } catch { res.status(500).json({ error: 'Erro interno.' }); }
});

// PUT /api/admin/employees/:id — editar
app.put('/api/admin/employees/:id', adminAuth, async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const { name, email, password, role, active } = req.body;
  try {
    const data: any = {};
    if (name     !== undefined) data.name     = name;
    if (email    !== undefined) data.email    = email;
    if (role     !== undefined) data.role     = role;
    if (active   !== undefined) data.active   = active;
    if (password !== undefined) data.passwordHash = await bcrypt.hash(password, 10);
    const emp = await prisma.employee.update({ where: { id }, data });
    res.json({ id: emp.id, name: emp.name, email: emp.email, role: emp.role, active: emp.active });
  } catch (e: any) {
    if (e.code === 'P2025') { res.status(404).json({ error: 'Vendedor não encontrado.' }); return; }
    res.status(500).json({ error: 'Erro interno.' });
  }
});

// ── Painel do Vendedor ─────────────────────────────────────────────────────

const PLAN_NAME: Record<string, string> = { INDIVIDUAL: 'Individual', FAMILIAR: 'Familiar', AVULSO: 'Avulso', CORTESIA: 'Cortesia' };

// GET /api/sales/plans — lista planos ativos para o vendedor escolher
app.get('/api/sales/plans', employeeAuth, async (req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { active: true },
      orderBy: [{ showOnLp: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.json(plans.map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      price: parseFloat((p.price as any).toString()),
      periodLabel: p.periodLabel ?? '/mês',
    })));
  } catch { res.status(500).json({ error: 'Erro interno.' }); }
});

// GET /api/sales/dashboard
app.get('/api/sales/dashboard', employeeAuth, async (req: Request, res: Response) => {
  const { id } = (req as any).employee as EmployeePayload;
  try {
    const now   = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo  = new Date(today.getTime() - 7  * 864e5);
    const monthAgo = new Date(today.getTime() - 30 * 864e5);

    const subs = await prisma.subscription.findMany({
      where: { soldById: id },
      include: { plan: true, user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const total    = subs.length;
    const active   = subs.filter(s => s.status === 'ACTIVE').length;
    const today_c  = subs.filter(s => new Date(s.createdAt) >= today).length;
    const week_c   = subs.filter(s => new Date(s.createdAt) >= weekAgo).length;
    const month_c  = subs.filter(s => new Date(s.createdAt) >= monthAgo).length;

    // Últimas 5 vendas
    const recent = subs.slice(0, 5).map(s => ({
      id: s.id,
      customerName: s.user.name,
      plan: PLAN_NAME[s.plan.type] ?? s.plan.type,
      planType: s.plan.type,
      status: s.status,
      value: parseFloat((s.plan.price as any).toString()),
      createdAt: s.createdAt,
    }));

    res.json({ total, active, today: today_c, week: week_c, month: month_c, recent });
  } catch { res.status(500).json({ error: 'Erro interno.' }); }
});

// GET /api/sales/my-sales
app.get('/api/sales/my-sales', employeeAuth, async (req: Request, res: Response) => {
  const { id } = (req as any).employee as EmployeePayload;
  const offset = parseInt(String(req.query.offset ?? '0'));
  const limit  = parseInt(String(req.query.limit  ?? '20'));
  try {
    const [subs, totalCount] = await Promise.all([
      prisma.subscription.findMany({
        where: { soldById: id },
        include: { plan: true, user: { select: { name: true, phone: true, cpf: true } } },
        orderBy: { createdAt: 'desc' },
        skip: offset, take: limit,
      }),
      prisma.subscription.count({ where: { soldById: id } }),
    ]);
    res.json({
      totalCount,
      data: subs.map(s => ({
        id: s.id,
        customerName: s.user.name,
        customerPhone: s.user.phone,
        customerCpf: s.user.cpf,
        plan: PLAN_NAME[s.plan.type] ?? s.plan.type,
        planType: s.plan.type,
        status: s.status,
        value: parseFloat((s.plan.price as any).toString()),
        createdAt: s.createdAt,
      })),
    });
  } catch { res.status(500).json({ error: 'Erro interno.' }); }
});

// POST /api/sales/checkout — vendedor cria venda (mesma lógica do checkout público + vincular soldById)
app.post('/api/sales/checkout', employeeAuth, async (req: Request, res: Response) => {
  const { id: soldById } = (req as any).employee as EmployeePayload;
  const { name, email, cpf, phone, planType, planId, birthDate, gender } = req.body;
  if (!name || !email || !cpf) { res.status(400).json({ error: 'name, email e cpf são obrigatórios.' }); return; }

  try {
    const cleanCpf = cpf.replace(/\D/g, '');
    const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { cpf: cleanCpf }] } });
    if (existing) { res.status(400).json({ error: 'E-mail ou CPF já cadastrado.' }); return; }

    // 1. Cria usuário
    const passwordHash = await bcrypt.hash(cleanCpf.slice(-6), 10); // senha padrão = últimos 6 dígitos do CPF
    const user = await prisma.user.create({ data: { name, email, cpf: cleanCpf, phone: phone || null, passwordHash } });

    // 2. Associa plano — por ID (seleção direta), por tipo ou por ID-string (ex: 'plan-individual-promo')
    let plan = planId
      ? await prisma.plan.findFirst({ where: { id: planId, active: true } })
      : null;
    if (!plan && planType) {
      plan = await prisma.plan.findFirst({
        where: { type: planType, active: true },
        orderBy: [{ showOnLp: 'desc' }, { sortOrder: 'desc' }, { createdAt: 'desc' }],
      });
      if (!plan) plan = await prisma.plan.findFirst({ where: { id: planType, active: true } });
    }
    if (!plan) {
      plan = await prisma.plan.findFirst({
        where: { type: 'INDIVIDUAL', active: true },
        orderBy: [{ showOnLp: 'desc' }, { sortOrder: 'desc' }, { createdAt: 'desc' }],
      });
    }
    const effectivePlanType: string = plan?.type ?? 'INDIVIDUAL';
    console.log(`[SALES CHECKOUT] plan=${plan?.id ?? 'null'} type=${effectivePlanType} price=${plan?.price ?? 0}`);

    if (plan) {
      await prisma.subscription.create({
        data: { userId: user.id, planId: plan.id, status: 'PENDING', soldById },
      });
    }

    // 3. Meditele (não bloqueia)
    const mediteleId = await createMeditelePatient({ name, cpf: cleanCpf, email, phone: phone || '', birthDate: birthDate || '', gender: gender || '' });
    if (mediteleId) await prisma.user.update({ where: { id: user.id }, data: { lsxToken: mediteleId } });

    // 4. Asaas
    let invoiceUrl: string | null = null;
    const asaasCfg = await getAsaasConfig();
    if (!asaasCfg.apiKey) {
      console.warn('[SALES CHECKOUT] ASAAS_API_KEY não configurada.');
    } else {
      const value = plan ? parseFloat((plan.price as any).toString()) : 0;
      if (value > 0) {
        const customerId = await getOrCreateAsaasCustomer({ name, cpfCnpj: cleanCpf, email, phone: phone || '' }, asaasCfg);
        if (customerId) {
          await prisma.user.update({ where: { id: user.id }, data: { asaasCustomerId: customerId } });
          const isRecurring = effectivePlanType !== 'AVULSO' && effectivePlanType !== 'CORTESIA';
          const asaasResult = isRecurring
            ? await createAsaasSubscription(customerId, value, effectivePlanType, asaasCfg)
            : await createAsaasPayment(customerId, value, effectivePlanType, asaasCfg);
          if (asaasResult) {
            invoiceUrl = asaasResult.invoiceUrl;
            if (plan) await prisma.subscription.updateMany({
              where: { userId: user.id, planId: plan.id },
              data: { asaasSubscriptionId: asaasResult.asaasId },
            });
          } else {
            console.error(`[ASAAS] Falha ao criar cobrança para userId=${user.id}`);
          }
        }
      } else {
        console.warn(`[SALES CHECKOUT] Valor 0 para plano ${plan?.id} — cobrança ignorada.`);
      }
    }

    res.status(201).json({
      message: 'Venda registrada com sucesso.',
      userId: user.id,
      customerName: name,
      plan: plan ? (PLAN_NAME[plan.type] ?? plan.type) : planType,
      invoiceUrl,
      mediteleStatus: mediteleId ? 'CREATED' : 'FAILED',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Erro interno.' });
  }
});

// ── Admin: ver vendas de um vendedor específico ────────────────────────────
app.get('/api/admin/employees/:id/sales', adminAuth, async (req: Request, res: Response) => {
  const { id } = req.params as { id: string };
  const offset = parseInt(String(req.query.offset ?? '0'));
  const limit  = parseInt(String(req.query.limit  ?? '20'));
  try {
    const [subs, totalCount] = await Promise.all([
      prisma.subscription.findMany({
        where: { soldById: id },
        include: { plan: true, user: { select: { name: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
        skip: offset, take: limit,
      }),
      prisma.subscription.count({ where: { soldById: id } }),
    ]);
    res.json({
      totalCount,
      data: subs.map(s => ({
        id: s.id,
        customerName: s.user.name,
        customerPhone: s.user.phone,
        plan: PLAN_NAME[s.plan.type] ?? s.plan.type,
        planType: s.plan.type,
        status: s.status,
        value: parseFloat((s.plan.price as any).toString()),
        createdAt: s.createdAt,
      })),
    });
  } catch { res.status(500).json({ error: 'Erro interno.' }); }
});

// ═══════════════════════════════════════════════════════════════════════════
// MÓDULO ÁREA DO CLIENTE
// ═══════════════════════════════════════════════════════════════════════════

interface CustomerPayload { id: string; email: string; name: string; type: 'customer'; }

const customerAuth = (req: Request, res: Response, next: NextFunction) => {
  const auth = req.headers['authorization'];
  if (!auth?.startsWith('Bearer ')) { res.status(401).json({ error: 'Token ausente.' }); return; }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as any;
    if (payload.type !== 'customer') { res.status(401).json({ error: 'Token inválido.' }); return; }
    (req as any).customer = payload as CustomerPayload;
    next();
  } catch { res.status(401).json({ error: 'Token inválido ou expirado.' }); }
};

// POST /api/customer/auth/login — CPF ou e-mail + senha
app.post('/api/customer/auth/login', async (req: Request, res: Response) => {
  const { login, password } = req.body;
  if (!login || !password) { res.status(400).json({ error: 'Informe CPF/e-mail e senha.' }); return; }
  try {
    const clean = String(login).replace(/\D/g, '');
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: String(login).toLowerCase() },
          ...(clean.length >= 11 ? [{ cpf: clean }] : []),
        ],
      },
    });
    if (!user) { res.status(401).json({ error: 'Usuário não encontrado.' }); return; }
    const ok = await bcrypt.compare(String(password), user.passwordHash);
    if (!ok) { res.status(401).json({ error: 'Senha incorreta.' }); return; }
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, type: 'customer' },
      JWT_SECRET,
      { expiresIn: '30d' },
    );
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, cpf: user.cpf, phone: user.phone } });
  } catch { res.status(500).json({ error: 'Erro interno.' }); }
});

// GET /api/customer/me — perfil + assinatura ativa
app.get('/api/customer/me', customerAuth, async (req: Request, res: Response) => {
  const { id } = (req as any).customer as CustomerPayload;
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: { plan: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!user) { res.status(404).json({ error: 'Usuário não encontrado.' }); return; }

    const activeSub = user.subscriptions.find(s => s.status === 'ACTIVE')
      ?? user.subscriptions.find(s => s.status === 'PENDING')
      ?? user.subscriptions[0]
      ?? null;

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      cpf: user.cpf,
      phone: user.phone,
      hasMeditele: !!user.lsxToken,
      subscription: activeSub ? {
        id: activeSub.id,
        status: activeSub.status,
        planName: activeSub.plan.name,
        planType: activeSub.plan.type,
        planPrice: parseFloat((activeSub.plan.price as any).toString()),
        startDate: activeSub.startDate,
        endDate: activeSub.endDate,
        features: activeSub.plan.features ? JSON.parse(activeSub.plan.features as string) : [],
      } : null,
      history: user.subscriptions.map(s => ({
        id: s.id,
        status: s.status,
        planName: s.plan.name,
        planType: s.plan.type,
        planPrice: parseFloat((s.plan.price as any).toString()),
        startDate: s.startDate,
        endDate: s.endDate,
        createdAt: s.createdAt,
      })),
    });
  } catch (e: any) { res.status(500).json({ error: 'Erro interno.' }); }
});

// GET /api/customer/magic-link — gera link para consulta
app.get('/api/customer/magic-link', customerAuth, async (req: Request, res: Response) => {
  const { id } = (req as any).customer as CustomerPayload;
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user?.lsxToken) {
      res.status(404).json({ error: 'Conta de telemedicina não encontrada. Entre em contato com o suporte.' });
      return;
    }
    const link = await getMagicLink(user.lsxToken);
    if (!link) { res.status(502).json({ error: 'Não foi possível gerar o link. Tente novamente em instantes.' }); return; }
    res.json({ magicLink: link });
  } catch { res.status(500).json({ error: 'Erro interno.' }); }
});

// PUT /api/customer/profile — atualizar telefone e/ou e-mail
app.put('/api/customer/profile', customerAuth, async (req: Request, res: Response) => {
  const { id } = (req as any).customer as CustomerPayload;
  const { phone, email } = req.body;
  try {
    const data: { phone?: string; email?: string } = {};
    if (phone !== undefined) data.phone = String(phone).replace(/\D/g, '') || null as any;
    if (email !== undefined) {
      const em = String(email).toLowerCase().trim();
      const exists = await prisma.user.findFirst({ where: { email: em, NOT: { id } } });
      if (exists) { res.status(400).json({ error: 'E-mail já em uso por outro cadastro.' }); return; }
      data.email = em;
    }
    const updated = await prisma.user.update({ where: { id }, data });
    res.json({ name: updated.name, email: updated.email, phone: updated.phone, cpf: updated.cpf });
  } catch { res.status(500).json({ error: 'Erro interno.' }); }
});

// ── AGENDAMENTO PÚBLICO (sem auth, para landing page) ─────────────────────

app.get('/api/public/specialties', async (req: Request, res: Response) => {
  try {
    // URL correta confirmada pelo suporte Meditele (sem /scheduling/)
    const r = await axios.get(`${MEDITELE_API_URL}/clinic/specialties`, { headers: mediteleHeaders });
    const items: any[] = r.data?.data?.attributes ?? [];
    // Retorna apenas especialidades pagas (type !== 'none') com preço > 0
    const list = items
      .filter((i: any) => i.price && parseFloat(i.price) > 0)
      .map((i: any) => ({
        id: i.id,
        name: i.description,
        price: parseFloat(i.price),
        clinicSpecialtyId: i.clinicSpecialtyId,
      }));
    res.json(list);
  } catch (err: any) {
    console.error('[PUBLIC] specialties:', err.response?.data || err.message);
    res.status(502).json({ error: 'Erro ao buscar especialidades.' });
  }
});

app.get('/api/public/booking/days', async (req: Request, res: Response) => {
  const { specialtyId } = req.query;
  try {
    const r = await axios.post(`${MEDITELE_API_URL}/clinic/scheduling/business-days/`,
      { specialty: specialtyId }, { headers: mediteleHeaders });
    res.json(r.data);
  } catch (err: any) {
    console.error('[PUBLIC] days:', err.response?.data || err.message);
    res.status(502).json({ error: err.response?.data?.error || 'Erro ao buscar dias disponíveis.' });
  }
});

app.get('/api/public/booking/times', async (req: Request, res: Response) => {
  const { specialtyId, date } = req.query;
  try {
    const r = await axios.post(`${MEDITELE_API_URL}/clinic/scheduling/available-times/`,
      { specialty: specialtyId, date }, { headers: mediteleHeaders });
    res.json(r.data);
  } catch (err: any) {
    console.error('[PUBLIC] times:', err.response?.data || err.message);
    res.status(502).json({ error: err.response?.data?.error || 'Erro ao buscar horários.' });
  }
});

app.post('/api/public/booking/doctors', async (req: Request, res: Response) => {
  const { specialtyId, date, time } = req.body;
  try {
    const r = await axios.post(`${MEDITELE_API_URL}/clinic/scheduling/doctors/`,
      { specialty: specialtyId, date, time }, { headers: mediteleHeaders });
    res.json(r.data);
  } catch (err: any) {
    console.error('[PUBLIC] doctors:', err.response?.data || err.message);
    res.status(502).json({ error: err.response?.data?.error || 'Erro ao buscar médicos.' });
  }
});

// Solicitação de consulta avulsa pública — cria paciente Meditele + registra lead de especialidade
app.post('/api/public/book-specialty', async (req: Request, res: Response) => {
  const { name, cpf, phone, email, birthDate, gender, specialtyName, specialtyPrice } = req.body;
  try {
    const cleanCpf = String(cpf || '').replace(/\D/g, '');
    const cleanPhone = String(phone || '').replace(/\D/g, '');
    if (!cleanCpf || !name || !cleanPhone) {
      res.status(400).json({ error: 'Nome, CPF e WhatsApp são obrigatórios.' }); return;
    }

    // 1. Criar/garantir paciente na Meditele
    await createMeditelePatient({
      name, cpf: cleanCpf,
      email: email || `${cleanCpf}@temp.saudeagora.com`,
      phone: cleanPhone,
      birthDate: birthDate || '',
      gender: gender || 'male',
    }).catch(() => {}); // paciente pode já existir — tudo bem

    // 2. Salvar lead de especialidade no banco
    await prisma.lead.create({
      data: {
        name,
        phone: cleanPhone,
        plan: `ESPECIALIDADE:${specialtyName || 'N/A'}:${specialtyPrice || 0}`,
      },
    }).catch(() => {}); // falha silenciosa

    // 3. Montar link WhatsApp pré-preenchido para a equipe contatar o paciente
    const waMsg = encodeURIComponent(
      `Olá! Recebi uma solicitação de consulta:\n\n` +
      `👤 *${name}*\n` +
      `📋 CPF: ${cleanCpf}\n` +
      `📱 WhatsApp: ${cleanPhone}\n` +
      `🩺 Especialidade: *${specialtyName || 'N/A'}*\n` +
      `💰 Valor: R$ ${Number(specialtyPrice || 0).toFixed(2).replace('.', ',')}`
    );
    const waLink = `https://wa.me/5587965993551?text=${waMsg}`;

    res.status(201).json({
      success: true,
      whatsappLink: waLink,
      message: 'Solicitação registrada! Nossa equipe entrará em contato.',
    });
  } catch (err: any) {
    console.error('[PUBLIC] book-specialty:', err.response?.data || err.message);
    res.status(500).json({ error: 'Erro ao processar solicitação.' });
  }
});

// ── AGENDAMENTO (Customer Scheduling) ──────────────────────────────────────

app.get('/api/customer/specialties', customerAuth, async (req: Request, res: Response) => {
  try {
    const r = await axios.get(`${MEDITELE_API_URL}/clinic/scheduling/specialties/`, { headers: mediteleHeaders });
    res.json(r.data);
  } catch (err: any) {
    console.error('[SCHED] specialties:', err.response?.data || err.message);
    res.status(502).json({ error: 'Erro ao buscar especialidades.' });
  }
});

app.post('/api/customer/booking/days', customerAuth, async (req: Request, res: Response) => {
  const { specialtyId } = req.body;
  const cust = (req as any).customer as CustomerPayload;
  try {
    const user = await prisma.user.findUnique({ where: { id: cust.id } });
    const body: any = { specialty: specialtyId };
    if (user?.cpf) body.patient_cpf = user.cpf;
    const r = await axios.post(`${MEDITELE_API_URL}/clinic/scheduling/business-days/`, body, { headers: mediteleHeaders });
    res.json(r.data);
  } catch (err: any) {
    console.error('[SCHED] days:', err.response?.data || err.message);
    res.status(502).json({ error: err.response?.data?.error || 'Erro ao buscar dias disponíveis.' });
  }
});

app.post('/api/customer/booking/times', customerAuth, async (req: Request, res: Response) => {
  const { specialtyId, date } = req.body;
  const cust = (req as any).customer as CustomerPayload;
  try {
    const user = await prisma.user.findUnique({ where: { id: cust.id } });
    const body: any = { specialty: specialtyId, date };
    if (user?.cpf) body.patient_cpf = user.cpf;
    const r = await axios.post(`${MEDITELE_API_URL}/clinic/scheduling/available-times/`, body, { headers: mediteleHeaders });
    res.json(r.data);
  } catch (err: any) {
    console.error('[SCHED] times:', err.response?.data || err.message);
    res.status(502).json({ error: err.response?.data?.error || 'Erro ao buscar horários.' });
  }
});

app.post('/api/customer/booking/doctors', customerAuth, async (req: Request, res: Response) => {
  const { specialtyId, date, time } = req.body;
  try {
    const r = await axios.post(`${MEDITELE_API_URL}/clinic/scheduling/doctors/`,
      { specialty: specialtyId, date, time }, { headers: mediteleHeaders });
    res.json(r.data);
  } catch (err: any) {
    console.error('[SCHED] doctors:', err.response?.data || err.message);
    res.status(502).json({ error: err.response?.data?.error || 'Erro ao buscar médicos.' });
  }
});

app.post('/api/customer/booking/create', customerAuth, async (req: Request, res: Response) => {
  const { specialtyId, date, time, doctorId, isRealDoctor } = req.body;
  const cust = (req as any).customer as CustomerPayload;
  try {
    const user = await prisma.user.findUnique({ where: { id: cust.id } });
    if (!user?.cpf) { res.status(400).json({ error: 'CPF não cadastrado. Contate o suporte.' }); return; }
    const payload: any = { patient_cpf: user.cpf, specialty_id: specialtyId, date, time };
    if (doctorId && isRealDoctor) { payload.doctor_id = doctorId; payload.is_real_doctor = true; }
    const r = await axios.post(`${MEDITELE_API_URL}/clinic/scheduling/create-consultation/`, payload, { headers: mediteleHeaders });
    res.status(201).json(r.data);
  } catch (err: any) {
    console.error('[SCHED] create:', err.response?.data || err.message);
    const msg = err.response?.data?.error || 'Erro ao criar agendamento.';
    const status = err.response?.status >= 400 ? err.response.status : 502;
    res.status(status).json({ error: msg });
  }
});

app.get('/api/customer/consultations', customerAuth, async (req: Request, res: Response) => {
  const cust = (req as any).customer as CustomerPayload;
  try {
    const user = await prisma.user.findUnique({ where: { id: cust.id } });
    if (!user?.cpf) { res.json([]); return; }
    const r = await axios.get(`${MEDITELE_API_URL}/clinic/consultation-history/`,
      { headers: mediteleHeaders, params: { cpf: user.cpf, page_size: 20 } });
    res.json(r.data?.results ?? []);
  } catch (err: any) {
    console.error('[SCHED] consultations:', err.response?.data || err.message);
    res.json([]);
  }
});

// ═══════════════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});