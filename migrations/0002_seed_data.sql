-- ============================================================
-- DONNÉES INITIALES - Seed Data
-- ============================================================

-- Année scolaire active
INSERT OR IGNORE INTO annees_scolaires (id, libelle, date_debut, date_fin, actif) VALUES
('annee-2024-2025', '2024-2025', '2024-09-01', '2025-06-30', 1);

-- Compte administrateur par défaut (mot de passe: Admin@123)
INSERT OR IGNORE INTO users (id, nom, prenom, email, mot_de_passe_hash, role, telephone) VALUES
('admin-001', 'ADMINISTRATEUR', 'Système', 'admin@lycee-gabon.ga', '$2a$10$XkNmZ0u5QJZJZJZJZJZJZO8iEQeHJlB2GvxX3JZJZJZJZJZJZJZ', 'admin', '+241 77 00 00 00');

-- Compte secrétariat (mot de passe: Secret@123)
INSERT OR IGNORE INTO users (id, nom, prenom, email, mot_de_passe_hash, role, telephone) VALUES
('secr-001', 'NZAMBA', 'Marie-Claire', 'secretariat@lycee-gabon.ga', '$2a$10$XkNmZ0u5QJZJZJZJZJZJZO8iEQeHJlB2GvxX3JZJZJZJZJZJZJZ', 'secretariat', '+241 77 00 00 01');

-- Professeurs (mot de passe: Prof@123)
INSERT OR IGNORE INTO users (id, nom, prenom, email, mot_de_passe_hash, role, telephone) VALUES
('prof-001', 'MBADINGA', 'Jean-Pierre', 'j.mbadinga@lycee-gabon.ga', '$2a$10$XkNmZ0u5QJZJZJZJZJZJZO8iEQeHJlB2GvxX3JZJZJZJZJZJZJZ', 'professeur', '+241 77 11 22 33'),
('prof-002', 'OVONO', 'Sylvie', 's.ovono@lycee-gabon.ga', '$2a$10$XkNmZ0u5QJZJZJZJZJZJZO8iEQeHJlB2GvxX3JZJZJZJZJZJZJZ', 'professeur', '+241 77 44 55 66'),
('prof-003', 'NDONG', 'Paul', 'p.ndong@lycee-gabon.ga', '$2a$10$XkNmZ0u5QJZJZJZJZJZJZO8iEQeHJlB2GvxX3JZJZJZJZJZJZJZ', 'professeur', '+241 77 77 88 99');

-- Badges de mérite
INSERT OR IGNORE INTO badges (id, nom, description, icone, couleur, critere) VALUES
('badge-001', 'Excellence', 'Moyenne générale ≥ 16/20', '🏆', '#FFD700', 'moyenne >= 16'),
('badge-002', 'Assiduité', 'Zéro absence injustifiée', '✅', '#00AA00', 'absences = 0'),
('badge-003', 'Progrès', 'Amélioration de +3 points', '📈', '#0066FF', 'progression >= 3'),
('badge-004', 'Comportement', 'Exemplaire toute l annee', '⭐', '#FF6600', 'comportement = excellent'),
('badge-005', 'Sport', 'Excellence en EPS', '🏅', '#CC0000', 'note_eps >= 16');

-- Classes
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

-- Matières pour 6ème A
INSERT OR IGNORE INTO matieres (id, nom_matiere, coefficient, classe_id, professeur_id) VALUES
('mat-001', 'Français', 4, 'class-6e-A', 'prof-002'),
('mat-002', 'Mathématiques', 4, 'class-6e-A', 'prof-001'),
('mat-003', 'Histoire-Géographie', 2, 'class-6e-A', 'prof-003'),
('mat-004', 'Sciences de la Vie', 2, 'class-6e-A', 'prof-002'),
('mat-005', 'Anglais', 3, 'class-6e-A', 'prof-001'),
('mat-006', 'Education Physique', 1, 'class-6e-A', 'prof-003');

-- Matières pour Terminale C
INSERT OR IGNORE INTO matieres (id, nom_matiere, coefficient, classe_id, professeur_id) VALUES
('mat-101', 'Mathématiques', 7, 'class-Tle-C', 'prof-001'),
('mat-102', 'Physique-Chimie', 6, 'class-Tle-C', 'prof-003'),
('mat-103', 'Sciences de la Vie et de la Terre', 5, 'class-Tle-C', 'prof-002'),
('mat-104', 'Français', 3, 'class-Tle-C', 'prof-002'),
('mat-105', 'Philosophie', 3, 'class-Tle-C', 'prof-003'),
('mat-106', 'Anglais', 3, 'class-Tle-C', 'prof-001'),
('mat-107', 'Histoire-Géographie', 2, 'class-Tle-C', 'prof-003');

-- Ligne de transport
INSERT OR IGNORE INTO transport (id, nom_ligne, chauffeur, vehicule, capacite, itineraire) VALUES
('trans-001', 'Ligne 1 - Centre Ville', 'MABIKA Thomas', 'Minibus Toyota HiAce', 20, 'Lycée → Carrefour Akanda → Centre Ville → Quartier Montagne Sainte'),
('trans-002', 'Ligne 2 - Owendo', 'NTOUTOUME Jules', 'Minibus Toyota HiAce', 20, 'Lycée → Owendo Port → Cité Lastoursville → Pk8');
