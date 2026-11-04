import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Filter,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Sparkles,
  Plus,
  Edit3,
  Trash2,
  Play,
  Pause,
  Send,
  FileText,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  X,
  Lock,
  BookOpen,
  Zap,
  ArrowRight,
  Ban,
  Eye,
  BarChart3,
  Phone,
  Mail,
  Calendar,
  Award,
  Ticket,
} from 'lucide-react';
import {
  WorkspaceData,
  Customer,
  Automation,
  MessageTemplate,
  SOURCE_CHANNELS,
  TRIGGER_TYPE_LABELS,
} from '../types/alfa.ts';
import { api } from '../lib/api.ts';

interface ModuleProps {
  workspace: WorkspaceData;
  onRefresh: () => Promise<void>;
  onNavigateTab?: (tab: string) => void;
}

function renderPreviewText(text: string, companyName: string): string {
  return (text || '')
    .replace(/\{\{\s*nome\s*\}\}/gi, 'João Silva')
    .replace(/\{\s*nome\s*\}/gi, 'João Silva')
    .replace(/\{\{\s*empresa\s*\}\}/gi, companyName)
    .replace(/\{\s*empresa\s*\}/gi, companyName)
    .replace(/\{\{\s*premio\s*\}\}/gi, '10% OFF')
    .replace(/\{\s*premio\s*\}/gi, '10% OFF')
    .replace(/\{\{\s*cupom\s*\}\}/gi, 'ALFA-10OFF')
    .replace(/\{\s*cupom\s*\}/gi, 'ALFA-10OFF')
    .replace(/\[LINK DO CANAL PRÓPRIO\]/gi, 'https://wa.me/5511999998888');
}

// ============================================================================
// 1. NOVO DASHBOARD CRM & FUNIL DE 7 ETAPAS (SEÇÃO 11)
// ============================================================================

