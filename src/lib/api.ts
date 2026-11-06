import { WorkspaceData } from '../types/alfa.ts';

const TOKEN_STORAGE_KEY = 'alfa_link_session_token';
let memoryAuthToken: string | null = (() => {
  try {
    return typeof window !== 'undefined' ? window.localStorage.getItem(TOKEN_STORAGE_KEY) : null;
  } catch {
    return null;
  }
})();

export function setAuthToken(token: string | null) {
  memoryAuthToken = token;
  try {
    if (typeof window !== 'undefined') {
      if (token) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    }
  } catch {
    // Ignore storage errors in restricted iframes
  }
}

export function getAuthToken(): string | null {
  if (memoryAuthToken) return memoryAuthToken;
  try {
    if (typeof window !== 'undefined') {
      memoryAuthToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      return memoryAuthToken;
    }
  } catch {
    // Ignore storage errors
  }
  return null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const currentToken = getAuthToken();
  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erro na requisição (${res.status})`);
  }
  return data as T;
}

export const api = {
  startDemoSession: () =>
    request<{ token: string; profile: any; company: any }>('/api/auth/demo', {
      method: 'POST',
    }),

  register: (payload: {
    name: string;
    email: string;
    password: string;
    companyName?: string;
  }) =>
    request<{ token: string; profile: any; company: any }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: { email: string; password: string }) =>
    request<{ token: string; profile: any; company: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  syncGoogleUser: (companyName?: string) =>
    request<{ token?: string; profile: any; company: any }>('/api/auth/google-sync', {
      method: 'POST',
      body: JSON.stringify({ companyName }),
    }),

  getWorkspace: () => request<WorkspaceData>('/api/workspace'),

  updateCompany: (payload: Record<string, any>) =>
    request<any>('/api/company', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  createCampaign: (payload: Record<string, any>) =>
    request<any>('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateCampaign: (id: number, payload: Record<string, any>) =>
    request<any>(`/api/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  savePrize: (payload: Record<string, any>) =>
    request<any>('/api/prizes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deletePrize: (id: number) =>
    request<any>(`/api/prizes/${id}`, {
      method: 'DELETE',
    }),

  redeemCoupon: (payload: {
    couponId?: number;
    code?: string;
    orderValue: number;
    redemptionChannel: string;
  }) =>
    request<any>('/api/coupons/redeem', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateQrCard: (
    id: number,
    payload: { cardTitle: string; cardSubtitle: string; cardCta: string }
  ) =>
    request<any>(`/api/qr-codes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  addTeamMember: (payload: { name: string; email: string; role: string }) =>
    request<any>('/api/team', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteCustomer: (id: number) =>
    request<any>(`/api/customers/${id}`, {
      method: 'DELETE',
    }),

  // Alfa Link 2.0 — CRM, WhatsApp Business, Automations, Templates & LGPD
  connectWhatsappBusiness: (payload: {
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber: string;
    verifiedBusinessName: string;
    authCode?: string;
  }) =>
    request<any>('/api/whatsapp/connect', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  disconnectWhatsappBusiness: () =>
    request<any>('/api/whatsapp/disconnect', {
      method: 'POST',
    }),

  saveAutomation: (payload: Record<string, any>) =>
    request<any>('/api/automations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteAutomation: (id: number) =>
    request<any>(`/api/automations/${id}`, {
      method: 'DELETE',
    }),

  testAutomation: (id: number, customerId?: number) =>
    request<any>(`/api/automations/${id}/test`, {
      method: 'POST',
      body: JSON.stringify({ customerId }),
    }),

  cancelScheduledMessage: (id: number) =>
    request<any>(`/api/scheduled-messages/${id}/cancel`, {
      method: 'POST',
    }),

  dispatchScheduledMessageNow: (id: number) =>
    request<any>(`/api/scheduled-messages/${id}/dispatch-now`, {
      method: 'POST',
    }),

  saveTemplate: (payload: Record<string, any>) =>
    request<any>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteTemplate: (id: number) =>
    request<any>(`/api/templates/${id}`, {
      method: 'DELETE',
    }),

  updateCustomerConsent: (
    customerId: number,
    payload: {
      marketingConsent: boolean;
      crmStatus?: string;
      notes?: string;
      reason?: string;
      source?: string;
    }
  ) =>
    request<any>(`/api/customers/${customerId}/consent`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  simulateWebhookEvent: (payload: any) =>
    request<any>('/api/webhooks/whatsapp', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Public Endpoints
  getPublicCampaign: (companySlug: string, campaignSlug: string, qr?: string) =>
    request<{
      company: {
        id: number;
        name: string;
        slug: string;
        logoUrl: string;
        whatsappUrl: string;
        whatsappMessageTemplate?: string;
        websiteUrl: string;
        instagramUrl: string;
      };
      campaign: {
        id: number;
        name: string;
        slug: string;
        sourceChannel: string;
        status: string;
        landingTitle: string;
        landingSubtitle: string;
        primaryColor: string;
        destinationType: string;
        destinationUrl: string;
        whatsappMessageTemplate?: string;
        emailRequired: boolean;
        minimumPurchaseValue: number;
      };
      wheelSlices: Array<{
        id: number;
        name: string;
        description: string;
        type: string;
        value: number;
        color: string;
        minimumPurchaseValue: number;
      }>;
    }>(
      `/api/public/c/${encodeURIComponent(companySlug)}/${encodeURIComponent(campaignSlug)}${
        qr ? `?qr=${encodeURIComponent(qr)}` : ''
      }`
    ),

  executeSpin: (
    companySlug: string,
    campaignSlug: string,
    payload: {
      name: string;
      phone: string;
      email?: string;
      marketingConsent: boolean;
    }
  ) =>
    request<{
      alreadyParticipated: boolean;
      message?: string;
      sliceIndex: number;
      result?: string;
      prize: any;
      coupon: any;
      customer: { id: number; name: string; phone: string };
      scheduledWelcome?: { id: number; scheduledAt: string } | null;
    }>(
      `/api/public/c/${encodeURIComponent(companySlug)}/${encodeURIComponent(campaignSlug)}/spin`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  recordDestinationClick: (payload: {
    companyId: number;
    campaignId: number;
    customerId?: number;
    couponCode?: string;
    destinationType: string;
  }) =>
    request<{ recorded: boolean }>('/api/public/destination-click', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
