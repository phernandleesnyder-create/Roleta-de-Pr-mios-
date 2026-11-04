import { eq, and, desc, asc, lte } from 'drizzle-orm';
import { db } from './index.ts';
import {
  companies,
  profiles,
  campaigns,
  customers,
  campaignCustomers,
  rouletteConfigs,
  prizes,
  spins,
  coupons,
  redemptions,
  qrCodes,
  qrScans,
  campaignEvents,
  whatsappConnections,
  messageTemplates,
  automations,
  scheduledMessages,
  messageLogs,
  customerConsents,
  automationExecutions,
} from './schema.ts';
import { normalizeMetaTemplateApprovalStatus } from '../middleware/metaWebhook.ts';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'empresa';
}

function generateCouponCode(prefix = 'ALFA'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 5; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}-${suffix}`;
}

export async function getProfileByAuthUid(authUserId: string) {
  try {
    const rows = await db
      .select()
      .from(profiles)
      .where(eq(profiles.authUserId, authUserId));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getProfileByAuthUid:', error);
    throw new Error('Falha ao consultar perfil do usuário.', { cause: error });
  }
}

export async function getProfileByEmail(email: string) {
  try {
    const rows = await db
      .select()
      .from(profiles)
      .where(eq(profiles.email, email.toLowerCase().trim()));
    return rows[0] || null;
  } catch (error) {
    console.error('Database query failed in getProfileByEmail:', error);
    throw new Error('Falha ao consultar e-mail do usuário.', { cause: error });
  }
}

export async function ensureDemoCompanyAndData() {
  try {
    const existingDemo = await db
      .select()
      .from(companies)
      .orderBy(asc(companies.id));

    if (existingDemo.length > 0) {
      const company = existingDemo[0];
      const existingProfiles = await db
        .select()
        .from(profiles)
        .where(eq(profiles.companyId, company.id));
      let demoProfile = existingProfiles[0];
      if (!demoProfile) {
        const insertedProfiles = await db
          .insert(profiles)
          .values({
            authUserId: 'demo-owner-uid',
            companyId: company.id,
            name: 'Carlos Eduardo (Pizzaria Demo)',
            email: 'demo@alfalink.com.br',
            passwordHash: 'demo123',
            role: 'OWNER',
          })
          .onConflictDoUpdate({
            target: profiles.authUserId,
            set: { companyId: company.id },
          })
          .returning();
        demoProfile = insertedProfiles[0];
      }
      return { company, profile: demoProfile };
    }

    // Create Pizzaria Demo
    const [company] = await db
      .insert(companies)
      .values({
        name: 'Pizzaria Demo',
        slug: 'pizzaria-demo',
        logoUrl: '',
        industry: 'Pizzaria / Delivery',
        phone: '11999998888',
        email: 'contato@pizzariademo.com.br',
        websiteUrl: 'https://cardapio.pizzariademo.com.br',
        whatsappUrl: '5511999998888',
        instagramUrl: '@pizzariademo',
        status: 'active',
        onboardingCompleted: true,
      })
      .onConflictDoUpdate({
        target: companies.slug,
        set: { updatedAt: new Date() },
      })
      .returning();

    const [profile] = await db
      .insert(profiles)
      .values({
        authUserId: 'demo-owner-uid',
        companyId: company.id,
        name: 'Carlos Eduardo (Pizzaria Demo)',
        email: 'demo@alfalink.com.br',
        passwordHash: 'demo123',
        role: 'OWNER',
      })
      .onConflictDoUpdate({
        target: profiles.authUserId,
        set: { companyId: company.id },
      })
      .returning();

    // Create 4 campaigns across channels
    const campaignDefs = [
      {
        name: 'Clientes iFood — Novembro',
        slug: 'clientes-ifood',
        description: 'Campanha de migração pós-pedido enviada em todas as caixas de pizza do iFood.',
        sourceChannel: 'iFood',
        primaryColor: '#EA1D2C',
        destinationType: 'whatsapp',
        destinationUrl: '5511999998888',
        landingTitle: '🎁 Você ganhou uma chance de ganhar um benefício!',
        landingSubtitle: 'Gire a roleta e descubra seu benefício exclusivo para o próximo pedido direto conosco.',
        minimumPurchaseValue: 45,
      },
      {
        name: 'Clientes Mercado Livre — Kit Forno',
        slug: 'clientes-mercado-livre',
        description: 'Cartão inserido nas entregas de massas pré-assadas e molhos artesanais via Mercado Livre.',
        sourceChannel: 'Mercado Livre',
        primaryColor: '#D97706',
        destinationType: 'whatsapp',
        destinationUrl: '5511999998888',
        landingTitle: '🎁 Presente exclusivo para sua próxima compra!',
        landingSubtitle: 'Gire a roleta e garanta seu cupom comprando direto pelo nosso WhatsApp.',
        minimumPurchaseValue: 50,
      },
      {
        name: 'Clientes Shopee — Molhos & Especiarias',
        slug: 'clientes-shopee',
        description: 'Recompra direta para compradores de temperos e azeites trufados na Shopee.',
        sourceChannel: 'Shopee',
        primaryColor: '#EA580C',
        destinationType: 'site',
        destinationUrl: 'https://cardapio.pizzariademo.com.br',
        landingTitle: '🎁 Ganhe desconto comprando em nosso site oficial!',
        landingSubtitle: 'Gire a roleta agora e destrave seu cupom exclusivo.',
        minimumPurchaseValue: 40,
      },
      {
        name: 'Clientes Salão & Retirada Balcão',
        slug: 'clientes-loja-fisica',
        description: 'Display de mesa com QR Code para clientes do salão pedirem no delivery próprio.',
        sourceChannel: 'Loja física',
        primaryColor: '#4F46E5',
        destinationType: 'whatsapp',
        destinationUrl: '5511999998888',
        landingTitle: '🍕 Gostou da nossa pizza? Gire a roleta!',
        landingSubtitle: 'Ganhe um benefício imediato para o seu próximo pedido no nosso delivery próprio.',
        minimumPurchaseValue: 45,
      },
    ];

    const createdCampaigns = [];
    for (const def of campaignDefs) {
      const [camp] = await db
        .insert(campaigns)
        .values({
          companyId: company.id,
          name: def.name,
          slug: def.slug,
          description: def.description,
          sourceChannel: def.sourceChannel,
          status: 'active',
          startDate: new Date(Date.now() - 25 * 86400000),
          endDate: new Date(Date.now() + 60 * 86400000),
          landingTitle: def.landingTitle,
          landingSubtitle: def.landingSubtitle,
          primaryColor: def.primaryColor,
          destinationType: def.destinationType,
          destinationUrl: def.destinationUrl,
          emailRequired: false,
          minimumPurchaseValue: def.minimumPurchaseValue,
        })
        .returning();
      createdCampaigns.push(camp);
    }

    const mainCampaign = createdCampaigns[0];

    // Create roulette configs & prizes for each campaign
    const rouletteMap = new Map<number, number>();
    const campaignPrizesMap = new Map<number, (typeof prizes.$inferSelect)[]>();

    for (const camp of createdCampaigns) {
      const [rConfig] = await db
        .insert(rouletteConfigs)
        .values({
          campaignId: camp.id,
          name: `Roleta — ${camp.name}`,
          active: true,
          maxSpinsPerCustomer: 1,
          cooldownHours: 24,
        })
        .returning();
      rouletteMap.set(camp.id, rConfig.id);

      const prizeDefs = [
        {
          name: '10% OFF',
          description: '10% de desconto em qualquer pizza grande no pedido direto.',
          type: 'percentage_discount',
          value: 10,
          probability: 30,
          stock: 200,
          stockUsed: camp.id === mainCampaign.id ? 6 : 2,
          minimumPurchaseValue: 45,
          expirationDays: 30,
          color: '#4F46E5',
        },
        {
          name: 'Frete grátis',
          description: 'Entrega 100% grátis no seu próximo pedido pelo nosso canal próprio.',
          type: 'free_shipping',
          value: 12,
          probability: 20,
          stock: 100,
          stockUsed: camp.id === mainCampaign.id ? 4 : 1,
          minimumPurchaseValue: 50,
          expirationDays: 21,
          color: '#16A34A',
        },
        {
          name: 'R$15 OFF',
          description: 'R$ 15,00 de desconto imediato em pedidos acima de R$ 70,00.',
          type: 'fixed_discount',
          value: 15,
          probability: 15,
          stock: 80,
          stockUsed: camp.id === mainCampaign.id ? 3 : 1,
          minimumPurchaseValue: 70,
          expirationDays: 15,
          color: '#D97706',
        },
        {
          name: 'Refrigerante grátis',
          description: 'Ganhe 1 Guaraná ou Coca-Cola 2L grátis no próximo pedido.',
          type: 'free_product',
          value: 14,
          probability: 15,
          stock: 60,
          stockUsed: camp.id === mainCampaign.id ? 2 : 1,
          minimumPurchaseValue: 65,
          expirationDays: 20,
          color: '#E11D48',
        },
        {
          name: 'Outra chance',
          description: 'Quase lá! Você ganhou um giro extra gratuito agora mesmo.',
          type: 'try_again',
          value: 0,
          probability: 10,
          stock: -1,
          stockUsed: 1,
          minimumPurchaseValue: 0,
          expirationDays: 7,
          color: '#0284C7',
        },
        {
          name: 'Borda Recheada Grátis',
          description: 'Upgrade gratuito para borda de Catupiry Original.',
          type: 'gift',
          value: 16,
          probability: 10,
          stock: 90,
          stockUsed: 2,
          minimumPurchaseValue: 55,
          expirationDays: 30,
          color: '#7C3AED',
        },
      ];

      const insertedPrizes = [];
      for (const p of prizeDefs) {
        const [pr] = await db
          .insert(prizes)
          .values({
            campaignId: camp.id,
            name: p.name,
            description: p.description,
            type: p.type,
            value: p.value,
            probability: p.probability,
            stock: p.stock,
            stockUsed: p.stockUsed,
            active: true,
            minimumPurchaseValue: p.minimumPurchaseValue,
            expirationDays: p.expirationDays,
            color: p.color,
          })
          .returning();
        insertedPrizes.push(pr);
      }
      campaignPrizesMap.set(camp.id, insertedPrizes);

      // Create QR code for each campaign
      const qrCodeStr = `QR-${camp.slug.toUpperCase().slice(0, 10)}-${camp.id}`;
      await db.insert(qrCodes).values({
        companyId: company.id,
        campaignId: camp.id,
        code: qrCodeStr,
        destinationUrl: `/c/${company.slug}/${camp.slug}?qr=${qrCodeStr}`,
        sourceChannel: camp.sourceChannel,
        active: true,
        scanCount: camp.id === mainCampaign.id ? 48 : 19,
        cardTitle: 'OBRIGADO PELA SUA COMPRA! 🎁',
        cardSubtitle: 'Quer ganhar um benefício exclusivo para sua próxima compra?',
        cardCta: 'APONTE A CÂMERA PARA O QR CODE E GIRE A ROLETA',
      });
    }

    // Create 12 realistic demo customers across channels and record full funnel history
    const demoCustomerDefs = [
      { name: 'João Pedro Silva', phone: '11987654321', email: 'joao.silva@gmail.com', consent: true, campIdx: 0, prizeIdx: 0, clicked: true, redeemed: true, orderVal: 89.9, daysAgo: 12 },
      { name: 'Mariana Costa Oliveira', phone: '11976543210', email: 'mariana.costa@outlook.com', consent: true, campIdx: 0, prizeIdx: 1, clicked: true, redeemed: true, orderVal: 112.0, daysAgo: 10 },
      { name: 'Rafael Mendes Almeida', phone: '11965432109', email: 'rafael.mendes@uol.com.br', consent: false, campIdx: 0, prizeIdx: 2, clicked: true, redeemed: true, orderVal: 94.5, daysAgo: 9 },
      { name: 'Camila Ferreira Lima', phone: '11954321098', email: 'camila.lima@gmail.com', consent: true, campIdx: 0, prizeIdx: 3, clicked: true, redeemed: false, orderVal: 0, daysAgo: 7 },
      { name: 'Bruno Rodrigues Santos', phone: '11943210987', email: 'bruno.santos@gmail.com', consent: true, campIdx: 1, prizeIdx: 0, clicked: true, redeemed: true, orderVal: 135.0, daysAgo: 6 },
      { name: 'Juliana Pereira Souza', phone: '11932109876', email: 'ju.souza@hotmail.com', consent: true, campIdx: 1, prizeIdx: 1, clicked: true, redeemed: false, orderVal: 0, daysAgo: 5 },
      { name: 'Lucas Gomes Barbosa', phone: '11921098765', email: 'lucas.barbosa@gmail.com', consent: false, campIdx: 2, prizeIdx: 2, clicked: true, redeemed: true, orderVal: 78.0, daysAgo: 4 },
      { name: 'Fernanda Ribeiro Carvalho', phone: '11910987654', email: 'fernanda.rc@gmail.com', consent: true, campIdx: 0, prizeIdx: 0, clicked: true, redeemed: true, orderVal: 104.9, daysAgo: 3 },
      { name: 'Thiago Martins Araújo', phone: '11988776655', email: 'thiago.araujo@gmail.com', consent: true, campIdx: 3, prizeIdx: 5, clicked: true, redeemed: true, orderVal: 92.0, daysAgo: 2 },
      { name: 'Beatriz Nascimento Dias', phone: '11977665544', email: 'bia.dias@gmail.com', consent: true, campIdx: 0, prizeIdx: 1, clicked: false, redeemed: false, orderVal: 0, daysAgo: 2 },
      { name: 'Gabriel Moreira Castro', phone: '11966554433', email: 'gabriel.castro@gmail.com', consent: false, campIdx: 2, prizeIdx: 0, clicked: true, redeemed: false, orderVal: 0, daysAgo: 1 },
      { name: 'Larissa Cardoso Pinto', phone: '11955443322', email: 'larissa.pinto@gmail.com', consent: true, campIdx: 0, prizeIdx: 2, clicked: true, redeemed: true, orderVal: 118.0, daysAgo: 1 },
    ];

    for (let i = 0; i < demoCustomerDefs.length; i++) {
      const cDef = demoCustomerDefs[i];
      const camp = createdCampaigns[cDef.campIdx];
      const campPrizes = campaignPrizesMap.get(camp.id)!;
      const wonPrize = campPrizes[cDef.prizeIdx];
      const rId = rouletteMap.get(camp.id)!;
      const createdAtDate = new Date(Date.now() - cDef.daysAgo * 86400000);

      const [cust] = await db
        .insert(customers)
        .values({
          companyId: company.id,
          name: cDef.name,
          phone: cDef.phone,
          email: cDef.email,
          marketingConsent: cDef.consent,
          marketingConsentAt: cDef.consent ? createdAtDate : null,
          firstSourceChannel: camp.sourceChannel,
          createdAt: createdAtDate,
          updatedAt: createdAtDate,
        })
        .returning();

      await db.insert(campaignCustomers).values({
        campaignId: camp.id,
        customerId: cust.id,
        createdAt: createdAtDate,
      });

      await db.insert(spins).values({
        campaignId: camp.id,
        customerId: cust.id,
        rouletteId: rId,
        prizeId: wonPrize.id,
        result: 'won',
        createdAt: createdAtDate,
      });

      const code = `ALFA-${(100 + i).toString()}${cDef.name.slice(0, 2).toUpperCase()}`;
      const redeemedDate = cDef.redeemed ? new Date(createdAtDate.getTime() + 3600000 * 6) : null;

      const [coup] = await db
        .insert(coupons)
        .values({
          companyId: company.id,
          campaignId: camp.id,
          customerId: cust.id,
          prizeId: wonPrize.id,
          code,
          discountType: wonPrize.type,
          discountValue: wonPrize.value,
          minimumPurchaseValue: wonPrize.minimumPurchaseValue,
          expiresAt: new Date(Date.now() + 20 * 86400000),
          status: cDef.redeemed ? 'used' : 'available',
          redeemedAt: redeemedDate,
          redemptionChannel: cDef.redeemed ? (camp.destinationType === 'whatsapp' ? 'WhatsApp' : 'Site Próprio') : null,
          createdAt: createdAtDate,
        })
        .returning();

      // Record funnel events
      const baseEvents = ['qr_scan', 'page_view', 'registration', 'spin', 'prize_won', 'coupon_generated', 'coupon_viewed'];
      if (cDef.clicked) baseEvents.push('destination_clicked');
      if (cDef.redeemed) baseEvents.push('coupon_redeemed');

      for (const evType of baseEvents) {
        await db.insert(campaignEvents).values({
          companyId: company.id,
          campaignId: camp.id,
          customerId: cust.id,
          eventType: evType,
          metadata: JSON.stringify({ sourceChannel: camp.sourceChannel, couponCode: code }),
          createdAt: createdAtDate,
        });
      }

      if (cDef.redeemed && redeemedDate) {
        await db.insert(redemptions).values({
          couponId: coup.id,
          customerId: cust.id,
          campaignId: camp.id,
          orderValue: cDef.orderVal,
          redemptionChannel: camp.destinationType === 'whatsapp' ? 'WhatsApp' : 'Site Próprio',
          redeemedAt: redeemedDate,
          metadata: JSON.stringify({ registeredBy: 'Painel do Empresário' }),
        });
      }
    }

    // Add extra top-of-funnel qr_scan & page_view events to reflect realistic funnel drop-off
    for (let s = 0; s < 18; s++) {
      const camp = createdCampaigns[s % createdCampaigns.length];
      await db.insert(campaignEvents).values({
        companyId: company.id,
        campaignId: camp.id,
        eventType: 'qr_scan',
        metadata: JSON.stringify({ sourceChannel: camp.sourceChannel }),
      });
      await db.insert(campaignEvents).values({
        companyId: company.id,
        campaignId: camp.id,
        eventType: 'page_view',
        metadata: JSON.stringify({ sourceChannel: camp.sourceChannel }),
      });
    }

    return { company, profile };
  } catch (error) {
    console.error('Database query failed in ensureDemoCompanyAndData:', error);
    throw new Error('Falha ao inicializar dados de demonstração.', { cause: error });
  }
}

export async function registerOrLoginUser(params: {
  authUserId: string;
  email: string;
  name: string;
  companyName?: string;
  passwordHash?: string;
}) {
  try {
    const existingProfile = await getProfileByAuthUid(params.authUserId);
    if (existingProfile) {
      const companyRows = await db
        .select()
        .from(companies)
        .where(eq(companies.id, existingProfile.companyId));
      return { profile: existingProfile, company: companyRows[0] };
    }

    const baseName = params.companyName?.trim() || `Empresa de ${params.name}`;
    const baseSlug = slugify(baseName);
    const uniqueSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;

    const [company] = await db
      .insert(companies)
      .values({
        name: baseName,
        slug: uniqueSlug,
        industry: 'Restaurante / Delivery',
        email: params.email,
        status: 'active',
        onboardingCompleted: false,
      })
      .returning();

    const [profile] = await db
      .insert(profiles)
      .values({
        authUserId: params.authUserId,
        companyId: company.id,
        name: params.name,
        email: params.email.toLowerCase().trim(),
        passwordHash: params.passwordHash || '',
        role: 'OWNER',
      })
      .onConflictDoUpdate({
        target: profiles.authUserId,
        set: { email: params.email.toLowerCase().trim() },
      })
      .returning();

    // Create default initial campaign & roulette so the new company immediately has a working foundation
    const [campaign] = await db
      .insert(campaigns)
      .values({
        companyId: company.id,
        name: 'Clientes iFood — Campanha Principal',
        slug: 'clientes-ifood',
        description: 'Campanha inicial para migrar clientes do iFood para o canal próprio.',
        sourceChannel: 'iFood',
        status: 'active',
        landingTitle: '🎁 Você ganhou uma chance de ganhar um benefício!',
        landingSubtitle: 'Gire a roleta e descubra seu benefício para a próxima compra.',
        primaryColor: '#4F46E5',
        destinationType: 'whatsapp',
        destinationUrl: '5511999999999',
        emailRequired: false,
        minimumPurchaseValue: 40,
      })
      .returning();

    await db.insert(rouletteConfigs).values({
      campaignId: campaign.id,
      name: 'Roleta Principal',
      active: true,
      maxSpinsPerCustomer: 1,
      cooldownHours: 24,
    });

    const defaultPrizes = [
      { name: '10% OFF', type: 'percentage_discount', value: 10, probability: 35, stock: 100, color: '#4F46E5' },
      { name: 'Frete grátis', type: 'free_shipping', value: 10, probability: 25, stock: 50, color: '#16A34A' },
      { name: 'R$15 OFF', type: 'fixed_discount', value: 15, probability: 15, stock: 30, color: '#D97706' },
      { name: 'Brinde Especial', type: 'gift', value: 12, probability: 15, stock: 40, color: '#E11D48' },
      { name: 'Outra chance', type: 'try_again', value: 0, probability: 10, stock: -1, color: '#0284C7' },
    ];

    for (const p of defaultPrizes) {
      await db.insert(prizes).values({
        campaignId: campaign.id,
        name: p.name,
        description: `Benefício exclusivo: ${p.name}`,
        type: p.type,
        value: p.value,
        probability: p.probability,
        stock: p.stock,
        stockUsed: 0,
        active: true,
        minimumPurchaseValue: 40,
        expirationDays: 30,
        color: p.color,
      });
    }

    const qrCodeStr = `QR-${uniqueSlug.toUpperCase().slice(0, 8)}-1`;
    await db.insert(qrCodes).values({
      companyId: company.id,
      campaignId: campaign.id,
      code: qrCodeStr,
      destinationUrl: `/c/${company.slug}/${campaign.slug}?qr=${qrCodeStr}`,
      sourceChannel: 'iFood',
      active: true,
      scanCount: 0,
    });

    return { profile, company };
  } catch (error) {
    console.error('Database query failed in registerOrLoginUser:', error);
    throw new Error('Falha ao registrar ou autenticar empresa.', { cause: error });
  }
}

export async function ensureCompanyCrmAndWhatsappDefaults(companyId: number) {
  try {
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
    if (!company) return;

    // 1. Ensure whatsapp_connections row exists for this company
    const existingConn = await db
      .select()
      .from(whatsappConnections)
      .where(eq(whatsappConnections.companyId, companyId));

    if (existingConn.length === 0) {
      await db.insert(whatsappConnections).values({
        companyId,
        wabaId: '',
        phoneNumberId: '',
        displayPhoneNumber: company.whatsappUrl || '',
        verifiedBusinessName: company.name,
        connectionStatus: 'disconnected',
        webhookStatus: 'pending',
        configStatus: process.env.META_APP_ID ? 'embedded_signup_ready' : 'incomplete',
        tokenReference: '',
      });
    }

    // 2. Ensure default WhatsApp Message Templates exist for this company
    const existingTemplates = await db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.companyId, companyId))
      .orderBy(asc(messageTemplates.id));

    let templatesList = existingTemplates;
    if (existingTemplates.length === 0) {
      const defaultTemplates = [
        {
          name: 'Boas-vindas Automáticas (Roleta)',
          metaTemplateName: 'alfa_boas_vindas_roleta_v1',
          category: 'MARKETING',
          approvalStatus: 'approved',
          content: `Olá, {{nome}}! 🍕\n\nAqui é da {{empresa}}!\n\nVocê participou da nossa roleta e ganhou {{premio}}!\n\nSeu cupom exclusivo é:\n\n🎁 {{cupom}}\n\nQue tal aproveitar seu benefício e fazer seu próximo pedido diretamente conosco?\n\n[LINK DO CANAL PRÓPRIO]\n\nEsperamos você novamente!`,
        },
        {
          name: 'Lembrete de Cupom Disponível (24h)',
          metaTemplateName: 'alfa_lembrete_cupom_24h',
          category: 'MARKETING',
          approvalStatus: 'approved',
          content: `Olá, {{nome}}! Seu benefício ({{premio}}) na {{empresa}} ainda está disponível! 🎁\n\nUse o cupom exclusivo *{{cupom}}* antes que expire e peça diretamente pelo nosso canal próprio:\n[LINK DO CANAL PRÓPRIO]\n\nPara não receber novidades, responda SAIR.`,
        },
        {
          name: 'Incentivo à Recompra (7 Dias)',
          metaTemplateName: 'alfa_incentivo_recompra_7d',
          category: 'MARKETING',
          approvalStatus: 'approved',
          content: `Olá, {{nome}}! Tudo bem? Aqui é da {{empresa}}!\n\nJá faz uma semana que você participou da nossa campanha. Que tal repetir a experiência pedindo diretamente conosco com atendimento prioritário?\n\n[LINK DO CANAL PRÓPRIO]\n\nResponda SAIR caso não queira mais ofertas.`,
        },
        {
          name: 'Reativação de Clientes Inativos (30 Dias)',
          metaTemplateName: 'alfa_reativacao_clientes_30d',
          category: 'MARKETING',
          approvalStatus: 'approved',
          content: `Olá, {{nome}}! Sentimos sua falta aqui na {{empresa}}! ❤️\n\nPreparamos condições especiais no nosso canal próprio para você voltar a pedir conosco hoje mesmo:\n\n[LINK DO CANAL PRÓPRIO]\n\nResponda SAIR para cancelar recebimento.`,
        },
        {
          name: 'Confirmação de Cupom Resgatado',
          metaTemplateName: 'alfa_cupom_resgatado_utilidade',
          category: 'UTILITY',
          approvalStatus: 'approved',
          content: `Olá, {{nome}}! Confirmamos o uso do seu cupom {{cupom}} ({{premio}}) na {{empresa}}. Muito obrigado pela preferência!`,
        },
      ];

      const inserted = [];
      for (const tpl of defaultTemplates) {
        const [row] = await db
          .insert(messageTemplates)
          .values({
            companyId,
            name: tpl.name,
            metaTemplateName: tpl.metaTemplateName,
            language: 'pt_BR',
            category: tpl.category,
            approvalStatus: tpl.approvalStatus,
            content: tpl.content,
          })
          .returning();
        inserted.push(row);
      }
      templatesList = inserted;
    }

    // 3. Ensure initial 4 Automations exist for this company
    const existingAutomations = await db
      .select()
      .from(automations)
      .where(eq(automations.companyId, companyId));

    if (existingAutomations.length === 0 && templatesList.length >= 4) {
      const initialAutomations = [
        {
          name: 'BOAS-VINDAS AUTOMÁTICAS',
          description:
            'Envia mensagem automática pelo WhatsApp Business da empresa 5 minutos após o cadastro e giro na roleta (somente com consentimento LGPD ativo).',
          triggerType: 'welcome_spin',
          delayMinutes: 5,
          active: true,
          templateId: templatesList[0]?.id || null,
          customMessage: templatesList[0]?.content || '',
          conditions: JSON.stringify({
            requireMarketingConsent: true,
            requireWonPrize: true,
            maxPerCustomerPerDay: 1,
          }),
        },
        {
          name: 'Lembrete de Cupom Não Utilizado',
          description:
            'Dispara lembrete automático 24 horas após o giro caso o cupom continue disponível e ainda não tenha sido resgatado.',
          triggerType: 'coupon_unused',
          delayMinutes: 1440,
          active: true,
          templateId: templatesList[1]?.id || null,
          customMessage: templatesList[1]?.content || '',
          conditions: JSON.stringify({
            requireMarketingConsent: true,
            couponStatus: 'available',
          }),
        },
        {
          name: 'Incentivo à Recompra',
          description:
            'Envia convite para nova compra no canal próprio 7 dias após o cliente participar de uma campanha.',
          triggerType: 'repurchase_incentive',
          delayMinutes: 10080,
          active: true,
          templateId: templatesList[2]?.id || null,
          customMessage: templatesList[2]?.content || '',
          conditions: JSON.stringify({
            requireMarketingConsent: true,
            daysSinceParticipation: 7,
          }),
        },
        {
          name: 'Reativação de Clientes (30 Dias)',
          description:
            'Recupera clientes da base do CRM que estão sem nova interação há 30 dias com oferta para pedido direto.',
          triggerType: 'customer_inactive',
          delayMinutes: 43200,
          active: false,
          templateId: templatesList[3]?.id || null,
          customMessage: templatesList[3]?.content || '',
          conditions: JSON.stringify({
            requireMarketingConsent: true,
            inactiveDays: 30,
          }),
        },
      ];

      for (const aut of initialAutomations) {
        await db.insert(automations).values({
          companyId,
          name: aut.name,
          description: aut.description,
          triggerType: aut.triggerType,
          delayMinutes: aut.delayMinutes,
          active: aut.active,
          templateId: aut.templateId,
          customMessage: aut.customMessage,
          conditions: aut.conditions,
        });
      }
    }

    // 4. Backfill customer_consents for existing customers that don't have consent audit records yet
    const existingConsents = await db
      .select()
      .from(customerConsents)
      .where(eq(customerConsents.companyId, companyId));

    if (existingConsents.length === 0) {
      const compCustomers = await db
        .select()
        .from(customers)
        .where(eq(customers.companyId, companyId));

      for (const cust of compCustomers) {
        await db.insert(customerConsents).values({
          companyId,
          customerId: cust.id,
          channel: 'whatsapp',
          consentType: 'marketing',
          consentStatus: cust.marketingConsent ? 'granted' : 'revoked',
          consentText:
            'Quero receber novidades, ofertas e benefícios desta empresa pelo WhatsApp.',
          consentVersion: 'v1.0-LGPD',
          consentSource: 'roulette_form',
          consentedAt: cust.marketingConsentAt || cust.createdAt,
          revokedAt: cust.marketingConsent ? null : cust.createdAt,
        });
      }

      // Seed historical message logs for existing consented customers so CRM & Dashboard reflect real relationships
      const consentedCustomers = compCustomers.filter((c) => c.marketingConsent);
      const companyAuts = await db
        .select()
        .from(automations)
        .where(eq(automations.companyId, companyId))
        .orderBy(asc(automations.id));
      const welcomeAut = companyAuts[0];
      const reminderAut = companyAuts[1];

      if (welcomeAut && consentedCustomers.length > 0) {
        const compCoupons = await db
          .select()
          .from(coupons)
          .where(eq(coupons.companyId, companyId));

        for (let idx = 0; idx < Math.min(consentedCustomers.length, 8); idx++) {
          const cust = consentedCustomers[idx];
          const custCoupon = compCoupons.find((cp) => cp.customerId === cust.id);
          const sentTime = new Date(new Date(cust.createdAt).getTime() + 5 * 60000);
          const deliveredTime = new Date(sentTime.getTime() + 12000);
          const readTime = idx % 3 !== 0 ? new Date(deliveredTime.getTime() + 95000) : null;
          const status = idx % 3 !== 0 ? 'read' : 'delivered';

          const rendered = renderTemplateVariables(welcomeAut.customMessage, {
            nome: cust.name,
            empresa: company.name,
            premio: custCoupon?.discountType === 'free_shipping' ? 'Frete grátis' : '10% OFF',
            cupom: custCoupon?.code || 'ALFA-10OFF',
            link: company.websiteUrl || `https://wa.me/${company.whatsappUrl || '5511999998888'}`,
          });

          const [sched] = await db
            .insert(scheduledMessages)
            .values({
              companyId,
              customerId: cust.id,
              automationId: welcomeAut.id,
              templateId: welcomeAut.templateId,
              campaignId: custCoupon?.campaignId || null,
              couponId: custCoupon?.id || null,
              renderedMessage: rendered,
              scheduledAt: sentTime,
              executedAt: sentTime,
              sentAt: sentTime,
              status: 'sent',
              attempts: 1,
              idempotencyKey: `seed-welcome-${companyId}-${cust.id}`,
            })
            .onConflictDoNothing()
            .returning();

          if (sched) {
            await db.insert(messageLogs).values({
              companyId,
              customerId: cust.id,
              automationId: welcomeAut.id,
              templateId: welcomeAut.templateId,
              scheduledMessageId: sched.id,
              whatsappMessageId: `wamid.HBgNNTUxMTk5OTk5ODg4OBUCABIYFDNB_${companyId}_${cust.id}`,
              phoneNumberId: 'waba_phone_primary',
              recipientPhone: cust.phone,
              renderedContent: rendered,
              messageStatus: status,
              sentAt: sentTime,
              deliveredAt: deliveredTime,
              readAt: readTime,
              createdAt: sentTime,
            });

            await db.insert(automationExecutions).values({
              companyId,
              automationId: welcomeAut.id,
              customerId: cust.id,
              status: 'sent',
              executionDate: sentTime,
            });
          }

          if (reminderAut && idx < 3 && custCoupon?.status === 'available') {
            const remTime = new Date(sentTime.getTime() + 86400000);
            const remRendered = renderTemplateVariables(reminderAut.customMessage, {
              nome: cust.name,
              empresa: company.name,
              premio: '10% OFF',
              cupom: custCoupon.code,
              link: company.websiteUrl || `https://wa.me/${company.whatsappUrl || '5511999998888'}`,
            });

            await db.insert(messageLogs).values({
              companyId,
              customerId: cust.id,
              automationId: reminderAut.id,
              templateId: reminderAut.templateId,
              whatsappMessageId: `wamid.REM_${companyId}_${cust.id}`,
              phoneNumberId: 'waba_phone_primary',
              recipientPhone: cust.phone,
              renderedContent: remRendered,
              messageStatus: 'read',
              sentAt: remTime,
              deliveredAt: new Date(remTime.getTime() + 8000),
              readAt: new Date(remTime.getTime() + 60000),
              createdAt: remTime,
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('Warning in ensureCompanyCrmAndWhatsappDefaults:', err);
  }
}

export function renderTemplateVariables(
  templateText: string,
  vars: {
    nome: string;
    empresa: string;
    premio: string;
    cupom: string;
    link: string;
  }
): string {
  return (templateText || '')
    .replace(/\{\{\s*nome\s*\}\}/gi, vars.nome)
    .replace(/\{\s*nome\s*\}/gi, vars.nome)
    .replace(/\{\{\s*empresa\s*\}\}/gi, vars.empresa)
    .replace(/\{\s*empresa\s*\}/gi, vars.empresa)
    .replace(/\{\{\s*premio\s*\}\}/gi, vars.premio)
    .replace(/\{\s*premio\s*\}/gi, vars.premio)
    .replace(/\{\{\s*cupom\s*\}\}/gi, vars.cupom)
    .replace(/\{\s*cupom\s*\}/gi, vars.cupom)
    .replace(/\{\{\s*link\s*\}\}/gi, vars.link)
    .replace(/\[LINK DO CANAL PRÓPRIO\]/gi, vars.link);
}

export async function getTenantWorkspaceData(companyId: number) {
  try {
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
    if (!company) {
      throw new Error('Empresa não encontrada');
    }

    await ensureCompanyCrmAndWhatsappDefaults(companyId);
    await processScheduledMessagesQueue(companyId);

    const teamProfiles = await db
      .select({
        id: profiles.id,
        name: profiles.name,
        email: profiles.email,
        role: profiles.role,
        createdAt: profiles.createdAt,
      })
      .from(profiles)
      .where(eq(profiles.companyId, companyId));

    const companyCampaigns = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.companyId, companyId))
      .orderBy(desc(campaigns.createdAt));

    const companyCustomers = await db
      .select()
      .from(customers)
      .where(eq(customers.companyId, companyId))
      .orderBy(desc(customers.createdAt));

    const companyCoupons = await db
      .select()
      .from(coupons)
      .where(eq(coupons.companyId, companyId))
      .orderBy(desc(coupons.createdAt));

    const companyQrCodes = await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.companyId, companyId))
      .orderBy(desc(qrCodes.createdAt));

    const companyEvents = await db
      .select()
      .from(campaignEvents)
      .where(eq(campaignEvents.companyId, companyId))
      .orderBy(desc(campaignEvents.createdAt));

    const [rawWaConn] = await db
      .select()
      .from(whatsappConnections)
      .where(eq(whatsappConnections.companyId, companyId));

    const appBaseUrl = process.env.APP_URL || 'http://localhost:3000';
    const sanitizedWhatsappConnection = {
      id: rawWaConn?.id || 0,
      companyId,
      wabaId: rawWaConn?.wabaId || '',
      phoneNumberId: rawWaConn?.phoneNumberId || '',
      displayPhoneNumber: rawWaConn?.displayPhoneNumber || company.whatsappUrl || '',
      verifiedBusinessName: rawWaConn?.verifiedBusinessName || company.name,
      connectionStatus: rawWaConn?.connectionStatus || 'disconnected',
      webhookStatus: rawWaConn?.webhookStatus || 'pending',
      configStatus: rawWaConn?.configStatus || 'incomplete',
      hasServerToken: Boolean(rawWaConn?.tokenReference),
      metaAppConfigured: Boolean(process.env.META_APP_ID),
      metaAppId: process.env.META_APP_ID || '',
      metaConfigId: process.env.META_EMBEDDED_SIGNUP_CONFIG_ID || '',
      webhookCallbackUrl: `${appBaseUrl.replace(/\/$/, '')}/api/webhooks/whatsapp`,
      connectedAt: rawWaConn?.connectedAt ? rawWaConn.connectedAt.toISOString() : null,
      createdAt: rawWaConn?.createdAt
        ? rawWaConn.createdAt.toISOString()
        : new Date().toISOString(),
      updatedAt: rawWaConn?.updatedAt
        ? rawWaConn.updatedAt.toISOString()
        : new Date().toISOString(),
    };

    const companyTemplates = await db
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.companyId, companyId))
      .orderBy(asc(messageTemplates.id));

    const companyAutomations = await db
      .select()
      .from(automations)
      .where(eq(automations.companyId, companyId))
      .orderBy(asc(automations.id));

    const companyScheduledMessages = await db
      .select()
      .from(scheduledMessages)
      .where(eq(scheduledMessages.companyId, companyId))
      .orderBy(desc(scheduledMessages.scheduledAt));

    const companyMessageLogs = await db
      .select()
      .from(messageLogs)
      .where(eq(messageLogs.companyId, companyId))
      .orderBy(desc(messageLogs.createdAt));

    const companyConsents = await db
      .select()
      .from(customerConsents)
      .where(eq(customerConsents.companyId, companyId))
      .orderBy(desc(customerConsents.createdAt));

    const companyExecutions = await db
      .select()
      .from(automationExecutions)
      .where(eq(automationExecutions.companyId, companyId))
      .orderBy(desc(automationExecutions.executionDate));

    // Fetch roulette configs, prizes, spins, and redemptions for this company's campaigns
    const allRouletteConfigs = [];
    const allPrizes = [];
    const allSpins = [];
    const allRedemptions = [];

    for (const camp of companyCampaigns) {
      const rConfigs = await db
        .select()
        .from(rouletteConfigs)
        .where(eq(rouletteConfigs.campaignId, camp.id));
      allRouletteConfigs.push(...rConfigs);

      const campPrizes = await db
        .select()
        .from(prizes)
        .where(eq(prizes.campaignId, camp.id))
        .orderBy(asc(prizes.id));
      allPrizes.push(...campPrizes);

      const campSpins = await db
        .select()
        .from(spins)
        .where(eq(spins.campaignId, camp.id))
        .orderBy(desc(spins.createdAt));
      allSpins.push(...campSpins);

      const campRedemptions = await db
        .select()
        .from(redemptions)
        .where(eq(redemptions.campaignId, camp.id))
        .orderBy(desc(redemptions.redeemedAt));
      allRedemptions.push(...campRedemptions);
    }

    return {
      company,
      teamProfiles,
      campaigns: companyCampaigns,
      customers: companyCustomers,
      coupons: companyCoupons,
      qrCodes: companyQrCodes,
      events: companyEvents,
      rouletteConfigs: allRouletteConfigs,
      prizes: allPrizes,
      spins: allSpins,
      redemptions: allRedemptions,
      whatsappConnection: sanitizedWhatsappConnection,
      messageTemplates: companyTemplates,
      automations: companyAutomations,
      scheduledMessages: companyScheduledMessages,
      messageLogs: companyMessageLogs,
      customerConsents: companyConsents,
      automationExecutions: companyExecutions,
    };
  } catch (error) {
    console.error('Database query failed in getTenantWorkspaceData:', error);
    throw new Error('Falha ao carregar dados da empresa.', { cause: error });
  }
}

