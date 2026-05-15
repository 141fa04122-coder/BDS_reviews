const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'reviews.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT UNIQUE,
    email TEXT UNIQUE,
    name TEXT,
    first_visit_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS survey_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER,
    session_id TEXT UNIQUE,
    overall_rating INTEGER,
    liked_food BOOLEAN,
    favourite_dishes TEXT,
    visit_frequency TEXT,
    food_preferences TEXT,
    cares_about_offers BOOLEAN,
    ambiance_preference TEXT,
    preferred_deals TEXT,
    wants_to_return BOOLEAN,
    additional_comments TEXT,
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers (id)
  );

  CREATE TABLE IF NOT EXISTS verification_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone_number TEXT,
    email TEXT,
    verified BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    last_attempt DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

module.exports = db;
