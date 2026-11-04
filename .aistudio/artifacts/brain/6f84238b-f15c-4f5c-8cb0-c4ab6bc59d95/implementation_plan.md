# Alfa Link 2.0 — Evolução para Plataforma Multi-Tenant de CRM, Pós-Venda & Automação de WhatsApp Business

Este plano apresenta a **Auditoria Técnica Completa** do sistema Alfa Link em produção e a **Arquitetura de Evolução em 10 Fases** para transformar a plataforma em um ecossistema completo de CRM, Automação de WhatsApp Business (Meta Cloud API), Recuperação de Clientes e Pós-Venda, **preservando 100% das funcionalidades atuais da roleta, campanhas, cupons e QR Codes**.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Preservação Integral do Sistema Atual**: Nenhuma funcionalidade existente (Roleta Server-Side, Campanhas por Origem, Estúdio de QR Code + Cartão Impresso, Validação de Cupons, Onboarding de 8 Passos e Links Públicos `/c/:campaignSlug`) será removida ou quebrada. Todos os novos módulos serão acoplados de forma incremental sobre a base atual.

- **Isolamento Multi-Tenant & Segurança (PostgreSQL + RLS + Middleware)**:
  - Todas as consultas e mutações no backend já operam sob validação estrita do `company_id` derivado do token de sessão/autenticação (`requireAuth`), nunca confiando em parâmetros enviados pelo cliente.
  - Adicionaremos políticas de **Row-Level Security (RLS)** diretamente no PostgreSQL para todas as tabelas multi-tenant e novas tabelas de CRM/WhatsApp, garantindo isolamento em nível de banco de dados.
- **Integração Oficial Meta WhatsApp Business Platform (Cloud API & Embedded Signup)**:
  - As credenciais sensíveis (`META_APP_ID`, `META_APP_SECRET`, `META_WEBHOOK_VERIFY_TOKEN` e tokens OAuth de cada WABA) ficam exclusivamente no backend.
  - Quando as variáveis de ambiente da Meta estiverem configuradas no servidor, o botão **Conectar Meu WhatsApp** executa o fluxo OAuth / Embedded Signup oficial e realiza chamadas reais à Graph API (`v21.0`). Caso as credenciais da Meta ainda não estejam presentes no ambiente, o painel exibe claramente o diagnóstico técnico de configuração e disponibiliza o **Guia Completo de Configuração Meta Developers** integrado.
- **Motor de Agendamento Persistente (Server-Side Queue Worker)**:
  - O agendamento de mensagens (ex.: Boas-vindas 5 minutos após o giro, Lembrete de Cupom em 24h, Recompra em 7 dias, Reativação em 30 dias) **não depende de `setTimeout` no navegador**.
  - Será implementado um worker persistente no servidor Express apoiado pela tabela `scheduled_messages` no PostgreSQL com controle de `idempotency_key`, tentativas automáticas (`attempts`), verificação em tempo real de consentimento LGPD e bloqueio contra envios duplicados.

---

## 1. Auditoria Completa do Projeto Existente (Fase 1)

### 1.1. Banco de Dados Atual (Cloud SQL PostgreSQL + Drizzle ORM)
O banco de dados atual já conta com **13 tabelas relacionais** em operação e populadas:
1. `companies` — Dados do estabelecimento, canais próprios, slug público e template padrão de WhatsApp.
2. `profiles` — Usuários multi-tenant com controle de acesso RBAC (`OWNER`, `ADMIN`, `STAFF`).
3. `campaigns` — Campanhas por canal de origem (iFood, Mercado Livre, Shopee, Amazon, Loja Física, etc.), cores, textos e template de WhatsApp.
4. `customers` — Clientes capturados na roleta (`name`, `phone`, `email`, `marketingConsent`, `marketingConsentAt`, `firstSourceChannel`).
5. `campaign_customers` — Vínculo N:N entre clientes e campanhas participadas.
6. `roulette_configs` — Regras de limite de giros por cliente e tempo de cooldown.
7. `prizes` — Prêmios configurados com probabilidades, estoque e validade.
8. `spins` — Histórico auditável de giros processados no servidor.
9. `coupons` — Cupons únicos gerados (`available`, `used`, `expired`, `cancelled`).
10. `redemptions` — Baixas e resgates de cupons com valor de pedido atribuído.
11. `qr_codes` — QR Codes rastreáveis e configurações do cartão de agradecimento impresso.
12. `qr_scans` — Logs de leitura de QR Code com dispositivo e parâmetros UTM.
13. `campaign_events` — Eventos do funil (`page_view`, `qr_scan`, `registration`, `spin`, `prize_won`, `coupon_generated`, `destination_clicked`, `coupon_redeemed`).

