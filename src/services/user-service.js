import { findUserByUsernamePassword, getAllUsers, addUser, userExists } from "../repositories/user-repository.js";

export async function loginWithPassword(db, username, password) {
  return findUserByUsernamePassword(db, username, password);
}

export async function listUsers(db) {
  return getAllUsers(db);
}

export async function createUser(db, username, password) {
  const exists = await userExists(db, username);
  if (exists) {
    return { ok: false, msg: "用户名已存在", status: 409 };
  }

  await addUser(db, username, password);
  return { ok: true, msg: "新增成功", status: 200 };
}
