// ============================================================
// APPLICATION PRINCIPALE - Lycée Privé Gabon
// ============================================================

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
// Note: fichiers statiques servis automatiquement par Cloudflare Pages depuis public/
import { Bindings } from './types/index.js';

// Routes
import authRoutes from './routes/auth.js';
import elevesRoutes from './routes/eleves.js';
import { classesRoutes, matieresRoutes, notesRoutes, absencesRoutes } from './routes/academic.js';
import { facturesRoutes, paiementsRoutes } from './routes/finance.js';
import { usersRoutes, parentsRoutes, notificationsRoutes, messagesRoutes } from './routes/users.js';
import {
  cartesRoutes, statsRoutes, devoirsRoutes, cahierRoutes,
  rdvRoutes, badgesRoutes, transportRoutes, bibliothequeRoutes, edtRoutes
} from './routes/features.js';
import { bulletinsRoutes } from './routes/bulletins.js';

const app = new Hono<{ Bindings: Bindings }>();

// ---- MIDDLEWARE GLOBAL ----
app.use('*', logger());
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
}));

// ---- ROUTES API ----
app.route('/api/auth', authRoutes);
app.route('/api/eleves', elevesRoutes);
app.route('/api/classes', classesRoutes);
app.route('/api/matieres', matieresRoutes);
app.route('/api/notes', notesRoutes);
app.route('/api/absences', absencesRoutes);
app.route('/api/factures', facturesRoutes);
app.route('/api/paiements', paiementsRoutes);
app.route('/api/users', usersRoutes);
app.route('/api/parents', parentsRoutes);
app.route('/api/notifications', notificationsRoutes);
app.route('/api/messages', messagesRoutes);
app.route('/api/cartes', cartesRoutes);
app.route('/api/stats', statsRoutes);
app.route('/api/devoirs', devoirsRoutes);
app.route('/api/cahier-texte', cahierRoutes);
app.route('/api/rendez-vous', rdvRoutes);
app.route('/api/badges', badgesRoutes);
app.route('/api/transport', transportRoutes);
app.route('/api/bibliotheque', bibliothequeRoutes);
app.route('/api/emploi-du-temps', edtRoutes);
app.route('/api/bulletins', bulletinsRoutes);

// ---- ENDPOINT SETUP/MIGRATION ----
app.get('/api/setup', async (c) => {
  try {
    // Vérifier si la DB est initialisée
    const check = await c.env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").first();
    if (check) {
      return c.json({ success: true, message: 'Base de données déjà initialisée.' });
    }
    return c.json({ success: false, message: 'Base de données non initialisée. Lancer les migrations.' });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// ---- HEALTH CHECK ----
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    app: 'Lycée Privé Gabon',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT || 'production'
  });
});

// ---- PAGE PRINCIPALE (SPA) ----
app.get('*', (c) => {
  return c.html(getMainHTML());
});

function getMainHTML(): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EduGabon - Gestion Lycée Privé</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎓</text></svg>">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <link rel="stylesheet" href="/static/styles.css">
</head>
<body class="bg-gray-50 font-sans">
  <div id="app">
    <!-- L'application charge ici -->
    <div class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin text-6xl mb-4">🎓</div>
        <p class="text-gray-500 text-lg">Chargement de EduGabon...</p>
      </div>
    </div>
  </div>
  <script src="/static/app.js"></script>
</body>
</html>`;
}

export default app;