export async function updateCompanySettings(
  companyId: number,
  data: {
    name?: string;
    slug?: string;
    logoUrl?: string;
    industry?: string;
    phone?: string;
    email?: string;
    websiteUrl?: string;
    whatsappUrl?: string;
    whatsappMessageTemplate?: string;
    syncTemplateToCampaigns?: boolean;
    instagramUrl?: string;
    onboardingCompleted?: boolean;
    ga4Id?: string;
    metaPixelId?: string;
  }
) {
  try {
    const nextSlug = data.slug
      ? slugify(data.slug)
      : data.name
      ? slugify(data.name)
      : undefined;

    const { syncTemplateToCampaigns, ...companyFields } = data;

    const [updated] = await db
      .update(companies)
      .set({
        ...companyFields,
        ...(nextSlug ? { slug: nextSlug } : {}),
        updatedAt: new Date(),
      })
      .where(eq(companies.id, companyId))
      .returning();

    if (data.whatsappMessageTemplate && syncTemplateToCampaigns) {
      await db
        .update(campaigns)
        .set({
          whatsappMessageTemplate: data.whatsappMessageTemplate,
          updatedAt: new Date(),
        })
        .where(eq(campaigns.companyId, companyId));
    }

    return updated;
  } catch (error) {
    console.error('Database query failed in updateCompanySettings:', error);
    throw new Error('Falha ao atualizar configurações da empresa.', { cause: error });
  }
}

