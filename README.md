# EduGabon - Système de Gestion Scolaire

Plateforme complète de gestion pour lycée privé au Gabon, accessible via web et mobile.

## 🌐 URL
- **Application live** : https://3000-iahn8ysxgbsinjvt2plct-ea026bf9.sandbox.novita.ai
- **Health API** : /api/health

## 🔑 Comptes de démonstration (mot de passe : Admin@123)
| Rôle | Email |
|------|-------|
| 👑 Administrateur | admin@lycee-gabon.ga |
| 📋 Secrétariat | secretariat@lycee-gabon.ga |
| 👨‍🏫 Professeur | j.mbadinga@lycee-gabon.ga |
| 👨‍👩‍👧 Parent | parent@demo.ga |

## ✅ Fonctionnalités implémentées
- **Authentification JWT** avec 5 rôles (admin, secrétariat, professeur, parent, élève)
- **Gestion des élèves** — CRUD complet, fiche individuelle, bulletin
- **Classes & Matières** — gestion pédagogique
- **Notes & Évaluations** — saisie, calcul de moyennes, bulletins trimestriels
- **Absences & Présences** — suivi et justifications
- **Facturation** — factures, paiements, taux de recouvrement
- **Cartes scolaires** — génération avec QR code
- **Emploi du temps** — par classe
- **Devoirs en ligne** — assignation et suivi
- **Cahier de texte** — journal pédagogique
- **Messagerie école-famille** — communication interne
- **Notifications** — système temps réel
- **Transport scolaire** — lignes et inscriptions
- **Bibliothèque numérique** — ressources pédagogiques
- **Badges de mérite** — motivation élèves
- **Rendez-vous** — agenda parent-professeur
- **Statistiques** — tableau de bord analytique

## 🏗️ Architecture
- **Backend** : Hono (TypeScript) + Cloudflare Workers
- **Base de données** : Cloudflare D1 (SQLite)
- **Frontend** : SPA Vanilla JS + Tailwind CSS + Chart.js
- **Auth** : JWT HS256 (Web Crypto API)

## 📊 Données de démo
- 15 élèves répartis dans 10 classes
- Notes, absences, factures et paiements préchargés
- 3 lignes de transport, bibliothèque, badges

## 🚀 Démarrage local
```bash
# Appliquer migrations
npx wrangler d1 migrations apply edugabon-production --local

# Builder
npm run build

# Démarrer
pm2 start ecosystem.config.cjs
```

## 📡 Endpoints API principaux
- `POST /api/auth/login` — Connexion
- `GET /api/eleves` — Liste élèves
- `GET /api/classes` — Classes
- `POST /api/notes` — Saisir une note
- `POST /api/absences` — Marquer présence
- `POST /api/factures` — Créer facture
- `POST /api/cartes/generer/:id` — Générer carte scolaire
- `GET /api/stats/dashboard` — Tableau de bord stats
- `GET /api/health` — État du serveur

**Déploiement** : Cloudflare Pages | **Status** : ✅ Actif
