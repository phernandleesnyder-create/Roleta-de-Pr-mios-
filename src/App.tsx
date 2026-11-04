import React, { useEffect, useState, useCallback } from 'react';
import { signInWithPopup } from 'firebase/auth';
import {
  LayoutDashboard,
  Megaphone,
  Users,
  Disc,
  Gift,
  Ticket,
  QrCode,
  BarChart3,
  Settings,
  LogOut,
  Sparkles,
  Menu,
  X,
  ArrowRight,
  Lock,
  Mail,
  User,
  Building2,
  Zap,
  FileText,
  MessageCircle,
} from 'lucide-react';
import { auth, googleAuthProvider } from './lib/firebase.ts';
import { api, setAuthToken, getAuthToken } from './lib/api.ts';
import { WorkspaceData } from './types/alfa.ts';
import { PublicCampaignExperience } from './components/PublicCampaignExperience.tsx';
import { OnboardingWizard } from './components/OnboardingWizard.tsx';
import {
  DashboardView,
  CampaignsView,
  RouletteAndPrizesView,
  CouponsView,
  QrCodesStudioView,
  AnalyticsView,
  SettingsView,
} from './components/MerchantViews.tsx';
import {
  CrmCustomersFullView,
  AutomationsModuleView,
  TemplatesModuleView,
  MessagesHistoryModuleView,
} from './components/CrmAndWhatsappViews.tsx';

type NavTab =
  | 'dashboard'
  | 'customers'
  | 'automations'
  | 'templates'
  | 'messages'
  | 'campaigns'
  | 'roulette'
  | 'prizes'
  | 'coupons'
  | 'qr-codes'
  | 'analytics'
  | 'settings';

