const Database = require("better-sqlite3");
const path = require("path");

// Set DB_PATH to a mounted volume in production (e.g. /data/french_bot.db on Railway)
// so vocab and history survive redeploys
const db = new Database(process.env.DB_PATH || path.join(__dirname, "french_bot.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS vocabulary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_phone TEXT NOT NULL,
    french TEXT NOT NULL,
    english TEXT NOT NULL,
    context TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_phone TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migration for databases created before the emoji column existed
const hasEmoji = db
  .prepare("SELECT COUNT(*) AS n FROM pragma_table_info('vocabulary') WHERE name = 'emoji'")
  .get().n > 0;
if (!hasEmoji) {
  db.exec("ALTER TABLE vocabulary ADD COLUMN emoji TEXT");
}

function addVocabulary(userPhone, french, english, context, emoji) {
  const stmt = db.prepare(
    "INSERT INTO vocabulary (user_phone, french, english, context, emoji) VALUES (?, ?, ?, ?, ?)"
  );
  stmt.run(userPhone, french, english, context, emoji ?? null);
}

function getRecentVocabulary(userPhone, limit = 20) {
  const stmt = db.prepare(
    "SELECT french, english, emoji, context, created_at FROM vocabulary WHERE user_phone = ? ORDER BY id DESC LIMIT ?"
  );
  return stmt.all(userPhone, limit);
}

function saveMessage(userPhone, role, content) {
  const stmt = db.prepare(
    "INSERT INTO conversations (user_phone, role, content) VALUES (?, ?, ?)"
  );
  stmt.run(userPhone, role, content);
}

function getConversationHistory(userPhone, limit = 20) {
  const stmt = db.prepare(
    "SELECT role, content FROM conversations WHERE user_phone = ? ORDER BY id DESC LIMIT ?"
  );
  return stmt.all(userPhone, limit).reverse();
}

function clearConversation(userPhone) {
  const stmt = db.prepare(
    "DELETE FROM conversations WHERE user_phone = ?"
  );
  stmt.run(userPhone);
}

module.exports = {
  addVocabulary,
  getRecentVocabulary,
  saveMessage,
  getConversationHistory,
  clearConversation,
};
