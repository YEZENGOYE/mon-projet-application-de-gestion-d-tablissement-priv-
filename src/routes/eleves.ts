// ============================================================
// ROUTES ÉLÈVES
// ============================================================

import { Hono } from 'hono';
import { Bindings } from '../types/index.js';
import { authMiddleware, getUser } from '../middleware/auth.js';
import { generateId, generateMatricule, paginate } from '../utils/helpers.js';

const elevesRoutes = new Hono<{ Bindings: Bindings }>();

// GET /api/eleves - Liste des élèves
elevesRoutes.get('/', authMiddleware(['admin', 'secretariat', 'professeur']), async (c) => {
  try {
    const { page = 1, per_page = 20, classe_id, search, actif = '1' } = c.req.query();
    const { limit, offset } = paginate(Number(page), Number(per_page));

    let query = `
      SELECT e.*, c.nom_classe, c.niveau, c.filiere,
             p.adresse as parent_adresse, u.nom as parent_nom, u.prenom as parent_prenom,
             u.telephone as parent_telephone
      FROM eleves e
      LEFT JOIN classes c ON e.classe_id = c.id
      LEFT JOIN parents p ON e.parent_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE e.actif = ?
    `;
    const params: any[] = [actif === '0' ? 0 : 1];

    if (classe_id) { query += ' AND e.classe_id = ?'; params.push(classe_id); }
    if (search) {
      query += ' AND (e.nom LIKE ? OR e.prenom LIKE ? OR e.matricule LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Compter le total sans LIMIT/OFFSET
    const countParams = [...params];
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM eleves e WHERE e.actif = ?${classe_id ? ' AND e.classe_id = ?' : ''}${search ? ' AND (e.nom LIKE ? OR e.prenom LIKE ? OR e.matricule LIKE ?)' : ''}`
    ).bind(...countParams).first<any>();
    const total = countResult?.total || 0;

    query += ' ORDER BY e.nom, e.prenom LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const { results } = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({
      success: true,
      data: results,
      total,
      page: Number(page),
      per_page: limit
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// POST /api/eleves - Créer un élève
elevesRoutes.post('/', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const body = await c.req.json();
    const { nom, prenom, date_naissance, classe_id, parent_id, adresse,
            info_medicale, sexe, nationalite, lieu_naissance } = body;

    if (!nom || !prenom) {
      return c.json({ success: false, error: 'Nom et prénom requis.' }, 400);
    }

    const annee = new Date().getFullYear().toString();
    const id = generateId();
    const matricule = generateMatricule(annee);

    await c.env.DB.prepare(`
      INSERT INTO eleves (id, matricule, nom, prenom, date_naissance, classe_id, parent_id,
                          adresse, info_medicale, annee_inscription, sexe, nationalite, lieu_naissance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, matricule, nom.toUpperCase(), prenom, date_naissance || null,
      classe_id || null, parent_id || null, adresse || '', info_medicale || '',
      `${annee}-${Number(annee)+1}`, sexe || 'M', nationalite || 'Gabonaise', lieu_naissance || '').run();

    // Notification parent si disponible
    if (parent_id) {
      const parent = await c.env.DB.prepare(
        'SELECT user_id FROM parents WHERE id = ?'
      ).bind(parent_id).first<any>();
      if (parent) {
        await c.env.DB.prepare(
          'INSERT INTO notifications (id, utilisateur_id, message, type) VALUES (?, ?, ?, ?)'
        ).bind(generateId(), parent.user_id,
          `L'élève ${prenom} ${nom} a été inscrit(e) avec le matricule ${matricule}.`, 'info').run();
      }
    }

    const eleve = await c.env.DB.prepare('SELECT * FROM eleves WHERE id = ?').bind(id).first();
    return c.json({ success: true, data: eleve, message: 'Élève inscrit avec succès.' }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// GET /api/eleves/:id - Détail d'un élève
elevesRoutes.get('/:id', authMiddleware(), async (c) => {
  try {
    const id = c.req.param('id');
    const user = getUser(c);

    const eleve = await c.env.DB.prepare(`
      SELECT e.*, c.nom_classe, c.niveau, c.filiere, c.annee_scolaire,
             p.profession, p.adresse as parent_adresse,
             u.nom as parent_nom, u.prenom as parent_prenom,
             u.telephone as parent_telephone, u.email as parent_email
      FROM eleves e
      LEFT JOIN classes c ON e.classe_id = c.id
      LEFT JOIN parents p ON e.parent_id = p.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE e.id = ?
    `).bind(id).first();

    if (!eleve) return c.json({ success: false, error: 'Élève introuvable.' }, 404);

    return c.json({ success: true, data: eleve });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// PUT /api/eleves/:id - Modifier un élève
elevesRoutes.put('/:id', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();

    const existing = await c.env.DB.prepare('SELECT id FROM eleves WHERE id = ?').bind(id).first();
    if (!existing) return c.json({ success: false, error: 'Élève introuvable.' }, 404);

    const fields = ['nom', 'prenom', 'date_naissance', 'classe_id', 'parent_id',
                    'adresse', 'info_medicale', 'sexe', 'nationalite', 'lieu_naissance', 'photo', 'actif'];
    const updates: string[] = [];
    const values: any[] = [];

    fields.forEach(f => {
      if (body[f] !== undefined) {
        updates.push(`${f} = ?`);
        values.push(f === 'nom' ? body[f].toUpperCase() : body[f]);
      }
    });

    if (updates.length === 0) return c.json({ success: false, error: 'Aucune donnée à modifier.' }, 400);

    values.push(id);
    await c.env.DB.prepare(`UPDATE eleves SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();

    const updated = await c.env.DB.prepare('SELECT * FROM eleves WHERE id = ?').bind(id).first();
    return c.json({ success: true, data: updated, message: 'Élève mis à jour.' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// DELETE /api/eleves/:id - Désactiver un élève
elevesRoutes.delete('/:id', authMiddleware(['admin']), async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('UPDATE eleves SET actif = 0 WHERE id = ?').bind(id).run();
    return c.json({ success: true, message: 'Élève désactivé.' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// GET /api/eleves/:id/notes - Notes d'un élève
elevesRoutes.get('/:id/notes', authMiddleware(), async (c) => {
  try {
    const id = c.req.param('id');
    const { trimestre, annee_scolaire } = c.req.query();

    let query = `
      SELECT n.*, m.nom_matiere, m.coefficient as coef_matiere,
             u.nom as prof_nom, u.prenom as prof_prenom
      FROM notes n
      JOIN matieres m ON n.matiere_id = m.id
      LEFT JOIN users u ON n.saisie_par = u.id
      WHERE n.eleve_id = ?
    `;
    const params: any[] = [id];

    if (trimestre) { query += ' AND n.trimestre = ?'; params.push(trimestre); }
    if (annee_scolaire) { query += ' AND n.annee_scolaire = ?'; params.push(annee_scolaire); }

    query += ' ORDER BY m.nom_matiere, n.date DESC';
    const { results } = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// GET /api/eleves/:id/absences - Absences d'un élève
elevesRoutes.get('/:id/absences', authMiddleware(), async (c) => {
  try {
    const id = c.req.param('id');
    const { results } = await c.env.DB.prepare(`
      SELECT a.*, m.nom_matiere, u.nom as enregistre_nom, u.prenom as enregistre_prenom
      FROM absences a
      LEFT JOIN matieres m ON a.matiere_id = m.id
      LEFT JOIN users u ON a.enregistre_par = u.id
      WHERE a.eleve_id = ?
      ORDER BY a.date DESC
    `).bind(id).all();

    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// GET /api/eleves/:id/bulletin - Bulletin d'un élève
elevesRoutes.get('/:id/bulletin', authMiddleware(), async (c) => {
  try {
    const id = c.req.param('id');
    const { trimestre = '1', annee_scolaire = '2024-2025' } = c.req.query();

    const eleve = await c.env.DB.prepare(`
      SELECT e.*, c.nom_classe, c.niveau, c.filiere
      FROM eleves e LEFT JOIN classes c ON e.classe_id = c.id
      WHERE e.id = ?
    `).bind(id).first<any>();

    if (!eleve) return c.json({ success: false, error: 'Élève introuvable.' }, 404);

    // Notes par matière
    const { results: notes } = await c.env.DB.prepare(`
      SELECT m.nom_matiere, m.coefficient as coef_matiere,
             COUNT(n.id) as nb_notes,
             AVG(n.note) as moyenne,
             MIN(n.note) as note_min,
             MAX(n.note) as note_max,
             u.nom as prof_nom, u.prenom as prof_prenom
      FROM matieres m
      LEFT JOIN notes n ON n.matiere_id = m.id AND n.eleve_id = ? AND n.trimestre = ?
      LEFT JOIN users u ON m.professeur_id = u.id
      WHERE m.classe_id = ?
      GROUP BY m.id, m.nom_matiere
      ORDER BY m.nom_matiere
    `).bind(id, Number(trimestre), eleve.classe_id).all();

    // Calculer moyenne générale
    let totalCoef = 0, totalPoints = 0;
    for (const n of notes as any[]) {
      if (n.moyenne !== null) {
        totalCoef += n.coef_matiere;
        totalPoints += n.moyenne * n.coef_matiere;
      }
    }
    const moyenneGenerale = totalCoef > 0 ? Math.round((totalPoints / totalCoef) * 100) / 100 : 0;

    // Absences du trimestre
    const absResult = await c.env.DB.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN statut = 'absent' THEN 1 ELSE 0 END) as absences,
             SUM(CASE WHEN statut = 'retard' THEN 1 ELSE 0 END) as retards
      FROM absences WHERE eleve_id = ?
    `).bind(id).first<any>();

    return c.json({
      success: true,
      data: {
        eleve,
        trimestre: Number(trimestre),
        annee_scolaire,
        notes,
        moyenne_generale: moyenneGenerale,
        mention: getMentionBulletin(moyenneGenerale),
        absences: absResult
      }
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

function getMentionBulletin(moyenne: number): string {
  if (moyenne >= 16) return 'Très Bien';
  if (moyenne >= 14) return 'Bien';
  if (moyenne >= 12) return 'Assez Bien';
  if (moyenne >= 10) return 'Passable';
  return 'Insuffisant';
}

export default elevesRoutes;
