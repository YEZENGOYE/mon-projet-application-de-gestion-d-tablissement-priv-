// ============================================================
// ROUTES UTILISATEURS, PARENTS, NOTIFICATIONS, MESSAGES
// ============================================================

import { Hono } from 'hono';
import { Bindings } from '../types/index.js';
import { authMiddleware, getUser } from '../middleware/auth.js';
import { generateId, hashPassword, isValidEmail } from '../utils/helpers.js';

// ---- UTILISATEURS ----
export const usersRoutes = new Hono<{ Bindings: Bindings }>();

usersRoutes.get('/', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const { role, search, actif = '1' } = c.req.query();
    let query = `
      SELECT id, nom, prenom, email, role, telephone, actif, date_creation, derniere_connexion
      FROM users WHERE actif = ?
    `;
    const params: any[] = [actif === '0' ? 0 : 1];
    if (role) { query += ' AND role = ?'; params.push(role); }
    if (search) {
      query += ' AND (nom LIKE ? OR prenom LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY role, nom, prenom';

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

usersRoutes.get('/me', authMiddleware(), async (c) => {
  try {
    const user = getUser(c);
    const userData = await c.env.DB.prepare(
      'SELECT id, nom, prenom, email, role, telephone, date_creation, derniere_connexion FROM users WHERE id = ?'
    ).bind(user.sub).first();
    return c.json({ success: true, data: userData });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

usersRoutes.get('/professeurs', authMiddleware(), async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT u.id, u.nom, u.prenom, u.email, u.telephone,
             COUNT(DISTINCT m.classe_id) as nb_classes,
             COUNT(DISTINCT m.id) as nb_matieres
      FROM users u
      LEFT JOIN matieres m ON m.professeur_id = u.id
      WHERE u.role = 'professeur' AND u.actif = 1
      GROUP BY u.id ORDER BY u.nom
    `).all();
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

usersRoutes.get('/:id', authMiddleware(), async (c) => {
  try {
    const id = c.req.param('id');
    const user = await c.env.DB.prepare(
      'SELECT id, nom, prenom, email, role, telephone, actif, date_creation FROM users WHERE id = ?'
    ).bind(id).first();
    if (!user) return c.json({ success: false, error: 'Utilisateur introuvable.' }, 404);
    return c.json({ success: true, data: user });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

usersRoutes.post('/', authMiddleware(['admin']), async (c) => {
  try {
    const { nom, prenom, email, mot_de_passe, role, telephone } = await c.req.json();
    if (!nom || !prenom || !email || !mot_de_passe || !role) {
      return c.json({ success: false, error: 'Champs manquants.' }, 400);
    }
    if (!isValidEmail(email)) return c.json({ success: false, error: 'Email invalide.' }, 400);

    const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (existing) return c.json({ success: false, error: 'Email déjà utilisé.' }, 409);

    const id = generateId();
    const hash = await hashPassword(mot_de_passe);
    await c.env.DB.prepare(`
      INSERT INTO users (id, nom, prenom, email, mot_de_passe_hash, role, telephone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, nom.toUpperCase(), prenom, email.toLowerCase(), hash, role, telephone || '').run();

    return c.json({ success: true, data: { id, nom, prenom, email, role }, message: 'Utilisateur créé.' }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

usersRoutes.put('/:id', authMiddleware(['admin']), async (c) => {
  try {
    const id = c.req.param('id');
    const { nom, prenom, telephone, actif, role } = await c.req.json();
    const updates: string[] = [];
    const values: any[] = [];

    if (nom !== undefined) { updates.push('nom = ?'); values.push(nom.toUpperCase()); }
    if (prenom !== undefined) { updates.push('prenom = ?'); values.push(prenom); }
    if (telephone !== undefined) { updates.push('telephone = ?'); values.push(telephone); }
    if (actif !== undefined) { updates.push('actif = ?'); values.push(actif); }
    if (role !== undefined) { updates.push('role = ?'); values.push(role); }

    if (!updates.length) return c.json({ success: false, error: 'Rien à modifier.' }, 400);
    values.push(id);
    await c.env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
    return c.json({ success: true, message: 'Utilisateur mis à jour.' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

usersRoutes.delete('/:id', authMiddleware(['admin']), async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('UPDATE users SET actif = 0 WHERE id = ?').bind(id).run();
    return c.json({ success: true, message: 'Utilisateur désactivé.' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ---- PARENTS ----
export const parentsRoutes = new Hono<{ Bindings: Bindings }>();

parentsRoutes.get('/', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT p.*, u.nom, u.prenom, u.email, u.telephone,
             COUNT(e.id) as nb_enfants
      FROM parents p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN eleves e ON e.parent_id = p.id AND e.actif = 1
      GROUP BY p.id ORDER BY u.nom
    `).all();
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

parentsRoutes.post('/', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const { nom, prenom, email, telephone, mot_de_passe, profession, adresse } = await c.req.json();
    if (!nom || !prenom || !email) return c.json({ success: false, error: 'Données manquantes.' }, 400);

    const userId = generateId();
    const hash = await hashPassword(mot_de_passe || 'Parent@2024');
    await c.env.DB.prepare(`
      INSERT INTO users (id, nom, prenom, email, mot_de_passe_hash, role, telephone)
      VALUES (?, ?, ?, ?, ?, 'parent', ?)
    `).bind(userId, nom.toUpperCase(), prenom, email.toLowerCase(), hash, telephone || '').run();

    const parentId = generateId();
    await c.env.DB.prepare(`
      INSERT INTO parents (id, user_id, profession, adresse)
      VALUES (?, ?, ?, ?)
    `).bind(parentId, userId, profession || '', adresse || '').run();

    return c.json({ success: true, data: { id: parentId, user_id: userId, nom, prenom, email }, message: 'Parent créé.' }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

parentsRoutes.get('/:id', authMiddleware(), async (c) => {
  try {
    const id = c.req.param('id');
    const parent = await c.env.DB.prepare(`
      SELECT p.*, u.nom, u.prenom, u.email, u.telephone
      FROM parents p JOIN users u ON p.user_id = u.id WHERE p.id = ?
    `).bind(id).first();

    if (!parent) return c.json({ success: false, error: 'Parent introuvable.' }, 404);

    const { results: enfants } = await c.env.DB.prepare(`
      SELECT e.*, c.nom_classe FROM eleves e LEFT JOIN classes c ON e.classe_id = c.id
      WHERE e.parent_id = ? AND e.actif = 1
    `).bind(id).all();

    return c.json({ success: true, data: { ...parent as any, enfants } });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ---- NOTIFICATIONS ----
export const notificationsRoutes = new Hono<{ Bindings: Bindings }>();

notificationsRoutes.get('/', authMiddleware(), async (c) => {
  try {
    const user = getUser(c);
    const { statut } = c.req.query();
    let query = 'SELECT * FROM notifications WHERE utilisateur_id = ?';
    const params: any[] = [user.sub];
    if (statut) { query += ' AND statut = ?'; params.push(statut); }
    query += ' ORDER BY date_envoi DESC LIMIT 50';

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    const unread = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM notifications WHERE utilisateur_id = ? AND statut = 'non_lu'"
    ).bind(user.sub).first<any>();

    return c.json({ success: true, data: results, unread_count: unread?.count || 0 });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

notificationsRoutes.put('/:id/lu', authMiddleware(), async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare("UPDATE notifications SET statut = 'lu' WHERE id = ?").bind(id).run();
    return c.json({ success: true, message: 'Notification marquée comme lue.' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

notificationsRoutes.put('/mark-all-read', authMiddleware(), async (c) => {
  try {
    const user = getUser(c);
    await c.env.DB.prepare(
      "UPDATE notifications SET statut = 'lu' WHERE utilisateur_id = ?"
    ).bind(user.sub).run();
    return c.json({ success: true, message: 'Toutes les notifications marquées comme lues.' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

notificationsRoutes.post('/send', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const { utilisateur_id, message, type, lien } = await c.req.json();
    const id = generateId();

    let targetUsers: any[] = [];
    if (utilisateur_id === 'all') {
      const { results } = await c.env.DB.prepare('SELECT id FROM users WHERE actif = 1').all();
      targetUsers = results;
    } else if (utilisateur_id === 'parents') {
      const { results } = await c.env.DB.prepare("SELECT id FROM users WHERE role = 'parent' AND actif = 1").all();
      targetUsers = results;
    } else {
      targetUsers = [{ id: utilisateur_id }];
    }

    for (const u of targetUsers) {
      await c.env.DB.prepare(
        'INSERT INTO notifications (id, utilisateur_id, message, type, lien) VALUES (?, ?, ?, ?, ?)'
      ).bind(generateId(), u.id, message, type || 'info', lien || '').run();
    }

    return c.json({ success: true, message: `Notification envoyée à ${targetUsers.length} utilisateur(s).` });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ---- MESSAGES ----
export const messagesRoutes = new Hono<{ Bindings: Bindings }>();

messagesRoutes.get('/', authMiddleware(), async (c) => {
  try {
    const user = getUser(c);
    const { type = 'recus' } = c.req.query();

    let query = `
      SELECT m.*, 
             u_exp.nom as exp_nom, u_exp.prenom as exp_prenom, u_exp.role as exp_role,
             u_dest.nom as dest_nom, u_dest.prenom as dest_prenom
      FROM messages m
      JOIN users u_exp ON m.expediteur_id = u_exp.id
      JOIN users u_dest ON m.destinataire_id = u_dest.id
      WHERE ${type === 'envoyes' ? 'm.expediteur_id' : 'm.destinataire_id'} = ?
      ORDER BY m.date_envoi DESC LIMIT 50
    `;

    const { results } = await c.env.DB.prepare(query).bind(user.sub).all();
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

messagesRoutes.post('/', authMiddleware(), async (c) => {
  try {
    const user = getUser(c);
    const { destinataire_id, sujet, contenu, reponse_a } = await c.req.json();

    if (!destinataire_id || !contenu) {
      return c.json({ success: false, error: 'Destinataire et contenu requis.' }, 400);
    }

    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO messages (id, expediteur_id, destinataire_id, sujet, contenu, reponse_a)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, user.sub, destinataire_id, sujet || '', contenu, reponse_a || null).run();

    // Notif destinataire
    const sender = await c.env.DB.prepare('SELECT nom, prenom FROM users WHERE id = ?').bind(user.sub).first<any>();
    await c.env.DB.prepare(
      'INSERT INTO notifications (id, utilisateur_id, message, type, lien) VALUES (?, ?, ?, ?, ?)'
    ).bind(generateId(), destinataire_id,
      `Nouveau message de ${sender?.prenom} ${sender?.nom}: ${sujet || 'Sans objet'}`,
      'message', '/messages').run();

    return c.json({ success: true, data: { id }, message: 'Message envoyé.' }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

messagesRoutes.put('/:id/lu', authMiddleware(), async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('UPDATE messages SET lu = 1 WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});
