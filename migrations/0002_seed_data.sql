-- ============================================================
-- DONNÉES INITIALES - Seed Data - EduGabon
-- Hash SHA-256 : sha256:b02dedd8a9fb004c33ef8dd158b6349505f68f008e491e78a32d89165b2f98d5
-- Mot de passe universel demo : Admin@123
-- ============================================================

-- Année scolaire active
INSERT OR IGNORE INTO annees_scolaires (id, libelle, date_debut, date_fin, actif) VALUES
('annee-2024-2025', '2024-2025', '2024-09-01', '2025-06-30', 1);

-- ============================================================
-- UTILISATEURS (hash = Admin@123)
-- ============================================================
INSERT OR IGNORE INTO users (id, nom, prenom, email, mot_de_passe_hash, role, telephone, actif) VALUES
('admin-001', 'ADMINISTRATEUR', 'Système', 'admin@lycee-gabon.ga',
 'sha256:b02dedd8a9fb004c33ef8dd158b6349505f68f008e491e78a32d89165b2f98d5', 'admin', '+241 77 00 00 00', 1),
('secr-001', 'NZAMBA', 'Marie-Claire', 'secretariat@lycee-gabon.ga',
 'sha256:b02dedd8a9fb004c33ef8dd158b6349505f68f008e491e78a32d89165b2f98d5', 'secretariat', '+241 77 00 00 01', 1),
('prof-001', 'MBADINGA', 'Jean-Pierre', 'j.mbadinga@lycee-gabon.ga',
 'sha256:b02dedd8a9fb004c33ef8dd158b6349505f68f008e491e78a32d89165b2f98d5', 'professeur', '+241 77 11 22 33', 1),
('prof-002', 'OVONO', 'Sylvie', 's.ovono@lycee-gabon.ga',
 'sha256:b02dedd8a9fb004c33ef8dd158b6349505f68f008e491e78a32d89165b2f98d5', 'professeur', '+241 77 44 55 66', 1),
('prof-003', 'NDONG', 'Paul', 'p.ndong@lycee-gabon.ga',
 'sha256:b02dedd8a9fb004c33ef8dd158b6349505f68f008e491e78a32d89165b2f98d5', 'professeur', '+241 77 77 88 99', 1),
('parent-u001', 'MOUBAMBA', 'François', 'parent@demo.ga',
 'sha256:b02dedd8a9fb004c33ef8dd158b6349505f68f008e491e78a32d89165b2f98d5', 'parent', '+241 60 12 34 56', 1),
('parent-u002', 'EKOMI', 'Cécile', 'c.ekomi@demo.ga',
 'sha256:b02dedd8a9fb004c33ef8dd158b6349505f68f008e491e78a32d89165b2f98d5', 'parent', '+241 60 98 76 54', 1),
('parent-u003', 'NGUEMA', 'Alain', 'a.nguema@demo.ga',
 'sha256:b02dedd8a9fb004c33ef8dd158b6349505f68f008e491e78a32d89165b2f98d5', 'parent', '+241 65 11 22 33', 1);

-- ============================================================
-- PARENTS
-- ============================================================
INSERT OR IGNORE INTO parents (id, user_id, profession, adresse) VALUES
('parent-001', 'parent-u001', 'Ingénieur SEEG', 'Quartier Sotega, Libreville'),
('parent-002', 'parent-u002', 'Infirmière CHU', 'Owendo, Quartier Port'),
('parent-003', 'parent-u003', 'Commerçant', 'Akanda, Résidence Les Pins');

-- ============================================================
-- CLASSES
-- ============================================================
INSERT OR IGNORE INTO classes (id, nom_classe, niveau, filiere, annee_scolaire, professeur_principal_id, capacite) VALUES
('class-6e-A', '6ème A', '6ème', 'Général', '2024-2025', 'prof-001', 35),
('class-5e-A', '5ème A', '5ème', 'Général', '2024-2025', 'prof-002', 35),
('class-4e-A', '4ème A', '4ème', 'Général', '2024-2025', 'prof-003', 35),
('class-3e-A', '3ème A', '3ème', 'Général', '2024-2025', 'prof-001', 32),
('class-2nde-A', '2nde A', '2nde', 'Série A', '2024-2025', 'prof-002', 30),
('class-2nde-C', '2nde C', '2nde', 'Série C', '2024-2025', 'prof-003', 28),
('class-1ere-A', '1ère A', '1ère', 'Série A', '2024-2025', 'prof-001', 28),
('class-1ere-C', '1ère C', '1ère', 'Série C', '2024-2025', 'prof-002', 26),
('class-Tle-A', 'Tle A', 'Terminale', 'Série A', '2024-2025', 'prof-003', 25),
('class-Tle-C', 'Tle C', 'Terminale', 'Série C', '2024-2025', 'prof-001', 24);

