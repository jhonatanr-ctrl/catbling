const GUEST_MODE_KEY = 'guestMode';
const GUEST_QUESTIONS_KEY = 'guestQuestionsUsed';
const GUEST_GAME_KEY = 'guestGameUsed';

function tieneSesionValida() {
  const token = localStorage.getItem('api_token');
  const user = localStorage.getItem('api_user');
  return Boolean(token || user);
}

function esModoInvitado() {
  return !tieneSesionValida() && localStorage.getItem(GUEST_MODE_KEY) === 'true';
}

function invitadoPreguntasUsadas() {
  return localStorage.getItem(GUEST_QUESTIONS_KEY) === 'true';
}

function invitadoJuegoUsado() {
  return localStorage.getItem(GUEST_GAME_KEY) === 'true';
}

function invitadoDemoFinalizada() {
  return esModoInvitado() && invitadoPreguntasUsadas() && invitadoJuegoUsado();
}

function invitadoPuedeResponder() {
  return tieneSesionValida() || (esModoInvitado() && !invitadoPreguntasUsadas());
}

function invitadoPuedeJugar() {
  return tieneSesionValida() || (esModoInvitado() && invitadoPreguntasUsadas() && !invitadoJuegoUsado());
}

function invitadoPuedeComprar() {
  return tieneSesionValida() || !esModoInvitado();
}

function iniciarModoInvitado() {
  if (tieneSesionValida() || esModoInvitado()) return;
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
  if (esModoInvitado()) {
    localStorage.setItem(GUEST_QUESTIONS_KEY, 'true');
  }
}

function marcarJuegoCompletado() {
  if (esModoInvitado()) {
    localStorage.setItem(GUEST_GAME_KEY, 'true');
  }
}

function requerirAutenticacion() {
  sessionStorage.setItem("showAuth", "true");
  var pathParts = window.location.pathname.replace(/\\/g, '/').split('/').filter(function(s) { return s.length > 0; });
  var depth = pathParts.length;
  if (depth <= 2) {
    window.location.href = './principalpage.html';
  } else {
    window.location.href = '/catbling/principalpage.html';
  }
}