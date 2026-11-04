// serveur-front.js — Front-end (machine B, port 8889) — GTI700 labo 1, partie 3
// Sert la page /affichage ainsi que ses fichiers CSS/JS et Chart.js (copie locale).
// Les données sont récupérées côté client depuis le back-end du Pi A.

const express = require('express');
const path = require('path');

const PORT = 8889;
const app = express();

// Fichiers statiques : affichage.css, affichage.js
app.use('/static', express.static(path.join(__dirname, 'public')));

// Chart.js servi localement (aucune dépendance à Internet pendant la démo)
app.get('/static/chart.umd.min.js', (req, res) =>
  res.sendFile(path.join(__dirname, 'node_modules', 'chart.js', 'dist', 'chart.umd.min.js')));

// Page principale
app.get('/affichage', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'affichage.html')));

app.get('/', (req, res) => res.redirect('/affichage'));

app.listen(PORT, '0.0.0.0', () =>
  console.log(`Front-end à l'écoute : http://localhost:${PORT}/affichage`));
