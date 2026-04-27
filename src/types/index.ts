// ============================================================
// TYPES & INTERFACES - Lycée Privé Gabon
// ============================================================

export type UserRole = 'admin' | 'secretariat' | 'professeur' | 'parent' | 'eleve';

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  mot_de_passe_hash: string;
  role: UserRole;
  telephone?: string;
  actif: number;
  date_creation: string;
  derniere_connexion?: string;
}

export interface Parent {
  id: string;
  user_id: string;
  profession?: string;
  adresse?: string;
}

export interface Eleve {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  date_naissance?: string;
  photo?: string;
  classe_id?: string;
  parent_id?: string;
  user_id?: string;
  adresse?: string;
  info_medicale?: string;
  annee_inscription?: string;
  sexe?: 'M' | 'F';
  nationalite?: string;
  lieu_naissance?: string;
  actif: number;
}

export interface Classe {
  id: string;
  nom_classe: string;
  niveau: string;
  filiere?: string;
  annee_scolaire: string;
  professeur_principal_id?: string;
  capacite?: number;
}

export interface Matiere {
  id: string;
  nom_matiere: string;
  coefficient: number;
  classe_id?: string;
  professeur_id?: string;
}

export interface Note {
  id: string;
  eleve_id: string;
  matiere_id: string;
  type_evaluation: 'devoir' | 'interrogation' | 'examen' | 'controle';
  note: number;
  coefficient: number;
  libelle?: string;
  date: string;
  trimestre?: number;
  annee_scolaire?: string;
  saisie_par?: string;
}

export interface Absence {
  id: string;
  eleve_id: string;
  matiere_id?: string;
  date: string;
  heure_debut?: string;
  heure_fin?: string;
  statut: 'present' | 'absent' | 'retard' | 'justifie';
  motif?: string;
  enregistre_par?: string;
}

export interface Facture {
  id: string;
  eleve_id: string;
  libelle: string;
  montant: number;
  montant_paye: number;
  date_emission: string;
  date_limite?: string;
  statut: 'paye' | 'partiel' | 'impaye';
  type_frais?: string;
  annee_scolaire?: string;
}

export interface Paiement {
  id: string;
  facture_id: string;
  montant: number;
  date_paiement: string;
  mode_paiement?: string;
  reference?: string;
  recu_par?: string;
}

export interface CarteScolaire {
  id: string;
  eleve_id: string;
  annee_scolaire: string;
  qr_code?: string;
  qr_data?: string;
  fichier_pdf?: string;
  date_generation: string;
  valide: number;
}

export interface Notification {
  id: string;
  utilisateur_id?: string;
  message: string;
  type?: string;
  date_envoi: string;
  statut: 'non_lu' | 'lu';
  lien?: string;
}

export interface Message {
  id: string;
  expediteur_id: string;
  destinataire_id: string;
  sujet?: string;
  contenu: string;
  date_envoi: string;
  lu: number;
  reponse_a?: string;
}

export interface JWTPayload {
  sub: string;
  email: string;
  role: UserRole;
  nom: string;
  prenom: string;
  iat?: number;
  exp?: number;
}

export type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
  ENVIRONMENT: string;
};

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  total?: number;
  page?: number;
  per_page?: number;
}
