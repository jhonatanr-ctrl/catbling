const API_BASE = 'http://localhost/catbling/api';
// ─── Utilidad interna ────────────────────────────────────────
async function _request(url, options = {}) {
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data;
}

function _post(endpoint, body) {
  return _request(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Token / sesión ──────────────────────────────────────────
function apiGetToken() {
  return localStorage.getItem('api_token') || null;
}

function apiGetUser() {
  const u = localStorage.getItem('api_user');
  return u ? JSON.parse(u) : null;
}

function apiLogout() {
  localStorage.removeItem('api_token');
  localStorage.removeItem('api_user');
}

// ─── Auth ────────────────────────────────────────────────────
async function apiRegister(username, email, password) {
  try {
    const res = await _post('register.php', { username, email, password });
    if (res.success) {
      localStorage.setItem('api_token', res.token);
      localStorage.setItem('api_user', JSON.stringify(res.user));
    }
    return res;
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function apiLogin(email, password) {
  try {
    const res = await _post('login.php', { email, password });
    if (res.success) {
      localStorage.setItem('api_token', res.token);
      localStorage.setItem('api_user', JSON.stringify(res.user));
    }
    return res;
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── Password Reset ──────────────────────────────────────────
async function apiForgotPassword(email) {
  try {
    return await _post('forgot_password.php', { email });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function apiResetPassword(token, password) {
  try {
    return await _post('reset_password.php', { token, password });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── Configuración (idioma, volumen, animaciones) ────────────
async function apiGetConfig() {
  try {
    const token = apiGetToken();
    if (!token) return { success: false };
    const res = await _request(`${API_BASE}/get_config.php`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    return res;
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function apiSetConfig(config) {
  try {
    const token = apiGetToken();
    if (!token) return { success: false };
    return await _post('update_config.php', { token, ...config });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── Monedas ─────────────────────────────────────────────────
async function apiGetCoins() {
  try {
    const token = apiGetToken();
    if (!token) return { success: false };
    const res = await _request(`${API_BASE}/get_coins.php`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    return res;
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function apiSetCoins(monedas) {
  try {
    const token = apiGetToken();
    if (!token) return { success: false };
    return await _post('update_coins.php', { token, monedas });
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ─── Petición genérica (Google login, etc.) ──────────────────
async function apiRequest(endpoint, body) {
  try {
    return await _post(endpoint, body);
  } catch (e) {
    return { success: false, error: e.message };
  }
}