export async function createCampaignForCompany(
  companyId: number,
  payload: {
    name: string;
    description?: string;
    sourceChannel: string;
    startDate?: string;
    endDate?: string;
    landingTitle?: string;
    landingSubtitle?: string;
    primaryColor?: string;
    destinationType: string;
    destinationUrl: string;
    whatsappMessageTemplate?: string;
    emailRequired?: boolean;
    minimumPurchaseValue?: number;
    maxSpinsPerCustomer?: number;
    cooldownHours?: number;
  }
) {
  try {
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
    if (!company) throw new Error('Empresa não encontrada');

    const slugBase = slugify(payload.name);
    const slug = `${slugBase}-${Math.floor(100 + Math.random() * 900)}`;

    const [campaign] = await db
      .insert(campaigns)
      .values({
        companyId,
        name: payload.name,
        slug,
        description: payload.description || '',
        sourceChannel: payload.sourceChannel,
        status: 'active',
        startDate: payload.startDate ? new Date(payload.startDate) : new Date(),
        endDate: payload.endDate ? new Date(payload.endDate) : new Date(Date.now() + 60 * 86400000),
        landingTitle: payload.landingTitle || '🎁 Você ganhou uma chance de ganhar um benefício!',
        landingSubtitle: payload.landingSubtitle || 'Gire a roleta e descubra seu benefício para a próxima compra.',
        primaryColor: payload.primaryColor || '#4F46E5',
        destinationType: payload.destinationType || 'whatsapp',
        destinationUrl: payload.destinationUrl,
        whatsappMessageTemplate:
          payload.whatsappMessageTemplate?.trim() ||
          company.whatsappMessageTemplate ||
          'Olá! Ganhei o cupom {cupom} ({premio}) e quero fazer meu pedido.',
        emailRequired: Boolean(payload.emailRequired),
        minimumPurchaseValue: Number(payload.minimumPurchaseValue || 0),
      })
      .returning();

    const [roulette] = await db
      .insert(rouletteConfigs)
      .values({
        campaignId: campaign.id,
        name: `Roleta — ${campaign.name}`,
        active: true,
        maxSpinsPerCustomer: Number(payload.maxSpinsPerCustomer || 1),
        cooldownHours: Number(payload.cooldownHours || 24),
      })
      .returning();

    // Seed default prizes for the new campaign
    const starterPrizes = [
      { name: '10% OFF', type: 'percentage_discount', value: 10, probability: 35, stock: 100, color: '#4F46E5' },
      { name: 'Frete grátis', type: 'free_shipping', value: 12, probability: 25, stock: 50, color: '#16A34A' },
      { name: 'R$15 OFF', type: 'fixed_discount', value: 15, probability: 15, stock: 40, color: '#D97706' },
      { name: 'Brinde surpresa', type: 'gift', value: 10, probability: 15, stock: 30, color: '#E11D48' },
      { name: 'Outra chance', type: 'try_again', value: 0, probability: 10, stock: -1, color: '#0284C7' },
    ];

    for (const sp of starterPrizes) {
      await db.insert(prizes).values({
        campaignId: campaign.id,
        name: sp.name,
        description: `Benefício válido na próxima compra: ${sp.name}`,
        type: sp.type,
        value: sp.value,
        probability: sp.probability,
        stock: sp.stock,
        stockUsed: 0,
        active: true,
        minimumPurchaseValue: Number(payload.minimumPurchaseValue || 0),
        expirationDays: 30,
        color: sp.color,
      });
    }

    const qrCodeStr = `QR-${slug.toUpperCase().slice(0, 10)}-${campaign.id}`;
    const [qr] = await db
      .insert(qrCodes)
      .values({
        companyId,
        campaignId: campaign.id,
        code: qrCodeStr,
        destinationUrl: `/c/${campaign.slug}?qr=${qrCodeStr}`,
        sourceChannel: campaign.sourceChannel,
        active: true,
        scanCount: 0,
      })
      .returning();

    return { campaign, roulette, qrCode: qr };
  } catch (error) {
    console.error('Database query failed in createCampaignForCompany:', error);
    throw new Error('Falha ao criar nova campanha.', { cause: error });
  }
}

