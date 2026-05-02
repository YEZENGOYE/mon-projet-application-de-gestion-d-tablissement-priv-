-- ============================================================
-- DONNÉES INITIALES - Seed Data (hash SHA-256 natif Workers)
-- Mot de passe universel démo : Admin@123
-- ============================================================

-- Année scolaire active
INSERT OR IGNORE INTO annees_scolaires (id, libelle, date_debut, date_fin, actif) VALUES
('annee-2024-2025', '2024-2025', '2024-09-01', '2025-06-30', 1);

-- ============================================================
-- UTILISATEURS (hash sha256 : Admin@123)
-- ============================================================
INSERT OR IGNORE INTO users (id, nom, prenom, email, mot_de_passe_hash, role, telephone) VALUES
('admin-001', 'ADMINISTRATEUR', 'Système',     'admin@lycee-gabon.ga',        'sha256:b02dedd8a9fb004c33ef8dd158b6349505f68f008e491e78a32d89165b2f98d5', 'admin',       '+241 77 00 00 00'),
('secr-001',  'NZAMBA',         'Marie-Claire','secretariat@lycee-gabon.ga',  'sha256:b02dedd8a9fb004c33ef8dd158b6349505f68f008e491e78a32d89165b2f98d5', 'secretariat', '+241 77 00 00 01'),
('prof-001',  'MBADINGA',       'Jean-Pierre', 'j.mbadinga@lycee-gabon.ga',   'sha256:b02dedd8a9fb004c33ef8dd158b6349505f68f008e491e78a32d89165b2f98d5', 'professeur',  '+241 77 11 22 33'),
('prof-002',  'OVONO',          'Sylvie',      's.ovono@lycee-gabon.ga',      'sha256:b02dedd8a9fb004c33ef8dd158b6349505f68f008e491e78a32d89165b2f98d5', 'professeur',  '+241 77 44 55 66'),
('prof-003',  'NDONG',          'Paul',        'p.ndong@lycee-gabon.ga',      'sha256:b02dedd8a9fb004c33ef8dd158b6349505f68f008e491e78a32d89165b2f98d5', 'professeur',  '+241 77 77 88 99'),
('parent-u01','MBOUMBA',        'Alain',       'parent@demo.ga',              'sha256:b02dedd8a9fb004c33ef8dd158b6349505f68f008e491e78a32d89165b2f98d5', 'parent',      '+241 66 11 22 33'),
('parent-u02','ONDO',           'Cécile',      'ondo.cecile@demo.ga',         'sha256:b02dedd8a9fb004c33ef8dd158b6349505f68f008e491e78a32d89165b2f98d5', 'parent',      '+241 66 44 55 66');

-- ============================================================
-- PARENTS
-- ============================================================
INSERT OR IGNORE INTO parents (id, user_id, profession, adresse) VALUES
('par-001', 'parent-u01', 'Ingénieur', 'Quartier Montagne Sainte, Libreville'),
('par-002', 'parent-u02', 'Infirmière', 'Owendo, Libreville');

-- ============================================================
-- BADGES DE MÉRITE
-- ============================================================
INSERT OR IGNORE INTO badges (id, nom, description, icone, couleur, critere) VALUES
('badge-001', 'Excellence',    'Moyenne générale ≥ 16/20',      '🏆', '#FFD700', 'moyenne >= 16'),
('badge-002', 'Assiduité',     'Zéro absence injustifiée',       '✅', '#00AA00', 'absences = 0'),
('badge-003', 'Progrès',       'Amélioration de +3 points',      '📈', '#0066FF', 'progression >= 3'),
('badge-004', 'Comportement',  'Exemplaire toute l année',       '⭐', '#FF6600', 'comportement = excellent'),
('badge-005', 'Sport',         'Excellence en EPS',              '🏅', '#CC0000', 'note_eps >= 16');

