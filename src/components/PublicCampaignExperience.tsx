import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Gift,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  ShoppingBag,
  Info,
  X,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { RouletteWheel, WheelSlice } from './RouletteWheel.tsx';

interface PublicCampaignExperienceProps {
  companySlug: string;
  campaignSlug: string;
  qrParam?: string;
  onBackToAdmin?: () => void;
}

function formatPhoneMask(val: string): string {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export const PublicCampaignExperience: React.FC<PublicCampaignExperienceProps> = ({
  companySlug,
  campaignSlug,
  qrParam,
  onBackToAdmin,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campaignData, setCampaignData] = useState<{
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
    wheelSlices: WheelSlice[];
  } | null>(null);

  // Customer form state
  const [step, setStep] = useState<'welcome' | 'wheel' | 'result'>('welcome');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Roulette & result state
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinOutcome, setSpinOutcome] = useState<{
    alreadyParticipated: boolean;
    message?: string;
    sliceIndex: number;
    result?: string;
    prize: any;
    coupon: any;
    customer: { id: number; name: string; phone: string };
  } | null>(null);

  const [copiedCode, setCopiedCode] = useState(false);
  const [clickedDestination, setClickedDestination] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    api
      .getPublicCampaign(companySlug, campaignSlug, qrParam)
      .then((res) => {
        if (mounted) {
          setCampaignData(res);
          setLoading(false);
        }
      })
      .catch((err: any) => {
        if (mounted) {
          setError(err.message || 'Campanha não encontrada.');
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [companySlug, campaignSlug, qrParam]);

  const fireCelebrationConfetti = (brandColor: string) => {
    try {
      confetti({
        particleCount: 85,
        spread: 70,
        origin: { y: 0.6 },
        colors: [brandColor, '#16A34A', '#FACC15', '#4F46E5', '#EC4899'],
      });
    } catch {
      // Fallback if canvas-confetti is unavailable
    }
  };

  const handleProceedToSpin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim() || name.trim().length < 2) {
      setFormError('Por favor, informe seu nome.');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setFormError('Informe um WhatsApp válido com DDD (ex: 11 98765-4321).');
      return;
    }
    if (campaignData?.campaign.emailRequired && (!email.trim() || !email.includes('@'))) {
      setFormError('Informe um e-mail válido para continuar.');
      return;
    }

    setStep('wheel');
    await triggerServerSpin();
  };

  const triggerServerSpin = async () => {
    if (!campaignData || isSpinning) return;
    setFormError(null);
    setIsSpinning(true);

    try {
      const outcome = await api.executeSpin(companySlug, campaignSlug, {
        name: name.trim(),
        phone,
        email: email.trim(),
        marketingConsent,
      });

      const sliceCount = Math.max(2, campaignData.wheelSlices.length);
      const sliceAngle = 360 / sliceCount;
      const targetSliceCenter = outcome.sliceIndex * sliceAngle + sliceAngle / 2;

      // Calculate final rotation so the top pointer (0 deg) lands on targetSliceCenter
      const extraSpins = 6 * 360;
      const currentBase = rotationDegrees - (rotationDegrees % 360);
      const targetRotation = currentBase + extraSpins + (360 - targetSliceCenter);

      setRotationDegrees(targetRotation);

      setTimeout(() => {
        setIsSpinning(false);
        setSpinOutcome(outcome);
        setStep('result');
        if (outcome.result !== 'no_prize') {
          fireCelebrationConfetti(campaignData.campaign.primaryColor || '#4F46E5');
        }
      }, 4450);
    } catch (err: any) {
      setIsSpinning(false);
      setFormError(err.message || 'Erro ao processar giro.');
    }
  };

  const handleCopyCoupon = () => {
    if (!spinOutcome?.coupon?.code) return;
    navigator.clipboard?.writeText(spinOutcome.coupon.code).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const formatWhatsappMessage = () => {
    if (!campaignData) return '';
    const { campaign, company } = campaignData;
    const code = spinOutcome?.coupon?.code || 'ALFA10';
    const prizeName = spinOutcome?.prize?.name || 'um benefício';
    const rawTemplate =
      campaign.whatsappMessageTemplate ||
      company.whatsappMessageTemplate ||
      'Olá! Ganhei o cupom {cupom} ({premio}) e quero fazer meu pedido.';

    return rawTemplate
      .replace(/\{cupom\}/gi, code)
      .replace(/\{codigo\}/gi, code)
      .replace(/\{premio\}/gi, prizeName)
      .replace(/\{empresa\}/gi, company.name);
  };

  const getDestinationHref = () => {
    if (!campaignData) return '#';
    const { campaign, company } = campaignData;

    if (campaign.destinationType === 'whatsapp') {
      const rawPhone = (campaign.destinationUrl || company.whatsappUrl || '5511999998888').replace(
        /\D/g,
        ''
      );
      const phoneWithCountry = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
      const message = formatWhatsappMessage();
      return `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;
    }

    const rawUrl = campaign.destinationUrl || company.websiteUrl || 'https://';
    return rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
  };

  const handleDestinationClick = async () => {
    if (!campaignData) return;
    setClickedDestination(true);
    try {
      await api.recordDestinationClick({
        companyId: campaignData.company.id,
        campaignId: campaignData.campaign.id,
        customerId: spinOutcome?.customer?.id,
        couponCode: spinOutcome?.coupon?.code,
        destinationType: campaignData.campaign.destinationType,
      });
    } catch {
      // Non-blocking analytics call
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin mb-4" />
        <p className="text-sm text-slate-300 font-medium">Carregando sua roleta de benefícios...</p>
      </div>
    );
  }

  if (error || !campaignData) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <Gift className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h1 className="text-lg font-bold mb-2">Campanha indisponível</h1>
          <p className="text-sm text-slate-400 mb-6">{error || 'Link inválido ou expirado.'}</p>
          {onBackToAdmin && (
            <button
              onClick={onBackToAdmin}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
            >
              Voltar ao Painel do Empresário
            </button>
          )}
        </div>
      </div>
    );
  }

  const { company, campaign, wheelSlices } = campaignData;
  const brandColor = campaign.primaryColor || '#4F46E5';
  const whatsappAutoMessage = formatWhatsappMessage();

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between relative overflow-x-hidden">
      {/* Subtle ambient glow using campaign primaryColor */}
      <div
        className="pointer-events-none fixed inset-0 opacity-20"
        style={{
          background: `radial-gradient(circle at 50% 15%, ${brandColor}, transparent 65%)`,
        }}
      />

      {/* Optional top bar when previewing from Admin Panel */}
      {onBackToAdmin && (
        <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">
              Visualizando Página Pública Mobile · Origem: <strong>{campaign.sourceChannel}</strong>
            </span>
          </div>
          <button
            onClick={onBackToAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao Painel
          </button>
        </header>
      )}

      {/* Main Mobile-First Container (expands cleanly on desktop with 2-column showcase) */}
      <main className="relative z-10 w-full max-w-5xl mx-auto px-4 py-6 sm:py-10 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left / Top Column: Wheel Visual */}
          <div className="lg:col-span-6 flex flex-col items-center text-center">
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight text-white max-w-md mb-2">
              {campaign.landingTitle}
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-md mb-6">
              {campaign.landingSubtitle}
            </p>

            {/* The Interactive Roulette Wheel */}
            <div className="my-2">
              <RouletteWheel
                slices={wheelSlices}
                rotationDegrees={rotationDegrees}
                isSpinning={isSpinning}
                primaryColor={brandColor}
                centerLabel={step === 'welcome' ? 'GIRAR' : isSpinning ? 'SORTEANDO' : 'GIROU'}
                onCenterClick={() => {
                  if (step === 'welcome') {
                    const inputEl = document.getElementById('customer-name-input');
                    inputEl?.focus();
                  }
                }}
              />
            </div>
          </div>

          {/* Right / Bottom Column: Registration Form OR Result Card */}
          <div className="lg:col-span-6 w-full max-w-md mx-auto">
            {step === 'welcome' && (
              <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 shadow-2xl">
                <div className="flex items-center gap-2 text-xs font-medium text-amber-400 mb-3">
                  <Gift className="w-4 h-4 shrink-0" />
                  <span>Libere seu giro em menos de 10 segundos</span>
                </div>

                <form onSubmit={handleProceedToSpin} className="space-y-4">
                  <div>
                    <label
                      htmlFor="customer-name-input"
                      className="block text-xs font-semibold text-slate-300 mb-1.5"
                    >
                      Seu Nome Completo *
                    </label>
                    <input
                      id="customer-name-input"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: João Silva"
                      className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="customer-phone-input"
                      className="block text-xs font-semibold text-slate-300 mb-1.5"
                    >
                      Seu WhatsApp (com DDD) *
                    </label>
                    <input
                      id="customer-phone-input"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
                      placeholder="(11) 98765-4321"
                      className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="customer-email-input"
                      className="block text-xs font-semibold text-slate-300 mb-1.5"
                    >
                      Seu E-mail {campaign.emailRequired ? '*' : '(Opcional)'}
                    </label>
                    <input
                      id="customer-email-input"
                      type="email"
                      required={campaign.emailRequired}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@email.com"
                      className="w-full h-12 px-4 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Separate Non-Mandatory LGPD Marketing Consent */}
                  <div className="pt-1">
                    <label className="flex items-start gap-3 cursor-pointer select-none p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
                      <input
                        type="checkbox"
                        checked={marketingConsent}
                        onChange={(e) => setMarketingConsent(e.target.checked)}
                        className="mt-0.5 w-5 h-5 rounded border-slate-600 text-indigo-600 focus:ring-indigo-500 shrink-0"
                      />
                      <span className="text-xs text-slate-300 leading-relaxed">
                        Quero receber novidades, ofertas e benefícios desta empresa pelo WhatsApp.{' '}
                        <span className="text-slate-500">(Opcional — não obrigatório para girar)</span>
                      </span>
                    </label>
                  </div>

                  {formError && (
                    <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs font-medium">
                      {formError}
                    </div>
                  )}

                  <button
                    type="submit"
                    style={{ backgroundColor: brandColor }}
                    className="w-full h-14 rounded-2xl text-white font-display font-extrabold text-base tracking-wide shadow-lg hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-5 h-5" />
                    <span>QUERO GIRAR</span>
                  </button>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Dados protegidos (LGPD)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPrivacyModal(true)}
                      className="underline hover:text-slate-200 cursor-pointer"
                    >
                      Termos e Privacidade
                    </button>
                  </div>
                </form>
              </div>
            )}

            {step === 'wheel' && (
              <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-8 text-center shadow-2xl">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-6 h-6 text-indigo-400 animate-spin" />
                </div>
                <h2 className="text-xl font-display font-bold text-white mb-2">
                  Sorteando seu benefício...
                </h2>
                <p className="text-sm text-slate-300">
                  Boa sorte, <strong>{name.split(' ')[0]}</strong>! Aguarde a roleta parar para revelar seu cupom exclusivo.
                </p>
                {formError && (
                  <div className="mt-4 p-3 rounded-xl bg-rose-950 border border-rose-800 text-xs text-rose-200">
                    {formError}
                    <button
                      onClick={() => setStep('welcome')}
                      className="block mx-auto mt-2 underline font-semibold"
                    >
                      Voltar e corrigir dados
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === 'result' && spinOutcome && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
                {spinOutcome.alreadyParticipated && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>{spinOutcome.message}</span>
                  </div>
                )}

                {spinOutcome.result === 'try_again' ? (
                  <div className="text-center space-y-4 py-2">
                    <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center mx-auto">
                      <RefreshCw className="w-7 h-7 text-sky-400" />
                    </div>
                    <h2 className="text-2xl font-display font-extrabold text-white">
                      🔄 VOCÊ GANHOU OUTRA CHANCE!
                    </h2>
                    <p className="text-sm text-slate-300">
                      Seu giro bônus já está liberado. Gire novamente agora mesmo para conquistar seu cupom!
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('wheel');
                        triggerServerSpin();
                      }}
                      style={{ backgroundColor: brandColor }}
                      className="w-full h-14 rounded-2xl text-white font-display font-bold text-base shadow-lg hover:brightness-110 transition-all cursor-pointer"
                    >
                      GIRAR NOVAMENTE AGORA
                    </button>
                  </div>
                ) : spinOutcome.result === 'no_prize' ? (
                  <div className="text-center space-y-4 py-2">
                    <h2 className="text-xl font-display font-bold text-white">
                      Não foi desta vez!
                    </h2>
                    <p className="text-sm text-slate-300">
                      Mas você ainda pode pedir diretamente pelo nosso canal oficial com atendimento prioritário:
                    </p>
                    <a
                      href={getDestinationHref()}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleDestinationClick}
                      className="w-full h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>ACESSAR CANAL OFICIAL</span>
                    </a>
                  </div>
                ) : (
                  <>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-emerald-400 tracking-wide mb-1">
                        BENEFÍCIO DESBLOQUEADO COM SUCESSO
                      </p>
                      <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-white">
                        🎉 VOCÊ GANHOU {spinOutcome.prize?.name?.toUpperCase()}!
                      </h2>
                      {spinOutcome.prize?.description && (
                        <p className="text-xs sm:text-sm text-slate-300 mt-1">
                          {spinOutcome.prize.description}
                        </p>
                      )}
                    </div>

                    {/* Coupon Ticket Box */}
                    {spinOutcome.coupon && (
                      <div className="bg-slate-950 border-2 border-dashed border-indigo-500/60 rounded-2xl p-4 text-center space-y-2">
                        <span className="text-[11px] font-medium text-slate-400 block">
                          SEU CUPOM EXCLUSIVO
                        </span>
                        <div className="flex items-center justify-center gap-3">
                          <span className="text-2xl font-mono font-bold tracking-wider text-white tabular-nums">
                            {spinOutcome.coupon.code}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyCoupon}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            {copiedCode ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400">Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-1">
                          <span>
                            Válido até{' '}
                            <strong className="text-slate-200 tabular-nums">
                              {new Date(spinOutcome.coupon.expiresAt).toLocaleDateString('pt-BR')}
                            </strong>
                          </span>
                          {spinOutcome.coupon.minimumPurchaseValue > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>
                                Pedido mín.{' '}
                                <strong className="text-slate-200 tabular-nums">
                                  R$ {Number(spinOutcome.coupon.minimumPurchaseValue).toFixed(2)}
                                </strong>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Primary Own-Channel Conversion CTA */}
                    <div className="space-y-2.5">
                      <a
                        href={getDestinationHref()}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleDestinationClick}
                        className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-extrabold text-base shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2.5 transition-all active:scale-[0.99]"
                      >
                        {campaign.destinationType === 'whatsapp' ? (
                          <>
                            <MessageCircle className="w-5 h-5" />
                            <span>PEDIR PELO WHATSAPP COM DESCONTO</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-5 h-5" />
                            <span>COMPRAR COM DESCONTO NO SITE</span>
                          </>
                        )}
                        <ExternalLink className="w-4 h-4 opacity-80" />
                      </a>

                      {campaign.destinationType === 'whatsapp' && (
                        <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 text-left">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-emerald-400">
                              Mensagem automática para o WhatsApp da loja:
                            </span>
                            {clickedDestination && (
                              <span className="text-[11px] text-emerald-300 font-medium">
                                ✓ Clique registrado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 font-mono bg-slate-900 p-2 rounded-lg border border-slate-800">
                            "{whatsappAutoMessage}"
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="relative z-10 text-center py-4 px-4 border-t border-white/5 text-xs text-slate-500">
        <span>
          Tecnologia Desenvolvida por ·{' '}
          <a
            href={`https://wa.me/5511964245880?text=${encodeURIComponent(
              'Olá Quero fazer uma roleta de prêmios para o meu negócio'
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-slate-300 hover:text-white underline-offset-2 hover:underline transition-colors"
          >
            <strong>Alfa Digital</strong>
          </a>
        </span>
      </footer>

      {/* LGPD Privacy & Terms Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-display font-bold text-white">
                Política de Privacidade & Termos de Uso (LGPD)
              </h3>
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-1">
              <p>
                <strong>1. Finalidade da Coleta:</strong> Seus dados básicos (Nome, WhatsApp e, quando informado, E-mail) são coletados exclusivamente em nome de <strong>{company.name}</strong> para identificar sua participação na roleta promocional, evitar duplicidade de giros e emitir seu cupom único de benefício.
              </p>
              <p>
                <strong>2. Consentimento de Marketing Separado:</strong> O envio de promoções futuras por WhatsApp ou E-mail ocorre apenas se você marcar voluntariamente a opção de consentimento de marketing. Sua participação na roleta nunca é condicionada ao aceite de marketing.
              </p>
              <p>
                <strong>3. Direitos do Titular (LGPD):</strong> Você pode solicitar a qualquer momento a confirmação, exportação ou exclusão definitiva dos seus dados junto a {company.name}.
              </p>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowPrivacyModal(false)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white cursor-pointer"
              >
                Entendi e Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