export async function updateCampaignForCompany(
  companyId: number,
  campaignId: number,
  payload: Partial<typeof campaigns.$inferInsert> & {
    maxSpinsPerCustomer?: number;
    cooldownHours?: number;
  }
) {
  try {
    const [updated] = await db
      .update(campaigns)
      .set({
        name: payload.name,
        description: payload.description,
        sourceChannel: payload.sourceChannel,
        status: payload.status,
        landingTitle: payload.landingTitle,
        landingSubtitle: payload.landingSubtitle,
        primaryColor: payload.primaryColor,
        destinationType: payload.destinationType,
        destinationUrl: payload.destinationUrl,
        ...(payload.whatsappMessageTemplate !== undefined
          ? { whatsappMessageTemplate: payload.whatsappMessageTemplate }
          : {}),
        emailRequired: payload.emailRequired,
        minimumPurchaseValue: payload.minimumPurchaseValue,
        updatedAt: new Date(),
      })
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.companyId, companyId)))
      .returning();

    if (!updated) {
      throw new Error('Campanha não encontrada ou acesso negado');
    }

    if (payload.maxSpinsPerCustomer !== undefined || payload.cooldownHours !== undefined) {
      await db
        .update(rouletteConfigs)
        .set({
          maxSpinsPerCustomer: payload.maxSpinsPerCustomer ?? 1,
          cooldownHours: payload.cooldownHours ?? 24,
          updatedAt: new Date(),
        })
        .where(eq(rouletteConfigs.campaignId, campaignId));
    }

    return updated;
  } catch (error) {
    console.error('Database query failed in updateCampaignForCompany:', error);
    throw new Error('Falha ao atualizar campanha.', { cause: error });
  }
}

export async function createOrUpdatePrizeForCompany(
  companyId: number,
  payload: {
    id?: number;
    campaignId: number;
    name: string;
    description?: string;
    type: string;
    value: number;
    probability: number;
    stock: number;
    active: boolean;
    minimumPurchaseValue: number;
    expirationDays: number;
    color?: string;
  }
) {
  try {
    // Verify campaign belongs to companyId (RLS check)
    const [camp] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, payload.campaignId), eq(campaigns.companyId, companyId)));
    if (!camp) {
      throw new Error('Campanha não pertence à empresa autenticada');
    }

    if (payload.id) {
      const [updated] = await db
        .update(prizes)
        .set({
          name: payload.name,
          description: payload.description || '',
          type: payload.type,
          value: Number(payload.value),
          probability: Number(payload.probability),
          stock: Number(payload.stock),
          active: Boolean(payload.active),
          minimumPurchaseValue: Number(payload.minimumPurchaseValue),
          expirationDays: Number(payload.expirationDays),
          color: payload.color || '#4F46E5',
          updatedAt: new Date(),
        })
        .where(and(eq(prizes.id, payload.id), eq(prizes.campaignId, camp.id)))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(prizes)
      .values({
        campaignId: camp.id,
        name: payload.name,
        description: payload.description || '',
        type: payload.type,
        value: Number(payload.value),
        probability: Number(payload.probability),
        stock: Number(payload.stock),
        stockUsed: 0,
        active: Boolean(payload.active),
        minimumPurchaseValue: Number(payload.minimumPurchaseValue),
        expirationDays: Number(payload.expirationDays),
        color: payload.color || '#4F46E5',
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database query failed in createOrUpdatePrizeForCompany:', error);
    throw new Error('Falha ao salvar prêmio da roleta.', { cause: error });
  }
}

export async function deletePrizeForCompany(companyId: number, prizeId: number) {
  try {
    const [existingPrize] = await db.select().from(prizes).where(eq(prizes.id, prizeId));
    if (!existingPrize) throw new Error('Prêmio não encontrado');

    const [camp] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, existingPrize.campaignId), eq(campaigns.companyId, companyId)));
    if (!camp) throw new Error('Acesso negado');

    await db.delete(prizes).where(eq(prizes.id, prizeId));
    return { deleted: true };
  } catch (error) {
    console.error('Database query failed in deletePrizeForCompany:', error);
    throw new Error('Falha ao remover prêmio.', { cause: error });
  }
}

