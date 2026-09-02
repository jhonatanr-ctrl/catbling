const GUEST_MODE_KEY = 'guestMode';
const GUEST_QUESTIONS_KEY = 'guestQuestionsUsed';
const GUEST_GAME_KEY = 'guestGameUsed';
const CATBLING_GUEST_ROOT = document.currentScript?.src
  ? new URL('../', document.currentScript.src)
  : new URL('./', window.location.href);

// ─── Helpers de autenticación ────────────────────────────────────
function _isAuthenticatedSync() {
  const session = localStorage.getItem('catbling-auth');
  if (!session) return false;
  try {
    const parsed = JSON.parse(session);
    return !!parsed?.access_token;
  } catch {
    return false;
  }
}

async function _isAuthenticated() {
  try {
    return await apiIsAuthenticated();
  } catch {
    return false;
  }
}

// Síncrono para uso en funciones no-async
function _esModoInvitadoSync() {
  return !_isAuthenticatedSync() && localStorage.getItem(GUEST_MODE_KEY) === 'true';
}

// Async para uso en funciones async
async function esModoInvitado() {
  return !(await _isAuthenticated()) && localStorage.getItem(GUEST_MODE_KEY) === 'true';
}

function invitadoPreguntasUsadas() {
  return localStorage.getItem(GUEST_QUESTIONS_KEY) === 'true';
}

function invitadoJuegoUsado() {
  return localStorage.getItem(GUEST_GAME_KEY) === 'true';
}

function invitadoDemoFinalizada() {
  return _esModoInvitadoSync() && invitadoPreguntasUsadas() && invitadoJuegoUsado();
}

async function invitadoPuedeResponder() {
  return (await _isAuthenticated()) || (await esModoInvitado() && !invitadoPreguntasUsadas());
}

async function invitadoPuedeJugar() {
  return (await _isAuthenticated()) || ((await esModoInvitado()) && (await invitadoPreguntasUsadas()) && !(await invitadoJuegoUsado()));
}

async function invitadoPuedeComprar() {
  return (await _isAuthenticated()) || !(await esModoInvitado());
}

function iniciarModoInvitado() {
  if (_isAuthenticatedSync() || _esModoInvitadoSync()) return;
  localStorage.setItem(GUEST_MODE_KEY, 'true');
  localStorage.setItem(GUEST_QUESTIONS_KEY, 'false');
  localStorage.setItem(GUEST_GAME_KEY, 'false');
  localStorage.setItem('monedas', 200);
  if (typeof actualizarUI === 'function') actualizarUI();
}

function finalizarModoInvitado() {
  localStorage.removeItem(GUEST_MODE_KEY);
  localStorage.removeItem(GUEST_QUESTIONS_KEY);
  localStorage.removeItem(GUEST_GAME_KEY);
}

function marcarPreguntasCompletadas() {
  if (_esModoInvitadoSync()) {
    localStorage.setItem(GUEST_QUESTIONS_KEY, 'true');
  }
}

async function marcarJuegoCompletado() {
  if (await esModoInvitado()) {
    localStorage.setItem(GUEST_GAME_KEY, 'true');
  }
}

async function requerirAutenticacion() {
  sessionStorage.setItem("showAuth", "true");
  window.location.href = new URL('principalpage.html', CATBLING_GUEST_ROOT).href;
}
