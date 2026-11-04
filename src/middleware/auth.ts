import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getProfileByAuthUid } from '../db/repository.ts';

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
      const profile = await getProfileByAuthUid(parsed.uid);
      req.user = {
        uid: parsed.uid,
        email: parsed.email,
        name: parsed.name || profile?.name || 'Usuário',
        profileId: profile?.id,
        companyId: profile?.companyId,
        role: profile?.role || 'OWNER',
      };
      return next();
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const profile = await getProfileByAuthUid(decodedToken.uid);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      name: decodedToken.name || profile?.name || decodedToken.email?.split('@')[0] || 'Empresário',
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