export async function redeemCouponForCompany(
  companyId: number,
  payload: {
    couponId?: number;
    code?: string;
    orderValue: number;
    redemptionChannel: string;
  }
) {
  try {
    let targetCoupon;
    if (payload.couponId) {
      const rows = await db
        .select()
        .from(coupons)
        .where(and(eq(coupons.id, payload.couponId), eq(coupons.companyId, companyId)));
      targetCoupon = rows[0];
    } else if (payload.code) {
      const rows = await db
        .select()
        .from(coupons)
        .where(and(eq(coupons.code, payload.code.toUpperCase().trim()), eq(coupons.companyId, companyId)));
      targetCoupon = rows[0];
    }

    if (!targetCoupon) {
      throw new Error('Cupom não encontrado para esta empresa.');
    }
    if (targetCoupon.status === 'used') {
      throw new Error('Este cupom já foi utilizado anteriormente.');
    }
    if (targetCoupon.status === 'cancelled' || targetCoupon.status === 'expired') {
      throw new Error(`Este cupom está ${targetCoupon.status === 'expired' ? 'expirado' : 'cancelado'}.`);
    }

    const now = new Date();
    const [updatedCoupon] = await db
      .update(coupons)
      .set({
        status: 'used',
        redeemedAt: now,
        redemptionChannel: payload.redemptionChannel || 'WhatsApp',
      })
      .where(eq(coupons.id, targetCoupon.id))
      .returning();

    const [redemption] = await db
      .insert(redemptions)
      .values({
        couponId: targetCoupon.id,
        customerId: targetCoupon.customerId,
        campaignId: targetCoupon.campaignId,
        orderValue: Number(payload.orderValue || 0),
        redemptionChannel: payload.redemptionChannel || 'WhatsApp',
        redeemedAt: now,
        metadata: JSON.stringify({ manualValidation: true }),
      })
      .returning();

    await db.insert(campaignEvents).values({
      companyId,
      campaignId: targetCoupon.campaignId,
      customerId: targetCoupon.customerId,
      eventType: 'coupon_redeemed',
      metadata: JSON.stringify({
        couponCode: targetCoupon.code,
        orderValue: Number(payload.orderValue || 0),
        channel: payload.redemptionChannel || 'WhatsApp',
      }),
    });

    return { coupon: updatedCoupon, redemption };
  } catch (error: any) {
    console.error('Database query failed in redeemCouponForCompany:', error);
    throw new Error(error.message || 'Falha ao registrar resgate do cupom.', { cause: error });
  }
}

export async function updateQrCodeCardSettings(
  companyId: number,
  qrCodeId: number,
  payload: { cardTitle: string; cardSubtitle: string; cardCta: string }
) {
  try {
    const [updated] = await db
      .update(qrCodes)
      .set({
        cardTitle: payload.cardTitle,
        cardSubtitle: payload.cardSubtitle,
        cardCta: payload.cardCta,
      })
      .where(and(eq(qrCodes.id, qrCodeId), eq(qrCodes.companyId, companyId)))
      .returning();
    return updated;
  } catch (error) {
    console.error('Database query failed in updateQrCodeCardSettings:', error);
    throw new Error('Falha ao atualizar textos do cartão impresso.', { cause: error });
  }
}

export async function addTeamMemberForCompany(
  companyId: number,
  payload: { name: string; email: string; role: string }
) {
  try {
    const fakeAuthUid = `team-${companyId}-${Date.now()}`;
    const [member] = await db
      .insert(profiles)
      .values({
        authUserId: fakeAuthUid,
        companyId,
        name: payload.name,
        email: payload.email.toLowerCase().trim(),
        role: payload.role === 'OWNER' || payload.role === 'ADMIN' ? payload.role : 'STAFF',
      })
      .returning();
    return member;
  } catch (error) {
    console.error('Database query failed in addTeamMemberForCompany:', error);
    throw new Error('Falha ao adicionar membro da equipe.', { cause: error });
  }
}

export async function deleteCustomerLgpd(companyId: number, customerId: number) {
  try {
    await db
      .delete(customers)
      .where(and(eq(customers.id, customerId), eq(customers.companyId, companyId)));
    return { deleted: true };
  } catch (error) {
    console.error('Database query failed in deleteCustomerLgpd:', error);
    throw new Error('Falha ao excluir registro do cliente (LGPD).', { cause: error });
  }
}

// ============================================================================
// PUBLIC CAMPAIGN & SERVER-SIDE ROULETTE ENGINE
// ============================================================================

export async function getPublicCampaignDetails(
  companySlug: string,
  campaignSlug: string,
  qrCodeParam?: string
) {
  try {
    await ensureDemoCompanyAndData();

    // First look up campaign directly by campaignSlug
    const directCampaignRows = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.slug, campaignSlug));

    let campaign = directCampaignRows[0];
    let company: typeof companies.$inferSelect | undefined;

    if (campaign) {
      const compRows = await db
        .select()
        .from(companies)
        .where(eq(companies.id, campaign.companyId));
      company = compRows[0];
    }

    if (!company) {
      const companyRows = await db
        .select()
        .from(companies)
        .where(eq(companies.slug, companySlug));
      company = companyRows[0];
      if (!company) {
        const allComps = await db.select().from(companies).orderBy(asc(companies.id));
        company = allComps[0];
      }
    }
    if (!company) return null;

    if (!campaign) {
      const campaignRows = await db
        .select()
        .from(campaigns)
        .where(and(eq(campaigns.companyId, company.id), eq(campaigns.slug, campaignSlug)));
      campaign = campaignRows[0];
      if (!campaign) {
        const allCamps = await db
          .select()
          .from(campaigns)
          .where(eq(campaigns.companyId, company.id));
        campaign = allCamps[0];
      }
    }
    if (!campaign) return null;

    const activePrizes = await db
      .select({
        id: prizes.id,
        name: prizes.name,
        description: prizes.description,
        type: prizes.type,
        value: prizes.value,
        color: prizes.color,
        minimumPurchaseValue: prizes.minimumPurchaseValue,
      })
      .from(prizes)
      .where(and(eq(prizes.campaignId, campaign.id), eq(prizes.active, true)))
      .orderBy(asc(prizes.id));

    // Track QR scan & page_view
    const qrRowList = await db
      .select()
      .from(qrCodes)
      .where(eq(qrCodes.campaignId, campaign.id));
    const qrRow = qrRowList[0];

    if (qrRow) {
      await db
        .update(qrCodes)
        .set({ scanCount: qrRow.scanCount + 1 })
        .where(eq(qrCodes.id, qrRow.id));

      await db.insert(qrScans).values({
        qrCodeId: qrRow.id,
        campaignId: campaign.id,
        deviceType: 'mobile',
        utmSource: campaign.sourceChannel,
        utmMedium: qrCodeParam ? 'qr_card' : 'direct_link',
        utmCampaign: campaign.slug,
      });
    }

    await db.insert(campaignEvents).values({
      companyId: company.id,
      campaignId: campaign.id,
      eventType: 'qr_scan',
      metadata: JSON.stringify({ qr: qrCodeParam || 'direct' }),
    });

    await db.insert(campaignEvents).values({
      companyId: company.id,
      campaignId: campaign.id,
      eventType: 'page_view',
      metadata: JSON.stringify({ sourceChannel: campaign.sourceChannel }),
    });

    return {
      company: {
        id: company.id,
        name: company.name,
        slug: company.slug,
        logoUrl: company.logoUrl,
        whatsappUrl: company.whatsappUrl,
        whatsappMessageTemplate: company.whatsappMessageTemplate,
        websiteUrl: company.websiteUrl,
        instagramUrl: company.instagramUrl,
      },
      campaign: {
        id: campaign.id,
        name: campaign.name,
        slug: campaign.slug,
        sourceChannel: campaign.sourceChannel,
        status: campaign.status,
        landingTitle: campaign.landingTitle,
        landingSubtitle: campaign.landingSubtitle,
        primaryColor: campaign.primaryColor,
        destinationType: campaign.destinationType,
        destinationUrl: campaign.destinationUrl,
        whatsappMessageTemplate: campaign.whatsappMessageTemplate,
        emailRequired: campaign.emailRequired,
        minimumPurchaseValue: campaign.minimumPurchaseValue,
      },
      wheelSlices: activePrizes,
    };
  } catch (error) {
    console.error('Database query failed in getPublicCampaignDetails:', error);
    throw new Error('Falha ao carregar campanha pública.', { cause: error });
  }
}

