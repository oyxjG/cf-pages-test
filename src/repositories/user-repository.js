export async function findUserByUsernamePassword(db, username, hashedPassword) {
  const { results } = await db
    .prepare("SELECT id, username, nick_name, avatar, role, status FROM users WHERE username = ? AND password = ? AND is_delete = 0")
    .bind(username, hashedPassword)
    .all();

  if (!results || results.length === 0) {
    return null;
  }

  return results[0];
}

export async function getAllUsers(db) {
  const { results } = await db
    .prepare("SELECT id, username, nick_name, email, phone, role, status, last_login_at, created_at FROM users WHERE is_delete = 0 ORDER BY id DESC")
    .all();

  return results || [];
}

export async function userExists(db, username) {
  const row = await db
    .prepare("SELECT id FROM users WHERE username = ?")
    .bind(username)
    .first();

  return Boolean(row);
}

export async function addUser(db, { username, password, nick_name, phone, email }) {
  return db
    .prepare("INSERT INTO users (username, password, nick_name, phone, email, status, is_delete) VALUES (?, ?, ?, ?, ?, 0, 0)")
    .bind(username, password, nick_name || username, phone || null, email || null)
    .run();
}

export async function updateLastLogin(db, userId) {
  return db
    .prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?")
    .bind(userId)
    .run();
}

export async function toggleUserStatus(db, userId, newStatus) {
  return db
    .prepare("UPDATE users SET status = ? WHERE id = ?")
    .bind(newStatus, userId)
    .run();
}

export async function logicalDeleteUser(db, userId) {
  return db
    .prepare("UPDATE users SET is_delete = 1 WHERE id = ?")
    .bind(userId)
    .run();
}
