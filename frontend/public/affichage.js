// affichage.js — Code client de la page /affichage (GTI700 labo 1, partie 3)
// Interroge le back-end (Pi A) toutes les 3 s avec fetch, met à jour
// valeurs, moyennes, tableaux et graphiques sans recharger la page.

// Adresse du back-end : modifiable avec ?api=http://IP:8080 dans l'URL
const API = new URLSearchParams(location.search).get('api') || 'http://192.168.44.106:8080';
const N = 30;                 // nombre de valeurs affichées
const INTERVALLE = 3000;      // ms entre deux rafraîchissements
const DELAI_MAX = 2500;       // ms avant d'abandonner une requête

const CAPTEURS = {
  temp: { unite: '°C', couleur: '#d35400', nom: 'Température (°C)' },
  hum:  { unite: '%',  couleur: '#2471a3', nom: 'Humidité (%)' },
};

// --- Requêtes ---------------------------------------------------------------
// Lève une erreur sur problème réseau, délai dépassé ou code HTTP ≠ 2xx
async function requete(chemin, enJson) {
  const reponse = await fetch(API + chemin, { signal: AbortSignal.timeout(DELAI_MAX) });
  if (!reponse.ok) {
    throw new Error(`${chemin} → HTTP ${reponse.status} (${(await reponse.text()).trim()})`);
  }
  return enJson ? reponse.json() : reponse.text();
}

async function obtenir(type) {
  const [actuelle, historique, moyenne] = await Promise.all([
    requete(`/capteurs/${type}`, false),
    requete(`/capteurs/${type}/${N}`, true),
    requete(`/capteurs/${type}/${N}/moy`, false),
  ]);
  return { actuelle, historique, moyenne };
}

// --- Graphiques -------------------------------------------------------------
function creerGraphique(type) {
  const c = CAPTEURS[type];
  return new Chart(document.getElementById(`${type}-graphique`), {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: c.nom,
        data: [],
        borderColor: c.couleur,
        backgroundColor: c.couleur,
        pointRadius: 3,
        tension: 0.2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      scales: {
        x: { title: { display: true, text: 'Heure (hh:mm:ss)' } },
        y: { title: { display: true, text: c.nom } },
      },
      plugins: { legend: { display: false } },
    },
  });
}

const graphiques = { temp: creerGraphique('temp'), hum: creerGraphique('hum') };

// "2026/11/04 15:47:13" → "15:47:13"
const heure = (ts) => ts.split(' ')[1] || ts;

function majGraphique(type, historique) {
  const g = graphiques[type];
  const valeurs = historique.map(([, v]) => v);
  g.data.labels = historique.map(([ts]) => heure(ts));
  g.data.datasets[0].data = valeurs;

  // Axe Y ajusté autour des données pour rendre la variation visible
  if (valeurs.length) {
    const min = Math.min(...valeurs), max = Math.max(...valeurs);
    const marge = Math.max(1, (max - min) * 0.2);
    g.options.scales.y.min = Math.floor(min - marge);
    g.options.scales.y.max = Math.ceil(max + marge);
  }
  g.update();
}

// --- Affichage --------------------------------------------------------------
function majTableau(type, historique) {
  const tbody = document.getElementById(`${type}-tableau`);
  tbody.replaceChildren(...historique.slice().reverse().map(([ts, v]) => {
    const tr = document.createElement('tr');
    const td1 = document.createElement('td');
    const td2 = document.createElement('td');
    td1.textContent = ts;
    td2.textContent = v.toFixed(1);
    tr.append(td1, td2);
    return tr;
  }));
}

function avecUnite(type, texte) {
  const v = parseFloat(texte);       // "37.0%" → 37
  return Number.isFinite(v) ? `${v.toFixed(1)} ${CAPTEURS[type].unite}` : '--';
}

function afficher(type, { actuelle, historique, moyenne }) {
  document.getElementById(`${type}-actuelle`).textContent = avecUnite(type, actuelle);
  document.getElementById(`${type}-moyenne`).textContent = avecUnite(type, moyenne);
  majTableau(type, historique);
  majGraphique(type, historique);
}

function etat(ok, message) {
  document.getElementById('indicateur').className = 'pastille ' + (ok ? 'ok' : 'ko');
  document.getElementById('etat-texte').textContent = message;
  const bandeau = document.getElementById('erreur');
  bandeau.hidden = ok;
  if (!ok) bandeau.textContent = message;
}

// --- Boucle de rafraîchissement ------------------------------------------------
// setTimeout en chaîne : la requête suivante part 3 s après la fin de la
// précédente, donc pas d'accumulation si le Pi est lent ou injoignable.
async function rafraichir() {
  try {
    const [temp, hum] = await Promise.all([obtenir('temp'), obtenir('hum')]);
    afficher('temp', temp);
    afficher('hum', hum);
    etat(true, `Connecté à ${API} — mis à jour à ${new Date().toLocaleTimeString('fr-CA')}`);
  } catch (e) {
    const raison = e.name === 'TimeoutError' ? 'délai dépassé'
                 : e.name === 'TypeError' ? 'serveur injoignable'
                 : e.message;
    etat(false, `Erreur de communication avec le back-end (${raison}). ` +
                `Nouvelle tentative dans ${INTERVALLE / 1000} s… ` +
                `Dernières données affichées : voir horodatage du tableau.`);
    console.error(e);
  } finally {
    setTimeout(rafraichir, INTERVALLE);
  }
}

rafraichir();