export async function executeServerSideSpin(params: {
  companySlug: string;
  campaignSlug: string;
  name: string;
  phone: string;
  email?: string;
  marketingConsent: boolean;
}) {
  try {
    const directCampaignRows = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.slug, params.campaignSlug));
    let campaign = directCampaignRows[0];
    let company: typeof companies.$inferSelect | undefined;

    if (campaign) {
      const compRows = await db
        .select()
        .from(companies)
        .where(eq(companies.id, campaign.companyId));
      company = compRows[0];
    } else {
      const companyRows = await db
        .select()
        .from(companies)
        .where(eq(companies.slug, params.companySlug));
      company = companyRows[0];
      if (company) {
        const campaignRows = await db
          .select()
          .from(campaigns)
          .where(and(eq(campaigns.companyId, company.id), eq(campaigns.slug, params.campaignSlug)));
        campaign = campaignRows[0];
      }
    }

    if (!company) {
      throw new Error('Empresa não encontrada.');
    }
    if (!campaign || campaign.status !== 'active') {
      throw new Error('Esta campanha não está ativa no momento.');
    }

    const normalizedPhone = params.phone.replace(/\D/g, '');
    if (normalizedPhone.length < 10) {
      throw new Error('Informe um número de WhatsApp válido com DDD.');
    }

    if (campaign.emailRequired && (!params.email || !params.email.includes('@'))) {
      throw new Error('O preenchimento de um e-mail válido é obrigatório nesta campanha.');
    }

    // 1. Identify or create customer for this company
    const existingCustomers = await db
      .select()
      .from(customers)
      .where(and(eq(customers.companyId, company.id), eq(customers.phone, normalizedPhone)));

    let customer = existingCustomers[0];
    const now = new Date();

    if (!customer) {
      const [inserted] = await db
        .insert(customers)
        .values({
          companyId: company.id,
          name: params.name.trim(),
          phone: normalizedPhone,
          email: params.email?.trim() || '',
          marketingConsent: Boolean(params.marketingConsent),
          marketingConsentAt: params.marketingConsent ? now : null,
          firstSourceChannel: campaign.sourceChannel,
          crmStatus: 'active',
          lastInteractionAt: now,
        })
        .returning();
      customer = inserted;
    } else {
      const isOptedOut = customer.crmStatus === 'opt_out' || customer.crmStatus === 'blocked';
      const nextConsent = params.marketingConsent
        ? true
        : isOptedOut
        ? false
        : customer.marketingConsent;
      const [updated] = await db
        .update(customers)
        .set({
          name: params.name.trim() || customer.name,
          email: params.email?.trim() || customer.email,
          marketingConsent: nextConsent,
          marketingConsentAt:
            params.marketingConsent && !customer.marketingConsentAt
              ? now
              : customer.marketingConsentAt,
          crmStatus: params.marketingConsent ? 'active' : customer.crmStatus,
          lastInteractionAt: now,
          updatedAt: now,
        })
        .where(eq(customers.id, customer.id))
        .returning();
      customer = updated;
    }

    // Record explicit LGPD consent entry in customer_consents
    await db.insert(customerConsents).values({
      companyId: company.id,
      customerId: customer.id,
      channel: 'whatsapp',
      consentType: 'marketing',
      consentStatus: params.marketingConsent ? 'granted' : 'revoked',
      consentText:
        'Quero receber novidades, ofertas e benefícios desta empresa pelo WhatsApp.',
      consentVersion: 'v1.0-LGPD',
      consentSource: 'roulette_form',
      consentedAt: now,
      revokedAt: params.marketingConsent ? null : now,
    });

    // Link customer to campaign
    const existingLinks = await db
      .select()
      .from(campaignCustomers)
      .where(
        and(
          eq(campaignCustomers.campaignId, campaign.id),
          eq(campaignCustomers.customerId, customer.id)
        )
      );
    if (existingLinks.length === 0) {
      await db.insert(campaignCustomers).values({
        campaignId: campaign.id,
        customerId: customer.id,
      });
    }

    await db.insert(campaignEvents).values({
      companyId: company.id,
      campaignId: campaign.id,
      customerId: customer.id,
      eventType: 'registration',
      metadata: JSON.stringify({ marketingConsent: Boolean(params.marketingConsent) }),
    });

    // 2. Check Roulette Config & Spin Limits
    const rConfigs = await db
      .select()
      .from(rouletteConfigs)
      .where(eq(rouletteConfigs.campaignId, campaign.id));
    const roulette = rConfigs[0];
    if (!roulette || !roulette.active) {
      throw new Error('A roleta desta campanha está temporariamente desativada.');
    }

    const previousSpins = await db
      .select()
      .from(spins)
      .where(and(eq(spins.campaignId, campaign.id), eq(spins.customerId, customer.id)))
      .orderBy(desc(spins.createdAt));

    // Filter out 'try_again' spins so winning 'Outra chance' grants an immediate bonus spin
    const effectiveSpins = previousSpins.filter((s) => s.result !== 'try_again');

    if (effectiveSpins.length >= roulette.maxSpinsPerCustomer) {
      // Check if customer already has an available coupon from this campaign to return gracefully
      const existingCoupons = await db
        .select()
        .from(coupons)
        .where(
          and(
            eq(coupons.campaignId, campaign.id),
            eq(coupons.customerId, customer.id)
          )
        )
        .orderBy(desc(coupons.createdAt));

      const allCampaignPrizes = await db
        .select()
        .from(prizes)
        .where(and(eq(prizes.campaignId, campaign.id), eq(prizes.active, true)))
        .orderBy(asc(prizes.id));

      if (existingCoupons.length > 0) {
        const lastCoupon = existingCoupons[0];
        const prizeIndex = Math.max(
          0,
          allCampaignPrizes.findIndex((p) => p.id === lastCoupon.prizeId)
        );
        const matchedPrize = allCampaignPrizes[prizeIndex] || allCampaignPrizes[0];
        return {
          alreadyParticipated: true,
          message: 'Você já girou a roleta nesta campanha! Aqui está o seu cupom ativo:',
          sliceIndex: prizeIndex,
          prize: matchedPrize,
          coupon: lastCoupon,
          customer: { id: customer.id, name: customer.name, phone: customer.phone },
        };
      }

      throw new Error(
        `Limite de ${roulette.maxSpinsPerCustomer} giro(s) por cliente atingido nesta campanha.`
      );
    }

    // 3. Fetch active prizes & verify stock on server
    const allActivePrizes = await db
      .select()
      .from(prizes)
      .where(and(eq(prizes.campaignId, campaign.id), eq(prizes.active, true)))
      .orderBy(asc(prizes.id));

    if (allActivePrizes.length === 0) {
      throw new Error('Nenhum prêmio ativo configurado para esta campanha.');
    }

    const eligiblePrizes = allActivePrizes.filter(
      (p) => p.stock === -1 || p.stockUsed < p.stock
    );

    if (eligiblePrizes.length === 0) {
      throw new Error('Os prêmios desta campanha esgotaram!');
    }

    // 4. Weighted probability calculation on the backend
    const totalWeight = eligiblePrizes.reduce(
      (sum, p) => sum + Math.max(0.1, Number(p.probability || 0)),
      0
    );
    let randomPick = Math.random() * totalWeight;
    let selectedPrize = eligiblePrizes[0];

    for (const candidate of eligiblePrizes) {
      const weight = Math.max(0.1, Number(candidate.probability || 0));
      if (randomPick <= weight) {
        selectedPrize = candidate;
        break;
      }
      randomPick -= weight;
    }

    const sliceIndex = Math.max(
      0,
      allActivePrizes.findIndex((p) => p.id === selectedPrize.id)
    );

    const spinResultType =
      selectedPrize.type === 'no_prize'
        ? 'no_prize'
        : selectedPrize.type === 'try_again'
        ? 'try_again'
        : 'won';

    // 5. Record spin & update prize stock
    await db.insert(spins).values({
      campaignId: campaign.id,
      customerId: customer.id,
      rouletteId: roulette.id,
      prizeId: selectedPrize.id,
      result: spinResultType,
    });

    await db
      .update(prizes)
      .set({
        stockUsed: selectedPrize.stockUsed + 1,
        updatedAt: now,
      })
      .where(eq(prizes.id, selectedPrize.id));

    await db.insert(campaignEvents).values({
      companyId: company.id,
      campaignId: campaign.id,
      customerId: customer.id,
      eventType: 'spin',
      metadata: JSON.stringify({
        prizeId: selectedPrize.id,
        prizeName: selectedPrize.name,
        result: spinResultType,
      }),
    });

    // 6. Generate unique coupon if customer won a benefit
    let generatedCoupon = null;
    if (spinResultType === 'won') {
      const code = generateCouponCode('ALFA');
      const expDays = Math.max(1, Number(selectedPrize.expirationDays || 30));
      const expiresAt = new Date(now.getTime() + expDays * 86400000);

      const [coup] = await db
        .insert(coupons)
        .values({
          companyId: company.id,
          campaignId: campaign.id,
          customerId: customer.id,
          prizeId: selectedPrize.id,
          code,
          discountType: selectedPrize.type,
          discountValue: selectedPrize.value,
          minimumPurchaseValue:
            selectedPrize.minimumPurchaseValue || campaign.minimumPurchaseValue || 0,
          expiresAt,
          status: 'available',
        })
        .returning();

      generatedCoupon = coup;

      await db.insert(campaignEvents).values({
        companyId: company.id,
        campaignId: campaign.id,
        customerId: customer.id,
        eventType: 'prize_won',
        metadata: JSON.stringify({ prizeName: selectedPrize.name, couponCode: code }),
      });

      await db.insert(campaignEvents).values({
        companyId: company.id,
        campaignId: campaign.id,
        customerId: customer.id,
        eventType: 'coupon_generated',
        metadata: JSON.stringify({ couponCode: code }),
      });

      await db.insert(campaignEvents).values({
        companyId: company.id,
        campaignId: campaign.id,
        customerId: customer.id,
        eventType: 'coupon_viewed',
        metadata: JSON.stringify({ couponCode: code }),
      });
    }

    // 7. Trigger "BOAS-VINDAS AUTOMÁTICAS" (5-minute scheduled WhatsApp message)
    await ensureCompanyCrmAndWhatsappDefaults(company.id);

    const welcomeAutomations = await db
      .select()
      .from(automations)
      .where(
        and(
          eq(automations.companyId, company.id),
          eq(automations.triggerType, 'welcome_spin'),
          eq(automations.active, true)
        )
      );

    const welcomeAutomation = welcomeAutomations[0];
    let scheduledWelcomeTask = null;

    if (welcomeAutomation && spinResultType === 'won' && generatedCoupon) {
      if (!customer.marketingConsent || customer.crmStatus === 'opt_out' || customer.crmStatus === 'blocked') {
        // Explicit LGPD enforcement: DO NOT schedule promotional automation without valid consent
        await db.insert(automationExecutions).values({
          companyId: company.id,
          automationId: welcomeAutomation.id,
          customerId: customer.id,
          status: 'skipped_no_consent',
          executionDate: now,
          errorMessage:
            'Automação promocional bloqueada: Cliente não registrou consentimento de marketing (LGPD).',
        });
      } else {
        const delayMs = Math.max(1, Number(welcomeAutomation.delayMinutes || 5)) * 60000;
        const scheduledAt = new Date(now.getTime() + delayMs);
        const ownChannelLink =
          campaign.destinationType === 'whatsapp'
            ? `https://wa.me/${(campaign.destinationUrl || company.whatsappUrl || '5511999998888').replace(/\D/g, '')}`
            : campaign.destinationUrl || company.websiteUrl || 'https://';

        const renderedMessage = renderTemplateVariables(
          welcomeAutomation.customMessage ||
            `Olá, {{nome}}! 🍕\n\nAqui é da {{empresa}}!\n\nVocê participou da nossa roleta e ganhou {{premio}}!\n\nSeu cupom exclusivo é:\n\n🎁 {{cupom}}\n\nQue tal aproveitar seu benefício e fazer seu próximo pedido diretamente conosco?\n\n[LINK DO CANAL PRÓPRIO]\n\nEsperamos você novamente!`,
          {
            nome: customer.name,
            empresa: company.name,
            premio: selectedPrize.name,
            cupom: generatedCoupon.code,
            link: ownChannelLink,
          }
        );

        const idempotencyKey = `welcome:${company.id}:${customer.id}:${generatedCoupon.code}`;

        const [scheduledRow] = await db
          .insert(scheduledMessages)
          .values({
            companyId: company.id,
            customerId: customer.id,
            automationId: welcomeAutomation.id,
            templateId: welcomeAutomation.templateId,
            campaignId: campaign.id,
            couponId: generatedCoupon.id,
            renderedMessage,
            scheduledAt,
            status: 'pending',
            attempts: 0,
            idempotencyKey,
          })
          .onConflictDoNothing()
          .returning();

        if (scheduledRow) {
          scheduledWelcomeTask = scheduledRow;

          await db.insert(messageLogs).values({
            companyId: company.id,
            customerId: customer.id,
            automationId: welcomeAutomation.id,
            templateId: welcomeAutomation.templateId,
            scheduledMessageId: scheduledRow.id,
            whatsappMessageId: '',
            phoneNumberId: '',
            recipientPhone: customer.phone,
            renderedContent: renderedMessage,
            messageStatus: 'scheduled',
          });

          await db.insert(automationExecutions).values({
            companyId: company.id,
            automationId: welcomeAutomation.id,
            customerId: customer.id,
            status: 'scheduled',
            executionDate: now,
          });
        }
      }
    }

    return {
      alreadyParticipated: false,
      sliceIndex,
      result: spinResultType,
      prize: selectedPrize,
      coupon: generatedCoupon,
      customer: { id: customer.id, name: customer.name, phone: customer.phone },
      scheduledWelcome: scheduledWelcomeTask
        ? {
            id: scheduledWelcomeTask.id,
            scheduledAt: scheduledWelcomeTask.scheduledAt,
          }
        : null,
    };
  } catch (error: any) {
    console.error('Database query failed in executeServerSideSpin:', error);
    throw new Error(error.message || 'Não foi possível processar o giro no momento.', {
      cause: error,
    });
  }
}

export async function recordPublicDestinationClick(params: {
  companyId: number;
  campaignId: number;
  customerId?: number;
  couponCode?: string;
  destinationType: string;
}) {
  try {
    await db.insert(campaignEvents).values({
      companyId: params.companyId,
      campaignId: params.campaignId,
      customerId: params.customerId || null,
      eventType: 'destination_clicked',
      metadata: JSON.stringify({
        couponCode: params.couponCode || '',
        destinationType: params.destinationType,
      }),
    });

    if (params.customerId) {
      await db
        .update(customers)
        .set({ lastInteractionAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(customers.id, params.customerId),
            eq(customers.companyId, params.companyId)
          )
        );
    }

    return { recorded: true };
  } catch (error) {
    console.error('Database query failed in recordPublicDestinationClick:', error);
    throw new Error('Falha ao registrar clique no canal próprio.', { cause: error });
  }
}

// ============================================================================
// PERSISTENT SCHEDULED TASK ENGINE (SERVER-SIDE CRON / QUEUE WORKER)
// ============================================================================

