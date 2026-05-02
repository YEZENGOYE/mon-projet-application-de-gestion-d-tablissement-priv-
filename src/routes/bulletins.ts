// ============================================================
// ROUTES BULLETINS SCOLAIRES - Génération Automatique
// ============================================================

import { Hono } from 'hono';
import { Bindings } from '../types/index.js';
import { authMiddleware, getUser } from '../middleware/auth.js';
import { generateId } from '../utils/helpers.js';

export const bulletinsRoutes = new Hono<{ Bindings: Bindings }>();

// ============================================================
// FONCTION CALCUL BULLETIN COMPLET POUR UN ÉLÈVE
// ============================================================
async function calculerBulletin(db: D1Database, eleve_id: string, trimestre: number, annee_scolaire: string) {
  // Récupérer l'élève avec sa classe
  const eleve = await db.prepare(`
    SELECT e.*, c.nom_classe, c.niveau, c.filiere, c.id as classe_id,
           u.nom as prof_nom, u.prenom as prof_prenom
    FROM eleves e
    LEFT JOIN classes c ON e.classe_id = c.id
    LEFT JOIN users u ON c.professeur_principal_id = u.id
    WHERE e.id = ?
  `).bind(eleve_id).first<any>();

  if (!eleve) return null;

  // Récupérer toutes les matières de la classe
  const { results: matieres } = await db.prepare(`
    SELECT m.*, u.nom as prof_nom, u.prenom as prof_prenom
    FROM matieres m
    LEFT JOIN users u ON m.professeur_id = u.id
    WHERE m.classe_id = ?
    ORDER BY m.coefficient DESC, m.nom_matiere
  `).bind(eleve.classe_id).all<any>();

  // Récupérer toutes les notes du trimestre
  const { results: notes } = await db.prepare(`
    SELECT n.*, m.nom_matiere, m.coefficient as coef_matiere
    FROM notes n
    JOIN matieres m ON n.matiere_id = m.id
    WHERE n.eleve_id = ? AND n.trimestre = ? AND n.annee_scolaire = ?
    ORDER BY m.nom_matiere, n.date
  `).bind(eleve_id, trimestre, annee_scolaire).all<any>();

  // Récupérer les absences du trimestre (approx par date)
  const dateDebut = trimestre === 1 ? `${annee_scolaire.split('-')[0]}-09-01`
    : trimestre === 2 ? `${annee_scolaire.split('-')[0]}-01-01`
    : `${annee_scolaire.split('-')[1]}-04-01`;
  const dateFin = trimestre === 1 ? `${annee_scolaire.split('-')[0]}-12-31`
    : trimestre === 2 ? `${annee_scolaire.split('-')[1]}-03-31`
    : `${annee_scolaire.split('-')[1]}-06-30`;

  const { results: absences } = await db.prepare(`
    SELECT * FROM absences
    WHERE eleve_id = ? AND date >= ? AND date <= ?
  `).bind(eleve_id, dateDebut, dateFin).all<any>();

  const nbAbsences = absences.filter((a: any) => a.statut === 'absent').length;
  const nbRetards = absences.filter((a: any) => a.statut === 'retard').length;
  const nbJustifies = absences.filter((a: any) => a.statut === 'justifie').length;

  // Calculer les moyennes par matière
  const lignesMatieres: any[] = [];
  let totalPoints = 0;
  let totalCoefs = 0;

  for (const mat of matieres) {
    const notesMatiere = notes.filter((n: any) => n.matiere_id === mat.id);
    
    let moyenneMatiere: number | null = null;
    if (notesMatiere.length > 0) {
      const sumPond = notesMatiere.reduce((s: number, n: any) => s + n.note * n.coefficient, 0);
      const sumCoef = notesMatiere.reduce((s: number, n: any) => s + n.coefficient, 0);
      moyenneMatiere = sumCoef > 0 ? Math.round((sumPond / sumCoef) * 100) / 100 : null;
    }

    if (moyenneMatiere !== null) {
      totalPoints += moyenneMatiere * mat.coefficient;
      totalCoefs += mat.coefficient;
    }

    lignesMatieres.push({
      matiere_id: mat.id,
      nom_matiere: mat.nom_matiere,
      coefficient: mat.coefficient,
      professeur: mat.prof_prenom ? `${mat.prof_prenom} ${mat.prof_nom}` : '-',
      notes: notesMatiere.map((n: any) => ({ note: n.note, type: n.type_evaluation, libelle: n.libelle, coef: n.coefficient })),
      moyenne: moyenneMatiere,
      appreciation: getAppreciation(moyenneMatiere)
    });
  }

  const moyenneGenerale = totalCoefs > 0 ? Math.round((totalPoints / totalCoefs) * 100) / 100 : 0;
  const mention = getMention(moyenneGenerale);
  const appreciation = getAppreciationGenerale(moyenneGenerale, nbAbsences);

  return {
    eleve: {
      id: eleve.id,
      matricule: eleve.matricule,
      nom: eleve.nom,
      prenom: eleve.prenom,
      date_naissance: eleve.date_naissance,
      classe: eleve.nom_classe,
      niveau: eleve.niveau,
      filiere: eleve.filiere,
      photo: eleve.photo
    },
    professeur_principal: eleve.prof_prenom ? `${eleve.prof_prenom} ${eleve.prof_nom}` : '-',
    trimestre,
    annee_scolaire,
    matieres: lignesMatieres,
    moyenne_generale: moyenneGenerale,
    mention,
    appreciation,
    absences: {
      total: nbAbsences + nbRetards + nbJustifies,
      injustifiees: nbAbsences,
      retards: nbRetards,
      justifiees: nbJustifies
    },
    etablissement: 'LYCÉE PRIVÉ GABON',
    date_generation: new Date().toISOString()
  };
}

