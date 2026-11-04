export interface Company {
  id: number;
  name: string;
  slug: string;
  logoUrl: string;
  industry: string;
  phone: string;
  email: string;
  websiteUrl: string;
  whatsappUrl: string;
  whatsappMessageTemplate?: string;
  instagramUrl: string;
  status: string;
  onboardingCompleted: boolean;
  ga4Id: string;
  metaPixelId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamProfile {
  id: number;
  name: string;
  email: string;
  role: 'OWNER' | 'ADMIN' | 'STAFF' | string;
  createdAt: string;
}

export interface Campaign {
  id: number;
  companyId: number;
  name: string;
  slug: string;
  description: string;
  sourceChannel: string;
  status: 'active' | 'paused' | 'ended' | string;
  startDate: string;
  endDate: string | null;
  landingTitle: string;
  landingSubtitle: string;
  primaryColor: string;
  backgroundImage: string;
  destinationType: 'whatsapp' | 'site' | 'app' | 'checkout' | 'other' | string;
  destinationUrl: string;
  whatsappMessageTemplate?: string;
  emailRequired: boolean;
  minimumPurchaseValue: number;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: number;
  companyId: number;
  name: string;
  phone: string;
  email: string;
  marketingConsent: boolean;
  marketingConsentAt: string | null;
  firstSourceChannel: string;
  crmStatus?: 'active' | 'inactive' | 'opt_out' | 'blocked' | string;
  lastInteractionAt?: string;
  optOutAt?: string | null;
  optOutReason?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RouletteConfig {
  id: number;
  campaignId: number;
  name: string;
  active: boolean;
  maxSpinsPerCustomer: number;
  cooldownHours: number;
  createdAt: string;
  updatedAt: string;
}

export interface Prize {
  id: number;
  campaignId: number;
  name: string;
  description: string;
  type:
    | 'percentage_discount'
    | 'fixed_discount'
    | 'free_shipping'
    | 'free_product'
    | 'gift'
    | 'cashback'
    | 'try_again'
    | 'no_prize'
    | string;
  value: number;
  probability: number;
  stock: number;
  stockUsed: number;
  active: boolean;
  minimumPurchaseValue: number;
  expirationDays: number;
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Spin {
  id: number;
  campaignId: number;
  customerId: number;
  rouletteId: number;
  prizeId: number;
  result: 'won' | 'try_again' | 'no_prize' | string;
  createdAt: string;
}

export interface Coupon {
  id: number;
  companyId: number;
  campaignId: number;
  customerId: number;
  prizeId: number;
  code: string;
  discountType: string;
  discountValue: number;
  minimumPurchaseValue: number;
  expiresAt: string;
  status: 'available' | 'used' | 'expired' | 'cancelled' | string;
  redeemedAt: string | null;
  redemptionChannel: string | null;
  createdAt: string;
}

export interface Redemption {
  id: number;
  couponId: number;
  customerId: number;
  campaignId: number;
  orderValue: number;
  redemptionChannel: string;
  redeemedAt: string;
  metadata: string;
}

export interface QrCodeItem {
  id: number;
  companyId: number;
  campaignId: number;
  code: string;
  destinationUrl: string;
  sourceChannel: string;
  active: boolean;
  scanCount: number;
  cardTitle: string;
  cardSubtitle: string;
  cardCta: string;
  createdAt: string;
}

export interface CampaignEvent {
  id: number;
  companyId: number;
  campaignId: number;
  customerId: number | null;
  eventType: string;
  metadata: string;
  createdAt: string;
}

// ============================================================================
// ALFA LINK 2.0 — CRM, WHATSAPP BUSINESS, AUTOMATIONS & LGPD INTERFACES
// ============================================================================

export interface WhatsappConnection {
  id: number;
  companyId: number;
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedBusinessName: string;
  connectionStatus: 'connected' | 'disconnected' | 'pending_verification' | 'error' | string;
  webhookStatus: 'verified' | 'pending' | 'error' | string;
  configStatus: 'complete' | 'incomplete' | 'embedded_signup_ready' | string;
  hasServerToken?: boolean;
  metaAppConfigured?: boolean;
  metaAppId?: string;
  metaConfigId?: string;
  webhookCallbackUrl?: string;
  connectedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageTemplate {
  id: number;
  companyId: number;
  name: string;
  content: string;
  metaTemplateName: string;
  language: string;
  category: 'MARKETING' | 'UTILITY' | string;
  approvalStatus: 'draft' | 'pending' | 'approved' | 'rejected' | 'paused' | 'disabled' | string;
  createdAt: string;
  updatedAt: string;
}

export interface Automation {
  id: number;
  companyId: number;
  name: string;
  description: string;
  triggerType:
    | 'welcome_spin'
    | 'coupon_unused'
    | 'repurchase_incentive'
    | 'customer_inactive'
    | string;
  delayMinutes: number;
  active: boolean;
  templateId: number | null;
  customMessage: string;
  conditions: string;
  lastExecutedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduledMessage {
  id: number;
  companyId: number;
  customerId: number;
  automationId: number;
  templateId: number | null;
  campaignId: number | null;
  couponId: number | null;
  renderedMessage: string;
  scheduledAt: string;
  executedAt: string | null;
  sentAt: string | null;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'cancelled' | string;
  attempts: number;
  errorMessage: string;
  idempotencyKey: string;
  createdAt: string;
}

export interface MessageLog {
  id: number;
  companyId: number;
  customerId: number;
  automationId: number | null;
  templateId: number | null;
  scheduledMessageId: number | null;
  whatsappMessageId: string;
  phoneNumberId: string;
  recipientPhone: string;
  renderedContent: string;
  messageStatus: 'scheduled' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled' | string;
  errorCode: string;
  errorMessage: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface CustomerConsent {
  id: number;
  companyId: number;
  customerId: number;
  channel: string;
  consentType: string;
  consentStatus: 'granted' | 'revoked' | string;
  consentText: string;
  consentVersion: string;
  consentSource: 'roulette_form' | 'admin_panel' | 'webhook_optout' | string;
  consentedAt: string;
  revokedAt: string | null;
  createdAt: string;
}

export interface AutomationExecution {
  id: number;
  companyId: number;
  automationId: number;
  customerId: number;
  status: string;
  executionDate: string;
  errorMessage: string;
  createdAt: string;
}

export interface WorkspaceData {
  company: Company;
  teamProfiles: TeamProfile[];
  campaigns: Campaign[];
  customers: Customer[];
  coupons: Coupon[];
  qrCodes: QrCodeItem[];
  events: CampaignEvent[];
  rouletteConfigs: RouletteConfig[];
  prizes: Prize[];
  spins: Spin[];
  redemptions: Redemption[];
  whatsappConnection: WhatsappConnection;
  messageTemplates: MessageTemplate[];
  automations: Automation[];
  scheduledMessages: ScheduledMessage[];
  messageLogs: MessageLog[];
  customerConsents: CustomerConsent[];
  automationExecutions: AutomationExecution[];
  currentUser: {
    uid: string;
    email: string;
    name: string;
    role: string;
  };
}

export const SOURCE_CHANNELS = [
  'iFood',
  'Mercado Livre',
  'Shopee',
  'Amazon',
  'Site',
  'WhatsApp',
  'Instagram',
  'Loja física',
  'Outro',
] as const;

export const PRIZE_TYPE_LABELS: Record<string, string> = {
  percentage_discount: 'Porcentagem de desconto (%)',
  fixed_discount: 'Desconto em valor (R$)',
  free_shipping: 'Frete grátis',
  free_product: 'Produto grátis',
  gift: 'Brinde exclusivo',
  cashback: 'Cashback',
  try_again: 'Outra chance (Giro extra)',
  no_prize: 'Sem prêmio',
};

export const TRIGGER_TYPE_LABELS: Record<string, string> = {
  welcome_spin: 'Novo cadastro na roleta (Boas-vindas)',
  coupon_unused: 'Cupom disponível e ainda não utilizado',
  repurchase_incentive: 'Cliente participou de uma campanha (Recompra)',
  customer_inactive: 'Cliente sem nova interação há 30 dias (Reativação)',
};
