// ============================================================
// ROUTES CLASSES, MATIÈRES, NOTES, ABSENCES
// ============================================================

import { Hono } from 'hono';
import { Bindings } from '../types/index.js';
import { authMiddleware, getUser } from '../middleware/auth.js';
import { generateId } from '../utils/helpers.js';

// ---- CLASSES ----
export const classesRoutes = new Hono<{ Bindings: Bindings }>();

classesRoutes.get('/', authMiddleware(), async (c) => {
  try {
    const { annee_scolaire, niveau } = c.req.query();
    let query = `
      SELECT c.*, u.nom as prof_nom, u.prenom as prof_prenom,
             COUNT(e.id) as nb_eleves
      FROM classes c
      LEFT JOIN users u ON c.professeur_principal_id = u.id
      LEFT JOIN eleves e ON e.classe_id = c.id AND e.actif = 1
      WHERE 1=1
    `;
    const params: any[] = [];
    if (annee_scolaire) { query += ' AND c.annee_scolaire = ?'; params.push(annee_scolaire); }
    if (niveau) { query += ' AND c.niveau = ?'; params.push(niveau); }
    query += ' GROUP BY c.id ORDER BY c.niveau, c.nom_classe';

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

classesRoutes.post('/', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const { nom_classe, niveau, filiere, annee_scolaire, professeur_principal_id, capacite } = await c.req.json();
    if (!nom_classe || !niveau) return c.json({ success: false, error: 'Données manquantes.' }, 400);

    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO classes (id, nom_classe, niveau, filiere, annee_scolaire, professeur_principal_id, capacite)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, nom_classe, niveau, filiere || '', annee_scolaire || '2024-2025',
      professeur_principal_id || null, capacite || 30).run();

    const classe = await c.env.DB.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first();
    return c.json({ success: true, data: classe, message: 'Classe créée.' }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

classesRoutes.get('/:id', authMiddleware(), async (c) => {
  try {
    const id = c.req.param('id');
    const classe = await c.env.DB.prepare(`
      SELECT c.*, u.nom as prof_nom, u.prenom as prof_prenom
      FROM classes c LEFT JOIN users u ON c.professeur_principal_id = u.id
      WHERE c.id = ?
    `).bind(id).first();
    if (!classe) return c.json({ success: false, error: 'Classe introuvable.' }, 404);

    const { results: eleves } = await c.env.DB.prepare(
      'SELECT * FROM eleves WHERE classe_id = ? AND actif = 1 ORDER BY nom'
    ).bind(id).all();

    const { results: matieres } = await c.env.DB.prepare(`
      SELECT m.*, u.nom as prof_nom, u.prenom as prof_prenom
      FROM matieres m LEFT JOIN users u ON m.professeur_id = u.id
      WHERE m.classe_id = ?
    `).bind(id).all();

    return c.json({ success: true, data: { ...classe as any, eleves, matieres } });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

classesRoutes.put('/:id', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const fields = ['nom_classe', 'niveau', 'filiere', 'annee_scolaire', 'professeur_principal_id', 'capacite'];
    const updates: string[] = [];
    const values: any[] = [];

    fields.forEach(f => {
      if (body[f] !== undefined) { updates.push(`${f} = ?`); values.push(body[f]); }
    });
    if (!updates.length) return c.json({ success: false, error: 'Rien à modifier.' }, 400);

    values.push(id);
    await c.env.DB.prepare(`UPDATE classes SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
    const updated = await c.env.DB.prepare('SELECT * FROM classes WHERE id = ?').bind(id).first();
    return c.json({ success: true, data: updated });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ---- MATIÈRES ----
export const matieresRoutes = new Hono<{ Bindings: Bindings }>();

matieresRoutes.get('/', authMiddleware(), async (c) => {
  try {
    const { classe_id, professeur_id } = c.req.query();
    let query = `
      SELECT m.*, c.nom_classe, u.nom as prof_nom, u.prenom as prof_prenom
      FROM matieres m
      LEFT JOIN classes c ON m.classe_id = c.id
      LEFT JOIN users u ON m.professeur_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (classe_id) { query += ' AND m.classe_id = ?'; params.push(classe_id); }
    if (professeur_id) { query += ' AND m.professeur_id = ?'; params.push(professeur_id); }
    query += ' ORDER BY m.nom_matiere';

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

matieresRoutes.post('/', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const { nom_matiere, coefficient, classe_id, professeur_id } = await c.req.json();
    if (!nom_matiere) return c.json({ success: false, error: 'Nom matière requis.' }, 400);

    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO matieres (id, nom_matiere, coefficient, classe_id, professeur_id)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, nom_matiere, coefficient || 1, classe_id || null, professeur_id || null).run();

    const mat = await c.env.DB.prepare('SELECT * FROM matieres WHERE id = ?').bind(id).first();
    return c.json({ success: true, data: mat, message: 'Matière créée.' }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

matieresRoutes.put('/:id', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const id = c.req.param('id');
    const { nom_matiere, coefficient, professeur_id } = await c.req.json();
    await c.env.DB.prepare(`
      UPDATE matieres SET nom_matiere = ?, coefficient = ?, professeur_id = ? WHERE id = ?
    `).bind(nom_matiere, coefficient, professeur_id || null, id).run();
    return c.json({ success: true, message: 'Matière mise à jour.' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

matieresRoutes.delete('/:id', authMiddleware(['admin']), async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM matieres WHERE id = ?').bind(id).run();
    return c.json({ success: true, message: 'Matière supprimée.' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ---- NOTES ----
export const notesRoutes = new Hono<{ Bindings: Bindings }>();

notesRoutes.get('/', authMiddleware(), async (c) => {
  try {
    const { eleve_id, matiere_id, classe_id, trimestre } = c.req.query();
    let query = `
      SELECT n.*, m.nom_matiere, m.coefficient as coef_matiere,
             e.nom as eleve_nom, e.prenom as eleve_prenom, e.matricule,
             u.nom as prof_nom
      FROM notes n
      JOIN matieres m ON n.matiere_id = m.id
      JOIN eleves e ON n.eleve_id = e.id
      LEFT JOIN users u ON n.saisie_par = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (eleve_id) { query += ' AND n.eleve_id = ?'; params.push(eleve_id); }
    if (matiere_id) { query += ' AND n.matiere_id = ?'; params.push(matiere_id); }
    if (trimestre) { query += ' AND n.trimestre = ?'; params.push(trimestre); }
    if (classe_id) { query += ' AND m.classe_id = ?'; params.push(classe_id); }
    query += ' ORDER BY n.date DESC, e.nom';

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

notesRoutes.post('/', authMiddleware(['admin', 'secretariat', 'professeur']), async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json();

    // Saisie en masse possible
    const notesList = Array.isArray(body) ? body : [body];
    const inserted: any[] = [];

    for (const item of notesList) {
      const { eleve_id, matiere_id, type_evaluation, note, coefficient, libelle, date, trimestre, annee_scolaire } = item;
      if (!eleve_id || !matiere_id || note === undefined) continue;
      if (note < 0 || note > 20) continue;

      const id = generateId();
      await c.env.DB.prepare(`
        INSERT INTO notes (id, eleve_id, matiere_id, type_evaluation, note, coefficient,
                          libelle, date, trimestre, annee_scolaire, saisie_par)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, eleve_id, matiere_id, type_evaluation || 'devoir', Number(note),
        coefficient || 1, libelle || '', date || new Date().toISOString().split('T')[0],
        trimestre || 1, annee_scolaire || '2024-2025', user.sub).run();
      inserted.push(id);

      // Notif parent si note faible
      if (Number(note) < 10) {
        const eleve = await c.env.DB.prepare(
          'SELECT e.*, p.user_id as parent_user FROM eleves e LEFT JOIN parents p ON e.parent_id = p.id WHERE e.id = ?'
        ).bind(eleve_id).first<any>();
        if (eleve?.parent_user) {
          const matiere = await c.env.DB.prepare('SELECT nom_matiere FROM matieres WHERE id = ?').bind(matiere_id).first<any>();
          await c.env.DB.prepare(
            'INSERT INTO notifications (id, utilisateur_id, message, type) VALUES (?, ?, ?, ?)'
          ).bind(generateId(), eleve.parent_user,
            `Note faible pour ${eleve.prenom}: ${note}/20 en ${matiere?.nom_matiere || 'une matière'}`, 'alerte').run();
        }
      }
    }

    return c.json({ success: true, data: { inserted: inserted.length }, message: `${inserted.length} note(s) saisie(s).` }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

notesRoutes.get('/eleve/:id', authMiddleware(), async (c) => {
  try {
    const id = c.req.param('id');
    const { trimestre, annee_scolaire } = c.req.query();

    let query = `
      SELECT n.*, m.nom_matiere, m.coefficient as coef_matiere
      FROM notes n JOIN matieres m ON n.matiere_id = m.id
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

notesRoutes.delete('/:id', authMiddleware(['admin', 'professeur']), async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(id).run();
    return c.json({ success: true, message: 'Note supprimée.' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ---- ABSENCES ----
export const absencesRoutes = new Hono<{ Bindings: Bindings }>();

absencesRoutes.get('/', authMiddleware(), async (c) => {
  try {
    const { eleve_id, classe_id, date, statut } = c.req.query();
    let query = `
      SELECT a.*, e.nom as eleve_nom, e.prenom as eleve_prenom, e.matricule,
             m.nom_matiere, c.nom_classe,
             u.nom as enreg_nom
      FROM absences a
      JOIN eleves e ON a.eleve_id = e.id
      LEFT JOIN matieres m ON a.matiere_id = m.id
      LEFT JOIN classes c ON e.classe_id = c.id
      LEFT JOIN users u ON a.enregistre_par = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (eleve_id) { query += ' AND a.eleve_id = ?'; params.push(eleve_id); }
    if (classe_id) { query += ' AND e.classe_id = ?'; params.push(classe_id); }
    if (date) { query += ' AND a.date = ?'; params.push(date); }
    if (statut) { query += ' AND a.statut = ?'; params.push(statut); }
    query += ' ORDER BY a.date DESC, e.nom';

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

absencesRoutes.post('/', authMiddleware(['admin', 'secretariat', 'professeur']), async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json();
    const absencesList = Array.isArray(body) ? body : [body];
    let count = 0;

    for (const item of absencesList) {
      const { eleve_id, matiere_id, date, statut, motif, heure_debut, heure_fin } = item;
      if (!eleve_id || !date) continue;

      const id = generateId();
      await c.env.DB.prepare(`
        INSERT INTO absences (id, eleve_id, matiere_id, date, heure_debut, heure_fin, statut, motif, enregistre_par)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, eleve_id, matiere_id || null, date, heure_debut || null, heure_fin || null,
        statut || 'absent', motif || '', user.sub).run();
      count++;

      // Notif parent pour absence
      if (statut === 'absent') {
        const eleve = await c.env.DB.prepare(
          'SELECT e.prenom, e.nom, p.user_id as parent_user FROM eleves e LEFT JOIN parents p ON e.parent_id = p.id WHERE e.id = ?'
        ).bind(eleve_id).first<any>();
        if (eleve?.parent_user) {
          await c.env.DB.prepare(
            'INSERT INTO notifications (id, utilisateur_id, message, type) VALUES (?, ?, ?, ?)'
          ).bind(generateId(), eleve.parent_user,
            `Absence signalée pour ${eleve.prenom} ${eleve.nom} le ${date}`, 'absence').run();
        }
      }
    }

    return c.json({ success: true, data: { count }, message: `${count} présence(s) enregistrée(s).` }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

absencesRoutes.get('/eleve/:id', authMiddleware(), async (c) => {
  try {
    const id = c.req.param('id');
    const { results } = await c.env.DB.prepare(`
      SELECT a.*, m.nom_matiere FROM absences a
      LEFT JOIN matieres m ON a.matiere_id = m.id
      WHERE a.eleve_id = ? ORDER BY a.date DESC
    `).bind(id).all();
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

absencesRoutes.put('/:id', authMiddleware(['admin', 'secretariat', 'professeur']), async (c) => {
  try {
    const id = c.req.param('id');
    const { statut, motif } = await c.req.json();
    await c.env.DB.prepare('UPDATE absences SET statut = ?, motif = ? WHERE id = ?')
      .bind(statut, motif || '', id).run();
    return c.json({ success: true, message: 'Absence mise à jour.' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});
