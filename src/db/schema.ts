import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  doublePrecision,
} from 'drizzle-orm/pg-core';

// 1. companies
export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logoUrl: text('logo_url').default(''),
  industry: text('industry').default('Restaurante / Delivery'),
  phone: text('phone').default(''),
  email: text('email').default(''),
  websiteUrl: text('website_url').default(''),
  whatsappUrl: text('whatsapp_url').default(''),
  whatsappMessageTemplate: text('whatsapp_message_template')
    .default('Olá! Ganhei o cupom {cupom} ({premio}) e quero fazer meu pedido.')
    .notNull(),
  instagramUrl: text('instagram_url').default(''),
  status: text('status').default('active').notNull(), // active | suspended
  onboardingCompleted: boolean('onboarding_completed').default(false).notNull(),
  ga4Id: text('ga4_id').default(''),
  metaPixelId: text('meta_pixel_id').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. profiles (Multi-tenant users with RBAC: OWNER, ADMIN, STAFF)
export const profiles = pgTable('profiles', {
  id: serial('id').primaryKey(),
  authUserId: text('auth_user_id').notNull().unique(), // Firebase UID or local auth UID
  companyId: integer('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  passwordHash: text('password_hash').default(''), // For email/password auth fallback alongside Google Auth
  role: text('role').default('OWNER').notNull(), // OWNER | ADMIN | STAFF
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 3. campaigns
export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  description: text('description').default(''),
  sourceChannel: text('source_channel').notNull(), // iFood | Mercado Livre | Shopee | Amazon | Site | WhatsApp | Instagram | Loja física | Outro
  status: text('status').default('active').notNull(), // active | paused | ended
  startDate: timestamp('start_date').defaultNow().notNull(),
  endDate: timestamp('end_date'),
  landingTitle: text('landing_title')
    .default('🎁 Você ganhou uma chance de ganhar um benefício!')
    .notNull(),
  landingSubtitle: text('landing_subtitle')
    .default('Gire a roleta e descubra seu benefício para a próxima compra.')
    .notNull(),
  primaryColor: text('primary_color').default('#4F46E5').notNull(),
  backgroundImage: text('background_image').default(''),
  destinationType: text('destination_type').default('whatsapp').notNull(), // whatsapp | site | app | checkout | other
  destinationUrl: text('destination_url').notNull(),
  whatsappMessageTemplate: text('whatsapp_message_template')
    .default('Olá! Ganhei o cupom {cupom} ({premio}) e quero fazer meu pedido.')
    .notNull(),
  emailRequired: boolean('email_required').default(false).notNull(),
  minimumPurchaseValue: doublePrecision('minimum_purchase_value').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. customers
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  email: text('email').default(''),
  marketingConsent: boolean('marketing_consent').default(false).notNull(),
  marketingConsentAt: timestamp('marketing_consent_at'),
  firstSourceChannel: text('first_source_channel').notNull(),
  crmStatus: text('crm_status').default('active').notNull(), // active | inactive | opt_out | blocked
  lastInteractionAt: timestamp('last_interaction_at').defaultNow().notNull(),
  optOutAt: timestamp('opt_out_at'),
  optOutReason: text('opt_out_reason').default(''),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. campaign_customers
export const campaignCustomers = pgTable('campaign_customers', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id')
    .references(() => campaigns.id, { onDelete: 'cascade' })
    .notNull(),
  customerId: integer('customer_id')
    .references(() => customers.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 6. roulette_configs
export const rouletteConfigs = pgTable('roulette_configs', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id')
    .references(() => campaigns.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').default('Roleta Principal').notNull(),
  active: boolean('active').default(true).notNull(),
  maxSpinsPerCustomer: integer('max_spins_per_customer').default(1).notNull(),
  cooldownHours: integer('cooldown_hours').default(24).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 7. prizes
export const prizes = pgTable('prizes', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id')
    .references(() => campaigns.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  description: text('description').default(''),
  type: text('type').notNull(), // percentage_discount | fixed_discount | free_shipping | free_product | gift | cashback | try_again | no_prize
  value: doublePrecision('value').default(0).notNull(),
  probability: doublePrecision('probability').default(10).notNull(), // 0 - 100
  stock: integer('stock').default(100).notNull(), // -1 for unlimited
  stockUsed: integer('stock_used').default(0).notNull(),
  active: boolean('active').default(true).notNull(),
  minimumPurchaseValue: doublePrecision('minimum_purchase_value').default(0).notNull(),
  expirationDays: integer('expiration_days').default(30).notNull(),
  color: text('color').default('#4F46E5').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 8. spins
export const spins = pgTable('spins', {
  id: serial('id').primaryKey(),
  campaignId: integer('campaign_id')
    .references(() => campaigns.id, { onDelete: 'cascade' })
    .notNull(),
  customerId: integer('customer_id')
    .references(() => customers.id, { onDelete: 'cascade' })
    .notNull(),
  rouletteId: integer('roulette_id')
    .references(() => rouletteConfigs.id, { onDelete: 'cascade' })
    .notNull(),
  prizeId: integer('prize_id')
    .references(() => prizes.id, { onDelete: 'cascade' })
    .notNull(),
  result: text('result').notNull(), // won | try_again | no_prize
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 9. coupons
export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  campaignId: integer('campaign_id')
    .references(() => campaigns.id, { onDelete: 'cascade' })
    .notNull(),
  customerId: integer('customer_id')
    .references(() => customers.id, { onDelete: 'cascade' })
    .notNull(),
  prizeId: integer('prize_id')
    .references(() => prizes.id, { onDelete: 'cascade' })
    .notNull(),
  code: text('code').notNull().unique(),
  discountType: text('discount_type').notNull(),
  discountValue: doublePrecision('discount_value').default(0).notNull(),
  minimumPurchaseValue: doublePrecision('minimum_purchase_value').default(0).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  status: text('status').default('available').notNull(), // available | used | expired | cancelled
  redeemedAt: timestamp('redeemed_at'),
  redemptionChannel: text('redemption_channel'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 10. redemptions
export const redemptions = pgTable('redemptions', {
  id: serial('id').primaryKey(),
  couponId: integer('coupon_id')
    .references(() => coupons.id, { onDelete: 'cascade' })
    .notNull(),
  customerId: integer('customer_id')
    .references(() => customers.id, { onDelete: 'cascade' })
    .notNull(),
  campaignId: integer('campaign_id')
    .references(() => campaigns.id, { onDelete: 'cascade' })
    .notNull(),
  orderValue: doublePrecision('order_value').default(0).notNull(),
  redemptionChannel: text('redemption_channel').default('WhatsApp').notNull(),
  redeemedAt: timestamp('redeemed_at').defaultNow().notNull(),
  metadata: text('metadata').default('{}'),
});

// 11. qr_codes
export const qrCodes = pgTable('qr_codes', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  campaignId: integer('campaign_id')
    .references(() => campaigns.id, { onDelete: 'cascade' })
    .notNull(),
  code: text('code').notNull().unique(),
  destinationUrl: text('destination_url').notNull(),
  sourceChannel: text('source_channel').notNull(),
  active: boolean('active').default(true).notNull(),
  scanCount: integer('scan_count').default(0).notNull(),
  cardTitle: text('card_title').default('OBRIGADO PELA SUA COMPRA! 🎁').notNull(),
  cardSubtitle: text('card_subtitle')
    .default('Quer ganhar um benefício exclusivo para sua próxima compra?')
    .notNull(),
  cardCta: text('card_cta')
    .default('APONTE A CÂMERA DO CELULAR PARA O QR CODE E GIRE A ROLETA')
    .notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 12. qr_scans
export const qrScans = pgTable('qr_scans', {
  id: serial('id').primaryKey(),
  qrCodeId: integer('qr_code_id')
    .references(() => qrCodes.id, { onDelete: 'cascade' })
    .notNull(),
  campaignId: integer('campaign_id')
    .references(() => campaigns.id, { onDelete: 'cascade' })
    .notNull(),
  customerId: integer('customer_id'),
  deviceType: text('device_type').default('mobile').notNull(),
  utmSource: text('utm_source').default(''),
  utmMedium: text('utm_medium').default('qr_code'),
  utmCampaign: text('utm_campaign').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 13. campaign_events
export const campaignEvents = pgTable('campaign_events', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  campaignId: integer('campaign_id')
    .references(() => campaigns.id, { onDelete: 'cascade' })
    .notNull(),
  customerId: integer('customer_id'),
  eventType: text('event_type').notNull(), // page_view | qr_scan | registration | spin | prize_won | coupon_generated | coupon_viewed | destination_clicked | coupon_redeemed
  metadata: text('metadata').default('{}'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// ALFA LINK 2.0 — CRM, WHATSAPP BUSINESS CLOUD API, AUTOMATIONS & LGPD TABLES
// ============================================================================

// 14. whatsapp_connections
export const whatsappConnections = pgTable('whatsapp_connections', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  wabaId: text('waba_id').default('').notNull(),
  phoneNumberId: text('phone_number_id').default('').notNull(),
  displayPhoneNumber: text('display_phone_number').default('').notNull(),
  verifiedBusinessName: text('verified_business_name').default('').notNull(),
  connectionStatus: text('connection_status').default('disconnected').notNull(), // connected | disconnected | pending_verification | error
  webhookStatus: text('webhook_status').default('pending').notNull(), // verified | pending | error
  configStatus: text('config_status').default('incomplete').notNull(), // complete | incomplete |embedded_signup_ready
  tokenReference: text('token_reference').default('').notNull(), // Stored server-side only, never returned raw to client
  connectedAt: timestamp('connected_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 15. message_templates
export const messageTemplates = pgTable('message_templates', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  content: text('content').notNull(),
  metaTemplateName: text('meta_template_name').notNull(),
  language: text('language').default('pt_BR').notNull(),
  category: text('category').default('MARKETING').notNull(), // MARKETING | UTILITY
  approvalStatus: text('approval_status').default('approved').notNull(), // draft | pending | approved | rejected | paused
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 16. automations
export const automations = pgTable('automations', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  description: text('description').default('').notNull(),
  triggerType: text('trigger_type').notNull(), // welcome_spin | coupon_unused | repurchase_incentive | customer_inactive
  delayMinutes: integer('delay_minutes').default(5).notNull(),
  active: boolean('active').default(true).notNull(),
  templateId: integer('template_id').references(() => messageTemplates.id, {
    onDelete: 'set null',
  }),
  customMessage: text('custom_message').default('').notNull(),
  conditions: text('conditions').default('{}').notNull(),
  lastExecutedAt: timestamp('last_executed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 17. scheduled_messages
export const scheduledMessages = pgTable('scheduled_messages', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  customerId: integer('customer_id')
    .references(() => customers.id, { onDelete: 'cascade' })
    .notNull(),
  automationId: integer('automation_id')
    .references(() => automations.id, { onDelete: 'cascade' })
    .notNull(),
  templateId: integer('template_id').references(() => messageTemplates.id, {
    onDelete: 'set null',
  }),
  campaignId: integer('campaign_id').references(() => campaigns.id, {
    onDelete: 'set null',
  }),
  couponId: integer('coupon_id').references(() => coupons.id, {
    onDelete: 'set null',
  }),
  renderedMessage: text('rendered_message').default('').notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  executedAt: timestamp('executed_at'),
  sentAt: timestamp('sent_at'),
  status: text('status').default('pending').notNull(), // pending | processing | sent | failed | cancelled
  attempts: integer('attempts').default(0).notNull(),
  errorMessage: text('error_message').default(''),
  idempotencyKey: text('idempotency_key').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 18. message_logs
export const messageLogs = pgTable('message_logs', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  customerId: integer('customer_id')
    .references(() => customers.id, { onDelete: 'cascade' })
    .notNull(),
  automationId: integer('automation_id').references(() => automations.id, {
    onDelete: 'set null',
  }),
  templateId: integer('template_id').references(() => messageTemplates.id, {
    onDelete: 'set null',
  }),
  scheduledMessageId: integer('scheduled_message_id').references(
    () => scheduledMessages.id,
    { onDelete: 'set null' }
  ),
  whatsappMessageId: text('whatsapp_message_id').default('').notNull(),
  phoneNumberId: text('phone_number_id').default('').notNull(),
  recipientPhone: text('recipient_phone').default('').notNull(),
  renderedContent: text('rendered_content').default('').notNull(),
  messageStatus: text('message_status').default('scheduled').notNull(), // scheduled | sent | delivered | read | failed | cancelled
  errorCode: text('error_code').default(''),
  errorMessage: text('error_message').default(''),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  readAt: timestamp('read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 19. customer_consents
export const customerConsents = pgTable('customer_consents', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  customerId: integer('customer_id')
    .references(() => customers.id, { onDelete: 'cascade' })
    .notNull(),
  channel: text('channel').default('whatsapp').notNull(), // whatsapp | email | sms
  consentType: text('consent_type').default('marketing').notNull(), // marketing | transactional
  consentStatus: text('consent_status').default('granted').notNull(), // granted | revoked
  consentText: text('consent_text')
    .default('Quero receber novidades, ofertas e benefícios desta empresa pelo WhatsApp.')
    .notNull(),
  consentVersion: text('consent_version').default('v1.0-LGPD').notNull(),
  consentSource: text('consent_source').default('roulette_form').notNull(), // roulette_form | admin_panel | webhook_optout
  consentedAt: timestamp('consented_at').defaultNow().notNull(),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 20. automation_executions
export const automationExecutions = pgTable('automation_executions', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id')
    .references(() => companies.id, { onDelete: 'cascade' })
    .notNull(),
  automationId: integer('automation_id')
    .references(() => automations.id, { onDelete: 'cascade' })
    .notNull(),
  customerId: integer('customer_id')
    .references(() => customers.id, { onDelete: 'cascade' })
    .notNull(),
  status: text('status').notNull(), // scheduled | sent | skipped_no_consent | skipped_disconnected | failed | cancelled
  executionDate: timestamp('execution_date').defaultNow().notNull(),
  errorMessage: text('error_message').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
