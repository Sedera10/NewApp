# 🔄 Flux de données : De React au Backend (PostgreSQL)

Ce guide détaille le flux complet d'une donnée, depuis sa saisie dans un formulaire React jusqu'à son stockage dans une base de données PostgreSQL, puis son retour au frontend. C'est le cycle de vie **Requête / Réponse (Request / Response)**.

## 🗺️ Vue d'ensemble du flux
`React (Formulaire)` ➔ `Fetch (HTTP)` ➔ `Route (Express)` ➔ `Controller (Node)` ➔ `Base de données (Postgres)` ➔ `Controller` ➔ `React`

---

## Étape 1 : Le Frontend (React - Formulaire ou URL)
L'utilisateur saisit ses informations ou clique sur un lien (ex: profil).
- **Depuis un Formulaire** : Les champs sont stockés dans le state (`useState`), prêts à être envoyés.
- **Depuis l'URL** : Identifiant ou filtre dans la barre d'adresse (`/users/1` ou `?role=admin`).

## Étape 2 : L'envoi de la requête (Fetch / Axios)
Ton app React fait une requête HTTP vers l'API backend pour envoyer (POST) ou lire (GET) les données.

```javascript
/* Exemple dans ton fichier Form.jsx */
const handleSubmit = async (e) => {
    e.preventDefault();
    
    // La requête vers le backend sur le PORT 5000
    const response = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Sedera', email: 'sedera@email.com' })
    });
    
    const data = await response.json();
    console.log(data); // Affiche la réponse générée à l'étape 7
};
```

## Étape 3 : Le Serveur & La Route (Express routing)
La requête frappe la porte du serveur Node sur le **Port 5000**.
Le serveur intercepte le corps de la requête grâce au middleware `app.use(express.json())`.
Ensuite, le routeur Express identifie le chemin URI (`/api/users`) et la méthode (`POST`), puis appelle le contrôleur approprié.

```javascript
/* routes/userRoutes.js */
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController-pg');

// Express dit "Ah, c'est un POST sur '/', j'envoie ça à createUser"
router.post('/', userController.createUser); 
```

## Étape 4 : Le Contrôleur (Logique métier)
Le contrôleur est la fonction qui sait quoi faire avec les données de la requête web. Il lit les données entrantes.
- Soit via **`req.body`** : les données du formulaire `POST`/`PUT`.
- Soit via **`req.params`** : les variables dans l'URL (`/users/:id` donne `req.params.id`).
- Soit via **`req.query`** : les paramètres de recherche (`?role=admin` donne `req.query.role`).

## Étape 5 : L'interaction BDD (PostgreSQL)
Le contrôleur formule une requête SQL et utilise le module `pg` pour contacter le serveur PostgreSQL sur le **Port 5432**.

```javascript
/* controllers/userController-pg.js */
exports.createUser = async (req, res) => {
    const { name, email } = req.body; // 👈 Étape 4 : extraction

    try {
        // 👈 Étape 5 : Requête à PostgreSQL
        const queryText = 'INSERT INTO users(name, email) VALUES($1, $2) RETURNING *';
        const { rows } = await pool.query(queryText, [name, email]);
        
        /* ... suite à l'étape 6 */
```

## Étape 6 : La Réponse (Backend -> Frontend)
PostgreSQL traite l'insert, renvoie la ligne nouvellement créée au contrôleur (`rows`), et le contrôleur renvoie cette donnée formattée en JSON au client React, en fixant le code HTTP de succès (ex: `201 Created` ou `200 OK`).

```javascript
        /* suite du controller */
        
        // 👈 Étape 6 : Envoi de la réponse JSON au frontend
        res.status(201).json(rows[0]); 

    } catch (error) {
        res.status(500).json({ message: error.message }); // En cas de problème
    }
};
```

## Étape 7 : L'affichage (Retour dans React)
La promesse du `await fetch()` de l'**Étape 2** est enfin résolue !
L'application React reçoit la réponse JSON du serveur avec succès, met à jour son état interne pour refléter l'ajout, et peut optionnellement naviguer ou afficher une notification : `alert('Utilisateur ajouté avec succès !');`.

---
*Fichier généré le 5 Mai 2026*