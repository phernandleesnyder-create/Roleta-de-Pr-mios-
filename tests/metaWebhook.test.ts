import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { eq } from 'drizzle-orm';
import {
  computeMetaHmacSignature,
  verifyMetaWebhookSignature,
  verifyMetaWebhookGetChallenge,
  normalizeMetaTemplateApprovalStatus,
} from '../src/middleware/metaWebhook.ts';
import { processMetaWhatsappWebhookPayload } from '../src/db/repository.ts';
import { db } from '../src/db/index.ts';
import {
  companies,
  whatsappConnections,
  messageTemplates,
  customers,
  messageLogs,
  scheduledMessages,
  automations,
  customerConsents,
} from '../src/db/schema.ts';

async function runTests() {
  console.log('=== Iniciando suíte de testes: Webhooks WhatsApp Cloud API (Alfa Link) ===\n');

  // ---------------------------------------------------------------------------
  // 1. Testes unitários de validação GET (META_WEBHOOK_VERIFY_TOKEN)
  // ---------------------------------------------------------------------------
  console.log('1. Testando validação GET do Webhook e bloqueio sem META_WEBHOOK_VERIFY_TOKEN...');

  // Deve bloquear se META_WEBHOOK_VERIFY_TOKEN não estiver configurado, mesmo se enviarem o antigo fallback
  const missingEnvCheck = verifyMetaWebhookGetChallenge(
    {
      mode: 'subscribe',
      verifyToken: 'alfalink_meta_webhook_verify_token',
      challenge: 'challenge_12345',
    },
    undefined
  );
  assert.equal(missingEnvCheck.valid, false, 'Deve rejeitar quando META_WEBHOOK_VERIFY_TOKEN está ausente');
  assert.equal(missingEnvCheck.statusCode, 403);

  const emptyEnvCheck = verifyMetaWebhookGetChallenge(
    {
      mode: 'subscribe',
      verifyToken: 'alfalink_meta_webhook_verify_token',
      challenge: 'challenge_12345',
    },
    '   '
  );
  assert.equal(emptyEnvCheck.valid, false, 'Deve rejeitar quando META_WEBHOOK_VERIFY_TOKEN está vazio');

  // Deve rejeitar token incorreto
  const wrongTokenCheck = verifyMetaWebhookGetChallenge(
    {
      mode: 'subscribe',
      verifyToken: 'token_invalido_atacante',
      challenge: 'challenge_999',
    },
    'meu_verify_token_producao_seguro'
  );
  assert.equal(wrongTokenCheck.valid, false, 'Deve rejeitar token incorreto');
  assert.equal(wrongTokenCheck.statusCode, 403);

  // Deve aceitar token correto com hub.mode = subscribe
  const validTokenCheck = verifyMetaWebhookGetChallenge(
    {
      mode: 'subscribe',
      verifyToken: 'meu_verify_token_producao_seguro',
      challenge: '192837465',
    },
    'meu_verify_token_producao_seguro'
  );
  assert.equal(validTokenCheck.valid, true, 'Deve aceitar token válido');
  assert.equal(validTokenCheck.statusCode, 200);
  assert.equal(validTokenCheck.challenge, '192837465');
  console.log('   ✓ Validação GET e remoção do token padrão verificadas com sucesso.');

  // ---------------------------------------------------------------------------
  // 2. Testes unitários de validação X-Hub-Signature-256 (HMAC-SHA256)
  // ---------------------------------------------------------------------------
  console.log('2. Testando validação criptográfica X-Hub-Signature-256 (HMAC-SHA256)...');
  const testSecret = 'meta_app_secret_super_confidencial_2026';
  const samplePayload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ id: 'WABA_123', changes: [] }],
  });
  const validSig = computeMetaHmacSignature(samplePayload, testSecret);

  // Sem META_APP_SECRET configurado
  const noSecretSig = verifyMetaWebhookSignature(samplePayload, validSig, '');
  assert.equal(noSecretSig.valid, false);
  assert.equal(noSecretSig.statusCode, 401);

  // Sem header X-Hub-Signature-256
  const missingHeaderSig = verifyMetaWebhookSignature(samplePayload, undefined, testSecret);
  assert.equal(missingHeaderSig.valid, false);
  assert.equal(missingHeaderSig.statusCode, 401);

  // Header malformado
  const malformedSig = verifyMetaWebhookSignature(samplePayload, 'md5=123456', testSecret);
  assert.equal(malformedSig.valid, false);
  assert.equal(malformedSig.statusCode, 403);

  // Assinatura incorreta
  const wrongSecretSig = verifyMetaWebhookSignature(
    samplePayload,
    computeMetaHmacSignature(samplePayload, 'outro_segredo_invalido'),
    testSecret
  );
  assert.equal(wrongSecretSig.valid, false);
  assert.equal(wrongSecretSig.statusCode, 403);

  // Corpo adulterado após assinatura
  const tamperedBody = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{ id: 'WABA_HACKED', changes: [] }],
  });
  const tamperedSig = verifyMetaWebhookSignature(tamperedBody, validSig, testSecret);
  assert.equal(tamperedSig.valid, false, 'Deve rejeitar payload adulterado');
  assert.equal(tamperedSig.statusCode, 403);

  // Assinatura válida com Buffer bruto (rawBody)
  const validBufferCheck = verifyMetaWebhookSignature(
    Buffer.from(samplePayload, 'utf8'),
    validSig,
    testSecret
  );
  assert.equal(validBufferCheck.valid, true, 'Deve aprovar assinatura HMAC-SHA256 legítima');
  assert.equal(validBufferCheck.statusCode, 200);
  console.log('   ✓ Validação X-Hub-Signature-256 (válida, inválida, ausente e adulterada) verificada.');

  // ---------------------------------------------------------------------------
  // 3. Testes de mapeamento de status de templates
  // ---------------------------------------------------------------------------
  console.log('3. Testando mapeamento de eventos de status de templates...');
  assert.equal(normalizeMetaTemplateApprovalStatus('APPROVED'), 'approved');
  assert.equal(normalizeMetaTemplateApprovalStatus('APROVADO'), 'approved');
  assert.equal(normalizeMetaTemplateApprovalStatus('REJECTED'), 'rejected');
  assert.equal(normalizeMetaTemplateApprovalStatus('REJEITADO'), 'rejected');
  assert.equal(normalizeMetaTemplateApprovalStatus('PAUSED'), 'paused');
  assert.equal(normalizeMetaTemplateApprovalStatus('PAUSADO'), 'paused');
  assert.equal(normalizeMetaTemplateApprovalStatus('DISABLED'), 'disabled');
  assert.equal(normalizeMetaTemplateApprovalStatus('DESABILITADO'), 'disabled');
  assert.equal(normalizeMetaTemplateApprovalStatus('EVENTO_DESCONHECIDO'), null);
  console.log('   ✓ Mapeamento de status (APROVADO, REJEITADO, PAUSADO, DESABILITADO) verificado.');

  // ---------------------------------------------------------------------------
  // 4. Testes de Integração HTTP + Banco de Dados Multi-Tenant
  // ---------------------------------------------------------------------------
  console.log('4. Testando endpoints HTTP Express (rawBody) e isolamento Multi-Tenant no PostgreSQL...');

  const testApp = express();
  let testEnvVerifyToken: string | undefined = 'token_verificacao_teste_987';
  let testEnvAppSecret: string | undefined = testSecret;

  testApp.use(
    express.json({
      limit: '2mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = Buffer.from(buf);
      },
    })
  );

  testApp.get('/api/webhooks/whatsapp', (req, res) => {
    const verification = verifyMetaWebhookGetChallenge(
      {
        mode: req.query['hub.mode'],
        verifyToken: req.query['hub.verify_token'],
        challenge: req.query['hub.challenge'],
      },
      testEnvVerifyToken
    );
    if (!verification.valid) {
      return res.status(verification.statusCode).json({ error: verification.error });
    }
    return res.status(200).send(verification.challenge);
  });

  testApp.post('/api/webhooks/whatsapp', async (req: any, res) => {
    const signatureHeader =
      typeof req.headers['x-hub-signature-256'] === 'string'
        ? req.headers['x-hub-signature-256']
        : undefined;
    const sigCheck = verifyMetaWebhookSignature(
      req.rawBody,
      signatureHeader,
      testEnvAppSecret
    );
    if (!sigCheck.valid) {
      return res.status(sigCheck.statusCode).json({ error: sigCheck.error });
    }
    const result = await processMetaWhatsappWebhookPayload(req.body);
    return res.status(200).json({ received: true, ...result });
  });

  const server = http.createServer(testApp);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;

  let companyAId = 0;
  let companyBId = 0;

  try {
    // Criar 2 empresas isoladas para testar multi-tenancy
    const ts = Date.now();
    const [compA] = await db
      .insert(companies)
      .values({
        name: `Empresa Webhook Teste A ${ts}`,
        slug: `empresa-webhook-a-${ts}`,
        status: 'active',
      })
      .returning();
    companyAId = compA.id;

    const [compB] = await db
      .insert(companies)
      .values({
        name: `Empresa Webhook Teste B ${ts}`,
        slug: `empresa-webhook-b-${ts}`,
        status: 'active',
      })
      .returning();
    companyBId = compB.id;

    const wabaA = `WABA_TEST_A_${ts}`;
    const phoneA = `PHONE_TEST_A_${ts}`;
    const wabaB = `WABA_TEST_B_${ts}`;
    const phoneB = `PHONE_TEST_B_${ts}`;

    await db.insert(whatsappConnections).values([
      {
        companyId: companyAId,
        wabaId: wabaA,
        phoneNumberId: phoneA,
        displayPhoneNumber: '5511911111111',
        verifiedBusinessName: 'Empresa A',
        connectionStatus: 'connected',
        webhookStatus: 'verified',
        configStatus: 'complete',
      },
      {
        companyId: companyBId,
        wabaId: wabaB,
        phoneNumberId: phoneB,
        displayPhoneNumber: '5511922222222',
        verifiedBusinessName: 'Empresa B',
        connectionStatus: 'connected',
        webhookStatus: 'verified',
        configStatus: 'complete',
      },
    ]);

    // Criar templates com o MESMO metaTemplateName nas duas empresas para provar isolamento
    const sharedTemplateSlug = `alfa_promo_webhook_${ts}`;
    const [tplA] = await db
      .insert(messageTemplates)
      .values({
        companyId: companyAId,
        name: 'Template Promo A',
        content: 'Olá {{nome}}, oferta da Empresa A!',
        metaTemplateName: sharedTemplateSlug,
        language: 'pt_BR',
        category: 'MARKETING',
        approvalStatus: 'pending',
      })
      .returning();

    const [tplB] = await db
      .insert(messageTemplates)
      .values({
        companyId: companyBId,
        name: 'Template Promo B',
        content: 'Olá {{nome}}, oferta da Empresa B!',
        metaTemplateName: sharedTemplateSlug,
        language: 'pt_BR',
        category: 'MARKETING',
        approvalStatus: 'pending',
      })
      .returning();

    // 4.1 Teste HTTP GET com token válido, token incorreto e sem variável configurada
    const getValidRes = await fetch(
      `${baseUrl}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=token_verificacao_teste_987&hub.challenge=CHALLENGE_OK_777`
    );
    assert.equal(getValidRes.status, 200);
    assert.equal(await getValidRes.text(), 'CHALLENGE_OK_777');

    const getInvalidRes = await fetch(
      `${baseUrl}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=alfalink_meta_webhook_verify_token&hub.challenge=CHALLENGE_OK_777`
    );
    assert.equal(getInvalidRes.status, 403, 'Deve rejeitar o antigo token fallback');

    testEnvVerifyToken = undefined;
    const getMissingEnvRes = await fetch(
      `${baseUrl}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=token_verificacao_teste_987&hub.challenge=CHALLENGE_OK_777`
    );
    assert.equal(getMissingEnvRes.status, 403, 'Deve rejeitar quando META_WEBHOOK_VERIFY_TOKEN não existe');
    testEnvVerifyToken = 'token_verificacao_teste_987';

    // 4.2 Teste HTTP POST sem assinatura e com assinatura inválida
    const unsignedRes = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: samplePayload,
    });
    assert.equal(unsignedRes.status, 401);

    const invalidSigRes = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': 'sha256=0000000000000000000000000000000000000000000000000000000000000000',
      },
      body: samplePayload,
    });
    assert.equal(invalidSigRes.status, 403);

    // 4.3 Teste de Eventos de Aprovação de Templates (APROVADO, REJEITADO, PAUSADO, DESABILITADO) e Isolamento Multi-Tenant
    for (const [incomingEvent, expectedDbStatus] of [
      ['APROVADO', 'approved'],
      ['REJEITADO', 'rejected'],
      ['PAUSADO', 'paused'],
      ['DESABILITADO', 'disabled'],
      ['APPROVED', 'approved'],
    ] as const) {
      const tplPayload = JSON.stringify({
        object: 'whatsapp_business_account',
        entry: [
          {
            id: wabaA,
            changes: [
              {
                field: 'message_template_status_update',
                value: {
                  event: incomingEvent,
                  message_template_name: sharedTemplateSlug,
                  message_template_language: 'pt_BR',
                },
              },
            ],
          },
        ],
      });

      const sig = computeMetaHmacSignature(tplPayload, testSecret);
      const res = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Hub-Signature-256': sig,
        },
        body: tplPayload,
      });

      assert.equal(res.status, 200);
      const data: any = await res.json();
      assert.equal(data.received, true);
      assert.equal(data.updatedTemplates, 1);

      const [updatedTplA] = await db
        .select()
        .from(messageTemplates)
        .where(eq(messageTemplates.id, tplA.id));
      const [untouchedTplB] = await db
        .select()
        .from(messageTemplates)
        .where(eq(messageTemplates.id, tplB.id));

      assert.equal(
        updatedTplA.approvalStatus,
        expectedDbStatus,
        `Template da Empresa A deveria estar com status ${expectedDbStatus} após evento ${incomingEvent}`
      );
      assert.equal(
        untouchedTplB.approvalStatus,
        'pending',
        'Template da Empresa B NÃO pode ser alterado por evento da Empresa A'
      );
    }

    // 4.4 Teste de preservação: Atualização de status de mensagem (statuses) + Opt-Out LGPD (SAIR)
    const [custA] = await db
      .insert(customers)
      .values({
        companyId: companyAId,
        name: 'Cliente A OptOut',
        phone: '11988887777',
        email: 'clientea@teste.com',
        firstSourceChannel: 'WhatsApp',
        marketingConsent: true,
        crmStatus: 'active',
      })
      .returning();

    const [custB] = await db
      .insert(customers)
      .values({
        companyId: companyBId,
        name: 'Cliente B Mesmo Telefone',
        phone: '11988887777',
        email: 'clienteb@teste.com',
        firstSourceChannel: 'WhatsApp',
        marketingConsent: true,
        crmStatus: 'active',
      })
      .returning();

    const [autA] = await db
      .insert(automations)
      .values({
        companyId: companyAId,
        name: 'Boas-vindas A',
        triggerType: 'welcome_spin',
        delayMinutes: 5,
        active: true,
        customMessage: 'Olá!',
      })
      .returning();

    const [schedA] = await db
      .insert(scheduledMessages)
      .values({
        companyId: companyAId,
        customerId: custA.id,
        automationId: autA.id,
        renderedMessage: 'Olá!',
        scheduledAt: new Date(Date.now() + 300000),
        status: 'pending',
        idempotencyKey: `test-sched-${ts}`,
      })
      .returning();

    const testWamid = `wamid.TEST_STATUS_${ts}`;
    const [logA] = await db
      .insert(messageLogs)
      .values({
        companyId: companyAId,
        customerId: custA.id,
        automationId: autA.id,
        whatsappMessageId: testWamid,
        phoneNumberId: phoneA,
        recipientPhone: '11988887777',
        renderedContent: 'Mensagem enviada',
        messageStatus: 'sent',
      })
      .returning();

    const combinedPayload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: wabaA,
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: phoneA },
                statuses: [{ id: testWamid, status: 'read' }],
                messages: [
                  {
                    from: '5511988887777',
                    text: { body: 'SAIR' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    const combinedSig = computeMetaHmacSignature(combinedPayload, testSecret);
    const combinedRes = await fetch(`${baseUrl}/api/webhooks/whatsapp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': combinedSig,
      },
      body: combinedPayload,
    });

    assert.equal(combinedRes.status, 200);
    const combinedData: any = await combinedRes.json();
    assert.equal(combinedData.updatedStatuses, 1);
    assert.equal(combinedData.processedOptOuts, 1);

    const [updatedLogA] = await db
      .select()
      .from(messageLogs)
      .where(eq(messageLogs.id, logA.id));
    assert.equal(updatedLogA.messageStatus, 'read');
    assert.ok(updatedLogA.readAt, 'readAt deve ser preenchido');

    const [updatedCustA] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, custA.id));
    assert.equal(updatedCustA.marketingConsent, false);
    assert.equal(updatedCustA.crmStatus, 'opt_out');

    const [updatedSchedA] = await db
      .select()
      .from(scheduledMessages)
      .where(eq(scheduledMessages.id, schedA.id));
    assert.equal(updatedSchedA.status, 'cancelled', 'Agendamento pendente do cliente que pediu SAIR deve ser cancelado');

    const [untouchedCustB] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, custB.id));
    assert.equal(
      untouchedCustB.marketingConsent,
      true,
      'Cliente B (outra empresa) com o mesmo telefone deve manter seu consentimento intacto'
    );

    console.log('   ✓ Endpoints HTTP, aprovação/rejeição/pausa/desabilitação de templates, status de mensagens, Opt-Out LGPD e isolamento Multi-Tenant verificados.');
  } finally {
    // Limpar registros de teste criados no banco
    if (companyAId) {
      await db.delete(customerConsents).where(eq(customerConsents.companyId, companyAId));
      await db.delete(companies).where(eq(companies.id, companyAId));
    }
    if (companyBId) {
      await db.delete(customerConsents).where(eq(customerConsents.companyId, companyBId));
      await db.delete(companies).where(eq(companies.id, companyBId));
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log('\n=== TODOS OS TESTES PASSARAM COM SUCESSO! ===');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('FALHA NOS TESTES DE WEBHOOK:', err);
  process.exit(1);
});
