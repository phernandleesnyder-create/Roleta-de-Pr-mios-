import crypto from 'crypto';

export interface SignatureVerificationResult {
  valid: boolean;
  statusCode: number;
  error?: string;
}

export interface WebhookChallengeVerificationResult {
  valid: boolean;
  statusCode: number;
  challenge?: string;
  error?: string;
}

/**
 * Performs a constant-time comparison between two strings to prevent timing attacks.
 */
export function safeCompareStrings(expected: string, provided: string): boolean {
  const expectedBuf = Buffer.from(expected, 'utf8');
  const providedBuf = Buffer.from(provided, 'utf8');

  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

/**
 * Generates an HMAC-SHA256 signature header in Meta's format: "sha256=<hex>"
 */
export function computeMetaHmacSignature(rawBody: Buffer | string, appSecret: string): string {
  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
  const digest = crypto.createHmac('sha256', appSecret).update(bodyBuffer).digest('hex');
  return `sha256=${digest}`;
}

/**
 * Validates the X-Hub-Signature-256 header sent by Meta on POST webhook requests
 * using the raw request body buffer and META_APP_SECRET.
 */
export function verifyMetaWebhookSignature(
  rawBody: Buffer | string | undefined,
  signatureHeader: string | undefined,
  appSecret: string | undefined
): SignatureVerificationResult {
  const cleanSecret = typeof appSecret === 'string' ? appSecret.trim() : '';
  if (!cleanSecret) {
    console.error(
      '[Meta Webhook] Erro de configuração: A variável META_APP_SECRET não está configurada no servidor. Requisição POST rejeitada.'
    );
    return {
      valid: false,
      statusCode: 401,
      error: 'Configuração de segurança do Webhook ausente no servidor.',
    };
  }

  if (!signatureHeader || typeof signatureHeader !== 'string' || !signatureHeader.trim()) {
    return {
      valid: false,
      statusCode: 401,
      error: 'Assinatura X-Hub-Signature-256 ausente.',
    };
  }

  const normalizedHeader = signatureHeader.trim();
  if (!normalizedHeader.startsWith('sha256=')) {
    return {
      valid: false,
      statusCode: 403,
      error: 'Formato de assinatura X-Hub-Signature-256 inválido.',
    };
  }

  if (rawBody === undefined || rawBody === null) {
    return {
      valid: false,
      statusCode: 401,
      error: 'Corpo bruto (raw body) da requisição indisponível para verificação de assinatura.',
    };
  }

  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8');
  if (bodyBuffer.length === 0) {
    return {
      valid: false,
      statusCode: 401,
      error: 'Corpo da requisição vazio.',
    };
  }

  const expectedSignature = computeMetaHmacSignature(bodyBuffer, cleanSecret);
  const isMatch = safeCompareStrings(expectedSignature, normalizedHeader);

  if (!isMatch) {
    return {
      valid: false,
      statusCode: 403,
      error: 'Assinatura X-Hub-Signature-256 inválida.',
    };
  }

  return {
    valid: true,
    statusCode: 200,
  };
}

/**
 * Validates Meta's GET webhook verification handshake (hub.mode, hub.verify_token, hub.challenge).
 * Does NOT allow any fallback token: requires META_WEBHOOK_VERIFY_TOKEN to be explicitly configured.
 */
export function verifyMetaWebhookGetChallenge(
  query: {
    mode?: unknown;
    verifyToken?: unknown;
    challenge?: unknown;
  },
  configuredVerifyToken: string | undefined
): WebhookChallengeVerificationResult {
  const expectedToken =
    typeof configuredVerifyToken === 'string' ? configuredVerifyToken.trim() : '';

  if (!expectedToken) {
    console.error(
      '[Meta Webhook] Erro de configuração: A variável META_WEBHOOK_VERIFY_TOKEN não está configurada no ambiente. Validação GET do webhook impedida.'
    );
    return {
      valid: false,
      statusCode: 403,
      error: 'META_WEBHOOK_VERIFY_TOKEN não configurado no ambiente do servidor.',
    };
  }

  const mode = typeof query.mode === 'string' ? query.mode.trim() : '';
  const providedToken = typeof query.verifyToken === 'string' ? query.verifyToken : '';
  const challenge =
    query.challenge !== undefined && query.challenge !== null ? String(query.challenge) : '';

  if (mode !== 'subscribe' || !providedToken) {
    return {
      valid: false,
      statusCode: 403,
      error: 'Token de verificação ou modo do Webhook inválido.',
    };
  }

  const isTokenValid = safeCompareStrings(expectedToken, providedToken);
  if (!isTokenValid) {
    return {
      valid: false,
      statusCode: 403,
      error: 'Token de verificação do Webhook inválido.',
    };
  }

  return {
    valid: true,
    statusCode: 200,
    challenge,
  };
}

/**
 * Maps Meta template status update events (and Portuguese equivalents) to internal approvalStatus values.
 */
export function normalizeMetaTemplateApprovalStatus(
  rawStatus: unknown
): 'approved' | 'rejected' | 'paused' | 'disabled' | 'pending' | null {
  if (typeof rawStatus !== 'string') return null;
  const upper = rawStatus.trim().toUpperCase();

  switch (upper) {
    case 'APPROVED':
    case 'APROVADO':
    case 'REINSTATED':
      return 'approved';
    case 'REJECTED':
    case 'REJEITADO':
      return 'rejected';
    case 'PAUSED':
    case 'PAUSADO':
    case 'FLAGGED':
      return 'paused';
    case 'DISABLED':
    case 'DESABILITADO':
      return 'disabled';
    case 'PENDING':
    case 'PENDENTE':
    case 'IN_APPEAL':
    case 'PENDING_DELETION':
      return 'pending';
    default:
      return null;
  }
}