-- ============================================================
-- CLASSES
-- ============================================================
INSERT OR IGNORE INTO classes (id, nom_classe, niveau, filiere, annee_scolaire, professeur_principal_id, capacite) VALUES
('class-6e-A',   '6ème A',   '6ème',      'Général',  '2024-2025', 'prof-001', 35),
('class-5e-A',   '5ème A',   '5ème',      'Général',  '2024-2025', 'prof-002', 35),
('class-4e-A',   '4ème A',   '4ème',      'Général',  '2024-2025', 'prof-003', 35),
('class-3e-A',   '3ème A',   '3ème',      'Général',  '2024-2025', 'prof-001', 32),
('class-2nde-A', '2nde A',   '2nde',      'Série A',  '2024-2025', 'prof-002', 30),
('class-2nde-C', '2nde C',   '2nde',      'Série C',  '2024-2025', 'prof-003', 28),
('class-1ere-A', '1ère A',   '1ère',      'Série A',  '2024-2025', 'prof-001', 28),
('class-1ere-C', '1ère C',   '1ère',      'Série C',  '2024-2025', 'prof-002', 26),
('class-Tle-A',  'Tle A',    'Terminale', 'Série A',  '2024-2025', 'prof-003', 25),
('class-Tle-C',  'Tle C',    'Terminale', 'Série C',  '2024-2025', 'prof-001', 24);

-- ============================================================
-- MATIÈRES — 6ème A
-- ============================================================
INSERT OR IGNORE INTO matieres (id, nom_matiere, coefficient, classe_id, professeur_id) VALUES
('mat-001', 'Français',           4, 'class-6e-A', 'prof-002'),
('mat-002', 'Mathématiques',      4, 'class-6e-A', 'prof-001'),
('mat-003', 'Histoire-Géographie',2, 'class-6e-A', 'prof-003'),
('mat-004', 'Sciences de la Vie', 2, 'class-6e-A', 'prof-002'),
('mat-005', 'Anglais',            3, 'class-6e-A', 'prof-001'),
('mat-006', 'Education Physique', 1, 'class-6e-A', 'prof-003');

-- MATIÈRES — Terminale C
INSERT OR IGNORE INTO matieres (id, nom_matiere, coefficient, classe_id, professeur_id) VALUES
('mat-101', 'Mathématiques',                    7, 'class-Tle-C', 'prof-001'),
('mat-102', 'Physique-Chimie',                  6, 'class-Tle-C', 'prof-003'),
('mat-103', 'Sciences de la Vie et de la Terre',5, 'class-Tle-C', 'prof-002'),
('mat-104', 'Français',                         3, 'class-Tle-C', 'prof-002'),
('mat-105', 'Philosophie',                      3, 'class-Tle-C', 'prof-003'),
('mat-106', 'Anglais',                          3, 'class-Tle-C', 'prof-001'),
('mat-107', 'Histoire-Géographie',              2, 'class-Tle-C', 'prof-003');

-- MATIÈRES — 3ème A
INSERT OR IGNORE INTO matieres (id, nom_matiere, coefficient, classe_id, professeur_id) VALUES
('mat-201', 'Français',           4, 'class-3e-A', 'prof-002'),
('mat-202', 'Mathématiques',      4, 'class-3e-A', 'prof-001'),
('mat-203', 'Histoire-Géographie',3, 'class-3e-A', 'prof-003'),
('mat-204', 'Sciences Physiques', 3, 'class-3e-A', 'prof-001'),
('mat-205', 'Anglais',            3, 'class-3e-A', 'prof-002'),
('mat-206', 'Education Physique', 1, 'class-3e-A', 'prof-003');