### 1.2. Diagnóstico do que Será Reaproveitado vs. Expandido
- **Reaproveitado Integralmente**:
  - Fluxo público mobile-first (`/c/:campaignSlug`), roleta animada, sorteio server-side (`executeServerSideSpin`), geração de cupons e redirecionamento imediato pós-giro.
  - Estrutura de autenticação híbrida (Firebase Google Auth + E-mail/Senha + Sessão Demo) e isolamento por `companyId`.
- **Expandido / Adicionado**:
  - A tabela `customers` será enriquecida com campos de ciclo de vida CRM (`lastInteractionAt`, `status` ativo/inativo/opt-out, `optOutAt`, `optOutReason`, `totalOrders`, `totalSpent`).
  - Criação das **7 novas tabelas** exigidas para WhatsApp Business, Automações, Agendamento, Templates, Logs de Mensagens e Auditoria LGPD (`whatsapp_connections`, `message_templates`, `automations`, `scheduled_messages`, `message_logs`, `customer_consents`, `automation_executions`).
  - No momento do giro (`executeServerSideSpin`), além de registrar o cliente e o cupom, o backend passará a:
    1. Registrar o termo auditável na tabela `customer_consents` (com versão, texto exato apresentado, canal e timestamp);
    2. Disparar o gatilho da automação **Boas-Vindas Automáticas** (agendando na tabela `scheduled_messages` para `NOW() + 5 minutos` caso o cliente tenha concedido consentimento explícito de marketing).

---

## 2. Experiência do Usuário & Design Visual (SaaS Profissional)

### 2.1. Identidade Visual & Navegação
- Mantém o padrão aprovado **Dark Sidebar (`#0F172A`) + Área de Conteúdo Clara (`#F8FAFC`)** com tipografia `Plus Jakarta Sans`, `Inter` e `JetBrains Mono` para métricas, códigos de cupons, telefones e logs técnicos.
- O menu lateral passará a organizar de forma limpa os módulos:
  1. **Dashboard & Funil CRM** (Visão executiva + Funil de 7 etapas com separação clara entre métricas comprovadas e estimadas)
  2. **CRM de Clientes** (Visão geral de KPIs + Tabela avançada com 8 filtros combináveis + Drawer/Página de Perfil 360° do Cliente)
  3. **Automações WhatsApp** (Boas-vindas 5 min, Lembrete de Cupom 24h, Incentivo à Recompra 7 dias, Reativação 30 dias + Editor de Regras e Teste)
  4. **Templates de Mensagens** (Gestão de templates Meta Cloud API com status `Rascunho`, `Aguardando aprovação`, `Aprovado`, `Rejeitado`, `Pausado` e prévia ao vivo com variáveis)
  5. **Histórico de Mensagens** (Fila de agendamentos + Logs de disparos com status `Agendada`, `Enviada`, `Entregue`, `Lida`, `Falhou`, `Cancelada`)
  6. **Campanhas** (Existente, preservado)
  7. **Roletas & Prêmios** (Existente, preservado)
  8. **Cupons** (Existente, preservado)
  9. **QR Codes & Cartão** (Existente, preservado)
  10. **Configurações & WhatsApp Business** (Abas para WhatsApp Business Cloud API / Embedded Signup, CRM, Automações, Privacidade LGPD, Equipe RBAC e Guia Meta Developers)

### 2.2. Perfil 360° do Cliente no CRM
Ao clicar em qualquer cliente na tabela do CRM, abre-se a visão completa do cliente contendo:
- Dados cadastrais, canal de primeira origem, status de atividade e selo de consentimento LGPD;
- Linha do tempo unificada (Giros na roleta, Cupons ganhos/resgatados, Cliques no canal próprio e Mensagens de WhatsApp agendadas/enviadas/entregues/lidas);
- Controles diretos de **Privacidade & LGPD**: Consultar histórico de consentimento (`customer_consents`), revogar consentimento / bloquear envios promocionais (opt-out manual) ou excluir dados definitivos.