-- ============================================================
-- MATIÈRES - 6ème A
-- ============================================================
INSERT OR IGNORE INTO matieres (id, nom_matiere, coefficient, classe_id, professeur_id) VALUES
('mat-001', 'Français', 4, 'class-6e-A', 'prof-002'),
('mat-002', 'Mathématiques', 4, 'class-6e-A', 'prof-001'),
('mat-003', 'Histoire-Géographie', 2, 'class-6e-A', 'prof-003'),
('mat-004', 'Sciences de la Vie et de la Terre', 2, 'class-6e-A', 'prof-002'),
('mat-005', 'Anglais', 3, 'class-6e-A', 'prof-001'),
('mat-006', 'Education Physique', 1, 'class-6e-A', 'prof-003');

-- Matières Terminale C
INSERT OR IGNORE INTO matieres (id, nom_matiere, coefficient, classe_id, professeur_id) VALUES
('mat-101', 'Mathématiques', 7, 'class-Tle-C', 'prof-001'),
('mat-102', 'Physique-Chimie', 6, 'class-Tle-C', 'prof-003'),
('mat-103', 'Sciences de la Vie et de la Terre', 5, 'class-Tle-C', 'prof-002'),
('mat-104', 'Français', 3, 'class-Tle-C', 'prof-002'),
('mat-105', 'Philosophie', 3, 'class-Tle-C', 'prof-003'),
('mat-106', 'Anglais', 3, 'class-Tle-C', 'prof-001'),
('mat-107', 'Histoire-Géographie', 2, 'class-Tle-C', 'prof-003');

-- Matières 3ème A
INSERT OR IGNORE INTO matieres (id, nom_matiere, coefficient, classe_id, professeur_id) VALUES
('mat-201', 'Mathématiques', 4, 'class-3e-A', 'prof-001'),
('mat-202', 'Français', 4, 'class-3e-A', 'prof-002'),
('mat-203', 'Physique-Chimie', 3, 'class-3e-A', 'prof-003'),
('mat-204', 'Histoire-Géographie', 2, 'class-3e-A', 'prof-003'),
('mat-205', 'Anglais', 2, 'class-3e-A', 'prof-001'),
('mat-206', 'SVT', 2, 'class-3e-A', 'prof-002');

