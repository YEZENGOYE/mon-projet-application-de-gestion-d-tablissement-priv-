-- ============================================================
-- SCHEMA INITIAL - Lycée Privé Gabon
-- Migration 0001 - Schéma complet
-- ============================================================

-- Table USERS
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  mot_de_passe_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','secretariat','professeur','parent','eleve')),
  telephone TEXT,
  actif INTEGER DEFAULT 1,
  date_creation DATETIME DEFAULT CURRENT_TIMESTAMP,
  derniere_connexion DATETIME
);

-- Table PARENTS
CREATE TABLE IF NOT EXISTS parents (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  profession TEXT,
  adresse TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table ANNEES_SCOLAIRES
CREATE TABLE IF NOT EXISTS annees_scolaires (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  libelle TEXT NOT NULL UNIQUE,
  date_debut DATE,
  date_fin DATE,
  actif INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table CLASSES
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  nom_classe TEXT NOT NULL,
  niveau TEXT NOT NULL,
  filiere TEXT,
  annee_scolaire TEXT NOT NULL,
  professeur_principal_id TEXT REFERENCES users(id),
  capacite INTEGER DEFAULT 30,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table ELEVES
CREATE TABLE IF NOT EXISTS eleves (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  matricule TEXT UNIQUE NOT NULL,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  date_naissance DATE,
  photo TEXT,
  classe_id TEXT REFERENCES classes(id),
  parent_id TEXT REFERENCES parents(id),
  user_id TEXT REFERENCES users(id),
  adresse TEXT,
  info_medicale TEXT,
  annee_inscription TEXT,
  sexe TEXT CHECK(sexe IN ('M','F')),
  nationalite TEXT DEFAULT 'Gabonaise',
  lieu_naissance TEXT,
  actif INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table MATIERES
CREATE TABLE IF NOT EXISTS matieres (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  nom_matiere TEXT NOT NULL,
  coefficient REAL DEFAULT 1,
  classe_id TEXT REFERENCES classes(id),
  professeur_id TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table EMPLOIS_DU_TEMPS
CREATE TABLE IF NOT EXISTS emplois_du_temps (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  classe_id TEXT NOT NULL REFERENCES classes(id),
  matiere_id TEXT NOT NULL REFERENCES matieres(id),
  professeur_id TEXT NOT NULL REFERENCES users(id),
  jour TEXT NOT NULL CHECK(jour IN ('Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi')),
  heure_debut TEXT NOT NULL,
  heure_fin TEXT NOT NULL,
  salle TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table ABSENCES
CREATE TABLE IF NOT EXISTS absences (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  eleve_id TEXT NOT NULL REFERENCES eleves(id),
  matiere_id TEXT REFERENCES matieres(id),
  date TEXT NOT NULL,
  heure_debut TEXT,
  heure_fin TEXT,
  statut TEXT NOT NULL CHECK(statut IN ('present','absent','retard','justifie')) DEFAULT 'present',
  motif TEXT,
  enregistre_par TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table NOTES
CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  eleve_id TEXT NOT NULL REFERENCES eleves(id),
  matiere_id TEXT NOT NULL REFERENCES matieres(id),
  type_evaluation TEXT NOT NULL CHECK(type_evaluation IN ('devoir','interrogation','examen','controle')),
  note REAL NOT NULL CHECK(note >= 0 AND note <= 20),
  coefficient REAL DEFAULT 1,
  libelle TEXT,
  date TEXT NOT NULL,
  trimestre INTEGER CHECK(trimestre IN (1,2,3)),
  annee_scolaire TEXT,
  saisie_par TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table BULLETINS
CREATE TABLE IF NOT EXISTS bulletins (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  eleve_id TEXT NOT NULL REFERENCES eleves(id),
  classe_id TEXT NOT NULL REFERENCES classes(id),
  trimestre INTEGER NOT NULL,
  annee_scolaire TEXT NOT NULL,
  moyenne_generale REAL,
  rang INTEGER,
  effectif INTEGER,
  appreciation TEXT,
  mention TEXT,
  date_generation DATETIME DEFAULT CURRENT_TIMESTAMP,
  fichier_pdf TEXT
);

-- Table FACTURES
CREATE TABLE IF NOT EXISTS factures (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  eleve_id TEXT NOT NULL REFERENCES eleves(id),
  libelle TEXT NOT NULL,
  montant REAL NOT NULL,
  montant_paye REAL DEFAULT 0,
  date_emission DATETIME DEFAULT CURRENT_TIMESTAMP,
  date_limite DATE,
  statut TEXT NOT NULL CHECK(statut IN ('paye','partiel','impaye')) DEFAULT 'impaye',
  type_frais TEXT CHECK(type_frais IN ('scolarite','inscription','cantine','transport','autres')),
  annee_scolaire TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table PAIEMENTS
CREATE TABLE IF NOT EXISTS paiements (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  facture_id TEXT NOT NULL REFERENCES factures(id),
  montant REAL NOT NULL,
  date_paiement DATETIME DEFAULT CURRENT_TIMESTAMP,
  mode_paiement TEXT CHECK(mode_paiement IN ('especes','virement','mobile_money','cheque')),
  reference TEXT,
  recu_par TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table CARTES_SCOLAIRES
CREATE TABLE IF NOT EXISTS cartes_scolaires (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  eleve_id TEXT NOT NULL REFERENCES eleves(id),
  annee_scolaire TEXT NOT NULL,
  qr_code TEXT,
  qr_data TEXT,
  fichier_pdf TEXT,
  date_generation DATETIME DEFAULT CURRENT_TIMESTAMP,
  valide INTEGER DEFAULT 1
);

-- Table NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  utilisateur_id TEXT REFERENCES users(id),
  message TEXT NOT NULL,
  type TEXT CHECK(type IN ('info','alerte','paiement','note','absence','message','rendez_vous')),
  date_envoi DATETIME DEFAULT CURRENT_TIMESTAMP,
  statut TEXT DEFAULT 'non_lu' CHECK(statut IN ('non_lu','lu')),
  lien TEXT
);

-- Table MESSAGES
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  expediteur_id TEXT NOT NULL REFERENCES users(id),
  destinataire_id TEXT NOT NULL REFERENCES users(id),
  sujet TEXT,
  contenu TEXT NOT NULL,
  date_envoi DATETIME DEFAULT CURRENT_TIMESTAMP,
  lu INTEGER DEFAULT 0,
  reponse_a TEXT REFERENCES messages(id)
);

-- Table DEVOIRS
CREATE TABLE IF NOT EXISTS devoirs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  matiere_id TEXT NOT NULL REFERENCES matieres(id),
  professeur_id TEXT NOT NULL REFERENCES users(id),
  titre TEXT NOT NULL,
  description TEXT,
  date_donnee DATE NOT NULL,
  date_remise DATE,
  fichier TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table RENDEZ_VOUS
CREATE TABLE IF NOT EXISTS rendez_vous (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  parent_id TEXT NOT NULL REFERENCES parents(id),
  professeur_id TEXT NOT NULL REFERENCES users(id),
  date_rdv DATETIME NOT NULL,
  motif TEXT,
  statut TEXT DEFAULT 'en_attente' CHECK(statut IN ('en_attente','confirme','annule','realise')),
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table CAHIER_TEXTE
CREATE TABLE IF NOT EXISTS cahier_texte (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  matiere_id TEXT NOT NULL REFERENCES matieres(id),
  professeur_id TEXT NOT NULL REFERENCES users(id),
  date_cours DATE NOT NULL,
  contenu TEXT NOT NULL,
  objectifs TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table BADGES
CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  nom TEXT NOT NULL,
  description TEXT,
  icone TEXT,
  couleur TEXT DEFAULT '#FFD700',
  critere TEXT
);

-- Table BADGES_ELEVES
CREATE TABLE IF NOT EXISTS badges_eleves (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  eleve_id TEXT NOT NULL REFERENCES eleves(id),
  badge_id TEXT NOT NULL REFERENCES badges(id),
  date_attribution DATETIME DEFAULT CURRENT_TIMESTAMP,
  attribue_par TEXT REFERENCES users(id),
  UNIQUE(eleve_id, badge_id)
);

-- Table TRANSPORT
CREATE TABLE IF NOT EXISTS transport (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  nom_ligne TEXT NOT NULL,
  chauffeur TEXT,
  vehicule TEXT,
  capacite INTEGER,
  itineraire TEXT
);

-- Table TRANSPORT_ELEVES
CREATE TABLE IF NOT EXISTS transport_eleves (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  eleve_id TEXT NOT NULL REFERENCES eleves(id),
  transport_id TEXT NOT NULL REFERENCES transport(id),
  point_arret TEXT,
  sens TEXT CHECK(sens IN ('aller','retour','aller_retour')),
  actif INTEGER DEFAULT 1
);

-- Table BIBLIOTHEQUE
CREATE TABLE IF NOT EXISTS bibliotheque (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  titre TEXT NOT NULL,
  auteur TEXT,
  categorie TEXT,
  description TEXT,
  fichier_url TEXT,
  couverture_url TEXT,
  classe_ids TEXT,
  disponible INTEGER DEFAULT 1,
  ajoute_par TEXT REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table AUDIT_LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  table_name TEXT,
  record_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_eleves_classe ON eleves(classe_id);
CREATE INDEX IF NOT EXISTS idx_eleves_parent ON eleves(parent_id);
CREATE INDEX IF NOT EXISTS idx_notes_eleve ON notes(eleve_id);
CREATE INDEX IF NOT EXISTS idx_notes_matiere ON notes(matiere_id);
CREATE INDEX IF NOT EXISTS idx_absences_eleve ON absences(eleve_id);
CREATE INDEX IF NOT EXISTS idx_factures_eleve ON factures(eleve_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_messages_destinataire ON messages(destinataire_id);
CREATE INDEX IF NOT EXISTS idx_messages_expediteur ON messages(expediteur_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