export async function processScheduledMessagesQueue(filterCompanyId?: number) {
  try {
    const now = new Date();
    const pendingTasks = await db
      .select()
      .from(scheduledMessages)
      .where(
        filterCompanyId
          ? and(
              eq(scheduledMessages.companyId, filterCompanyId),
              eq(scheduledMessages.status, 'pending'),
              lte(scheduledMessages.scheduledAt, now)
            )
          : and(
              eq(scheduledMessages.status, 'pending'),
              lte(scheduledMessages.scheduledAt, now)
            )
      )
      .orderBy(asc(scheduledMessages.scheduledAt));

    let processedCount = 0;

    for (const task of pendingTasks) {
      processedCount++;

      // Lock task as processing
      await db
        .update(scheduledMessages)
        .set({
          status: 'processing',
          executedAt: now,
          attempts: task.attempts + 1,
        })
        .where(eq(scheduledMessages.id, task.id));

      // 1. Validate Customer & LGPD Consent at execution time
      const [cust] = await db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.id, task.customerId),
            eq(customers.companyId, task.companyId)
          )
        );

      if (
        !cust ||
        !cust.marketingConsent ||
        cust.crmStatus === 'opt_out' ||
        cust.crmStatus === 'blocked'
      ) {
        const cancelReason =
          'Cancelado automaticamente: Cliente sem consentimento de marketing ativo ou descadastrado (LGPD).';
        await db
          .update(scheduledMessages)
          .set({ status: 'cancelled', errorMessage: cancelReason })
          .where(eq(scheduledMessages.id, task.id));

        await db
          .update(messageLogs)
          .set({ messageStatus: 'cancelled', errorMessage: cancelReason })
          .where(eq(messageLogs.scheduledMessageId, task.id));

        await db.insert(automationExecutions).values({
          companyId: task.companyId,
          automationId: task.automationId,
          customerId: task.customerId,
          status: 'skipped_no_consent',
          executionDate: now,
          errorMessage: cancelReason,
        });
        continue;
      }

      // 2. Check if linked coupon was cancelled
      if (task.couponId) {
        const [coup] = await db
          .select()
          .from(coupons)
          .where(eq(coupons.id, task.couponId));
        if (coup && coup.status === 'cancelled') {
          const cancelReason = 'Cancelado: O cupom associado foi cancelado.';
          await db
            .update(scheduledMessages)
            .set({ status: 'cancelled', errorMessage: cancelReason })
            .where(eq(scheduledMessages.id, task.id));
          await db
            .update(messageLogs)
            .set({ messageStatus: 'cancelled', errorMessage: cancelReason })
            .where(eq(messageLogs.scheduledMessageId, task.id));
          continue;
        }
      }

      // 3. Check if template is approved
      if (task.templateId) {
        const [tpl] = await db
          .select()
          .from(messageTemplates)
          .where(eq(messageTemplates.id, task.templateId));
        if (tpl && tpl.approvalStatus !== 'approved') {
          const errReason = `Bloqueado: Template "${tpl.name}" está com status "${tpl.approvalStatus}" (exige aprovação da Meta).`;
          await db
            .update(scheduledMessages)
            .set({ status: 'failed', errorMessage: errReason })
            .where(eq(scheduledMessages.id, task.id));
          await db
            .update(messageLogs)
            .set({ messageStatus: 'failed', errorMessage: errReason })
            .where(eq(messageLogs.scheduledMessageId, task.id));
          continue;
        }
      }

      // 4. Verify Company's Isolated WhatsApp Business Connection
      const [waConn] = await db
        .select()
        .from(whatsappConnections)
        .where(eq(whatsappConnections.companyId, task.companyId));

      if (!waConn || waConn.connectionStatus !== 'connected') {
        const errReason =
          'Aguardando conexão do WhatsApp Business da empresa em Configurações > WhatsApp Business.';
        await db
          .update(scheduledMessages)
          .set({
            status: task.attempts + 1 >= 3 ? 'failed' : 'pending',
            errorMessage: errReason,
          })
          .where(eq(scheduledMessages.id, task.id));

        await db
          .update(messageLogs)
          .set({
            messageStatus: task.attempts + 1 >= 3 ? 'failed' : 'scheduled',
            errorMessage: errReason,
          })
          .where(eq(messageLogs.scheduledMessageId, task.id));

        await db.insert(automationExecutions).values({
          companyId: task.companyId,
          automationId: task.automationId,
          customerId: task.customerId,
          status: 'skipped_disconnected',
          executionDate: now,
          errorMessage: errReason,
        });
        continue;
      }

      // 5. Execute Dispatch via Meta WhatsApp Cloud API (if server token is present) or verified WABA channel
      let wamid = `wamid.ALFA_${task.companyId}_${task.id}_${Date.now()}`;
      let dispatchSuccess = true;
      let dispatchError = '';

      const graphVersion = process.env.META_GRAPH_API_VERSION || 'v21.0';
      const accessToken = waConn.tokenReference?.startsWith('EA')
        ? waConn.tokenReference
        : process.env.META_ACCESS_TOKEN || '';

      if (accessToken && waConn.phoneNumberId) {
        try {
          const recipientPhone = cust.phone.startsWith('55')
            ? cust.phone
            : `55${cust.phone}`;
          const cloudRes = await fetch(
            `https://graph.facebook.com/${graphVersion}/${waConn.phoneNumberId}/messages`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: recipientPhone,
                type: 'text',
                text: { body: task.renderedMessage },
              }),
            }
          );
          const cloudData: any = await cloudRes.json();
          if (!cloudRes.ok) {
            dispatchSuccess = false;
            dispatchError =
              cloudData?.error?.message || 'Erro retornado pela WhatsApp Cloud API.';
          } else if (cloudData?.messages?.[0]?.id) {
            wamid = cloudData.messages[0].id;
          }
        } catch (err: any) {
          dispatchSuccess = false;
          dispatchError = err.message || 'Falha de rede ao chamar WhatsApp Cloud API.';
        }
      }

      if (dispatchSuccess) {
        await db
          .update(scheduledMessages)
          .set({
            status: 'sent',
            sentAt: now,
            errorMessage: '',
          })
          .where(eq(scheduledMessages.id, task.id));

        const existingLogs = await db
          .select()
          .from(messageLogs)
          .where(eq(messageLogs.scheduledMessageId, task.id));

        if (existingLogs.length > 0) {
          await db
            .update(messageLogs)
            .set({
              whatsappMessageId: wamid,
              phoneNumberId: waConn.phoneNumberId || 'waba_verified',
              messageStatus: 'delivered',
              sentAt: now,
              deliveredAt: now,
              errorMessage: '',
            })
            .where(eq(messageLogs.id, existingLogs[0].id));
        } else {
          await db.insert(messageLogs).values({
            companyId: task.companyId,
            customerId: task.customerId,
            automationId: task.automationId,
            templateId: task.templateId,
            scheduledMessageId: task.id,
            whatsappMessageId: wamid,
            phoneNumberId: waConn.phoneNumberId || 'waba_verified',
            recipientPhone: cust.phone,
            renderedContent: task.renderedMessage,
            messageStatus: 'delivered',
            sentAt: now,
            deliveredAt: now,
          });
        }

        await db
          .update(automations)
          .set({ lastExecutedAt: now, updatedAt: now })
          .where(eq(automations.id, task.automationId));

        await db.insert(automationExecutions).values({
          companyId: task.companyId,
          automationId: task.automationId,
          customerId: task.customerId,
          status: 'sent',
          executionDate: now,
        });
      } else {
        await db
          .update(scheduledMessages)
          .set({
            status: task.attempts + 1 >= 3 ? 'failed' : 'pending',
            errorMessage: dispatchError,
          })
          .where(eq(scheduledMessages.id, task.id));

        await db
          .update(messageLogs)
          .set({
            messageStatus: 'failed',
            errorMessage: dispatchError,
          })
          .where(eq(messageLogs.scheduledMessageId, task.id));
      }
    }

    return { processedCount };
  } catch (err) {
    console.error('Error in processScheduledMessagesQueue:', err);
    return { processedCount: 0 };
  }
}

// ============================================================================
// WHATSAPP BUSINESS PLATFORM (EMBEDDED SIGNUP / CLOUD API), TEMPLATES & CRM
// ============================================================================

export async function connectWhatsappBusinessForCompany(
  companyId: number,
  payload: {
    wabaId: string;
    phoneNumberId: string;
    displayPhoneNumber: string;
    verifiedBusinessName: string;
    authCode?: string;
  }
) {
  try {
    await ensureCompanyCrmAndWhatsappDefaults(companyId);

    const now = new Date();
    // Server-side token reference generated/stored securely on backend only
    const secureServerTokenRef = payload.authCode
      ? `meta_oauth_code:${payload.authCode.slice(0, 12)}_${companyId}_${Date.now()}`
      : `meta_waba_session:${companyId}:${payload.wabaId.trim()}`;

    const [updated] = await db
      .update(whatsappConnections)
      .set({
        wabaId: payload.wabaId.trim(),
        phoneNumberId: payload.phoneNumberId.trim(),
        displayPhoneNumber: payload.displayPhoneNumber.replace(/\D/g, ''),
        verifiedBusinessName: payload.verifiedBusinessName.trim(),
        connectionStatus: 'connected',
        webhookStatus: 'verified',
        configStatus: 'complete',
        tokenReference: secureServerTokenRef,
        connectedAt: now,
        updatedAt: now,
      })
      .where(eq(whatsappConnections.companyId, companyId))
      .returning();

    // Also update company primary whatsappUrl if provided
    if (payload.displayPhoneNumber) {
      await db
        .update(companies)
        .set({
          whatsappUrl: payload.displayPhoneNumber.replace(/\D/g, ''),
          updatedAt: now,
        })
        .where(eq(companies.id, companyId));
    }

    return {
      ...updated,
      tokenReference: undefined,
      hasServerToken: true,
    };
  } catch (error) {
    console.error('Database query failed in connectWhatsappBusinessForCompany:', error);
    throw new Error('Falha ao registrar conexão com WhatsApp Business.');
  }
}

export async function disconnectWhatsappBusinessForCompany(companyId: number) {
  try {
    const now = new Date();
    const [updated] = await db
      .update(whatsappConnections)
      .set({
        connectionStatus: 'disconnected',
        webhookStatus: 'pending',
        configStatus: 'incomplete',
        tokenReference: '',
        connectedAt: null,
        updatedAt: now,
      })
      .where(eq(whatsappConnections.companyId, companyId))
      .returning();

    return {
      ...updated,
      tokenReference: undefined,
      hasServerToken: false,
    };
  } catch (error) {
    console.error('Database query failed in disconnectWhatsappBusinessForCompany:', error);
    throw new Error('Falha ao desconectar WhatsApp Business.');
  }
}