function getAppreciation(moyenne: number | null): string {
  if (moyenne === null) return 'Non évalué';
  if (moyenne >= 18) return 'Excellent';
  if (moyenne >= 16) return 'Très bien';
  if (moyenne >= 14) return 'Bien';
  if (moyenne >= 12) return 'Assez bien';
  if (moyenne >= 10) return 'Passable';
  if (moyenne >= 7)  return 'Insuffisant';
  return 'Très insuffisant';
}

function getMention(moyenne: number): string {
  if (moyenne >= 18) return 'Félicitations';
  if (moyenne >= 16) return 'Compliments';
  if (moyenne >= 14) return 'Encouragements';
  if (moyenne >= 10) return 'Passable';
  return 'Avertissement';
}

function getAppreciationGenerale(moyenne: number, absences: number): string {
  if (moyenne >= 16 && absences === 0) return 'Élève exemplaire. Continuez sur cette lancée remarquable.';
  if (moyenne >= 16) return 'Excellent niveau académique. Veiller à l\'assiduité.';
  if (moyenne >= 14) return 'Bon travail. Des efforts supplémentaires permettraient d\'atteindre l\'excellence.';
  if (moyenne >= 12) return 'Travail satisfaisant. Peut mieux faire avec plus de régularité.';
  if (moyenne >= 10) return 'Résultats acceptables. Des efforts constants sont nécessaires.';
  if (moyenne >= 7)  return 'Résultats insuffisants. Un travail sérieux et régulier est indispensable.';
  return 'Résultats très insuffisants. Une remise en question sérieuse s\'impose.';
}