-- ============================================================
-- ÉLÈVES
-- ============================================================
INSERT OR IGNORE INTO eleves (id, matricule, nom, prenom, date_naissance, classe_id, parent_id, adresse, sexe, nationalite, lieu_naissance, annee_inscription, actif) VALUES
('eleve-001', 'LYC240001', 'MOUBAMBA', 'Kevin', '2012-03-15', 'class-6e-A', 'parent-001', 'Sotega, Libreville', 'M', 'Gabonaise', 'Libreville', '2024-2025', 1),
('eleve-002', 'LYC240002', 'EKOMI', 'Laetitia', '2011-07-22', 'class-6e-A', 'parent-002', 'Owendo', 'F', 'Gabonaise', 'Libreville', '2024-2025', 1),
('eleve-003', 'LYC240003', 'NGUEMA', 'Patrick', '2011-11-05', 'class-6e-A', 'parent-003', 'Akanda', 'M', 'Gabonaise', 'Port-Gentil', '2024-2025', 1),
('eleve-004', 'LYC240004', 'MAKANGA', 'Sandrine', '2010-04-18', 'class-5e-A', 'parent-001', 'Glass, Libreville', 'F', 'Gabonaise', 'Libreville', '2024-2025', 1),
('eleve-005', 'LYC240005', 'BIYOGHE', 'Christian', '2010-09-30', 'class-5e-A', 'parent-002', 'Lalala, Libreville', 'M', 'Gabonaise', 'Franceville', '2024-2025', 1),
('eleve-006', 'LYC240006', 'NGOUA', 'Estelle', '2009-12-01', 'class-4e-A', 'parent-003', 'Montagne Sainte', 'F', 'Gabonaise', 'Libreville', '2024-2025', 1),
('eleve-007', 'LYC240007', 'OBIANG', 'Michel', '2009-02-14', 'class-4e-A', 'parent-001', 'Nzeng Ayong', 'M', 'Gabonaise', 'Libreville', '2024-2025', 1),
('eleve-008', 'LYC240008', 'MBOULA', 'Chantal', '2008-06-25', 'class-3e-A', 'parent-002', 'Libreville Centre', 'F', 'Gabonaise', 'Oyem', '2024-2025', 1),
('eleve-009', 'LYC240009', 'TSIMI', 'Rodrigue', '2008-08-10', 'class-3e-A', 'parent-003', 'PK12, Libreville', 'M', 'Gabonaise', 'Libreville', '2024-2025', 1),
('eleve-010', 'LYC240010', 'OBAME', 'Aurore', '2007-01-19', 'class-2nde-A', 'parent-001', 'Angondjé', 'F', 'Gabonaise', 'Libreville', '2024-2025', 1),
('eleve-011', 'LYC240011', 'MEZUI', 'Bruno', '2007-05-27', 'class-2nde-C', 'parent-002', 'Batterie IV', 'M', 'Gabonaise', 'Lambaréné', '2024-2025', 1),
('eleve-012', 'LYC240012', 'NKOGHE', 'Prisca', '2006-03-08', 'class-1ere-A', 'parent-003', 'Libreville Sud', 'F', 'Gabonaise', 'Libreville', '2024-2025', 1),
('eleve-013', 'LYC240013', 'MEYE', 'Arnaud', '2006-11-12', 'class-1ere-C', 'parent-001', 'Plein Ciel', 'M', 'Gabonaise', 'Libreville', '2024-2025', 1),
('eleve-014', 'LYC240014', 'KOUMBA', 'Vanessa', '2005-04-03', 'class-Tle-A', 'parent-002', 'Avorbam', 'F', 'Gabonaise', 'Port-Gentil', '2024-2025', 1),
('eleve-015', 'LYC240015', 'MINTSA', 'Joël', '2005-09-17', 'class-Tle-C', 'parent-003', 'Centre Ville', 'M', 'Gabonaise', 'Libreville', '2024-2025', 1);

-- ============================================================
-- NOTES
-- ============================================================
INSERT OR IGNORE INTO notes (id, eleve_id, matiere_id, type_evaluation, note, coefficient, libelle, date, trimestre, annee_scolaire, saisie_par) VALUES
('note-001', 'eleve-001', 'mat-001', 'devoir', 14.5, 1, 'Devoir 1 - Rédaction', '2024-10-15', 1, '2024-2025', 'prof-002'),
('note-002', 'eleve-001', 'mat-001', 'examen', 13.0, 2, 'Examen Trimestre 1', '2024-11-20', 1, '2024-2025', 'prof-002'),
('note-003', 'eleve-001', 'mat-002', 'devoir', 16.0, 1, 'Devoir 1 - Géométrie', '2024-10-10', 1, '2024-2025', 'prof-001'),
('note-004', 'eleve-001', 'mat-002', 'examen', 15.5, 2, 'Examen Trimestre 1', '2024-11-22', 1, '2024-2025', 'prof-001'),
('note-005', 'eleve-001', 'mat-005', 'interrogation', 12.0, 1, 'Contrôle vocabulaire', '2024-10-18', 1, '2024-2025', 'prof-001'),
('note-006', 'eleve-002', 'mat-001', 'devoir', 17.0, 1, 'Devoir 1 - Rédaction', '2024-10-15', 1, '2024-2025', 'prof-002'),
('note-007', 'eleve-002', 'mat-002', 'devoir', 11.5, 1, 'Devoir 1 - Géométrie', '2024-10-10', 1, '2024-2025', 'prof-001'),
('note-008', 'eleve-002', 'mat-002', 'examen', 10.0, 2, 'Examen Trimestre 1', '2024-11-22', 1, '2024-2025', 'prof-001'),
('note-009', 'eleve-003', 'mat-001', 'devoir', 9.5, 1, 'Devoir 1 - Rédaction', '2024-10-15', 1, '2024-2025', 'prof-002'),
('note-010', 'eleve-003', 'mat-002', 'devoir', 18.0, 1, 'Devoir 1 - Géométrie', '2024-10-10', 1, '2024-2025', 'prof-001'),
('note-011', 'eleve-008', 'mat-201', 'devoir', 14.0, 1, 'Devoir - Algèbre', '2024-10-12', 1, '2024-2025', 'prof-001'),
('note-012', 'eleve-008', 'mat-202', 'devoir', 15.5, 1, 'Devoir - Commentaire', '2024-10-14', 1, '2024-2025', 'prof-002'),
('note-013', 'eleve-009', 'mat-201', 'devoir', 12.5, 1, 'Devoir - Algèbre', '2024-10-12', 1, '2024-2025', 'prof-001'),
('note-014', 'eleve-015', 'mat-101', 'devoir', 16.5, 1, 'Devoir - Analyse', '2024-10-11', 1, '2024-2025', 'prof-001'),
('note-015', 'eleve-015', 'mat-102', 'devoir', 15.0, 1, 'Devoir - Mécanique', '2024-10-13', 1, '2024-2025', 'prof-003'),
('note-016', 'eleve-015', 'mat-101', 'examen', 17.0, 2, 'Examen Trimestre 1', '2024-11-25', 1, '2024-2025', 'prof-001'),
('note-017', 'eleve-015', 'mat-103', 'devoir', 14.5, 1, 'Devoir - Génétique', '2024-10-17', 1, '2024-2025', 'prof-002');

