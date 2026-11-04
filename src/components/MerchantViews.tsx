import React, { useState, useMemo } from 'react';
import {
  Users,
  Disc,
  Ticket,
  CheckCircle2,
  MousePointerClick,
  TrendingUp,
  Plus,
  Search,
  ExternalLink,
  Copy,
  Check,
  Printer,
  Trash2,
  Edit3,
  ArrowRight,
  Shield,
  Download,
  Sparkles,
  Store,
  MessageCircle,
  Eye,
  X,
  RefreshCw,
} from 'lucide-react';
import {
  WorkspaceData,
  Campaign,
  Customer,
  Prize,
  SOURCE_CHANNELS,
  PRIZE_TYPE_LABELS,
} from '../types/alfa.ts';
import { api } from '../lib/api.ts';
import { RouletteWheel } from './RouletteWheel.tsx';
import { QrCodeMatrix } from './QrCodeMatrix.tsx';
import {
  CrmAnalyticsDashboardSection,
  WhatsappBusinessIntegrationPanel,
} from './CrmAndWhatsappViews.tsx';

interface ViewProps {
  workspace: WorkspaceData;
  onRefresh: () => Promise<void>;
  onOpenPublicCampaign: (companySlug: string, campaignSlug: string, qrCode?: string) => void;
  onNavigateTab: (tab: string) => void;
}

// ============================================================================
// 1. DASHBOARD VIEW (FUNNEL + MIGRATION HERO METRIC + CHANNEL BREAKDOWN)
// ============================================================================