-- ============================================================
-- ÉLÈVES
-- ============================================================
INSERT OR IGNORE INTO eleves (id, matricule, nom, prenom, date_naissance, classe_id, parent_id, adresse, sexe, nationalite, lieu_naissance, annee_inscription, actif) VALUES
('eleve-001','LYC250001','MBOUMBA','Christelle','2011-03-15','class-6e-A','par-001','Montagne Sainte, Libreville','F','Gabonaise','Libreville','2024-2025',1),
('eleve-002','LYC250002','ONDO','Kevin','2010-07-22','class-6e-A','par-002','Owendo, Libreville','M','Gabonaise','Owendo','2024-2025',1),
('eleve-003','LYC250003','NTOUTOUME','Laure','2010-11-08','class-6e-A','par-001','Akanda, Libreville','F','Gabonaise','Libreville','2024-2025',1),
('eleve-004','LYC250004','MENGUE','Fernand','2011-01-30','class-6e-A','par-002','PK8, Libreville','M','Gabonaise','Oyem','2024-2025',1),
('eleve-005','LYC250005','OBIANG','Sandrine','2011-05-14','class-6e-A','par-001','Centre Ville, Libreville','F','Gabonaise','Libreville','2024-2025',1),
('eleve-006','LYC250006','BONGO','Pierre','2007-09-03','class-Tle-C','par-002','Libreville','M','Gabonaise','Libreville','2021-2022',1),
('eleve-007','LYC250007','MOUSSAVOU','Grace','2007-12-19','class-Tle-C','par-001','Libreville','F','Gabonaise','Port-Gentil','2021-2022',1),
('eleve-008','LYC250008','NKOGHE','Junior','2008-04-25','class-Tle-C','par-002','Libreville','M','Gabonaise','Libreville','2021-2022',1),
('eleve-009','LYC250009','BIBANG','Nadine','2009-06-11','class-3e-A','par-001','Libreville','F','Gabonaise','Franceville','2022-2023',1),
('eleve-010','LYC250010','IKAPI','Rostand','2009-02-28','class-3e-A','par-002','Libreville','M','Gabonaise','Libreville','2022-2023',1);

