// ============================================================
// MIDDLEWARE JWT - Authentification (Web Crypto natif)
// ============================================================

import { Context, Next } from 'hono';
import { Bindings, JWTPayload, UserRole } from '../types/index.js';

const JWT_EXPIRY_SECONDS = 86400; // 24h

// Encoder base64url
function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Décoder base64url
function fromB64url(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Uint8Array.from(atob(str), c => c.charCodeAt(0));
}

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder().encode(secret);
  return crypto.subtle.importKey('raw', enc, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signToken(payload: JWTPayload, secret: string): Promise<string> {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const now = Math.floor(Date.now() / 1000);
  const claims = { ...payload, iat: now, exp: now + JWT_EXPIRY_SECONDS };
  const body = b64url(new TextEncoder().encode(JSON.stringify(claims)));
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${header}.${body}`));
  return `${header}.${body}.${b64url(sig)}`;
}

export async function verifyToken(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sigStr] = parts;
    const key = await getKey(secret);
    const valid = await crypto.subtle.verify(
      'HMAC', key,
      fromB64url(sigStr),
      new TextEncoder().encode(`${header}.${body}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body)));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload as JWTPayload;
  } catch {
    return null;
  }
}

export function authMiddleware(allowedRoles?: UserRole[]) {
  return async (c: Context<{ Bindings: Bindings }>, next: Next) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '') || c.req.header('x-auth-token');

    if (!token) {
      return c.json({ success: false, error: 'Token manquant. Veuillez vous connecter.' }, 401);
    }

    const secret = c.env.JWT_SECRET || 'lycee-gabon-secret-key-2024-secured';
    const payload = await verifyToken(token, secret);

    if (!payload) {
      return c.json({ success: false, error: 'Token invalide ou expiré.' }, 401);
    }

    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      return c.json({ success: false, error: 'Accès refusé. Permissions insuffisantes.' }, 403);
    }

    c.set('user' as any, payload);
    await next();
  };
}

export function getUser(c: Context): JWTPayload {
  return (c as any).get('user') as JWTPayload;
}