// ============================================================
// GET /api/bulletins/eleve/:id?trimestre=1&annee_scolaire=2024-2025
// Calculer + retourner le bulletin d'un élève
// ============================================================
bulletinsRoutes.get('/eleve/:id', authMiddleware(), async (c) => {
  try {
    const eleve_id = c.req.param('id');
    const trimestre = parseInt(c.req.query('trimestre') || '1');
    const annee_scolaire = c.req.query('annee_scolaire') || '2024-2025';

    if (![1,2,3].includes(trimestre)) {
      return c.json({ success: false, error: 'Trimestre invalide (1, 2 ou 3).' }, 400);
    }

    const bulletin = await calculerBulletin(c.env.DB, eleve_id, trimestre, annee_scolaire);
    if (!bulletin) return c.json({ success: false, error: 'Élève introuvable.' }, 404);

    return c.json({ success: true, data: bulletin });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ============================================================
// POST /api/bulletins/generer/:eleve_id
// Générer et SAUVEGARDER le bulletin en base
// ============================================================
bulletinsRoutes.post('/generer/:eleve_id', authMiddleware(['admin', 'secretariat', 'professeur']), async (c) => {
  try {
    const eleve_id = c.req.param('eleve_id');
    const { trimestre = 1, annee_scolaire = '2024-2025' } = await c.req.json().catch(() => ({}));

    const bulletin = await calculerBulletin(c.env.DB, eleve_id, trimestre, annee_scolaire);
    if (!bulletin) return c.json({ success: false, error: 'Élève introuvable.' }, 404);

    // Calculer le rang dans la classe (comparaison avec les autres bulletins déjà générés)
    const { results: autresBulletins } = await c.env.DB.prepare(`
      SELECT moyenne_generale FROM bulletins
      WHERE classe_id = (SELECT classe_id FROM eleves WHERE id = ?)
      AND trimestre = ? AND annee_scolaire = ? AND eleve_id != ?
    `).bind(eleve_id, trimestre, annee_scolaire, eleve_id).all<any>();

    const mieuxClasses = autresBulletins.filter((b: any) => b.moyenne_generale > bulletin.moyenne_generale).length;
    const rang = mieuxClasses + 1;

    // Compter total élèves dans la classe
    const classeInfo = await c.env.DB.prepare(
      'SELECT classe_id FROM eleves WHERE id = ?'
    ).bind(eleve_id).first<any>();
    
    let effectif = 1;
    if (classeInfo?.classe_id) {
      const eff = await c.env.DB.prepare(
        'SELECT COUNT(*) as nb FROM eleves WHERE classe_id = ? AND actif = 1'
      ).bind(classeInfo.classe_id).first<any>();
      effectif = eff?.nb || 1;
    }

    // Supprimer ancien bulletin si existant
    await c.env.DB.prepare(
      'DELETE FROM bulletins WHERE eleve_id = ? AND trimestre = ? AND annee_scolaire = ?'
    ).bind(eleve_id, trimestre, annee_scolaire).run();

    // Sauvegarder le bulletin
    const id = generateId();
    await c.env.DB.prepare(`
      INSERT INTO bulletins (id, eleve_id, classe_id, trimestre, annee_scolaire,
                             moyenne_generale, rang, effectif, appreciation, mention)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, eleve_id, classeInfo?.classe_id || null, trimestre, annee_scolaire,
      bulletin.moyenne_generale, rang, effectif, bulletin.appreciation, bulletin.mention).run();

    // Notification à l'élève/parent
    const eleveInfo = await c.env.DB.prepare(`
      SELECT e.prenom, e.nom, p.user_id as parent_user, e.user_id
      FROM eleves e LEFT JOIN parents p ON e.parent_id = p.id WHERE e.id = ?
    `).bind(eleve_id).first<any>();

    if (eleveInfo?.parent_user) {
      await c.env.DB.prepare(
        'INSERT INTO notifications (id, utilisateur_id, message, type) VALUES (?, ?, ?, ?)'
      ).bind(generateId(), eleveInfo.parent_user,
        `Le bulletin T${trimestre} de ${eleveInfo.prenom} ${eleveInfo.nom} est disponible. Moyenne : ${bulletin.moyenne_generale}/20 (Rang ${rang}/${effectif})`,
        'note').run();
    }

    return c.json({
      success: true,
      data: { ...bulletin, id, rang, effectif },
      message: `Bulletin T${trimestre} généré. Moyenne : ${bulletin.moyenne_generale}/20 — Rang ${rang}/${effectif}.`
    }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ============================================================
// POST /api/bulletins/generer-classe/:classe_id
// Générer les bulletins de TOUTE une classe en une fois
// ============================================================
bulletinsRoutes.post('/generer-classe/:classe_id', authMiddleware(['admin', 'secretariat']), async (c) => {
  try {
    const classe_id = c.req.param('classe_id');
    const { trimestre = 1, annee_scolaire = '2024-2025' } = await c.req.json().catch(() => ({}));

    // Récupérer tous les élèves actifs de la classe
    const { results: eleves } = await c.env.DB.prepare(
      'SELECT id, nom, prenom FROM eleves WHERE classe_id = ? AND actif = 1 ORDER BY nom'
    ).bind(classe_id).all<any>();

    if (!eleves.length) return c.json({ success: false, error: 'Aucun élève dans cette classe.' }, 404);

    // Calculer tous les bulletins
    const bulletinsCalc: any[] = [];
    for (const eleve of eleves) {
      const b = await calculerBulletin(c.env.DB, eleve.id, trimestre, annee_scolaire);
      if (b) bulletinsCalc.push({ eleve_id: eleve.id, ...b });
    }

    // Trier par moyenne pour les rangs
    bulletinsCalc.sort((a, b) => b.moyenne_generale - a.moyenne_generale);
    const effectif = bulletinsCalc.length;

    const inseres: any[] = [];
    for (let i = 0; i < bulletinsCalc.length; i++) {
      const b = bulletinsCalc[i];
      const rang = i + 1;

      // Supprimer ancien
      await c.env.DB.prepare(
        'DELETE FROM bulletins WHERE eleve_id = ? AND trimestre = ? AND annee_scolaire = ?'
      ).bind(b.eleve_id, trimestre, annee_scolaire).run();

      const id = generateId();
      await c.env.DB.prepare(`
        INSERT INTO bulletins (id, eleve_id, classe_id, trimestre, annee_scolaire,
                               moyenne_generale, rang, effectif, appreciation, mention)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(id, b.eleve_id, classe_id, trimestre, annee_scolaire,
        b.moyenne_generale, rang, effectif, b.appreciation, b.mention).run();

      // Notif parent
      const eleveInfo = await c.env.DB.prepare(`
        SELECT e.prenom, e.nom, p.user_id as parent_user
        FROM eleves e LEFT JOIN parents p ON e.parent_id = p.id WHERE e.id = ?
      `).bind(b.eleve_id).first<any>();

      if (eleveInfo?.parent_user) {
        await c.env.DB.prepare(
          'INSERT INTO notifications (id, utilisateur_id, message, type) VALUES (?, ?, ?, ?)'
        ).bind(generateId(), eleveInfo.parent_user,
          `Bulletin T${trimestre} disponible — Moyenne : ${b.moyenne_generale}/20 — Rang ${rang}/${effectif}`,
          'note').run();
      }

      inseres.push({ id, eleve: `${b.eleve.prenom} ${b.eleve.nom}`, moyenne: b.moyenne_generale, rang, mention: b.mention });
    }

    return c.json({
      success: true,
      data: { bulletins: inseres, trimestre, annee_scolaire, effectif },
      message: `${inseres.length} bulletin(s) T${trimestre} générés pour la classe.`
    }, 201);
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ============================================================
// GET /api/bulletins/classe/:classe_id?trimestre=1
// Liste des bulletins d'une classe (rangs + moyennes)
// ============================================================
bulletinsRoutes.get('/classe/:classe_id', authMiddleware(), async (c) => {
  try {
    const classe_id = c.req.param('classe_id');
    const trimestre = c.req.query('trimestre') || '1';
    const annee_scolaire = c.req.query('annee_scolaire') || '2024-2025';

    const { results } = await c.env.DB.prepare(`
      SELECT b.*, e.nom, e.prenom, e.matricule, e.sexe
      FROM bulletins b
      JOIN eleves e ON b.eleve_id = e.id
      WHERE b.classe_id = ? AND b.trimestre = ? AND b.annee_scolaire = ?
      ORDER BY b.rang ASC
    `).bind(classe_id, parseInt(trimestre), annee_scolaire).all();

    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ============================================================
// GET /api/bulletins/historique/:eleve_id
// Tous les bulletins sauvegardés d'un élève
// ============================================================
bulletinsRoutes.get('/historique/:eleve_id', authMiddleware(), async (c) => {
  try {
    const eleve_id = c.req.param('eleve_id');
    const { results } = await c.env.DB.prepare(`
      SELECT b.*, c.nom_classe
      FROM bulletins b
      LEFT JOIN classes c ON b.classe_id = c.id
      WHERE b.eleve_id = ?
      ORDER BY b.annee_scolaire DESC, b.trimestre ASC
    `).bind(eleve_id).all();
    return c.json({ success: true, data: results });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ============================================================
// GET /api/bulletins/stats/:classe_id?trimestre=1
// Statistiques classe : min, max, moyenne, répartition mentions
// ============================================================
bulletinsRoutes.get('/stats/:classe_id', authMiddleware(), async (c) => {
  try {
    const classe_id = c.req.param('classe_id');
    const trimestre = c.req.query('trimestre') || '1';
    const annee_scolaire = c.req.query('annee_scolaire') || '2024-2025';

    const { results } = await c.env.DB.prepare(`
      SELECT b.moyenne_generale, b.mention, b.rang, e.sexe
      FROM bulletins b JOIN eleves e ON b.eleve_id = e.id
      WHERE b.classe_id = ? AND b.trimestre = ? AND b.annee_scolaire = ?
    `).bind(classe_id, parseInt(trimestre), annee_scolaire).all<any>();

    if (!results.length) return c.json({ success: true, data: null, message: 'Aucun bulletin généré.' });

    const moyennes = results.map((r: any) => r.moyenne_generale);
    const stats = {
      effectif: results.length,
      moyenne_classe: Math.round(moyennes.reduce((s: number, m: number) => s + m, 0) / moyennes.length * 100) / 100,
      moyenne_max: Math.max(...moyennes),
      moyenne_min: Math.min(...moyennes),
      taux_reussite: Math.round(results.filter((r: any) => r.moyenne_generale >= 10).length / results.length * 100),
      repartition_mentions: {
        'Félicitations': results.filter((r: any) => r.mention === 'Félicitations').length,
        'Compliments':   results.filter((r: any) => r.mention === 'Compliments').length,
        'Encouragements':results.filter((r: any) => r.mention === 'Encouragements').length,
        'Passable':      results.filter((r: any) => r.mention === 'Passable').length,
        'Avertissement': results.filter((r: any) => r.mention === 'Avertissement').length,
      },
      garcons: results.filter((r: any) => r.sexe === 'M').length,
      filles:  results.filter((r: any) => r.sexe === 'F').length,
    };

    return c.json({ success: true, data: stats });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});