-- ============================================================
-- NOTES — Élèves 6ème A (T1 2024-2025)
-- ============================================================
INSERT OR IGNORE INTO notes (id, eleve_id, matiere_id, type_evaluation, note, coefficient, libelle, date, trimestre, annee_scolaire, saisie_par) VALUES
('note-001','eleve-001','mat-001','devoir',       14.5, 1, 'Devoir 1',         '2024-10-05', 1, '2024-2025', 'prof-002'),
('note-002','eleve-001','mat-001','interrogation', 16,  1, 'Interrogation 1',  '2024-10-20', 1, '2024-2025', 'prof-002'),
('note-003','eleve-001','mat-002','devoir',        12,  1, 'Devoir 1',         '2024-10-08', 1, '2024-2025', 'prof-001'),
('note-004','eleve-001','mat-002','examen',        13.5,1, 'Examen T1',        '2024-11-25', 1, '2024-2025', 'prof-001'),
('note-005','eleve-001','mat-003','devoir',        15,  1, 'Devoir 1',         '2024-10-12', 1, '2024-2025', 'prof-003'),
('note-006','eleve-001','mat-005','devoir',        17,  1, 'Devoir 1',         '2024-10-15', 1, '2024-2025', 'prof-001'),
('note-007','eleve-002','mat-001','devoir',         9,  1, 'Devoir 1',         '2024-10-05', 1, '2024-2025', 'prof-002'),
('note-008','eleve-002','mat-001','interrogation', 11,  1, 'Interrogation 1',  '2024-10-20', 1, '2024-2025', 'prof-002'),
('note-009','eleve-002','mat-002','devoir',        18,  1, 'Devoir 1',         '2024-10-08', 1, '2024-2025', 'prof-001'),
('note-010','eleve-002','mat-002','examen',        17,  1, 'Examen T1',        '2024-11-25', 1, '2024-2025', 'prof-001'),
('note-011','eleve-003','mat-001','devoir',        13,  1, 'Devoir 1',         '2024-10-05', 1, '2024-2025', 'prof-002'),
('note-012','eleve-003','mat-002','devoir',        15.5,1, 'Devoir 1',         '2024-10-08', 1, '2024-2025', 'prof-001'),
('note-013','eleve-003','mat-003','devoir',        14,  1, 'Devoir 1',         '2024-10-12', 1, '2024-2025', 'prof-003'),
('note-014','eleve-004','mat-001','devoir',         8,  1, 'Devoir 1',         '2024-10-05', 1, '2024-2025', 'prof-002'),
('note-015','eleve-004','mat-002','devoir',         7.5,1, 'Devoir 1',         '2024-10-08', 1, '2024-2025', 'prof-001'),
('note-016','eleve-005','mat-001','devoir',        16,  1, 'Devoir 1',         '2024-10-05', 1, '2024-2025', 'prof-002'),
('note-017','eleve-005','mat-002','devoir',        14,  1, 'Devoir 1',         '2024-10-08', 1, '2024-2025', 'prof-001'),
-- Notes Tle C
('note-101','eleve-006','mat-101','devoir',        15,  1, 'Devoir 1 Maths',   '2024-10-05', 1, '2024-2025', 'prof-001'),
('note-102','eleve-006','mat-101','examen',        16.5,1, 'Examen T1',        '2024-11-25', 1, '2024-2025', 'prof-001'),
('note-103','eleve-006','mat-102','devoir',        13,  1, 'Devoir 1 PC',      '2024-10-10', 1, '2024-2025', 'prof-003'),
('note-104','eleve-006','mat-103','devoir',        14.5,1, 'Devoir 1 SVT',     '2024-10-15', 1, '2024-2025', 'prof-002'),
('note-105','eleve-007','mat-101','devoir',        18,  1, 'Devoir 1 Maths',   '2024-10-05', 1, '2024-2025', 'prof-001'),
('note-106','eleve-007','mat-101','examen',        19,  1, 'Examen T1',        '2024-11-25', 1, '2024-2025', 'prof-001'),
('note-107','eleve-007','mat-102','devoir',        17,  1, 'Devoir 1 PC',      '2024-10-10', 1, '2024-2025', 'prof-003'),
('note-108','eleve-008','mat-101','devoir',        11,  1, 'Devoir 1 Maths',   '2024-10-05', 1, '2024-2025', 'prof-001'),
('note-109','eleve-008','mat-102','devoir',         9.5,1, 'Devoir 1 PC',      '2024-10-10', 1, '2024-2025', 'prof-003'),
-- Notes 3ème A
('note-201','eleve-009','mat-201','devoir',        15,  1, 'Devoir 1',         '2024-10-06', 1, '2024-2025', 'prof-002'),
('note-202','eleve-009','mat-202','devoir',        16,  1, 'Devoir 1',         '2024-10-09', 1, '2024-2025', 'prof-001'),
('note-203','eleve-010','mat-201','devoir',        12,  1, 'Devoir 1',         '2024-10-06', 1, '2024-2025', 'prof-002'),
('note-204','eleve-010','mat-202','devoir',        13,  1, 'Devoir 1',         '2024-10-09', 1, '2024-2025', 'prof-001');

-- ============================================================
-- ABSENCES
-- ============================================================
INSERT OR IGNORE INTO absences (id, eleve_id, date, statut, motif, enregistre_par) VALUES
('abs-001','eleve-002','2024-10-07','absent',  'Maladie',           'prof-001'),
('abs-002','eleve-004','2024-10-14','absent',  'Non justifiée',     'prof-002'),
('abs-003','eleve-004','2024-10-21','retard',  'Transports',        'prof-001'),
('abs-004','eleve-008','2024-10-09','absent',  'Famille',           'prof-003'),
('abs-005','eleve-002','2024-11-04','justifie','Certificat médical','prof-002');

