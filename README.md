# EduGabon — Système de Gestion Scolaire
**Lycée Privé Gabon** · Version 1.0.0

---

## 🌐 URLs
- **Local sandbox** : http://localhost:3000
- **GitHub** : https://github.com/YEZENGOYE/mon-projet-application-de-gestion-d-tablissement-priv-

---

## 🔑 Comptes de démonstration (mot de passe : `Admin@123`)
| Rôle | Email |
|------|-------|
| Administrateur | admin@lycee-gabon.ga |
| Secrétariat | secretariat@lycee-gabon.ga |
| Professeur | j.mbadinga@lycee-gabon.ga |
| Parent | parent@demo.ga |

---

## ✅ Fonctionnalités implémentées

### Pédagogie
- Gestion des élèves (fiche complète, matricule, photo)
- Gestion des classes (6ème → Terminale)
- Gestion des matières et coefficients
- Saisie et consultation des notes
- Gestion des présences/absences avec notifications parents
- Emploi du temps
- Devoirs & Cahier de texte
- **Bulletins scolaires automatiques** (calcul moyennes, rangs, mentions, T1/T2/T3)

### Administration
- Gestion des utilisateurs (admin + secrétariat)
- **Création professeur** par admin ET secrétariat (avec contrat intégré)
- **Création parent** par admin ET secrétariat
- Cartes scolaires avec QR Code
- Transport scolaire (lignes, chauffeurs)
- Bibliothèque numérique
- Badges de mérite

### Finance Élèves
- Facturation (scolarité, inscription, cantine…)
- Paiements avec modes multiples

### 💼 Finances Professeurs (NOUVEAU)
- **Contrats** : CDI, CDD, Vacataire — salaire de base + taux horaire
- **Heures de travail** : saisie quotidienne, validation par admin/secrétariat
- **Fiches de paie** : génération automatique à partir des heures validées
  - Génération individuelle ou en masse (tous les profs)
  - Workflow : Brouillon → Validé → Payé
  - Impression fiche de paie (prête à imprimer)
  - Notification automatique au professeur à la mise en paiement
- **Vue personnelle professeur** : mon contrat, mes heures, mes fiches

### Communication
- Messagerie interne
- Notifications push en temps réel
- Rendez-vous

### Tableau de bord & Statistiques
- Tableau de bord adapté par rôle
- Statistiques globales (graphiques Chart.js)
- Mon espace (parent : bulletins enfants / élève : notes)

---

## 🏗 Architecture technique
- **Backend** : Hono (TypeScript) · Cloudflare Pages/Workers
- **Base de données** : Cloudflare D1 (SQLite)
- **Auth** : JWT (jose) · SHA-256 passwords
- **Frontend** : Vanilla JS · Tailwind CSS · Chart.js · Axios
- **Déploiement** : Cloudflare Pages

### Structure des routes API
| Préfixe | Description |
|---------|-------------|
| `/api/auth` | Connexion, déconnexion, changement MDP |
| `/api/users` | Utilisateurs (admin + secrétariat) |
| `/api/parents` | Parents/tuteurs |
| `/api/eleves` | Élèves |
| `/api/classes` | Classes |
| `/api/matieres` | Matières |
| `/api/notes` | Notes |
| `/api/absences` | Présences/absences |
| `/api/bulletins` | Bulletins scolaires |
| `/api/factures` | Facturation |
| `/api/paiements` | Paiements |
| `/api/finances-profs` | Contrats, heures, fiches de paie profs |
| `/api/cartes` | Cartes scolaires QR |
| `/api/stats` | Statistiques |
| `/api/notifications` | Notifications |
| `/api/messages` | Messagerie |
| `/api/transport` | Transport scolaire |
| `/api/bibliotheque` | Bibliothèque |
| `/api/badges` | Badges mérite |
| `/api/emploi-du-temps` | EDT |
| `/api/devoirs` | Devoirs |
| `/api/cahier-texte` | Cahier de texte |
| `/api/rendez-vous` | Rendez-vous |

### Migrations base de données
| Fichier | Contenu |
|---------|---------|
| `0001_initial_schema.sql` | Schéma complet (toutes les tables) |
| `0002_seed_data.sql` | Données de démo (10 élèves, notes, absences, factures) |
| `0003_finances_profs.sql` | Contrats, heures de travail, fiches de paie |

---

## 🚀 Démarrage local (sandbox)
```bash
cd /home/user/webapp
npm run build
npx wrangler d1 migrations apply edugabon-production --local
pm2 start ecosystem.config.cjs
```

---

## 📋 Prochaines étapes suggérées
- [ ] Export PDF des bulletins scolaires
- [ ] Module élève : accès notes et emploi du temps
- [ ] Espace parent enrichi (messagerie avec profs)
- [ ] Gestion des années scolaires multiples
- [ ] Rapport d'activité mensuel (PDF)
- [ ] Déploiement Cloudflare Pages (configurer token CF)
- [ ] Application mobile (PWA)

---

*Dernière mise à jour : Mai 2026*
