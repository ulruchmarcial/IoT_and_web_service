// capteurs.js — Module d'acquisition DHT11 (GTI700, labo 1, tâche 1.1)
// Lance capteurs/dht11.py, lit sa sortie ligne par ligne ("temp,hum")
// et maintient l'historique (max 720 valeurs = 1 h à 3 s).
//
// Utilisation autonome : node capteurs.js   → affiche les lectures
// Utilisation module   : const capteurs = require('./capteurs')

const { spawn } = require('child_process');
const readline = require('readline');
const path = require('path');

const SCRIPT = path.join(__dirname, 'capteurs', 'dht11.py');
const MAX_HIST = 720;

// Historiques : tableaux de [timestamp, valeur]
const historiques = { temp: [], hum: [] };
const abonnes = [];      // fonctions appelées à chaque nouvelle lecture
let processus = null;

// "2026/11/04 15:43:07" (heure locale)
function horodatage(d = new Date()) {
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ` +
         `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function ajouter(type, ts, valeur) {
  const h = historiques[type];
  h.push([ts, valeur]);
  if (h.length > MAX_HIST) h.shift();   // purge de la plus ancienne
}

function traiterLigne(ligne) {
  const [t, h] = ligne.trim().split(',').map(Number);
  if (!Number.isFinite(t) || !Number.isFinite(h)) return;   // ligne invalide ignorée
  const ts = horodatage();
  ajouter('temp', ts, t);
  ajouter('hum', ts, h);
  abonnes.forEach((f) => f({ ts, temp: t, hum: h }));
}

function demarrer() {
  if (processus) return;
  // -u : sortie non tamponnée (en plus du flush côté Python)
  processus = spawn('python3', ['-u', SCRIPT]);

  readline.createInterface({ input: processus.stdout }).on('line', traiterLigne);
  processus.stderr.on('data', (d) => console.error('[dht11.py] ' + d.toString().trim()));

  processus.on('exit', (code) => {
    console.error(`[capteurs] dht11.py terminé (code ${code}), redémarrage dans 2 s`);
    processus = null;
    setTimeout(demarrer, 2000);
  });
}

function arreter() {
  if (processus) {
    processus.removeAllListeners('exit');   // pas de redémarrage
    processus.kill('SIGTERM');              // dht11.py libère le GPIO
    processus = null;
  }
}

// --- API exposée au serveur ---
function verifierType(type) {
  if (!historiques[type]) throw new Error(`Type inconnu : ${type}`);
}

// Dernière valeur (null si aucune lecture encore)
function derniere(type) {
  verifierType(type);
  const h = historiques[type];
  return h.length ? h[h.length - 1][1] : null;
}

// n dernières valeurs [[ts, val], ...] (toutes si moins de n)
function historique(type, n) {
  verifierType(type);
  return historiques[type].slice(-n);
}

// Moyenne des n dernières valeurs, arrondie à 0.1 (null si aucune)
function moyenne(type, n) {
  const h = historique(type, n);
  if (!h.length) return null;
  const somme = h.reduce((acc, [, v]) => acc + v, 0);
  return Math.round((somme / h.length) * 10) / 10;
}

function surLecture(f) { abonnes.push(f); }

module.exports = { demarrer, arreter, derniere, historique, moyenne, surLecture, MAX_HIST };

// --- Exécution autonome (tâche 1.1) ---
if (require.main === module) {
  surLecture(({ ts, temp, hum }) =>
    console.log(`${ts}  Température: ${temp.toFixed(1)} °C  Humidité: ${hum.toFixed(1)} %`));
  demarrer();
  console.log('Lecture du DHT11 toutes les 3 s (Ctrl+C pour arrêter)...');
  process.on('SIGINT', () => { arreter(); process.exit(0); });
}