-- ============================================================
-- ABSENCES
-- ============================================================
INSERT OR IGNORE INTO absences (id, eleve_id, matiere_id, date, statut, motif, enregistre_par) VALUES
('abs-001', 'eleve-002', 'mat-001', '2024-10-22', 'absent', 'Maladie (certificat médical)', 'prof-002'),
('abs-002', 'eleve-003', 'mat-002', '2024-10-25', 'retard', 'Problème de transport', 'prof-001'),
('abs-003', 'eleve-003', 'mat-001', '2024-11-05', 'absent', NULL, 'prof-002'),
('abs-004', 'eleve-007', 'mat-001', '2024-11-08', 'justifie', 'Cérémonie familiale', 'prof-002'),
('abs-005', 'eleve-001', 'mat-003', '2024-11-12', 'retard', 'Embouteillage', 'prof-003'),
('abs-006', 'eleve-005', 'mat-001', '2024-11-15', 'absent', NULL, 'prof-002'),
('abs-007', 'eleve-009', 'mat-201', '2024-11-18', 'absent', 'Convocation médicale', 'prof-001'),
('abs-008', 'eleve-004', 'mat-001', '2024-12-02', 'retard', NULL, 'prof-002');

-- ============================================================
-- FACTURES
-- ============================================================
INSERT OR IGNORE INTO factures (id, eleve_id, libelle, montant, montant_paye, date_emission, date_limite, statut, type_frais, annee_scolaire) VALUES
('fact-001', 'eleve-001', 'Frais de scolarité T1 2024-2025', 150000, 150000, '2024-09-01', '2024-10-01', 'paye', 'scolarite', '2024-2025'),
('fact-002', 'eleve-001', 'Frais de scolarité T2 2024-2025', 150000, 75000, '2024-12-01', '2025-01-15', 'partiel', 'scolarite', '2024-2025'),
('fact-003', 'eleve-002', 'Frais de scolarité T1 2024-2025', 150000, 150000, '2024-09-01', '2024-10-01', 'paye', 'scolarite', '2024-2025'),
('fact-004', 'eleve-002', 'Frais de scolarité T2 2024-2025', 150000, 0, '2024-12-01', '2025-01-15', 'impaye', 'scolarite', '2024-2025'),
('fact-005', 'eleve-003', 'Frais de scolarité T1 2024-2025', 150000, 150000, '2024-09-01', '2024-10-01', 'paye', 'scolarite', '2024-2025'),
('fact-006', 'eleve-003', 'Frais d inscription 2024-2025', 50000, 50000, '2024-09-01', '2024-09-30', 'paye', 'inscription', '2024-2025'),
('fact-007', 'eleve-004', 'Frais de scolarité T1 2024-2025', 150000, 150000, '2024-09-01', '2024-10-01', 'paye', 'scolarite', '2024-2025'),
('fact-008', 'eleve-005', 'Frais de scolarité T1 2024-2025', 150000, 0, '2024-09-01', '2024-10-01', 'impaye', 'scolarite', '2024-2025'),
('fact-009', 'eleve-008', 'Frais de scolarité T1 2024-2025', 175000, 175000, '2024-09-01', '2024-10-01', 'paye', 'scolarite', '2024-2025'),
('fact-010', 'eleve-015', 'Frais de scolarité T1 2024-2025', 200000, 200000, '2024-09-01', '2024-10-01', 'paye', 'scolarite', '2024-2025'),
('fact-011', 'eleve-015', 'Frais de scolarité T2 2024-2025', 200000, 100000, '2024-12-01', '2025-01-15', 'partiel', 'scolarite', '2024-2025'),
('fact-012', 'eleve-001', 'Frais de cantine - T1', 45000, 45000, '2024-09-01', '2024-10-01', 'paye', 'cantine', '2024-2025'),
('fact-013', 'eleve-002', 'Frais de transport - T1', 60000, 60000, '2024-09-01', '2024-10-01', 'paye', 'transport', '2024-2025');

