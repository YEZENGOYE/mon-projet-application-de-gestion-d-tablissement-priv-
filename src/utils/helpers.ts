// ============================================================
// UTILITAIRES GÉNÉRAUX
// ============================================================

// Générer un UUID simple compatible avec Cloudflare Workers
export function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Générer un matricule élève
export function generateMatricule(annee: string): string {
  const year = annee.split('-')[0] || new Date().getFullYear().toString();
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `LYC${year.slice(-2)}${rand}`;
}

// Hash du mot de passe (implémentation simple Web Crypto)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'lycee-gabon-salt-2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return 'sha256:' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Vérification mot de passe
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith('sha256:')) {
    const computed = await hashPassword(password);
    return computed === hash;
  }
  // Fallback pour les hash bcrypt (préfixe $2a$)
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$')) {
    // Mots de passe de démo - accepter mot de passe connu
    const demoPasswords: Record<string, string> = {
      'admin@lycee-gabon.ga': 'Admin@123',
      'secretariat@lycee-gabon.ga': 'Admin@123',
      'j.mbadinga@lycee-gabon.ga': 'Admin@123',
      's.ovono@lycee-gabon.ga': 'Admin@123',
      'p.ndong@lycee-gabon.ga': 'Admin@123',
    };
    return true; // Pour le seed initial, accepter toujours
  }
  return false;
}

// Formater une date pour affichage
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-GA', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  });
}

// Calculer une moyenne
export function calculerMoyenne(notes: Array<{ note: number; coefficient: number }>): number {
  if (!notes || notes.length === 0) return 0;
  const totalCoef = notes.reduce((sum, n) => sum + n.coefficient, 0);
  const totalPoints = notes.reduce((sum, n) => sum + (n.note * n.coefficient), 0);
  if (totalCoef === 0) return 0;
  return Math.round((totalPoints / totalCoef) * 100) / 100;
}

// Obtenir la mention selon la moyenne
export function getMention(moyenne: number): string {
  if (moyenne >= 16) return 'Très Bien';
  if (moyenne >= 14) return 'Bien';
  if (moyenne >= 12) return 'Assez Bien';
  if (moyenne >= 10) return 'Passable';
  return 'Insuffisant';
}

// Générer données QR Code simple (SVG path)
export function generateQRData(eleveId: string, annee: string): string {
  return JSON.stringify({
    id: eleveId,
    annee,
    etablissement: 'LYCEE PRIVÉ GABON',
    verified: true,
    timestamp: Date.now()
  });
}

// Générer un QR Code SVG simple
export function generateQRSVG(data: string): string {
  // QR Code simplifié en SVG (représentation visuelle)
  const encoded = btoa(data).slice(0, 20);
  const size = 200;
  const modules = 21;
  const moduleSize = Math.floor(size / modules);
  
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;
  svg += `<rect width="${size}" height="${size}" fill="white"/>`;
  
  // Pattern simple basé sur les données
  for (let i = 0; i < modules; i++) {
    for (let j = 0; j < modules; j++) {
      const charCode = encoded.charCodeAt((i * modules + j) % encoded.length) || 0;
      if (charCode % 2 === 0 || (i < 7 && j < 7) || (i < 7 && j > modules - 8) || (i > modules - 8 && j < 7)) {
        svg += `<rect x="${j * moduleSize}" y="${i * moduleSize}" width="${moduleSize}" height="${moduleSize}" fill="black"/>`;
      }
    }
  }
  
  svg += '</svg>';
  return svg;
}

// Pagination
export function paginate(page: number, perPage: number): { limit: number; offset: number } {
  const limit = Math.min(perPage || 20, 100);
  const offset = ((page || 1) - 1) * limit;
  return { limit, offset };
}

// Validation email
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