---

## 3. Decisões Técnicas de Engenharia & Segurança

- **Conformidade Estrita com LGPD e Opt-Out Automático (`SAIR` / `PARAR`)**:
  - O checkbox `"Quero receber novidades, ofertas e benefícios desta empresa pelo WhatsApp"` na página pública da roleta permanece **desmarcado por padrão** e **opcional**.
  - O motor de agendamento valida o consentimento duas vezes: no momento da criação da tarefa (`scheduled_messages`) e no exato instante do disparo (`sent_at`). Se o cliente revogar o consentimento nesse intervalo, a tarefa agendada é automaticamente convertida para `cancelled`.
  - O endpoint de Webhook da Meta (`POST /api/webhooks/whatsapp`) processa tanto atualizações de status (`sent`, `delivered`, `read`, `failed`) quanto mensagens recebidas dos clientes: se o cliente responder `SAIR`, `PARAR`, `CANCELAR` ou `STOP`, o sistema revoga o consentimento em `customer_consents`, atualiza `customers.marketing_consent = false` e cancela imediatamente quaisquer agendamentos pendentes daquele cliente na empresa.
- **Proteção de Credenciais & Isolamento de Disparo**:
  - A tabela `whatsapp_connections` armazena a conexão exclusiva de cada `company_id` (`waba_id`, `phone_number_id`, `display_phone_number`, `business_name`, `connection_status`, `webhook_status`).
  - Nenhum token de acesso é retornado para o frontend nas rotas `/api/*` (apenas máscara de status e metadados seguros).
  - Todo disparo utiliza exclusivamente o `phone_number_id` pertencente ao `company_id` daquela automação.

---

## 4. Arquitetura Técnica & Estratégia de Dados *(Referência Técnica)*

### 4.1. Diagrama de Arquitetura e Fluxo de Dados

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                   EXPERIÊNCIA PÚBLICA MOBILE (/c/:campaignSlug)                   │
│  [Cadastro + Checkbox LGPD Opcional] ──► [Giro Server-Side] ──► [Cupom Exclusivo] │
└───────────────────────────────────────────────────┬───────────────────────────────┘
                                                    │
                                                    ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                        BACKEND MULTI-TENANT (server.ts + API)                     │
│                                                                                   │
│  1. Alimenta CRM (customers + campaign_customers)                                 │
│  2. Registra Auditoria LGPD (customer_consents)                                   │
│  3. Avalia Gatilhos de Automação (automations: welcome_spin / coupon_reminder...) │
│  4. Enfileira Tarefa Persistente com Idempotência (scheduled_messages)            │
└─────────────────────────┬─────────────────────────────────────────┬───────────────┘
                          │                                         │
                          ▼                                         ▼
┌──────────────────────────────────────────────┐  ┌─────────────────────────────────┐
│     MOTOR DE AGENDAMENTO (Queue Worker)      │  │   PAINEL DO EMPRESÁRIO (SaaS)   │
│  • Executa a cada 15s no servidor            │  │  • Dashboard & Funil 7 Etapas   │
│  • Verifica consentimento LGPD ativo         │  │  • CRM + Perfil 360° do Cliente │
│  • Verifica conexão WhatsApp da empresa      │  │  • Automações (4 Fluxos + CRUD) │
│  • Verifica aprovação do Template Meta       │  │  • Templates WhatsApp Cloud API │
│  • Envia via WhatsApp Cloud API (por WABA)   │  │  • Histórico & Logs de Mensagens│
│  • Registra message_logs & executions        │  │  • Config WhatsApp + Guia Meta  │
└─────────────────────────┬────────────────────┘  └─────────────────────────────────┘
                          │
                          ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│               META WHATSAPP BUSINESS PLATFORM (Cloud API & Webhooks)              │
│  • Disparo por phone_number_id isolado por empresa                                │
│  • Webhook (/api/webhooks/whatsapp) ──► Atualiza status (Enviada/Entregue/Lida)   │
│  • Webhook Inbound ("SAIR" / "PARAR") ──► Opt-Out automático LGPD + Cancela fila  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2. Novas Tabelas & Adaptações no Banco de Dados (Fase 2)

