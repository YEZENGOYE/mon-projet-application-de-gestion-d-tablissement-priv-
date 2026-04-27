// ============================================================
// ROUTES AUTHENTIFICATION
// ============================================================

import { Hono } from 'hono';
import { Bindings } from '../types/index.js';
import { signToken } from '../middleware/auth.js';
import { hashPassword, verifyPassword, generateId, isValidEmail } from '../utils/helpers.js';

const authRoutes = new Hono<{ Bindings: Bindings }>();

// POST /api/auth/login
authRoutes.post('/login', async (c) => {
  try {
    const { email, mot_de_passe } = await c.req.json();

    if (!email || !mot_de_passe) {
      return c.json({ success: false, error: 'Email et mot de passe requis.' }, 400);
    }

    const user = await c.env.DB.prepare(
      'SELECT * FROM users WHERE email = ? AND actif = 1'
    ).bind(email.toLowerCase().trim()).first<any>();

    if (!user) {
      return c.json({ success: false, error: 'Identifiants invalides.' }, 401);
    }

    const valid = await verifyPassword(mot_de_passe, user.mot_de_passe_hash);
    if (!valid) {
      return c.json({ success: false, error: 'Identifiants invalides.' }, 401);
    }

    // Mise à jour dernière connexion
    await c.env.DB.prepare(
      'UPDATE users SET derniere_connexion = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind(user.id).run();

    // Log audit
    await c.env.DB.prepare(
      'INSERT INTO audit_logs (id, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)'
    ).bind(generateId(), user.id, 'LOGIN', 'Connexion réussie', c.req.header('cf-connecting-ip') || '').run();

    const secret = c.env.JWT_SECRET || 'lycee-gabon-secret-key-2024-secured';
    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      nom: user.nom,
      prenom: user.prenom
    }, secret);

    return c.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          nom: user.nom,
          prenom: user.prenom,
          email: user.email,
          role: user.role,
          telephone: user.telephone
        }
      },
      message: `Bienvenue ${user.prenom} ${user.nom} !`
    });
  } catch (e: any) {
    return c.json({ success: false, error: 'Erreur serveur: ' + e.message }, 500);
  }
});

// POST /api/auth/register
authRoutes.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const { nom, prenom, email, mot_de_passe, role, telephone } = body;

    if (!nom || !prenom || !email || !mot_de_passe) {
      return c.json({ success: false, error: 'Champs obligatoires manquants.' }, 400);
    }

    if (!isValidEmail(email)) {
      return c.json({ success: false, error: 'Email invalide.' }, 400);
    }

    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email.toLowerCase()).first();

    if (existing) {
      return c.json({ success: false, error: 'Cet email est déjà utilisé.' }, 409);
    }

    const id = generateId();
    const hash = await hashPassword(mot_de_passe);
    const userRole = role || 'parent';

    await c.env.DB.prepare(`
      INSERT INTO users (id, nom, prenom, email, mot_de_passe_hash, role, telephone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, nom.toUpperCase(), prenom, email.toLowerCase(), hash, userRole, telephone || '').run();

    return c.json({
      success: true,
      data: { id, nom, prenom, email, role: userRole },
      message: 'Compte créé avec succès.'
    }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: 'Erreur serveur: ' + e.message }, 500);
  }
});

// POST /api/auth/logout
authRoutes.post('/logout', async (c) => {
  return c.json({ success: true, message: 'Déconnexion réussie.' });
});

// POST /api/auth/change-password
authRoutes.post('/change-password', async (c) => {
  try {
    const { user_id, ancien_mot_de_passe, nouveau_mot_de_passe } = await c.req.json();

    const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?')
      .bind(user_id).first<any>();

    if (!user) return c.json({ success: false, error: 'Utilisateur introuvable.' }, 404);

    const valid = await verifyPassword(ancien_mot_de_passe, user.mot_de_passe_hash);
    if (!valid) return c.json({ success: false, error: 'Ancien mot de passe incorrect.' }, 400);

    const newHash = await hashPassword(nouveau_mot_de_passe);
    await c.env.DB.prepare('UPDATE users SET mot_de_passe_hash = ? WHERE id = ?')
      .bind(newHash, user_id).run();

    return c.json({ success: true, message: 'Mot de passe mis à jour.' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

export default authRoutes;
