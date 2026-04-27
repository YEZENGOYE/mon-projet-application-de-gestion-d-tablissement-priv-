// ============================================================
// ROUTES FACTURATION & PAIEMENTS
// ============================================================

import { Hono } from 'hono';
import { Bindings } from '../types/index.js';
import { authMiddleware, getUser } from '../middleware/auth.js';
import { generateId } from '../utils/helpers.js';

export const facturesRoutes = new Hono<{ Bindings: Bindings }>();

// GET /api/factures
facturesRoutes.get('/', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const { statut, eleve_id, annee_scolaire, type_frais } = c.req.query();
    let query = `
      SELECT f.*, e.nom as eleve_nom, e.prenom as eleve_prenom, e.matricule,
             c.nom_classe
      FROM factures f
      JOIN eleves e ON f.eleve_id = e.id
      LEFT JOIN classes c ON e.classe_id = c.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (statut) { query += ' AND f.statut = ?'; params.push(statut); }
    if (eleve_id) { query += ' AND f.eleve_id = ?'; params.push(eleve_id); }
    if (annee_scolaire) { query += ' AND f.annee_scolaire = ?'; params.push(annee_scolaire); }
    if (type_frais) { query += ' AND f.type_frais = ?'; params.push(type_frais); }
    query += ' ORDER BY f.date_emission DESC';

    const { results } = await c.env.DB.prepare(query).bind(...params).all();

    // Stats
    const stats = await c.env.DB.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(montant) as total_montant,
        SUM(montant_paye) as total_paye,
        SUM(CASE WHEN statut='paye' THEN 1 ELSE 0 END) as nb_paye,
        SUM(CASE WHEN statut='impaye' THEN 1 ELSE 0 END) as nb_impaye,
        SUM(CASE WHEN statut='partiel' THEN 1 ELSE 0 END) as nb_partiel
      FROM factures WHERE 1=1
      ${eleve_id ? ' AND eleve_id = ?' : ''}
    `).bind(...(eleve_id ? [eleve_id] : [])).first();

    return c.json({ success: true, data: results, stats });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// POST /api/factures
