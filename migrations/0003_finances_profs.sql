-- ============================================================
-- MIGRATION 0003 - Tables Finances Professeurs
-- Contrats, Heures de travail, Fiches de paie
-- ============================================================

-- Table CONTRATS_PROFESSEURS
CREATE TABLE IF NOT EXISTS contrats_professeurs (
  id TEXT PRIMARY KEY,
  professeur_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type_contrat TEXT NOT NULL DEFAULT 'CDI' CHECK(type_contrat IN ('CDI','CDD','Vacataire','Stage')),
  salaire_base REAL NOT NULL DEFAULT 0,
  taux_horaire REAL NOT NULL DEFAULT 0,
  date_debut TEXT,
  date_fin TEXT,
  nb_heures_semaine REAL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'actif' CHECK(statut IN ('actif','suspendu','termine')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table HEURES_TRAVAIL
CREATE TABLE IF NOT EXISTS heures_travail (
  id TEXT PRIMARY KEY,
  professeur_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  classe_id TEXT REFERENCES classes(id),
  matiere_id TEXT REFERENCES matieres(id),
  date_cours TEXT NOT NULL,
  heure_debut TEXT NOT NULL,
  heure_fin TEXT NOT NULL,
  nb_heures REAL NOT NULL DEFAULT 0,
  type_heure TEXT NOT NULL DEFAULT 'cours' CHECK(type_heure IN ('cours','surveillance','reunion','remplacement','autre')),
  annee_scolaire TEXT NOT NULL DEFAULT '2024-2025',
  valide INTEGER NOT NULL DEFAULT 0,
  valide_par TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table FICHES_PAIE
CREATE TABLE IF NOT EXISTS fiches_paie (
  id TEXT PRIMARY KEY,
  professeur_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mois INTEGER NOT NULL CHECK(mois BETWEEN 1 AND 12),
  annee INTEGER NOT NULL,
  annee_scolaire TEXT NOT NULL DEFAULT '2024-2025',
  salaire_base REAL NOT NULL DEFAULT 0,
  nb_heures_effectuees REAL NOT NULL DEFAULT 0,
  montant_heures REAL NOT NULL DEFAULT 0,
  primes REAL NOT NULL DEFAULT 0,
  retenues REAL NOT NULL DEFAULT 0,
  net_a_payer REAL NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'brouillon' CHECK(statut IN ('brouillon','valide','paye')),
  date_paiement TEXT,
  mode_paiement TEXT,
  reference_paiement TEXT,
  genere_par TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_heures_prof ON heures_travail(professeur_id);
CREATE INDEX IF NOT EXISTS idx_heures_date ON heures_travail(date_cours);
CREATE INDEX IF NOT EXISTS idx_heures_annee ON heures_travail(annee_scolaire);
CREATE INDEX IF NOT EXISTS idx_fiches_prof ON fiches_paie(professeur_id);
CREATE INDEX IF NOT EXISTS idx_fiches_mois ON fiches_paie(mois, annee);
CREATE INDEX IF NOT EXISTS idx_contrats_prof ON contrats_professeurs(professeur_id);

-- Données initiales : contrats pour les 3 professeurs de demo
-- prof-001 : Jean-Pierre MBADINGA
INSERT OR IGNORE INTO contrats_professeurs (id, professeur_id, type_contrat, salaire_base, taux_horaire, date_debut, nb_heures_semaine, statut)
VALUES ('contrat-001', 'prof-001', 'CDI', 450000, 5000, '2024-09-01', 20, 'actif');

-- prof-002 : Sylvie OVONO
INSERT OR IGNORE INTO contrats_professeurs (id, professeur_id, type_contrat, salaire_base, taux_horaire, date_debut, nb_heures_semaine, statut)
VALUES ('contrat-002', 'prof-002', 'CDI', 420000, 4500, '2024-09-01', 18, 'actif');

-- prof-003 : Paul NDONG
INSERT OR IGNORE INTO contrats_professeurs (id, professeur_id, type_contrat, salaire_base, taux_horaire, date_debut, nb_heures_semaine, statut)
VALUES ('contrat-003', 'prof-003', 'CDD', 380000, 4000, '2024-09-01', 16, 'actif');

-- Heures de travail de démonstration (Septembre-Octobre 2024)
INSERT OR IGNORE INTO heures_travail (id, professeur_id, classe_id, matiere_id, date_cours, heure_debut, heure_fin, nb_heures, type_heure, annee_scolaire, valide)
VALUES
  ('ht-001', 'prof-001', 'class-6e-A', NULL, '2024-10-01', '08:00', '10:00', 2, 'cours', '2024-2025', 1),
  ('ht-002', 'prof-001', 'class-Tle-C', NULL, '2024-10-02', '10:00', '12:00', 2, 'cours', '2024-2025', 1),
  ('ht-003', 'prof-001', 'class-6e-A', NULL, '2024-10-03', '08:00', '10:00', 2, 'cours', '2024-2025', 1),
  ('ht-004', 'prof-001', 'class-Tle-C', NULL, '2024-10-04', '14:00', '16:00', 2, 'cours', '2024-2025', 1),
  ('ht-005', 'prof-001', NULL, NULL, '2024-10-08', '09:00', '10:00', 1, 'reunion', '2024-2025', 1),
  ('ht-006', 'prof-002', 'class-5e-A', NULL, '2024-10-01', '10:00', '12:00', 2, 'cours', '2024-2025', 1),
  ('ht-007', 'prof-002', 'class-6e-A', NULL, '2024-10-02', '08:00', '10:00', 2, 'cours', '2024-2025', 1),
  ('ht-008', 'prof-002', 'class-5e-A', NULL, '2024-10-03', '14:00', '16:00', 2, 'cours', '2024-2025', 1),
  ('ht-009', 'prof-002', 'class-Tle-C', NULL, '2024-10-07', '10:00', '12:00', 2, 'cours', '2024-2025', 1),
  ('ht-010', 'prof-003', 'class-4e-A', NULL, '2024-10-01', '14:00', '16:00', 2, 'cours', '2024-2025', 1),
  ('ht-011', 'prof-003', 'class-Tle-C', NULL, '2024-10-03', '10:00', '12:00', 2, 'cours', '2024-2025', 1),
  ('ht-012', 'prof-003', 'class-4e-A', NULL, '2024-10-04', '08:00', '10:00', 2, 'cours', '2024-2025', 0),
  -- Novembre 2024
  ('ht-013', 'prof-001', 'class-6e-A', NULL, '2024-11-04', '08:00', '10:00', 2, 'cours', '2024-2025', 1),
  ('ht-014', 'prof-001', 'class-Tle-C', NULL, '2024-11-05', '10:00', '12:00', 2, 'cours', '2024-2025', 1),
  ('ht-015', 'prof-001', 'class-6e-A', NULL, '2024-11-06', '08:00', '10:00', 2, 'cours', '2024-2025', 1),
  ('ht-016', 'prof-001', 'class-Tle-C', NULL, '2024-11-07', '14:00', '16:00', 2, 'cours', '2024-2025', 0),
  ('ht-017', 'prof-002', 'class-5e-A', NULL, '2024-11-04', '10:00', '12:00', 2, 'cours', '2024-2025', 1),
  ('ht-018', 'prof-002', 'class-6e-A', NULL, '2024-11-05', '08:00', '10:00', 2, 'cours', '2024-2025', 1),
  ('ht-019', 'prof-003', 'class-4e-A', NULL, '2024-11-06', '14:00', '16:00', 2, 'cours', '2024-2025', 1),
  ('ht-020', 'prof-003', 'class-Tle-C', NULL, '2024-11-07', '10:00', '12:00', 2, 'cours', '2024-2025', 1);