export const DashboardView: React.FC<ViewProps> = ({
  workspace,
  onRefresh,
  onOpenPublicCampaign,
  onNavigateTab,
}) => {
  const {
    company,
    campaigns,
    customers,
    spins,
    coupons,
    redemptions,
    events,
    qrCodes,
  } = workspace;

  const totalScans = useMemo(() => {
    const scanEvCount = events.filter((e) => e.eventType === 'qr_scan').length;
    const qrSum = qrCodes.reduce((acc, q) => acc + (q.scanCount || 0), 0);
    return Math.max(scanEvCount, qrSum, customers.length);
  }, [events, qrCodes, customers.length]);

  const totalCustomers = customers.length;
  const totalSpins = spins.length;
  const totalCoupons = coupons.length;
  const usedCoupons = coupons.filter((c) => c.status === 'used').length;

  const destinationClicks = useMemo(() => {
    const clickEv = events.filter((e) => e.eventType === 'destination_clicked').length;
    return Math.max(clickEv, usedCoupons);
  }, [events, usedCoupons]);

  const recoveredRevenue = useMemo(
    () => redemptions.reduce((sum, r) => sum + Number(r.orderValue || 0), 0),
    [redemptions]
  );

  const migrationRate =
    totalCustomers > 0 ? ((usedCoupons / totalCustomers) * 100).toFixed(1) : '0.0';
  const clickRate =
    totalCustomers > 0 ? ((destinationClicks / totalCustomers) * 100).toFixed(1) : '0.0';

  // Channel Breakdown
  const channelStats = useMemo(() => {
    const counts: Record<string, { customers: number; redeemed: number }> = {};
    for (const ch of SOURCE_CHANNELS) {
      counts[ch] = { customers: 0, redeemed: 0 };
    }
    for (const cust of customers) {
      const ch = cust.firstSourceChannel || 'Outro';
      if (!counts[ch]) counts[ch] = { customers: 0, redeemed: 0 };
      counts[ch].customers += 1;
    }
    for (const coup of coupons) {
      if (coup.status === 'used') {
        const camp = campaigns.find((c) => c.id === coup.campaignId);
        const ch = camp?.sourceChannel || 'Outro';
        if (!counts[ch]) counts[ch] = { customers: 0, redeemed: 0 };
        counts[ch].redeemed += 1;
      }
    }
    return Object.entries(counts)
      .filter(([ch, val]) => val.customers > 0 || ['iFood', 'Mercado Livre', 'Shopee', 'Loja física'].includes(ch))
      .sort((a, b) => b[1].customers - a[1].customers);
  }, [customers, coupons, campaigns]);

  const funnelSteps = [
    { label: '1. QR Code escaneado', count: totalScans, pct: 100 },
    {
      label: '2. Cadastro realizado',
      count: totalCustomers,
      pct: totalScans > 0 ? Math.min(100, Math.round((totalCustomers / totalScans) * 100)) : 0,
    },
    {
      label: '3. Giro na roleta',
      count: totalSpins,
      pct: totalScans > 0 ? Math.min(100, Math.round((totalSpins / totalScans) * 100)) : 0,
    },
    {
      label: '4. Cupom gerado',
      count: totalCoupons,
      pct: totalScans > 0 ? Math.min(100, Math.round((totalCoupons / totalScans) * 100)) : 0,
    },
    {
      label: '5. Clique no canal próprio',
      count: destinationClicks,
      pct: totalScans > 0 ? Math.min(100, Math.round((destinationClicks / totalScans) * 100)) : 0,
    },
    {
      label: '6. Cupom utilizado (Recompra)',
      count: usedCoupons,
      pct: totalScans > 0 ? Math.min(100, Math.round((usedCoupons / totalScans) * 100)) : 0,
    },
  ];

  const primaryCampaign = campaigns[0];

  return (
    <div className="space-y-6">
      {/* Main Product North-Star Metric: MIGRAÇÃO PARA CANAL PRÓPRIO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-indigo-600 tracking-wide">
              MÉTRICA PRINCIPAL DO PRODUTO · MIGRAÇÃO PARA CANAL PRÓPRIO
            </div>
            <h2 className="text-2xl font-display font-extrabold text-slate-900">
              Transformando Compradores de Marketplaces em Clientes Próprios
            </h2>
            <p className="text-sm text-slate-600">
              Acompanhe quantos clientes vieram de canais externos (iFood, Mercado Livre, Shopee) e realizaram uma nova compra direta sem comissão.
            </p>
          </div>

          {primaryCampaign && (
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onOpenPublicCampaign(company.slug, primaryCampaign.slug)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Simular Giro na Página Pública</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('qr-codes')}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold whitespace-nowrap cursor-pointer"
              >
                Imprimir Cartão QR Code
              </button>
            </div>
          )}
        </div>

        {/* 4-Step Migration Chain */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-6">
          <div>
            <p className="text-xs font-medium text-slate-500">
              Clientes Captados (Marketplaces)
            </p>
            <p className="text-3xl font-mono font-bold text-slate-900 tabular-nums mt-1">
              {totalCustomers}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Base própria construída com LGPD
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Direcionados ao Canal Próprio
            </p>
            <p className="text-3xl font-mono font-bold text-indigo-600 tabular-nums mt-1">
              {destinationClicks}
            </p>
            <p className="text-xs text-slate-500 mt-1 tabular-nums">
              {clickRate}% clicaram no WhatsApp / Site
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Clientes Migrados (Cupons Resgatados)
            </p>
            <p className="text-3xl font-mono font-bold text-emerald-600 tabular-nums mt-1">
              {usedCoupons}
            </p>
            <p className="text-xs text-emerald-700 font-medium mt-1 tabular-nums">
              {migrationRate}% de conversão em recompra
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">
              Vendas Recuperadas no Canal Próprio
            </p>
            <p className="text-3xl font-mono font-bold text-slate-900 tabular-nums mt-1">
              R$ {recoveredRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Zero comissão de marketplace
            </p>
          </div>
        </div>
      </div>

      {/* 6 Operational KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Clientes captados', value: totalCustomers, icon: Users },
          { label: 'Giros realizados', value: totalSpins, icon: Disc },
          { label: 'Cupons gerados', value: totalCoupons, icon: Ticket },
          { label: 'Cupons utilizados', value: usedCoupons, icon: CheckCircle2 },
          { label: 'Cliques canal próprio', value: destinationClicks, icon: MousePointerClick },
          { label: 'Taxa de conversão', value: `${migrationRate}%`, icon: TrendingUp },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-medium">{kpi.label}</span>
                <Icon className="w-4 h-4 text-slate-400 shrink-0" />
              </div>
              <div className="text-2xl font-mono font-bold text-slate-900 tabular-nums">
                {kpi.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Funnel & Channel Breakdown Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Funnel */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-display font-bold text-slate-900">
                Funil Completo de Pós-Venda e Migração
              </h3>
              <p className="text-xs text-slate-500">
                Jornada real desde o QR Code na embalagem até a nova compra no canal próprio
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            {funnelSteps.map((st, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">{st.label}</span>
                  <div className="flex items-center gap-2 font-mono tabular-nums">
                    <span className="font-bold text-slate-900">{st.count}</span>
                    <span className="text-slate-400">·</span>
                    <span className="text-slate-500">{st.pct}%</span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(4, st.pct)}%`,
                      backgroundColor: idx === funnelSteps.length - 1 ? '#16A34A' : '#4F46E5',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Origin Channels Chart */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-display font-bold text-slate-900">
              Origem dos Clientes Captados
            </h3>
            <p className="text-xs text-slate-500 mb-5">
              Comparativo por canal de marketplace e loja física
            </p>

            <div className="space-y-4">
              {channelStats.map(([channelName, stats]) => {
                const maxCust = Math.max(
                  1,
                  ...channelStats.map(([, s]) => s.customers)
                );
                const barWidth = Math.round((stats.customers / maxCust) * 100);
                return (
                  <div key={channelName} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">{channelName}</span>
                      <span className="font-mono text-slate-600 tabular-nums">
                        {stats.customers} captados · {stats.redeemed} recompras
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-900 rounded-full"
                        style={{ width: `${Math.max(6, barWidth)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Campanhas ativas: <strong className="text-slate-800">{campaigns.length}</strong>
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('campaigns')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 flex items-center gap-1 cursor-pointer"
            >
              <span>Gerenciar campanhas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* CRM, WhatsApp Delivery/Read Rates & 7-Stage Funnel Section */}
      <CrmAnalyticsDashboardSection
        workspace={workspace}
        onRefresh={onRefresh}
        onNavigateTab={onNavigateTab}
      />
    </div>
  );
};

// ============================================================================
// 2. CAMPAIGNS VIEW (CREATE, EDIT, TEST PUBLIC PAGE)
// ============================================================================

export const CampaignsView: React.FC<ViewProps> = ({
  workspace,
  onRefresh,
  onOpenPublicCampaign,
}) => {
  const { company, campaigns, customers, coupons, rouletteConfigs } = workspace;
  const [showModal, setShowModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceChannel, setSourceChannel] = useState<string>('iFood');
  const [landingTitle, setLandingTitle] = useState(
    '🎁 Você ganhou uma chance de ganhar um benefício!'
  );
  const [landingSubtitle, setLandingSubtitle] = useState(
    'Gire a roleta e descubra seu benefício para a próxima compra.'
  );
  const [primaryColor, setPrimaryColor] = useState('#EA1D2C');
  const [destinationType, setDestinationType] = useState('whatsapp');
  const [destinationUrl, setDestinationUrl] = useState(company.whatsappUrl || '5511999998888');
  const [whatsappMessageTemplate, setWhatsappMessageTemplate] = useState(
    company.whatsappMessageTemplate ||
      'Olá! Ganhei o cupom {cupom} ({premio}) e quero fazer meu pedido.'
  );
  const [minimumPurchaseValue, setMinimumPurchaseValue] = useState(45);
  const [maxSpinsPerCustomer, setMaxSpinsPerCustomer] = useState(1);
  const [emailRequired, setEmailRequired] = useState(false);
  const [status, setStatus] = useState('active');

  const openCreateModal = () => {
    setEditingCampaign(null);
    setName('');
    setDescription('');
    setSourceChannel('iFood');
    setLandingTitle('🎁 Você ganhou uma chance de ganhar um benefício!');
    setLandingSubtitle('Gire a roleta e descubra seu benefício para a próxima compra.');
    setPrimaryColor('#EA1D2C');
    setDestinationType('whatsapp');
    setDestinationUrl(company.whatsappUrl || '5511999998888');
    setWhatsappMessageTemplate(
      company.whatsappMessageTemplate ||
        'Olá! Ganhei o cupom {cupom} ({premio}) e quero fazer meu pedido.'
    );
    setMinimumPurchaseValue(45);
    setMaxSpinsPerCustomer(1);
    setEmailRequired(false);
    setStatus('active');
    setShowModal(true);
  };

  const openEditModal = (camp: Campaign) => {
    const rConf = rouletteConfigs.find((r) => r.campaignId === camp.id);
    setEditingCampaign(camp);
    setName(camp.name);
    setDescription(camp.description || '');
    setSourceChannel(camp.sourceChannel);
    setLandingTitle(camp.landingTitle);
    setLandingSubtitle(camp.landingSubtitle);
    setPrimaryColor(camp.primaryColor || '#4F46E5');
    setDestinationType(camp.destinationType);
    setDestinationUrl(camp.destinationUrl);
    setWhatsappMessageTemplate(
      camp.whatsappMessageTemplate ||
        company.whatsappMessageTemplate ||
        'Olá! Ganhei o cupom {cupom} ({premio}) e quero fazer meu pedido.'
    );
    setMinimumPurchaseValue(camp.minimumPurchaseValue || 0);
    setMaxSpinsPerCustomer(rConf?.maxSpinsPerCustomer || 1);
    setEmailRequired(Boolean(camp.emailRequired));
    setStatus(camp.status);
    setShowModal(true);
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingCampaign) {
        await api.updateCampaign(editingCampaign.id, {
          name: name.trim(),
          description: description.trim(),
          sourceChannel,
          status,
          landingTitle,
          landingSubtitle,
          primaryColor,
          destinationType,
          destinationUrl,
          whatsappMessageTemplate:
            whatsappMessageTemplate.trim() ||
            'Olá! Ganhei o cupom {cupom} ({premio}) e quero fazer meu pedido.',
          emailRequired,
          minimumPurchaseValue: Number(minimumPurchaseValue),
          maxSpinsPerCustomer: Number(maxSpinsPerCustomer),
        });
      } else {
        await api.createCampaign({
          name: name.trim(),
          description: description.trim(),
          sourceChannel,
          landingTitle,
          landingSubtitle,
          primaryColor,
          destinationType,
          destinationUrl,
          whatsappMessageTemplate:
            whatsappMessageTemplate.trim() ||
            'Olá! Ganhei o cupom {cupom} ({premio}) e quero fazer meu pedido.',
          emailRequired,
          minimumPurchaseValue: Number(minimumPurchaseValue),
          maxSpinsPerCustomer: Number(maxSpinsPerCustomer),
        });
      }
      await onRefresh();
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">
            Campanhas de Pós-Venda por Canal de Origem
          </h2>
          <p className="text-xs text-slate-500">
            Crie campanhas específicas para cada marketplace (iFood, Mercado Livre, Shopee, Amazon) e meça a migração separadamente.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 self-start sm:self-auto cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nova campanha</span>
        </button>
      </div>

      {/* Campaigns Table / List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                <th className="py-3 px-4">Campanha</th>
                <th className="py-3 px-4">Canal de Origem</th>
                <th className="py-3 px-4">Destino Canal Próprio</th>
                <th className="py-3 px-4 text-right">Cupons Gerados</th>
                <th className="py-3 px-4 text-right">Resgatados</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {campaigns.map((camp) => {
                const campCoupons = coupons.filter((c) => c.campaignId === camp.id);
                const campRedeemed = campCoupons.filter((c) => c.status === 'used');
                return (
                  <tr key={camp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{ backgroundColor: camp.primaryColor }}
                        />
                        <div>
                          <p className="font-bold text-slate-900">{camp.name}</p>
                          <p className="text-[11px] text-slate-500 truncate max-w-xs">
                            /c/{camp.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {camp.sourceChannel}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {camp.destinationType === 'whatsapp' ? 'WhatsApp Direto' : 'Site Próprio'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      {campCoupons.length}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-600 tabular-nums">
                      {campRedeemed.length}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold ${
                          camp.status === 'active' ? 'text-emerald-700' : 'text-amber-600'
                        }`}
                      >
                        {camp.status === 'active' ? 'Ativa' : 'Pausada'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenPublicCampaign(company.slug, camp.slug)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Testar Roleta</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(camp)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                          title="Editar Campanha"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Campaign Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <h3 className="text-lg font-display font-bold text-slate-900">
                {editingCampaign ? 'Editar Campanha' : 'Nova Campanha de Migração'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nome da Campanha *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Clientes iFood — Novembro"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Canal de Origem *
                  </label>
                  <select
                    value={sourceChannel}
                    onChange={(e) => setSourceChannel(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                  >
                    {SOURCE_CHANNELS.map((ch) => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status da Campanha
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="active">Ativa</option>
                    <option value="paused">Pausada</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Título da Página Pública (Landing Page)
                  </label>
                  <input
                    type="text"
                    value={landingTitle}
                    onChange={(e) => setLandingTitle(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Subtítulo da Página Pública
                  </label>
                  <input
                    type="text"
                    value={landingSubtitle}
                    onChange={(e) => setLandingSubtitle(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Destino do Botão Pós-Giro (Canal Próprio)
                  </label>
                  <select
                    value={destinationType}
                    onChange={(e) => setDestinationType(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                  >
                    <option value="whatsapp">WhatsApp com mensagem automática</option>
                    <option value="site">Site / Cardápio próprio</option>
                    <option value="app">Aplicativo próprio</option>
                    <option value="checkout">Link direto de Checkout</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {destinationType === 'whatsapp'
                      ? 'Número do WhatsApp (com DDD)'
                      : 'URL de Destino'}
                  </label>
                  <input
                    type="text"
                    required
                    value={destinationUrl}
                    onChange={(e) => setDestinationUrl(e.target.value)}
                    placeholder={
                      destinationType === 'whatsapp'
                        ? '5511999998888'
                        : 'https://seusite.com.br'
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                {destinationType === 'whatsapp' && (
                  <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <label className="block font-semibold text-slate-800">
                        Mensagem Automática do WhatsApp (Pré-configuração)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-slate-500">Inserir variável:</span>
                        <button
                          type="button"
                          onClick={() =>
                            setWhatsappMessageTemplate((prev) =>
                              prev.includes('{cupom}') ? prev : `${prev} {cupom}`
                            )
                          }
                          className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-mono text-[11px] font-semibold cursor-pointer"
                        >
                          + &#123;cupom&#125;
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setWhatsappMessageTemplate((prev) =>
                              prev.includes('{premio}') ? prev : `${prev} ({premio})`
                            )
                          }
                          className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-mono text-[11px] font-semibold cursor-pointer"
                        >
                          + &#123;premio&#125;
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={whatsappMessageTemplate}
                      onChange={(e) => setWhatsappMessageTemplate(e.target.value)}
                      placeholder="Olá! Ganhei o cupom {cupom} ({premio}) e quero fazer meu pedido."
                      className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Use <strong>&#123;cupom&#125;</strong> para inserir o código gerado e{' '}
                      <strong>&#123;premio&#125;</strong> para o benefício sorteado na roleta.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Valor Mínimo do Pedido (R$)
                  </label>
                  <input
                    type="number"
                    value={minimumPurchaseValue}
                    onChange={(e) => setMinimumPurchaseValue(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Quantidade Máxima de Giros por Cliente
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxSpinsPerCustomer}
                    onChange={(e) => setMaxSpinsPerCustomer(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cor Principal da Campanha
                  </label>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-full h-10 p-1 rounded-xl border border-slate-300 bg-white cursor-pointer"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailRequired}
                      onChange={(e) => setEmailRequired(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                    />
                    <span className="font-medium text-slate-700">
                      Tornar campo de E-mail obrigatório antes do giro
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
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
                  {saving ? 'Salvando...' : 'Salvar Campanha'}
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
// 3. CUSTOMERS CRM VIEW (FILTERS, SEARCH, CUSTOMER JOURNEY TIMELINE, LGPD)
// ============================================================================

export const CustomersCrmView: React.FC<ViewProps> = ({ workspace, onRefresh }) => {
  const { customers, campaigns, spins, prizes, coupons, events } = workspace;

  const [searchQuery, setSearchQuery] = useState('');
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [consentFilter, setConsentFilter] = useState('ALL');
  const [couponStatusFilter, setCouponStatusFilter] = useState('ALL');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const enrichedCustomers = useMemo(() => {
    return customers.map((cust) => {
      const custSpins = spins.filter((s) => s.customerId === cust.id);
      const lastSpin = custSpins[0];
      const lastPrize = lastSpin ? prizes.find((p) => p.id === lastSpin.prizeId) : null;
      const custCoupons = coupons.filter((c) => c.customerId === cust.id);
      const latestCoupon = custCoupons[0] || null;
      const lastCampaign = lastSpin
        ? campaigns.find((c) => c.id === lastSpin.campaignId)
        : campaigns[0];
      const clickedOwnChannel = events.some(
        (ev) => ev.customerId === cust.id && ev.eventType === 'destination_clicked'
      );

      return {
        ...cust,
        lastSpin,
        lastPrize,
        latestCoupon,
        lastCampaign,
        clickedOwnChannel,
      };
    });
  }, [customers, spins, prizes, coupons, campaigns, events]);

  const filteredCustomers = useMemo(() => {
    return enrichedCustomers.filter((c) => {
      if (channelFilter !== 'ALL' && c.firstSourceChannel !== channelFilter) return false;
      if (consentFilter === 'YES' && !c.marketingConsent) return false;
      if (consentFilter === 'NO' && c.marketingConsent) return false;
      if (couponStatusFilter === 'USED' && c.latestCoupon?.status !== 'used') return false;
      if (couponStatusFilter === 'AVAILABLE' && c.latestCoupon?.status !== 'available')
        return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchPhone = c.phone.toLowerCase().includes(q);
        const matchEmail = (c.email || '').toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchEmail) return false;
      }
      return true;
    });
  }, [enrichedCustomers, channelFilter, consentFilter, couponStatusFilter, searchQuery]);

  const handleExportCsv = () => {
    const headers = [
      'Nome',
      'WhatsApp',
      'Email',
      'Origem',
      'Campanha',
      'Ultimo Premio',
      'Cupom',
      'Status Cupom',
      'Consentimento LGPD',
      'Data Cadastro',
    ];
    const rows = filteredCustomers.map((c) => [
      `"${c.name}"`,
      `"${c.phone}"`,
      `"${c.email || ''}"`,
      `"${c.firstSourceChannel}"`,
      `"${c.lastCampaign?.name || ''}"`,
      `"${c.lastPrize?.name || ''}"`,
      `"${c.latestCoupon?.code || ''}"`,
      `"${c.latestCoupon?.status || ''}"`,
      `"${c.marketingConsent ? 'Sim' : 'Nao'}"`,
      `"${new Date(c.createdAt).toLocaleDateString('pt-BR')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'clientes_alfa_link.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteCustomer = async (id: number) => {
    await api.deleteCustomer(id);
    setSelectedCustomer(null);
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">
            CRM de Clientes Captados
          </h2>
          <p className="text-xs text-slate-500">
            Base própria de clientes originados dos marketplaces com histórico de giro, cupom e consentimento LGPD.
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar CSV (LGPD)</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar nome, telefone ou e-mail..."
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-300 text-xs"
          />
        </div>

        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-slate-300 text-xs bg-white"
        >
          <option value="ALL">Todas as origens</option>
          {SOURCE_CHANNELS.map((ch) => (
            <option key={ch} value={ch}>
              Origem: {ch}
            </option>
          ))}
        </select>

        <select
          value={couponStatusFilter}
          onChange={(e) => setCouponStatusFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-slate-300 text-xs bg-white"
        >
          <option value="ALL">Todos os status de cupom</option>
          <option value="AVAILABLE">Cupom Disponível</option>
          <option value="USED">Cupom Utilizado (Migrado)</option>
        </select>

        <select
          value={consentFilter}
          onChange={(e) => setConsentFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-slate-300 text-xs bg-white"
        >
          <option value="ALL">Consentimento Marketing: Todos</option>
          <option value="YES">Aceitou Marketing (Opt-in)</option>
          <option value="NO">Apenas Participação na Roleta</option>
        </select>
      </div>

      {/* CRM Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">WhatsApp</th>
                <th className="py-3 px-4">Origem & Campanha</th>
                <th className="py-3 px-4">Último Prêmio</th>
                <th className="py-3 px-4">Cupom</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Marketing LGPD</th>
                <th className="py-3 px-4 text-right">Histórico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{c.name}</p>
                    <p className="text-[11px] text-slate-500">{c.email || 'Sem e-mail'}</p>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700 tabular-nums">
                    {c.phone}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800">{c.firstSourceChannel}</span>
                    <span className="text-slate-400 mx-1">·</span>
                    <span className="text-slate-500">{c.lastCampaign?.name || 'Geral'}</span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {c.lastPrize?.name || '—'}
                  </td>
                  <td className="py-3 px-4 font-mono font-semibold text-indigo-600 tabular-nums">
                    {c.latestCoupon?.code || '—'}
                  </td>
                  <td className="py-3 px-4">
                    {c.latestCoupon?.status === 'used' ? (
                      <span className="font-semibold text-emerald-700">
                        Utilizado (Migrado)
                      </span>
                    ) : c.latestCoupon ? (
                      <span className="font-medium text-amber-600">Disponível</span>
                    ) : (
                      <span className="text-slate-400">Sem cupom</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {c.marketingConsent ? (
                      <span className="text-emerald-700 font-medium">Aceito</span>
                    ) : (
                      <span className="text-slate-400">Não opcional</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedCustomer(c)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Jornada</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Journey Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-display font-bold text-slate-900">
                  {selectedCustomer.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  WhatsApp: {selectedCustomer.phone} · Origem: {selectedCustomer.firstSourceChannel}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Visual Step-by-Step Timeline */}
            <div className="space-y-3 text-xs">
              <p className="font-bold text-slate-700">Histórico de Migração do Cliente:</p>
              {(() => {
                const enriched = enrichedCustomers.find((e) => e.id === selectedCustomer.id);
                const timeline = [
                  {
                    done: true,
                    title: `Cliente originado pelo ${selectedCustomer.firstSourceChannel}`,
                    sub: new Date(selectedCustomer.createdAt).toLocaleString('pt-BR'),
                  },
                  {
                    done: true,
                    title: `Participou da campanha "${enriched?.lastCampaign?.name || 'Principal'}"`,
                    sub: selectedCustomer.marketingConsent
                      ? 'Consentimento de marketing aceito (LGPD)'
                      : 'Cadastro realizado sem opt-in de marketing',
                  },
                  {
                    done: Boolean(enriched?.lastPrize),
                    title: enriched?.lastPrize
                      ? `Girou a roleta e ganhou ${enriched.lastPrize.name}`
                      : 'Ainda não realizou giro',
                    sub: enriched?.latestCoupon
                      ? `Cupom gerado: ${enriched.latestCoupon.code}`
                      : '',
                  },
                  {
                    done: Boolean(enriched?.clickedOwnChannel),
                    title: 'Clicou no botão do Canal Próprio (WhatsApp / Site)',
                    sub: enriched?.clickedOwnChannel
                      ? 'Redirecionamento registrado pelo Alfa Link'
                      : 'Aguardando clique no canal próprio',
                  },
                  {
                    done: enriched?.latestCoupon?.status === 'used',
                    title: 'Cupom utilizado → Nova compra realizada no canal próprio!',
                    sub:
                      enriched?.latestCoupon?.status === 'used' &&
                      enriched.latestCoupon.redeemedAt
                        ? `Resgatado em ${new Date(
                            enriched.latestCoupon.redeemedAt
                          ).toLocaleString('pt-BR')}`
                        : 'Aguardando resgate na próxima compra',
                  },
                ];

                return (
                  <div className="space-y-2.5 pl-2 border-l-2 border-slate-200">
                    {timeline.map((item, i) => (
                      <div key={i} className="pl-3 relative">
                        <span
                          className={`font-semibold block ${
                            item.done ? 'text-slate-900' : 'text-slate-400'
                          }`}
                        >
                          {item.done ? '✓ ' : '○ '}
                          {item.title}
                        </span>
                        {item.sub && (
                          <span className="text-[11px] text-slate-500 block">{item.sub}</span>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Dados (Direito LGPD)</span>
              </button>
              <a
                href={`https://wa.me/55${selectedCustomer.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Chamar no WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 4. ROULETTE & PRIZES VIEW (SERVER-SIDE PROBABILITY & STOCK CONFIGURATION)
// ============================================================================

export const RouletteAndPrizesView: React.FC<ViewProps> = ({ workspace, onRefresh }) => {
  const { campaigns, prizes } = workspace;
  const [selectedCampaignId, setSelectedCampaignId] = useState<number>(
    campaigns[0]?.id || 0
  );
  const [editingPrize, setEditingPrize] = useState<Partial<Prize> | null>(null);
  const [saving, setSaving] = useState(false);

  const campaignPrizes = useMemo(
    () => prizes.filter((p) => p.campaignId === selectedCampaignId),
    [prizes, selectedCampaignId]
  );

  const totalProbability = useMemo(
    () =>
      campaignPrizes
        .filter((p) => p.active)
        .reduce((sum, p) => sum + Number(p.probability || 0), 0),
    [campaignPrizes]
  );

  const handleOpenNewPrize = () => {
    setEditingPrize({
      campaignId: selectedCampaignId,
      name: '',
      description: '',
      type: 'percentage_discount',
      value: 10,
      probability: 15,
      stock: 100,
      active: true,
      minimumPurchaseValue: 40,
      expirationDays: 30,
      color: '#4F46E5',
    });
  };

  const handleSavePrize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrize || !editingPrize.name) return;
    setSaving(true);
    try {
      await api.savePrize({
        ...editingPrize,
        campaignId: selectedCampaignId,
      });
      await onRefresh();
      setEditingPrize(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePrize = async (id: number) => {
    await api.deletePrize(id);
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">
            Configuração da Roleta e Prêmios (Server-Side)
          </h2>
          <p className="text-xs text-slate-500">
            Probabilidades, limites de estoque e geração de cupons são processados exclusivamente no backend para impedir manipulação.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedCampaignId}
            onChange={(e) => setSelectedCampaignId(Number(e.target.value))}
            className="h-10 px-3 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
          >
            {campaigns.map((camp) => (
              <option key={camp.id} value={camp.id}>
                Campanha: {camp.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleOpenNewPrize}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Prêmio</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Live Wheel Preview */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4">
          <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-3">
            <span className="font-bold text-slate-800">Preview Visual da Roleta</span>
            <span
              className={`font-mono font-bold tabular-nums ${
                Math.round(totalProbability) === 100 ? 'text-emerald-600' : 'text-amber-600'
              }`}
            >
              Soma de Probabilidades: {totalProbability}%
            </span>
          </div>

          <div className="py-2">
            <RouletteWheel
              slices={campaignPrizes
                .filter((p) => p.active)
                .map((p) => ({ id: p.id, name: p.name, color: p.color }))}
              rotationDegrees={0}
              isSpinning={false}
              centerLabel="PREVIEW"
            />
          </div>

          <p className="text-[11px] text-slate-500">
            Prêmios cujo estoque utilizado atingir o limite configurado são automaticamente retirados do sorteio pelo servidor.
          </p>
        </div>

        {/* Prizes Table */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                  <th className="py-3 px-4">Prêmio</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4 text-right">Probabilidade</th>
                  <th className="py-3 px-4 text-right">Estoque (Uso)</th>
                  <th className="py-3 px-4 text-right">Pedido Mín.</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {campaignPrizes.map((pr) => (
                  <tr key={pr.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: pr.color }}
                        />
                        <div>
                          <p className="font-bold text-slate-900">{pr.name}</p>
                          <p className="text-[11px] text-slate-500">
                            Validade: {pr.expirationDays} dias
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {PRIZE_TYPE_LABELS[pr.type] || pr.type}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {pr.probability}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700 tabular-nums">
                      {pr.stock === -1 ? `Ilimitado (${pr.stockUsed})` : `${pr.stockUsed} / ${pr.stock}`}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700 tabular-nums">
                      R$ {Number(pr.minimumPurchaseValue || 0).toFixed(0)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingPrize(pr)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePrize(pr.id)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-rose-50 text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Prize Modal */}
      {editingPrize && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="text-base font-display font-bold text-slate-900">
                {editingPrize.id ? 'Editar Prêmio' : 'Novo Prêmio da Roleta'}
              </h3>
              <button
                type="button"
                onClick={() => setEditingPrize(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePrize} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nome na Fatia da Roleta *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingPrize.name || ''}
                    onChange={(e) => setEditingPrize({ ...editingPrize, name: e.target.value })}
                    placeholder="Ex: 10% OFF"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Descrição / Regra do Benefício
                  </label>
                  <input
                    type="text"
                    value={editingPrize.description || ''}
                    onChange={(e) =>
                      setEditingPrize({ ...editingPrize, description: e.target.value })
                    }
                    placeholder="Ex: Válido no próximo pedido direto pelo WhatsApp"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tipo de Prêmio
                  </label>
                  <select
                    value={editingPrize.type || 'percentage_discount'}
                    onChange={(e) => setEditingPrize({ ...editingPrize, type: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white"
                  >
                    {Object.entries(PRIZE_TYPE_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Valor do Desconto (% ou R$)
                  </label>
                  <input
                    type="number"
                    value={editingPrize.value ?? 0}
                    onChange={(e) =>
                      setEditingPrize({ ...editingPrize, value: Number(e.target.value) })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Probabilidade de Sorteio (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={100}
                    value={editingPrize.probability ?? 10}
                    onChange={(e) =>
                      setEditingPrize({ ...editingPrize, probability: Number(e.target.value) })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Estoque (-1 para ilimitado)
                  </label>
                  <input
                    type="number"
                    value={editingPrize.stock ?? 100}
                    onChange={(e) =>
                      setEditingPrize({ ...editingPrize, stock: Number(e.target.value) })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Compra Mínima (R$)
                  </label>
                  <input
                    type="number"
                    value={editingPrize.minimumPurchaseValue ?? 0}
                    onChange={(e) =>
                      setEditingPrize({
                        ...editingPrize,
                        minimumPurchaseValue: Number(e.target.value),
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Validade do Cupom (Dias)
                  </label>
                  <input
                    type="number"
                    value={editingPrize.expirationDays ?? 30}
                    onChange={(e) =>
                      setEditingPrize({
                        ...editingPrize,
                        expirationDays: Number(e.target.value),
                      })
                    }
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Cor da Fatia na Roleta
                  </label>
                  <input
                    type="color"
                    value={editingPrize.color || '#4F46E5'}
                    onChange={(e) => setEditingPrize({ ...editingPrize, color: e.target.value })}
                    className="w-full h-10 p-1 rounded-xl border border-slate-300 bg-white cursor-pointer"
                  />
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingPrize.active ?? true}
                      onChange={(e) =>
                        setEditingPrize({ ...editingPrize, active: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                    />
                    <span className="font-semibold text-slate-700">Prêmio Ativo</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingPrize(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                >
                  {saving ? 'Salvando...' : 'Salvar Prêmio'}
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
// 5. COUPONS & REDEMPTION VIEW (SINGLE-USE VALIDATION + ORDER VALUE TRACKING)
// ============================================================================

export const CouponsView: React.FC<ViewProps> = ({ workspace, onRefresh }) => {
  const { coupons, customers, campaigns, prizes } = workspace;

  const [codeInput, setCodeInput] = useState('');
  const [orderValueInput, setOrderValueInput] = useState('89.90');
  const [channelInput, setChannelInput] = useState('WhatsApp');
  const [redeemFeedback, setRedeemFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const handleManualRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codeInput.trim()) return;
    setRedeemFeedback(null);
    try {
      await api.redeemCoupon({
        code: codeInput.trim().toUpperCase(),
        orderValue: Number(orderValueInput || 0),
        redemptionChannel: channelInput,
      });
      setRedeemFeedback({
        type: 'success',
        text: `Cupom ${codeInput.toUpperCase()} validado e registrado como recompra no canal próprio!`,
      });
      setCodeInput('');
      await onRefresh();
    } catch (err: any) {
      setRedeemFeedback({
        type: 'error',
        text: err.message || 'Erro ao validar cupom.',
      });
    }
  };

  const handleQuickRedeemRow = async (couponId: number, code: string) => {
    setRedeemFeedback(null);
    try {
      await api.redeemCoupon({
        couponId,
        orderValue: Number(orderValueInput || 85),
        redemptionChannel: 'WhatsApp',
      });
      setRedeemFeedback({
        type: 'success',
        text: `Cupom ${code} baixado com sucesso!`,
      });
      await onRefresh();
    } catch (err: any) {
      setRedeemFeedback({ type: 'error', text: err.message });
    }
  };

  const filteredCoupons = useMemo(() => {
    return coupons.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      return true;
    });
  }, [coupons, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Manual Coupon Redemption Box */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6">
        <h2 className="text-lg font-display font-bold text-slate-900 mb-1">
          Validador e Baixa de Cupons (Canal Próprio)
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Registre o uso do cupom quando o cliente fizer o pedido pelo WhatsApp, Site ou Balcão. Cada cupom é único e não pode ser utilizado duas vezes.
        </p>

        <form
          onSubmit={handleManualRedeem}
          className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Código do Cupom
            </label>
            <input
              type="text"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="Ex: ALFA-8K4P2"
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 font-mono text-sm uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Valor do Pedido Recuperado (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={orderValueInput}
              onChange={(e) => setOrderValueInput(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 font-mono text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Canal de Resgate
            </label>
            <select
              value={channelInput}
              onChange={(e) => setChannelInput(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-xs bg-white"
            >
              <option value="WhatsApp">WhatsApp</option>
              <option value="Site Próprio">Site Próprio</option>
              <option value="Loja Física / Balcão">Loja Física / Balcão</option>
              <option value="App Próprio">App Próprio</option>
            </select>
          </div>

          <button
            type="submit"
            className="h-11 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Validar e Dar Baixa</span>
          </button>
        </form>

        {redeemFeedback && (
          <div
            className={`mt-4 p-3 rounded-xl text-xs font-semibold ${
              redeemFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {redeemFeedback.text}
          </div>
        )}
      </div>

      {/* Coupons List */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-display font-bold text-slate-900">
            Histórico de Cupons Emitidos ({filteredCoupons.length})
          </h3>
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {[
              { id: 'ALL', label: 'Todos' },
              { id: 'available', label: 'Disponíveis' },
              { id: 'used', label: 'Utilizados' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                <th className="py-3 px-4">Código</th>
                <th className="py-3 px-4">Cliente</th>
                <th className="py-3 px-4">Campanha & Origem</th>
                <th className="py-3 px-4">Benefício</th>
                <th className="py-3 px-4">Validade</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCoupons.map((cp) => {
                const cust = customers.find((c) => c.id === cp.customerId);
                const camp = campaigns.find((c) => c.id === cp.campaignId);
                const prize = prizes.find((p) => p.id === cp.prizeId);
                return (
                  <tr key={cp.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600 tabular-nums">
                      {cp.code}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{cust?.name || 'Cliente'}</p>
                      <p className="text-[11px] text-slate-500 font-mono">{cust?.phone}</p>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {camp?.name} · <strong>{camp?.sourceChannel}</strong>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {prize?.name || cp.discountType}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 tabular-nums">
                      {new Date(cp.expiresAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4">
                      {cp.status === 'used' ? (
                        <span className="font-semibold text-emerald-700">
                          Utilizado ({cp.redemptionChannel})
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-600">Disponível</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {cp.status === 'available' ? (
                        <button
                          type="button"
                          onClick={() => handleQuickRedeemRow(cp.id, cp.code)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold cursor-pointer whitespace-nowrap"
                        >
                          Dar Baixa
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {cp.redeemedAt
                            ? new Date(cp.redeemedAt).toLocaleDateString('pt-BR')
                            : 'Resgatado'}
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
    </div>
  );
};

// ============================================================================
// 6. QR CODES & PRINTABLE THANK-YOU CARD STUDIO VIEW
// ============================================================================

export const QrCodesStudioView: React.FC<ViewProps> = ({
  workspace,
  onRefresh,
  onOpenPublicCampaign,
}) => {
  const { company, campaigns, qrCodes } = workspace;
  const [selectedQrId, setSelectedQrId] = useState<number>(qrCodes[0]?.id || 0);
  const selectedQr = qrCodes.find((q) => q.id === selectedQrId) || qrCodes[0];
  const selectedCamp = campaigns.find((c) => c.id === selectedQr?.campaignId) || campaigns[0];

  const [cardTitle, setCardTitle] = useState(
    selectedQr?.cardTitle || 'OBRIGADO PELA SUA COMPRA! 🎁'
  );
  const [cardSubtitle, setCardSubtitle] = useState(
    selectedQr?.cardSubtitle || 'Quer ganhar um benefício exclusivo para sua próxima compra?'
  );
  const [cardCta, setCardCta] = useState(
    selectedQr?.cardCta || 'APONTE A CÂMERA PARA O QR CODE E GIRE A ROLETA'
  );
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [savingCard, setSavingCard] = useState(false);

  const handleSelectQr = (qr: typeof selectedQr) => {
    if (!qr) return;
    setSelectedQrId(qr.id);
    setCardTitle(qr.cardTitle);
    setCardSubtitle(qr.cardSubtitle);
    setCardCta(qr.cardCta);
  };

  const handleSaveCardText = async () => {
    if (!selectedQr) return;
    setSavingCard(true);
    try {
      await api.updateQrCard(selectedQr.id, {
        cardTitle,
        cardSubtitle,
        cardCta,
      });
      await onRefresh();
    } finally {
      setSavingCard(false);
    }
  };

  const getFullPublicUrl = (campSlug: string, qrCodeStr: string) =>
    `${window.location.origin}/c/${campSlug}?qr=${qrCodeStr}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">
            QR Codes Rastreáveis & Cartão de Agradecimento para Impressão
          </h2>
          <p className="text-xs text-slate-500">
            Cada campanha possui seu próprio QR Code para você identificar exatamente de qual marketplace o cliente veio.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimir Cartão Selecionado</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List of QR Codes per Campaign */}
        <div className="lg:col-span-6 space-y-3 no-print">
          {qrCodes.map((qr) => {
            const camp = campaigns.find((c) => c.id === qr.campaignId) || campaigns[0];
            const fullUrl = getFullPublicUrl(camp?.slug || 'campanha', qr.code);
            const isSelected = selectedQr?.id === qr.id;

            return (
              <div
                key={qr.id}
                onClick={() => handleSelectQr(qr)}
                className={`bg-white border rounded-2xl p-4 transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-600 ring-2 ring-indigo-600/10'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-xl border border-slate-200 bg-slate-50 shrink-0">
                    <QrCodeMatrix value={fullUrl} size={76} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-600">
                        Origem: {qr.sourceChannel}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-800 tabular-nums">
                        {qr.scanCount} scans
                      </span>
                    </div>
                    <h3 className="text-sm font-display font-bold text-slate-900 truncate mt-0.5">
                      {camp?.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                      Código: {qr.code}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard?.writeText(fullUrl);
                          setCopiedId(qr.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedId === qr.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar URL</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (camp) onOpenPublicCampaign(company.slug, camp.slug, qr.code);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-xs font-semibold text-indigo-700 flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Simular Scan</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Printable Package Insert Card Studio */}
        {selectedQr && selectedCamp && (
          <div className="lg:col-span-6 space-y-4">
            {/* Printable Card Preview */}
            <div
              className="bg-white border-2 rounded-3xl p-8 text-center shadow-lg max-w-md mx-auto relative overflow-hidden"
              style={{ borderColor: selectedCamp.primaryColor || '#4F46E5' }}
            >
              <div
                className="text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: selectedCamp.primaryColor || '#4F46E5' }}
              >
                {company.name}
              </div>

              <h3 className="text-xl font-display font-extrabold text-slate-900 mb-2">
                {cardTitle}
              </h3>
              <p className="text-xs text-slate-600 max-w-xs mx-auto mb-5">{cardSubtitle}</p>

              <div className="inline-block p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-white mb-4">
                <QrCodeMatrix
                  value={getFullPublicUrl(selectedCamp.slug, selectedQr.code)}
                  size={170}
                />
              </div>

              <p
                className="text-xs font-display font-extrabold tracking-wide uppercase max-w-xs mx-auto mb-2"
                style={{ color: selectedCamp.primaryColor || '#4F46E5' }}
              >
                {cardCta}
              </p>
              <p className="text-[11px] text-slate-500">
                Gire a roleta e descubra seu benefício para a próxima compra direta!
              </p>
            </div>

            {/* Customize Card Texts Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 text-xs no-print">
              <h4 className="font-display font-bold text-slate-900">
                Personalizar Textos do Cartão Impresso
              </h4>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Título do Cartão
                </label>
                <input
                  type="text"
                  value={cardTitle}
                  onChange={(e) => setCardTitle(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Subtítulo
                </label>
                <input
                  type="text"
                  value={cardSubtitle}
                  onChange={(e) => setCardSubtitle(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Chamada para Ação (CTA)
                </label>
                <input
                  type="text"
                  value={cardCta}
                  onChange={(e) => setCardCta(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-300"
                />
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={savingCard}
                  onClick={handleSaveCardText}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                >
                  {savingCard ? 'Salvando...' : 'Salvar Modelo de Cartão'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 7. ANALYTICS & EVENTS STREAM VIEW
// ============================================================================

export const AnalyticsView: React.FC<ViewProps> = ({ workspace }) => {
  const { events, campaigns, customers } = workspace;

  const eventCounts = useMemo(() => {
    const map: Record<string, number> = {
      qr_scan: 0,
      page_view: 0,
      registration: 0,
      spin: 0,
      prize_won: 0,
      coupon_generated: 0,
      coupon_viewed: 0,
      destination_clicked: 0,
      coupon_redeemed: 0,
    };
    for (const ev of events) {
      map[ev.eventType] = (map[ev.eventType] || 0) + 1;
    }
    return map;
  }, [events]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">
          Analytics de Comportamento & Eventos do Funil
        </h2>
        <p className="text-xs text-slate-500">
          Rastreamento de todos os eventos da jornada sem envio de dados pessoais sensíveis para terceiros.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(eventCounts).map(([key, count]) => (
          <div key={key} className="bg-white border border-slate-200 rounded-xl p-4">
            <span className="text-[11px] font-mono text-slate-500 block">{key}</span>
            <span className="text-2xl font-mono font-bold text-slate-900 tabular-nums mt-1 block">
              {count}
            </span>
          </div>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h3 className="text-sm font-display font-bold text-slate-900">
            Últimos Eventos Registrados
          </h3>
        </div>
        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500">
                <th className="py-2.5 px-4">Evento</th>
                <th className="py-2.5 px-4">Campanha</th>
                <th className="py-2.5 px-4">Cliente</th>
                <th className="py-2.5 px-4">Data / Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {events.slice(0, 40).map((ev) => {
                const camp = campaigns.find((c) => c.id === ev.campaignId);
                const cust = customers.find((c) => c.id === ev.customerId);
                return (
                  <tr key={ev.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-semibold text-indigo-600">
                      {ev.eventType}
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">{camp?.name || 'Geral'}</td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {cust?.name || 'Visitante Anônimo'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-500 tabular-nums">
                      {new Date(ev.createdAt).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 8. SETTINGS, RBAC TEAM & FUTURE INTEGRATIONS ARCHITECTURE VIEW
// ============================================================================

export const SettingsView: React.FC<
  ViewProps & { onLaunchOnboarding: () => void }
> = ({ workspace, onRefresh, onLaunchOnboarding }) => {
  const { company, teamProfiles } = workspace;

  const [name, setName] = useState(company.name);
  const [industry, setIndustry] = useState(company.industry);
  const [whatsappUrl, setWhatsappUrl] = useState(company.whatsappUrl);
  const [whatsappMessageTemplate, setWhatsappMessageTemplate] = useState(
    company.whatsappMessageTemplate ||
      'Olá! Ganhei o cupom {cupom} ({premio}) e quero fazer meu pedido.'
  );
  const [syncTemplateToCampaigns, setSyncTemplateToCampaigns] = useState(true);
  const [websiteUrl, setWebsiteUrl] = useState(company.websiteUrl);
  const [instagramUrl, setInstagramUrl] = useState(company.instagramUrl);
  const [ga4Id, setGa4Id] = useState(company.ga4Id || '');
  const [metaPixelId, setMetaPixelId] = useState(company.metaPixelId || '');
  const [savedMsg, setSavedMsg] = useState(false);

  // Team invite
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState('ADMIN');

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.updateCompany({
      name,
      industry,
      whatsappUrl,
      whatsappMessageTemplate:
        whatsappMessageTemplate.trim() ||
        'Olá! Ganhei o cupom {cupom} ({premio}) e quero fazer meu pedido.',
      syncTemplateToCampaigns,
      websiteUrl,
      instagramUrl,
      ga4Id,
      metaPixelId,
    });
    await onRefresh();
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2500);
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberName.trim() || !memberEmail.trim()) return;
    await api.addTeamMember({
      name: memberName.trim(),
      email: memberEmail.trim(),
      role: memberRole,
    });
    setMemberName('');
    setMemberEmail('');
    await onRefresh();
  };

  const futureIntegrations = [
    { name: 'iFood', category: 'Marketplace / Delivery' },
    { name: 'Mercado Livre', category: 'Marketplace' },
    { name: 'Shopee', category: 'Marketplace' },
    { name: 'Amazon', category: 'Marketplace' },
    { name: 'Shopify', category: 'E-commerce' },
    { name: 'Nuvemshop', category: 'E-commerce' },
    { name: 'WooCommerce', category: 'E-commerce' },
    { name: 'Yampi', category: 'Checkout / E-commerce' },
    { name: 'WhatsApp Business API', category: 'Mensageria Oficial' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">
            Configurações da Plataforma, WhatsApp Business, CRM & Privacidade LGPD
          </h2>
          <p className="text-xs text-slate-500">
            Isolamento multi-tenant e políticas RLS ativas para <strong>{company.name}</strong> (ID #{company.id}).
          </p>
        </div>
        <button
          type="button"
          onClick={onLaunchOnboarding}
          className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer self-start sm:self-auto"
        >
          Abrir Assistente de Onboarding (8 Passos)
        </button>
      </div>

      {/* Official Meta WhatsApp Business Cloud API & Embedded Signup Integration */}
      <WhatsappBusinessIntegrationPanel workspace={workspace} onRefresh={onRefresh} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Company Form */}
        <form
          onSubmit={handleSaveCompany}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 text-xs"
        >
          <h3 className="text-base font-display font-bold text-slate-900 border-b border-slate-100 pb-3">
            Dados da Empresa & Pré-Configuração de Canais Próprios
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nome da Empresa
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Segmento</label>
              <input
                type="text"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                WhatsApp Principal (Canal Próprio)
              </label>
              <input
                type="text"
                value={whatsappUrl}
                onChange={(e) => setWhatsappUrl(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Site / E-commerce Próprio
              </label>
              <input
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300"
              />
            </div>

            <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block font-semibold text-slate-800">
                  Mensagem Automática do WhatsApp (Pré-configuração Padrão)
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500">Variáveis dinâmicas:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setWhatsappMessageTemplate((prev) =>
                        prev.includes('{cupom}') ? prev : `${prev} {cupom}`
                      )
                    }
                    className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-mono text-[11px] font-semibold cursor-pointer"
                  >
                    + &#123;cupom&#125;
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setWhatsappMessageTemplate((prev) =>
                        prev.includes('{premio}') ? prev : `${prev} ({premio})`
                      )
                    }
                    className="px-2 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-mono text-[11px] font-semibold cursor-pointer"
                  >
                    + &#123;premio&#125;
                  </button>
                </div>
              </div>
              <textarea
                rows={2}
                value={whatsappMessageTemplate}
                onChange={(e) => setWhatsappMessageTemplate(e.target.value)}
                placeholder="Olá! Ganhei o cupom {cupom} ({premio}) e quero fazer meu pedido."
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                <p className="text-[11px] text-slate-500">
                  Use <strong>&#123;cupom&#125;</strong> para o código gerado e{' '}
                  <strong>&#123;premio&#125;</strong> para o nome do benefício.
                </p>
                <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={syncTemplateToCampaigns}
                    onChange={(e) => setSyncTemplateToCampaigns(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600"
                  />
                  <span>Atualizar também nas campanhas ativas</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Google Analytics 4 ID (Opcional)
              </label>
              <input
                type="text"
                value={ga4Id}
                onChange={(e) => setGa4Id(e.target.value)}
                placeholder="G-XXXXXXXXXX"
                className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Meta Pixel ID (Opcional)
              </label>
              <input
                type="text"
                value={metaPixelId}
                onChange={(e) => setMetaPixelId(e.target.value)}
                placeholder="123456789012345"
                className="w-full h-10 px-3 rounded-xl border border-slate-300 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            {savedMsg ? (
              <span className="text-emerald-600 font-semibold">
                ✓ Configurações atualizadas com sucesso!
              </span>
            ) : (
              <span className="text-slate-400">Slug público: /c/{company.slug}</span>
            )}
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
            >
              Salvar Alterações
            </button>
          </div>
        </form>

        {/* RBAC Roles & Team */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-display font-bold text-slate-900">
                Controle de Acesso (RBAC)
              </h3>
              <p className="text-[11px] text-slate-500">
                Papéis: OWNER (Total), ADMIN (Operacional/Relatórios), STAFF (Baixa de Cupons)
              </p>
            </div>
            <Shield className="w-5 h-5 text-indigo-600" />
          </div>

          <div className="space-y-2">
            {teamProfiles.map((tp) => (
              <div
                key={tp.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200"
              >
                <div>
                  <p className="font-bold text-slate-900">{tp.name}</p>
                  <p className="text-[11px] text-slate-500">{tp.email}</p>
                </div>
                <span className="font-mono font-bold text-indigo-700">{tp.role}</span>
              </div>
            ))}
          </div>

          <form onSubmit={handleAddMember} className="space-y-2.5 pt-2 border-t border-slate-100">
            <p className="font-semibold text-slate-700">Adicionar Membro à Empresa:</p>
            <input
              type="text"
              placeholder="Nome do colaborador"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-300"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="email"
                placeholder="email@empresa.com"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                className="col-span-2 h-9 px-3 rounded-lg border border-slate-300"
              />
              <select
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value)}
                className="h-9 px-2 rounded-lg border border-slate-300 bg-white font-mono"
              >
                <option value="ADMIN">ADMIN</option>
                <option value="STAFF">STAFF</option>
                <option value="OWNER">OWNER</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold cursor-pointer"
            >
              Convidar Colaborador
            </button>
          </form>
        </div>
      </div>

      {/* Future Integrations Architecture (Transparent Status) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div>
          <h3 className="text-base font-display font-bold text-slate-900">
            Módulos de Integração Externa (Arquitetura Preparada)
          </h3>
          <p className="text-xs text-slate-500">
            Conectores nativos para validação automática de pedidos e webhooks. No MVP, o rastreamento ocorre via QR Code por campanha e baixa no painel.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {futureIntegrations.map((integ) => (
            <div
              key={integ.name}
              className="p-4 rounded-xl border border-slate-200 flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-slate-900">{integ.name}</p>
                <p className="text-[11px] text-slate-500">{integ.category}</p>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                Não configurada
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