-- ============================================================
-- PAIEMENTS
-- ============================================================
INSERT OR IGNORE INTO paiements (id, facture_id, montant, date_paiement, mode_paiement, reference, recu_par) VALUES
('pay-001', 'fact-001', 150000, '2024-09-05', 'mobile_money', 'MM-2024-001', 'secr-001'),
('pay-002', 'fact-002', 75000, '2024-12-10', 'especes', 'ESP-2024-002', 'secr-001'),
('pay-003', 'fact-003', 150000, '2024-09-03', 'virement', 'VIR-2024-003', 'secr-001'),
('pay-004', 'fact-005', 150000, '2024-09-04', 'mobile_money', 'MM-2024-004', 'secr-001'),
('pay-005', 'fact-006', 50000, '2024-09-02', 'especes', 'ESP-2024-005', 'secr-001'),
('pay-006', 'fact-007', 150000, '2024-09-06', 'cheque', 'CHQ-2024-006', 'secr-001'),
('pay-007', 'fact-009', 175000, '2024-09-04', 'mobile_money', 'MM-2024-007', 'secr-001'),
('pay-008', 'fact-010', 200000, '2024-09-02', 'virement', 'VIR-2024-008', 'secr-001'),
('pay-009', 'fact-011', 100000, '2024-12-08', 'especes', 'ESP-2024-009', 'secr-001'),
('pay-010', 'fact-012', 45000, '2024-09-05', 'especes', 'ESP-2024-010', 'secr-001'),
('pay-011', 'fact-013', 60000, '2024-09-03', 'mobile_money', 'MM-2024-011', 'secr-001');

-- ============================================================
-- TRANSPORT
-- ============================================================
INSERT OR IGNORE INTO transport (id, nom_ligne, chauffeur, vehicule, capacite, itineraire) VALUES
('trans-001', 'Ligne 1 - Centre Ville', 'MABIKA Thomas', 'Minibus Toyota HiAce AB-0001-LBV', 20, 'Lycée → Carrefour Akanda → Centre Ville → Montagne Sainte'),
('trans-002', 'Ligne 2 - Owendo', 'NTOUTOUME Jules', 'Minibus Toyota HiAce AB-0002-LBV', 20, 'Lycée → Owendo Port → Cité Lastoursville → PK8');

INSERT OR IGNORE INTO transport_eleves (id, eleve_id, transport_id, point_arret, sens, actif) VALUES
('te-001', 'eleve-002', 'trans-002', 'Owendo Port', 'aller_retour', 1),
('te-002', 'eleve-003', 'trans-001', 'Centre Ville', 'aller_retour', 1),
('te-003', 'eleve-001', 'trans-001', 'Carrefour Akanda', 'aller_retour', 1);

-- ============================================================
-- BADGES
-- ============================================================
INSERT OR IGNORE INTO badges (id, nom, description, icone, couleur, critere) VALUES
('badge-001', 'Excellence', 'Moyenne générale >= 16/20', '🏆', '#FFD700', 'moyenne >= 16'),
('badge-002', 'Assiduité', 'Zéro absence injustifiée', '✅', '#00AA00', 'absences = 0'),
('badge-003', 'Progrès', 'Amélioration de +3 points', '📈', '#0066FF', 'progression >= 3'),
('badge-004', 'Comportement', 'Exemplaire toute l annee', '⭐', '#FF6600', 'comportement = excellent'),
('badge-005', 'Sport', 'Excellence en EPS >= 16', '🏅', '#CC0000', 'note_eps >= 16');

