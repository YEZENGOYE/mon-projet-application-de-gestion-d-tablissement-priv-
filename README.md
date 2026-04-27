# EduGabon — Système de Gestion de Lycée Privé

## Présentation
Application web complète de gestion scolaire pour un lycée privé au Gabon, construite avec Hono (TypeScript) + Cloudflare Pages + D1 SQLite.

## URL d'accès
- **Application** : démarrer localement avec `npm run start`
- **Health Check** : `/api/health`

## Comptes de démonstration (mot de passe : `Admin@123`)
| Rôle | Email |
|------|-------|
| 👑 Administrateur | admin@lycee-gabon.ga |
| 📋 Secrétariat | secretariat@lycee-gabon.ga |
| 👨‍🏫 Professeur | j.mbadinga@lycee-gabon.ga |
| 👨‍👩‍👧 Parent | parent@demo.ga |

## Fonctionnalités implémentées

### Administration
- ✅ Gestion des utilisateurs (CRUD) avec rôles
- ✅ Gestion des élèves (inscription, fiche, matricule auto)
- ✅ Gestion des classes et affectations
- ✅ Gestion des matières et coefficients
- ✅ Emploi du temps par classe
- ✅ Cartes scolaires avec QR Code

### Pédagogie
- ✅ Saisie et consultation des notes (avec bulletins)
- ✅ Gestion des présences/absences
- ✅ Devoirs en ligne avec dates limites
- ✅ Cahier de texte numérique
- ✅ Bibliothèque numérique
- ✅ Badges de mérite

### Finance
- ✅ Gestion des factures (scolarité, inscription, etc.)
- ✅ Enregistrement des paiements
- ✅ Statistiques financières (taux de recouvrement)

### Communication
- ✅ Messagerie interne parent-professeur
- ✅ Notifications en temps réel
- ✅ Système de rendez-vous

### Espaces dédiés
- ✅ Tableau de bord admin/secrétariat avec statistiques
- ✅ Espace parent (enfants, notes, absences, bulletins, factures)
- ✅ Espace professeur (classes, saisie, devoirs)
- ✅ Transport scolaire

## Architecture technique
- **Frontend** : HTML5/CSS3/JS vanilla + TailwindCSS CDN + Chart.js
- **Backend** : Hono (TypeScript) — API REST JWT
- **Base de données** : Cloudflare D1 (SQLite) — 20+ tables
- **Auth** : JWT HS256 via Web Crypto API
- **Déploiement** : Cloudflare Pages

## Structure API
```
POST /api/auth/login       # Connexion
GET  /api/eleves           # Liste élèves
GET  /api/classes          # Liste classes
GET  /api/notes            # Notes
GET  /api/absences         # Absences
GET  /api/factures         # Factures
GET  /api/stats/dashboard  # Statistiques
... et 40+ autres endpoints
```

## Base de données
- **users** — Utilisateurs multi-rôles
- **eleves** — Élèves avec matricule unique
- **classes** — Classes avec niveau/filière
- **matieres** — Matières par classe
- **notes** — Notes avec coefficients
- **absences** — Présences/absences/retards
- **factures/paiements** — Comptabilité
- **cartes_scolaires** — Cartes avec QR
- **notifications/messages** — Communication
- **devoirs/cahier_texte** — Pédagogie
- **bibliotheque** — Ressources numériques
- **badges/transport** — Services

## Démarrage local
```bash
cd webapp
npm install
npm run db:migrate:local  # Créer la DB
npm run start             # Démarrer le service
```

## Déploiement Cloudflare
```bash
npm run build
npx wrangler d1 create edugabon-production
npx wrangler d1 migrations apply edugabon-production
npx wrangler pages deploy dist --project-name edugabon
```

## Statut
- ✅ Backend API complet (40+ endpoints)
- ✅ Frontend SPA responsive (23 pages)
- ✅ Base de données avec données de démo
- ✅ Authentification JWT sécurisée
- ✅ Tableaux de bord multi-rôles
