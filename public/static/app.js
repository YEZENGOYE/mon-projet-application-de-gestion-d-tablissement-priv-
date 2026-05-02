// ============================================================
// EduGabon - Application Frontend Complète
// Lycée Privé Gabon - Système de Gestion Scolaire
// ============================================================

const API = axios.create({ baseURL: '/api' });

// Intercepteur token
API.interceptors.request.use(cfg => {
  const t = localStorage.getItem('token');
  if (t) cfg.headers['Authorization'] = 'Bearer ' + t;
  return cfg;
});
API.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) { logout(); }
  return Promise.reject(err);
});

// ---- ÉTAT GLOBAL ----
let currentUser = null;
let currentPage = 'dashboard';
let notifCount = 0;
let sidebarOpen = false;
let chartInstances = {};

// ---- UTILS ----
const $ = id => document.getElementById(id);
const toast = (msg, type = 'success') => {
  let c = $('toast-container');
  if (!c) { c = document.createElement('div'); c.id = 'toast-container'; document.body.appendChild(c); }
  const icons = { success: 'check-circle', error: 'exclamation-circle', warning: 'exclamation-triangle', info: 'info-circle' };
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.innerHTML = `<i class="fas fa-${icons[type] || 'info-circle'}"></i><span>${msg}</span>`;
  c.appendChild(t);
  setTimeout(() => t.remove(), 4000);
};
const fmtDate = d => d ? new Date(d).toLocaleDateString('fr-FR') : '-';
const fmtMoney = n => n != null ? Number(n).toLocaleString('fr-FR') + ' FCFA' : '-';
const fmtNote = n => { if (n == null) return '-'; const v = Number(n); const c = v >= 14 ? 'grade-excellent' : v >= 10 ? 'grade-bien' : v >= 7 ? 'grade-passable' : 'grade-insuffisant'; return `<span class="${c}">${v.toFixed(2)}/20</span>`; };
const mention = n => n >= 16 ? '🏆 Très Bien' : n >= 14 ? '👍 Bien' : n >= 12 ? '✅ Assez Bien' : n >= 10 ? '📘 Passable' : '❌ Insuffisant';
const avatarColor = name => { const colors = ['#1a6b3c','#2563eb','#9333ea','#dc2626','#d97706','#0891b2']; let h = 0; for (let c of (name||'?')) h = c.charCodeAt(0) + ((h << 5) - h); return colors[Math.abs(h) % colors.length]; };
const avatarLetters = (nom, prenom) => ((prenom||'?')[0] + (nom||'?')[0]).toUpperCase();
const badgeStatut = s => { const m = { paye: ['green','Payé'], partiel: ['yellow','Partiel'], impaye: ['red','Impayé'], present: ['green','Présent'], absent: ['red','Absent'], retard: ['yellow','Retard'], justifie: ['blue','Justifié'], confirme: ['green','Confirmé'], en_attente: ['yellow','En attente'], annule: ['red','Annulé'] }; const [color, label] = m[s] || ['gray', s]; return `<span class="badge badge-${color}">${label}</span>`; };
const sanitize = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

// ---- INIT ----
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('user');
  const token = localStorage.getItem('token');
  if (saved && token) {
    currentUser = JSON.parse(saved);
    renderApp();
  } else {
    renderLogin();
  }
});

// ==============================================================
// LOGIN
// ==============================================================
function renderLogin() {
  document.getElementById('app').innerHTML = `
  <div class="login-bg">
    <div class="login-card">
      <div class="login-logo">🎓</div>
      <div class="text-center mb-6">
        <h1 class="text-2xl font-extrabold text-gray-800">EduGabon</h1>
        <p class="text-gray-500 text-sm mt-1">Système de Gestion Scolaire</p>
        <p class="text-gray-400 text-xs mt-1">Lycée Privé — République du Gabon</p>
      </div>
      <form id="login-form" class="space-y-4">
        <div class="form-group">
          <label class="form-label">Adresse Email</label>
          <div class="relative">
            <input id="login-email" type="email" class="form-input pl-10" placeholder="votre@email.ga" value="admin@lycee-gabon.ga" autocomplete="username" required>
            <i class="fas fa-envelope absolute left-3 top-3 text-gray-400"></i>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Mot de passe</label>
          <div class="relative">
            <input id="login-pwd" type="password" class="form-input pl-10" placeholder="••••••••" value="Admin@123" autocomplete="current-password" required>
            <i class="fas fa-lock absolute left-3 top-3 text-gray-400"></i>
            <button type="button" onclick="togglePwd()" class="absolute right-3 top-3 text-gray-400 hover:text-gray-600"><i class="fas fa-eye" id="eye-icon"></i></button>
          </div>
        </div>
        <button type="submit" id="login-btn" class="btn btn-primary w-full btn-lg justify-center">
          <i class="fas fa-sign-in-alt"></i> Se connecter
        </button>
      </form>
      <div class="mt-6 p-4 bg-green-50 rounded-xl text-xs text-gray-600">
        <p class="font-bold text-green-700 mb-2">🔑 Comptes de démonstration :</p>
        <div class="grid grid-cols-2 gap-1">
          <span class="cursor-pointer hover:text-green-700" onclick="setDemo('admin@lycee-gabon.ga')">👑 Admin</span>
          <span class="cursor-pointer hover:text-green-700" onclick="setDemo('secretariat@lycee-gabon.ga')">📋 Secrétariat</span>
          <span class="cursor-pointer hover:text-green-700" onclick="setDemo('j.mbadinga@lycee-gabon.ga')">👨‍🏫 Professeur</span>
          <span class="cursor-pointer hover:text-green-700" onclick="setDemo('parent@demo.ga')">👨‍👩‍👧 Parent</span>
        </div>
        <p class="mt-2 text-gray-400">Mot de passe : Admin@123</p>
      </div>
    </div>
  </div>`;
  document.getElementById('login-form').addEventListener('submit', doLogin);
}

function setDemo(email) { $('login-email').value = email; $('login-pwd').value = 'Admin@123'; }
function togglePwd() {
  const i = $('login-pwd'); const e = $('eye-icon');
  i.type = i.type === 'password' ? 'text' : 'password';
  e.className = i.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
}

async function doLogin(e) {
  e.preventDefault();
  const btn = $('login-btn');
  btn.disabled = true; btn.innerHTML = '<span class="animate-spin">⟳</span> Connexion...';
  try {
    const r = await API.post('/auth/login', { email: $('login-email').value, mot_de_passe: $('login-pwd').value });
    if (r.data.success) {
      localStorage.setItem('token', r.data.data.token);
      localStorage.setItem('user', JSON.stringify(r.data.data.user));
      currentUser = r.data.data.user;
      toast(r.data.message, 'success');
      renderApp();
    }
  } catch (err) {
    toast(err.response?.data?.error || 'Erreur de connexion', 'error');
    btn.disabled = false; btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Se connecter';
  }
}

function logout() {
  localStorage.clear(); currentUser = null; renderLogin();
  toast('Déconnexion réussie', 'info');
}

// ==============================================================
// APP LAYOUT
// ==============================================================
function renderApp() {
  const role = currentUser?.role;
  const nav = getNavItems(role);
  document.getElementById('app').innerHTML = `
  <div class="app-layout">
    <div id="sidebar-overlay" class="sidebar-overlay" onclick="toggleSidebar()" style="display:none"></div>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">🎓</div>
        <div>
          <div class="sidebar-title">EduGabon</div>
          <div class="sidebar-subtitle">Lycée Privé Gabon</div>
        </div>
      </div>
      <nav class="sidebar-nav" id="sidebar-nav">${nav}</nav>
      <div class="sidebar-footer">
        <div class="user-info" onclick="navigate('profil')">
          <div class="user-avatar" style="background:${avatarColor(currentUser.nom)}">${avatarLetters(currentUser.nom, currentUser.prenom)}</div>
          <div style="flex:1;min-width:0">
            <div class="user-name truncate">${currentUser.prenom} ${currentUser.nom}</div>
            <div class="user-role">${getRoleLabel(currentUser.role)}</div>
          </div>
          <i class="fas fa-ellipsis-v text-white opacity-50 text-xs"></i>
        </div>
        <button onclick="logout()" class="btn btn-sm w-full mt-2 justify-center" style="background:rgba(255,255,255,0.1);color:white;border-color:rgba(255,255,255,0.2)">
          <i class="fas fa-sign-out-alt"></i> Déconnexion
        </button>
      </div>
    </aside>
    <div class="main-content">
      <header class="topbar">
        <div class="flex items-center gap-3">
          <button class="topbar-btn hamburger" onclick="toggleSidebar()"><i class="fas fa-bars"></i></button>
          <div>
            <div class="page-title" id="page-title">Tableau de bord</div>
            <div class="text-xs text-gray-400" id="page-breadcrumb">Accueil</div>
          </div>
        </div>
        <div class="topbar-actions">
          <button class="topbar-btn" onclick="navigate('notifications')" title="Notifications">
            <i class="fas fa-bell"></i>
            <span class="notif-dot" id="notif-dot" style="display:none"></span>
          </button>
          <button class="topbar-btn" onclick="navigate('messages')" title="Messages"><i class="fas fa-envelope"></i></button>
          <button class="topbar-btn" onclick="navigate('profil')" title="Profil">
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style="background:${avatarColor(currentUser.nom)}">${avatarLetters(currentUser.nom, currentUser.prenom)}</div>
          </button>
        </div>
      </header>
      <main class="page-content" id="page-content">
        <div class="flex justify-center items-center h-64"><span class="loading-spinner"></span></div>
      </main>
    </div>
  </div>
  <div id="modal-root"></div>`;
  navigate('dashboard');
  loadNotifCount();
}

function getNavItems(role) {
  const all = [
    { id: 'dashboard', icon: 'tachometer-alt', label: 'Tableau de bord', roles: ['admin','secretariat','professeur','parent','eleve'], section: 'Principal' },
    { id: 'eleves', icon: 'user-graduate', label: 'Élèves', roles: ['admin','secretariat','professeur'], section: 'Pédagogie' },
    { id: 'classes', icon: 'chalkboard', label: 'Classes', roles: ['admin','secretariat','professeur'] },
    { id: 'notes', icon: 'star-half-alt', label: 'Notes', roles: ['admin','secretariat','professeur'] },
    { id: 'absences', icon: 'calendar-check', label: 'Présences', roles: ['admin','secretariat','professeur'] },
    { id: 'emploi-du-temps', icon: 'calendar-alt', label: 'Emploi du temps', roles: ['admin','secretariat','professeur','eleve'] },
    { id: 'devoirs', icon: 'book-open', label: 'Devoirs', roles: ['admin','professeur','eleve','parent'] },
    { id: 'cahier-texte', icon: 'pen-fancy', label: 'Cahier de texte', roles: ['admin','professeur'] },
    { id: 'factures', icon: 'file-invoice-dollar', label: 'Facturation', roles: ['admin','secretariat'], section: 'Finance' },
    { id: 'paiements', icon: 'money-bill-wave', label: 'Paiements', roles: ['admin','secretariat'] },
    { id: 'cartes', icon: 'id-card', label: 'Cartes scolaires', roles: ['admin','secretariat'], section: 'Administration' },
    { id: 'users', icon: 'users-cog', label: 'Utilisateurs', roles: ['admin'] },
    { id: 'parents', icon: 'users', label: 'Parents', roles: ['admin','secretariat'] },
    { id: 'transport', icon: 'bus', label: 'Transport', roles: ['admin','secretariat'] },
    { id: 'bibliotheque', icon: 'book', label: 'Bibliothèque', roles: ['admin','professeur','eleve','parent'], section: 'Services' },
    { id: 'badges', icon: 'medal', label: 'Badges mérite', roles: ['admin','professeur'] },
    { id: 'rendez-vous', icon: 'handshake', label: 'Rendez-vous', roles: ['admin','professeur','parent'] },
    { id: 'messages', icon: 'comment-dots', label: 'Messagerie', roles: ['admin','secretariat','professeur','parent','eleve'] },
    { id: 'notifications', icon: 'bell', label: 'Notifications', roles: ['admin','secretariat','professeur','parent','eleve'] },
    { id: 'bulletins', icon: 'file-alt', label: 'Bulletins', roles: ['admin','secretariat','professeur'], section: 'Pédagogie' },
    { id: 'statistiques', icon: 'chart-bar', label: 'Statistiques', roles: ['admin','secretariat'], section: 'Analyses' },
    { id: 'mon-espace', icon: 'home', label: 'Mon espace', roles: ['parent','eleve'] },
  ];
  let html = ''; let lastSection = '';
  for (const item of all) {
    if (!item.roles.includes(role)) continue;
    if (item.section && item.section !== lastSection) {
      html += `<div class="nav-section">${item.section}</div>`;
      lastSection = item.section;
    }
    html += `<div class="nav-item" id="nav-${item.id}" onclick="navigate('${item.id}')">
      <i class="fas fa-${item.icon}"></i><span>${item.label}</span>
    </div>`;
  }
  return html;
}

function getRoleLabel(r) {
  return { admin: 'Administrateur', secretariat: 'Secrétariat', professeur: 'Professeur', parent: 'Parent', eleve: 'Élève' }[r] || r;
}

function toggleSidebar() {
  const s = $('sidebar'), o = $('sidebar-overlay');
  sidebarOpen = !sidebarOpen;
  s.classList.toggle('open', sidebarOpen);
  o.style.display = sidebarOpen ? 'block' : 'none';
}

function navigate(page, params = {}) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const active = $(`nav-${page}`);
  if (active) active.classList.add('active');
  const titles = {
    dashboard: 'Tableau de bord', eleves: 'Gestion des Élèves', classes: 'Classes',
    notes: 'Notes & Évaluations', absences: 'Présences & Absences', factures: 'Facturation',
    paiements: 'Paiements', cartes: 'Cartes Scolaires', users: 'Utilisateurs',
    parents: 'Parents', transport: 'Transport Scolaire', bibliotheque: 'Bibliothèque Numérique',
    badges: 'Badges de Mérite', 'rendez-vous': 'Rendez-vous', messages: 'Messagerie',
    notifications: 'Notifications', statistiques: 'Statistiques', profil: 'Mon Profil',
    'emploi-du-temps': 'Emploi du temps', devoirs: 'Devoirs', 'cahier-texte': 'Cahier de texte',
    'mon-espace': 'Mon Espace', bulletins: 'Bulletins Scolaires'
  };
  if ($('page-title')) $('page-title').textContent = titles[page] || page;
  if ($('page-breadcrumb')) $('page-breadcrumb').textContent = `Accueil › ${titles[page] || page}`;

  // Destroy existing charts
  Object.values(chartInstances).forEach(c => { try { c.destroy(); } catch(e){} });
  chartInstances = {};

  const pc = $('page-content');
  pc.innerHTML = '<div class="flex justify-center items-center h-64"><span class="loading-spinner"></span></div>';

  const pages = {
    dashboard: renderDashboard, eleves: renderEleves, classes: renderClasses,
    notes: renderNotes, absences: renderAbsences, factures: renderFactures,
    paiements: renderPaiements, cartes: renderCartes, users: renderUsers,
    parents: renderParents, transport: renderTransport, bibliotheque: renderBibliotheque,
    badges: renderBadges, 'rendez-vous': renderRendezVous, messages: renderMessages,
    notifications: renderNotifications, statistiques: renderStatistiques, profil: renderProfil,
    'emploi-du-temps': renderEmploiDuTemps, devoirs: renderDevoirs, 'cahier-texte': renderCahierTexte,
    'mon-espace': renderMonEspace, bulletins: renderBulletins
  };

  if (pages[page]) pages[page](params);
  else pc.innerHTML = `<div class="empty-state"><i class="fas fa-tools"></i><p>Page en construction</p></div>`;

  if (sidebarOpen) toggleSidebar();
}

async function loadNotifCount() {
  try {
    const r = await API.get('/notifications');
    if (r.data.unread_count > 0) {
      notifCount = r.data.unread_count;
      const dot = $('notif-dot');
      if (dot) dot.style.display = 'block';
    }
  } catch(e) {}
}