export default function App() {
  // Check if current URL is a public campaign route: /c/:campaignSlug or /c/:companySlug/:campaignSlug
  const [publicRoute, setPublicRoute] = useState<{
    companySlug: string;
    campaignSlug: string;
    qr?: string;
  } | null>(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const twoPartMatch = path.match(/^\/c\/([^/]+)\/([^/]+)/);
    if (twoPartMatch) {
      return {
        companySlug: decodeURIComponent(twoPartMatch[1]),
        campaignSlug: decodeURIComponent(twoPartMatch[2]),
        qr: params.get('qr') || undefined,
      };
    }
    const onePartMatch = path.match(/^\/c\/([^/]+)/);
    if (onePartMatch) {
      return {
        companySlug: 'default',
        campaignSlug: decodeURIComponent(onePartMatch[1]),
        qr: params.get('qr') || undefined,
      };
    }
    return null;
  });

  // Auth & Workspace State
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'recover' | 'authenticated'>(
    'authenticated'
  );
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [recoverSuccess, setRecoverSuccess] = useState(false);

  // Login / Register form state
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Navigation & Onboarding State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const loadWorkspace = useCallback(async () => {
    try {
      setLoadingWorkspace(true);
      if (!getAuthToken()) {
        // Initialize full demo session on first access so Pizzaria Demo is immediately ready
        const demoRes = await api.startDemoSession();
        setAuthToken(demoRes.token);
      }
      const data = await api.getWorkspace();
      setWorkspace(data);
      setAuthMode('authenticated');
    } catch (err: any) {
      console.error('Failed to load workspace:', err);
      setAuthMode('login');
    } finally {
      setLoadingWorkspace(false);
    }
  }, []);

  useEffect(() => {
    if (!publicRoute) {
      loadWorkspace();
    }
  }, [publicRoute, loadWorkspace]);

  const handleOpenPublicCampaign = (
    companySlug: string,
    campaignSlug: string,
    qrCode?: string
  ) => {
    const newUrl = `/c/${campaignSlug}${qrCode ? `?qr=${qrCode}` : ''}`;
    window.history.pushState({}, '', newUrl);
    setPublicRoute({ companySlug, campaignSlug, qr: qrCode });
  };

  const handleReturnToAdmin = () => {
    window.history.pushState({}, '', `/${activeTab}`);
    setPublicRoute(null);
    loadWorkspace();
  };

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setShowOnboarding(false);
    setMobileMenuOpen(false);
    window.history.pushState({}, '', `/${tab}`);
  };

  const handleLogout = () => {
    setAuthToken(null);
    setWorkspace(null);
    setAuthMode('login');
    setAuthError(null);
    window.history.pushState({}, '', '/login');
  };

  const handleDemoQuickAccess = async () => {
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      const demo = await api.startDemoSession();
      setAuthToken(demo.token);
      const data = await api.getWorkspace();
      setWorkspace(data);
      setShowOnboarding(false);
      setAuthMode('authenticated');
      window.history.pushState({}, '', '/dashboard');
    } catch (err: any) {
      setAuthError(err.message || 'Falha ao carregar demonstração.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthSubmitting(true);
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      setAuthToken(idToken);
      await api.syncGoogleUser(companyNameInput || undefined);
      const data = await api.getWorkspace();
      setWorkspace(data);
      if (!data.company.onboardingCompleted) {
        setShowOnboarding(true);
      }
      setAuthMode('authenticated');
      window.history.pushState({}, '', '/dashboard');
    } catch (err: any) {
      setAuthError(
        err.message || 'Não foi possível autenticar com o Google. Tente usar e-mail ou conta Demo.'
      );
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (authMode === 'recover') {
      setRecoverSuccess(true);
      return;
    }

    setAuthSubmitting(true);
    try {
      if (authMode === 'register') {
        const res = await api.register({
          name: nameInput.trim(),
          email: emailInput.trim(),
          password: passwordInput,
          companyName: companyNameInput.trim(),
        });
        setAuthToken(res.token);
        const data = await api.getWorkspace();
        setWorkspace(data);
        setShowOnboarding(true);
        setAuthMode('authenticated');
        window.history.pushState({}, '', '/dashboard');
      } else {
        const res = await api.login({
          email: emailInput.trim(),
          password: passwordInput,
        });
        setAuthToken(res.token);
        const data = await api.getWorkspace();
        setWorkspace(data);
        setShowOnboarding(!data.company.onboardingCompleted);
        setAuthMode('authenticated');
        window.history.pushState({}, '', '/dashboard');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Erro na autenticação.');
    } finally {
      setAuthSubmitting(false);
    }
  };

  // ==========================================================================
  // 1. PUBLIC MOBILE-FIRST CUSTOMER EXPERIENCE (/c/:campaignSlug)
  // ==========================================================================
  if (publicRoute) {
    return (
      <PublicCampaignExperience
        companySlug={publicRoute.companySlug}
        campaignSlug={publicRoute.campaignSlug}
        qrParam={publicRoute.qr}
        onBackToAdmin={handleReturnToAdmin}
      />
    );
  }

  // ==========================================================================
  // 2. AUTHENTICATION VIEWS (/login, /register, /recover)
  // ==========================================================================
  if (authMode !== 'authenticated') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl space-y-6">
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-indigo-600 text-white font-display font-extrabold text-lg mb-1">
              AL
            </div>
            <h1 className="text-2xl font-display font-extrabold tracking-tight text-white">
              Alfa Link
            </h1>
            <p className="text-xs text-slate-400">
              Plataforma de CRM, pós-venda, automação de WhatsApp e migração para o canal próprio
            </p>
          </div>

          {/* 1-Click Demo Button */}
          <button
            type="button"
            disabled={authSubmitting}
            onClick={handleDemoQuickAccess}
            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Acessar Demonstração Completa</span>
          </button>

          <div className="relative flex py-1 items-center">
            <div className="grow border-t border-slate-800" />
            <span className="shrink mx-3 text-[11px] text-slate-500">
              ou acesse sua conta empresarial
            </span>
            <div className="grow border-t border-slate-800" />
          </div>

          <form onSubmit={handleEmailAuth} className="space-y-3.5 text-xs">
            {authMode === 'register' && (
              <>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Seu Nome Completo *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Ex: Rodrigo Almeida"
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Nome da Sua Empresa *
                  </label>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={companyNameInput}
                      onChange={(e) => setCompanyNameInput(e.target.value)}
                      placeholder="Ex: Pizzaria Bella Massa"
                      className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-950 border border-slate-800 text-white"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block font-semibold text-slate-300 mb-1">E-mail Corporativo *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="demo@alfalink.com.br"
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-950 border border-slate-800 text-white"
                />
              </div>
            </div>

            {authMode !== 'recover' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-300">Senha *</label>
                  {authMode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('recover');
                        setRecoverSuccess(false);
                      }}
                      className="text-[11px] text-indigo-400 hover:underline cursor-pointer"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-10 pl-9 pr-3 rounded-xl bg-slate-950 border border-slate-800 text-white"
                  />
                </div>
              </div>
            )}

            {authError && (
              <div className="p-3 rounded-xl bg-rose-950/90 border border-rose-800 text-rose-200 font-medium">
                {authError}
              </div>
            )}

            {recoverSuccess && authMode === 'recover' && (
              <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-800 text-emerald-200 font-medium">
                Instruções de recuperação enviadas para {emailInput}.
              </div>
            )}

            <button
              type="submit"
              disabled={authSubmitting}
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>
                {authMode === 'login'
                  ? 'Entrar no Painel'
                  : authMode === 'register'
                  ? 'Criar Conta e Iniciar Onboarding'
                  : 'Enviar Link de Recuperação'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={authSubmitting}
            className="w-full h-10 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-200 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Continuar com Google</span>
          </button>

          <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
            {authMode === 'login' ? (
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className="hover:text-white underline cursor-pointer"
              >
                Ainda não tem conta? Cadastre sua empresa grátis
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="hover:text-white underline cursor-pointer"
              >
                Já possui conta? Fazer login
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // 3. MERCHANT SAAS SHELL (DARK SIDEBAR + LIGHT CONTENT AREA)
  // ==========================================================================

  if (loadingWorkspace || !workspace) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-600">
          Carregando ambiente empresarial Alfa Link...
        </p>
      </div>
    );
  }

  const navItems: Array<{ id: NavTab; label: string; icon: any; badge?: string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'CRM', icon: Users, badge: String(workspace.customers.length) },
    { id: 'automations', label: 'Automações', icon: Zap },
    { id: 'templates', label: 'Templates de Mensagens', icon: FileText },
    { id: 'messages', label: 'Mensagens', icon: MessageCircle },
    { id: 'campaigns', label: 'Campanhas', icon: Megaphone },
    { id: 'roulette', label: 'Roletas', icon: Disc },
    { id: 'prizes', label: 'Prêmios', icon: Gift },
    { id: 'coupons', label: 'Cupons', icon: Ticket },
    { id: 'qr-codes', label: 'QR Codes & Cartão', icon: QrCode },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  const primaryCampaign = workspace.campaigns[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Dark High-Contrast Sidebar (Desktop) */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 text-slate-300 shrink-0 border-r border-slate-800 no-print">
        {/* Brand Wordmark */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-display font-extrabold text-sm flex items-center justify-center">
              AL
            </div>
            <span className="font-display font-extrabold text-base text-white tracking-tight whitespace-nowrap">
              Alfa Link
            </span>
          </div>
        </div>

        {/* Active Tenant / Company Selector Card */}
        <div className="p-4 border-b border-slate-800/80">
          <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700/60">
            <p className="text-[11px] text-slate-400 font-medium">Empresa Ativa</p>
            <p className="text-xs font-bold text-white truncate mt-0.5">
              {workspace.company.name}
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-indigo-400 font-mono">
                {workspace.currentUser.role}
              </span>
              <span
                className={`text-[10px] font-semibold ${
                  workspace.whatsappConnection?.connectionStatus === 'connected'
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {workspace.whatsappConnection?.connectionStatus === 'connected'
                  ? '● WhatsApp Ativo'
                  : '○ WhatsApp Pendente'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id && !showOnboarding;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                      isActive ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <button
            type="button"
            onClick={() => setShowOnboarding(true)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Onboarding (8 Passos)</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-3 py-2 rounded-xl hover:bg-slate-800 text-xs font-medium text-slate-400 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair / Trocar Conta</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative z-10 w-64 bg-slate-900 text-slate-300 flex flex-col h-full">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
              <span className="font-display font-extrabold text-base text-white">
                Alfa Link
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id && !showOnboarding;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                      isActive ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract (Breadcrumb Left — 1 Primary Action Right) */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-8 sticky top-0 z-20 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-xs text-slate-500 truncate">
              <span className="font-semibold text-slate-900">{workspace.company.name}</span>
              <span className="mx-2">/</span>
              <span className="capitalize">
                {showOnboarding
                  ? 'Onboarding Guiado'
                  : navItems.find((n) => n.id === activeTab)?.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {primaryCampaign && (
              <button
                type="button"
                onClick={() =>
                  handleOpenPublicCampaign(workspace.company.slug, primaryCampaign.slug)
                }
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Abrir Roleta Pública Mobile
              </button>
            )}
          </div>
        </header>

        {/* Active View Content */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {showOnboarding ? (
            <OnboardingWizard
              workspace={workspace}
              onComplete={async () => {
                await loadWorkspace();
                setShowOnboarding(false);
              }}
              onOpenPublicCampaign={handleOpenPublicCampaign}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  workspace={workspace}
                  onRefresh={loadWorkspace}
                  onOpenPublicCampaign={handleOpenPublicCampaign}
                  onNavigateTab={(t) => handleSelectTab(t as NavTab)}
                />
              )}
              {activeTab === 'customers' && (
                <CrmCustomersFullView
                  workspace={workspace}
                  onRefresh={loadWorkspace}
                  onNavigateTab={(t) => handleSelectTab(t as NavTab)}
                />
              )}
              {activeTab === 'automations' && (
                <AutomationsModuleView
                  workspace={workspace}
                  onRefresh={loadWorkspace}
                  onNavigateTab={(t) => handleSelectTab(t as NavTab)}
                />
              )}
              {activeTab === 'templates' && (
                <TemplatesModuleView
                  workspace={workspace}
                  onRefresh={loadWorkspace}
                  onNavigateTab={(t) => handleSelectTab(t as NavTab)}
                />
              )}
              {activeTab === 'messages' && (
                <MessagesHistoryModuleView
                  workspace={workspace}
                  onRefresh={loadWorkspace}
                  onNavigateTab={(t) => handleSelectTab(t as NavTab)}
                />
              )}
              {activeTab === 'campaigns' && (
                <CampaignsView
                  workspace={workspace}
                  onRefresh={loadWorkspace}
                  onOpenPublicCampaign={handleOpenPublicCampaign}
                  onNavigateTab={(t) => handleSelectTab(t as NavTab)}
                />
              )}
              {(activeTab === 'roulette' || activeTab === 'prizes') && (
                <RouletteAndPrizesView
                  workspace={workspace}
                  onRefresh={loadWorkspace}
                  onOpenPublicCampaign={handleOpenPublicCampaign}
                  onNavigateTab={(t) => handleSelectTab(t as NavTab)}
                />
              )}
              {activeTab === 'coupons' && (
                <CouponsView
                  workspace={workspace}
                  onRefresh={loadWorkspace}
                  onOpenPublicCampaign={handleOpenPublicCampaign}
                  onNavigateTab={(t) => handleSelectTab(t as NavTab)}
                />
              )}
              {activeTab === 'qr-codes' && (
                <QrCodesStudioView
                  workspace={workspace}
                  onRefresh={loadWorkspace}
                  onOpenPublicCampaign={handleOpenPublicCampaign}
                  onNavigateTab={(t) => handleSelectTab(t as NavTab)}
                />
              )}
              {activeTab === 'analytics' && (
                <AnalyticsView
                  workspace={workspace}
                  onRefresh={loadWorkspace}
                  onOpenPublicCampaign={handleOpenPublicCampaign}
                  onNavigateTab={(t) => handleSelectTab(t as NavTab)}
                />
              )}
              {activeTab === 'settings' && (
                <SettingsView
                  workspace={workspace}
                  onRefresh={loadWorkspace}
                  onOpenPublicCampaign={handleOpenPublicCampaign}
                  onNavigateTab={(t) => handleSelectTab(t as NavTab)}
                  onLaunchOnboarding={() => setShowOnboarding(true)}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