INSERT OR IGNORE INTO badges_eleves (id, eleve_id, badge_id, attribue_par) VALUES
('be-001', 'eleve-015', 'badge-001', 'prof-001'),
('be-002', 'eleve-001', 'badge-002', 'admin-001'),
('be-003', 'eleve-003', 'badge-003', 'prof-001');

-- ============================================================
-- DEVOIRS
-- ============================================================
INSERT OR IGNORE INTO devoirs (id, matiere_id, professeur_id, titre, description, date_donnee, date_remise) VALUES
('dev-001', 'mat-001', 'prof-002', 'Rédaction : Ma ville', 'Rédiger un texte de 300 mots sur Libreville', '2024-11-20', '2024-11-27'),
('dev-002', 'mat-002', 'prof-001', 'Exercices Algèbre p.45', 'Exercices 1 à 8 pages 45-46 du manuel', '2024-11-21', '2024-11-25'),
('dev-003', 'mat-101', 'prof-001', 'DM Analyse - Limites et continuité', 'Résoudre les 5 exercices du polycopié distribué en cours', '2024-11-22', '2024-11-29'),
('dev-004', 'mat-201', 'prof-001', 'Révisions Théorème de Pythagore', 'Revoir le cours et faire les exercices corrigés', '2024-11-15', '2024-11-22');

-- ============================================================
-- CAHIER DE TEXTE
-- ============================================================
INSERT OR IGNORE INTO cahier_texte (id, matiere_id, professeur_id, date_cours, contenu, objectifs) VALUES
('ct-001', 'mat-001', 'prof-002', '2024-11-18', 'Correction de la rédaction du devoir 1. Analyse des erreurs fréquentes. Leçon : La narration et le point de vue.', 'Améliorer la technique narrative'),
('ct-002', 'mat-002', 'prof-001', '2024-11-19', 'Introduction aux équations du second degré. Formule discriminant.', 'Maîtriser la résolution par discriminant'),
('ct-003', 'mat-101', 'prof-001', '2024-11-20', 'Limites de fonctions - Théorèmes fondamentaux. Exercices d application.', 'Calculer des limites en +/- infini et en un point');

-- ============================================================
-- MESSAGES
-- ============================================================
INSERT OR IGNORE INTO messages (id, expediteur_id, destinataire_id, sujet, contenu, lu) VALUES
('msg-001', 'parent-u001', 'admin-001', 'Question sur les frais de scolarité', 'Bonjour, je souhaite obtenir un échéancier pour le paiement du T2. Cordialement, M. MOUBAMBA', 1),
('msg-002', 'admin-001', 'parent-u001', 'RE: Question sur les frais de scolarité', 'Bonjour M. MOUBAMBA, nous pouvons vous accorder un délai jusqu au 31 janvier. Veuillez passer à la secrétariat. Cordialement.', 0),
('msg-003', 'prof-001', 'parent-u001', 'Résultats de Kevin en Mathématiques', 'Bonjour, je vous contacte concernant les bons résultats de Kevin. Il est en progression constante. Continuez à l encourager ! Prof. MBADINGA', 0),
('msg-004', 'parent-u002', 'prof-002', 'Absence de Laetitia', 'Bonjour Mme OVONO, Laetitia était malade la semaine dernière. Je vous joins le certificat médical. Mme EKOMI', 1),
('msg-005', 'secr-001', 'parent-u003', 'Rappel paiement en attente', 'Bonjour, nous vous rappelons que la facture fact-008 est en attente de règlement. Merci de régulariser rapidement.', 0);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
INSERT OR IGNORE INTO notifications (id, utilisateur_id, message, type, statut, lien) VALUES
('notif-001', 'parent-u001', 'Nouvelle note de Kevin en Mathématiques : 16/20', 'note', 'non_lu', '/notes'),
('notif-002', 'parent-u001', 'Paiement reçu : 150 000 FCFA pour frais T1', 'paiement', 'lu', '/factures'),
('notif-003', 'parent-u002', 'Absence signalée pour Laetitia le 22/10/2024', 'absence', 'non_lu', '/absences'),
('notif-004', 'admin-001', 'Nouveau message de M. MOUBAMBA', 'message', 'lu', '/messages'),
('notif-005', 'parent-u003', 'Rappel : Facture impayée - Frais T1', 'paiement', 'non_lu', '/factures'),
('notif-006', 'prof-001', 'Votre cours du 19/11 a été enregistré dans le cahier de texte', 'info', 'lu', '/cahier-texte'),
('notif-007', 'parent-u001', 'Badge "Assiduité" attribué à Kevin !', 'info', 'non_lu', '/badges');