// ==============================================================
// DASHBOARD
// ==============================================================
async function renderDashboard() {
  const pc = $('page-content');
  const role = currentUser.role;
  if (role === 'parent' || role === 'eleve') { renderMonEspace(); return; }

  try {
    const r = await API.get('/stats/dashboard');
    const d = r.data.data;
    const finance = d.finance || {};
    const abs = d.absences_30j || {};

    pc.innerHTML = `
    <div class="animate-fade">
      <!-- Bienvenue -->
      <div class="card mb-4" style="background:linear-gradient(135deg,#1a6b3c,#0f4a2a);color:white">
        <div class="card-body" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem">
          <div>
            <h2 style="font-size:1.3rem;font-weight:800">Bonjour, ${currentUser.prenom} ! 👋</h2>
            <p style="opacity:.8;font-size:.875rem">Bienvenue dans EduGabon — ${new Date().toLocaleDateString('fr-FR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
          </div>
          <div style="display:flex;gap:.75rem;flex-wrap:wrap">
            <button class="btn btn-secondary btn-sm" onclick="navigate('eleves')"><i class="fas fa-user-plus"></i> Nouvel élève</button>
            <button class="btn btn-sm" style="background:rgba(255,255,255,.15);color:white" onclick="navigate('notes')"><i class="fas fa-star"></i> Saisir notes</button>
          </div>
        </div>
      </div>

      <!-- Stats principales -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" style="background:#e8f5ee"><span style="font-size:1.5rem">👨‍🎓</span></div>
          <div><div class="stat-value">${d.eleves||0}</div><div class="stat-label">Élèves inscrits</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#dbeafe"><span style="font-size:1.5rem">🏫</span></div>
          <div><div class="stat-value">${d.classes||0}</div><div class="stat-label">Classes actives</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#f3e8ff"><span style="font-size:1.5rem">👨‍🏫</span></div>
          <div><div class="stat-value">${d.users_by_role?.professeur||0}</div><div class="stat-label">Professeurs</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background:#fef3c7"><span style="font-size:1.5rem">📊</span></div>
          <div><div class="stat-value">${d.moyenne_generale||'--'}</div><div class="stat-label">Moyenne générale /20</div></div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <!-- Finance -->
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="fas fa-chart-pie text-green-600 mr-2"></i>Finances</span>
            <button class="btn btn-sm btn-outline" onclick="navigate('factures')">Voir tout</button>
          </div>
          <div class="card-body">
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div class="text-center p-3 rounded-lg" style="background:#e8f5ee">
                <div class="text-xl font-bold text-green-700">${fmtMoney(finance.total_encaisse)}</div>
                <div class="text-xs text-gray-500">Encaissé</div>
              </div>
              <div class="text-center p-3 rounded-lg" style="background:#fee2e2">
                <div class="text-xl font-bold text-red-600">${fmtMoney((finance.total_attendu||0)-(finance.total_encaisse||0))}</div>
                <div class="text-xs text-gray-500">Reste à percevoir</div>
              </div>
            </div>
            <div class="mb-2 flex justify-between text-sm">
              <span>Taux de recouvrement</span>
              <span class="font-bold text-green-700">${finance.taux_recouvrement||0}%</span>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width:${finance.taux_recouvrement||0}%"></div></div>
          </div>
        </div>

        <!-- Absences -->
        <div class="card">
          <div class="card-header">
            <span class="card-title"><i class="fas fa-calendar-check text-blue-600 mr-2"></i>Présences (30 jours)</span>
            <button class="btn btn-sm btn-outline" onclick="navigate('absences')">Voir tout</button>
          </div>
          <div class="card-body">
            <div class="grid grid-cols-3 gap-3 mb-4 text-center">
              <div class="p-3 rounded-lg" style="background:#e8f5ee">
                <div class="text-xl font-bold text-green-700">${abs.total||0}</div>
                <div class="text-xs text-gray-500">Total</div>
              </div>
              <div class="p-3 rounded-lg" style="background:#fee2e2">
                <div class="text-xl font-bold text-red-600">${abs.absences||0}</div>
                <div class="text-xs text-gray-500">Absences</div>
              </div>
              <div class="p-3 rounded-lg" style="background:#fef3c7">
                <div class="text-xl font-bold text-yellow-600">${abs.retards||0}</div>
                <div class="text-xs text-gray-500">Retards</div>
              </div>
            </div>
            <div class="chart-wrapper" style="height:120px">
              <canvas id="chart-abs"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Répartition classes + Notes récentes -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="fas fa-chalkboard text-purple-600 mr-2"></i>Répartition par classe</span></div>
          <div class="card-body p-0">
            <div style="max-height:280px;overflow-y:auto">
              <table><thead><tr><th>Classe</th><th>Niveau</th><th>Élèves</th></tr></thead>
              <tbody>${(d.repartition_classes||[]).map(c=>`<tr>
                <td class="font-semibold">${sanitize(c.nom_classe)}</td>
                <td><span class="badge badge-blue">${sanitize(c.niveau)}</span></td>
                <td><span class="font-bold text-green-700">${c.nb_eleves}</span></td>
              </tr>`).join('')}</tbody></table>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="fas fa-star text-yellow-500 mr-2"></i>Notes récentes</span></div>
          <div class="card-body p-0">
            <div style="max-height:280px;overflow-y:auto">
              <table><thead><tr><th>Élève</th><th>Matière</th><th>Note</th></tr></thead>
              <tbody>${(d.notes_recentes||[]).map(n=>`<tr>
                <td class="font-medium">${sanitize(n.prenom_eleve||'')} ${sanitize(n.nom_eleve||'')}</td>
                <td class="text-gray-500 text-xs">${sanitize(n.nom_matiere||'')}</td>
                <td>${fmtNote(n.note)}</td>
              </tr>`).join('')||'<tr><td colspan="3" class="text-center text-gray-400 py-4">Aucune note</td></tr>'}</tbody></table>
            </div>
          </div>
        </div>
      </div>
    </div>`;

    // Chart absences
    const ctx = document.getElementById('chart-abs');
    if (ctx) {
      chartInstances['abs'] = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Absences', 'Retards', 'Présences'],
          datasets: [{ data: [abs.absences||0, abs.retards||0, Math.max(0,(abs.total||0)-(abs.absences||0)-(abs.retards||0))], backgroundColor: ['#ef4444','#f59e0b','#10b981'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 10 } } } } }
      });
    }
  } catch(e) {
    pc.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle text-red-500"></i><p class="text-red-500">Erreur: ${e.message}</p></div>`;
  }
}

// ==============================================================
// ÉLÈVES
// ==============================================================
async function renderEleves(params = {}) {
  const pc = $('page-content');
  try {
    const [elevesR, classesR] = await Promise.all([API.get('/eleves?per_page=100'), API.get('/classes')]);
    const eleves = elevesR.data.data || [];
    const classes = classesR.data.data || [];
    pc.innerHTML = `
    <div class="animate-fade">
      <div class="flex flex-wrap gap-3 mb-4 items-center justify-between">
        <div class="search-bar" style="width:280px">
          <i class="fas fa-search"></i>
          <input class="search-input" id="eleve-search" placeholder="Rechercher un élève..." oninput="filterEleves()">
        </div>
        <div class="flex gap-2 flex-wrap">
          <select class="form-select" id="eleve-classe-filter" style="width:160px" onchange="filterEleves()">
            <option value="">Toutes les classes</option>
            ${classes.map(c=>`<option value="${c.id}">${sanitize(c.nom_classe)}</option>`).join('')}
          </select>
          ${canDo('admin','secretariat') ? `<button class="btn btn-primary" onclick="openEleveForm()"><i class="fas fa-plus"></i> Nouvel élève</button>` : ''}
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-user-graduate mr-2 text-green-700"></i>Liste des élèves <span id="eleve-count" class="badge badge-blue ml-2">${eleves.length}</span></span>
          <div class="flex gap-2">
            <button class="btn btn-sm btn-outline" onclick="exportEleves()"><i class="fas fa-download"></i> Exporter</button>
          </div>
        </div>
        <div class="table-container">
          <table id="eleves-table">
            <thead><tr><th>Matricule</th><th>Élève</th><th>Classe</th><th>Parent</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody id="eleves-tbody">${renderEleveRows(eleves)}</tbody>
          </table>
        </div>
      </div>
    </div>`;
    window._eleves = eleves;
    window._classesAll = classes;
  } catch(e) { pc.innerHTML = errHtml(e); }
}

function renderEleveRows(eleves) {
  if (!eleves.length) return '<tr><td colspan="6" class="text-center py-8 text-gray-400"><i class="fas fa-user-graduate text-4xl mb-2 block opacity-30"></i>Aucun élève</td></tr>';
  return eleves.map(e => `
  <tr>
    <td><span class="font-mono text-xs bg-gray-100 px-2 py-1 rounded">${sanitize(e.matricule)}</span></td>
    <td>
      <div class="flex items-center gap-2">
        <div class="avatar avatar-sm" style="background:${avatarColor(e.nom)}">${avatarLetters(e.nom,e.prenom)}</div>
        <div><div class="font-semibold">${sanitize(e.prenom)} ${sanitize(e.nom)}</div>
        <div class="text-xs text-gray-400">${e.sexe==='F'?'♀':'♂'} ${e.date_naissance?fmtDate(e.date_naissance):''}</div></div>
      </div>
    </td>
    <td>${e.nom_classe ? `<span class="badge badge-blue">${sanitize(e.nom_classe)}</span>` : '<span class="text-gray-400 text-xs">Non affecté</span>'}</td>
    <td class="text-sm text-gray-600">${e.parent_prenom ? sanitize(e.parent_prenom)+' '+sanitize(e.parent_nom||'') : '<span class="text-gray-400">-</span>'}</td>
    <td>${e.actif ? '<span class="badge badge-green">Actif</span>' : '<span class="badge badge-red">Inactif</span>'}</td>
    <td>
      <div class="flex gap-1">
        <button class="btn btn-sm btn-outline btn-icon" title="Voir fiche" onclick="voirEleve('${e.id}')"><i class="fas fa-eye"></i></button>
        <button class="btn btn-sm btn-secondary btn-icon" title="Bulletin" onclick="voirBulletin('${e.id}','${sanitize(e.prenom)} ${sanitize(e.nom)}')"><i class="fas fa-file-alt"></i></button>
        ${canDo('admin','secretariat')?`<button class="btn btn-sm btn-outline btn-icon" title="Modifier" onclick="openEleveForm('${e.id}')"><i class="fas fa-edit"></i></button>`:''}
      </div>
    </td>
  </tr>`).join('');
}

function filterEleves() {
  const q = ($('eleve-search')?.value||'').toLowerCase();
  const cl = $('eleve-classe-filter')?.value||'';
  const filtered = (window._eleves||[]).filter(e =>
    (!q || `${e.nom} ${e.prenom} ${e.matricule}`.toLowerCase().includes(q)) &&
    (!cl || e.classe_id === cl)
  );
  const tb = $('eleves-tbody'); if(tb) tb.innerHTML = renderEleveRows(filtered);
  const cnt = $('eleve-count'); if(cnt) cnt.textContent = filtered.length;
}

async function voirEleve(id) {
  try {
    const [er, nr, ar, fr, br] = await Promise.all([
      API.get(`/eleves/${id}`), API.get(`/notes/eleve/${id}`),
      API.get(`/absences/eleve/${id}`), API.get(`/factures/eleve/${id}`),
      API.get(`/badges/eleve/${id}`)
    ]);
    const e = er.data.data; const notes = nr.data.data||[]; const abs = ar.data.data||[]; const factures = fr.data.data||[]; const badges = br.data.data||[];
    const nbAbs = abs.filter(a=>a.statut==='absent').length;
    const moyG = notes.length ? (notes.reduce((s,n)=>s+n.note*n.coefficient,0)/Math.max(1,notes.reduce((s,n)=>s+n.coefficient,0))).toFixed(2) : '--';
    openModal('Fiche Élève', `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div class="flex gap-3 items-center p-4 rounded-xl" style="background:#e8f5ee">
        <div class="avatar avatar-lg" style="background:${avatarColor(e.nom)};font-size:1.4rem">${avatarLetters(e.nom,e.prenom)}</div>
        <div>
          <div class="font-bold text-xl">${sanitize(e.prenom)} ${sanitize(e.nom)}</div>
          <div class="badge badge-blue mt-1">${sanitize(e.matricule)}</div>
          <div class="text-sm text-gray-500 mt-1">${sanitize(e.nom_classe||'Classe non définie')}</div>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div class="text-center p-3 rounded-lg bg-gray-50">
          <div class="text-lg font-bold text-blue-600">${moyG}</div><div class="text-xs text-gray-500">Moyenne</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-gray-50">
          <div class="text-lg font-bold text-red-500">${nbAbs}</div><div class="text-xs text-gray-500">Absences</div>
        </div>
        <div class="text-center p-3 rounded-lg bg-gray-50">
          <div class="text-lg font-bold text-yellow-600">${badges.length}</div><div class="text-xs text-gray-500">Badges</div>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3 text-sm mb-4">
      ${[['Date naissance',fmtDate(e.date_naissance)],['Sexe',e.sexe==='F'?'Féminin':'Masculin'],['Nationalité',e.nationalite||'-'],['Lieu naissance',e.lieu_naissance||'-'],['Adresse',e.adresse||'-'],['Inscription',e.annee_inscription||'-'],['Parent',e.parent_prenom?`${e.parent_prenom} ${e.parent_nom}`:'Non renseigné'],['Tél parent',e.parent_telephone||'-']].map(([l,v])=>`
      <div class="p-2 rounded-lg bg-gray-50"><span class="text-gray-500 text-xs">${l}</span><div class="font-medium mt-0.5">${sanitize(String(v))}</div></div>`).join('')}
    </div>
    ${badges.length?`<div class="mb-4"><div class="font-bold mb-2">🏅 Badges</div><div class="flex gap-2 flex-wrap">${badges.map(b=>`<span style="background:${b.couleur}22;color:${b.couleur};border:1px solid ${b.couleur}44" class="badge">${b.icone} ${b.nom}</span>`).join('')}</div></div>`:''}
    <div class="flex gap-2 flex-wrap">
      <button class="btn btn-sm btn-primary" onclick="voirBulletin('${id}','${sanitize(e.prenom)} ${sanitize(e.nom)}');closeModal()"><i class="fas fa-file-alt"></i> Bulletin</button>
      <button class="btn btn-sm btn-secondary" onclick="genererCarte('${id}');closeModal()"><i class="fas fa-id-card"></i> Carte scolaire</button>
    </div>`, null, 'modal-lg');
  } catch(err) { toast('Erreur: ' + err.message, 'error'); }
}

async function voirBulletin(id, nom, trimestre = 1) {
  try {
    const r = await API.get(`/bulletins/eleve/${id}?trimestre=${trimestre}&annee_scolaire=2024-2025`);
    const d = r.data.data;
    const matieres = d.matieres || [];
    const couleurMoyenne = d.moyenne_generale >= 14 ? '#1a6b3c' : d.moyenne_generale >= 10 ? '#d97706' : '#dc2626';
    const mentionColor = {'Félicitations':'#1a6b3c','Compliments':'#2563eb','Encouragements':'#7c3aed','Passable':'#d97706','Avertissement':'#dc2626'}[d.mention] || '#6b7280';

    openModal(`📋 Bulletin T${trimestre} — ${nom}`, `
    <div class="bulletin-container">
      <!-- En-tête établissement -->
      <div class="bulletin-header">
        <div style="font-size:2rem;margin-bottom:.3rem">🎓</div>
        <div class="bulletin-school">LYCÉE PRIVÉ GABON</div>
        <div class="bulletin-subtitle">BULLETIN DE NOTES — ${sanitize(d.annee_scolaire)} — TRIMESTRE ${d.trimestre}</div>
      </div>

      <!-- Sélecteur de trimestre -->
      <div class="p-3 border-b flex gap-2 justify-center" style="background:#f8fafc">
        ${[1,2,3].map(t=>`<button onclick="voirBulletin('${id}','${nom.replace(/'/g,"\\'")}',${t})" 
          class="btn btn-sm ${t===trimestre?'btn-primary':'btn-outline'}"
          style="${t===trimestre?'background:#1a6b3c;color:white':''}">
          Trimestre ${t}
        </button>`).join('')}
      </div>

      <!-- Infos élève -->
      <div class="p-4 grid grid-cols-2 gap-3 text-sm border-b" style="background:#f0fdf4">
        <div><span class="text-gray-500">Élève :</span> <strong>${sanitize(d.eleve?.prenom||'')} ${sanitize(d.eleve?.nom||'')}</strong></div>
        <div><span class="text-gray-500">Matricule :</span> <span class="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">${sanitize(d.eleve?.matricule||'')}</span></div>
        <div><span class="text-gray-500">Classe :</span> <strong>${sanitize(d.eleve?.classe||'')}</strong></div>
        <div><span class="text-gray-500">Filière :</span> <strong>${sanitize(d.eleve?.filiere||'-')}</strong></div>
        <div><span class="text-gray-500">Prof. principal :</span> ${sanitize(d.professeur_principal||'-')}</div>
        <div><span class="text-gray-500">Année :</span> ${sanitize(d.annee_scolaire)}</div>
      </div>

      <!-- Tableau des matières -->
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Matière</th>
              <th class="text-center">Coef.</th>
              <th class="text-center">Notes</th>
              <th class="text-center">Moyenne</th>
              <th>Appréciation</th>
              <th>Professeur</th>
            </tr>
          </thead>
          <tbody>
            ${matieres.map(m => {
              const moy = m.moyenne;
              const couleur = moy === null ? '#6b7280' : moy >= 14 ? '#1a6b3c' : moy >= 10 ? '#d97706' : '#dc2626';
              const notesStr = (m.notes||[]).map(n => `${n.note}(${n.type.charAt(0).toUpperCase()})`).join(', ') || '-';
              return `<tr>
                <td class="font-medium">${sanitize(m.nom_matiere)}</td>
                <td class="text-center"><span class="badge badge-blue">${m.coefficient}</span></td>
                <td class="text-xs text-gray-500 max-w-xs" style="white-space:normal">${notesStr}</td>
                <td class="text-center"><strong style="color:${couleur};font-size:1rem">${moy !== null ? Number(moy).toFixed(2) : '-'}/20</strong></td>
                <td class="text-sm" style="color:${couleur}">${sanitize(m.appreciation||'')}</td>
                <td class="text-xs text-gray-400">${sanitize(m.professeur||'-')}</td>
              </tr>`;
            }).join('') || '<tr><td colspan="6" class="text-center py-6 text-gray-400"><i class="fas fa-info-circle mr-2"></i>Aucune note saisie pour ce trimestre</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Pied de bulletin -->
      <div class="p-4 border-t" style="background:#f8fafc">
        <div class="grid grid-cols-3 gap-4 text-center mb-3">
          <div class="p-3 rounded-xl" style="background:white;border:2px solid ${couleurMoyenne}">
            <div style="font-size:1.8rem;font-weight:800;color:${couleurMoyenne}">${Number(d.moyenne_generale||0).toFixed(2)}/20</div>
            <div class="text-xs text-gray-500 mt-1">Moyenne générale</div>
          </div>
          <div class="p-3 rounded-xl" style="background:white;border:2px solid ${mentionColor}">
            <div style="font-size:1rem;font-weight:700;color:${mentionColor}">${sanitize(d.mention||'')}</div>
            <div class="text-xs text-gray-500 mt-1">Mention</div>
          </div>
          <div class="p-3 rounded-xl" style="background:white;border:1px solid #e5e7eb">
            <div class="text-sm font-bold text-red-600">${d.absences?.injustifiees||0} abs.</div>
            <div class="text-xs text-yellow-600">${d.absences?.retards||0} retards</div>
            <div class="text-xs text-gray-500 mt-1">Assiduité</div>
          </div>
        </div>
        <div class="p-3 rounded-lg text-sm italic text-gray-600" style="background:white;border-left:4px solid ${couleurMoyenne}">
          <strong>Appréciation générale :</strong> ${sanitize(d.appreciation||'')}
        </div>
        ${canDo('admin','secretariat') ? `
        <div class="mt-3 flex gap-2 justify-end">
          <button class="btn btn-sm btn-primary" onclick="genererBulletin('${id}','${nom.replace(/'/g,"\\'")}',${trimestre})">
            <i class="fas fa-save"></i> Enregistrer le bulletin
          </button>
        </div>` : ''}
      </div>
    </div>`, null, 'modal-xl');
  } catch(err) { toast('Erreur chargement bulletin: ' + err.message, 'error'); }
}

