# Snapshot do Projeto: Saúde Agora - Telemedicina e Comissionamento
Data: 14 de Abril de 2026

## 1. Visão Geral
Sistema de revenda de telemedicina (LSX White Label) com gestão de rede de parceiros (farmácias/laboratórios) e rastreamento de comissões por cupons de desconto.

## 2. Estrutura de Pastas
- `/frontend`: React + Vite + TypeScript (Landing Page de Vendas).
- `/backend`: Node.js + Express + Prisma ORM + PostgreSQL.
- `/docs`: Documentação original do fornecedor LSX.

## 3. Banco de Dados (PostgreSQL)
As tabelas principais já criadas e sincronizadas:
- `User`: Cadastro de clientes.
- `Plan`: Planos Individual e Familiar.
- `Subscription`: Controle de assinaturas ativas.
- `Partner`: Farmácias e Laboratórios parceiros.
- `Coupon`: Cupons de desconto gerados para os parceiros.
- `CouponUse`: Registro de uso de cupons pelos clientes.
- `Commission`: Cálculo automático de comissões (Pendente/Pago).

## 4. Funcionalidades do Backend (`backend/src/index.ts`)
- `POST /api/checkout`: Cria usuário e ativa plano.
- `POST /api/partners`: Cadastro de novos parceiros.
- `POST /api/coupons`: Geração de códigos de desconto.
- `POST /api/track-coupon`: Rastreia compra no parceiro e gera comissão (ex: 10%).
- `POST /api/webhook/lsx-finished`: Preparado para receber sinal da LSX e disparar propaganda.

## 5. Interface (`frontend/src/App.tsx`)
- Landing Page inspirada no Saúde 24 Horas.
- Seção de Hero, Cards de Planos e CTA para Benefícios em Farmácias.
- Cores: Azul (#0ea5e9) e Verde (#10b981).

## Como retomar:
1. Iniciar Banco: `cd backend; npx prisma db push`
2. Rodar Backend: `cd backend; npm run dev` (configurar script no package.json)
3. Rodar Frontend: `cd frontend; npm run dev` (Porta 5173)

---
Pronto para a próxima missão!