export const CrmAnalyticsDashboardSection: React.FC<ModuleProps> = ({
  workspace,
  onNavigateTab,
}) => {
  const {
    customers,
    coupons,
    redemptions,
    events,
    campaigns,
    automations,
    messageLogs,
    scheduledMessages,
  } = workspace;

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 86400000;

  const totalCustomers = customers.length;
  const newCustomers = customers.filter(
    (c) => new Date(c.createdAt).getTime() >= sevenDaysAgo
  ).length;

  const sentMessages = messageLogs.filter((m) =>
    ['sent', 'delivered', 'read'].includes(m.messageStatus)
  ).length;
  const deliveredMessages = messageLogs.filter((m) =>
    ['delivered', 'read'].includes(m.messageStatus)
  ).length;
  const readMessages = messageLogs.filter((m) => m.messageStatus === 'read').length;

  const deliveryRate =
    sentMessages > 0 ? ((deliveredMessages / sentMessages) * 100).toFixed(1) : '0.0';
  const readRate =
    deliveredMessages > 0 ? ((readMessages / deliveredMessages) * 100).toFixed(1) : '0.0';

  const usedCoupons = coupons.filter((c) => c.status === 'used').length;

  // Customers who received a WhatsApp automation and subsequently clicked or redeemed
  const messagedCustomerIds = new Set(
    messageLogs
      .filter((m) => ['sent', 'delivered', 'read'].includes(m.messageStatus))
      .map((m) => m.customerId)
  );
  const redeemedCustomerIds = new Set(redemptions.map((r) => r.customerId));
  const recoveredCustomers = Array.from(redeemedCustomerIds).filter((id) =>
    messagedCustomerIds.has(id)
  ).length;

  const attributedRepurchases = redemptions.length;
  const confirmedRevenue = redemptions.reduce(
    (acc, r) => acc + Number(r.orderValue || 0),
    0
  );

  // 7-Stage CRM Funnel
  const consentedCount = customers.filter((c) => c.marketingConsent).length;
  const scheduledCount = scheduledMessages.length;
  const clickEventsCount = events.filter(
    (e) => e.eventType === 'destination_clicked'
  ).length;

  const funnelStages = [
    {
      step: '1. CADASTRO',
      count: totalCustomers,
      desc: 'Clientes capturados na roleta',
      type: 'Comprovado',
      color: '#4F46E5',
    },
    {
      step: '2. CONSENTIMENTO LGPD',
      count: consentedCount,
      desc: 'Opt-in válido para WhatsApp',
      type: 'Comprovado',
      color: '#6366F1',
    },
    {
      step: '3. MENSAGEM AGENDADA',
      count: scheduledCount,
      desc: 'Tarefas criadas na fila persistente',
      type: 'Comprovado',
      color: '#0284C7',
    },
    {
      step: '4. MENSAGEM ENVIADA',
      count: sentMessages,
      desc: `${deliveredMessages} entregues · ${readMessages} lidas`,
      type: 'Comprovado',
      color: '#0D9488',
    },
    {
      step: '5. CLIQUE NO LINK',
      count: clickEventsCount,
      desc: 'Intenção de compra (não equivale a venda)',
      type: 'Intenção / Estimado',
      color: '#D97706',
    },
    {
      step: '6. CUPOM RESGATADO',
      count: usedCoupons,
      desc: 'Baixa validada pelo estabelecimento',
      type: 'Comprovado',
      color: '#16A34A',
    },
    {
      step: '7. RECOMPRA ATRIBUÍDA',
      count: attributedRepurchases,
      desc: `Receita comprovada: R$ ${confirmedRevenue.toFixed(2)}`,
      type: 'Comprovado',
      color: '#059669',
    },
  ];

  const maxFunnel = Math.max(1, totalCustomers, clickEventsCount);

  // Origins distribution
  const byOrigin = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of customers) {
      map[c.firstSourceChannel] = (map[c.firstSourceChannel] || 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [customers]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-semibold">
            INTELIGÊNCIA DE PÓS-VENDA & AUTOMAÇÃO WHATSAPP
          </span>
          <h3 className="text-lg font-display font-bold mt-0.5">
            Indicadores de CRM, Mensageria & Retenção Multi-Tenant
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Métricas separadas entre engajamento estimado (cliques) e conversões comprovadas (cupons validados e recompras).
          </p>
        </div>
        {onNavigateTab && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateTab('automations')}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white cursor-pointer"
            >
              Gerenciar Automações
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('customers')}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer"
            >
              Abrir CRM Completo
            </button>
          </div>
        )}
      </div>

      {/* 10 CRM KPIs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Total de Clientes</p>
          <p className="text-2xl font-display font-extrabold text-slate-900 font-mono tabular-nums mt-1">
            {totalCustomers}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Base própria no CRM</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Novos Clientes (7d)</p>
          <p className="text-2xl font-display font-extrabold text-indigo-600 font-mono tabular-nums mt-1">
            +{newCustomers}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Capturados via Roleta</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Mensagens Enviadas</p>
          <p className="text-2xl font-display font-extrabold text-slate-900 font-mono tabular-nums mt-1">
            {sentMessages}
          </p>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">
            {deliveredMessages} entregues ({deliveryRate}%)
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Mensagens Lidas</p>
          <p className="text-2xl font-display font-extrabold text-sky-600 font-mono tabular-nums mt-1">
            {readMessages}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Taxa de leitura: {readRate}%</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Cupons Utilizados</p>
          <p className="text-2xl font-display font-extrabold text-emerald-600 font-mono tabular-nums mt-1">
            {usedCoupons}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {recoveredCustomers} clientes recuperados · {attributedRepurchases} recompras
          </p>
        </div>
      </div>

      {/* 7-Step CRM & WhatsApp Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-display font-bold text-slate-900">
                Funil Completo de Relacionamento & Recompra (7 Etapas)
              </h4>
              <p className="text-[11px] text-slate-500">
                Rastreamento desde o cadastro na roleta até a recompra comprovada no canal próprio.
              </p>
            </div>
            <span className="text-[11px] font-mono bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-semibold">
              Comprovado vs. Intenção
            </span>
          </div>

          <div className="space-y-3">
            {funnelStages.map((st) => {
              const pct = Math.min(100, Math.max(6, Math.round((st.count / maxFunnel) * 100)));
              return (
                <div key={st.step} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">{st.step}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          st.type === 'Comprovado'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {st.type}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {st.count}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: st.color }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">{st.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Performance of Automations & Origins */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3.5">
            <h4 className="text-sm font-display font-bold text-slate-900 border-b border-slate-100 pb-2.5">
              Desempenho por Automação de WhatsApp
            </h4>
            <div className="space-y-3 text-xs">
              {automations.map((aut) => {
                const logs = messageLogs.filter((m) => m.automationId === aut.id);
                const sent = logs.filter((m) =>
                  ['sent', 'delivered', 'read'].includes(m.messageStatus)
                ).length;
                const read = logs.filter((m) => m.messageStatus === 'read').length;
                return (
                  <div
                    key={aut.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-bold text-slate-900">{aut.name}</p>
                      <p className="text-[11px] text-slate-500">
                        Espera: {aut.delayMinutes} min ·{' '}
                        {aut.active ? (
                          <span className="text-emerald-600 font-semibold">Ativa</span>
                        ) : (
                          <span className="text-slate-400">Pausada</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right font-mono">
                      <p className="font-bold text-slate-900">{sent} enviadas</p>
                      <p className="text-[11px] text-sky-600">{read} lidas</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
            <h4 className="text-sm font-display font-bold text-slate-900 border-b border-slate-100 pb-2.5">
              Crescimento da Base por Canal de Origem
            </h4>
            <div className="space-y-2.5 text-xs">
              {byOrigin.map(([channel, count]) => {
                const pct =
                  totalCustomers > 0 ? Math.round((count / totalCustomers) * 100) : 0;
                return (
                  <div key={channel} className="space-y-1">
                    <div className="flex justify-between font-medium">
                      <span className="text-slate-700">{channel}</span>
                      <span className="font-mono font-semibold text-slate-900">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. MÓDULO CRM COMPLETO + PERFIL 360° DO CLIENTE + LGPD (SEÇÃO 3 & 10)
// ============================================================================

export const CrmCustomersFullView: React.FC<ModuleProps> = ({ workspace, onRefresh }) => {
  const {
    customers,
    campaigns,
    coupons,
    prizes,
    spins,
    redemptions,
    events,
    messageLogs,
    scheduledMessages,
    customerConsents,
    automations,
  } = workspace;

  // Filters state
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState<'all' | '7d' | '30d'>('all');
  const [originFilter, setOriginFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [couponFilter, setCouponFilter] = useState('all');
  const [consentFilter, setConsentFilter] = useState('all');
  const [messageFilter, setMessageFilter] = useState('all');

  // Selected customer for full 360° profile modal/drawer
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [notesInput, setNotesInput] = useState('');
  const [savingCustomer, setSavingCustomer] = useState(false);

  const now = Date.now();
  const sevenDaysMs = 7 * 86400000;
  const thirtyDaysMs = 30 * 86400000;

  // Enrich customers with their latest spin, coupon, messages, clicks, and repurchases
  const enrichedCustomers = useMemo(() => {
    return customers.map((cust) => {
      const custCoupons = coupons.filter((c) => c.customerId === cust.id);
      const latestCoupon = custCoupons[0] || null;
      const latestPrize = latestCoupon
        ? prizes.find((p) => p.id === latestCoupon.prizeId) || null
        : null;
      const latestCampaign = latestCoupon
        ? campaigns.find((c) => c.id === latestCoupon.campaignId) || null
        : campaigns[0] || null;

      const custMessages = messageLogs.filter((m) => m.customerId === cust.id);
      const receivedMessagesCount = custMessages.filter((m) =>
        ['sent', 'delivered', 'read'].includes(m.messageStatus)
      ).length;

      const custClicks = events.filter(
        (e) => e.customerId === cust.id && e.eventType === 'destination_clicked'
      ).length;

      const custRedemptions = redemptions.filter((r) => r.customerId === cust.id);
      const lastInteractionDate = cust.lastInteractionAt || cust.updatedAt || cust.createdAt;
      const isInactiveByTime =
        now - new Date(lastInteractionDate).getTime() > thirtyDaysMs;

      const effectiveStatus =
        cust.crmStatus === 'opt_out' || (!cust.marketingConsent && cust.optOutAt)
          ? 'opt_out'
          : isInactiveByTime
          ? 'inactive'
          : 'active';

      return {
        ...cust,
        latestCoupon,
        latestPrize,
        latestCampaign,
        custCoupons,
        custMessages,
        receivedMessagesCount,
        custClicks,
        custRedemptions,
        lastInteractionDate,
        effectiveStatus,
      };
    });
  }, [customers, coupons, prizes, campaigns, messageLogs, events, redemptions, now, thirtyDaysMs]);

  // Overview KPIs (Section 3)
  const totalCount = enrichedCustomers.length;
  const newCount = enrichedCustomers.filter(
    (c) => now - new Date(c.createdAt).getTime() <= sevenDaysMs
  ).length;
  const activeCount = enrichedCustomers.filter((c) => c.effectiveStatus === 'active').length;
  const inactiveCount = enrichedCustomers.filter(
    (c) => c.effectiveStatus === 'inactive'
  ).length;
  const messagedCount = enrichedCustomers.filter(
    (c) => c.receivedMessagesCount > 0
  ).length;
  const clickedCount = enrichedCustomers.filter((c) => c.custClicks > 0).length;
  const usedCouponCount = enrichedCustomers.filter((c) =>
    c.custCoupons.some((cp) => cp.status === 'used')
  ).length;
  const repurchasedCount = enrichedCustomers.filter(
    (c) => c.custRedemptions.length > 0
  ).length;

  // Filtered Customers
  const filteredCustomers = useMemo(() => {
    return enrichedCustomers.filter((c) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = c.phone.toLowerCase().includes(q);
        const matchEmail = (c.email || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail) return false;
      }

      if (periodFilter === '7d' && now - new Date(c.createdAt).getTime() > sevenDaysMs) {
        return false;
      }
      if (periodFilter === '30d' && now - new Date(c.createdAt).getTime() > thirtyDaysMs) {
        return false;
      }

      if (originFilter !== 'all' && c.firstSourceChannel !== originFilter) {
        return false;
      }

      if (
        campaignFilter !== 'all' &&
        String(c.latestCampaign?.id || '') !== campaignFilter
      ) {
        return false;
      }

      if (statusFilter !== 'all' && c.effectiveStatus !== statusFilter) {
        return false;
      }

      if (couponFilter === 'available' && c.latestCoupon?.status !== 'available') {
        return false;
      }
      if (couponFilter === 'used' && c.latestCoupon?.status !== 'used') {
        return false;
      }
      if (couponFilter === 'none' && c.latestCoupon) {
        return false;
      }

      if (consentFilter === 'granted' && !c.marketingConsent) {
        return false;
      }
      if (consentFilter === 'revoked' && c.marketingConsent) {
        return false;
      }

      if (messageFilter === 'received' && c.receivedMessagesCount === 0) {
        return false;
      }
      if (messageFilter === 'not_received' && c.receivedMessagesCount > 0) {
        return false;
      }

      return true;
    });
  }, [
    enrichedCustomers,
    search,
    periodFilter,
    originFilter,
    campaignFilter,
    statusFilter,
    couponFilter,
    consentFilter,
    messageFilter,
    now,
    sevenDaysMs,
    thirtyDaysMs,
  ]);

  const selectedCustomer = useMemo(
    () => enrichedCustomers.find((c) => c.id === selectedCustomerId) || null,
    [enrichedCustomers, selectedCustomerId]
  );

  const openCustomerProfile = (cust: (typeof enrichedCustomers)[0]) => {
    setSelectedCustomerId(cust.id);
    setNotesInput(cust.notes || '');
  };

  const handleToggleConsent = async (cust: Customer, nextConsent: boolean, reason?: string) => {
    setSavingCustomer(true);
    try {
      await api.updateCustomerConsent(cust.id, {
        marketingConsent: nextConsent,
        crmStatus: nextConsent ? 'active' : 'opt_out',
        notes: notesInput,
        reason:
          reason ||
          (nextConsent
            ? 'Consentimento reativado no perfil do CRM'
            : 'Consentimento revogado / Opt-out registrado no CRM'),
        source: 'admin_panel',
      });
      await onRefresh();
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleSaveNotes = async (cust: Customer) => {
    setSavingCustomer(true);
    try {
      await api.updateCustomerConsent(cust.id, {
        marketingConsent: cust.marketingConsent,
        crmStatus: cust.crmStatus || 'active',
        notes: notesInput,
        reason: 'Atualização de observações no CRM',
        source: 'admin_panel',
      });
      await onRefresh();
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleDeleteCustomerLgpd = async (customerId: number) => {
    setSavingCustomer(true);
    try {
      await api.deleteCustomer(customerId);
      setSelectedCustomerId(null);
      await onRefresh();
    } finally {
      setSavingCustomer(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">
            CRM de Clientes & Pós-Venda Multi-Canal
          </h2>
          <p className="text-xs text-slate-500">
            Todos os clientes capturados nas roletas alimentam automaticamente esta base isolada com histórico de cupons, cliques, mensagens e consentimento LGPD.
          </p>
        </div>
      </div>

      {/* 8 Overview Metrics Required in Section 3 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Total Clientes</p>
          <p className="text-xl font-display font-extrabold text-slate-900 font-mono mt-1">
            {totalCount}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Novos (7 dias)</p>
          <p className="text-xl font-display font-extrabold text-indigo-600 font-mono mt-1">
            +{newCount}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Ativos</p>
          <p className="text-xl font-display font-extrabold text-emerald-600 font-mono mt-1">
            {activeCount}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Inativos</p>
          <p className="text-xl font-display font-extrabold text-amber-600 font-mono mt-1">
            {inactiveCount}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Receberam Msg</p>
          <p className="text-xl font-display font-extrabold text-sky-600 font-mono mt-1">
            {messagedCount}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Clicaram Link</p>
          <p className="text-xl font-display font-extrabold text-slate-900 font-mono mt-1">
            {clickedCount}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Usaram Cupom</p>
          <p className="text-xl font-display font-extrabold text-emerald-700 font-mono mt-1">
            {usedCouponCount}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase">Recompras</p>
          <p className="text-xl font-display font-extrabold text-indigo-700 font-mono mt-1">
            {repurchasedCount}
          </p>
        </div>
      </div>

      {/* Search & 7 Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente por nome, telefone (WhatsApp) ou e-mail..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-300 text-xs focus:outline-none focus:border-indigo-600"
            />
          </div>

          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value as any)}
            className="h-10 px-3 rounded-xl border border-slate-300 bg-white"
          >
            <option value="all">Período: Todo o histórico</option>
            <option value="7d">Período: Últimos 7 dias</option>
            <option value="30d">Período: Últimos 30 dias</option>
          </select>

          <select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-300 bg-white"
          >
            <option value="all">Origem: Todos os canais</option>
            {SOURCE_CHANNELS.map((ch) => (
              <option key={ch} value={ch}>
                Origem: {ch}
              </option>
            ))}
          </select>

          <select
            value={campaignFilter}
            onChange={(e) => setCampaignFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-300 bg-white"
          >
            <option value="all">Campanha: Todas</option>
            {campaigns.map((camp) => (
              <option key={camp.id} value={String(camp.id)}>
                {camp.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-300 bg-white"
          >
            <option value="all">Status CRM: Todos</option>
            <option value="active">Status: Ativos</option>
            <option value="inactive">Status: Inativos (+30d)</option>
            <option value="opt_out">Status: Opt-out / Descadastrados</option>
          </select>

          <select
            value={couponFilter}
            onChange={(e) => setCouponFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-300 bg-white"
          >
            <option value="all">Cupom: Todos</option>
            <option value="available">Cupom Disponível</option>
            <option value="used">Cupom Utilizado (Recompra)</option>
            <option value="none">Sem Cupom</option>
          </select>

          <select
            value={consentFilter}
            onChange={(e) => setConsentFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-slate-300 bg-white"
          >
            <option value="all">Consentimento LGPD: Todos</option>
            <option value="granted">Com Consentimento WhatsApp</option>
            <option value="revoked">Sem Consentimento / Revogado</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium">Filtro de Mensagens:</span>
            <button
              type="button"
              onClick={() => setMessageFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                messageFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({enrichedCustomers.length})
            </button>
            <button
              type="button"
              onClick={() => setMessageFilter('received')}
              className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                messageFilter === 'received'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Receberam mensagens ({messagedCount})
            </button>
            <button
              type="button"
              onClick={() => setMessageFilter('not_received')}
              className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                messageFilter === 'not_received'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Não receberam mensagens ({totalCount - messagedCount})
            </button>
          </div>
          <span className="text-[11px] text-slate-500">
            Exibindo <strong>{filteredCustomers.length}</strong> cliente(s) · Clique em um cliente para abrir o Histórico 360°
          </span>
        </div>
      </div>

      {/* CRM Customers Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                <th className="py-3 px-4">Cliente (Nome / E-mail)</th>
                <th className="py-3 px-4">Telefone (WhatsApp)</th>
                <th className="py-3 px-4">Origem & Campanha</th>
                <th className="py-3 px-4">Cadastro / Últ. Interação</th>
                <th className="py-3 px-4">Último Prêmio & Cupom</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Consentimento LGPD</th>
                <th className="py-3 px-4 text-right">Perfil 360°</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCustomers.map((cust) => (
                <tr
                  key={cust.id}
                  onClick={() => openCustomerProfile(cust)}
                  className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                >
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{cust.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {cust.email || 'Sem e-mail informado'}
                    </p>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                    {cust.phone}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-800">{cust.firstSourceChannel}</p>
                    <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                      {cust.latestCampaign?.name || 'Campanha Principal'}
                    </p>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 tabular-nums">
                    <p>Cad: {new Date(cust.createdAt).toLocaleDateString('pt-BR')}</p>
                    <p className="text-slate-400">
                      Int: {new Date(cust.lastInteractionDate).toLocaleDateString('pt-BR')}
                    </p>
                  </td>
                  <td className="py-3.5 px-4">
                    {cust.latestCoupon ? (
                      <div>
                        <p className="font-semibold text-slate-800">
                          {cust.latestPrize?.name || 'Benefício'}
                        </p>
                        <p className="font-mono text-[11px] text-indigo-600 font-semibold">
                          {cust.latestCoupon.code} ({cust.latestCoupon.status === 'used' ? 'Usado' : 'Ativo'})
                        </p>
                      </div>
                    ) : (
                      <span className="text-slate-400">Sem cupom</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        cust.effectiveStatus === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : cust.effectiveStatus === 'opt_out'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {cust.effectiveStatus === 'active'
                        ? 'Ativo'
                        : cust.effectiveStatus === 'opt_out'
                        ? 'Opt-out'
                        : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {cust.marketingConsent ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Autorizado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                        <XCircle className="w-3.5 h-3.5" />
                        Não autorizado
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCustomerProfile(cust);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 font-semibold transition-colors cursor-pointer"
                    >
                      Ver Histórico
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer 360° Full History Modal / Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full p-6 shadow-2xl max-h-[92vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-[11px] font-mono uppercase text-indigo-600 font-semibold">
                  PERFIL 360° DO CLIENTE · ID #{selectedCustomer.id}
                </span>
                <h3 className="text-xl font-display font-bold text-slate-900 mt-0.5">
                  {selectedCustomer.name}
                </h3>
                <p className="text-xs text-slate-500">
                  WhatsApp: <strong className="font-mono">{selectedCustomer.phone}</strong> · E-mail:{' '}
                  <strong>{selectedCustomer.email || 'Não informado'}</strong> · Origem:{' '}
                  <strong>{selectedCustomer.firstSourceChannel}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerId(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-slate-500">Status de Consentimento</p>
                <p className="font-bold text-sm mt-1">
                  {selectedCustomer.marketingConsent ? (
                    <span className="text-emerald-700">✓ Opt-in Ativo (LGPD)</span>
                  ) : (
                    <span className="text-rose-600">✕ Sem Consentimento / Opt-out</span>
                  )}
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-slate-500">Mensagens WhatsApp</p>
                <p className="font-bold text-sm font-mono mt-1 text-slate-900">
                  {selectedCustomer.custMessages.length} registro(s)
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-slate-500">Cupons Emitidos</p>
                <p className="font-bold text-sm font-mono mt-1 text-slate-900">
                  {selectedCustomer.custCoupons.length} cupom(ns)
                </p>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <p className="text-slate-500">Recompras Validadas</p>
                <p className="font-bold text-sm font-mono mt-1 text-emerald-700">
                  {selectedCustomer.custRedemptions.length} pedido(s)
                </p>
              </div>
            </div>

            {/* Individual WhatsApp Message History */}
            <div className="space-y-2.5">
              <h4 className="text-sm font-display font-bold text-slate-900">
                Histórico Individual de Mensagens WhatsApp
              </h4>
              {selectedCustomer.custMessages.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                  Nenhuma mensagem enviada ou agendada para este cliente até o momento.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500">
                        <th className="py-2.5 px-3">Automação</th>
                        <th className="py-2.5 px-3">Conteúdo Enviado</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Data / Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedCustomer.custMessages.map((m) => {
                        const aut = automations.find((a) => a.id === m.automationId);
                        return (
                          <tr key={m.id}>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              {aut?.name || 'Automação WhatsApp'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate">
                              {m.renderedContent}
                            </td>
                            <td className="py-2.5 px-3 font-semibold">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] ${
                                  m.messageStatus === 'read'
                                    ? 'bg-sky-50 text-sky-700'
                                    : m.messageStatus === 'delivered' || m.messageStatus === 'sent'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : m.messageStatus === 'scheduled'
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'bg-rose-50 text-rose-700'
                                }`}
                              >
                                {m.messageStatus.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                              {new Date(m.sentAt || m.createdAt).toLocaleString('pt-BR')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* LGPD Consent History & Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200 text-xs">
              <div className="space-y-2">
                <h4 className="text-sm font-display font-bold text-slate-900">
                  Trilha de Auditoria LGPD (Consentimentos)
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {customerConsents
                    .filter((cc) => cc.customerId === selectedCustomer.id)
                    .map((cc) => (
                      <div
                        key={cc.id}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span
                            className={
                              cc.consentStatus === 'granted'
                                ? 'text-emerald-700'
                                : 'text-rose-600'
                            }
                          >
                            {cc.consentStatus === 'granted'
                              ? '✓ Consentimento Concedido'
                              : '✕ Consentimento Revogado'}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            {new Date(cc.createdAt).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1">"{cc.consentText}"</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                          Origem: {cc.consentSource} · Versão: {cc.consentVersion}
                        </p>
                      </div>
                    ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-display font-bold text-slate-900">
                  Observações do CRM & Ações de Privacidade (LGPD)
                </h4>
                <textarea
                  rows={2}
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Adicione anotações sobre o perfil de compra deste cliente..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={savingCustomer}
                    onClick={() => handleSaveNotes(selectedCustomer)}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                  >
                    Salvar Anotações
                  </button>

                  {selectedCustomer.marketingConsent ? (
                    <button
                      type="button"
                      disabled={savingCustomer}
                      onClick={() =>
                        handleToggleConsent(
                          selectedCustomer,
                          false,
                          'Descadastramento / Bloqueio de mensagens solicitado pelo cliente (LGPD).'
                        )
                      }
                      className="px-3 py-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold cursor-pointer"
                    >
                      Revogar Consentimento (Opt-out)
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={savingCustomer}
                      onClick={() =>
                        handleToggleConsent(
                          selectedCustomer,
                          true,
                          'Consentimento autorizado pelo cliente.'
                        )
                      }
                      className="px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold cursor-pointer"
                    >
                      Reativar Consentimento
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={savingCustomer}
                    onClick={() => handleDeleteCustomerLgpd(selectedCustomer.id)}
                    className="px-3 py-2 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold cursor-pointer"
                  >
                    Excluir Dados (LGPD)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. MÓDULO DE AUTOMAÇÕES & BOAS-VINDAS EM 5 MINUTOS (SEÇÃO 5 & 6)
// ============================================================================

export const AutomationsModuleView: React.FC<ModuleProps> = ({ workspace, onRefresh }) => {
  const { company, automations, messageTemplates, whatsappConnection, customers } = workspace;

  const [editingAut, setEditingAut] = useState<Automation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('welcome_spin');
  const [delayMinutes, setDelayMinutes] = useState(5);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const openEdit = (aut: Automation) => {
    setEditingAut(aut);
    setName(aut.name);
    setDescription(aut.description);
    setTriggerType(aut.triggerType);
    setDelayMinutes(aut.delayMinutes);
    setTemplateId(aut.templateId);
    setCustomMessage(aut.customMessage);
    setActive(aut.active);
    setShowModal(true);
  };

  const openCreate = () => {
    const approvedTpl = messageTemplates.find((t) => t.approvalStatus === 'approved');
    setEditingAut(null);
    setName('');
    setDescription('');
    setTriggerType('welcome_spin');
    setDelayMinutes(5);
    setTemplateId(approvedTpl?.id || null);
    setCustomMessage(
      approvedTpl?.content ||
        `Olá, {{nome}}! 🍕\n\nAqui é da {{empresa}}!\n\nVocê participou da nossa roleta e ganhou {{premio}}!\n\nSeu cupom exclusivo é:\n\n🎁 {{cupom}}\n\nQue tal aproveitar seu benefício e fazer seu próximo pedido diretamente conosco?\n\n[LINK DO CANAL PRÓPRIO]\n\nEsperamos você novamente!`
    );
    setActive(true);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.saveAutomation({
        id: editingAut?.id,
        name,
        description,
        triggerType,
        delayMinutes: Number(delayMinutes),
        templateId,
        customMessage,
        active,
      });
      await onRefresh();
      setShowModal(false);
      setFeedbackMsg('Automação salva com sucesso!');
      setTimeout(() => setFeedbackMsg(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (aut: Automation) => {
    await api.saveAutomation({
      ...aut,
      active: !aut.active,
    });
    await onRefresh();
  };

  const handleDelete = async (id: number) => {
    await api.deleteAutomation(id);
    await onRefresh();
  };

  const handleTestAutomation = async (aut: Automation) => {
    try {
      await api.testAutomation(aut.id);
      await onRefresh();
      setFeedbackMsg(
        `Tarefa agendada com sucesso para "${aut.name}" (${aut.delayMinutes} min). Confira na aba Mensagens!`
      );
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err: any) {
      setFeedbackMsg(`Erro: ${err.message}`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">
            Automações de Relacionamento & Pós-Venda (WhatsApp)
          </h2>
          <p className="text-xs text-slate-500">
            Configure fluxos automáticos acionados por eventos da roleta, cupons não utilizados, incentivo à recompra e reativação de clientes inativos.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nova Automação</span>
        </button>
      </div>

      {/* Safety & LGPD Protection Rules Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">
              Travas de Segurança e Conformidade LGPD Ativas no Servidor
            </p>
            <p className="text-slate-300 text-[11px] mt-0.5">
              Nenhuma automação promocional é executada se o cliente não tiver consentimento LGPD válido, se tiver respondido SAIR/PARAR, se o cupom estiver cancelado ou se o template não estiver aprovado.
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <span
            className={`px-3 py-1.5 rounded-xl font-semibold text-[11px] inline-flex items-center gap-1.5 ${
              whatsappConnection.connectionStatus === 'connected'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5" />
            {whatsappConnection.connectionStatus === 'connected'
              ? `WhatsApp Conectado (${whatsappConnection.displayPhoneNumber})`
              : 'WhatsApp Business Desconectado'}
          </span>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-semibold">
          {feedbackMsg}
        </div>
      )}

      {/* Automations Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {automations.map((aut) => {
          const tpl = messageTemplates.find((t) => t.id === aut.templateId);
          return (
            <div
              key={aut.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold">
                        {aut.triggerType === 'welcome_spin'
                          ? 'AUTOMAÇÃO PRINCIPAL · 5 MIN'
                          : 'FLUXO CRM'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          aut.active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {aut.active ? 'ATIVA' : 'PAUSADA'}
                      </span>
                    </div>
                    <h3 className="text-base font-display font-bold text-slate-900 mt-1.5">
                      {aut.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{aut.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Gatilho
                    </span>
                    <span className="font-semibold text-slate-800">
                      {TRIGGER_TYPE_LABELS[aut.triggerType] || aut.triggerType}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Tempo de Espera
                    </span>
                    <span className="font-mono font-bold text-indigo-600">
                      {aut.delayMinutes >= 1440
                        ? `${Math.round(aut.delayMinutes / 1440)} dia(s) (${aut.delayMinutes} min)`
                        : `${aut.delayMinutes} minuto(s)`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Template Vinculado
                    </span>
                    <span className="font-medium text-slate-700">
                      {tpl ? `${tpl.name} (${tpl.approvalStatus})` : 'Mensagem personalizada'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Última Execução
                    </span>
                    <span className="font-mono text-[11px] text-slate-600">
                      {aut.lastExecutedAt
                        ? new Date(aut.lastExecutedAt).toLocaleString('pt-BR')
                        : 'Aguardando gatilho'}
                    </span>
                  </div>
                </div>

                {/* Live WhatsApp Message Preview */}
                <div className="p-3 rounded-xl bg-emerald-950/5 border border-emerald-200/80 space-y-1">
                  <span className="text-[10px] font-semibold text-emerald-800 uppercase">
                    Prévia da Mensagem ({company.name}):
                  </span>
                  <p className="text-xs text-slate-700 whitespace-pre-line font-sans leading-relaxed line-clamp-4">
                    {renderPreviewText(aut.customMessage, company.name)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(aut)}
                    className={`px-3 py-1.5 rounded-xl font-semibold flex items-center gap-1.5 cursor-pointer ${
                      aut.active
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-800'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {aut.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{aut.active ? 'Pausar' : 'Ativar'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openEdit(aut)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editar Mensagem / Intervalo</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleTestAutomation(aut)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Testar Agendamento</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(aut.id)}
                    className="p-1.5 rounded-xl border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-400 cursor-pointer"
                    title="Excluir Automação"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit / Create Automation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <h3 className="text-lg font-display font-bold text-slate-900">
                {editingAut ? `Configurar Automação: ${editingAut.name}` : 'Nova Automação de WhatsApp'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nome da Automação *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: BOAS-VINDAS AUTOMÁTICAS"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Descrição</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Gatilho de Disparo
                  </label>
                  <select
                    value={triggerType}
                    onChange={(e) => setTriggerType(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="welcome_spin">Novo cadastro na roleta (Boas-vindas)</option>
                    <option value="coupon_unused">Cupom disponível e não utilizado</option>
                    <option value="repurchase_incentive">Incentivo à recompra pós-campanha</option>
                    <option value="customer_inactive">Reativação de cliente inativo (+30d)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Intervalo de Envio (em minutos) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={delayMinutes}
                    onChange={(e) => setDelayMinutes(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono"
                  />
                  <span className="text-[10px] text-slate-500">
                    Padrão boas-vindas: 5 min · 24h = 1440 min · 7 dias = 10080 min
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Template Aprovado (Meta WhatsApp Platform)
                  </label>
                  <select
                    value={templateId || ''}
                    onChange={(e) => {
                      const idVal = e.target.value ? Number(e.target.value) : null;
                      setTemplateId(idVal);
                      const matched = messageTemplates.find((t) => t.id === idVal);
                      if (matched) setCustomMessage(matched.content);
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="">Selecionar template aprovado...</option>
                    {messageTemplates
                      .filter((t) => t.approvalStatus === 'approved')
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.metaTemplateName} — Aprovado)
                        </option>
                      ))}
                  </select>
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="font-semibold text-slate-700">
                      Mensagem Automática com Variáveis Dinâmicas
                    </label>
                    <div className="flex items-center gap-1">
                      {['{{nome}}', '{{empresa}}', '{{premio}}', '{{cupom}}', '[LINK DO CANAL PRÓPRIO]'].map(
                        (v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setCustomMessage((prev) => `${prev} ${v}`)}
                            className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-mono text-[10px] font-semibold cursor-pointer"
                          >
                            +{v}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  <textarea
                    rows={6}
                    required
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 font-sans text-xs"
                  />
                </div>

                <div className="sm:col-span-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <p className="text-[11px] font-semibold text-slate-700">
                    Prévia em Tempo Real para o Cliente:
                  </p>
                  <p className="text-xs text-slate-800 whitespace-pre-line bg-white p-3 rounded-lg border border-slate-200">
                    {renderPreviewText(customMessage, company.name)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                  />
                  <span className="font-semibold text-slate-700">
                    Manter automação ativa
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                  >
                    {saving ? 'Salvando...' : 'Salvar Automação'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 4. MÓDULO DE TEMPLATES DE WHATSAPP (SEÇÃO 8)
// ============================================================================

export const TemplatesModuleView: React.FC<ModuleProps> = ({ workspace, onRefresh }) => {
  const { company, messageTemplates } = workspace;

  const [showModal, setShowModal] = useState(false);
  const [editingTpl, setEditingTpl] = useState<MessageTemplate | null>(null);
  const [name, setName] = useState('');
  const [metaTemplateName, setMetaTemplateName] = useState('');
  const [category, setCategory] = useState('MARKETING');
  const [approvalStatus, setApprovalStatus] = useState('approved');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditingTpl(null);
    setName('');
    setMetaTemplateName('alfa_novo_template_v1');
    setCategory('MARKETING');
    setApprovalStatus('approved');
    setContent(
      'Olá, {{nome}}! Aqui é da {{empresa}}. Seu cupom {{cupom}} ({{premio}}) está disponível! Peça agora: [LINK DO CANAL PRÓPRIO]'
    );
    setShowModal(true);
  };

  const openEdit = (tpl: MessageTemplate) => {
    setEditingTpl(tpl);
    setName(tpl.name);
    setMetaTemplateName(tpl.metaTemplateName);
    setCategory(tpl.category);
    setApprovalStatus(tpl.approvalStatus);
    setContent(tpl.content);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.saveTemplate({
        id: editingTpl?.id,
        name,
        metaTemplateName,
        category,
        approvalStatus,
        content,
      });
      await onRefresh();
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    await api.deleteTemplate(id);
    await onRefresh();
  };

  const statusLabels: Record<string, { label: string; style: string }> = {
    approved: { label: 'Aprovado', style: 'bg-emerald-50 text-emerald-700' },
    pending: { label: 'Aguardando aprovação', style: 'bg-amber-50 text-amber-700' },
    draft: { label: 'Rascunho', style: 'bg-slate-100 text-slate-700' },
    rejected: { label: 'Rejeitado', style: 'bg-rose-50 text-rose-700' },
    paused: { label: 'Pausado', style: 'bg-slate-200 text-slate-600' },
    disabled: { label: 'Desabilitado', style: 'bg-rose-100 text-rose-800' },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">
            Templates de Mensagens (WhatsApp Business Platform)
          </h2>
          <p className="text-xs text-slate-500">
            Mensagens enviadas fora da janela de atendimento de 24 horas utilizam exclusivamente templates aprovados pela Meta.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Novo Template</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {messageTemplates.map((tpl) => {
          const st = statusLabels[tpl.approvalStatus] || statusLabels.draft;
          return (
            <div
              key={tpl.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-display font-bold text-slate-900">
                      {tpl.name}
                    </h3>
                    <p className="text-[11px] font-mono text-slate-500">
                      Meta ID: {tpl.metaTemplateName} · {tpl.language} · {tpl.category}
                    </p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${st.style}`}>
                    {st.label}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 whitespace-pre-line font-sans">
                  {tpl.content}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                <span className="text-[11px] text-slate-400">
                  {tpl.approvalStatus === 'approved'
                    ? '✓ Liberado para automações'
                    : '✕ Disparo bloqueado até aprovação'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(tpl)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(tpl.id)}
                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-600 text-slate-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-display font-bold text-slate-900">
                {editingTpl ? 'Editar Template WhatsApp' : 'Novo Template WhatsApp'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nome Interno do Template *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nome Técnico na Meta (slug) *
                  </label>
                  <input
                    type="text"
                    required
                    value={metaTemplateName}
                    onChange={(e) => setMetaTemplateName(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status de Aprovação Meta
                  </label>
                  <select
                    value={approvalStatus}
                    onChange={(e) => setApprovalStatus(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="approved">Aprovado</option>
                    <option value="pending">Aguardando aprovação</option>
                    <option value="draft">Rascunho</option>
                    <option value="rejected">Rejeitado</option>
                    <option value="paused">Pausado</option>
                    <option value="disabled">Desabilitado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Corpo da Mensagem
                </label>
                <textarea
                  rows={5}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                >
                  {saving ? 'Salvando...' : 'Salvar Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 5. HISTÓRICO DE MENSAGENS & FILA DE AGENDAMENTO PERSISTENTE (SEÇÃO 7 & 9)
// ============================================================================

export const MessagesHistoryModuleView: React.FC<ModuleProps> = ({
  workspace,
  onRefresh,
}) => {
  const {
    customers,
    automations,
    messageTemplates,
    messageLogs,
    scheduledMessages,
  } = workspace;

  const [tab, setTab] = useState<'logs' | 'queue'>('logs');
  const [statusFilter, setStatusFilter] = useState('all');
  const [busyId, setBusyId] = useState<number | null>(null);

  const filteredLogs = useMemo(() => {
    return messageLogs.filter((l) => {
      if (statusFilter !== 'all' && l.messageStatus !== statusFilter) return false;
      return true;
    });
  }, [messageLogs, statusFilter]);

  const handleDispatchNow = async (scheduledId: number) => {
    setBusyId(scheduledId);
    try {
      await api.dispatchScheduledMessageNow(scheduledId);
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  const handleCancelScheduled = async (scheduledId: number) => {
    setBusyId(scheduledId);
    try {
      await api.cancelScheduledMessage(scheduledId);
      await onRefresh();
    } finally {
      setBusyId(null);
    }
  };

  const statusBadge = (st: string) => {
    switch (st) {
      case 'read':
        return { label: 'Lida', cls: 'bg-sky-50 text-sky-700' };
      case 'delivered':
        return { label: 'Entregue', cls: 'bg-emerald-50 text-emerald-700' };
      case 'sent':
        return { label: 'Enviada', cls: 'bg-teal-50 text-teal-700' };
      case 'scheduled':
      case 'pending':
        return { label: 'Agendada', cls: 'bg-indigo-50 text-indigo-700' };
      case 'cancelled':
        return { label: 'Cancelada', cls: 'bg-slate-100 text-slate-600' };
      default:
        return { label: 'Falhou', cls: 'bg-rose-50 text-rose-700' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">
            Histórico de Mensagens & Fila de Tarefas Agendadas
          </h2>
          <p className="text-xs text-slate-500">
            Acompanhe os disparos realizados pelo WhatsApp Business, atualizações de status via Webhooks da Meta e a fila persistente no PostgreSQL.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('logs')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
              tab === 'logs'
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            Histórico de Mensagens ({messageLogs.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('queue')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
              tab === 'queue'
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700'
            }`}
          >
            Fila de Agendamento ({scheduledMessages.length})
          </button>
        </div>
      </div>

      {tab === 'logs' ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              {['all', 'scheduled', 'sent', 'delivered', 'read', 'failed', 'cancelled'].map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                      statusFilter === st
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'all' ? 'Todos' : statusBadge(st).label}
                  </button>
                )
              )}
            </div>
            <button
              type="button"
              onClick={onRefresh}
              className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Atualizar Status</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Telefone</th>
                  <th className="py-3 px-4">Automação & Template</th>
                  <th className="py-3 px-4">Data do Envio</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Detalhes / Erro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredLogs.map((log) => {
                  const cust = customers.find((c) => c.id === log.customerId);
                  const aut = automations.find((a) => a.id === log.automationId);
                  const tpl = messageTemplates.find((t) => t.id === log.templateId);
                  const badge = statusBadge(log.messageStatus);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {cust?.name || `Cliente #${log.customerId}`}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {log.recipientPhone || cust?.phone}
                      </td>
                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">
                          {aut?.name || 'Disparo Automático'}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {tpl?.metaTemplateName || 'alfa_boas_vindas_roleta_v1'}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600 tabular-nums">
                        {new Date(log.sentAt || log.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-500 max-w-xs truncate">
                        {log.errorMessage ? (
                          <span className="text-rose-600 font-medium">{log.errorMessage}</span>
                        ) : (
                          <span className="font-mono text-slate-400">
                            {log.whatsappMessageId || 'Fila Agendada'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-4">ID / Idempotência</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Automação</th>
                  <th className="py-3 px-4">Agendado Para</th>
                  <th className="py-3 px-4">Status / Tentativas</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {scheduledMessages.map((sm) => {
                  const cust = customers.find((c) => c.id === sm.customerId);
                  const aut = automations.find((a) => a.id === sm.automationId);
                  return (
                    <tr key={sm.id} className="hover:bg-slate-50/80">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        <p className="font-bold text-slate-900">#{sm.id}</p>
                        <p className="truncate max-w-[160px] text-slate-400">
                          {sm.idempotencyKey}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {cust?.name || `Cliente #${sm.customerId}`}
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {aut?.name || `Automação #${sm.automationId}`}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        {new Date(sm.scheduledAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-slate-800">
                          {sm.status.toUpperCase()} ({sm.attempts} tent.)
                        </span>
                        {sm.errorMessage && (
                          <p className="text-[11px] text-rose-600 mt-0.5">
                            {sm.errorMessage}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {sm.status === 'pending' && (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={busyId === sm.id}
                              onClick={() => handleDispatchNow(sm.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold cursor-pointer"
                            >
                              Processar Agora
                            </button>
                            <button
                              type="button"
                              disabled={busyId === sm.id}
                              onClick={() => handleCancelScheduled(sm.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 6. INTEGRAÇÃO OFICIAL WHATSAPP BUSINESS & DOCUMENTAÇÃO META (SEÇÃO 4, 14, 17)
// ============================================================================

export const WhatsappBusinessIntegrationPanel: React.FC<ModuleProps> = ({
  workspace,
  onRefresh,
}) => {
  const { company, whatsappConnection } = workspace;

  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showMetaDocsModal, setShowMetaDocsModal] = useState(false);
  const [wabaId, setWabaId] = useState(whatsappConnection.wabaId || '109283746510293');
  const [phoneNumberId, setPhoneNumberId] = useState(
    whatsappConnection.phoneNumberId || '118293049581726'
  );
  const [displayPhoneNumber, setDisplayPhoneNumber] = useState(
    whatsappConnection.displayPhoneNumber || company.whatsappUrl || '5511999998888'
  );
  const [verifiedBusinessName, setVerifiedBusinessName] = useState(
    whatsappConnection.verifiedBusinessName || company.name
  );
  const [submitting, setSubmitting] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.connectWhatsappBusiness({
        wabaId,
        phoneNumberId,
        displayPhoneNumber,
        verifiedBusinessName,
      });
      await onRefresh();
      setShowConnectModal(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    setSubmitting(true);
    try {
      await api.disconnectWhatsappBusiness();
      await onRefresh();
    } finally {
      setSubmitting(false);
    }
  };

  const isConnected = whatsappConnection.connectionStatus === 'connected';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <span className="text-[11px] font-mono uppercase text-emerald-600 font-bold">
            META WHATSAPP BUSINESS PLATFORM · CLOUD API
          </span>
          <h3 className="text-lg font-display font-bold text-slate-900 mt-0.5">
            Conexão Oficial do WhatsApp Business ({company.name})
          </h3>
          <p className="text-xs text-slate-500">
            Isolamento multi-tenant ativo: os clientes capturados nas roletas de{' '}
            <strong>{company.name}</strong> recebem mensagens exclusivamente pelo número desta empresa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowMetaDocsModal(true)}
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Documentação Meta & Cloud API</span>
          </button>

          {isConnected ? (
            <button
              type="button"
              disabled={submitting}
              onClick={handleDisconnect}
              className="px-4 py-2.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold cursor-pointer"
            >
              Desconectar WhatsApp
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowConnectModal(true)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-display font-bold flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>CONECTAR MEU WHATSAPP</span>
            </button>
          )}
        </div>
      </div>

      {/* 7 Connection Status Indicators Required in Section 4 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[11px] text-slate-500">Status da Conexão</p>
          <p className="font-bold text-sm mt-1">
            {isConnected ? (
              <span className="text-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Conectado & Isolado
              </span>
            ) : (
              <span className="text-amber-600 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" /> Desconectado
              </span>
            )}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[11px] text-slate-500">Número Conectado & Nome Comercial</p>
          <p className="font-mono font-bold text-slate-900 mt-1">
            {isConnected ? whatsappConnection.displayPhoneNumber : 'Não vinculado'}
          </p>
          <p className="text-[11px] text-slate-500 truncate">
            {whatsappConnection.verifiedBusinessName || company.name}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[11px] text-slate-500">ID da Conta WABA & Phone ID</p>
          <p className="font-mono text-slate-800 font-semibold mt-1">
            WABA: {whatsappConnection.wabaId || '—'}
          </p>
          <p className="font-mono text-[11px] text-slate-500">
            Phone ID: {whatsappConnection.phoneNumberId || '—'}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-[11px] text-slate-500">Status de Webhooks & Data</p>
          <p className="font-semibold text-slate-800 mt-1">
            Webhook: {whatsappConnection.webhookStatus === 'verified' ? '✓ Ativo' : 'Pendente'}
          </p>
          <p className="text-[11px] text-slate-500 font-mono">
            {whatsappConnection.connectedAt
              ? new Date(whatsappConnection.connectedAt).toLocaleDateString('pt-BR')
              : 'Sem data de conexão'}
          </p>
        </div>
      </div>

      {/* Webhook Callback Endpoint & Diagnostic Notice */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-800">
            Endpoint Oficial de Webhook Meta (Status de Mensagens & Opt-Out SAIR/PARAR):
          </p>
          <p className="font-mono text-[11px] text-indigo-700 break-all">
            {whatsappConnection.webhookCallbackUrl || `${window.location.origin}/api/webhooks/whatsapp`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(
              whatsappConnection.webhookCallbackUrl ||
                `${window.location.origin}/api/webhooks/whatsapp`
            );
            setCopiedWebhook(true);
            setTimeout(() => setCopiedWebhook(false), 2000);
          }}
          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copiedWebhook ? 'Copiado!' : 'Copiar URL de Webhook'}</span>
        </button>
      </div>

      {/* Embedded Signup / Official Connection Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-emerald-600 font-bold">
                  WHATSAPP EMBEDDED SIGNUP · META CLOUD API
                </span>
                <h3 className="text-base font-display font-bold text-slate-900">
                  Conectar Conta Oficial WhatsApp Business
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!whatsappConnection.metaAppConfigured && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
                <p className="font-bold">
                  Diagnóstico do Ambiente Meta Developers:
                </p>
                <p className="text-[11px] leading-relaxed">
                  A variável <code className="font-mono">META_APP_ID</code> ainda não foi definida nas variáveis de ambiente do servidor para abrir o popup externo da Meta. Você pode registrar abaixo os identificadores da sua conta comercial (WABA ID e Phone Number ID) para ativar o vínculo multi-tenant desta empresa. Nenhum token de acesso é solicitado no frontend.
                </p>
              </div>
            )}

            <form onSubmit={handleConnect} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nome Comercial Verificado (Meta Business) *
                </label>
                <input
                  type="text"
                  required
                  value={verifiedBusinessName}
                  onChange={(e) => setVerifiedBusinessName(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Número do WhatsApp Business (com DDI 55 e DDD) *
                </label>
                <input
                  type="text"
                  required
                  value={displayPhoneNumber}
                  onChange={(e) => setDisplayPhoneNumber(e.target.value)}
                  placeholder="5511999998888"
                  className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    WhatsApp Business Account ID (WABA ID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={wabaId}
                    onChange={(e) => setWabaId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone Number ID (Cloud API) *
                  </label>
                  <input
                    type="text"
                    required
                    value={phoneNumberId}
                    onChange={(e) => setPhoneNumberId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  Segurança Multi-Tenant: Credenciais OAuth e Access Tokens são gerenciados exclusivamente no servidor backend.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer"
                >
                  {submitting ? 'Conectando...' : 'Autorizar e Conectar WhatsApp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Meta Developers Technical Documentation Modal (Section 17) */}
      {showMetaDocsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-indigo-600 font-bold">
                  DOCUMENTAÇÃO TÉCNICA OFICIAL · SEÇÃO 17
                </span>
                <h3 className="text-lg font-display font-bold text-slate-900">
                  Guia de Configuração: Meta Developers, WhatsApp Cloud API & Embedded Signup
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMetaDocsModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-slate-700 leading-relaxed">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <h4 className="font-bold text-slate-900">
                  1. Criação do Aplicativo no Meta for Developers
                </h4>
                <p>
                  1. Acesse <code className="font-mono">https://developers.facebook.com</code> e crie um aplicativo do tipo <strong>Empresa (Business)</strong>.<br />
                  2. Adicione os produtos <strong>WhatsApp</strong> e <strong>Facebook Login for Business</strong>.<br />
                  3. No painel da Meta, vincule seu portfólio comercial verificado (Tech Provider / Solution Partner para SaaS multi-tenant).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <h4 className="font-bold text-slate-900">
                  2. Configuração do WhatsApp Embedded Signup & Permissões OAuth
                </h4>
                <p>
                  1. Em <strong>Facebook Login for Business &gt; Configurações</strong>, habilite <em>Login integrado com JavaScript SDK</em> e adicione a URL do seu domínio Alfa Link em <strong>Domínios permitidos</strong>.<br />
                  2. Crie uma configuração de <strong>Cadastro Incorporado do WhatsApp (Embedded Signup)</strong> solicitando as permissões:<br />
                  <code className="font-mono text-indigo-700">whatsapp_business_management</code> e <code className="font-mono text-indigo-700">whatsapp_business_messaging</code>.<br />
                  3. Copie o <code className="font-mono">Configuration ID</code> gerado e defina em <code className="font-mono">META_EMBEDDED_SIGNUP_CONFIG_ID</code> no servidor.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <h4 className="font-bold text-slate-900">
                  3. Configuração de Webhooks e URLs de Callback
                </h4>
                <p>
                  No menu <strong>WhatsApp &gt; Configuração &gt; Webhook</strong> do seu App Meta, configure:<br />
                  • <strong>URL de Callback</strong>: <code className="font-mono text-indigo-700">{window.location.origin}/api/webhooks/whatsapp</code><br />
                  • <strong>Token de Verificação</strong>: Valor obrigatório configurado na variável de ambiente <code className="font-mono">META_WEBHOOK_VERIFY_TOKEN</code> no servidor.<br />
                  • <strong>Assinatura Criptográfica POST</strong>: Todas as requisições POST são validadas via <code className="font-mono">X-Hub-Signature-256</code> (HMAC-SHA256) utilizando <code className="font-mono">META_APP_SECRET</code>.<br />
                  • Assine os campos de webhook: <code className="font-mono">messages</code> e <code className="font-mono">message_template_status_update</code>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <h4 className="font-bold text-slate-900">
                  4. Variáveis de Ambiente no Servidor Backend (.env)
                </h4>
                <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto">
{`META_APP_ID="SEU_META_APP_ID"
META_APP_SECRET="SEU_META_APP_SECRET_OBRIGATORIO_PARA_HMAC"
META_EMBEDDED_SIGNUP_CONFIG_ID="SEU_CONFIG_ID"
META_WEBHOOK_VERIFY_TOKEN="DEFINA_SEU_VERIFY_TOKEN_SECRETO"
META_GRAPH_API_VERSION="v21.0"`}
                </pre>
              </div>

              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
                <h4 className="font-bold">
                  5. O que depende de aprovação externa da Meta?
                </h4>
                <p className="text-[11px]">
                  • <strong>Verificação da Empresa (Business Verification)</strong> no Meta Business Suite;<br />
                  • <strong>Revisão do Aplicativo (App Review)</strong> para permissões avançadas de provedor de tecnologia (`whatsapp_business_messaging`);<br />
                  • <strong>Aprovação de Templates de Marketing</strong> para envios iniciados pela empresa fora da janela de 24h.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowMetaDocsModal(false)}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
              >
                Fechar Documentação
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