async function genererBulletin(eleveId, nom, trimestre) {
  try {
    const r = await API.post(`/bulletins/generer/${eleveId}`, { trimestre, annee_scolaire: '2024-2025' });
    if (r.data.success) {
      toast(`✅ ${r.data.message}`, 'success');
      closeModal();
    }
  } catch(err) { toast(err.response?.data?.error || err.message, 'error'); }
}

function openEleveForm(id = null) {
  const classes = window._classesAll || [];
  openModal(id ? 'Modifier l\'élève' : 'Nouvel élève', `
  <form id="eleve-form">
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Prénom <span class="required">*</span></label><input name="prenom" class="form-input" required></div>
      <div class="form-group"><label class="form-label">Nom <span class="required">*</span></label><input name="nom" class="form-input" required></div>
    </div>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Date de naissance</label><input name="date_naissance" type="date" class="form-input"></div>
      <div class="form-group"><label class="form-label">Sexe</label>
        <select name="sexe" class="form-select"><option value="M">Masculin</option><option value="F">Féminin</option></select>
      </div>
    </div>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Classe</label>
        <select name="classe_id" class="form-select"><option value="">-- Choisir --</option>
        ${classes.map(c=>`<option value="${c.id}">${sanitize(c.nom_classe)}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label class="form-label">Nationalité</label><input name="nationalite" class="form-input" value="Gabonaise"></div>
    </div>
    <div class="form-group"><label class="form-label">Lieu de naissance</label><input name="lieu_naissance" class="form-input" placeholder="Libreville, Gabon"></div>
    <div class="form-group"><label class="form-label">Adresse</label><input name="adresse" class="form-input"></div>
    <div class="form-group"><label class="form-label">Info médicale</label><textarea name="info_medicale" class="form-textarea" placeholder="Allergies, conditions particulières..."></textarea></div>
  </form>`,
  async () => {
    const data = Object.fromEntries(new FormData($('eleve-form')));
    try {
      if (id) await API.put(`/eleves/${id}`, data);
      else await API.post('/eleves', data);
      toast(id ? 'Élève mis à jour.' : 'Élève inscrit avec succès !', 'success');
      closeModal(); renderEleves();
    } catch(err) { toast(err.response?.data?.error || err.message, 'error'); }
  });
}

function exportEleves() {
  const eleves = window._eleves || [];
  let csv = 'Matricule,Prénom,Nom,Classe,Sexe,Date naissance\n';
  csv += eleves.map(e => `${e.matricule},"${e.prenom}","${e.nom}","${e.nom_classe||''}",${e.sexe||''},${e.date_naissance||''}`).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'eleves.csv'; a.click();
  toast('Export CSV téléchargé', 'success');
}

// ==============================================================
// CLASSES
// ==============================================================
async function renderClasses() {
  const pc = $('page-content');
  try {
    const [cr, pr] = await Promise.all([API.get('/classes'), API.get('/users/professeurs')]);
    const classes = cr.data.data || [];
    const profs = pr.data.data || [];
    pc.innerHTML = `
    <div class="animate-fade">
      <div class="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div class="flex gap-2 flex-wrap">
          ${['6ème','5ème','4ème','3ème','2nde','1ère','Terminale'].map(n=>`<button class="btn btn-sm btn-outline" onclick="filterClasses('${n}')">${n}</button>`).join('')}
          <button class="btn btn-sm" onclick="filterClasses('')" style="background:#f1f5f9">Tout</button>
        </div>
        ${canDo('admin','secretariat') ? `<button class="btn btn-primary" onclick="openClasseForm()"><i class="fas fa-plus"></i> Nouvelle classe</button>` : ''}
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="classes-grid">
        ${classes.map(c => renderClasseCard(c)).join('')}
      </div>
    </div>`;
    window._classesData = classes;
    window._profsData = profs;
  } catch(e) { pc.innerHTML = errHtml(e); }
}

function renderClasseCard(c) {
  const pct = c.capacite ? Math.round((c.nb_eleves/c.capacite)*100) : 0;
  return `
  <div class="card hover:shadow-lg transition-shadow cursor-pointer" onclick="voirClasse('${c.id}')">
    <div class="card-body">
      <div class="flex justify-between items-start mb-3">
        <div>
          <div class="font-bold text-lg text-gray-800">${sanitize(c.nom_classe)}</div>
          <div class="text-sm text-gray-500">${sanitize(c.filiere||'')}</div>
        </div>
        <span class="badge badge-blue">${sanitize(c.annee_scolaire)}</span>
      </div>
      <div class="flex items-center gap-2 mb-3 text-sm text-gray-600">
        <i class="fas fa-chalkboard-teacher text-green-600"></i>
        <span>${c.prof_prenom ? sanitize(c.prof_prenom)+' '+sanitize(c.prof_nom||'') : 'Prof. non défini'}</span>
      </div>
      <div class="flex justify-between text-sm mb-2">
        <span class="font-medium text-gray-700"><i class="fas fa-users mr-1 text-blue-500"></i>${c.nb_eleves} élève(s)</span>
        <span class="text-gray-400">/ ${c.capacite||30}</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${pct>90?'#ef4444':pct>70?'#f59e0b':'#10b981'}"></div></div>
      <div class="mt-3 flex gap-2">
        <button class="btn btn-sm btn-outline flex-1" onclick="event.stopPropagation();voirClasse('${c.id}')"><i class="fas fa-eye"></i> Voir</button>
        ${canDo('admin','secretariat')?`<button class="btn btn-sm btn-primary flex-1" onclick="event.stopPropagation();openClasseForm('${c.id}')"><i class="fas fa-edit"></i></button>`:''}
      </div>
    </div>
  </div>`;
}

function filterClasses(niveau) {
  const all = window._classesData || [];
  const filtered = niveau ? all.filter(c => c.niveau === niveau || c.niveau.startsWith(niveau)) : all;
  const grid = $('classes-grid'); if(grid) grid.innerHTML = filtered.map(renderClasseCard).join('');
}

async function voirClasse(id) {
  try {
    const r = await API.get(`/classes/${id}`);
    const d = r.data.data;
    openModal(`Classe — ${d.nom_classe}`, `
    <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
      ${[['Niveau',d.niveau],['Filière',d.filiere||'-'],['Année',d.annee_scolaire],['Capacité',d.capacite]].map(([l,v])=>`
      <div class="p-3 rounded-lg bg-gray-50"><div class="text-gray-500 text-xs">${l}</div><div class="font-bold">${sanitize(String(v))}</div></div>`).join('')}
    </div>
    <div class="mb-4">
      <div class="font-bold mb-2"><i class="fas fa-chalkboard-teacher text-green-600 mr-2"></i>Prof. principal: ${d.prof_prenom?sanitize(d.prof_prenom)+' '+sanitize(d.prof_nom||''):'Non défini'}</div>
    </div>
    <div class="tabs mb-3">
      <div class="tab active" onclick="switchTab(this,'tab-eleves-cls','tab-matieres-cls')">👨‍🎓 Élèves (${(d.eleves||[]).length})</div>
      <div class="tab" onclick="switchTab(this,'tab-matieres-cls','tab-eleves-cls')">📚 Matières (${(d.matieres||[]).length})</div>
    </div>
    <div id="tab-eleves-cls">
      ${(d.eleves||[]).length ? `<div class="table-container"><table><thead><tr><th>Matricule</th><th>Élève</th><th>Sexe</th></tr></thead>
      <tbody>${(d.eleves||[]).map(e=>`<tr><td class="font-mono text-xs">${sanitize(e.matricule)}</td><td class="font-medium">${sanitize(e.prenom)} ${sanitize(e.nom)}</td><td>${e.sexe==='F'?'♀ F':'♂ M'}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><i class="fas fa-user-graduate"></i><p>Aucun élève affecté</p></div>'}
    </div>
    <div id="tab-matieres-cls" style="display:none">
      ${(d.matieres||[]).length ? `<div class="table-container"><table><thead><tr><th>Matière</th><th>Coef.</th><th>Professeur</th></tr></thead>
      <tbody>${(d.matieres||[]).map(m=>`<tr><td class="font-medium">${sanitize(m.nom_matiere)}</td><td class="text-center font-bold text-blue-600">${m.coefficient}</td><td class="text-sm text-gray-600">${m.prof_prenom?sanitize(m.prof_prenom)+' '+sanitize(m.prof_nom||''):'Non défini'}</td></tr>`).join('')}</tbody></table></div>` : '<div class="empty-state"><i class="fas fa-book"></i><p>Aucune matière définie</p></div>'}
    </div>`, null, 'modal-lg');
  } catch(err) { toast('Erreur: ' + err.message, 'error'); }
}

function openClasseForm(id = null) {
  const profs = window._profsData || [];
  openModal(id ? 'Modifier la classe' : 'Nouvelle classe', `
  <form id="classe-form">
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Nom de la classe <span class="required">*</span></label><input name="nom_classe" class="form-input" placeholder="Ex: Tle C" required></div>
      <div class="form-group"><label class="form-label">Niveau <span class="required">*</span></label>
        <select name="niveau" class="form-select" required>
          <option value="">-- Choisir --</option>
          ${['6ème','5ème','4ème','3ème','2nde','1ère','Terminale'].map(n=>`<option value="${n}">${n}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Filière</label>
        <select name="filiere" class="form-select">
          <option value="Général">Général</option>
          <option value="Série A">Série A (Littéraire)</option>
          <option value="Série C">Série C (Scientifique)</option>
          <option value="Série D">Série D (Sciences Nat.)</option>
          <option value="Série G">Série G (Gestion)</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Année scolaire</label>
        <select name="annee_scolaire" class="form-select">
          <option value="2024-2025">2024-2025</option>
          <option value="2025-2026">2025-2026</option>
        </select>
      </div>
    </div>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Prof. principal</label>
        <select name="professeur_principal_id" class="form-select"><option value="">-- Choisir --</option>
        ${profs.map(p=>`<option value="${p.id}">${sanitize(p.prenom)} ${sanitize(p.nom)}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label class="form-label">Capacité</label><input name="capacite" type="number" class="form-input" value="30" min="1" max="60"></div>
    </div>
  </form>`,
  async () => {
    const data = Object.fromEntries(new FormData($('classe-form')));
    try {
      if (id) await API.put(`/classes/${id}`, data);
      else await API.post('/classes', data);
      toast(id ? 'Classe mise à jour.' : 'Classe créée !', 'success');
      closeModal(); renderClasses();
    } catch(err) { toast(err.response?.data?.error || err.message, 'error'); }
  });
}

// ==============================================================
// NOTES
// ==============================================================
async function renderNotes() {
  const pc = $('page-content');
  try {
    const [nr, cr] = await Promise.all([API.get('/notes?per_page=80'), API.get('/classes')]);
    const notes = nr.data.data || [];
    const classes = cr.data.data || [];
    pc.innerHTML = `
    <div class="animate-fade">
      <div class="flex flex-wrap gap-3 mb-4 items-center justify-between">
        <div class="flex gap-2 flex-wrap">
          <select class="form-select" id="notes-classe" style="width:160px" onchange="loadNotesByClasse()">
            <option value="">Toutes les classes</option>
            ${classes.map(c=>`<option value="${c.id}">${sanitize(c.nom_classe)}</option>`).join('')}
          </select>
          <select class="form-select" id="notes-trimestre" style="width:140px" onchange="loadNotesByClasse()">
            <option value="">Tous trimestres</option>
            <option value="1">1er Trimestre</option><option value="2">2ème Trimestre</option><option value="3">3ème Trimestre</option>
          </select>
        </div>
        ${canDo('admin','secretariat','professeur') ? `<button class="btn btn-primary" onclick="openNoteForm()"><i class="fas fa-plus"></i> Saisir des notes</button>` : ''}
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title"><i class="fas fa-star mr-2 text-yellow-500"></i>Notes & Évaluations <span class="badge badge-blue ml-2">${notes.length}</span></span></div>
        <div class="table-container">
          <table><thead><tr><th>Élève</th><th>Classe</th><th>Matière</th><th>Type</th><th>Note</th><th>Coef.</th><th>Date</th><th>Trim.</th></tr></thead>
          <tbody id="notes-tbody">${renderNoteRows(notes)}</tbody></table>
        </div>
      </div>
    </div>`;
    window._classesAll = classes;
    window._notesData = notes;
  } catch(e) { pc.innerHTML = errHtml(e); }
}

function renderNoteRows(notes) {
  if (!notes.length) return '<tr><td colspan="8" class="text-center py-8 text-gray-400">Aucune note</td></tr>';
  return notes.map(n => `<tr>
    <td class="font-medium">${sanitize(n.eleve_prenom||'')} ${sanitize(n.eleve_nom||'')}</td>
    <td><span class="badge badge-blue text-xs">${sanitize(n.nom_matiere||'')}</span></td>
    <td class="text-gray-500 text-xs">${sanitize(n.nom_matiere||'')}</td>
    <td><span class="badge badge-gray">${sanitize(n.type_evaluation||'')}</span></td>
    <td class="font-bold">${fmtNote(n.note)}</td>
    <td class="text-center text-gray-500">${n.coefficient||1}</td>
    <td class="text-sm text-gray-500">${fmtDate(n.date)}</td>
    <td class="text-center">${n.trimestre||'-'}</td>
  </tr>`).join('');
}

async function loadNotesByClasse() {
  const cl = $('notes-classe')?.value;
  const tr = $('notes-trimestre')?.value;
  try {
    const params = new URLSearchParams();
    if (cl) params.set('classe_id', cl);
    if (tr) params.set('trimestre', tr);
    const r = await API.get('/notes?' + params);
    const tb = $('notes-tbody'); if(tb) tb.innerHTML = renderNoteRows(r.data.data||[]);
  } catch(e) { toast('Erreur chargement notes', 'error'); }
}

async function openNoteForm() {
  const [cr] = await Promise.all([API.get('/classes')]);
  const classes = cr.data.data || [];
  openModal('Saisir des notes', `
  <form id="note-form">
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Classe <span class="required">*</span></label>
        <select name="classe_id" class="form-select" required onchange="loadMatieresPourNotes(this.value)">
          <option value="">-- Choisir --</option>${classes.map(c=>`<option value="${c.id}">${sanitize(c.nom_classe)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Matière <span class="required">*</span></label>
        <select name="matiere_id" id="note-matiere" class="form-select" required><option value="">-- Choisir d'abord la classe --</option></select>
      </div>
    </div>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Type d'évaluation</label>
        <select name="type_evaluation" class="form-select">
          <option value="devoir">Devoir</option><option value="interrogation">Interrogation</option>
          <option value="examen">Examen</option><option value="controle">Contrôle</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Trimestre</label>
        <select name="trimestre" class="form-select"><option value="1">1er</option><option value="2">2ème</option><option value="3">3ème</option></select>
      </div>
    </div>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Date</label><input name="date" type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}"></div>
      <div class="form-group"><label class="form-label">Libellé</label><input name="libelle" class="form-input" placeholder="Ex: Devoir n°1"></div>
    </div>
    <div class="form-group"><label class="form-label">Élève <span class="required">*</span></label>
      <select name="eleve_id" id="note-eleve" class="form-select" required><option value="">-- Choisir d'abord la classe --</option></select>
    </div>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Note (sur 20) <span class="required">*</span></label><input name="note" type="number" step="0.5" min="0" max="20" class="form-input" required></div>
      <div class="form-group"><label class="form-label">Coefficient</label><input name="coefficient" type="number" step="0.5" min="1" max="10" class="form-input" value="1"></div>
    </div>
  </form>`,
  async () => {
    const data = Object.fromEntries(new FormData($('note-form')));
    delete data.classe_id;
    try {
      await API.post('/notes', [data]);
      toast('Note saisie avec succès !', 'success');
      closeModal(); renderNotes();
    } catch(err) { toast(err.response?.data?.error || err.message, 'error'); }
  });
}

async function loadMatieresPourNotes(classeId) {
  if (!classeId) return;
  const [mr, er] = await Promise.all([API.get(`/matieres?classe_id=${classeId}`), API.get(`/eleves?classe_id=${classeId}&per_page=100`)]);
  const ms = mr.data.data||[]; const es = er.data.data||[];
  const sm = $('note-matiere'); if(sm) sm.innerHTML = ms.map(m=>`<option value="${m.id}">${sanitize(m.nom_matiere)} (coef ${m.coefficient})</option>`).join('');
  const se = $('note-eleve'); if(se) se.innerHTML = es.map(e=>`<option value="${e.id}">${sanitize(e.prenom)} ${sanitize(e.nom)}</option>`).join('');
}

// ==============================================================
// ABSENCES
// ==============================================================
async function renderAbsences() {
  const pc = $('page-content');
  try {
    const [ar, cr] = await Promise.all([API.get('/absences?per_page=100'), API.get('/classes')]);
    const absences = ar.data.data || [];
    const classes = cr.data.data || [];
    pc.innerHTML = `
    <div class="animate-fade">
      <div class="flex flex-wrap gap-3 mb-4 items-center justify-between">
        <div class="flex gap-2 flex-wrap items-center">
          <input type="date" id="abs-date" class="form-input" style="width:160px" value="${new Date().toISOString().split('T')[0]}" onchange="loadAbsences()">
          <select class="form-select" id="abs-classe" style="width:160px" onchange="loadAbsences()">
            <option value="">Toutes classes</option>
            ${classes.map(c=>`<option value="${c.id}">${sanitize(c.nom_classe)}</option>`).join('')}
          </select>
          <select class="form-select" id="abs-statut" style="width:140px" onchange="loadAbsences()">
            <option value="">Tous statuts</option>
            <option value="absent">Absent</option><option value="retard">Retard</option>
            <option value="present">Présent</option><option value="justifie">Justifié</option>
          </select>
        </div>
        ${canDo('admin','secretariat','professeur') ? `<button class="btn btn-primary" onclick="openAbsenceForm()"><i class="fas fa-plus"></i> Marquer présences</button>` : ''}
      </div>
      <div class="stats-grid mb-4">
        ${['absent','retard','justifie','present'].map(s=>{ const cnt=absences.filter(a=>a.statut===s).length; const colors={absent:'#fee2e2,#dc2626',retard:'#fef3c7,#d97706',justifie:'#dbeafe,#2563eb',present:'#dcfce7,#16a34a'}[s].split(','); const icons={absent:'times-circle',retard:'clock',justifie:'check-circle',present:'user-check'}[s]; return `<div class="stat-card"><div class="stat-icon" style="background:${colors[0]}"><i class="fas fa-${icons}" style="color:${colors[1]};font-size:1.3rem"></i></div><div><div class="stat-value" style="color:${colors[1]}">${cnt}</div><div class="stat-label">${{absent:'Absences',retard:'Retards',justifie:'Justifiés',present:'Présents'}[s]}</div></div></div>`;}).join('')}
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title"><i class="fas fa-calendar-check mr-2 text-blue-600"></i>Registre des présences</span></div>
        <div class="table-container">
          <table><thead><tr><th>Élève</th><th>Classe</th><th>Matière</th><th>Date</th><th>Statut</th><th>Motif</th><th>Actions</th></tr></thead>
          <tbody id="abs-tbody">${renderAbsRows(absences)}</tbody></table>
        </div>
      </div>
    </div>`;
    window._classesAll = classes;
  } catch(e) { pc.innerHTML = errHtml(e); }
}

function renderAbsRows(abs) {
  if (!abs.length) return '<tr><td colspan="7" class="text-center py-8 text-gray-400">Aucune donnée</td></tr>';
  return abs.map(a => `<tr>
    <td class="font-medium">${sanitize(a.eleve_prenom||'')} ${sanitize(a.eleve_nom||'')}</td>
    <td><span class="badge badge-blue text-xs">${sanitize(a.nom_classe||'')}</span></td>
    <td class="text-xs text-gray-500">${sanitize(a.nom_matiere||'-')}</td>
    <td class="text-sm">${fmtDate(a.date)}</td>
    <td>${badgeStatut(a.statut)}</td>
    <td class="text-xs text-gray-500 max-w-xs truncate">${sanitize(a.motif||'-')}</td>
    <td>
      ${canDo('admin','secretariat','professeur')?`<button class="btn btn-sm btn-outline btn-icon" onclick="justifierAbsence('${a.id}')"><i class="fas fa-check"></i></button>`:''}
    </td>
  </tr>`).join('');
}

async function loadAbsences() {
  const date = $('abs-date')?.value;
  const cl = $('abs-classe')?.value;
  const st = $('abs-statut')?.value;
  try {
    const p = new URLSearchParams();
    if (date) p.set('date', date);
    if (cl) p.set('classe_id', cl);
    if (st) p.set('statut', st);
    const r = await API.get('/absences?' + p);
    const tb = $('abs-tbody'); if(tb) tb.innerHTML = renderAbsRows(r.data.data||[]);
  } catch(e) {}
}

async function justifierAbsence(id) {
  try {
    await API.put(`/absences/${id}`, { statut: 'justifie', motif: 'Justifié par administration' });
    toast('Absence justifiée', 'success'); loadAbsences();
  } catch(e) { toast('Erreur', 'error'); }
}

function openAbsenceForm() {
  const classes = window._classesAll || [];
  openModal('Enregistrer présence/absence', `
  <form id="abs-form">
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Classe <span class="required">*</span></label>
        <select name="classe_id" class="form-select" required onchange="loadElevesAbsence(this.value)">
          <option value="">-- Choisir --</option>${classes.map(c=>`<option value="${c.id}">${sanitize(c.nom_classe)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Date</label><input name="date" type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}" required></div>
    </div>
    <div class="form-group"><label class="form-label">Élève <span class="required">*</span></label>
      <select name="eleve_id" id="abs-eleve-sel" class="form-select" required><option value="">-- Choisir la classe d'abord --</option></select>
    </div>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Statut</label>
        <select name="statut" class="form-select">
          <option value="absent">Absent</option><option value="retard">Retard</option>
          <option value="present">Présent</option><option value="justifie">Justifié</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Heure début</label><input name="heure_debut" type="time" class="form-input"></div>
    </div>
    <div class="form-group"><label class="form-label">Motif</label><textarea name="motif" class="form-textarea" placeholder="Motif de l'absence..."></textarea></div>
  </form>`,
  async () => {
    const data = Object.fromEntries(new FormData($('abs-form')));
    delete data.classe_id;
    try {
      await API.post('/absences', [data]);
      toast('Présence enregistrée !', 'success'); closeModal(); renderAbsences();
    } catch(err) { toast(err.response?.data?.error || err.message, 'error'); }
  });
}

async function loadElevesAbsence(classeId) {
  if (!classeId) return;
  const r = await API.get(`/eleves?classe_id=${classeId}&per_page=100`);
  const sel = $('abs-eleve-sel'); if(sel) sel.innerHTML = (r.data.data||[]).map(e=>`<option value="${e.id}">${sanitize(e.prenom)} ${sanitize(e.nom)}</option>`).join('');
}

// ==============================================================
// FACTURATION
// ==============================================================
async function renderFactures() {
  const pc = $('page-content');
  try {
    const r = await API.get('/factures');
    const factures = r.data.data || [];
    const stats = r.data.stats || {};
    pc.innerHTML = `
    <div class="animate-fade">
      <div class="stats-grid mb-4">
        <div class="stat-card"><div class="stat-icon" style="background:#e8f5ee"><i class="fas fa-check-circle" style="color:#16a34a;font-size:1.3rem"></i></div><div><div class="stat-value text-green-700">${stats.nb_paye||0}</div><div class="stat-label">Payées</div></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#fef3c7"><i class="fas fa-clock" style="color:#d97706;font-size:1.3rem"></i></div><div><div class="stat-value text-yellow-600">${stats.nb_partiel||0}</div><div class="stat-label">Partielles</div></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#fee2e2"><i class="fas fa-times-circle" style="color:#dc2626;font-size:1.3rem"></i></div><div><div class="stat-value text-red-600">${stats.nb_impaye||0}</div><div class="stat-label">Impayées</div></div></div>
        <div class="stat-card"><div class="stat-icon" style="background:#dbeafe"><i class="fas fa-coins" style="color:#2563eb;font-size:1.3rem"></i></div><div><div class="stat-value text-blue-700" style="font-size:1rem">${fmtMoney(stats.total_paye)}</div><div class="stat-label">Total encaissé</div></div></div>
      </div>
      <div class="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div class="flex gap-2 flex-wrap">
          <select class="form-select" id="fact-statut" style="width:140px" onchange="filterFactures()">
            <option value="">Tous statuts</option><option value="impaye">Impayé</option><option value="partiel">Partiel</option><option value="paye">Payé</option>
          </select>
          <select class="form-select" id="fact-type" style="width:150px" onchange="filterFactures()">
            <option value="">Tous types</option><option value="scolarite">Scolarité</option><option value="inscription">Inscription</option><option value="cantine">Cantine</option><option value="transport">Transport</option>
          </select>
        </div>
        ${canDo('admin','secretariat') ? `<button class="btn btn-primary" onclick="openFactureForm()"><i class="fas fa-plus"></i> Nouvelle facture</button>` : ''}
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title"><i class="fas fa-file-invoice-dollar mr-2 text-blue-600"></i>Factures <span class="badge badge-blue ml-2">${factures.length}</span></span></div>
        <div class="table-container">
          <table><thead><tr><th>Élève</th><th>Classe</th><th>Libellé</th><th>Montant</th><th>Payé</th><th>Statut</th><th>Échéance</th><th>Actions</th></tr></thead>
          <tbody id="fact-tbody">${renderFactureRows(factures)}</tbody></table>
        </div>
      </div>
    </div>`;
    window._facturesData = factures;
  } catch(e) { pc.innerHTML = errHtml(e); }
}

function renderFactureRows(factures) {
  if (!factures.length) return '<tr><td colspan="8" class="text-center py-8 text-gray-400">Aucune facture</td></tr>';
  return factures.map(f => `<tr>
    <td class="font-medium">${sanitize(f.eleve_prenom||'')} ${sanitize(f.eleve_nom||'')}</td>
    <td><span class="badge badge-blue text-xs">${sanitize(f.nom_classe||'')}</span></td>
    <td class="max-w-xs truncate">${sanitize(f.libelle)}</td>
    <td class="font-semibold">${fmtMoney(f.montant)}</td>
    <td class="text-green-700">${fmtMoney(f.montant_paye)}</td>
    <td>${badgeStatut(f.statut)}</td>
    <td class="text-sm ${f.date_limite && new Date(f.date_limite)<new Date() && f.statut!=='paye'?'text-red-500 font-bold':'text-gray-500'}">${f.date_limite?fmtDate(f.date_limite):'-'}</td>
    <td>
      <div class="flex gap-1">
        ${canDo('admin','secretariat')?`<button class="btn btn-sm btn-primary btn-icon" title="Enregistrer paiement" onclick="openPaiementForm('${f.id}',${f.montant},${f.montant_paye})"><i class="fas fa-money-bill"></i></button>`:''}
        <button class="btn btn-sm btn-outline btn-icon" title="Voir détail" onclick="voirFacture('${f.id}')"><i class="fas fa-eye"></i></button>
      </div>
    </td>
  </tr>`).join('');
}

function filterFactures() {
  const st = $('fact-statut')?.value;
  const tp = $('fact-type')?.value;
  const filtered = (window._facturesData||[]).filter(f => (!st||f.statut===st) && (!tp||f.type_frais===tp));
  const tb = $('fact-tbody'); if(tb) tb.innerHTML = renderFactureRows(filtered);
}

async function openFactureForm() {
  const r = await API.get('/eleves?per_page=200');
  const eleves = r.data.data || [];
  openModal('Nouvelle facture', `
  <form id="fact-form">
    <div class="form-group"><label class="form-label">Élève <span class="required">*</span></label>
      <select name="eleve_id" class="form-select" required>
        <option value="">-- Choisir --</option>${eleves.map(e=>`<option value="${e.id}">${sanitize(e.prenom)} ${sanitize(e.nom)} — ${sanitize(e.matricule)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Libellé <span class="required">*</span></label><input name="libelle" class="form-input" placeholder="Ex: Frais de scolarité T1" required></div>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Montant (FCFA) <span class="required">*</span></label><input name="montant" type="number" class="form-input" required placeholder="150000"></div>
      <div class="form-group"><label class="form-label">Type</label>
        <select name="type_frais" class="form-select">
          <option value="scolarite">Scolarité</option><option value="inscription">Inscription</option>
          <option value="cantine">Cantine</option><option value="transport">Transport</option><option value="autres">Autres</option>
        </select>
      </div>
    </div>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Date limite paiement</label><input name="date_limite" type="date" class="form-input"></div>
      <div class="form-group"><label class="form-label">Année scolaire</label>
        <select name="annee_scolaire" class="form-select"><option value="2024-2025">2024-2025</option></select>
      </div>
    </div>
  </form>`,
  async () => {
    const data = Object.fromEntries(new FormData($('fact-form')));
    try {
      await API.post('/factures', data);
      toast('Facture créée et notification envoyée !', 'success'); closeModal(); renderFactures();
    } catch(err) { toast(err.response?.data?.error || err.message, 'error'); }
  });
}

function openPaiementForm(factureId, montantTotal, montantPaye) {
  const reste = montantTotal - montantPaye;
  openModal('Enregistrer un paiement', `
  <div class="p-4 rounded-xl mb-4" style="background:#e8f5ee">
    <div class="text-sm text-gray-600">Reste à payer :</div>
    <div class="text-2xl font-bold text-green-700">${fmtMoney(reste)}</div>
  </div>
  <form id="paie-form">
    <div class="form-group"><label class="form-label">Montant reçu (FCFA) <span class="required">*</span></label>
      <input name="montant" type="number" class="form-input" value="${reste}" max="${reste}" required></div>
    <div class="form-group"><label class="form-label">Mode de paiement</label>
      <select name="mode_paiement" class="form-select">
        <option value="especes">Espèces</option><option value="mobile_money">Mobile Money (Airtel/Moov)</option>
        <option value="virement">Virement bancaire</option><option value="cheque">Chèque</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">Référence</label><input name="reference" class="form-input" placeholder="N° reçu, référence..."></div>
  </form>`,
  async () => {
    const data = Object.fromEntries(new FormData($('paie-form')));
    data.facture_id = factureId;
    try {
      await API.post('/paiements', data);
      toast('Paiement enregistré !', 'success'); closeModal(); renderFactures();
    } catch(err) { toast(err.response?.data?.error || err.message, 'error'); }
  });
}

async function voirFacture(id) {
  const r = await API.get(`/factures/${id}`);
  const f = r.data.data;
  openModal(`Facture — ${f.libelle}`, `
  <div class="grid grid-cols-2 gap-3 mb-4 text-sm">
    ${[['Élève',`${f.eleve_prenom} ${f.eleve_nom}`],['Matricule',f.matricule],['Montant',fmtMoney(f.montant)],['Payé',fmtMoney(f.montant_paye)],['Reste',fmtMoney(f.montant-f.montant_paye)],['Statut',f.statut],['Émission',fmtDate(f.date_emission)],['Échéance',f.date_limite?fmtDate(f.date_limite):'-']].map(([l,v])=>`
    <div class="p-3 rounded-lg bg-gray-50"><div class="text-gray-400 text-xs">${l}</div><div class="font-semibold mt-0.5">${sanitize(String(v))}</div></div>`).join('')}
  </div>
  <div class="font-bold mb-2">Historique paiements</div>
  ${(f.paiements||[]).length ? `<table class="w-full text-sm"><thead><tr class="text-left text-xs text-gray-400"><th class="pb-2">Date</th><th>Montant</th><th>Mode</th><th>Réf.</th></tr></thead>
  <tbody>${(f.paiements||[]).map(p=>`<tr class="border-t"><td class="py-2">${fmtDate(p.date_paiement)}</td><td class="font-semibold text-green-700">${fmtMoney(p.montant)}</td><td>${sanitize(p.mode_paiement||'')}</td><td class="text-gray-400 text-xs">${sanitize(p.reference||'')}</td></tr>`).join('')}</tbody></table>` : '<p class="text-gray-400 text-sm">Aucun paiement enregistré</p>'}`);
}

// ==============================================================
// PAIEMENTS
// ==============================================================
async function renderPaiements() {
  const pc = $('page-content');
  try {
    const r = await API.get('/paiements');
    const paiements = r.data.data || [];
    pc.innerHTML = `
    <div class="animate-fade">
      <div class="flex gap-3 mb-4 flex-wrap items-center justify-between">
        <div class="flex gap-2">
          <input type="date" id="paie-debut" class="form-input" style="width:155px" onchange="loadPaiements()">
          <input type="date" id="paie-fin" class="form-input" style="width:155px" onchange="loadPaiements()">
        </div>
        <div class="card px-4 py-2 text-sm font-bold text-green-700">
          Total : ${fmtMoney(paiements.reduce((s,p)=>s+p.montant,0))}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title"><i class="fas fa-money-bill-wave mr-2 text-green-600"></i>Paiements enregistrés <span class="badge badge-blue ml-2">${paiements.length}</span></span></div>
        <div class="table-container">
          <table><thead><tr><th>Élève</th><th>Facture</th><th>Montant</th><th>Mode</th><th>Date</th><th>Référence</th></tr></thead>
          <tbody id="paie-tbody">${renderPaieRows(paiements)}</tbody></table>
        </div>
      </div>
    </div>`;
    window._paiementsData = paiements;
  } catch(e) { pc.innerHTML = errHtml(e); }
}

function renderPaieRows(paiements) {
  if (!paiements.length) return '<tr><td colspan="6" class="text-center py-8 text-gray-400">Aucun paiement</td></tr>';
  return paiements.map(p => `<tr>
    <td class="font-medium">${sanitize(p.eleve_prenom||'')} ${sanitize(p.eleve_nom||'')}</td>
    <td class="text-sm text-gray-600 max-w-xs truncate">${sanitize(p.facture_libelle||'')}</td>
    <td class="font-bold text-green-700">${fmtMoney(p.montant)}</td>
    <td><span class="badge badge-${p.mode_paiement==='especes'?'green':p.mode_paiement==='mobile_money'?'purple':'blue'}">${sanitize(p.mode_paiement||'-')}</span></td>
    <td class="text-sm text-gray-500">${fmtDate(p.date_paiement)}</td>
    <td class="text-xs text-gray-400">${sanitize(p.reference||'-')}</td>
  </tr>`).join('');
}

async function loadPaiements() {
  const debut = $('paie-debut')?.value;
  const fin = $('paie-fin')?.value;
  const p = new URLSearchParams();
  if (debut) p.set('date_debut', debut);
  if (fin) p.set('date_fin', fin);
  const r = await API.get('/paiements?' + p);
  const tb = $('paie-tbody'); if(tb) tb.innerHTML = renderPaieRows(r.data.data||[]);
}

// ==============================================================
// CARTES SCOLAIRES
// ==============================================================
async function renderCartes() {
  const pc = $('page-content');
  pc.innerHTML = `
  <div class="animate-fade">
    <div class="card mb-4">
      <div class="card-header"><span class="card-title"><i class="fas fa-id-card mr-2 text-blue-600"></i>Génération de cartes scolaires</span></div>
      <div class="card-body">
        <div class="flex gap-3 flex-wrap items-end">
          <div class="form-group mb-0" style="flex:1;min-width:200px">
            <label class="form-label">Rechercher un élève</label>
            <input id="carte-search" class="form-input" placeholder="Nom, prénom, matricule..." oninput="searchElevesCarte()">
          </div>
          <div class="form-group mb-0" style="flex:1;min-width:200px">
            <label class="form-label">Année scolaire</label>
            <select id="carte-annee" class="form-select"><option value="2024-2025">2024-2025</option><option value="2025-2026">2025-2026</option></select>
          </div>
        </div>
        <div id="carte-eleve-results" class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3"></div>
      </div>
    </div>
    <div id="carte-preview"></div>
  </div>`;
  searchElevesCarte();
}

async function searchElevesCarte() {
  const q = $('carte-search')?.value || '';
  try {
    const r = await API.get(`/eleves?search=${encodeURIComponent(q)}&per_page=20`);
    const eleves = r.data.data || [];
    const grid = $('carte-eleve-results');
    if (!grid) return;
    grid.innerHTML = eleves.map(e => `
    <div class="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-green-500 transition-colors">
      <div class="flex items-center gap-3">
        <div class="avatar" style="background:${avatarColor(e.nom)}">${avatarLetters(e.nom,e.prenom)}</div>
        <div>
          <div class="font-semibold">${sanitize(e.prenom)} ${sanitize(e.nom)}</div>
          <div class="text-xs text-gray-500">${sanitize(e.matricule)} — ${sanitize(e.nom_classe||'')}</div>
        </div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="genererCarte('${e.id}')"><i class="fas fa-id-card"></i> Générer</button>
    </div>`).join('') || '<p class="text-gray-400 text-sm text-center py-4">Aucun élève trouvé</p>';
  } catch(e) { toast('Erreur', 'error'); }
}

async function genererCarte(eleveId) {
  try {
    const annee = $('carte-annee')?.value || '2024-2025';
    const r = await API.post(`/cartes/generer/${eleveId}`, { annee_scolaire: annee });
    const d = r.data.data;
    const preview = $('carte-preview');
    if (preview) {
      preview.innerHTML = `
      <div class="card">
        <div class="card-header"><span class="card-title">Carte générée — ${sanitize(d.eleve.prenom)} ${sanitize(d.eleve.nom)}</span>
          <button class="btn btn-sm btn-primary" onclick="imprimerCarte()"><i class="fas fa-print"></i> Imprimer</button>
        </div>
        <div class="card-body flex justify-center" id="carte-print-area">
          <div class="carte-scolaire">
            <div class="carte-front">
              <div class="carte-logo">🎓</div>
              <div class="carte-school">LYCÉE PRIVÉ GABON</div>
              <div style="margin:1rem 0 .5rem">
                <div class="carte-name">${sanitize(d.eleve.prenom)} ${sanitize(d.eleve.nom)}</div>
                <div class="carte-class">${sanitize(d.eleve.classe||'')}</div>
                <div class="carte-matricule">Matr. : ${sanitize(d.eleve.matricule)}</div>
              </div>
              <div class="carte-year">📅 ${sanitize(d.annee_scolaire)}</div>
              <div class="carte-qr">${d.qr_code}</div>
            </div>
            <div style="padding:1rem;background:white">
              <div class="text-xs text-gray-500 mb-1">Cette carte est la propriété de l'établissement.</div>
              <div class="text-xs text-gray-500">En cas de perte, contacter le secrétariat.</div>
              <div class="text-xs font-bold text-green-700 mt-2">✅ Valide pour l'année ${sanitize(d.annee_scolaire)}</div>
            </div>
          </div>
        </div>
      </div>`;
    }
    toast('Carte générée avec succès !', 'success');
  } catch(err) { toast(err.response?.data?.error || err.message, 'error'); }
}

function imprimerCarte() {
  const content = $('carte-print-area')?.innerHTML || '';
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Carte scolaire</title><style>body{display:flex;justify-content:center;padding:2rem;font-family:sans-serif}.carte-scolaire{width:340px;border-radius:16px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.2)}.carte-front{background:linear-gradient(135deg,#1a6b3c,#0f4a2a,#f59e0b);color:white;padding:1.25rem;position:relative;min-height:200px}.carte-logo{position:absolute;top:1rem;right:1rem;font-size:2rem;opacity:.3}.carte-school{font-size:.65rem;font-weight:700;letter-spacing:1px;opacity:.9;text-transform:uppercase}.carte-name{font-size:1.1rem;font-weight:800;margin:.5rem 0 .25rem}.carte-class{font-size:.75rem;opacity:.8}.carte-matricule{font-size:.7rem;opacity:.7}.carte-qr{position:absolute;bottom:1rem;right:1rem;width:70px;height:70px;background:white;border-radius:8px;padding:4px}.carte-year{position:absolute;bottom:1rem;left:1rem;background:rgba(255,255,255,.2);padding:.2rem .5rem;border-radius:20px;font-size:.7rem;font-weight:600}</style></head><body>${content}</body></html>`);
  w.print();
}

// ==============================================================
// UTILISATEURS
// ==============================================================
async function renderUsers() {
  const pc = $('page-content');
  try {
    const r = await API.get('/users');
    const users = r.data.data || [];
    pc.innerHTML = `
    <div class="animate-fade">
      <div class="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div class="flex gap-2 flex-wrap">
          ${['admin','secretariat','professeur','parent','eleve'].map(role=>`<button class="btn btn-sm btn-outline" onclick="filterUsers('${role}')">${getRoleLabel(role)}</button>`).join('')}
          <button class="btn btn-sm" onclick="filterUsers('')" style="background:#f1f5f9">Tous</button>
        </div>
        <button class="btn btn-primary" onclick="openUserForm()"><i class="fas fa-user-plus"></i> Nouvel utilisateur</button>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title"><i class="fas fa-users-cog mr-2 text-purple-600"></i>Utilisateurs <span class="badge badge-blue ml-2">${users.length}</span></span></div>
        <div class="table-container">
          <table><thead><tr><th>Utilisateur</th><th>Email</th><th>Rôle</th><th>Téléphone</th><th>Dernière connexion</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody id="users-tbody">${renderUserRows(users)}</tbody></table>
        </div>
      </div>
    </div>`;
    window._usersData = users;
  } catch(e) { pc.innerHTML = errHtml(e); }
}

function renderUserRows(users) {
  if (!users.length) return '<tr><td colspan="7" class="text-center py-8 text-gray-400">Aucun utilisateur</td></tr>';
  const roleColors = { admin: 'purple', secretariat: 'blue', professeur: 'green', parent: 'yellow', eleve: 'gray' };
  return users.map(u => `<tr>
    <td>
      <div class="flex items-center gap-2">
        <div class="avatar avatar-sm" style="background:${avatarColor(u.nom)}">${avatarLetters(u.nom,u.prenom)}</div>
        <div class="font-medium">${sanitize(u.prenom)} ${sanitize(u.nom)}</div>
      </div>
    </td>
    <td class="text-sm text-gray-600">${sanitize(u.email)}</td>
    <td><span class="badge badge-${roleColors[u.role]||'gray'}">${getRoleLabel(u.role)}</span></td>
    <td class="text-sm text-gray-500">${sanitize(u.telephone||'-')}</td>
    <td class="text-xs text-gray-400">${u.derniere_connexion?fmtDate(u.derniere_connexion):'Jamais'}</td>
    <td>${u.actif?'<span class="badge badge-green">Actif</span>':'<span class="badge badge-red">Inactif</span>'}</td>
    <td>
      <div class="flex gap-1">
        <button class="btn btn-sm btn-outline btn-icon" onclick="openUserForm('${u.id}')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-danger btn-icon" onclick="toggleUser('${u.id}',${u.actif})"><i class="fas fa-${u.actif?'ban':'check'}"></i></button>
      </div>
    </td>
  </tr>`).join('');
}

function filterUsers(role) {
  const filtered = (window._usersData||[]).filter(u => !role || u.role === role);
  const tb = $('users-tbody'); if(tb) tb.innerHTML = renderUserRows(filtered);
}

function openUserForm(id = null) {
  openModal(id ? 'Modifier utilisateur' : 'Nouvel utilisateur', `
  <form id="user-form">
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Prénom <span class="required">*</span></label><input name="prenom" class="form-input" required></div>
      <div class="form-group"><label class="form-label">Nom <span class="required">*</span></label><input name="nom" class="form-input" required></div>
    </div>
    <div class="form-group"><label class="form-label">Email <span class="required">*</span></label><input name="email" type="email" class="form-input" required></div>
    ${!id ? `<div class="form-group"><label class="form-label">Mot de passe <span class="required">*</span></label><input name="mot_de_passe" type="password" class="form-input" required placeholder="Minimum 6 caractères"></div>` : ''}
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Rôle <span class="required">*</span></label>
        <select name="role" class="form-select" required>
          <option value="admin">Administrateur</option><option value="secretariat">Secrétariat</option>
          <option value="professeur">Professeur</option><option value="parent">Parent</option><option value="eleve">Élève</option>
        </select>
      </div>
      <div class="form-group"><label class="form-label">Téléphone</label><input name="telephone" class="form-input" placeholder="+241 XX XX XX XX"></div>
    </div>
  </form>`,
  async () => {
    const data = Object.fromEntries(new FormData($('user-form')));
    try {
      if (id) await API.put(`/users/${id}`, data);
      else await API.post('/users', data);
      toast(id ? 'Utilisateur mis à jour.' : 'Utilisateur créé !', 'success'); closeModal(); renderUsers();
    } catch(err) { toast(err.response?.data?.error || err.message, 'error'); }
  });
}

async function toggleUser(id, actif) {
  try {
    await API.put(`/users/${id}`, { actif: actif ? 0 : 1 });
    toast(actif ? 'Utilisateur désactivé.' : 'Utilisateur activé.', 'success'); renderUsers();
  } catch(e) { toast('Erreur', 'error'); }
}

// ==============================================================
// PARENTS
// ==============================================================
async function renderParents() {
  const pc = $('page-content');
  try {
    const r = await API.get('/parents');
    const parents = r.data.data || [];
    pc.innerHTML = `
    <div class="animate-fade">
      <div class="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div class="search-bar" style="width:280px">
          <i class="fas fa-search"></i>
          <input class="search-input" id="parent-search" placeholder="Rechercher un parent..." oninput="filterParents()">
        </div>
        ${canDo('admin','secretariat')?`<button class="btn btn-primary" onclick="openParentForm()"><i class="fas fa-user-plus"></i> Nouveau parent</button>`:''}
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title"><i class="fas fa-users mr-2 text-yellow-600"></i>Parents / Tuteurs <span class="badge badge-blue ml-2">${parents.length}</span></span></div>
        <div class="table-container">
          <table><thead><tr><th>Parent</th><th>Email</th><th>Téléphone</th><th>Profession</th><th>Enfants</th><th>Actions</th></tr></thead>
          <tbody id="parents-tbody">${renderParentRows(parents)}</tbody></table>
        </div>
      </div>
    </div>`;
    window._parentsData = parents;
  } catch(e) { pc.innerHTML = errHtml(e); }
}

function renderParentRows(parents) {
  if (!parents.length) return '<tr><td colspan="6" class="text-center py-8 text-gray-400">Aucun parent</td></tr>';
  return parents.map(p => `<tr>
    <td>
      <div class="flex items-center gap-2">
        <div class="avatar avatar-sm" style="background:${avatarColor(p.nom)}">${avatarLetters(p.nom,p.prenom)}</div>
        <div class="font-medium">${sanitize(p.prenom)} ${sanitize(p.nom)}</div>
      </div>
    </td>
    <td class="text-sm text-gray-600">${sanitize(p.email)}</td>
    <td class="text-sm text-gray-500">${sanitize(p.telephone||'-')}</td>
    <td class="text-sm text-gray-500">${sanitize(p.profession||'-')}</td>
    <td><span class="badge badge-blue">${p.nb_enfants} enfant(s)</span></td>
    <td><button class="btn btn-sm btn-outline" onclick="voirParent('${p.id}')"><i class="fas fa-eye"></i> Voir</button></td>
  </tr>`).join('');
}

function filterParents() {
  const q = ($('parent-search')?.value||'').toLowerCase();
  const filtered = (window._parentsData||[]).filter(p=>`${p.nom} ${p.prenom} ${p.email}`.toLowerCase().includes(q));
  const tb = $('parents-tbody'); if(tb) tb.innerHTML = renderParentRows(filtered);
}

async function voirParent(id) {
  const r = await API.get(`/parents/${id}`);
  const p = r.data.data;
  openModal(`Parent — ${p.prenom} ${p.nom}`, `
  <div class="grid grid-cols-2 gap-3 mb-4 text-sm">
    ${[['Email',p.email],['Téléphone',p.telephone||'-'],['Profession',p.profession||'-'],['Adresse',p.adresse||'-']].map(([l,v])=>`<div class="p-3 rounded-lg bg-gray-50"><div class="text-gray-400 text-xs">${l}</div><div class="font-semibold">${sanitize(String(v))}</div></div>`).join('')}
  </div>
  <div class="font-bold mb-2">👶 Enfants inscrits (${(p.enfants||[]).length})</div>
  ${(p.enfants||[]).map(e=>`<div class="flex items-center justify-between p-3 border rounded-lg mb-2">
    <div class="flex items-center gap-2">
      <div class="avatar avatar-sm" style="background:${avatarColor(e.nom)}">${avatarLetters(e.nom,e.prenom)}</div>
      <div><div class="font-medium">${sanitize(e.prenom)} ${sanitize(e.nom)}</div><div class="text-xs text-gray-400">${sanitize(e.matricule)} — ${sanitize(e.nom_classe||'')}</div></div>
    </div>
    <button class="btn btn-sm btn-outline" onclick="voirEleve('${e.id}');closeModal()"><i class="fas fa-eye"></i></button>
  </div>`).join('') || '<p class="text-gray-400 text-sm">Aucun enfant inscrit</p>'}`);
}

function openParentForm() {
  openModal('Nouveau parent / tuteur', `
  <form id="parent-form">
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Prénom <span class="required">*</span></label><input name="prenom" class="form-input" required></div>
      <div class="form-group"><label class="form-label">Nom <span class="required">*</span></label><input name="nom" class="form-input" required></div>
    </div>
    <div class="form-group"><label class="form-label">Email <span class="required">*</span></label><input name="email" type="email" class="form-input" required></div>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Téléphone</label><input name="telephone" class="form-input" placeholder="+241 XX XX XX XX"></div>
      <div class="form-group"><label class="form-label">Profession</label><input name="profession" class="form-input"></div>
    </div>
    <div class="form-group"><label class="form-label">Adresse</label><input name="adresse" class="form-input"></div>
    <div class="form-group"><label class="form-label">Mot de passe temporaire</label><input name="mot_de_passe" type="password" class="form-input" value="Parent@2024"></div>
  </form>`,
  async () => {
    const data = Object.fromEntries(new FormData($('parent-form')));
    try {
      await API.post('/parents', data);
      toast('Parent créé avec succès !', 'success'); closeModal(); renderParents();
    } catch(err) { toast(err.response?.data?.error || err.message, 'error'); }
  });
}

// ==============================================================
// NOTIFICATIONS
// ==============================================================
async function renderNotifications() {
  const pc = $('page-content');
  try {
    const r = await API.get('/notifications');
    const notifs = r.data.data || [];
    const unread = r.data.unread_count || 0;
    pc.innerHTML = `
    <div class="animate-fade">
      <div class="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div class="text-sm text-gray-500">${unread} non lue(s)</div>
        <div class="flex gap-2">
          ${canDo('admin','secretariat')?`<button class="btn btn-primary btn-sm" onclick="openEnvoyerNotif()"><i class="fas fa-paper-plane"></i> Envoyer</button>`:''}
          <button class="btn btn-outline btn-sm" onclick="marquerToutLu()"><i class="fas fa-check-double"></i> Tout marquer lu</button>
        </div>
      </div>
      <div class="card">
        <div class="card-body p-0">
          <div id="notifs-list">
            ${notifs.length ? notifs.map(n => renderNotifItem(n)).join('') : '<div class="empty-state"><i class="fas fa-bell-slash"></i><p>Aucune notification</p></div>'}
          </div>
        </div>
      </div>
    </div>`;
  } catch(e) { pc.innerHTML = errHtml(e); }
}

function renderNotifItem(n) {
  const icons = { info: 'info-circle', alerte: 'exclamation-triangle', paiement: 'money-bill', note: 'star', absence: 'calendar-times', message: 'comment', rendez_vous: 'handshake' };
  const colors = { info: '#3b82f6', alerte: '#f59e0b', paiement: '#10b981', note: '#8b5cf6', absence: '#ef4444', message: '#0891b2', rendez_vous: '#d97706' };
  return `
  <div class="flex gap-3 p-4 border-b last:border-0 hover:bg-gray-50 transition-colors ${n.statut==='non_lu'?'bg-blue-50':''}" id="notif-${n.id}">
    <div class="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style="background:${(colors[n.type]||'#64748b')}22">
      <i class="fas fa-${icons[n.type]||'bell'}" style="color:${colors[n.type]||'#64748b'}"></i>
    </div>
    <div class="flex-1 min-w-0">
      <div class="text-sm ${n.statut==='non_lu'?'font-semibold text-gray-800':'text-gray-600'}">${sanitize(n.message)}</div>
      <div class="text-xs text-gray-400 mt-1">${fmtDate(n.date_envoi)}</div>
    </div>
    ${n.statut==='non_lu'?`<button class="btn btn-sm btn-outline btn-icon" onclick="marquerLu('${n.id}')"><i class="fas fa-check"></i></button>`:'<span class="text-green-500"><i class="fas fa-check-double"></i></span>'}
  </div>`;
}

async function marquerLu(id) {
  await API.put(`/notifications/${id}/lu`);
  const el = $(`notif-${id}`); if(el) { el.classList.remove('bg-blue-50'); el.querySelector('.font-semibold')?.classList.replace('font-semibold','font-normal'); }
  loadNotifCount();
}

async function marquerToutLu() {
  await API.put('/notifications/mark-all-read');
  toast('Toutes les notifications marquées comme lues', 'success'); renderNotifications(); loadNotifCount();
}

function openEnvoyerNotif() {
  openModal('Envoyer une notification', `
  <form id="notif-form">
    <div class="form-group"><label class="form-label">Destinataire(s)</label>
      <select name="utilisateur_id" class="form-select">
        <option value="all">🌍 Tous les utilisateurs</option>
        <option value="parents">👪 Tous les parents</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">Type</label>
      <select name="type" class="form-select">
        <option value="info">Information</option><option value="alerte">Alerte</option><option value="paiement">Paiement</option>
      </select>
    </div>
    <div class="form-group"><label class="form-label">Message <span class="required">*</span></label>
      <textarea name="message" class="form-textarea" required placeholder="Saisir votre message..."></textarea>
    </div>
  </form>`,
  async () => {
    const data = Object.fromEntries(new FormData($('notif-form')));
    try {
      await API.post('/notifications/send', data);
      toast('Notification envoyée !', 'success'); closeModal();
    } catch(err) { toast(err.message, 'error'); }
  });
}

// ==============================================================
// MESSAGES
// ==============================================================
async function renderMessages() {
  const pc = $('page-content');
  try {
    const [recv, sent] = await Promise.all([API.get('/messages?type=recus'), API.get('/messages?type=envoyes')]);
    const recus = recv.data.data || [];
    const envoyes = sent.data.data || [];
    pc.innerHTML = `
    <div class="animate-fade">
      <div class="flex justify-between items-center mb-4">
        <div class="tabs mb-0" style="border:none">
          <div class="tab active" onclick="switchTab(this,'tab-recus','tab-envoyes')">📥 Reçus (${recus.length})</div>
          <div class="tab" onclick="switchTab(this,'tab-envoyes','tab-recus')">📤 Envoyés (${envoyes.length})</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="openMessageForm()"><i class="fas fa-pen"></i> Nouveau message</button>
      </div>
      <div id="tab-recus" class="card">
        <div class="card-body p-0">
          ${recus.length ? recus.map(m=>renderMessageItem(m,'recu')).join('') : '<div class="empty-state"><i class="fas fa-inbox"></i><p>Aucun message reçu</p></div>'}
        </div>
      </div>
      <div id="tab-envoyes" class="card" style="display:none">
        <div class="card-body p-0">
          ${envoyes.length ? envoyes.map(m=>renderMessageItem(m,'envoye')).join('') : '<div class="empty-state"><i class="fas fa-paper-plane"></i><p>Aucun message envoyé</p></div>'}
        </div>
      </div>
    </div>`;
  } catch(e) { pc.innerHTML = errHtml(e); }
}

function renderMessageItem(m, type) {
  const name = type === 'recu' ? `${sanitize(m.exp_prenom||'')} ${sanitize(m.exp_nom||'')}` : `À: ${sanitize(m.dest_prenom||'')} ${sanitize(m.dest_nom||'')}`;
  return `
  <div class="flex gap-3 p-4 border-b last:border-0 hover:bg-gray-50 cursor-pointer ${!m.lu&&type==='recu'?'bg-blue-50':''}" onclick="voirMessage('${m.id}')">
    <div class="avatar avatar-sm" style="background:${avatarColor(m.exp_nom||'?')}">${avatarLetters(m.exp_nom||'?',m.exp_prenom||'?')}</div>
    <div class="flex-1 min-w-0">
      <div class="flex justify-between items-start">
        <span class="${!m.lu&&type==='recu'?'font-bold text-gray-800':'font-medium text-gray-700'} text-sm">${name}</span>
        <span class="text-xs text-gray-400 flex-shrink-0 ml-2">${fmtDate(m.date_envoi)}</span>
      </div>
      <div class="text-sm text-gray-600 truncate">${sanitize(m.sujet||'(sans objet)')}</div>
      <div class="text-xs text-gray-400 truncate">${sanitize(m.contenu.substring(0,100))}</div>
    </div>
    ${!m.lu && type==='recu' ? '<span class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></span>' : ''}
  </div>`;
}

async function voirMessage(id) {
  await API.put(`/messages/${id}/lu`);
  const r = await API.get('/messages?type=recus');
  const msg = (r.data.data||[]).find(m=>m.id===id) || {};
  openModal(`Message — ${msg.sujet||'Sans objet'}`, `
  <div class="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
    <div class="avatar" style="background:${avatarColor(msg.exp_nom||'?')}">${avatarLetters(msg.exp_nom||'?',msg.exp_prenom||'?')}</div>
    <div>
      <div class="font-bold">${sanitize(msg.exp_prenom||'')} ${sanitize(msg.exp_nom||'')}</div>
      <div class="text-xs text-gray-400">${fmtDate(msg.date_envoi)} — ${sanitize(msg.exp_role||'')}</div>
    </div>
  </div>
  <div class="text-gray-700 whitespace-pre-wrap">${sanitize(msg.contenu||'')}</div>
  <div class="mt-4">
    <button class="btn btn-sm btn-primary" onclick="repondreMessage('${msg.expediteur_id}','${sanitize(msg.sujet||'')}');closeModal()"><i class="fas fa-reply"></i> Répondre</button>
  </div>`);
}

async function openMessageForm(destId = '', sujet = '') {
  const r = await API.get('/users');
  const users = (r.data.data||[]).filter(u => u.id !== currentUser.id);
  openModal('Nouveau message', `
  <form id="msg-form">
    <div class="form-group"><label class="form-label">Destinataire <span class="required">*</span></label>
      <select name="destinataire_id" class="form-select" required>
        <option value="">-- Choisir --</option>
        ${users.map(u=>`<option value="${u.id}" ${u.id===destId?'selected':''}>${sanitize(u.prenom)} ${sanitize(u.nom)} (${getRoleLabel(u.role)})</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Objet</label><input name="sujet" class="form-input" value="${sanitize(sujet)}" placeholder="Objet du message"></div>
    <div class="form-group"><label class="form-label">Message <span class="required">*</span></label><textarea name="contenu" class="form-textarea" required style="min-height:120px" placeholder="Saisir votre message..."></textarea></div>
  </form>`,
  async () => {
    const data = Object.fromEntries(new FormData($('msg-form')));
    try {
      await API.post('/messages', data);
      toast('Message envoyé !', 'success'); closeModal(); renderMessages();
    } catch(err) { toast(err.message, 'error'); }
  });
}

function repondreMessage(destId, sujet) { openMessageForm(destId, 'RE: ' + sujet); }

// ==============================================================
// STATISTIQUES
// ==============================================================
async function renderStatistiques() {
  const pc = $('page-content');
  try {
    const r = await API.get('/stats/dashboard');
    const d = r.data.data;
    pc.innerHTML = `
    <div class="animate-fade">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="fas fa-chart-pie mr-2 text-blue-600"></i>Répartition des rôles</span></div>
          <div class="card-body"><div class="chart-wrapper"><canvas id="chart-roles"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="fas fa-chart-bar mr-2 text-green-600"></i>Élèves par classe</span></div>
          <div class="card-body"><div class="chart-wrapper"><canvas id="chart-classes"></canvas></div></div>
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="fas fa-chart-line mr-2 text-yellow-600"></i>Recouvrement financier</span></div>
          <div class="card-body">
            <div class="chart-wrapper"><canvas id="chart-finance"></canvas></div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title"><i class="fas fa-calendar-times mr-2 text-red-600"></i>Absences (30 jours)</span></div>
          <div class="card-body">
            <div class="chart-wrapper"><canvas id="chart-abs2"></canvas></div>
          </div>
        </div>
      </div>
    </div>`;

    const roles = d.users_by_role || {};
    chartInstances['roles'] = new Chart($('chart-roles'), {
      type: 'doughnut',
      data: { labels: Object.keys(roles).map(getRoleLabel), datasets: [{ data: Object.values(roles), backgroundColor: ['#8b5cf6','#3b82f6','#10b981','#f59e0b','#64748b'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });

    const cls = (d.repartition_classes||[]).slice(0,8);
    chartInstances['classes'] = new Chart($('chart-classes'), {
      type: 'bar',
      data: { labels: cls.map(c=>c.nom_classe), datasets: [{ label: 'Élèves', data: cls.map(c=>c.nb_eleves), backgroundColor: '#1a6b3c', borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });

    const fin = d.finance || {};
    chartInstances['finance'] = new Chart($('chart-finance'), {
      type: 'doughnut',
      data: { labels: ['Encaissé', 'Reste'], datasets: [{ data: [fin.total_encaisse||0, Math.max(0,(fin.total_attendu||0)-(fin.total_encaisse||0))], backgroundColor: ['#10b981','#fee2e2'], borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right' } } }
    });

    const abs = d.absences_30j || {};
    chartInstances['abs2'] = new Chart($('chart-abs2'), {
      type: 'bar',
      data: { labels: ['Absences','Retards','Présents'], datasets: [{ data: [abs.absences||0, abs.retards||0, Math.max(0,(abs.total||0)-(abs.absences||0)-(abs.retards||0))], backgroundColor: ['#ef4444','#f59e0b','#10b981'], borderRadius: 4 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
    });
  } catch(e) { pc.innerHTML = errHtml(e); }
}

// ==============================================================
// PROFIL
// ==============================================================
async function renderProfil() {
  const pc = $('page-content');
  try {
    const r = await API.get('/users/me');
    const u = r.data.data || currentUser;
    pc.innerHTML = `
    <div class="animate-fade max-w-2xl mx-auto">
      <div class="card mb-4">
        <div class="card-body text-center">
          <div class="avatar avatar-lg mx-auto mb-4" style="background:${avatarColor(u.nom)};width:80px;height:80px;font-size:2rem">${avatarLetters(u.nom,u.prenom)}</div>
          <div class="text-2xl font-bold">${sanitize(u.prenom)} ${sanitize(u.nom)}</div>
          <div class="mt-1"><span class="badge badge-green">${getRoleLabel(u.role)}</span></div>
          <div class="text-sm text-gray-500 mt-2">${sanitize(u.email)}</div>
        </div>
      </div>
      <div class="card mb-4">
        <div class="card-header"><span class="card-title">Informations personnelles</span></div>
        <div class="card-body">
          <div class="grid grid-cols-2 gap-4 text-sm">
            ${[['Email',u.email],['Téléphone',u.telephone||'-'],['Rôle',getRoleLabel(u.role)],['Membre depuis',fmtDate(u.date_creation)],['Dernière connexion',u.derniere_connexion?fmtDate(u.derniere_connexion):'Première connexion']].map(([l,v])=>`
            <div><div class="text-gray-400 text-xs mb-1">${l}</div><div class="font-medium">${sanitize(String(v))}</div></div>`).join('')}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Changer le mot de passe</span></div>
        <div class="card-body">
          <form id="pwd-form" class="space-y-4">
            <div class="form-group"><label class="form-label">Ancien mot de passe</label><input name="ancien" type="password" class="form-input" required></div>
            <div class="form-group"><label class="form-label">Nouveau mot de passe</label><input name="nouveau" type="password" class="form-input" required></div>
            <button type="button" class="btn btn-primary" onclick="changerMotDePasse()"><i class="fas fa-key"></i> Mettre à jour</button>
          </form>
        </div>
      </div>
    </div>`;
  } catch(e) { pc.innerHTML = errHtml(e); }
}

async function changerMotDePasse() {
  const form = $('pwd-form');
  if (!form) return;
  const ancien = form.querySelector('[name=ancien]').value;
  const nouveau = form.querySelector('[name=nouveau]').value;
  try {
    await API.post('/auth/change-password', { user_id: currentUser.id, ancien_mot_de_passe: ancien, nouveau_mot_de_passe: nouveau });
    toast('Mot de passe mis à jour !', 'success');
  } catch(err) { toast(err.response?.data?.error || err.message, 'error'); }
}

// ==============================================================
// EMPLOI DU TEMPS
// ==============================================================
async function renderEmploiDuTemps() {
  const pc = $('page-content');
  try {
    const cr = await API.get('/classes');
    const classes = cr.data.data || [];
    pc.innerHTML = `
    <div class="animate-fade">
      <div class="flex gap-3 mb-4 flex-wrap items-center justify-between">
        <select class="form-select" id="edt-classe" style="width:200px" onchange="loadEDT()">
          <option value="">Toutes les classes</option>
          ${classes.map(c=>`<option value="${c.id}">${sanitize(c.nom_classe)}</option>`).join('')}
        </select>
        ${canDo('admin','secretariat')?`<button class="btn btn-primary" onclick="openEDTForm()"><i class="fas fa-plus"></i> Ajouter un cours</button>`:''}
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title"><i class="fas fa-calendar-alt mr-2 text-blue-600"></i>Emploi du temps</span></div>
        <div class="table-container" id="edt-container">
          <div class="empty-state"><i class="fas fa-calendar-alt"></i><p>Sélectionner une classe pour voir l'emploi du temps</p></div>
        </div>
      </div>
    </div>`;
    window._classesAll = classes;
  } catch(e) { pc.innerHTML = errHtml(e); }
}

async function loadEDT() {
  const cl = $('edt-classe')?.value;
  try {
    const r = await API.get(`/emploi-du-temps${cl?`?classe_id=${cl}`:''}`);
    const edt = r.data.data || [];
    const jours = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
    const cont = $('edt-container');
    if (!cont) return;
    if (!edt.length) { cont.innerHTML = '<div class="empty-state"><i class="fas fa-calendar-times"></i><p>Aucun cours planifié</p></div>'; return; }
    const byJour = {};
    jours.forEach(j => byJour[j] = edt.filter(e => e.jour === j));
    cont.innerHTML = `<table><thead><tr><th>Jour</th><th>Heure</th><th>Matière</th><th>Professeur</th><th>Salle</th>${canDo('admin','secretariat')?'<th>Actions</th>':''}</tr></thead>
    <tbody>${jours.map(j=>byJour[j].map((e,i)=>`<tr>
      ${i===0?`<td rowspan="${byJour[j].length}" class="font-bold text-green-700 bg-green-50">${j}</td>`:''}
      <td class="font-mono text-sm">${sanitize(e.heure_debut)} - ${sanitize(e.heure_fin)}</td>
      <td class="font-medium">${sanitize(e.nom_matiere)}</td>
      <td class="text-sm text-gray-600">${sanitize(e.prof_prenom||'')} ${sanitize(e.prof_nom||'')}</td>
      <td class="text-sm text-gray-500">${sanitize(e.salle||'-')}</td>
      ${canDo('admin','secretariat')?`<td><button class="btn btn-sm btn-danger btn-icon" onclick="supprimerEDT('${e.id}')"><i class="fas fa-trash"></i></button></td>`:''}
    </tr>`).join('')).join('')}</tbody></table>`;
  } catch(e) { toast('Erreur', 'error'); }
}

async function openEDTForm() {
  const classes = window._classesAll || [];
  openModal('Ajouter un cours', `
  <form id="edt-form">
    <div class="form-group"><label class="form-label">Classe <span class="required">*</span></label>
      <select name="classe_id" class="form-select" required onchange="loadMatieresPourNotes(this.value)">
        <option value="">-- Choisir --</option>${classes.map(c=>`<option value="${c.id}">${sanitize(c.nom_classe)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Matière <span class="required">*</span></label>
      <select name="matiere_id" id="note-matiere" class="form-select" required><option>-- Choisir la classe d'abord --</option></select>
    </div>
    <div class="form-group"><label class="form-label">Professeur</label>
      <select name="professeur_id" id="note-eleve" class="form-select"><option>-- Choisir la classe d'abord --</option></select>
    </div>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Jour <span class="required">*</span></label>
        <select name="jour" class="form-select" required>
          ${['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'].map(j=>`<option value="${j}">${j}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label class="form-label">Salle</label><input name="salle" class="form-input" placeholder="Ex: Salle 101"></div>
    </div>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Heure début</label><input name="heure_debut" type="time" class="form-input" required></div>
      <div class="form-group"><label class="form-label">Heure fin</label><input name="heure_fin" type="time" class="form-input"></div>
    </div>
  </form>`,
  async () => {
    const data = Object.fromEntries(new FormData($('edt-form')));
    try {
      await API.post('/emploi-du-temps', data);
      toast('Cours ajouté !', 'success'); closeModal(); loadEDT();
    } catch(err) { toast(err.message, 'error'); }
  });
}

async function supprimerEDT(id) {
  if (!confirm('Supprimer ce cours ?')) return;
  await API.delete(`/emploi-du-temps/${id}`);
  toast('Cours supprimé', 'success'); loadEDT();
}

// ==============================================================
// DEVOIRS
// ==============================================================
async function renderDevoirs() {
  const pc = $('page-content');
  try {
    const [dr, cr] = await Promise.all([API.get('/devoirs'), API.get('/classes')]);
    const devoirs = dr.data.data || [];
    const classes = cr.data.data || [];
    pc.innerHTML = `
    <div class="animate-fade">
      <div class="flex justify-between items-center mb-4 flex-wrap gap-3">
        <select class="form-select" id="dev-classe" style="width:180px" onchange="filterDevoirs()">
          <option value="">Toutes classes</option>
          ${classes.map(c=>`<option value="${c.id}">${sanitize(c.nom_classe)}</option>`).join('')}
        </select>
        ${canDo('admin','professeur')?`<button class="btn btn-primary" onclick="openDevoirForm()"><i class="fas fa-plus"></i> Nouveau devoir</button>`:''}
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="devoirs-grid">
        ${devoirs.map(renderDevoirCard).join('') || '<div class="col-span-3 empty-state"><i class="fas fa-book-open"></i><p>Aucun devoir</p></div>'}
      </div>
    </div>`;
    window._devoirsData = devoirs; window._classesAll = classes;
  } catch(e) { pc.innerHTML = errHtml(e); }
}

function renderDevoirCard(d) {
  const isLate = d.date_remise && new Date(d.date_remise) < new Date();
  return `
  <div class="card hover:shadow-lg transition-shadow">
    <div class="card-body">
      <div class="flex justify-between items-start mb-3">
        <span class="badge badge-${isLate?'red':'green'}">${isLate?'Échu':'En cours'}</span>
        <span class="text-xs text-gray-400">${fmtDate(d.date_donnee)}</span>
      </div>
      <div class="font-bold text-gray-800 mb-1">${sanitize(d.titre)}</div>
      <div class="text-sm text-blue-600 font-medium mb-2">${sanitize(d.nom_matiere||'')} — ${sanitize(d.nom_classe||'')}</div>
      ${d.description?`<div class="text-sm text-gray-600 mb-3 line-clamp-2">${sanitize(d.description)}</div>`:''}
      <div class="flex justify-between items-center text-xs text-gray-400">
        <span><i class="fas fa-user mr-1"></i>${sanitize(d.prof_prenom||'')} ${sanitize(d.prof_nom||'')}</span>
        ${d.date_remise?`<span class="font-medium ${isLate?'text-red-500':'text-green-600'}">📅 ${fmtDate(d.date_remise)}</span>`:''}
      </div>
      ${canDo('admin','professeur')?`<div class="mt-3 flex gap-2">
        <button class="btn btn-sm btn-danger flex-1" onclick="supprimerDevoir('${d.id}')"><i class="fas fa-trash"></i></button>
      </div>`:''}
    </div>
  </div>`;
}

function filterDevoirs() {
  const cl = $('dev-classe')?.value;
  const filtered = (window._devoirsData||[]).filter(d=>!cl||d.classe_id===cl);
  const g = $('devoirs-grid'); if(g) g.innerHTML = filtered.map(renderDevoirCard).join('') || '<div class="empty-state"><i class="fas fa-book-open"></i><p>Aucun devoir</p></div>';
}

async function openDevoirForm() {
  const classes = window._classesAll || [];
  openModal('Nouveau devoir', `
  <form id="devoir-form">
    <div class="form-group"><label class="form-label">Classe <span class="required">*</span></label>
      <select name="classe_id" class="form-select" required onchange="loadMatieresPourNotes(this.value)">
        <option value="">-- Choisir --</option>${classes.map(c=>`<option value="${c.id}">${sanitize(c.nom_classe)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Matière <span class="required">*</span></label>
      <select name="matiere_id" id="note-matiere" class="form-select" required><option>-- Choisir la classe d'abord --</option></select>
    </div>
    <div class="form-group"><label class="form-label">Titre <span class="required">*</span></label><input name="titre" class="form-input" required placeholder="Ex: Exercices page 45-47"></div>
    <div class="form-group"><label class="form-label">Description</label><textarea name="description" class="form-textarea" placeholder="Détails du devoir..."></textarea></div>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Date donnée</label><input name="date_donnee" type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}" required></div>
      <div class="form-group"><label class="form-label">Date de remise</label><input name="date_remise" type="date" class="form-input"></div>
    </div>
  </form>`,
  async () => {
    const data = Object.fromEntries(new FormData($('devoir-form')));
    delete data.classe_id;
    try {
      await API.post('/devoirs', data);
      toast('Devoir créé !', 'success'); closeModal(); renderDevoirs();
    } catch(err) { toast(err.message, 'error'); }
  });
}

async function supprimerDevoir(id) {
  if (!confirm('Supprimer ce devoir ?')) return;
  await API.delete(`/devoirs/${id}`);
  toast('Devoir supprimé', 'success'); renderDevoirs();
}

// ==============================================================
// CAHIER DE TEXTE
// ==============================================================
async function renderCahierTexte() {
  const pc = $('page-content');
  try {
    const [ctr, cr] = await Promise.all([API.get('/cahier-texte'), API.get('/classes')]);
    const entrees = ctr.data.data || [];
    pc.innerHTML = `
    <div class="animate-fade">
      <div class="flex justify-between items-center mb-4 flex-wrap gap-3">
        <select class="form-select" id="ct-classe" style="width:180px" onchange="filterCahier()">
          <option value="">Toutes classes</option>
          ${(cr.data.data||[]).map(c=>`<option value="${c.id}">${sanitize(c.nom_classe)}</option>`).join('')}
        </select>
        ${canDo('admin','professeur')?`<button class="btn btn-primary" onclick="openCahierForm()"><i class="fas fa-plus"></i> Ajouter entrée</button>`:''}
      </div>
      <div class="space-y-4" id="cahier-list">
        ${entrees.length ? entrees.map(renderCahierItem).join('') : '<div class="empty-state"><i class="fas fa-book"></i><p>Aucune entrée</p></div>'}
      </div>
    </div>`;
    window._cahierData = entrees; window._classesAll = cr.data.data||[];
  } catch(e) { pc.innerHTML = errHtml(e); }
}

function renderCahierItem(e) {
  return `
  <div class="card">
    <div class="card-body">
      <div class="flex justify-between items-start mb-2 flex-wrap gap-2">
        <div class="flex gap-2 items-center">
          <span class="badge badge-green">${fmtDate(e.date_cours)}</span>
          <span class="badge badge-blue">${sanitize(e.nom_matiere||'')}</span>
          <span class="text-xs text-gray-500">${sanitize(e.nom_classe||'')}</span>
        </div>
        <span class="text-xs text-gray-400">${sanitize(e.prof_nom||'')}</span>
      </div>
      ${e.objectifs?`<div class="text-xs font-bold text-gray-500 mb-1">🎯 Objectifs: ${sanitize(e.objectifs)}</div>`:''}
      <div class="text-sm text-gray-700">${sanitize(e.contenu)}</div>
    </div>
  </div>`;
}

async function openCahierForm() {
  const classes = window._classesAll || [];
  openModal('Ajouter au cahier de texte', `
  <form id="ct-form">
    <div class="form-group"><label class="form-label">Classe</label>
      <select name="classe_id" class="form-select" onchange="loadMatieresPourNotes(this.value)">
        <option value="">-- Choisir --</option>${classes.map(c=>`<option value="${c.id}">${sanitize(c.nom_classe)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Matière <span class="required">*</span></label>
      <select name="matiere_id" id="note-matiere" class="form-select" required><option>-- Choisir la classe --</option></select>
    </div>
    <div class="form-group"><label class="form-label">Date du cours</label><input name="date_cours" type="date" class="form-input" value="${new Date().toISOString().split('T')[0]}" required></div>
    <div class="form-group"><label class="form-label">Objectifs du cours</label><input name="objectifs" class="form-input" placeholder="Objectifs pédagogiques..."></div>
    <div class="form-group"><label class="form-label">Contenu du cours <span class="required">*</span></label><textarea name="contenu" class="form-textarea" required style="min-height:120px" placeholder="Résumé du cours dispensé..."></textarea></div>
  </form>`,
  async () => {
    const data = Object.fromEntries(new FormData($('ct-form')));
    delete data.classe_id;
    try {
      await API.post('/cahier-texte', data);
      toast('Entrée ajoutée !', 'success'); closeModal(); renderCahierTexte();
    } catch(err) { toast(err.message, 'error'); }
  });
}

// ==============================================================
// TRANSPORT
// ==============================================================
async function renderTransport() {
  const pc = $('page-content');
  try {
    const r = await API.get('/transport');
    const lignes = r.data.data || [];
    pc.innerHTML = `
    <div class="animate-fade">
      <div class="flex justify-between items-center mb-4">
        <div class="text-sm text-gray-500">${lignes.length} ligne(s) de transport</div>
        ${canDo('admin')?`<button class="btn btn-primary" onclick="openTransportForm()"><i class="fas fa-plus"></i> Nouvelle ligne</button>`:''}
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${lignes.map(l=>`
        <div class="card hover:shadow-lg transition-shadow">
          <div class="card-body">
            <div class="flex items-start gap-3 mb-3">
              <div class="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0"><i class="fas fa-bus text-blue-600 text-xl"></i></div>
              <div>
                <div class="font-bold text-gray-800">${sanitize(l.nom_ligne)}</div>
                <div class="text-sm text-gray-500">${sanitize(l.vehicule||'')}</div>
              </div>
              <span class="badge badge-blue ml-auto">${l.nb_eleves} élèves</span>
            </div>
            <div class="grid grid-cols-2 gap-2 text-sm">
              <div><span class="text-gray-400">Chauffeur :</span> <span class="font-medium">${sanitize(l.chauffeur||'-')}</span></div>
              <div><span class="text-gray-400">Capacité :</span> <span class="font-medium">${l.capacite||'-'} places</span></div>
            </div>
            ${l.itineraire?`<div class="mt-2 text-xs text-gray-500 italic"><i class="fas fa-route mr-1"></i>${sanitize(l.itineraire)}</div>`:''}
          </div>
        </div>`).join('') || '<div class="col-span-2 empty-state"><i class="fas fa-bus"></i><p>Aucune ligne de transport</p></div>'}
      </div>
    </div>`;
  } catch(e) { pc.innerHTML = errHtml(e); }
}

function openTransportForm() {
  openModal('Nouvelle ligne de transport', `
  <form id="trans-form">
    <div class="form-group"><label class="form-label">Nom de la ligne <span class="required">*</span></label><input name="nom_ligne" class="form-input" required placeholder="Ex: Ligne 1 - Centre Ville"></div>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Chauffeur</label><input name="chauffeur" class="form-input"></div>
      <div class="form-group"><label class="form-label">Véhicule</label><input name="vehicule" class="form-input" placeholder="Ex: Minibus Toyota HiAce"></div>
    </div>
    <div class="form-group"><label class="form-label">Capacité</label><input name="capacite" type="number" class="form-input" value="20"></div>
    <div class="form-group"><label class="form-label">Itinéraire</label><textarea name="itineraire" class="form-textarea" placeholder="Décrire l'itinéraire..."></textarea></div>
  </form>`,
  async () => {
    const data = Object.fromEntries(new FormData($('trans-form')));
    try {
      await API.post('/transport', data);
      toast('Ligne créée !', 'success'); closeModal(); renderTransport();
    } catch(err) { toast(err.message, 'error'); }
  });
}

// ==============================================================
// BIBLIOTHÈQUE
// ==============================================================
async function renderBibliotheque() {
  const pc = $('page-content');
  try {
    const r = await API.get('/bibliotheque');
    const docs = r.data.data || [];
    pc.innerHTML = `
    <div class="animate-fade">
      <div class="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div class="search-bar" style="width:280px">
          <i class="fas fa-search"></i>
          <input class="search-input" id="bib-search" placeholder="Rechercher un document..." oninput="filterBibliotheque()">
        </div>
        <div class="flex gap-2 flex-wrap">
          ${['Manuel scolaire','Roman','Poésie','Sciences','Histoire'].map(c=>`<button class="btn btn-sm btn-outline" onclick="filterBibCat('${c}')">${c}</button>`).join('')}
          ${canDo('admin','professeur')?`<button class="btn btn-primary" onclick="openBibForm()"><i class="fas fa-plus"></i> Ajouter</button>`:''}
        </div>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="bib-grid">
        ${docs.map(renderBibCard).join('') || '<div class="col-span-3 empty-state"><i class="fas fa-book"></i><p>Bibliothèque vide</p></div>'}
      </div>
    </div>`;
    window._bibData = docs;
  } catch(e) { pc.innerHTML = errHtml(e); }
}

function renderBibCard(d) {
  return `
  <div class="card hover:shadow-lg transition-shadow">
    <div class="card-body">
      <div class="w-full h-24 rounded-lg mb-3 flex items-center justify-center" style="background:linear-gradient(135deg,#1a6b3c22,#1a6b3c44)">
        <i class="fas fa-book text-green-700" style="font-size:2.5rem"></i>
      </div>
      <div class="font-bold text-gray-800 mb-1 line-clamp-2">${sanitize(d.titre)}</div>
      <div class="text-sm text-gray-500 mb-2">${sanitize(d.auteur||'Auteur inconnu')}</div>
      <span class="badge badge-blue">${sanitize(d.categorie||'Général')}</span>
      ${d.description?`<div class="text-xs text-gray-400 mt-2 line-clamp-2">${sanitize(d.description)}</div>`:''}
      <div class="mt-3">
        ${d.fichier_url?`<a href="${sanitize(d.fichier_url)}" target="_blank" class="btn btn-sm btn-primary w-full justify-center"><i class="fas fa-download"></i> Télécharger</a>`:'<div class="btn btn-sm w-full justify-center" style="background:#f1f5f9;color:#94a3b8">Pas de fichier</div>'}
      </div>
    </div>
  </div>`;
}

function filterBibliotheque() {
  const q = ($('bib-search')?.value||'').toLowerCase();
  const filtered = (window._bibData||[]).filter(d=>`${d.titre} ${d.auteur}`.toLowerCase().includes(q));
  const g = $('bib-grid'); if(g) g.innerHTML = filtered.map(renderBibCard).join('');
}

function filterBibCat(cat) {
  const filtered = (window._bibData||[]).filter(d=>d.categorie===cat);
  const g = $('bib-grid'); if(g) g.innerHTML = filtered.map(renderBibCard).join('');
}

function openBibForm() {
  openModal('Ajouter un document', `
  <form id="bib-form">
    <div class="form-group"><label class="form-label">Titre <span class="required">*</span></label><input name="titre" class="form-input" required></div>
    <div class="form-grid">
      <div class="form-group"><label class="form-label">Auteur</label><input name="auteur" class="form-input"></div>
      <div class="form-group"><label class="form-label">Catégorie</label>
        <select name="categorie" class="form-select">
          <option>Manuel scolaire</option><option>Roman</option><option>Poésie</option><option>Sciences</option><option>Histoire</option><option>Géographie</option><option>Général</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label class="form-label">Lien fichier (URL)</label><input name="fichier_url" class="form-input" type="url" placeholder="https://..."></div>
    <div class="form-group"><label class="form-label">Description</label><textarea name="description" class="form-textarea"></textarea></div>
  </form>`,
  async () => {
    const data = Object.fromEntries(new FormData($('bib-form')));
    try {
      await API.post('/bibliotheque', data);
      toast('Document ajouté !', 'success'); closeModal(); renderBibliotheque();
    } catch(err) { toast(err.message, 'error'); }
  });
}

// ==============================================================
// BADGES
// ==============================================================
async function renderBadges() {
  const pc = $('page-content');
  try {
    const [br, er] = await Promise.all([API.get('/badges'), API.get('/eleves?per_page=100')]);
    const badges = br.data.data || [];
    const eleves = er.data.data || [];
    pc.innerHTML = `
    <div class="animate-fade">
      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        ${badges.map(b=>`
        <div class="card text-center hover:shadow-lg transition-shadow cursor-pointer p-4">
          <div class="text-4xl mb-2">${b.icone||'🏅'}</div>
          <div class="font-bold text-sm">${sanitize(b.nom)}</div>
          <div class="text-xs text-gray-400 mt-1">${sanitize(b.description||'')}</div>
          <div class="mt-2 h-1 rounded-full" style="background:${b.couleur}"></div>
        </div>`).join('')}
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-medal mr-2 text-yellow-500"></i>Attribuer un badge</span>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group"><label class="form-label">Élève</label>
              <select id="badge-eleve" class="form-select">
                <option value="">-- Choisir un élève --</option>
                ${eleves.map(e=>`<option value="${e.id}">${sanitize(e.prenom)} ${sanitize(e.nom)} — ${sanitize(e.matricule)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group"><label class="form-label">Badge</label>
              <select id="badge-type" class="form-select">
                ${badges.map(b=>`<option value="${b.id}">${b.icone} ${sanitize(b.nom)}</option>`).join('')}
              </select>
            </div>
          </div>
          <button class="btn btn-primary" onclick="attribuerBadge()"><i class="fas fa-award"></i> Attribuer</button>
        </div>
      </div>
    </div>`;
  } catch(e) { pc.innerHTML = errHtml(e); }
}

async function attribuerBadge() {
  const eleveId = $('badge-eleve')?.value;
  const badgeId = $('badge-type')?.value;
  if (!eleveId || !badgeId) { toast('Choisir un élève et un badge', 'warning'); return; }
  try {
    await API.post('/badges/attribuer', { eleve_id: eleveId, badge_id: badgeId });
    toast('Badge attribué avec succès ! 🏅', 'success');
  } catch(err) { toast(err.response?.data?.error || err.message, 'error'); }
}

// ==============================================================
// RENDEZ-VOUS
// ==============================================================
async function renderRendezVous() {
  const pc = $('page-content');
  try {
    const r = await API.get('/rendez-vous');
    const rdvs = r.data.data || [];
    pc.innerHTML = `
    <div class="animate-fade">
      <div class="flex justify-between items-center mb-4">
        <div class="text-sm text-gray-500">${rdvs.length} rendez-vous</div>
        <button class="btn btn-primary" onclick="openRDVForm()"><i class="fas fa-plus"></i> Demander un RDV</button>
      </div>
      <div class="space-y-3" id="rdv-list">
        ${rdvs.length ? rdvs.map(renderRDVItem).join('') : '<div class="empty-state"><i class="fas fa-handshake"></i><p>Aucun rendez-vous planifié</p></div>'}
      </div>
    </div>`;
  } catch(e) { pc.innerHTML = errHtml(e); }
}

function renderRDVItem(r) {
  return `
  <div class="card">
    <div class="card-body flex items-center justify-between flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-xl flex items-center justify-center" style="background:#e8f5ee"><i class="fas fa-handshake text-green-600 text-xl"></i></div>
        <div>
          <div class="font-semibold">${sanitize(r.parent_prenom||'')} ${sanitize(r.parent_nom||'')} ↔ Prof. ${sanitize(r.prof_prenom||'')} ${sanitize(r.prof_nom||'')}</div>
          <div class="text-sm text-gray-500">📅 ${fmtDate(r.date_rdv)} — ${sanitize(r.motif||'')}</div>
        </div>
      </div>
      <div class="flex items-center gap-2">
        ${badgeStatut(r.statut)}
        ${canDo('admin','professeur')&&r.statut==='en_attente'?`
        <button class="btn btn-sm btn-primary" onclick="confirmerRDV('${r.id}','confirme')"><i class="fas fa-check"></i></button>
        <button class="btn btn-sm btn-danger" onclick="confirmerRDV('${r.id}','annule')"><i class="fas fa-times"></i></button>`:''}
      </div>
    </div>
  </div>`;
}

async function confirmerRDV(id, statut) {
  await API.put(`/rendez-vous/${id}`, { statut });
  toast(statut==='confirme'?'RDV confirmé !':'RDV annulé', statut==='confirme'?'success':'warning');
  renderRendezVous();
}

async function openRDVForm() {
  const [pr, upr] = await Promise.all([API.get('/parents'), API.get('/users/professeurs')]);
  openModal('Demander un rendez-vous', `
  <form id="rdv-form">
    <div class="form-group"><label class="form-label">Parent / Tuteur</label>
      <select name="parent_id" class="form-select" required>
        <option value="">-- Choisir --</option>
        ${(pr.data.data||[]).map(p=>`<option value="${p.id}">${sanitize(p.prenom)} ${sanitize(p.nom)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Professeur</label>
      <select name="professeur_id" class="form-select" required>
        <option value="">-- Choisir --</option>
        ${(upr.data.data||[]).map(p=>`<option value="${p.id}">${sanitize(p.prenom)} ${sanitize(p.nom)}</option>`).join('')}
      </select>
    </div>
    <div class="form-group"><label class="form-label">Date & Heure <span class="required">*</span></label><input name="date_rdv" type="datetime-local" class="form-input" required></div>
    <div class="form-group"><label class="form-label">Motif</label><textarea name="motif" class="form-textarea" placeholder="Objet du rendez-vous..."></textarea></div>
  </form>`,
  async () => {
    const data = Object.fromEntries(new FormData($('rdv-form')));
    try {
      await API.post('/rendez-vous', data);
      toast('Rendez-vous demandé !', 'success'); closeModal(); renderRendezVous();
    } catch(err) { toast(err.message, 'error'); }
  });
}

// ==============================================================
// MON ESPACE (Parent/Élève)
// ==============================================================
async function renderMonEspace() {
  const pc = $('page-content');
  const role = currentUser.role;
  try {
    if (role === 'parent') {
      const r = await API.get('/parents');
      const parents = r.data.data || [];
      const myParent = parents.find(p => p.email === currentUser.email);
      if (!myParent) { pc.innerHTML = '<div class="empty-state"><i class="fas fa-user-tie"></i><p>Profil parent non trouvé</p></div>'; return; }
      const ep = await API.get(`/parents/${myParent.id}`);
      const p = ep.data.data;
      const enfants = p.enfants || [];
      pc.innerHTML = `
      <div class="animate-fade">
        <div class="card mb-4" style="background:linear-gradient(135deg,#1a6b3c,#0f4a2a);color:white">
          <div class="card-body flex items-center gap-4">
            <div class="avatar" style="background:rgba(255,255,255,.2);width:60px;height:60px;font-size:1.5rem">${avatarLetters(p.nom,p.prenom)}</div>
            <div>
              <div class="text-xl font-bold">${sanitize(p.prenom)} ${sanitize(p.nom)}</div>
              <div class="opacity-80">${sanitize(p.profession||'')} — ${enfants.length} enfant(s)</div>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${enfants.map(e=>`
          <div class="card">
            <div class="card-header">
              <div class="flex items-center gap-2">
                <div class="avatar avatar-sm" style="background:${avatarColor(e.nom)}">${avatarLetters(e.nom,e.prenom)}</div>
                <span class="card-title">${sanitize(e.prenom)} ${sanitize(e.nom)}</span>
              </div>
              <span class="badge badge-blue">${sanitize(e.nom_classe||'')}</span>
            </div>
            <div class="card-body">
              <div class="flex gap-2 flex-wrap">
                <button class="btn btn-sm btn-primary" onclick="voirBulletin('${e.id}','${sanitize(e.prenom)} ${sanitize(e.nom)}')"><i class="fas fa-file-alt"></i> Bulletin</button>
                <button class="btn btn-sm btn-outline" onclick="voirEleve('${e.id}')"><i class="fas fa-eye"></i> Fiche</button>
                <button class="btn btn-sm btn-outline" onclick="voirFacturesEleve('${e.id}')"><i class="fas fa-file-invoice"></i> Factures</button>
                <button class="btn btn-sm btn-secondary" onclick="genererCarte('${e.id}')"><i class="fas fa-id-card"></i> Carte</button>
              </div>
            </div>
          </div>`).join('')}
        </div>
      </div>`;
    } else {
      pc.innerHTML = `<div class="empty-state"><i class="fas fa-user-graduate"></i><p>Espace élève en cours de développement</p><p class="text-xs mt-2">Consultez votre enseignant ou l'administration</p></div>`;
    }
  } catch(e) { pc.innerHTML = errHtml(e); }
}

async function voirFacturesEleve(eleveId) {
  try {
    const r = await API.get(`/factures/eleve/${eleveId}`);
    const factures = r.data.data || [];
    const stats = r.data.stats || {};
    openModal('Factures & Paiements', `
    <div class="grid grid-cols-3 gap-3 mb-4 text-center text-sm">
      <div class="p-3 rounded-lg" style="background:#e8f5ee"><div class="font-bold text-green-700">${fmtMoney(stats.total_paye)}</div><div class="text-gray-400 text-xs">Payé</div></div>
      <div class="p-3 rounded-lg" style="background:#fee2e2"><div class="font-bold text-red-600">${fmtMoney(stats.reste_a_payer)}</div><div class="text-gray-400 text-xs">Reste</div></div>
      <div class="p-3 rounded-lg bg-gray-50"><div class="font-bold">${fmtMoney(stats.total_du)}</div><div class="text-gray-400 text-xs">Total</div></div>
    </div>
    <div class="space-y-2">
      ${factures.map(f=>`<div class="flex items-center justify-between p-3 border rounded-lg">
        <div><div class="font-medium text-sm">${sanitize(f.libelle)}</div><div class="text-xs text-gray-400">${fmtDate(f.date_emission)}</div></div>
        <div class="text-right"><div class="font-bold">${fmtMoney(f.montant)}</div>${badgeStatut(f.statut)}</div>
      </div>`).join('') || '<p class="text-gray-400 text-center py-4">Aucune facture</p>'}
    </div>`);
  } catch(err) { toast(err.message, 'error'); }
}

// ==============================================================
// UTILITAIRES UI
// ==============================================================
function openModal(title, body, onConfirm = null, extraClass = '') {
  const root = $('modal-root');
  root.innerHTML = `
  <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal ${extraClass}">
      <div class="modal-header">
        <h3 class="modal-title">${sanitize(title)}</h3>
        <button class="close-btn" onclick="closeModal()"><i class="fas fa-times"></i></button>
      </div>
      <div class="modal-body">${body}</div>
      ${onConfirm ? `<div class="modal-footer">
        <button class="btn btn-outline" onclick="closeModal()">Annuler</button>
        <button class="btn btn-primary" id="modal-confirm-btn" onclick="handleModalConfirm()"><i class="fas fa-check"></i> Confirmer</button>
      </div>` : ''}
    </div>
  </div>`;
  window._modalConfirm = onConfirm;
}

async function handleModalConfirm() {
  const btn = $('modal-confirm-btn');
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="animate-spin">⟳</span> Traitement...'; }
  try {
    if (window._modalConfirm) await window._modalConfirm();
  } catch(e) {}
  if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-check"></i> Confirmer'; }
}

function closeModal() {
  const root = $('modal-root'); if(root) root.innerHTML = '';
  window._modalConfirm = null;
}

function switchTab(el, showId, hideId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const show = $(showId); const hide = $(hideId);
  if (show) show.style.display = '';
  if (hide) hide.style.display = 'none';
}

function canDo(...roles) { return roles.includes(currentUser?.role); }

function errHtml(e) {
  return `<div class="empty-state"><i class="fas fa-exclamation-triangle text-red-500" style="font-size:2rem"></i><p class="text-red-500 font-medium mt-2">Erreur de chargement</p><p class="text-gray-400 text-sm">${sanitize(e.message)}</p><button class="btn btn-outline btn-sm mt-3" onclick="navigate(currentPage)"><i class="fas fa-sync"></i> Réessayer</button></div>`;
}

// ==============================================================
// BULLETINS SCOLAIRES — Génération automatique
// ==============================================================
async function renderBulletins() {
  const pc = $('page-content');
  try {
    const [classesR, elevesR] = await Promise.all([
      API.get('/classes'),
      API.get('/eleves?per_page=200')
    ]);
    const classes = classesR.data.data || [];
    const eleves = elevesR.data.data || [];

    pc.innerHTML = `
    <div class="animate-fade">
      <!-- Bannière -->
      <div class="card mb-4" style="background:linear-gradient(135deg,#1a6b3c,#0f4a2a);color:white">
        <div class="card-body" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem">
          <div>
            <h2 style="font-size:1.2rem;font-weight:800"><i class="fas fa-file-alt mr-2"></i>Bulletins Scolaires</h2>
            <p style="opacity:.8;font-size:.85rem">Génération automatique des bulletins trimestriels avec calcul des moyennes et rangs</p>
          </div>
          <div class="flex gap-2 flex-wrap">
            ${canDo('admin','secretariat') ? `
            <button class="btn btn-secondary btn-sm" onclick="genererTousLesBulletins()">
              <i class="fas fa-magic"></i> Générer toute une classe
            </button>` : ''}
          </div>
        </div>
      </div>

      <!-- Filtres -->
      <div class="card mb-4">
        <div class="card-body">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label class="form-label">Classe</label>
              <select id="bull-classe" class="form-select" onchange="filtrerBulletins()">
                <option value="">Toutes les classes</option>
                ${classes.map(c=>`<option value="${c.id}">${sanitize(c.nom_classe)}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label">Trimestre</label>
              <select id="bull-trimestre" class="form-select" onchange="filtrerBulletins()">
                <option value="1">Trimestre 1</option>
                <option value="2">Trimestre 2</option>
                <option value="3">Trimestre 3</option>
              </select>
            </div>
            <div>
              <label class="form-label">Élève</label>
              <input id="bull-search" class="form-input" placeholder="Rechercher..." oninput="filtrerBulletins()">
            </div>
            <div class="flex items-end">
              <button class="btn btn-primary w-full" onclick="filtrerBulletins()">
                <i class="fas fa-search"></i> Rechercher
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Liste élèves pour bulletins -->
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-list mr-2 text-green-700"></i>Élèves — <span id="bull-count">${eleves.length}</span> élèves</span>
          ${canDo('admin','secretariat') ? `
          <button class="btn btn-sm btn-primary" onclick="genererTousLesBulletins()">
            <i class="fas fa-bolt"></i> Générer pour une classe
          </button>` : ''}
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Élève</th>
                <th>Matricule</th>
                <th>Classe</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="bull-tbody">
              ${renderBulletinRows(eleves)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Stats classe (si classe sélectionnée) -->
      <div id="bull-stats-section" style="display:none" class="mt-4"></div>
    </div>`;

    window._bullEleves = eleves;
    window._bullClasses = classes;
  } catch(e) { pc.innerHTML = errHtml(e); }
}

function renderBulletinRows(eleves) {
  if (!eleves.length) return '<tr><td colspan="4" class="text-center py-8 text-gray-400">Aucun élève trouvé</td></tr>';
  return eleves.map(e => `
  <tr>
    <td>
      <div class="flex items-center gap-2">
        <div class="avatar avatar-sm" style="background:${avatarColor(e.nom)}">${avatarLetters(e.nom, e.prenom)}</div>
        <div class="font-semibold">${sanitize(e.prenom)} ${sanitize(e.nom)}</div>
      </div>
    </td>
    <td><span class="font-mono text-xs bg-gray-100 px-2 py-1 rounded">${sanitize(e.matricule)}</span></td>
    <td>${e.nom_classe ? `<span class="badge badge-blue">${sanitize(e.nom_classe)}</span>` : '<span class="text-gray-400 text-xs">-</span>'}</td>
    <td>
      <div class="flex gap-1 flex-wrap">
        <button class="btn btn-sm btn-outline btn-icon" title="Voir bulletin T1" onclick="voirBulletin('${e.id}','${sanitize(e.prenom)} ${sanitize(e.nom)}',parseInt($('bull-trimestre')?.value||1))">
          <i class="fas fa-eye"></i> Voir
        </button>
        ${canDo('admin','secretariat','professeur') ? `
        <button class="btn btn-sm btn-primary btn-icon" title="Générer et enregistrer"
          onclick="genererEtEnregistrer('${e.id}','${sanitize(e.prenom)} ${sanitize(e.nom)}')">
          <i class="fas fa-save"></i> Générer
        </button>` : ''}
      </div>
    </td>
  </tr>`).join('');
}

function filtrerBulletins() {
  const q = ($('bull-search')?.value || '').toLowerCase();
  const cl = $('bull-classe')?.value || '';
  const filtered = (window._bullEleves || []).filter(e =>
    (!q || `${e.nom} ${e.prenom} ${e.matricule}`.toLowerCase().includes(q)) &&
    (!cl || e.classe_id === cl)
  );
  const tb = $('bull-tbody');
  if (tb) tb.innerHTML = renderBulletinRows(filtered);
  const cnt = $('bull-count');
  if (cnt) cnt.textContent = filtered.length;

  // Si une classe est sélectionnée, afficher les stats
  if (cl) chargerStatsBulletins(cl);
  else { const s = $('bull-stats-section'); if (s) s.style.display = 'none'; }
}

async function chargerStatsBulletins(classeId) {
  const trimestre = $('bull-trimestre')?.value || '1';
  const section = $('bull-stats-section');
  if (!section) return;
  try {
    const r = await API.get(`/bulletins/stats/${classeId}?trimestre=${trimestre}&annee_scolaire=2024-2025`);
    const s = r.data.data;
    if (!s) { section.style.display = 'none'; return; }

    section.style.display = 'block';
    section.innerHTML = `
    <div class="card">
      <div class="card-header">
        <span class="card-title"><i class="fas fa-chart-bar mr-2 text-purple-600"></i>Statistiques classe — Trimestre ${trimestre}</span>
      </div>
      <div class="card-body">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div class="stat-card">
            <div class="stat-icon" style="background:#e8f5ee"><span style="font-size:1.2rem">👥</span></div>
            <div><div class="stat-value">${s.effectif}</div><div class="stat-label">Effectif</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#dbeafe"><span style="font-size:1.2rem">📊</span></div>
            <div><div class="stat-value">${s.moyenne_classe}/20</div><div class="stat-label">Moyenne classe</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#d1fae5"><span style="font-size:1.2rem">🏆</span></div>
            <div><div class="stat-value">${s.taux_reussite}%</div><div class="stat-label">Taux de réussite</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon" style="background:#fef3c7"><span style="font-size:1.2rem">📈</span></div>
            <div><div class="stat-value">${s.moyenne_max}/20</div><div class="stat-label">Meilleure moy.</div></div>
          </div>
        </div>
        <div>
          <p class="font-semibold text-sm text-gray-600 mb-2">Répartition des mentions :</p>
          <div class="flex flex-wrap gap-2">
            ${Object.entries(s.repartition_mentions).map(([m,nb])=>`
              <div class="px-3 py-2 rounded-lg text-sm font-medium" style="background:#f1f5f9">
                ${m} : <span class="font-bold text-green-700">${nb}</span>
              </div>`).join('')}
          </div>
        </div>
      </div>
    </div>`;
  } catch(e) { section.style.display = 'none'; }
}

async function genererEtEnregistrer(eleveId, nom) {
  const trimestre = parseInt($('bull-trimestre')?.value || '1');
  try {
    const r = await API.post(`/bulletins/generer/${eleveId}`, { trimestre, annee_scolaire: '2024-2025' });
    if (r.data.success) {
      toast(`✅ ${r.data.message}`, 'success');
    }
  } catch(err) { toast(err.response?.data?.error || err.message, 'error'); }
}

async function genererTousLesBulletins() {
  const classeId = $('bull-classe')?.value;
  const trimestre = parseInt($('bull-trimestre')?.value || '1');
  if (!classeId) {
    toast('Veuillez sélectionner une classe d\'abord.', 'warning');
    return;
  }
  const classe = (window._bullClasses || []).find(c => c.id === classeId);
  openModal('Générer les bulletins', `
    <div class="text-center p-4">
      <div style="font-size:3rem">📋</div>
      <p class="text-gray-700 mt-3">Générer les bulletins du <strong>Trimestre ${trimestre}</strong> pour toute la classe <strong>${sanitize(classe?.nom_classe || '')}</strong> ?</p>
      <p class="text-gray-400 text-sm mt-2">Cette opération calculera les moyennes, attribuera les rangs et enverra des notifications aux parents.</p>
    </div>`,
    async () => {
      try {
        const r = await API.post(`/bulletins/generer-classe/${classeId}`, { trimestre, annee_scolaire: '2024-2025' });
        if (r.data.success) {
          toast(`✅ ${r.data.message}`, 'success');
          closeModal();
          chargerStatsBulletins(classeId);
        }
      } catch(err) { toast(err.response?.data?.error || err.message, 'error'); }
    }
  );
}
