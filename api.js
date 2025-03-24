const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const multer = require('multer');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000; // Utilisez le port défini par l'hébergeur ou 3000 par défaut

// Chemin vers la base de données SQLite
const dbPath = path.resolve(__dirname, './bdd/database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur lors de la connexion à la base de données :', err.message);
  } else {
    console.log('Connexion à la base de données SQLite réussie.');
  }
});

// Middleware pour gérer les erreurs CORS (si nécessaire)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Middleware pour servir les fichiers statiques (HTML, CSS, JS, etc.)
app.use(express.static(path.resolve(__dirname, '../'))); // Sert les fichiers statiques depuis la racine du projet
app.use(bodyParser.json());

// Configuration de multer pour stocker les images dans le dossier /img
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'img'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  },
});

const upload = multer({ storage });

// Route pour vérifier si la base de données est accessible
app.get('/api/status', (req, res) => {
    console.log('Appel reçu sur /api/status');
  db.get('SELECT 1', [], (err) => {
    if (err) {
      console.error('Erreur de connexion à la base de données :', err.message);
      res.status(500).json({ error: 'Base de données inaccessible' });
    } else {
      res.json({ status: 'OK' });
    }
  });
});

// Route pour récupérer les articles actifs triés par `order`
app.get('/api/articles', (req, res) => {
    console.log('Appel reçu sur /api/articles');
  const query = 'SELECT * FROM articles WHERE is_active = 1 ORDER BY `order` ASC, updated_at DESC'; // Retourne uniquement les articles actifs
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Erreur lors de la récupération des articles :', err.message);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    } else {
      res.json(rows);
    }
  });
});

// Route pour récupérer tous les articles triés par `order`
app.get('/api/articles/all', (req, res) => {
  console.log('Appel reçu sur /api/articles/all');
  const query = 'SELECT * FROM articles ORDER BY `order` ASC, updated_at DESC'; // Retourne tous les articles
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Erreur lors de la récupération des articles :', err.message);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    } else {
      res.json(rows);
    }
  });
});

// Route pour ajouter un article
app.post('/api/articles', express.json(), (req, res) => {
  const { title, subtitle, image, alt, content, phone, is_active, order } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Les champs "title" et "content" sont obligatoires.' });
  }

  const query = `INSERT INTO articles (title, subtitle, image, alt, content, phone, is_active, \`order\`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  db.run(query, [title, subtitle, image || null, alt || null, content, phone || null, is_active || 1, order || 1], function (err) {
    if (err) {
      console.error('Erreur lors de l\'ajout de l\'article :', err.message);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    } else {
      res.status(201).json({ id: this.lastID });
    }
  });
});

// Route pour modifier un article ou son statut
app.put('/api/articles/:id', express.json(), (req, res) => {
  const { id } = req.params;
  const { title, subtitle, image, alt, content, phone, is_active, order } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Les champs "title" et "content" sont obligatoires.' });
  }

  const query = `
    UPDATE articles
    SET title = ?, subtitle = ?, image = ?, alt = ?, content = ?, phone = ?, is_active = ?, \`order\` = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;
  const params = [title, subtitle, image, alt, content, phone, is_active, order, id];

  db.run(query, params, function (err) {
    if (err) {
      console.error('Erreur lors de la modification de l\'article :', err.message);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Article non trouvé.' });
    } else {
      res.json({ updated: this.changes });
    }
  });
});

// Route pour supprimer un article
app.delete('/api/articles/:id', (req, res) => {
  const { id } = req.params;
  const query = `DELETE FROM articles WHERE id = ?`;
  db.run(query, [id], function (err) {
    if (err) {
      console.error('Erreur lors de la suppression de l\'article :', err.message);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    } else {
      res.json({ deleted: this.changes });
    }
  });
});

// Route pour récupérer un article par ID
app.get('/api/articles/:id', (req, res) => {
  const { id } = req.params;
  const query = `SELECT * FROM articles WHERE id = ?`;
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error('Erreur lors de la récupération de l\'article :', err.message);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    } else {
      res.json(row);
    }
  });
});

// Route pour uploader une image
app.post('/api/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Aucun fichier téléchargé.' });
  }

  res.json({ filePath: `/img/${req.file.filename}` });
});

// Route pour gérer l'authentification
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  const query = `SELECT * FROM admins WHERE username = ?`;
  db.get(query, [username], async (err, row) => {
    if (err) {
      console.error('Erreur lors de la vérification des identifiants :', err.message);
      return res.status(500).json({ error: 'Erreur interne du serveur.' });
    }

    if (!row) {
      console.error('Utilisateur non trouvé pour le username :', username);
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    try {
      const isMatch = await bcrypt.compare(password, row.password);

      if (isMatch) {
        res.status(200).json({ message: 'Connexion réussie.' });
      } else {
        console.error('Le mot de passe fourni ne correspond pas.');
        res.status(401).json({ error: 'Identifiants incorrects.' });
      }
    } catch (compareError) {
      console.error('Erreur lors de la comparaison des mots de passe :', compareError.message);
      res.status(500).json({ error: 'Erreur interne du serveur.' });
    }
  });
});

// Route pour créer un nouvel administrateur
app.post('/api/admins', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Les champs "username" et "password" sont obligatoires.' });
  }

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      return res.status(500).json({ error: 'Erreur lors du hachage du mot de passe.' });
    }

    const query = `INSERT INTO admins (username, password) VALUES (?, ?)`;
    db.run(query, [username, hashedPassword], function (err) {
      if (err) {
        console.error('Erreur lors de l\'ajout de l\'administrateur :', err.message);
        return res.status(500).json({ error: 'Erreur interne du serveur.' });
      }
      res.status(201).json({ id: this.lastID });
    });
  });
});

// Route pour afficher le contenu de la table admins (à des fins de débogage)
app.get('/api/admins', (req, res) => {
  const query = `SELECT id, username FROM admins`; // Ne pas inclure les mots de passe pour des raisons de sécurité
  db.all(query, [], (err, rows) => {
    if (err) {
      console.error('Erreur lors de la récupération des administrateurs :', err.message);
      res.status(500).json({ error: 'Erreur interne du serveur' });
    } else {
      res.json(rows);
    }
  });
});

// Gestion des routes non trouvées
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ error: 'Route API non trouvée.' });
  } else {
    next();
  }
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`API en cours d'exécution sur http://localhost:${PORT}`);
});
