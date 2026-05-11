# 🚀 Guide de création d'un Backend Node.js (API REST + Base de Données)

Voici les étapes clés pour configurer un backend Node.js robuste, structuré et prêt pour la production.

---

## 1. Initialiser le projet

Ouvre ton terminal dans le dossier de ton backend :

```bash
mkdir mon-backend
cd mon-backend
npm init -y
```

## 2. Installer les dépendances

Installe les packages essentiels :

```bash
# Framework web, sécurité (CORS) et variables d'environnement
npm install express cors dotenv

# Driver de base de données (Exemple : MongoDB avec Mongoose OR PostgreSQL avec pg)
npm install mongoose 
# ou pour SQL : npm install pg
# pour mysql : npm install mysql2

# Outil de développement (redémarrage automatique)
npm install --save-dev nodemon
```

*Dans le `package.json`, ajoute le script de démarrage :*
```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```

---

## 3. Créer la structure du projet (Architecture MVC)

Une structure propre est la clé de la maintenabilité :

```
mon-backend/
├── .env                 # Variables de configuration (Mots de passe, Ports)
├── server.js            # Point d'entrée de l'application
├── config/              # Fichiers de configuration (ex: db.js)
├── models/              # Schémas de base de données
├── routes/              # Routes de l'API REST
└── controllers/         # Logique métier (Ce que fait chaque route)
```

---

## 4. Configurer l'environnement et la Base de données

**Fichier `.env`**
```env
PORT=5000

# Configuration MongoDB
MONGO_URI=mongodb://localhost:27017/ma_base_de_donnees

# Configuration PostgreSQL (Alternative)
PG_USER=postgres
PG_HOST=localhost
PG_DATABASE=ma_base_de_donnees
PG_PASSWORD=mon_mot_de_passe
PG_PORT=5432
```

**Fichier `config/db.js` (Exemple MongoDB)**
```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Base de données MongoDB connectée');
    } catch (error) {
        console.error('❌ Erreur de connexion:', error);
        process.exit(1);
    }
};

module.exports = connectDB;
```

**Fichier `config/db-pg.js` (Alternative PostgreSQL)**
```javascript
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.PG_USER,
    host: process.env.PG_HOST,
    database: process.env.PG_DATABASE,
    password: process.env.PG_PASSWORD,
    port: process.env.PG_PORT,
});

pool.on('connect', () => {
    console.log('✅ Base de données PostgreSQL connectée');
});

module.exports = pool;
```

---

## 5. Créer le modèle de données

**Fichier `models/User.js` (Exemple MongoDB)**
```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
```

**Fichier init.sql ou fonction d'init (Alternative PostgreSQL)**
*Où lancer ce code : Dans ton `server.js` au démarrage ou directement en SQL dans ton interface PgAdmin*
```javascript
const pool = require('../config/db-pg');

const createUsersTable = async () => {
    const queryText = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await pool.query(queryText);
    console.log("✅ Table users prête !");
};

// module.exports = createUsersTable;
```

---

## 6. Créer le Controller et la Route

**Fichier `controllers/userController.js` (Exemple MongoDB)**
```javascript
const User = require('../models/User');

// @desc    Obtenir tous les utilisateurs
// @route   GET /api/users
exports.getUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Créer un utilisateur
// @route   POST /api/users
exports.createUser = async (req, res) => {
    try {
        const newUser = await User.create(req.body);
        res.status(201).json(newUser);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
```

**Fichier `controllers/userController-pg.js` (Alternative PostgreSQL)**
```javascript
const pool = require('../config/db-pg');

exports.getUsers = async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM users');
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.createUser = async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const queryText = 'INSERT INTO users(name, email, password) VALUES($1, $2, $3) RETURNING *';
        const { rows } = await pool.query(queryText, [name, email, password]);
        res.status(201).json(rows[0]);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};
```

**Fichier `routes/userRoutes.js`**
```javascript
const express = require('express');
const router = express.Router();
const { getUsers, createUser } = require('../controllers/userController');

router.route('/')
    .get(getUsers)
    .post(createUser);

module.exports = router;
```

---

## 7. Assembler le Server.js

C'est ici que tout se connecte :

**Fichier `server.js`**
```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importer la bonne base de données :
const connectDB = require('./config/db'); // 👈 Pour MongoDB
// const pool = require('./config/db-pg'); // 👈 Pour PostgreSQL (Déjà connecté grâce à 'pg')

// Initialisation de la BDD (uniquement pour MongoDB)
connectDB();

const app = express();

// Middlewares
app.use(cors()); // Accepter les requêtes du Frontend React
app.use(express.json()); // Lire le Body en JSON
app.use(express.urlencoded({ extended: false })); // Lire les données de formulaire

// Routes
// Note : Si tu utilises PG, importe le controleur PG dans routes/userRoutes.js
app.use('/api/users', require('./routes/userRoutes'));

// Lancement du serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur le port ${PORT}`);
});
```

---

## 8. Lancer et Tester

Exécute la commande :
```bash
npm run dev
```

Tu as maintenant un backend RESTful qui écoute sur `http://localhost:5000/api/users`. Tu peux tester les routes GET et POST avec **Postman**, **Insomnia** ou un simple appel `fetch` depuis ton application React !