1. **`whatsapp_connections`**:
   - `id`, `company_id` (FK), `waba_id`, `phone_number_id`, `display_phone_number`, `business_name`, `connection_status` (`connected` | `disconnected` | `pending_verification` | `error`), `webhook_status` (`verified` | `pending`), `token_reference` (armazenado apenas no servidor), `connected_at`, `created_at`, `updated_at`.
2. **`message_templates`**:
   - `id`, `company_id` (FK), `name`, `content`, `meta_template_name`, `language` (`pt_BR`), `category` (`MARKETING` | `UTILITY`), `approval_status` (`draft` | `pending` | `approved` | `rejected` | `paused`), `created_at`, `updated_at`.
3. **`automations`**:
   - `id`, `company_id` (FK), `name`, `description`, `trigger_type` (`welcome_spin` | `coupon_unused` | `repurchase_incentive` | `customer_inactive`), `delay_minutes` (ex.: `5`, `1440`, `10080`, `43200`), `active` (`boolean`), `template_id` (FK), `custom_message`, `conditions` (JSON), `last_executed_at`, `created_at`, `updated_at`.
4. **`scheduled_messages`**:
   - `id`, `company_id` (FK), `customer_id` (FK), `campaign_id` (FK opcional), `coupon_id` (FK opcional), `automation_id` (FK), `template_id` (FK opcional), `rendered_message`, `scheduled_at`, `executed_at`, `sent_at`, `status` (`pending` | `processing` | `sent` | `failed` | `cancelled`), `attempts`, `error_message`, `idempotency_key` (UNIQUE), `created_at`.
5. **`message_logs`**:
   - `id`, `company_id` (FK), `customer_id` (FK), `automation_id` (FK opcional), `scheduled_message_id` (FK opcional), `template_id` (FK opcional), `whatsapp_message_id`, `phone_number_id`, `recipient_phone`, `rendered_content`, `message_status` (`scheduled` | `sent` | `delivered` | `read` | `failed` | `cancelled`), `error_code`, `error_message`, `sent_at`, `delivered_at`, `read_at`, `created_at`.
6. **`customer_consents`**:
   - `id`, `company_id` (FK), `customer_id` (FK), `channel` (`whatsapp`), `consent_type` (`marketing`), `consent_status` (`granted` | `revoked`), `consent_text`, `consent_version`, `consent_source` (`roulette_form` | `admin_panel` | `webhook_optout`), `consented_at`, `revoked_at`, `created_at`.
7. **`automation_executions`**:
   - `id`, `company_id` (FK), `automation_id` (FK), `customer_id` (FK), `status` (`scheduled` | `sent` | `skipped_no_consent` | `skipped_disconnected` | `failed`), `execution_date`, `error_message`, `created_at`.

### 4.3. Roteiro de Execução nas 10 Fases Solicitadas
- **Fase 1 & 2 (Auditoria & Banco de Dados)**: Atualização do schema Drizzle (`src/db/schema.ts`), criação das 7 novas tabelas + índices + políticas RLS no PostgreSQL e seed inicial das 4 automações padrão e templates para cada empresa.
- **Fase 3 & 5 (Módulo CRM Completo & Consentimento LGPD)**: Registro detalhado em `customer_consents`, filtros avançados do CRM, busca unificada, Perfil 360° do cliente com linha do tempo e gestão de revogação/opt-out (`SAIR`/`PARAR`).
- **Fase 4 & 17 (Integração Oficial WhatsApp Business & Documentação Meta)**: Aba `Configurações > WhatsApp Business` com fluxo Embedded Signup / Cloud API, status de webhooks, isolamento por empresa e documentação técnica detalhada da Meta.
- **Fase 6, 7 & 8 (Templates, Agendamento Persistente & 4 Automações)**: Módulo de Templates com validação de status de aprovação, worker server-side de tarefas agendadas (`scheduled_messages`) e interface completa das 4 automações (incluindo **Boas-Vindas Automáticas em 5 minutos** com variáveis `{{nome}}`, `{{empresa}}`, `{{premio}}`, `{{cupom}}` e link do canal próprio).
- **Fase 9 & 10 (Histórico de Mensagens, Novo Dashboard CRM & Testes de Segurança)**: Seção de Mensagens com logs de entrega/leitura via webhook, Funil CRM de 7 etapas e verificação completa de compilação e isolamento multi-tenant.
