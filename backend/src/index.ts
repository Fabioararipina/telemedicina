import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as bcrypt from 'bcrypt';
import path from 'path';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Meditele API config
const MEDITELE_API_URL = process.env.MEDITELE_API_URL || 'https://gateway.meditele.com.br';
const MEDITELE_CLINIC_ID = process.env.MEDITELE_CLINIC_ID || '';
const MEDITELE_API_KEY = process.env.MEDITELE_API_KEY || '';

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
  const { name, email, cpf, phone, password, planType } = req.body;
  
  if (!name || !email || !cpf || !password) {
    return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
  }

  try {
    // 1. Verifica se usuário já existe
    const existingUser = await prisma.user.findFirst({ where: { OR: [{ email }, { cpf }] } });
    if (existingUser) {
      return res.status(400).json({ error: 'E-mail ou CPF já cadastrado no sistema.' });
    }

    // 2. Hash da Senha
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Cria o usuário no nosso banco
    const user = await prisma.user.create({
      data: {
        name,
        email,
        cpf,
        phone,
        passwordHash,
      }
    });

    // 4. Associa ao Plano
    const plan = await prisma.plan.findFirst({ where: { type: planType } });
    if (plan) {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          planId: plan.id,
          status: 'ACTIVE'
        }
      });
    }

    // 5. Cria paciente na Meditele e gera magic link
    const meditelePatientId = await createMeditelePatient({ name, cpf, email, phone: phone || '' });
    let magicLink: string | null = null;

    if (meditelePatientId) {
      // Salva o ID Meditele no usuário
      await prisma.user.update({
        where: { id: user.id },
        data: { lsxToken: meditelePatientId },
      });
      magicLink = await getMagicLink(meditelePatientId);
    }

    // 6. Notifica o cliente pelo WhatsApp
    const checkoutUrl = MEDITELE_CHECKOUT_URLS[planType] ?? MEDITELE_CHECKOUT_URLS['INDIVIDUAL'];
    const accessMsg = magicLink
      ? `Clique no link abaixo para acessar (válido por 5 minutos):\n${magicLink}\n\nSe o link expirar, acesse diretamente:\n${checkoutUrl}`
      : `Acesse sua conta aqui:\n${checkoutUrl}`;

    await sendNotification(
      phone || 'Desconhecido',
      `Olá ${name}, bem-vindo ao Saúde Agora! 🎉\n\nSua assinatura do plano ${planType} foi confirmada.\n\n${accessMsg}\n\nQualquer dúvida, é só chamar!`
    );

    res.status(201).json({
      message: 'Assinatura realizada com sucesso!',
      user: { id: user.id, name: user.name, email: user.email },
      mediteleStatus: meditelePatientId ? 'CREATED' : 'FAILED',
      magicLink: magicLink ?? undefined,
    });
  } catch (error) {
    console.error('[CHECKOUT ERROR]', error);
    res.status(500).json({ error: 'Erro interno ao processar assinatura' });
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

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});