-- ============================================================
-- FACTURES
-- ============================================================
INSERT OR IGNORE INTO factures (id, eleve_id, libelle, montant, montant_paye, date_limite, statut, type_frais, annee_scolaire) VALUES
('fact-001','eleve-001','Frais de scolarité T1',150000,150000,'2024-10-31','paye',     'scolarite','2024-2025'),
('fact-002','eleve-002','Frais de scolarité T1',150000,75000, '2024-10-31','partiel',  'scolarite','2024-2025'),
('fact-003','eleve-003','Frais de scolarité T1',150000,0,     '2024-10-31','impaye',   'scolarite','2024-2025'),
('fact-004','eleve-006','Frais de scolarité T1',200000,200000,'2024-10-31','paye',     'scolarite','2024-2025'),
('fact-005','eleve-007','Frais d inscription',   50000, 50000,'2024-09-30','paye',     'inscription','2024-2025'),
('fact-006','eleve-008','Frais de scolarité T1',200000,0,     '2024-10-31','impaye',   'scolarite','2024-2025'),
('fact-007','eleve-001','Frais de cantine T1',   30000, 30000,'2024-10-31','paye',     'cantine','2024-2025'),
('fact-008','eleve-004','Frais de scolarité T1',150000,50000, '2024-10-31','partiel',  'scolarite','2024-2025');

-- ============================================================
-- PAIEMENTS
-- ============================================================
INSERT OR IGNORE INTO paiements (id, facture_id, montant, mode_paiement, reference, recu_par) VALUES
('pay-001','fact-001',150000,'especes',   'REC-2024-001','secr-001'),
('pay-002','fact-002', 75000,'mobile_money','MM-001',   'secr-001'),
('pay-003','fact-004',200000,'virement',  'VIR-2024-001','secr-001'),
('pay-004','fact-005', 50000,'especes',   'REC-2024-002','secr-001'),
('pay-005','fact-007', 30000,'especes',   'REC-2024-003','secr-001'),
('pay-006','fact-008', 50000,'especes',   'REC-2024-004','secr-001');

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
INSERT OR IGNORE INTO notifications (id, utilisateur_id, message, type, statut) VALUES
('notif-001','parent-u01','Bienvenue sur EduGabon ! Consultez les notes et absences de votre enfant.','info','non_lu'),
('notif-002','parent-u02','Frais de scolarité T1 : un paiement partiel a été enregistré. Solde restant : 75 000 FCFA.','paiement','non_lu'),
('notif-003','parent-u02','Absence signalée pour Kevin ONDO le 07/10/2024.','absence','non_lu'),
('notif-004','admin-001','3 factures impayées à régulariser pour le trimestre 1.','alerte','non_lu');

-- ============================================================
-- MESSAGES
-- ============================================================
INSERT OR IGNORE INTO messages (id, expediteur_id, destinataire_id, sujet, contenu, lu) VALUES
('msg-001','parent-u01','prof-001','Questions sur les notes de Christelle',
 'Bonjour Monsieur MBADINGA, je souhaite en savoir plus sur les résultats de ma fille en mathématiques. Pouvons-nous fixer un rendez-vous ? Cordialement.', 0),
('msg-002','prof-002','admin-001','Demande de matériel pédagogique',
 'Bonjour, j ai besoin de nouvelles cartes murales pour mes cours d Histoire-Géographie. Pouvez-vous traiter cette demande ? Merci.', 1);

-- ============================================================
-- TRANSPORT
-- ============================================================
INSERT OR IGNORE INTO transport (id, nom_ligne, chauffeur, vehicule, capacite, itineraire) VALUES
('trans-001','Ligne 1 - Centre Ville','MABIKA Thomas',    'Minibus Toyota HiAce', 20,'Lycée → Carrefour Akanda → Centre Ville → Montagne Sainte'),
('trans-002','Ligne 2 - Owendo',      'NTOUTOUME Jules',  'Minibus Toyota HiAce', 20,'Lycée → Owendo Port → Cité Lastoursville → PK8');