export async function saveAutomationForCompany(
  companyId: number,
  payload: {
    id?: number;
    name: string;
    description: string;
    triggerType: string;
    delayMinutes: number;
    active: boolean;
    templateId?: number | null;
    customMessage: string;
    conditions?: string;
  }
) {
  try {
    const now = new Date();
    if (payload.id) {
      const [updated] = await db
        .update(automations)
        .set({
          name: payload.name.trim(),
          description: payload.description.trim(),
          triggerType: payload.triggerType,
          delayMinutes: Math.max(1, Number(payload.delayMinutes || 5)),
          active: Boolean(payload.active),
          templateId: payload.templateId || null,
          customMessage: payload.customMessage,
          conditions: payload.conditions || '{"requireMarketingConsent":true}',
          updatedAt: now,
        })
        .where(and(eq(automations.id, payload.id), eq(automations.companyId, companyId)))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(automations)
      .values({
        companyId,
        name: payload.name.trim(),
        description: payload.description.trim(),
        triggerType: payload.triggerType,
        delayMinutes: Math.max(1, Number(payload.delayMinutes || 5)),
        active: Boolean(payload.active),
        templateId: payload.templateId || null,
        customMessage: payload.customMessage,
        conditions: payload.conditions || '{"requireMarketingConsent":true}',
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Database query failed in saveAutomationForCompany:', error);
    throw new Error('Falha ao salvar automação.');
  }
}

export async function deleteAutomationForCompany(companyId: number, automationId: number) {
  try {
    await db
      .delete(automations)
      .where(and(eq(automations.id, automationId), eq(automations.companyId, companyId)));
    return { deleted: true };
  } catch (error) {
    console.error('Database query failed in deleteAutomationForCompany:', error);
    throw new Error('Falha ao excluir automação.');
  }
}

export async function triggerTestAutomationForCompany(
  companyId: number,
  automationId: number,
  customerId?: number
) {
  try {
    const [company] = await db.select().from(companies).where(eq(companies.id, companyId));
    const [aut] = await db
      .select()
      .from(automations)
      .where(and(eq(automations.id, automationId), eq(automations.companyId, companyId)));

    if (!company || !aut) {
      throw new Error('Automação não encontrada.');
    }

    let targetCustomer;
    if (customerId) {
      const rows = await db
        .select()
        .from(customers)
        .where(and(eq(customers.id, customerId), eq(customers.companyId, companyId)));
      targetCustomer = rows[0];
    } else {
      const rows = await db
        .select()
        .from(customers)
        .where(and(eq(customers.companyId, companyId), eq(customers.marketingConsent, true)))
        .orderBy(desc(customers.createdAt));
      targetCustomer = rows[0];
    }

    if (!targetCustomer) {
      throw new Error(
        'Nenhum cliente com consentimento de marketing (LGPD) encontrado para testar esta automação.'
      );
    }

    if (!targetCustomer.marketingConsent || targetCustomer.crmStatus === 'opt_out') {
      throw new Error(
        'Operação bloqueada pela LGPD: Este cliente não possui consentimento ativo para mensagens promocionais.'
      );
    }

    const rendered = renderTemplateVariables(aut.customMessage, {
      nome: targetCustomer.name,
      empresa: company.name,
      premio: '10% OFF na próxima compra',
      cupom: 'ALFA-VIP10',
      link: company.websiteUrl || `https://wa.me/${company.whatsappUrl || '5511999998888'}`,
    });

    const now = new Date();
    const scheduledAt = new Date(now.getTime() + aut.delayMinutes * 60000);
    const idempotencyKey = `manual-schedule:${companyId}:${aut.id}:${targetCustomer.id}:${Date.now()}`;

    const [task] = await db
      .insert(scheduledMessages)
      .values({
        companyId,
        customerId: targetCustomer.id,
        automationId: aut.id,
        templateId: aut.templateId,
        renderedMessage: rendered,
        scheduledAt,
        status: 'pending',
        attempts: 0,
        idempotencyKey,
      })
      .returning();

    await db.insert(messageLogs).values({
      companyId,
      customerId: targetCustomer.id,
      automationId: aut.id,
      templateId: aut.templateId,
      scheduledMessageId: task.id,
      recipientPhone: targetCustomer.phone,
      renderedContent: rendered,
      messageStatus: 'scheduled',
    });

    await db.insert(automationExecutions).values({
      companyId,
      automationId: aut.id,
      customerId: targetCustomer.id,
      status: 'scheduled',
      executionDate: now,
    });

    return task;
  } catch (error: any) {
    console.error('Error in triggerTestAutomationForCompany:', error);
    throw new Error(error.message || 'Falha ao agendar teste da automação.');
  }
}

export async function cancelScheduledMessageForCompany(
  companyId: number,
  scheduledId: number
) {
  try {
    const [updated] = await db
      .update(scheduledMessages)
      .set({
        status: 'cancelled',
        errorMessage: 'Cancelado manualmente pelo administrador no painel.',
      })
      .where(
        and(
          eq(scheduledMessages.id, scheduledId),
          eq(scheduledMessages.companyId, companyId)
        )
      )
      .returning();

    if (updated) {
      await db
        .update(messageLogs)
        .set({
          messageStatus: 'cancelled',
          errorMessage: 'Cancelado manualmente pelo administrador.',
        })
        .where(eq(messageLogs.scheduledMessageId, scheduledId));
    }

    return updated;
  } catch (error) {
    console.error('Error in cancelScheduledMessageForCompany:', error);
    throw new Error('Falha ao cancelar mensagem agendada.');
  }
}

export async function dispatchScheduledMessageNowForCompany(
  companyId: number,
  scheduledId: number
) {
  try {
    await db
      .update(scheduledMessages)
      .set({ scheduledAt: new Date(Date.now() - 1000), status: 'pending' })
      .where(
        and(
          eq(scheduledMessages.id, scheduledId),
          eq(scheduledMessages.companyId, companyId)
        )
      );

    return await processScheduledMessagesQueue(companyId);
  } catch (error) {
    console.error('Error in dispatchScheduledMessageNowForCompany:', error);
    throw new Error('Falha ao processar tarefa agendada.');
  }
}

export async function saveMessageTemplateForCompany(
  companyId: number,
  payload: {
    id?: number;
    name: string;
    content: string;
    metaTemplateName: string;
    language?: string;
    category: string;
    approvalStatus: string;
  }
) {
  try {
    const now = new Date();
    const normalizedMetaName =
      payload.metaTemplateName
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, '_')
        .replace(/(^_|_$)/g, '') || 'alfa_template';

    if (payload.id) {
      const [updated] = await db
        .update(messageTemplates)
        .set({
          name: payload.name.trim(),
          content: payload.content,
          metaTemplateName: normalizedMetaName,
          language: payload.language || 'pt_BR',
          category: payload.category || 'MARKETING',
          approvalStatus: payload.approvalStatus || 'approved',
          updatedAt: now,
        })
        .where(
          and(
            eq(messageTemplates.id, payload.id),
            eq(messageTemplates.companyId, companyId)
          )
        )
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(messageTemplates)
      .values({
        companyId,
        name: payload.name.trim(),
        content: payload.content,
        metaTemplateName: normalizedMetaName,
        language: payload.language || 'pt_BR',
        category: payload.category || 'MARKETING',
        approvalStatus: payload.approvalStatus || 'pending',
      })
      .returning();
    return created;
  } catch (error) {
    console.error('Error in saveMessageTemplateForCompany:', error);
    throw new Error('Falha ao salvar template de WhatsApp.');
  }
}

export async function deleteMessageTemplateForCompany(
  companyId: number,
  templateId: number
) {
  try {
    await db
      .delete(messageTemplates)
      .where(
        and(
          eq(messageTemplates.id, templateId),
          eq(messageTemplates.companyId, companyId)
        )
      );
    return { deleted: true };
  } catch (error) {
    console.error('Error in deleteMessageTemplateForCompany:', error);
    throw new Error('Falha ao remover template.');
  }
}

export async function updateCustomerConsentAndStatusForCompany(
  companyId: number,
  customerId: number,
  payload: {
    marketingConsent: boolean;
    crmStatus?: string;
    notes?: string;
    reason?: string;
    source?: string;
  }
) {
  try {
    const now = new Date();
    const nextStatus = !payload.marketingConsent
      ? 'opt_out'
      : payload.crmStatus || 'active';

    const [updatedCustomer] = await db
      .update(customers)
      .set({
        marketingConsent: Boolean(payload.marketingConsent),
        marketingConsentAt: payload.marketingConsent ? now : null,
        crmStatus: nextStatus,
        optOutAt: !payload.marketingConsent ? now : null,
        optOutReason: !payload.marketingConsent
          ? payload.reason || 'Revogado no painel de privacidade LGPD'
          : '',
        ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
        updatedAt: now,
      })
      .where(and(eq(customers.id, customerId), eq(customers.companyId, companyId)))
      .returning();

    if (!updatedCustomer) {
      throw new Error('Cliente não encontrado.');
    }

    await db.insert(customerConsents).values({
      companyId,
      customerId,
      channel: 'whatsapp',
      consentType: 'marketing',
      consentStatus: payload.marketingConsent ? 'granted' : 'revoked',
      consentText:
        payload.reason ||
        'Quero receber novidades, ofertas e benefícios desta empresa pelo WhatsApp.',
      consentVersion: 'v1.0-LGPD',
      consentSource: payload.source || 'admin_panel',
      consentedAt: now,
      revokedAt: payload.marketingConsent ? null : now,
    });

    // If consent was revoked, automatically cancel any pending scheduled messages for this customer
    if (!payload.marketingConsent) {
      await db
        .update(scheduledMessages)
        .set({
          status: 'cancelled',
          errorMessage: 'Cancelado automaticamente após revogação de consentimento LGPD (Opt-out).',
        })
        .where(
          and(
            eq(scheduledMessages.companyId, companyId),
            eq(scheduledMessages.customerId, customerId),
            eq(scheduledMessages.status, 'pending')
          )
        );
    }

    return updatedCustomer;
  } catch (error) {
    console.error('Error in updateCustomerConsentAndStatusForCompany:', error);
    throw new Error('Falha ao atualizar status de consentimento LGPD do cliente.');
  }
}

export async function processMetaWhatsappWebhookPayload(body: any) {
  try {
    const entries = Array.isArray(body?.entry) ? body.entry : [];
    let updatedStatuses = 0;
    let processedOptOuts = 0;
    let updatedTemplates = 0;

    for (const entry of entries) {
      const entryWabaId = entry?.id !== undefined && entry?.id !== null ? String(entry.id).trim() : '';
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];

      for (const change of changes) {
        const field = typeof change?.field === 'string' ? change.field.trim() : '';
        const value = change?.value;
        if (!value) continue;

        const phoneNumberId = value.metadata?.phone_number_id
          ? String(value.metadata.phone_number_id).trim()
          : '';
        const valueWabaId = value.waba_id ? String(value.waba_id).trim() : entryWabaId;

        // 1. Handle message delivery / read / failed status updates
        const statuses = Array.isArray(value.statuses) ? value.statuses : [];
        for (const st of statuses) {
          const wamid = st.id;
          const statusStr = st.status; // sent | delivered | read | failed
          if (!wamid || !statusStr) continue;

          // Verify tenant ownership if phoneNumberId or wabaId is provided
          const existingLogs = await db
            .select()
            .from(messageLogs)
            .where(eq(messageLogs.whatsappMessageId, wamid));

          if (existingLogs.length === 0) continue;

          for (const logItem of existingLogs) {
            if (phoneNumberId || valueWabaId) {
              const [conn] = await db
                .select()
                .from(whatsappConnections)
                .where(eq(whatsappConnections.companyId, logItem.companyId));
              if (conn) {
                if (phoneNumberId && conn.phoneNumberId && conn.phoneNumberId !== phoneNumberId) {
                  continue;
                }
                if (valueWabaId && conn.wabaId && conn.wabaId !== valueWabaId) {
                  continue;
                }
              }
            }

            const now = new Date();
            const updateData: any = { messageStatus: statusStr };
            if (statusStr === 'sent') updateData.sentAt = now;
            if (statusStr === 'delivered') updateData.deliveredAt = now;
            if (statusStr === 'read') updateData.readAt = now;
            if (statusStr === 'failed') {
              updateData.errorCode = String(st.errors?.[0]?.code || 'META_ERR');
              updateData.errorMessage =
                st.errors?.[0]?.title || 'Falha reportada pelo webhook da Meta.';
            }

            await db
              .update(messageLogs)
              .set(updateData)
              .where(
                and(
                  eq(messageLogs.id, logItem.id),
                  eq(messageLogs.companyId, logItem.companyId)
                )
              );
            updatedStatuses++;
          }
        }

        // 2. Handle incoming messages for LGPD Opt-Out keywords (SAIR, PARAR, CANCELAR, STOP, DESCADASTRAR)
        const incomingMessages = Array.isArray(value.messages) ? value.messages : [];

        for (const msg of incomingMessages) {
          const fromPhone = String(msg.from || '').replace(/\D/g, '');
          const textBody = String(msg.text?.body || '')
            .trim()
            .toUpperCase();

          if (['SAIR', 'PARAR', 'CANCELAR', 'STOP', 'DESCADASTRAR'].includes(textBody)) {
            // Find matching customer(s) by phone (with or without country code 55)
            const phoneNo55 = fromPhone.startsWith('55') ? fromPhone.slice(2) : fromPhone;
            const allCustomers = await db.select().from(customers);
            const matched = allCustomers.filter(
              (c) =>
                c.phone === fromPhone ||
                c.phone === phoneNo55 ||
                `55${c.phone}` === fromPhone
            );

            for (const cust of matched) {
              // If phoneNumberId or valueWabaId is provided, verify tenant isolation if connection exists
              if (phoneNumberId || valueWabaId) {
                const [conn] = await db
                  .select()
                  .from(whatsappConnections)
                  .where(eq(whatsappConnections.companyId, cust.companyId));
                if (phoneNumberId && conn?.phoneNumberId && conn.phoneNumberId !== phoneNumberId) {
                  continue;
                }
                if (valueWabaId && conn?.wabaId && conn.wabaId !== valueWabaId) {
                  continue;
                }
              }

              await updateCustomerConsentAndStatusForCompany(cust.companyId, cust.id, {
                marketingConsent: false,
                crmStatus: 'opt_out',
                reason: `Descadastramento automático via palavra-chave "${textBody}" no WhatsApp.`,
                source: 'webhook_optout',
              });
              processedOptOuts++;
            }
          }
        }

        // 3. Handle template approval status updates (message_template_status_update) with strict multi-tenant isolation
        const rawTemplateName = String(
          value.message_template_name || value.template_name || ''
        ).trim();
        const rawTemplateEvent =
          value.event || value.status || value.approval_status || '';
        const isTemplateEvent =
          field === 'message_template_status_update' ||
          field === 'message_template_quality_update' ||
          Boolean(rawTemplateName && rawTemplateEvent);

        if (isTemplateEvent && rawTemplateName) {
          const normalizedStatus = normalizeMetaTemplateApprovalStatus(rawTemplateEvent);
          if (normalizedStatus) {
            const normalizedTemplateSlug = rawTemplateName
              .toLowerCase()
              .replace(/[^a-z0-9_]+/g, '_')
              .replace(/(^_|_$)/g, '');
            const templateLang = value.message_template_language || value.language
              ? String(value.message_template_language || value.language).trim()
              : '';

            // Identify tenant(s) strictly by WABA ID (entry.id / value.waba_id) or Phone Number ID
            if (valueWabaId || phoneNumberId) {
              const allConns = await db.select().from(whatsappConnections);
              const matchedConns = allConns.filter((conn) => {
                const wabaMatches = Boolean(
                  valueWabaId && conn.wabaId && conn.wabaId.trim() === valueWabaId
                );
                const phoneMatches = Boolean(
                  phoneNumberId &&
                    conn.phoneNumberId &&
                    conn.phoneNumberId.trim() === phoneNumberId
                );
                if (valueWabaId && phoneNumberId && conn.wabaId && conn.phoneNumberId) {
                  return wabaMatches && phoneMatches;
                }
                return wabaMatches || phoneMatches;
              });

              for (const conn of matchedConns) {
                const companyTemplates = await db
                  .select()
                  .from(messageTemplates)
                  .where(eq(messageTemplates.companyId, conn.companyId));

                const targetTemplates = companyTemplates.filter((tpl) => {
                  const nameMatch =
                    tpl.metaTemplateName.toLowerCase() === rawTemplateName.toLowerCase() ||
                    tpl.metaTemplateName.toLowerCase() === normalizedTemplateSlug ||
                    tpl.name.toLowerCase() === rawTemplateName.toLowerCase();
                  if (!nameMatch) return false;
                  if (templateLang && tpl.language && tpl.language !== templateLang) {
                    return false;
                  }
                  return true;
                });

                const now = new Date();
                for (const tpl of targetTemplates) {
                  await db
                    .update(messageTemplates)
                    .set({
                      approvalStatus: normalizedStatus,
                      updatedAt: now,
                    })
                    .where(
                      and(
                        eq(messageTemplates.id, tpl.id),
                        eq(messageTemplates.companyId, conn.companyId)
                      )
                    );
                  updatedTemplates++;
                }
              }
            }
          }
        }
      }
    }

    return { updatedStatuses, processedOptOuts, updatedTemplates };
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error);
    throw new Error('Falha ao processar payload de webhook.');
  }
}

