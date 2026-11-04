import React, { useState } from 'react';
import {
  Building2,
  Image,
  MessageCircle,
  Globe,
  Store,
  Megaphone,
  Disc,
  QrCode,
  Check,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { SOURCE_CHANNELS, WorkspaceData } from '../types/alfa.ts';
import { QrCodeMatrix } from './QrCodeMatrix.tsx';

interface OnboardingWizardProps {
  workspace: WorkspaceData;
  onComplete: () => Promise<void>;
  onOpenPublicCampaign: (companySlug: string, campaignSlug: string) => void;
}

const SEGMENTS = [
  'Pizzaria / Delivery',
  'Hamburgueria / Restaurante',
  'Loja de Roupas / Moda',
  'Smartphones & Eletrônicos',
  'Vendedor Mercado Livre',
  'Vendedor Shopee / Amazon',
  'E-commerce Geral',
  'Loja Física / Varejo Local',
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  workspace,
  onComplete,
  onOpenPublicCampaign,
}) => {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Step 1-5: Company fields
  const [companyName, setCompanyName] = useState(workspace.company.name || '');
  const [logoUrl, setLogoUrl] = useState(workspace.company.logoUrl || '');
  const [whatsappUrl, setWhatsappUrl] = useState(workspace.company.whatsappUrl || '5511999998888');
  const [whatsappMessageTemplate, setWhatsappMessageTemplate] = useState(
    workspace.company.whatsappMessageTemplate ||
      'Olá! Ganhei o cupom {cupom} ({premio}) e quero fazer meu pedido.'
  );
  const [websiteUrl, setWebsiteUrl] = useState(
    workspace.company.websiteUrl || 'https://meusite.com.br'
  );
  const [industry, setIndustry] = useState(workspace.company.industry || SEGMENTS[0]);

  // Step 6: First Campaign
  const [campaignName, setCampaignName] = useState('Clientes iFood — Novembro');
  const [sourceChannel, setSourceChannel] = useState<string>('iFood');
  const [destinationType, setDestinationType] = useState<'whatsapp' | 'site'>('whatsapp');
  const [primaryColor, setPrimaryColor] = useState('#EA1D2C');

  // Step 7: Roulette configuration
  const [maxSpins, setMaxSpins] = useState(1);
  const [prize1Name, setPrize1Name] = useState('10% OFF na próxima compra');
  const [prize1Prob, setPrize1Prob] = useState(40);
  const [prize2Name, setPrize2Name] = useState('Frete Grátis');
  const [prize2Prob, setPrize2Prob] = useState(30);
  const [prize3Name, setPrize3Name] = useState('R$ 15,00 OFF');
  const [prize3Prob, setPrize3Prob] = useState(30);

  // Step 8: Generated QR Result
  const [generatedCampaignSlug, setGeneratedCampaignSlug] = useState(
    workspace.campaigns[0]?.slug || 'clientes-ifood'
  );

  const stepsInfo = [
    { num: 1, label: 'Empresa', icon: Building2 },
    { num: 2, label: 'Logo', icon: Image },
    { num: 3, label: 'WhatsApp', icon: MessageCircle },
    { num: 4, label: 'Site', icon: Globe },
    { num: 5, label: 'Segmento', icon: Store },
    { num: 6, label: 'Campanha', icon: Megaphone },
    { num: 7, label: 'Roleta', icon: Disc },
    { num: 8, label: 'QR Code', icon: QrCode },
  ];

  const handleFinalizeSetup = async () => {
    setSaving(true);
    try {
      await api.updateCompany({
        name: companyName.trim() || workspace.company.name,
        logoUrl: logoUrl.trim(),
        whatsappUrl: whatsappUrl.replace(/\D/g, ''),
        whatsappMessageTemplate:
          whatsappMessageTemplate.trim() ||
          'Olá! Ganhei o cupom {cupom} ({premio}) e quero fazer meu pedido.',
        websiteUrl: websiteUrl.trim(),
        industry,
        onboardingCompleted: true,
      });

      const created = await api.createCampaign({
        name: campaignName.trim() || 'Clientes iFood',
        description: `Campanha criada no onboarding para migrar clientes de ${sourceChannel}`,
        sourceChannel,
        primaryColor,
        destinationType,
        destinationUrl:
          destinationType === 'whatsapp'
            ? whatsappUrl.replace(/\D/g, '')
            : websiteUrl.trim(),
        whatsappMessageTemplate:
          whatsappMessageTemplate.trim() ||
          'Olá! Ganhei o cupom {cupom} ({premio}) e quero fazer meu pedido.',
        maxSpinsPerCustomer: maxSpins,
        cooldownHours: 24,
      });

      if (created?.campaign?.id) {
        setGeneratedCampaignSlug(created.campaign.slug);
        await api.savePrize({
          campaignId: created.campaign.id,
          name: prize1Name,
          type: 'percentage_discount',
          value: 10,
          probability: Number(prize1Prob),
          stock: 100,
          active: true,
          minimumPurchaseValue: 40,
          expirationDays: 30,
          color: '#4F46E5',
        });
        await api.savePrize({
          campaignId: created.campaign.id,
          name: prize2Name,
          type: 'free_shipping',
          value: 12,
          probability: Number(prize2Prob),
          stock: 80,
          active: true,
          minimumPurchaseValue: 40,
          expirationDays: 30,
          color: '#16A34A',
        });
        await api.savePrize({
          campaignId: created.campaign.id,
          name: prize3Name,
          type: 'fixed_discount',
          value: 15,
          probability: Number(prize3Prob),
          stock: 50,
          active: true,
          minimumPurchaseValue: 60,
          expirationDays: 30,
          color: '#D97706',
        });
      }

      setStep(8);
    } catch (err) {
      console.error('Failed onboarding step:', err);
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = `${window.location.origin}/c/${generatedCampaignSlug}`;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold text-indigo-600">
            CONFIGURAÇÃO GUIADA · PASSO {step} DE 8
          </span>
          <h2 className="text-xl font-display font-bold text-slate-900 mt-0.5">
            Onboarding Alfa Link
          </h2>
        </div>
        <button
          type="button"
          onClick={onComplete}
          className="text-xs font-medium text-slate-500 hover:text-slate-800 underline self-start sm:self-auto cursor-pointer"
        >
          Ir direto ao painel completo
        </button>
      </div>

      {/* 8-Step Progress Bar */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 my-6">
        {stepsInfo.map((item) => {
          const Icon = item.icon;
          const active = step === item.num;
          const done = step > item.num;
          return (
            <button
              key={item.num}
              type="button"
              onClick={() => item.num < 8 && setStep(item.num)}
              className={`flex flex-col items-center p-2 rounded-xl border text-center transition-colors cursor-pointer ${
                active
                  ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700'
                  : done
                  ? 'border-emerald-200 bg-emerald-50/50 text-emerald-700'
                  : 'border-slate-200 bg-slate-50 text-slate-400'
              }`}
            >
              <div className="w-6 h-6 rounded-full flex items-center justify-center mb-1">
                {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className="text-[11px] font-semibold whitespace-nowrap">
                {item.num}. {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="py-4 min-h-[240px]">
        {step === 1 && (
          <div className="max-w-lg space-y-4">
            <h3 className="text-lg font-display font-bold text-slate-900">
              Passo 1: Qual é o nome da sua empresa?
            </h3>
            <p className="text-sm text-slate-600">
              Esse nome aparecerá no topo da página pública quando o cliente escanear o QR Code.
            </p>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ex: Pizzaria Bella Napoli"
              className="w-full h-11 px-4 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-indigo-600"
            />
          </div>
        )}

        {step === 2 && (
          <div className="max-w-lg space-y-4">
            <h3 className="text-lg font-display font-bold text-slate-900">
              Passo 2: Logo da empresa (Opcional)
            </h3>
            <p className="text-sm text-slate-600">
              Informe a URL da sua logo ou deixe em branco para usar o monograma automático com as iniciais da marca.
            </p>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://suaempresa.com.br/logo.png"
              className="w-full h-11 px-4 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-indigo-600"
            />
          </div>
        )}

        {step === 3 && (
          <div className="max-w-xl space-y-4">
            <h3 className="text-lg font-display font-bold text-slate-900">
              Passo 3: WhatsApp e mensagem automática (Pré-configuração)
            </h3>
            <p className="text-sm text-slate-600">
              Quando o cliente ganhar o cupom na roleta, o botão principal abrirá uma conversa automática neste número com a mensagem pré-configurada abaixo.
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número do WhatsApp (com DDD)
              </label>
              <input
                type="tel"
                value={whatsappUrl}
                onChange={(e) => setWhatsappUrl(e.target.value)}
                placeholder="5511999998888"
                className="w-full h-11 px-4 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-slate-800">
                  Mensagem Automática do WhatsApp
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
              <p className="text-[11px] text-slate-500">
                Use <strong>&#123;cupom&#125;</strong> para o código gerado e{' '}
                <strong>&#123;premio&#125;</strong> para o benefício sorteado.
              </p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="max-w-lg space-y-4">
            <h3 className="text-lg font-display font-bold text-slate-900">
              Passo 4: Site próprio ou cardápio digital
            </h3>
            <p className="text-sm text-slate-600">
              Você também pode direcionar clientes de campanhas específicas para comprar diretamente no seu site ou e-commerce.
            </p>
            <input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://cardapio.suaempresa.com.br"
              className="w-full h-11 px-4 rounded-xl border border-slate-300 text-sm focus:outline-none focus:border-indigo-600"
            />
          </div>
        )}

        {step === 5 && (
          <div className="max-w-xl space-y-4">
            <h3 className="text-lg font-display font-bold text-slate-900">
              Passo 5: Qual é o segmento do seu negócio?
            </h3>
            <p className="text-sm text-slate-600">
              O Alfa Link adapta modelos de campanha tanto para delivery e gastronomia quanto para e-commerces e vendedores de marketplaces.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SEGMENTS.map((seg) => (
                <button
                  key={seg}
                  type="button"
                  onClick={() => setIndustry(seg)}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all cursor-pointer ${
                    industry === seg
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  {seg}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="max-w-xl space-y-4">
            <h3 className="text-lg font-display font-bold text-slate-900">
              Passo 6: Criar sua primeira campanha de migração
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome da Campanha
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Canal de Origem (Marketplace)
                </label>
                <select
                  value={sourceChannel}
                  onChange={(e) => setSourceChannel(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  {SOURCE_CHANNELS.map((ch) => (
                    <option key={ch} value={ch}>
                      {ch}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Canal Próprio de Destino
                </label>
                <select
                  value={destinationType}
                  onChange={(e) => setDestinationType(e.target.value as 'whatsapp' | 'site')}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="whatsapp">Pedir pelo WhatsApp</option>
                  <option value="site">Comprar pelo Site Próprio</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cor Principal da Página Pública
                </label>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-full h-11 p-1 rounded-xl border border-slate-300 bg-white cursor-pointer"
                />
              </div>
              {destinationType === 'whatsapp' && (
                <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-800">
                    Mensagem Automática do WhatsApp (Pré-configurada)
                  </label>
                  <textarea
                    rows={2}
                    value={whatsappMessageTemplate}
                    onChange={(e) => setWhatsappMessageTemplate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:border-indigo-600"
                  />
                  <p className="text-[11px] text-slate-500">
                    Variáveis dinâmicas suportadas: <strong>&#123;cupom&#125;</strong> e{' '}
                    <strong>&#123;premio&#125;</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="max-w-xl space-y-4">
            <h3 className="text-lg font-display font-bold text-slate-900">
              Passo 7: Configurar prêmios e probabilidades da roleta
            </h3>
            <p className="text-xs text-slate-600">
              O sorteio é 100% processado no servidor com controle de estoque e limite de {maxSpins} giro(s) por cliente.
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 items-center">
                <input
                  type="text"
                  value={prize1Name}
                  onChange={(e) => setPrize1Name(e.target.value)}
                  className="col-span-2 h-10 px-3 rounded-lg border border-slate-300 text-xs"
                />
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={prize1Prob}
                    onChange={(e) => setPrize1Prob(Number(e.target.value))}
                    className="w-20 h-10 px-2.5 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                  <span className="text-xs text-slate-500">%</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 items-center">
                <input
                  type="text"
                  value={prize2Name}
                  onChange={(e) => setPrize2Name(e.target.value)}
                  className="col-span-2 h-10 px-3 rounded-lg border border-slate-300 text-xs"
                />
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={prize2Prob}
                    onChange={(e) => setPrize2Prob(Number(e.target.value))}
                    className="w-20 h-10 px-2.5 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                  <span className="text-xs text-slate-500">%</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 items-center">
                <input
                  type="text"
                  value={prize3Name}
                  onChange={(e) => setPrize3Name(e.target.value)}
                  className="col-span-2 h-10 px-3 rounded-lg border border-slate-300 text-xs"
                />
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={prize3Prob}
                    onChange={(e) => setPrize3Prob(Number(e.target.value))}
                    className="w-20 h-10 px-2.5 rounded-lg border border-slate-300 text-xs font-mono"
                  />
                  <span className="text-xs text-slate-500">%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 8 && (
          <div className="flex flex-col sm:flex-row items-center gap-8 py-2">
            <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 shrink-0">
              <QrCodeMatrix value={publicUrl} size={160} />
            </div>
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                <Check className="w-4 h-4" />
                <span>PASSO 8 CONCLUÍDO</span>
              </div>
              <h3 className="text-2xl font-display font-extrabold text-slate-900">
                Seu primeiro QR Code está pronto.
              </h3>
              <p className="text-sm text-slate-600">
                Envie este QR Code junto aos pedidos do <strong>{sourceChannel}</strong> para transformar compradores do marketplace em clientes fiéis do seu canal próprio.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(publicUrl);
                    setCopiedUrl(true);
                    setTimeout(() => setCopiedUrl(false), 2000);
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedUrl ? 'Link Copiado!' : 'Copiar URL da Campanha'}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onOpenPublicCampaign(workspace.company.slug, generatedCampaignSlug)
                  }
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Testar Roleta Como Cliente</span>
                </button>
                <button
                  type="button"
                  onClick={onComplete}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-white cursor-pointer"
                >
                  Acessar Dashboard
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      {step < 8 && (
        <div className="flex items-center justify-between pt-6 border-t border-slate-200">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Anterior</span>
          </button>

          {step < 7 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
            >
              <span>Próximo Passo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleFinalizeSetup}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
            >
              <span>{saving ? 'Gerando QR Code...' : 'Concluir e Gerar QR Code'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