INSERT OR IGNORE INTO transport_eleves (id, eleve_id, transport_id, point_arret, sens, actif) VALUES
('te-001','eleve-001','trans-001','Montagne Sainte','aller_retour',1),
('te-002','eleve-002','trans-002','Owendo Port',    'aller_retour',1);

-- ============================================================
-- BIBLIOTHÈQUE NUMÉRIQUE
-- ============================================================
INSERT OR IGNORE INTO bibliotheque (id, titre, auteur, categorie, description, disponible, ajoute_par) VALUES
('bib-001','Mathématiques Terminale C','MOYEN Didier',      'Manuel','Manuel officiel Terminale C — Gabon',1,'admin-001'),
('bib-002','Histoire du Gabon',        'NGOUA-NGUEMA',     'Histoire','Histoire contemporaine du Gabon',  1,'admin-001'),
('bib-003','Le Bel Immonde',           'V.Y. Mudimbe',     'Littérature','Roman africain francophone',    1,'prof-002'),
('bib-004','Physique-Chimie Tle C',    'Collectif',        'Manuel','Physique-Chimie programme gabonais', 1,'admin-001');

-- ============================================================
-- EMPLOI DU TEMPS — 6ème A (exemples)
-- ============================================================
INSERT OR IGNORE INTO emplois_du_temps (id, classe_id, matiere_id, professeur_id, jour, heure_debut, heure_fin, salle) VALUES
('edt-001','class-6e-A','mat-002','prof-001','Lundi',   '07:30','09:30','Salle 01'),
('edt-002','class-6e-A','mat-001','prof-002','Lundi',   '09:30','11:30','Salle 01'),
('edt-003','class-6e-A','mat-005','prof-001','Mardi',   '07:30','09:30','Salle 02'),
('edt-004','class-6e-A','mat-003','prof-003','Mardi',   '09:30','11:30','Salle 01'),
('edt-005','class-6e-A','mat-004','prof-002','Mercredi','07:30','09:30','Labo SVT'),
('edt-006','class-6e-A','mat-006','prof-003','Jeudi',   '07:30','09:30','Terrain EPS'),
('edt-007','class-6e-A','mat-001','prof-002','Vendredi','07:30','09:30','Salle 01'),
('edt-008','class-6e-A','mat-002','prof-001','Vendredi','09:30','11:30','Salle 01');

-- ============================================================
-- DEVOIRS
-- ============================================================
INSERT OR IGNORE INTO devoirs (id, matiere_id, professeur_id, titre, description, date_donnee, date_remise) VALUES
('dev-001','mat-002','prof-001','Exercices équations',  'Résoudre les exercices p.45 du manuel',    '2024-10-14','2024-10-21'),
('dev-002','mat-001','prof-002','Rédaction',            'Rédiger un texte argumentatif sur le Gabon','2024-10-16','2024-10-23'),
('dev-003','mat-101','prof-001','Suites numériques',    'Fiches d exercices sur les suites',         '2024-10-15','2024-10-22');

-- ============================================================
-- BADGES ÉLÈVES
-- ============================================================
INSERT OR IGNORE INTO badges_eleves (id, eleve_id, badge_id, attribue_par) VALUES
('be-001','eleve-001','badge-002','prof-001'),
('be-002','eleve-007','badge-001','admin-001'),
('be-003','eleve-007','badge-002','admin-001');

-- ============================================================
-- RENDEZ-VOUS
-- ============================================================
INSERT OR IGNORE INTO rendez_vous (id, parent_id, professeur_id, date_rdv, motif, statut) VALUES
('rdv-001','par-001','prof-001','2024-11-15 10:00','Discussion sur les résultats de Christelle en Mathématiques','confirme'),
('rdv-002','par-002','prof-002','2024-11-20 14:30','Suivi de Kevin — comportement et résultats','en_attente');