facturesRoutes.post('/', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const body = await c.req.json();
    const { eleve_id, libelle, montant, date_limite, type_frais, annee_scolaire } = body;

    if (!eleve_id || !libelle || !montant) {
      return c.json({ success: false, error: 'Données manquantes.' }, 400);
    }

    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO factures (id, eleve_id, libelle, montant, montant_paye, date_limite, statut, type_frais, annee_scolaire)
      VALUES (?, ?, ?, ?, 0, ?, 'impaye', ?, ?)
    `).bind(id, eleve_id, libelle, Number(montant), date_limite || null,
      type_frais || 'scolarite', annee_scolaire || '2024-2025').run();

    // Notif parent
    const eleve = await c.env.DB.prepare(
      'SELECT e.prenom, e.nom, p.user_id as parent_user FROM eleves e LEFT JOIN parents p ON e.parent_id = p.id WHERE e.id = ?'
    ).bind(eleve_id).first<any>();
    if (eleve?.parent_user) {
      await c.env.DB.prepare(
        'INSERT INTO notifications (id, utilisateur_id, message, type) VALUES (?, ?, ?, ?)'
      ).bind(generateId(), eleve.parent_user,
        `Facture émise: ${libelle} - ${Number(montant).toLocaleString()} FCFA pour ${eleve.prenom} ${eleve.nom}`, 'paiement').run();
    }

    const facture = await c.env.DB.prepare('SELECT * FROM factures WHERE id = ?').bind(id).first();
    return c.json({ success: true, data: facture, message: 'Facture créée.' }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// GET /api/factures/eleve/:id
facturesRoutes.get('/eleve/:id', authMiddleware(), async (c) => {
  try {
    const id = c.req.param('id');
    const { results } = await c.env.DB.prepare(`
      SELECT f.*, 
             (SELECT json_group_array(json_object(
               'id', p.id, 'montant', p.montant, 'date_paiement', p.date_paiement, 'mode_paiement', p.mode_paiement
             )) FROM paiements p WHERE p.facture_id = f.id) as paiements_list
      FROM factures f
      WHERE f.eleve_id = ?
      ORDER BY f.date_emission DESC
    `).bind(id).all();

    const stats = await c.env.DB.prepare(`
      SELECT SUM(montant) as total_du, SUM(montant_paye) as total_paye,
             SUM(montant - montant_paye) as reste_a_payer
      FROM factures WHERE eleve_id = ?
    `).bind(id).first();

    return c.json({ success: true, data: results, stats });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// GET /api/factures/:id
facturesRoutes.get('/:id', authMiddleware(), async (c) => {
  try {
    const id = c.req.param('id');
    const facture = await c.env.DB.prepare(`
      SELECT f.*, e.nom as eleve_nom, e.prenom as eleve_prenom, e.matricule
      FROM factures f JOIN eleves e ON f.eleve_id = e.id
      WHERE f.id = ?
    `).bind(id).first();

    if (!facture) return c.json({ success: false, error: 'Facture introuvable.' }, 404);

    const { results: paiements } = await c.env.DB.prepare(
      'SELECT * FROM paiements WHERE facture_id = ? ORDER BY date_paiement DESC'
    ).bind(id).all();

    return c.json({ success: true, data: { ...facture as any, paiements } });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// PUT /api/factures/:id
facturesRoutes.put('/:id', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const id = c.req.param('id');
    const { libelle, montant, date_limite, statut } = await c.req.json();
    await c.env.DB.prepare(`
      UPDATE factures SET libelle = ?, montant = ?, date_limite = ?, statut = ? WHERE id = ?
    `).bind(libelle, montant, date_limite, statut, id).run();
    return c.json({ success: true, message: 'Facture mise à jour.' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ---- PAIEMENTS ----
export const paiementsRoutes = new Hono<{ Bindings: Bindings }>();

paiementsRoutes.post('/', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const user = getUser(c);
    const { facture_id, montant, mode_paiement, reference } = await c.req.json();

    if (!facture_id || !montant) {
      return c.json({ success: false, error: 'Facture et montant requis.' }, 400);
    }

    const facture = await c.env.DB.prepare('SELECT * FROM factures WHERE id = ?').bind(facture_id).first<any>();
    if (!facture) return c.json({ success: false, error: 'Facture introuvable.' }, 404);

    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO paiements (id, facture_id, montant, mode_paiement, reference, recu_par)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, facture_id, Number(montant), mode_paiement || 'especes', reference || '', user.sub).run();

    // Mettre à jour montant payé et statut de la facture
    const newPaye = (facture.montant_paye || 0) + Number(montant);
    let newStatut = 'partiel';
    if (newPaye >= facture.montant) newStatut = 'paye';
    else if (newPaye <= 0) newStatut = 'impaye';

    await c.env.DB.prepare(
      'UPDATE factures SET montant_paye = ?, statut = ? WHERE id = ?'
    ).bind(newPaye, newStatut, facture_id).run();

    // Notif parent
    const eleve = await c.env.DB.prepare(
      'SELECT e.prenom, e.nom, p.user_id as parent_user FROM eleves e LEFT JOIN parents p ON e.parent_id = p.id WHERE e.id = ?'
    ).bind(facture.eleve_id).first<any>();
    if (eleve?.parent_user) {
      await c.env.DB.prepare(
        'INSERT INTO notifications (id, utilisateur_id, message, type) VALUES (?, ?, ?, ?)'
      ).bind(generateId(), eleve.parent_user,
        `Paiement reçu: ${Number(montant).toLocaleString()} FCFA. Statut: ${newStatut}`, 'paiement').run();
    }

    return c.json({ success: true, data: { id, facture_id, montant, statut: newStatut }, message: 'Paiement enregistré.' }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

paiementsRoutes.get('/', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const { facture_id, date_debut, date_fin } = c.req.query();
    let query = `
      SELECT p.*, f.libelle as facture_libelle, e.nom as eleve_nom, e.prenom as eleve_prenom,
             u.nom as recu_nom
      FROM paiements p
      JOIN factures f ON p.facture_id = f.id
      JOIN eleves e ON f.eleve_id = e.id
      LEFT JOIN users u ON p.recu_par = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (facture_id) { query += ' AND p.facture_id = ?'; params.push(facture_id); }
    if (date_debut) { query += ' AND date(p.date_paiement) >= ?'; params.push(date_debut); }
    if (date_fin) { query += ' AND date(p.date_paiement) <= ?'; params.push(date_fin); }
    query += ' ORDER BY p.date_paiement DESC';

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});
