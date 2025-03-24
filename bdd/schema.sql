--DROP TABLE IF EXISTS articles;
--DROP TABLE IF EXISTS admins;

-- Création des tables
-- CREATE TABLE IF NOT EXISTS articles (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     title TEXT NOT NULL,
--     subtitle TEXT,
--     image TEXT,
--     alt TEXT,
--     content TEXT NOT NULL,
--     phone TEXT,
--     is_active INTEGER DEFAULT 1, -- 1 pour actif, 0 pour inactif
--     updated_at TEXT DEFAULT CURRENT_TIMESTAMP -- Date de dernière modification
-- );

-- Création de la table pour les administrateurs
-- CREATE TABLE IF NOT EXISTS admins (
--     id INTEGER PRIMARY KEY AUTOINCREMENT,
--     username TEXT NOT NULL UNIQUE,
--     password TEXT NOT NULL
-- );

-- Insertion de données
-- INSERT INTO articles (title, subtitle, image, alt, content, phone, is_active) VALUES
-- ('Quest ce que le spray Tan ?', 'Bronzage par brumisation', './img/soins/avatar.jpg', 'Fatia Romeu Botan paris 11', 'Le spray tan est une technique de bronzage par brumisation qui utilise la DHA pour colorer la peau de manière naturelle.', '06 11 14 23 09', 1),
-- ('La magie BOTAN à Paris 9e', 'Bronzage sans soleil', './img/soins/botan.jpg', 'bronzage Botan paris 11', 'Découvrez les bienfaits de BOTAN, une gamme de produits de bronzage sans UV, naturels et sans paraben.', '06 11 14 23 09', 1),
-- ('Nouveauté : Service à domicile', 'Spray Tan BOTAN', './img/soins/botan-fatia-neyla.jpg', 'bronzage Botan service à domicile', 'Profitez de notre service de spray tan à domicile pour un bronzage parfait sans quitter votre maison.', '06 11 14 23 09', 0);

-- Insertion d'un administrateur par défaut
--INSERT INTO admins (username, password) VALUES
--('admin', '$2b$10$nUGISGOEYHWuWwIU5WdW7e2RBE93IoWsxFH7BPJJ9DvywTcgy0Hoq'); -- Remplacez par un mot de passe haché valide


ALTER TABLE articles ADD COLUMN `order` INTEGER DEFAULT 1;

-- Mettre à jour les articles existants avec des valeurs d'ordre par défaut
UPDATE articles SET `order` = 1 WHERE `order` IS NULL;