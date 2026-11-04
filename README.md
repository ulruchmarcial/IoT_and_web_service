# GTI700 — Laboratoire 1 (volet applicatif) : IoT et services web

Exposition des données d'un capteur DHT11 (température et humidité) branché sur un Raspberry Pi,
au moyen d'un service web Node.js/Express (back-end) et d'une page web (front-end).

## Déploiement

| Machine | Rôle | Port | Dossier |
|---|---|---|---|
| A : Raspberry Pi | Lecture du capteur + API `/capteurs/...` | 8080 | `backend/` |
| B : ordinateur | Page `/affichage` | 8889 | `frontend/` |
| C : navigateur | Affiche la page servie par B, qui interroge A | — | — |

## Back-end (Raspberry Pi A)

```bash
cd backend
npm install
node capteurs.js     # tâche 1.1 : affiche les lectures dans la console
node serveur.js      # API sur le port 8080
```

DHT11 branché sur GPIO17 (BCM). `capteurs/dht11.py` est lancé par `capteurs.js` et imprime une ligne `temp,hum` toutes les 3 s.

| Route | Réponse |
|---|---|
| `GET /capteurs/temp` | dernière température (ex. `27.3`) |
| `GET /capteurs/temp/:n` | `n` dernières valeurs `[[timestamp, valeur], ...]` (max 720) |
| `GET /capteurs/temp/:n/moy` | moyenne des `n` dernières valeurs |
| `GET /capteurs/hum`, `/capteurs/hum/:n`, `/capteurs/hum/:n/moy` | idem pour l'humidité (ex. `37.0%`) |

## Front-end (ordinateur B)

```bash
cd frontend
npm install
node serveur-front.js
```

Ouvrir `http://<IP de B>:8889/affichage`. L'adresse du back-end est définie dans `public/affichage.js`
et peut être remplacée avec `?api=http://<IP du Pi>:8080`.

La page se rafraîchit toutes les 3 s (fetch) et affiche un message d'erreur si le back-end est injoignable,
sans arrêter les nouvelles tentatives. Graphiques : Chart.js (servi localement). Mise en page deux colonnes :
CSS Grid écrit par l'équipe (aucun gabarit externe).

## Déclaration d'utilisation de l'IA générative

<!-- À compléter selon la politique du cours : outil utilisé, parties concernées, nature de l'aide. -->

## Équipe

<!-- Noms et codes permanents -->
