export async function findUserByUsernamePassword(db, username, password) {
  const { results } = await db
    .prepare("SELECT id, username, created_at FROM users WHERE username = ? AND password = ?")
    .bind(username, password)
    .all();

  if (!results || results.length === 0) {
    return null;
  }

  return results[0];
}

export async function getAllUsers(db) {
  const { results } = await db
    .prepare("SELECT id, username, created_at FROM users ORDER BY id ASC")
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

export async function addUser(db, username, password) {
  return db
    .prepare("INSERT INTO users (username, password) VALUES (?, ?)")
    .bind(username, password)
    .run();
}
