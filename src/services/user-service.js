import { findUserByUsernamePassword, getAllUsers, addUser, userExists, updateLastLogin, setUserStatus as repoSetUserStatus, logicalDeleteUser, getUserStats } from "../repositories/user-repository.js";
import { hashPassword } from "../utils/crypto.js";

export async function loginWithPassword(db, username, password) {
  const hashedPassword = await hashPassword(password);
  const user = await findUserByUsernamePassword(db, username, hashedPassword);
  
  if (user) {
    if (user.status === 1) {
      throw new Error("账号已被停用");
    }
    // 异步更新登录时间
    updateLastLogin(db, user.id).catch(console.error);
  }
  
  return user;
}

export async function listUsers(db) {
  return getAllUsers(db);
}

export async function getUserSummary(db) {
  const users = await getAllUsers(db);
  const stats = await getUserStats(db);
  return { users, stats };
}

export async function createUser(db, userData) {
  const { username, password } = userData;
  const exists = await userExists(db, username);
  if (exists) {
    return { ok: false, msg: "用户名已存在", status: 409 };
  }

  const hashedPassword = await hashPassword(password);
  await addUser(db, { ...userData, password: hashedPassword });
  return { ok: true, msg: "注册成功", status: 200 };
}

export async function setUserStatus(db, userId, status) {
  await repoSetUserStatus(db, userId, status);
  return { ok: true, msg: status === 0 ? "已启用" : "已停用" };
}

export async function deleteUser(db, userId) {
  await logicalDeleteUser(db, userId);
  return { ok: true, msg: "用户已删除" };
}