-- ============================================================
-- EMPLOI DU TEMPS - 6ème A
-- ============================================================
INSERT OR IGNORE INTO emplois_du_temps (id, classe_id, matiere_id, professeur_id, jour, heure_debut, heure_fin, salle) VALUES
('edt-001', 'class-6e-A', 'mat-001', 'prof-002', 'Lundi', '08:00', '10:00', 'Salle 101'),
('edt-002', 'class-6e-A', 'mat-002', 'prof-001', 'Lundi', '10:00', '12:00', 'Salle 101'),
('edt-003', 'class-6e-A', 'mat-003', 'prof-003', 'Mardi', '08:00', '10:00', 'Salle 101'),
('edt-004', 'class-6e-A', 'mat-005', 'prof-001', 'Mardi', '10:00', '12:00', 'Salle 101'),
('edt-005', 'class-6e-A', 'mat-004', 'prof-002', 'Mercredi', '08:00', '10:00', 'Labo SVT'),
('edt-006', 'class-6e-A', 'mat-002', 'prof-001', 'Jeudi', '08:00', '10:00', 'Salle 101'),
('edt-007', 'class-6e-A', 'mat-001', 'prof-002', 'Jeudi', '10:00', '12:00', 'Salle 101'),
('edt-008', 'class-6e-A', 'mat-006', 'prof-003', 'Vendredi', '08:00', '10:00', 'Gymnase'),
('edt-009', 'class-6e-A', 'mat-003', 'prof-003', 'Vendredi', '10:00', '12:00', 'Salle 101');

-- ============================================================
-- BIBLIOTHÈQUE NUMÉRIQUE
-- ============================================================
INSERT OR IGNORE INTO bibliotheque (id, titre, auteur, categorie, description, disponible, ajoute_par) VALUES
('bib-001', 'Mathématiques Terminale C - Exercices Corrigés', 'Prof. MBADINGA', 'Mathématiques', 'Recueil d exercices et corrigés pour la Terminale C, couvrant analyse, algèbre et statistiques.', 1, 'prof-001'),
('bib-002', 'Grammaire Française - Règles Essentielles', 'NZAMBA Marie-Claire', 'Français', 'Guide de grammaire française avec exercices pratiques pour les classes du collège.', 1, 'prof-002'),
('bib-003', 'Histoire du Gabon - Manuel Scolaire', 'Collection Éducation Gabon', 'Histoire', 'Manuel d histoire nationale couvrant la période précoloniale jusqu à nos jours.', 1, 'admin-001'),
('bib-004', 'Physique-Chimie 1ère C - Cours Complet', 'Prof. NDONG', 'Sciences', 'Cours complet de physique-chimie pour la classe de Première Série C.', 1, 'prof-003'),
('bib-005', 'Dictionnaire Français-Anglais Junior', 'Oxford Junior', 'Langues', 'Dictionnaire bilingue adapté aux élèves du collège et lycée.', 1, 'admin-001');

-- ============================================================
-- RENDEZ-VOUS
-- ============================================================
INSERT OR IGNORE INTO rendez_vous (id, parent_id, professeur_id, date_rdv, motif, statut, notes) VALUES
('rdv-001', 'parent-001', 'prof-001', '2024-11-25 14:00:00', 'Suivi scolaire de Kevin en Mathématiques', 'confirme', 'Rendez-vous confirmé par email'),
('rdv-002', 'parent-002', 'prof-002', '2024-11-28 15:30:00', 'Discussion sur les absences de Laetitia', 'en_attente', NULL),
('rdv-003', 'parent-003', 'prof-001', '2024-12-02 10:00:00', 'Résultats du 1er trimestre de Patrick', 'en_attente', NULL);
