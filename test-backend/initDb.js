require('dotenv').config();
const mysql = require('mysql2/promise');

async function init() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    port: process.env.MYSQL_PORT || 3306
  });

  const dbName = process.env.MYSQL_DATABASE || 'mystore';
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
  await connection.query(`USE \`${dbName}\``);

  console.log("Création des tables...");

  await connection.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fullname VARCHAR(255),
      email VARCHAR(255)
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255)
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      categoryId INT,
      name VARCHAR(255),
      price DECIMAL(10,2)
    )
  `);

  console.log("Nettoyage des tables existantes...");
  await connection.query(`DELETE FROM products`);
  await connection.query(`DELETE FROM categories`);
  await connection.query(`DELETE FROM users`);

  console.log("Insertion des données par défaut...");
  await connection.query(`INSERT INTO users (fullname, email) VALUES ('Admin Test', 'admin@mystore.com'), ('Jean Dupont', 'jean@exemple.com')`);
  await connection.query(`INSERT INTO categories (name) VALUES ('Vêtements'), ('Accessoires'), ('Maison')`);
  await connection.query(`INSERT INTO products (categoryId, name, price) VALUES (1, 'T-shirt Basic', 15.00), (2, 'Mug Design', 8.00), (3, 'Lampe de bureau', 25.00)`);

  console.log("Base de données initialisée avec succès !");
  process.exit();
}

init().catch(err => {
    console.error("Erreur lors de l'initialisation :", err);
    process.exit(1);
});