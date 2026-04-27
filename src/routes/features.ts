// ============================================================
// ROUTES CARTES SCOLAIRES, STATISTIQUES, FONCTIONNALITÉS AVANCÉES
// ============================================================

import { Hono } from 'hono';
import { Bindings } from '../types/index.js';
import { authMiddleware, getUser } from '../middleware/auth.js';
import { generateId, generateQRData, generateQRSVG, calculerMoyenne } from '../utils/helpers.js';

// ---- CARTES SCOLAIRES ----
export const cartesRoutes = new Hono<{ Bindings: Bindings }>();

cartesRoutes.post('/generer/:eleve_id', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const eleve_id = c.req.param('eleve_id');
    const { annee_scolaire = '2024-2025' } = await c.req.json().catch(() => ({ annee_scolaire: '2024-2025' }));

    const eleve = await c.env.DB.prepare(`
      SELECT e.*, c.nom_classe, c.niveau, c.filiere
      FROM eleves e LEFT JOIN classes c ON e.classe_id = c.id
      WHERE e.id = ?
    `).bind(eleve_id).first<any>();

    if (!eleve) return c.json({ success: false, error: 'Élève introuvable.' }, 404);

    const qrData = generateQRData(eleve_id, annee_scolaire);
    const qrSvg = generateQRSVG(qrData);

    const id = generateId();

    // Désactiver les anciennes cartes
    await c.env.DB.prepare(
      "UPDATE cartes_scolaires SET valide = 0 WHERE eleve_id = ? AND annee_scolaire = ?"
    ).bind(eleve_id, annee_scolaire).run();

    await c.env.DB.prepare(`
      INSERT INTO cartes_scolaires (id, eleve_id, annee_scolaire, qr_code, qr_data, valide)
      VALUES (?, ?, ?, ?, ?, 1)
    `).bind(id, eleve_id, annee_scolaire, qrSvg, qrData).run();

    return c.json({
      success: true,
      data: {
        id,
        eleve: {
          id: eleve.id,
          matricule: eleve.matricule,
          nom: eleve.nom,
          prenom: eleve.prenom,
          classe: eleve.nom_classe,
          niveau: eleve.niveau,
          photo: eleve.photo
        },
        annee_scolaire,
        qr_code: qrSvg,
        qr_data: qrData,
        etablissement: 'LYCÉE PRIVÉ GABON',
        date_generation: new Date().toISOString()
      },
      message: 'Carte scolaire générée.'
    }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

cartesRoutes.get('/eleve/:eleve_id', authMiddleware(), async (c) => {
  try {
    const eleve_id = c.req.param('eleve_id');
    const { results } = await c.env.DB.prepare(`
      SELECT cs.*, e.nom, e.prenom, e.matricule, c.nom_classe
      FROM cartes_scolaires cs
      JOIN eleves e ON cs.eleve_id = e.id
      LEFT JOIN classes c ON e.classe_id = c.id
      WHERE cs.eleve_id = ?
      ORDER BY cs.date_generation DESC
    `).bind(eleve_id).all();

    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

cartesRoutes.get('/verifier/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const carte = await c.env.DB.prepare(`
      SELECT cs.*, e.nom, e.prenom, e.matricule, c.nom_classe, c.niveau
      FROM cartes_scolaires cs
      JOIN eleves e ON cs.eleve_id = e.id
      LEFT JOIN classes c ON e.classe_id = c.id
      WHERE cs.id = ? AND cs.valide = 1
    `).bind(id).first();

    if (!carte) return c.json({ success: false, error: 'Carte invalide ou expirée.' }, 404);
    return c.json({ success: true, data: carte, message: 'Carte valide.' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ---- STATISTIQUES ----
export const statsRoutes = new Hono<{ Bindings: Bindings }>();

statsRoutes.get('/dashboard', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const [eleves, classes, users, factures, absences, notes] = await Promise.all([
      c.env.DB.prepare("SELECT COUNT(*) as total FROM eleves WHERE actif = 1").first<any>(),
      c.env.DB.prepare("SELECT COUNT(*) as total FROM classes").first<any>(),
      c.env.DB.prepare("SELECT COUNT(*) as total, role FROM users WHERE actif = 1 GROUP BY role").all(),
      c.env.DB.prepare(`
        SELECT COUNT(*) as total, SUM(montant) as total_montant, SUM(montant_paye) as total_paye,
               SUM(CASE WHEN statut='impaye' THEN 1 ELSE 0 END) as nb_impaye
        FROM factures
      `).first<any>(),
      c.env.DB.prepare(`
        SELECT COUNT(*) as total,
               SUM(CASE WHEN statut='absent' THEN 1 ELSE 0 END) as absences,
               SUM(CASE WHEN statut='retard' THEN 1 ELSE 0 END) as retards
        FROM absences WHERE date >= date('now', '-30 days')
      `).first<any>(),
      c.env.DB.prepare("SELECT AVG(note) as moyenne_generale FROM notes WHERE annee_scolaire = '2024-2025'").first<any>()
    ]);

    const usersByRole: Record<string, number> = {};
    for (const u of (users.results as any[])) {
      usersByRole[u.role] = u.total;
    }

    // Répartition par classe
    const { results: parClasse } = await c.env.DB.prepare(`
      SELECT c.nom_classe, c.niveau, COUNT(e.id) as nb_eleves
      FROM classes c LEFT JOIN eleves e ON e.classe_id = c.id AND e.actif = 1
      GROUP BY c.id ORDER BY c.niveau, c.nom_classe
    `).all();

    // Notes récentes
    const { results: notesRecentes } = await c.env.DB.prepare(`
      SELECT n.*, e.nom as eleve_nom, m.nom_matiere
      FROM notes n JOIN eleves e ON n.eleve_id = e.id JOIN matieres m ON n.matiere_id = m.id
      ORDER BY n.created_at DESC LIMIT 10
    `).all();

    return c.json({
      success: true,
      data: {
        eleves: eleves?.total || 0,
        classes: classes?.total || 0,
        users_by_role: usersByRole,
        finance: {
          total_factures: factures?.total || 0,
          total_attendu: factures?.total_montant || 0,
          total_encaisse: factures?.total_paye || 0,
          taux_recouvrement: factures?.total_montant > 0
            ? Math.round((factures.total_paye / factures.total_montant) * 100) : 0,
          factures_impayees: factures?.nb_impaye || 0
        },
        absences_30j: {
          total: absences?.total || 0,
          absences: absences?.absences || 0,
          retards: absences?.retards || 0
        },
        moyenne_generale: Math.round((notes?.moyenne_generale || 0) * 100) / 100,
        repartition_classes: parClasse,
        notes_recentes: notesRecentes
      }
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

statsRoutes.get('/classe/:id', authMiddleware(), async (c) => {
  try {
    const classe_id = c.req.param('id');

    const [classe, stats, topEleves] = await Promise.all([
      c.env.DB.prepare('SELECT * FROM classes WHERE id = ?').bind(classe_id).first<any>(),
      c.env.DB.prepare(`
        SELECT AVG(n.note) as moyenne_classe, MAX(n.note) as meilleure_note,
               MIN(n.note) as moins_bonne, COUNT(DISTINCT n.eleve_id) as nb_eleves_notes
        FROM notes n JOIN matieres m ON n.matiere_id = m.id WHERE m.classe_id = ?
      `).bind(classe_id).first<any>(),
      c.env.DB.prepare(`
        SELECT e.nom, e.prenom, e.matricule, AVG(n.note * n.coefficient) / AVG(n.coefficient) as moyenne
        FROM eleves e JOIN notes n ON n.eleve_id = e.id
        JOIN matieres m ON n.matiere_id = m.id
        WHERE e.classe_id = ? AND e.actif = 1
        GROUP BY e.id ORDER BY moyenne DESC LIMIT 5
      `).bind(classe_id).all()
    ]);

    return c.json({ success: true, data: { classe, stats, top_eleves: topEleves.results } });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ---- DEVOIRS ----
export const devoirsRoutes = new Hono<{ Bindings: Bindings }>();

devoirsRoutes.get('/', authMiddleware(), async (c) => {
  try {
    const { matiere_id, professeur_id, classe_id } = c.req.query();
    let query = `
      SELECT d.*, m.nom_matiere, c.nom_classe, u.nom as prof_nom, u.prenom as prof_prenom
      FROM devoirs d
      JOIN matieres m ON d.matiere_id = m.id
      LEFT JOIN classes c ON m.classe_id = c.id
      LEFT JOIN users u ON d.professeur_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (matiere_id) { query += ' AND d.matiere_id = ?'; params.push(matiere_id); }
    if (professeur_id) { query += ' AND d.professeur_id = ?'; params.push(professeur_id); }
    if (classe_id) { query += ' AND m.classe_id = ?'; params.push(classe_id); }
    query += ' ORDER BY d.date_donnee DESC';

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

devoirsRoutes.post('/', authMiddleware(['admin', 'professeur']), async (c) => {
  try {
    const user = getUser(c);
    const { matiere_id, titre, description, date_donnee, date_remise } = await c.req.json();
    if (!matiere_id || !titre || !date_donnee) return c.json({ success: false, error: 'Données manquantes.' }, 400);

    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO devoirs (id, matiere_id, professeur_id, titre, description, date_donnee, date_remise)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, matiere_id, user.sub, titre, description || '', date_donnee, date_remise || null).run();

    return c.json({ success: true, data: { id }, message: 'Devoir créé.' }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

devoirsRoutes.put('/:id', authMiddleware(['admin', 'professeur']), async (c) => {
  try {
    const id = c.req.param('id');
    const { titre, description, date_donnee, date_remise } = await c.req.json();
    await c.env.DB.prepare(`
      UPDATE devoirs SET titre = ?, description = ?, date_donnee = ?, date_remise = ? WHERE id = ?
    `).bind(titre, description, date_donnee, date_remise, id).run();
    return c.json({ success: true, message: 'Devoir mis à jour.' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

devoirsRoutes.delete('/:id', authMiddleware(['admin', 'professeur']), async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM devoirs WHERE id = ?').bind(id).run();
    return c.json({ success: true, message: 'Devoir supprimé.' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ---- CAHIER DE TEXTE ----
export const cahierRoutes = new Hono<{ Bindings: Bindings }>();

cahierRoutes.get('/', authMiddleware(), async (c) => {
  try {
    const { matiere_id, classe_id, date_debut, date_fin } = c.req.query();
    let query = `
      SELECT ct.*, m.nom_matiere, c.nom_classe, u.nom as prof_nom
      FROM cahier_texte ct
      JOIN matieres m ON ct.matiere_id = m.id
      LEFT JOIN classes c ON m.classe_id = c.id
      LEFT JOIN users u ON ct.professeur_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (matiere_id) { query += ' AND ct.matiere_id = ?'; params.push(matiere_id); }
    if (classe_id) { query += ' AND m.classe_id = ?'; params.push(classe_id); }
    if (date_debut) { query += ' AND ct.date_cours >= ?'; params.push(date_debut); }
    if (date_fin) { query += ' AND ct.date_cours <= ?'; params.push(date_fin); }
    query += ' ORDER BY ct.date_cours DESC';

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

cahierRoutes.post('/', authMiddleware(['admin', 'professeur']), async (c) => {
  try {
    const user = getUser(c);
    const { matiere_id, date_cours, contenu, objectifs } = await c.req.json();
    if (!matiere_id || !date_cours || !contenu) return c.json({ success: false, error: 'Données manquantes.' }, 400);

    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO cahier_texte (id, matiere_id, professeur_id, date_cours, contenu, objectifs)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, matiere_id, user.sub, date_cours, contenu, objectifs || '').run();
    return c.json({ success: true, data: { id }, message: 'Entrée ajoutée au cahier de texte.' }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ---- RENDEZ-VOUS ----
export const rdvRoutes = new Hono<{ Bindings: Bindings }>();

rdvRoutes.get('/', authMiddleware(), async (c) => {
  try {
    const user = getUser(c);
    let query = `
      SELECT r.*, u_p.nom as parent_nom, u_p.prenom as parent_prenom,
             u_pr.nom as prof_nom, u_pr.prenom as prof_prenom
      FROM rendez_vous r
      JOIN parents p ON r.parent_id = p.id JOIN users u_p ON p.user_id = u_p.id
      JOIN users u_pr ON r.professeur_id = u_pr.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (user.role === 'parent') {
      const parent = await c.env.DB.prepare('SELECT id FROM parents WHERE user_id = ?').bind(user.sub).first<any>();
      if (parent) { query += ' AND r.parent_id = ?'; params.push(parent.id); }
    } else if (user.role === 'professeur') {
      query += ' AND r.professeur_id = ?'; params.push(user.sub);
    }
    query += ' ORDER BY r.date_rdv DESC';

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

rdvRoutes.post('/', authMiddleware(), async (c) => {
  try {
    const user = getUser(c);
    const { parent_id, professeur_id, date_rdv, motif } = await c.req.json();

    const id = generateId();
    let pId = parent_id;
    if (!pId && user.role === 'parent') {
      const p = await c.env.DB.prepare('SELECT id FROM parents WHERE user_id = ?').bind(user.sub).first<any>();
      pId = p?.id;
    }

    await c.env.DB.prepare(`
      INSERT INTO rendez_vous (id, parent_id, professeur_id, date_rdv, motif)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, pId, professeur_id, date_rdv, motif || '').run();

    // Notif au professeur
    await c.env.DB.prepare(
      'INSERT INTO notifications (id, utilisateur_id, message, type) VALUES (?, ?, ?, ?)'
    ).bind(generateId(), professeur_id, `Demande de rendez-vous le ${date_rdv} - Motif: ${motif}`, 'rendez_vous').run();

    return c.json({ success: true, data: { id }, message: 'Rendez-vous demandé.' }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

rdvRoutes.put('/:id', authMiddleware(['admin', 'professeur']), async (c) => {
  try {
    const id = c.req.param('id');
    const { statut, notes } = await c.req.json();
    await c.env.DB.prepare('UPDATE rendez_vous SET statut = ?, notes = ? WHERE id = ?')
      .bind(statut, notes || '', id).run();
    return c.json({ success: true, message: 'Rendez-vous mis à jour.' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ---- BADGES ----
export const badgesRoutes = new Hono<{ Bindings: Bindings }>();

badgesRoutes.get('/', authMiddleware(), async (c) => {
  try {
    const { results } = await c.env.DB.prepare('SELECT * FROM badges ORDER BY nom').all();
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

badgesRoutes.post('/attribuer', authMiddleware(['admin', 'professeur']), async (c) => {
  try {
    const user = getUser(c);
    const { eleve_id, badge_id } = await c.req.json();
    const id = generateId();

    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO badges_eleves (id, eleve_id, badge_id, attribue_par)
      VALUES (?, ?, ?, ?)
    `).bind(id, eleve_id, badge_id, user.sub).run();

    const badge = await c.env.DB.prepare('SELECT * FROM badges WHERE id = ?').bind(badge_id).first<any>();
    const eleve = await c.env.DB.prepare('SELECT *, (SELECT user_id FROM parents WHERE id = eleves.parent_id) as parent_user FROM eleves WHERE id = ?').bind(eleve_id).first<any>();

    if (eleve?.parent_user) {
      await c.env.DB.prepare(
        'INSERT INTO notifications (id, utilisateur_id, message, type) VALUES (?, ?, ?, ?)'
      ).bind(generateId(), eleve.parent_user,
        `Félicitations ! ${eleve.prenom} a reçu le badge "${badge?.nom}" ${badge?.icone}`, 'info').run();
    }

    return c.json({ success: true, message: `Badge "${badge?.nom}" attribué.` }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

badgesRoutes.get('/eleve/:id', authMiddleware(), async (c) => {
  try {
    const id = c.req.param('id');
    const { results } = await c.env.DB.prepare(`
      SELECT be.*, b.nom, b.description, b.icone, b.couleur,
             u.nom as attribue_nom
      FROM badges_eleves be
      JOIN badges b ON be.badge_id = b.id
      LEFT JOIN users u ON be.attribue_par = u.id
      WHERE be.eleve_id = ?
      ORDER BY be.date_attribution DESC
    `).bind(id).all();
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ---- TRANSPORT ----
export const transportRoutes = new Hono<{ Bindings: Bindings }>();

transportRoutes.get('/', authMiddleware(), async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT t.*, COUNT(te.id) as nb_eleves
      FROM transport t LEFT JOIN transport_eleves te ON te.transport_id = t.id AND te.actif = 1
      GROUP BY t.id
    `).all();
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

transportRoutes.post('/', authMiddleware(['admin']), async (c) => {
  try {
    const { nom_ligne, chauffeur, vehicule, capacite, itineraire } = await c.req.json();
    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO transport (id, nom_ligne, chauffeur, vehicule, capacite, itineraire)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, nom_ligne, chauffeur, vehicule, capacite, itineraire).run();
    return c.json({ success: true, data: { id }, message: 'Ligne de transport créée.' }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

transportRoutes.post('/inscrire', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const { eleve_id, transport_id, point_arret, sens } = await c.req.json();
    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO transport_eleves (id, eleve_id, transport_id, point_arret, sens)
      VALUES (?, ?, ?, ?, ?)
    `).bind(id, eleve_id, transport_id, point_arret, sens || 'aller_retour').run();
    return c.json({ success: true, message: 'Élève inscrit au transport.' }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ---- BIBLIOTHÈQUE ----
export const bibliothequeRoutes = new Hono<{ Bindings: Bindings }>();

bibliothequeRoutes.get('/', authMiddleware(), async (c) => {
  try {
    const { categorie, search } = c.req.query();
    let query = `
      SELECT b.*, u.nom as ajoute_par_nom
      FROM bibliotheque b LEFT JOIN users u ON b.ajoute_par = u.id
      WHERE b.disponible = 1
    `;
    const params: any[] = [];
    if (categorie) { query += ' AND b.categorie = ?'; params.push(categorie); }
    if (search) {
      query += ' AND (b.titre LIKE ? OR b.auteur LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY b.titre';

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

bibliothequeRoutes.post('/', authMiddleware(['admin', 'professeur']), async (c) => {
  try {
    const user = getUser(c);
    const { titre, auteur, categorie, description, fichier_url, couverture_url, classe_ids } = await c.req.json();
    if (!titre) return c.json({ success: false, error: 'Titre requis.' }, 400);

    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO bibliotheque (id, titre, auteur, categorie, description, fichier_url, couverture_url, classe_ids, ajoute_par)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, titre, auteur || '', categorie || 'Général', description || '',
      fichier_url || '', couverture_url || '', JSON.stringify(classe_ids || []), user.sub).run();

    return c.json({ success: true, data: { id }, message: 'Document ajouté à la bibliothèque.' }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ---- EMPLOI DU TEMPS ----
export const edtRoutes = new Hono<{ Bindings: Bindings }>();

edtRoutes.get('/', authMiddleware(), async (c) => {
  try {
    const { classe_id, professeur_id } = c.req.query();
    let query = `
      SELECT edt.*, m.nom_matiere, c.nom_classe,
             u.nom as prof_nom, u.prenom as prof_prenom
      FROM emplois_du_temps edt
      JOIN matieres m ON edt.matiere_id = m.id
      JOIN classes c ON edt.classe_id = c.id
      JOIN users u ON edt.professeur_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];
    if (classe_id) { query += ' AND edt.classe_id = ?'; params.push(classe_id); }
    if (professeur_id) { query += ' AND edt.professeur_id = ?'; params.push(professeur_id); }
    query += " ORDER BY CASE edt.jour WHEN 'Lundi' THEN 1 WHEN 'Mardi' THEN 2 WHEN 'Mercredi' THEN 3 WHEN 'Jeudi' THEN 4 WHEN 'Vendredi' THEN 5 WHEN 'Samedi' THEN 6 END, edt.heure_debut";

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

edtRoutes.post('/', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const { classe_id, matiere_id, professeur_id, jour, heure_debut, heure_fin, salle } = await c.req.json();
    if (!classe_id || !matiere_id || !jour || !heure_debut) return c.json({ success: false, error: 'Données manquantes.' }, 400);

    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO emplois_du_temps (id, classe_id, matiere_id, professeur_id, jour, heure_debut, heure_fin, salle)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, classe_id, matiere_id, professeur_id, jour, heure_debut, heure_fin || '', salle || '').run();

    return c.json({ success: true, data: { id }, message: 'Cours ajouté à l\'emploi du temps.' }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

edtRoutes.delete('/:id', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM emplois_du_temps WHERE id = ?').bind(id).run();
    return c.json({ success: true, message: 'Cours supprimé de l\'emploi du temps.' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});
