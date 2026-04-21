let currentUser = null;

function showMessage(elId, type, text) {
  const el = document.getElementById(elId);
  el.className = `msg ${type}`;
  el.innerText = text;
}

function clearMessage(elId) {
  const el = document.getElementById(elId);
  el.className = "msg";
  el.innerText = "";
}

async function login() {
  clearMessage("loginMsg");

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !password) {
    showMessage("loginMsg", "error", "请输入用户名和密码");
    return;
  }

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!data.ok) {
      showMessage("loginMsg", "error", data.msg || "登录失败");
      return;
    }

    currentUser = data.user;
    document.getElementById("loginView").classList.add("hidden");
    document.getElementById("adminView").classList.remove("hidden");
    document.getElementById("welcomeText").innerText = `当前登录用户：${currentUser.username}`;

    await loadUsers();
  } catch (err) {
    showMessage("loginMsg", "error", `请求失败：${err.message}`);
  }
}

async function loadUsers() {
  clearMessage("adminMsg");

  try {
    const res = await fetch("/api/users");
    const data = await res.json();

    if (!data.ok) {
      showMessage("adminMsg", "error", data.msg || "加载用户失败");
      return;
    }

    const tbody = document.getElementById("userTableBody");

    if (!data.data || data.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3">暂无数据</td></tr>';
      return;
    }

    tbody.innerHTML = data.data
      .map(
        (user) => `
          <tr>
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.created_at || ""}</td>
          </tr>
        `
      )
      .join("");
  } catch (err) {
    showMessage("adminMsg", "error", `加载失败：${err.message}`);
  }
}

async function addUser() {
  clearMessage("adminMsg");

  const username = document.getElementById("newUsername").value.trim();
  const password = document.getElementById("newPassword").value.trim();

  if (!username || !password) {
    showMessage("adminMsg", "error", "请输入新用户名和密码");
    return;
  }

  try {
    const res = await fetch("/api/add-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!data.ok) {
      showMessage("adminMsg", "error", data.msg || "新增失败");
      return;
    }

    showMessage("adminMsg", "success", data.msg || "新增成功");
    document.getElementById("newUsername").value = "";
    document.getElementById("newPassword").value = "";
    await loadUsers();
  } catch (err) {
    showMessage("adminMsg", "error", `请求失败：${err.message}`);
  }
}

function logout() {
  currentUser = null;
  document.getElementById("adminView").classList.add("hidden");
  document.getElementById("loginView").classList.remove("hidden");
  document.getElementById("welcomeText").innerText = "";
  document.getElementById("username").value = "";
  document.getElementById("password").value = "";
  clearMessage("loginMsg");
  clearMessage("adminMsg");
}

document.getElementById("loginBtn").addEventListener("click", login);
document.getElementById("refreshBtn").addEventListener("click", loadUsers);
document.getElementById("addUserBtn").addEventListener("click", addUser);
document.getElementById("logoutBtn").addEventListener("click", logout);
