import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getProfileByAuthUid, getProfileByEmail } from '../db/repository.ts';

export interface AuthUserContext {
  uid: string;
  email: string;
  name?: string;
  profileId?: number;
  companyId?: number;
  role?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUserContext;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autorizado: Token ausente' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    // Support local/demo session tokens prefixed with "alfa_session:" as well as Firebase ID tokens
    if (token.startsWith('alfa_session:')) {
      const payloadBase64 = token.slice('alfa_session:'.length);
      const decodedJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
      const parsed = JSON.parse(decodedJson) as { uid: string; email: string; name?: string };
      if (!parsed.uid || !parsed.email) {
        return res.status(401).json({ error: 'Sessão inválida' });
      }
      const profile =
        (await getProfileByAuthUid(parsed.uid)) ||
        (await getProfileByEmail(parsed.email));
      req.user = {
        uid: profile?.authUserId || parsed.uid,
        email: parsed.email,
        name: parsed.name || profile?.name || 'Usuário',
        profileId: profile?.id,
        companyId: profile?.companyId,
        role: profile?.role || 'OWNER',
      };
      return next();
    }

    let uid = '';
    let email = '';
    let name = '';

    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      uid = decodedToken.uid;
      email = decodedToken.email || '';
      name = decodedToken.name || '';
    } catch {
      // Fallback: decode JWT payload if token is a valid 3-part Firebase JWT
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        if (payload.user_id || payload.sub) {
          uid = String(payload.user_id || payload.sub);
          email = String(payload.email || '');
          name = String(payload.name || '');
        }
      }
    }

    if (!uid) {
      return res.status(401).json({ error: 'Não autorizado: Token inválido ou expirado' });
    }

    const profile =
      (await getProfileByAuthUid(uid)) ||
      (email ? await getProfileByEmail(email) : null);

    req.user = {
      uid: profile?.authUserId || uid,
      email: email || profile?.email || '',
      name: name || profile?.name || email?.split('@')[0] || 'Empresário',
      profileId: profile?.id,
      companyId: profile?.companyId,
      role: profile?.role || 'OWNER',
    };
    next();
  } catch (error) {
    console.error('Error verifying auth token:', error);
    return res.status(401).json({ error: 'Não autorizado: Token inválido ou expirado' });
  }
};
