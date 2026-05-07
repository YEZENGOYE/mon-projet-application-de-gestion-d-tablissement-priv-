// ============================================================
// ROUTES FINANCES PROFESSEURS
// Contrats, Heures de travail, Fiches de paie
// ============================================================

import { Hono } from 'hono';
import { Bindings } from '../types/index.js';
import { authMiddleware, getUser } from '../middleware/auth.js';
import { generateId } from '../utils/helpers.js';

export const financesProfsRoutes = new Hono<{ Bindings: Bindings }>();

// ============================================================
// CONTRATS
// ============================================================

// GET /api/finances-profs/contrats — liste tous les contrats
financesProfsRoutes.get('/contrats', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT cp.*, u.nom, u.prenom, u.email, u.telephone,
             COUNT(DISTINCT m.id) as nb_matieres,
             COUNT(DISTINCT m.classe_id) as nb_classes
      FROM contrats_professeurs cp
      JOIN users u ON cp.professeur_id = u.id
      LEFT JOIN matieres m ON m.professeur_id = u.id
      WHERE cp.statut = 'actif'
      GROUP BY cp.id ORDER BY u.nom
    `).all();
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// GET /api/finances-profs/contrats/:prof_id — contrat d'un professeur
financesProfsRoutes.get('/contrats/:prof_id', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const prof_id = c.req.param('prof_id');
    const contrat = await c.env.DB.prepare(`
      SELECT cp.*, u.nom, u.prenom, u.email, u.telephone
      FROM contrats_professeurs cp JOIN users u ON cp.professeur_id = u.id
      WHERE cp.professeur_id = ? AND cp.statut = 'actif'
      ORDER BY cp.created_at DESC LIMIT 1
    `).bind(prof_id).first();
    return c.json({ success: true, data: contrat || null });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// POST /api/finances-profs/contrats — créer/mettre à jour un contrat
financesProfsRoutes.post('/contrats', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const user = getUser(c);
    const { professeur_id, type_contrat, salaire_base, taux_horaire,
            date_debut, date_fin, nb_heures_semaine } = await c.req.json();
    if (!professeur_id) return c.json({ success: false, error: 'Professeur requis.' }, 400);

    // Désactiver l'ancien contrat
    await c.env.DB.prepare(
      "UPDATE contrats_professeurs SET statut = 'termine' WHERE professeur_id = ? AND statut = 'actif'"
    ).bind(professeur_id).run();

    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO contrats_professeurs
        (id, professeur_id, type_contrat, salaire_base, taux_horaire, date_debut, date_fin, nb_heures_semaine, statut)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'actif')
    `).bind(id, professeur_id, type_contrat || 'CDI',
      salaire_base || 0, taux_horaire || 0,
      date_debut || null, date_fin || null, nb_heures_semaine || 0).run();

    return c.json({ success: true, data: { id }, message: 'Contrat créé avec succès.' }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ============================================================
// HEURES DE TRAVAIL
// ============================================================

// GET /api/finances-profs/heures?prof_id=&mois=&annee=
financesProfsRoutes.get('/heures', authMiddleware(['admin', 'secretariat', 'professeur']), async (c) => {
  try {
    const user = getUser(c);
    const { prof_id, mois, annee, annee_scolaire = '2024-2025' } = c.req.query();

    // Un professeur ne voit que ses propres heures
    const targetProfId = (user.role === 'professeur') ? user.sub : (prof_id || null);

    let query = `
      SELECT h.*, u.nom as prof_nom, u.prenom as prof_prenom,
             c.nom_classe, m.nom_matiere
      FROM heures_travail h
      JOIN users u ON h.professeur_id = u.id
      LEFT JOIN classes c ON h.classe_id = c.id
      LEFT JOIN matieres m ON h.matiere_id = m.id
      WHERE h.annee_scolaire = ?
    `;
    const params: any[] = [annee_scolaire];

    if (targetProfId) { query += ' AND h.professeur_id = ?'; params.push(targetProfId); }
    if (mois && annee) {
      const debut = `${annee}-${String(mois).padStart(2,'0')}-01`;
      const fin   = `${annee}-${String(mois).padStart(2,'0')}-31`;
      query += ' AND h.date_cours >= ? AND h.date_cours <= ?';
      params.push(debut, fin);
    }
    query += ' ORDER BY h.date_cours DESC, u.nom';

    const { results } = await c.env.DB.prepare(query).bind(...params).all();

    // Totaux
    const totalHeures = (results as any[]).reduce((s, r) => s + (r.nb_heures || 0), 0);
    const totalValidees = (results as any[]).filter((r: any) => r.valide).reduce((s, r) => s + (r.nb_heures || 0), 0);

    return c.json({ success: true, data: results, total_heures: totalHeures, total_validees: totalValidees });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// POST /api/finances-profs/heures — saisir des heures
financesProfsRoutes.post('/heures', authMiddleware(['admin', 'secretariat', 'professeur']), async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json();
    const liste = Array.isArray(body) ? body : [body];
    const inseres: string[] = [];

    for (const item of liste) {
      const { professeur_id, classe_id, matiere_id, date_cours,
              heure_debut, heure_fin, type_heure, annee_scolaire } = item;
      if (!date_cours || !heure_debut || !heure_fin) continue;

      const profId = (user.role === 'professeur') ? user.sub : (professeur_id || user.sub);

      // Calculer les heures automatiquement
      const [hD, mD] = heure_debut.split(':').map(Number);
      const [hF, mF] = heure_fin.split(':').map(Number);
      const nb_heures = Math.round(((hF * 60 + mF) - (hD * 60 + mD)) / 60 * 100) / 100;
      if (nb_heures <= 0) continue;

      const id = generateId();
      await c.env.DB.prepare(`
        INSERT INTO heures_travail
          (id, professeur_id, classe_id, matiere_id, date_cours, heure_debut, heure_fin, nb_heures, type_heure, annee_scolaire)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, profId, classe_id || null, matiere_id || null,
        date_cours, heure_debut, heure_fin, nb_heures,
        type_heure || 'cours', annee_scolaire || '2024-2025').run();
      inseres.push(id);
    }

    return c.json({ success: true, data: { inseres: inseres.length }, message: `${inseres.length} heure(s) enregistrée(s).` }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// PUT /api/finances-profs/heures/:id/valider — valider des heures
financesProfsRoutes.put('/heures/:id/valider', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param('id');
    await c.env.DB.prepare(
      'UPDATE heures_travail SET valide = 1, valide_par = ? WHERE id = ?'
    ).bind(user.sub, id).run();
    return c.json({ success: true, message: 'Heures validées.' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// PUT /api/finances-profs/heures/valider-mois — valider toutes les heures d'un mois
financesProfsRoutes.put('/heures/valider-mois', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const user = getUser(c);
    const { prof_id, mois, annee } = await c.req.json();
    const debut = `${annee}-${String(mois).padStart(2,'0')}-01`;
    const fin   = `${annee}-${String(mois).padStart(2,'0')}-31`;
    const res = await c.env.DB.prepare(`
      UPDATE heures_travail SET valide = 1, valide_par = ?
      WHERE professeur_id = ? AND date_cours >= ? AND date_cours <= ? AND valide = 0
    `).bind(user.sub, prof_id, debut, fin).run();
    return c.json({ success: true, message: `${res.meta.changes} heures validées.` });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// DELETE /api/finances-profs/heures/:id
financesProfsRoutes.delete('/heures/:id', authMiddleware(['admin', 'secretariat', 'professeur']), async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM heures_travail WHERE id = ? AND valide = 0').bind(id).run();
    return c.json({ success: true, message: 'Heure supprimée.' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ============================================================
// FICHES DE PAIE
// ============================================================

// GET /api/finances-profs/fiches?prof_id=&mois=&annee=
financesProfsRoutes.get('/fiches', authMiddleware(['admin', 'secretariat', 'professeur']), async (c) => {
  try {
    const user = getUser(c);
    const { prof_id, mois, annee, annee_scolaire = '2024-2025' } = c.req.query();
    const targetId = (user.role === 'professeur') ? user.sub : (prof_id || null);

    let query = `
      SELECT fp.*, u.nom, u.prenom, u.email
      FROM fiches_paie fp JOIN users u ON fp.professeur_id = u.id
      WHERE fp.annee_scolaire = ?
    `;
    const params: any[] = [annee_scolaire];
    if (targetId) { query += ' AND fp.professeur_id = ?'; params.push(targetId); }
    if (mois) { query += ' AND fp.mois = ?'; params.push(parseInt(mois)); }
    if (annee) { query += ' AND fp.annee = ?'; params.push(parseInt(annee)); }
    query += ' ORDER BY fp.annee DESC, fp.mois DESC, u.nom';

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// POST /api/finances-profs/fiches/generer — générer une fiche de paie automatiquement
financesProfsRoutes.post('/fiches/generer', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const user = getUser(c);
    const { professeur_id, mois, annee, primes = 0, retenues = 0, annee_scolaire = '2024-2025' } = await c.req.json();
    if (!professeur_id || !mois || !annee) return c.json({ success: false, error: 'Données manquantes.' }, 400);

    // Récupérer le contrat actif
    const contrat = await c.env.DB.prepare(
      "SELECT * FROM contrats_professeurs WHERE professeur_id = ? AND statut = 'actif' ORDER BY created_at DESC LIMIT 1"
    ).bind(professeur_id).first<any>();

    // Calculer les heures validées du mois
    const debut = `${annee}-${String(mois).padStart(2,'0')}-01`;
    const fin   = `${annee}-${String(mois).padStart(2,'0')}-31`;
    const heuresData = await c.env.DB.prepare(`
      SELECT SUM(nb_heures) as total_heures FROM heures_travail
      WHERE professeur_id = ? AND date_cours >= ? AND date_cours <= ? AND valide = 1
    `).bind(professeur_id, debut, fin).first<any>();

    const salaire_base = contrat?.salaire_base || 0;
    const taux_horaire = contrat?.taux_horaire || 0;
    const nb_heures = heuresData?.total_heures || 0;
    const montant_heures = nb_heures * taux_horaire;
    const net_a_payer = salaire_base + montant_heures + Number(primes) - Number(retenues);

    // Supprimer l'ancienne fiche brouillon si elle existe
    await c.env.DB.prepare(
      "DELETE FROM fiches_paie WHERE professeur_id = ? AND mois = ? AND annee = ? AND statut = 'brouillon'"
    ).bind(professeur_id, mois, annee).run();

    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO fiches_paie
        (id, professeur_id, mois, annee, annee_scolaire, salaire_base, nb_heures_effectuees,
         montant_heures, primes, retenues, net_a_payer, statut, genere_par)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'brouillon', ?)
    `).bind(id, professeur_id, mois, annee, annee_scolaire,
      salaire_base, nb_heures, montant_heures, primes, retenues, net_a_payer, user.sub).run();

    // Récupérer le professeur
    const prof = await c.env.DB.prepare(
      'SELECT nom, prenom FROM users WHERE id = ?'
    ).bind(professeur_id).first<any>();

    const MOIS_FR = ['','Janvier','Février','Mars','Avril','Mai','Juin',
                     'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
    return c.json({
      success: true,
      data: {
        id, professeur_id,
        nom: prof?.nom, prenom: prof?.prenom,
        periode: `${MOIS_FR[mois]} ${annee}`,
        mois, annee, annee_scolaire,
        salaire_base, nb_heures_effectuees: nb_heures,
        montant_heures, primes: Number(primes),
        retenues: Number(retenues), net_a_payer,
        statut: 'brouillon',
        contrat_type: contrat?.type_contrat || 'N/A'
      },
      message: `Fiche de paie générée — Net à payer : ${net_a_payer.toLocaleString('fr-FR')} FCFA`
    }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// POST /api/finances-profs/fiches/generer-tous — générer fiches pour tous les profs d'un mois
financesProfsRoutes.post('/fiches/generer-tous', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const user = getUser(c);
    const { mois, annee, annee_scolaire = '2024-2025' } = await c.req.json();
    if (!mois || !annee) return c.json({ success: false, error: 'Mois et année requis.' }, 400);

    const { results: profs } = await c.env.DB.prepare(
      "SELECT id, nom, prenom FROM users WHERE role = 'professeur' AND actif = 1"
    ).all<any>();

    const debut = `${annee}-${String(mois).padStart(2,'0')}-01`;
    const fin   = `${annee}-${String(mois).padStart(2,'0')}-31`;
    const generated: any[] = [];

    for (const prof of profs) {
      const contrat = await c.env.DB.prepare(
        "SELECT * FROM contrats_professeurs WHERE professeur_id = ? AND statut = 'actif' ORDER BY created_at DESC LIMIT 1"
      ).bind(prof.id).first<any>();

      const heuresData = await c.env.DB.prepare(`
        SELECT SUM(nb_heures) as total FROM heures_travail
        WHERE professeur_id = ? AND date_cours >= ? AND date_cours <= ? AND valide = 1
      `).bind(prof.id, debut, fin).first<any>();

      const salaire_base = contrat?.salaire_base || 0;
      const taux_horaire = contrat?.taux_horaire || 0;
      const nb_heures    = heuresData?.total || 0;
      const montant_heures = nb_heures * taux_horaire;
      const net_a_payer = salaire_base + montant_heures;

      await c.env.DB.prepare(
        "DELETE FROM fiches_paie WHERE professeur_id = ? AND mois = ? AND annee = ? AND statut = 'brouillon'"
      ).bind(prof.id, mois, annee).run();

      const id = generateId();
      await c.env.DB.prepare(`
        INSERT INTO fiches_paie (id, professeur_id, mois, annee, annee_scolaire, salaire_base,
          nb_heures_effectuees, montant_heures, primes, retenues, net_a_payer, statut, genere_par)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 'brouillon', ?)
      `).bind(id, prof.id, mois, annee, annee_scolaire, salaire_base, nb_heures, montant_heures, net_a_payer, user.sub).run();

      generated.push({ id, nom: prof.nom, prenom: prof.prenom, nb_heures, net_a_payer });
    }

    return c.json({
      success: true,
      data: generated,
      message: `${generated.length} fiche(s) générée(s) pour ${mois}/${annee}.`
    }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// PUT /api/finances-profs/fiches/:id/valider — valider et marquer comme payée
financesProfsRoutes.put('/fiches/:id/valider', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const id = c.req.param('id');
    const { statut, mode_paiement, reference_paiement } = await c.req.json();
    await c.env.DB.prepare(`
      UPDATE fiches_paie SET statut = ?, mode_paiement = ?, reference_paiement = ?,
             date_paiement = CASE WHEN ? = 'paye' THEN date('now') ELSE date_paiement END
      WHERE id = ?
    `).bind(statut || 'valide', mode_paiement || null, reference_paiement || null, statut || 'valide', id).run();

    if (statut === 'paye') {
      const fiche = await c.env.DB.prepare('SELECT * FROM fiches_paie WHERE id = ?').bind(id).first<any>();
      if (fiche) {
        const MOIS_FR = ['','Janvier','Février','Mars','Avril','Mai','Juin',
                         'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
        await c.env.DB.prepare(
          'INSERT INTO notifications (id, utilisateur_id, message, type) VALUES (?, ?, ?, ?)'
        ).bind(generateId(), fiche.professeur_id,
          `Votre salaire de ${MOIS_FR[fiche.mois]} ${fiche.annee} a été versé : ${fiche.net_a_payer.toLocaleString('fr-FR')} FCFA`,
          'paiement').run();
      }
    }
    return c.json({ success: true, message: `Fiche ${statut === 'paye' ? 'payée' : 'validée'} avec succès.` });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// GET /api/finances-profs/tableau-bord — résumé global finances profs
financesProfsRoutes.get('/tableau-bord', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const annee_scolaire = c.req.query('annee_scolaire') || '2024-2025';

    const [profs, heures, fiches] = await Promise.all([
      c.env.DB.prepare("SELECT COUNT(*) as total FROM users WHERE role = 'professeur' AND actif = 1").first<any>(),
      c.env.DB.prepare(`SELECT SUM(nb_heures) as total, SUM(CASE WHEN valide=1 THEN nb_heures ELSE 0 END) as validees
                        FROM heures_travail WHERE annee_scolaire = ?`).bind(annee_scolaire).first<any>(),
      c.env.DB.prepare(`SELECT SUM(net_a_payer) as total_paye,
                               SUM(CASE WHEN statut='paye' THEN net_a_payer ELSE 0 END) as total_verse,
                               COUNT(*) as nb_fiches,
                               SUM(CASE WHEN statut='brouillon' THEN 1 ELSE 0 END) as en_attente
                        FROM fiches_paie WHERE annee_scolaire = ?`).bind(annee_scolaire).first<any>(),
    ]);

    // Top professeurs par heures
    const { results: topProfs } = await c.env.DB.prepare(`
      SELECT u.nom, u.prenom, SUM(h.nb_heures) as total_heures,
             SUM(CASE WHEN h.valide=1 THEN h.nb_heures ELSE 0 END) as heures_validees
      FROM heures_travail h JOIN users u ON h.professeur_id = u.id
      WHERE h.annee_scolaire = ?
      GROUP BY h.professeur_id ORDER BY total_heures DESC LIMIT 5
    `).bind(annee_scolaire).all();

    return c.json({
      success: true,
      data: {
        nb_professeurs: profs?.total || 0,
        total_heures: heures?.total || 0,
        heures_validees: heures?.validees || 0,
        total_a_verser: fiches?.total_paye || 0,
        total_verse: fiches?.total_verse || 0,
        nb_fiches: fiches?.nb_fiches || 0,
        fiches_en_attente: fiches?.en_attente || 0,
        top_profs: topProfs
      }
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// GET /api/finances-profs/recap/:prof_id — récap complet d'un prof
financesProfsRoutes.get('/recap/:prof_id', authMiddleware(['admin', 'secretariat', 'professeur']), async (c) => {
  try {
    const user = getUser(c);
    const prof_id = c.req.param('prof_id');
    const targetId = (user.role === 'professeur') ? user.sub : prof_id;

    const [prof, contrat, heuresMois, fichesAnnee] = await Promise.all([
      c.env.DB.prepare(`
        SELECT u.*, COUNT(DISTINCT m.id) as nb_matieres, COUNT(DISTINCT m.classe_id) as nb_classes
        FROM users u LEFT JOIN matieres m ON m.professeur_id = u.id WHERE u.id = ? GROUP BY u.id
      `).bind(targetId).first<any>(),
      c.env.DB.prepare(
        "SELECT * FROM contrats_professeurs WHERE professeur_id = ? AND statut = 'actif' ORDER BY created_at DESC LIMIT 1"
      ).bind(targetId).first<any>(),
      c.env.DB.prepare(`
        SELECT strftime('%Y-%m', date_cours) as mois_annee,
               SUM(nb_heures) as total, SUM(CASE WHEN valide=1 THEN nb_heures ELSE 0 END) as validees,
               COUNT(*) as nb_seances
        FROM heures_travail WHERE professeur_id = ? AND annee_scolaire = '2024-2025'
        GROUP BY mois_annee ORDER BY mois_annee DESC LIMIT 6
      `).bind(targetId).all(),
      c.env.DB.prepare(
        "SELECT * FROM fiches_paie WHERE professeur_id = ? ORDER BY annee DESC, mois DESC LIMIT 12"
      ).bind(targetId).all(),
    ]);

    if (!prof) return c.json({ success: false, error: 'Professeur introuvable.' }, 404);

    return c.json({
      success: true,
      data: {
        professeur: { ...prof, mot_de_passe_hash: undefined },
        contrat: contrat || null,
        heures_par_mois: heuresMois.results,
        fiches_paie: fichesAnnee.results
      }
    });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});
