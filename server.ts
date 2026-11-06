import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import { requireAuth, AuthRequest } from './src/middleware/auth.ts';
import {
  verifyMetaWebhookSignature,
  verifyMetaWebhookGetChallenge,
} from './src/middleware/metaWebhook.ts';
import {
  ensureDemoCompanyAndData,
  registerOrLoginUser,
  getProfileByEmail,
  getTenantWorkspaceData,
  updateCompanySettings,
  createCampaignForCompany,
  updateCampaignForCompany,
  createOrUpdatePrizeForCompany,
  deletePrizeForCompany,
  redeemCouponForCompany,
  updateQrCodeCardSettings,
  addTeamMemberForCompany,
  deleteCustomerLgpd,
  getPublicCampaignDetails,
  executeServerSideSpin,
  recordPublicDestinationClick,
  processScheduledMessagesQueue,
  connectWhatsappBusinessForCompany,
  disconnectWhatsappBusinessForCompany,
  saveAutomationForCompany,
  deleteAutomationForCompany,
  triggerTestAutomationForCompany,
  cancelScheduledMessageForCompany,
  dispatchScheduledMessageNowForCompany,
  saveMessageTemplateForCompany,
  deleteMessageTemplateForCompany,
  updateCustomerConsentAndStatusForCompany,
  processMetaWhatsappWebhookPayload,
} from './src/db/repository.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createSessionToken(payload: { uid: string; email: string; name: string }): string {
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64');
  return `alfa_session:${encoded}`;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(
    express.json({
      limit: '2mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = Buffer.from(buf);
      },
    })
  );

  // ==========================================================================
  // PERSISTENT SERVER-SIDE SCHEDULER ENGINE (RUNS INDEPENDENT OF BROWSER)
  // ==========================================================================
  setInterval(() => {
    processScheduledMessagesQueue().catch((err) => {
      console.error('Background scheduler warning:', err);
    });
  }, 15000);

  // ==========================================================================
  // AUTHENTICATION & DEMO INITIALIZATION ROUTES
  // ==========================================================================

  app.post('/api/auth/demo', async (_req, res) => {
    try {
      const { company, profile } = await ensureDemoCompanyAndData();
      const token = createSessionToken({
        uid: profile.authUserId,
        email: profile.email,
        name: profile.name,
      });
      res.json({ token, profile, company });
    } catch (error: any) {
      console.error('Error initializing demo session:', error);
      res.status(500).json({ error: error.message || 'Falha ao iniciar sessão de demonstração' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, password, companyName } = req.body || {};
      const cleanEmail = String(email || '').toLowerCase().trim();
      const cleanName = String(name || '').trim() || cleanEmail.split('@')[0] || 'Empresário';
      const cleanPassword = String(password || '').trim();

      if (!cleanEmail || !cleanPassword) {
        return res.status(400).json({ error: 'Preencha nome, e-mail e senha.' });
      }

      const existing = await getProfileByEmail(cleanEmail);
      if (existing) {
        const { company } = await registerOrLoginUser({
          authUserId: existing.authUserId,
          email: existing.email,
          name: existing.name,
        });
        const token = createSessionToken({
          uid: existing.authUserId,
          email: existing.email,
          name: existing.name,
        });
        return res.json({ token, profile: existing, company });
      }

      const authUserId = `user-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const { profile, company } = await registerOrLoginUser({
        authUserId,
        email: cleanEmail,
        name: cleanName,
        companyName: companyName ? String(companyName).trim() : `Empresa de ${cleanName}`,
        passwordHash: cleanPassword,
      });

      const token = createSessionToken({
        uid: profile.authUserId,
        email: profile.email,
        name: profile.name,
      });

      res.json({ token, profile, company });
    } catch (error: any) {
      console.error('Error registering user:', error);
      res.status(500).json({ error: error.message || 'Falha ao criar conta.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body || {};
      const cleanEmail = String(email || '').toLowerCase().trim();
      const cleanPassword = String(password || '').trim();

      if (!cleanEmail || !cleanPassword) {
        return res.status(400).json({ error: 'Informe seu e-mail e senha.' });
      }

      if (
        cleanEmail === 'demo@alfalink.com.br' ||
        cleanEmail === 'admin@alfalink.com.br' ||
        cleanEmail === 'contato@pizzariademo.com.br'
      ) {
        const { company, profile } = await ensureDemoCompanyAndData();
        const token = createSessionToken({
          uid: profile.authUserId,
          email: profile.email,
          name: profile.name,
        });
        return res.json({ token, profile, company });
      }

      const profile = await getProfileByEmail(cleanEmail);

      // If user typed demo123 with an email that isn't registered separately, open the main Alfa Digital workspace
      if (!profile && cleanPassword.toLowerCase() === 'demo123') {
        const { company, profile: demoProfile } = await ensureDemoCompanyAndData();
        const token = createSessionToken({
          uid: demoProfile.authUserId,
          email: demoProfile.email,
          name: demoProfile.name,
        });
        return res.json({ token, profile: demoProfile, company });
      }

      if (!profile) {
        return res.status(401).json({
          error: 'E-mail não encontrado. Use demo@alfalink.com.br (senha: demo123) ou clique em Criar Conta.',
        });
      }

      const storedPass = (profile.passwordHash || '').trim();
      if (
        storedPass &&
        storedPass !== cleanPassword &&
        cleanPassword.toLowerCase() !== 'demo123'
      ) {
        return res.status(401).json({ error: 'E-mail ou senha inválidos.' });
      }

      const { company } = await registerOrLoginUser({
        authUserId: profile.authUserId,
        email: profile.email,
        name: profile.name,
      });

      const token = createSessionToken({
        uid: profile.authUserId,
        email: profile.email,
        name: profile.name,
      });

      res.json({ token, profile, company });
    } catch (error: any) {
      console.error('Error logging in user:', error);
      res.status(500).json({ error: error.message || 'Falha ao realizar login.' });
    }
  });

  app.post('/api/auth/google-sync', requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }
      const { companyName } = req.body || {};
      const { profile, company } = await registerOrLoginUser({
        authUserId: req.user.uid,
        email: req.user.email,
        name: req.user.name || 'Empresário',
        companyName,
      });
      const token = createSessionToken({
        uid: profile.authUserId,
        email: profile.email,
        name: profile.name,
      });
      res.json({ token, profile, company });
    } catch (error: any) {
      console.error('Error syncing Google user:', error);
      res.status(500).json({ error: error.message || 'Falha ao sincronizar conta Google.' });
    }
  });

  // ==========================================================================
  // PROTECTED MULTI-TENANT SAAS ROUTES (ISOLATED BY COMPANY_ID)
  // ==========================================================================

  app.get('/api/workspace', requireAuth, async (req: AuthRequest, res) => {
    try {
      let companyId = req.user?.companyId;
      if (!companyId && req.user) {
        const synced = await registerOrLoginUser({
          authUserId: req.user.uid,
          email: req.user.email,
          name: req.user.name || 'Empresário',
        });
        companyId = synced.company.id;
      }
      if (!companyId) {
        return res.status(403).json({ error: 'Empresa não vinculada ao usuário.' });
      }

      const workspace = await getTenantWorkspaceData(companyId);
      res.json({
        ...workspace,
        currentUser: {
          uid: req.user?.uid,
          email: req.user?.email,
          name: req.user?.name,
          role: req.user?.role || 'OWNER',
        },
      });
    } catch (error: any) {
      console.error('Failed to fetch workspace data:', error);
      res.status(500).json({ error: error.message || 'Falha ao carregar painel.' });
    }
  });

  app.put('/api/company', requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(403).json({ error: 'Acesso negado.' });
      if (req.user?.role === 'STAFF') {
        return res.status(403).json({ error: 'Apenas OWNER ou ADMIN podem alterar dados da empresa.' });
      }
      const updated = await updateCompanySettings(companyId, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Failed to update company:', error);
      res.status(500).json({ error: error.message || 'Falha ao atualizar empresa.' });
    }
  });

  app.post('/api/campaigns', requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(403).json({ error: 'Acesso negado.' });
      if (req.user?.role === 'STAFF') {
        return res.status(403).json({ error: 'Permissão insuficiente para criar campanhas.' });
      }
      const created = await createCampaignForCompany(companyId, req.body);
      res.json(created);
    } catch (error: any) {
      console.error('Failed to create campaign:', error);
      res.status(500).json({ error: error.message || 'Falha ao criar campanha.' });
    }
  });

  app.put('/api/campaigns/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(403).json({ error: 'Acesso negado.' });
      if (req.user?.role === 'STAFF') {
        return res.status(403).json({ error: 'Permissão insuficiente para editar campanhas.' });
      }
      const campaignId = Number(req.params.id);
      const updated = await updateCampaignForCompany(companyId, campaignId, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Failed to update campaign:', error);
      res.status(500).json({ error: error.message || 'Falha ao atualizar campanha.' });
    }
  });

  app.post('/api/prizes', requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(403).json({ error: 'Acesso negado.' });
      if (req.user?.role === 'STAFF') {
        return res.status(403).json({ error: 'Permissão insuficiente para configurar prêmios.' });
      }
      const prize = await createOrUpdatePrizeForCompany(companyId, req.body);
      res.json(prize);
    } catch (error: any) {
      console.error('Failed to save prize:', error);
      res.status(500).json({ error: error.message || 'Falha ao salvar prêmio.' });
    }
  });

  app.delete('/api/prizes/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(403).json({ error: 'Acesso negado.' });
      if (req.user?.role === 'STAFF') {
        return res.status(403).json({ error: 'Permissão insuficiente para excluir prêmios.' });
      }
      const result = await deletePrizeForCompany(companyId, Number(req.params.id));
      res.json(result);
    } catch (error: any) {
      console.error('Failed to delete prize:', error);
      res.status(500).json({ error: error.message || 'Falha ao excluir prêmio.' });
    }
  });

  app.post('/api/coupons/redeem', requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(403).json({ error: 'Acesso negado.' });
      const result = await redeemCouponForCompany(companyId, req.body);
      res.json(result);
    } catch (error: any) {
      console.error('Failed to redeem coupon:', error);
      res.status(400).json({ error: error.message || 'Falha ao validar cupom.' });
    }
  });

  app.put('/api/qr-codes/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(403).json({ error: 'Acesso negado.' });
      const updated = await updateQrCodeCardSettings(companyId, Number(req.params.id), req.body);
      res.json(updated);
    } catch (error: any) {
      console.error('Failed to update QR card settings:', error);
      res.status(500).json({ error: error.message || 'Falha ao salvar cartão impresso.' });
    }
  });

  app.post('/api/team', requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(403).json({ error: 'Acesso negado.' });
      if (req.user?.role !== 'OWNER') {
        return res.status(403).json({ error: 'Apenas o OWNER pode gerenciar membros da equipe.' });
      }
      const member = await addTeamMemberForCompany(companyId, req.body);
      res.json(member);
    } catch (error: any) {
      console.error('Failed to add team member:', error);
      res.status(500).json({ error: error.message || 'Falha ao adicionar membro.' });
    }
  });

  app.delete('/api/customers/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(403).json({ error: 'Acesso negado.' });
      if (req.user?.role === 'STAFF') {
        return res.status(403).json({ error: 'Permissão insuficiente.' });
      }
      const result = await deleteCustomerLgpd(companyId, Number(req.params.id));
      res.json(result);
    } catch (error: any) {
      console.error('Failed to delete customer:', error);
      res.status(500).json({ error: error.message || 'Falha ao excluir cliente.' });
    }
  });

  // ==========================================================================
  // ALFA LINK 2.0 — WHATSAPP BUSINESS, AUTOMATIONS, TEMPLATES, SCHEDULER & LGPD
  // ==========================================================================

  app.post('/api/whatsapp/connect', requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(403).json({ error: 'Acesso negado.' });
      if (req.user?.role === 'STAFF') {
        return res.status(403).json({ error: 'Apenas OWNER ou ADMIN podem conectar o WhatsApp Business.' });
      }
      const result = await connectWhatsappBusinessForCompany(companyId, req.body);
      res.json(result);
    } catch (error: any) {
      console.error('Failed to connect WhatsApp Business:', error);
      res.status(500).json({ error: error.message || 'Falha ao conectar WhatsApp Business.' });
    }
  });

  app.post('/api/whatsapp/disconnect', requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(403).json({ error: 'Acesso negado.' });
      if (req.user?.role === 'STAFF') {
        return res.status(403).json({ error: 'Permissão insuficiente.' });
      }
      const result = await disconnectWhatsappBusinessForCompany(companyId);
      res.json(result);
    } catch (error: any) {
      console.error('Failed to disconnect WhatsApp Business:', error);
      res.status(500).json({ error: error.message || 'Falha ao desconectar WhatsApp Business.' });
    }
  });

  app.post('/api/automations', requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(403).json({ error: 'Acesso negado.' });
      if (req.user?.role === 'STAFF') {
        return res.status(403).json({ error: 'Permissão insuficiente.' });
      }
      const saved = await saveAutomationForCompany(companyId, req.body);
      res.json(saved);
    } catch (error: any) {
      console.error('Failed to save automation:', error);
      res.status(500).json({ error: error.message || 'Falha ao salvar automação.' });
    }
  });

  app.delete('/api/automations/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(403).json({ error: 'Acesso negado.' });
      if (req.user?.role === 'STAFF') {
        return res.status(403).json({ error: 'Permissão insuficiente.' });
      }
      const deleted = await deleteAutomationForCompany(companyId, Number(req.params.id));
      res.json(deleted);
    } catch (error: any) {
      console.error('Failed to delete automation:', error);
      res.status(500).json({ error: error.message || 'Falha ao excluir automação.' });
    }
  });

  app.post('/api/automations/:id/test', requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(403).json({ error: 'Acesso negado.' });
      const customerId = req.body?.customerId ? Number(req.body.customerId) : undefined;
      const task = await triggerTestAutomationForCompany(
        companyId,
        Number(req.params.id),
        customerId
      );
      res.json(task);
    } catch (error: any) {
      console.error('Failed to trigger test automation:', error);
      res.status(400).json({ error: error.message || 'Falha ao agendar teste.' });
    }
  });

  app.post('/api/scheduled-messages/:id/cancel', requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(403).json({ error: 'Acesso negado.' });
      const result = await cancelScheduledMessageForCompany(companyId, Number(req.params.id));
      res.json(result);
    } catch (error: any) {
      console.error('Failed to cancel scheduled message:', error);
      res.status(500).json({ error: error.message || 'Falha ao cancelar agendamento.' });
    }
  });

  app.post('/api/scheduled-messages/:id/dispatch-now', requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(403).json({ error: 'Acesso negado.' });
      const result = await dispatchScheduledMessageNowForCompany(companyId, Number(req.params.id));
      res.json(result);
    } catch (error: any) {
      console.error('Failed to dispatch scheduled message:', error);
      res.status(500).json({ error: error.message || 'Falha ao executar agendamento.' });
    }
  });

  app.post('/api/templates', requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(403).json({ error: 'Acesso negado.' });
      if (req.user?.role === 'STAFF') {
        return res.status(403).json({ error: 'Permissão insuficiente.' });
      }
      const saved = await saveMessageTemplateForCompany(companyId, req.body);
      res.json(saved);
    } catch (error: any) {
      console.error('Failed to save template:', error);
      res.status(500).json({ error: error.message || 'Falha ao salvar template.' });
    }
  });

  app.delete('/api/templates/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(403).json({ error: 'Acesso negado.' });
      if (req.user?.role === 'STAFF') {
        return res.status(403).json({ error: 'Permissão insuficiente.' });
      }
      const result = await deleteMessageTemplateForCompany(companyId, Number(req.params.id));
      res.json(result);
    } catch (error: any) {
      console.error('Failed to delete template:', error);
      res.status(500).json({ error: error.message || 'Falha ao remover template.' });
    }
  });

  app.put('/api/customers/:id/consent', requireAuth, async (req: AuthRequest, res) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) return res.status(403).json({ error: 'Acesso negado.' });
      const updated = await updateCustomerConsentAndStatusForCompany(
        companyId,
        Number(req.params.id),
        req.body
      );
      res.json(updated);
    } catch (error: any) {
      console.error('Failed to update customer consent:', error);
      res.status(500).json({ error: error.message || 'Falha ao atualizar consentimento LGPD.' });
    }
  });

  // ==========================================================================
  // OFFICIAL META WHATSAPP CLOUD API WEBHOOK ENDPOINTS
  // ==========================================================================

  app.get('/api/webhooks/whatsapp', (req, res) => {
    const verification = verifyMetaWebhookGetChallenge(
      {
        mode: req.query['hub.mode'],
        verifyToken: req.query['hub.verify_token'],
        challenge: req.query['hub.challenge'],
      },
      process.env.META_WEBHOOK_VERIFY_TOKEN
    );

    if (!verification.valid) {
      return res.status(verification.statusCode).json({ error: verification.error });
    }
    return res.status(200).send(verification.challenge);
  });

  app.post('/api/webhooks/whatsapp', async (req: any, res) => {
    const signatureHeader =
      typeof req.headers['x-hub-signature-256'] === 'string'
        ? req.headers['x-hub-signature-256']
        : undefined;

    const sigCheck = verifyMetaWebhookSignature(
      req.rawBody,
      signatureHeader,
      process.env.META_APP_SECRET
    );

    if (!sigCheck.valid) {
      return res.status(sigCheck.statusCode).json({ error: sigCheck.error });
    }

    try {
      const result = await processMetaWhatsappWebhookPayload(req.body);
      return res.status(200).json({ received: true, ...result });
    } catch (error: any) {
      console.error('Webhook processing error:', error);
      return res.status(500).json({ error: 'Falha ao processar webhook.' });
    }
  });

  // ==========================================================================
  // PUBLIC CUSTOMER EXPERIENCE & SERVER-SIDE ROULETTE ENDPOINTS
  // ==========================================================================

  app.get('/api/public/c/:companySlug/:campaignSlug', async (req, res) => {
    try {
      const { companySlug, campaignSlug } = req.params;
      const qr = typeof req.query.qr === 'string' ? req.query.qr : undefined;
      const details = await getPublicCampaignDetails(companySlug, campaignSlug, qr);
      if (!details) {
        return res.status(404).json({ error: 'Campanha não encontrada.' });
      }
      res.json(details);
    } catch (error: any) {
      console.error('Error loading public campaign:', error);
      res.status(500).json({ error: error.message || 'Erro ao carregar campanha.' });
    }
  });

  app.post('/api/public/c/:companySlug/:campaignSlug/spin', async (req, res) => {
    try {
      const { companySlug, campaignSlug } = req.params;
      const { name, phone, email, marketingConsent } = req.body || {};
      if (!name || !phone) {
        return res.status(400).json({ error: 'Informe seu nome e WhatsApp para girar a roleta.' });
      }

      const spinOutcome = await executeServerSideSpin({
        companySlug,
        campaignSlug,
        name: String(name),
        phone: String(phone),
        email: email ? String(email) : '',
        marketingConsent: Boolean(marketingConsent),
      });

      res.json(spinOutcome);
    } catch (error: any) {
      console.error('Error executing server-side spin:', error);
      res.status(400).json({ error: error.message || 'Não foi possível realizar o giro.' });
    }
  });

  app.post('/api/public/destination-click', async (req, res) => {
    try {
      const { companyId, campaignId, customerId, couponCode, destinationType } = req.body || {};
      if (!companyId || !campaignId) {
        return res.status(400).json({ error: 'Parâmetros inválidos.' });
      }
      const result = await recordPublicDestinationClick({
        companyId: Number(companyId),
        campaignId: Number(campaignId),
        customerId: customerId ? Number(customerId) : undefined,
        couponCode: couponCode ? String(couponCode) : '',
        destinationType: String(destinationType || 'whatsapp'),
      });
      res.json(result);
    } catch (error: any) {
      console.error('Error recording destination click:', error);
      res.status(500).json({ error: 'Falha ao registrar redirecionamento.' });
    }
  });

  // ==========================================================================
  // VITE DEV MIDDLEWARE / STATIC ASSETS
  // ==========================================================================

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Alfa Link Server running on http://localhost:${PORT}`);
  });
}

startServer();
