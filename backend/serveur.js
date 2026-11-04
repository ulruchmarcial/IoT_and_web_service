// serveur.js — Back-end (Raspberry Pi A, port 8080) — GTI700 labo 1, partie 2
// Routes :
//   GET /capteurs/temp            → dernière température      (ex. 21.4)
//   GET /capteurs/temp/:n         → n dernières [ts, val] JSON
//   GET /capteurs/temp/:n/moy     → moyenne des n dernières   (ex. 20.5)
//   GET /capteurs/hum, /capteurs/hum/:n, /capteurs/hum/:n/moy  (ex. 75.4%)

const express = require('express');
const cors = require('cors');
const capteurs = require('./capteurs');

const PORT = 8080;
const app = express();

// CORS : la page /affichage est servie par la machine B (autre origine)
app.use(cors());

// Formatage de la valeur selon le capteur
function formater(type, valeur) {
  return type === 'hum' ? `${valeur.toFixed(1)}%` : valeur.toFixed(1);
}

// Valide :type (temp | hum) ; sinon 404
function validerType(req, res, next) {
  if (req.params.type !== 'temp' && req.params.type !== 'hum') {
    return res.status(404).type('text/plain').send('Capteur inconnu (temp ou hum)');
  }
  next();
}

// Valide :n (entier ≥ 1, plafonné à 720) ; sinon 400
function validerN(req, res, next) {
  const n = Number(req.params.n);
  if (!Number.isInteger(n) || n < 1) {
    return res.status(400).type('text/plain').send('n doit être un entier positif');
  }
  req.n = Math.min(n, capteurs.MAX_HIST);
  next();
}

// 1) Dernière valeur
app.get('/capteurs/:type', validerType, (req, res) => {
  const v = capteurs.derniere(req.params.type);
  if (v === null) return res.status(503).type('text/plain').send('Aucune donnée disponible');
  res.type('text/plain').send(formater(req.params.type, v));
});

// 2) Historique des n dernières valeurs (JSON)
app.get('/capteurs/:type/:n', validerType, validerN, (req, res) => {
  res.json(capteurs.historique(req.params.type, req.n));
});

// 3) Moyenne des n dernières valeurs
app.get('/capteurs/:type/:n/moy', validerType, validerN, (req, res) => {
  const m = capteurs.moyenne(req.params.type, req.n);
  if (m === null) return res.status(503).type('text/plain').send('Aucune donnée disponible');
  res.type('text/plain').send(formater(req.params.type, m));
});

// Toute autre URL
app.use((req, res) => res.status(404).type('text/plain').send('Route inexistante'));

capteurs.demarrer();
app.listen(PORT, '0.0.0.0', () => console.log(`Back-end à l'écoute sur le port ${PORT}`));

// Arrêt propre : libère le GPIO
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { capteurs.arreter(); process.exit(0); });
}
