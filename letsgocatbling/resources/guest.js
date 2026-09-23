const GUEST_MODE_KEY = 'guestMode';
const GUEST_QUESTIONS_KEY = 'guestQuestionsUsed';
const GUEST_GAME_KEY = 'guestGameUsed';
const GUEST_SHOP_KEY = 'guestShopUsed';
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

function identificadorJuegoActual() {
  const ruta = (window.location.pathname || '').toLowerCase();
  const juegosIndex = ruta.indexOf('/juegos/');
  return juegosIndex === -1 ? ruta : ruta.slice(juegosIndex + '/juegos/'.length);
}

function invitadoJuegoUsado() {
  try {
    const juegosUsados = JSON.parse(localStorage.getItem(GUEST_GAME_KEY) || '{}');
    return juegosUsados[identificadorJuegoActual()] === true;
  } catch {
    return false;
  }
}

function invitadoTiendaUsada() {
  return localStorage.getItem(GUEST_SHOP_KEY) === 'true';
}

function invitadoDemoFinalizada() {
  return _esModoInvitadoSync() && invitadoPreguntasUsadas() && invitadoJuegoUsado();
}

// ─── Comprobaciones de límite de invitado ──────────────────────────
// IMPORTANTE: estas tres funciones son SÍNCRONAS a propósito.
// Todos los juegos, la tienda y el módulo de preguntas las invocan como
// "!invitadoPuedeJugar()" / "!invitadoPuedeComprar()" SIN `await` (son
// docenas de sitios en más de 10 archivos: casino, ruleta, dados,
// tragamonedas, memoria, cartas, carreras, tienda...).
// Antes estas funciones eran `async` y devolvían una Promise. Como una
// Promise siempre es "truthy", `!invitadoPuedeJugar()` daba SIEMPRE
// `false` en todos esos sitios, sin importar el resultado real: el
// límite de invitado NUNCA se aplicaba en ningún juego ni en la tienda
// (sólo en preguntas/resources/script.js, el único lugar que sí hacía
// `await`). Ésta es la causa raíz de que "el sistema de invitado no
// funcione correctamente": los juegos y la tienda quedaban con acceso
// de invitado ilimitado.
// La solución correcta NO es añadir `await` en cada uno de esos sitios
// (reescribiría más de 10 archivos de juegos que ya funcionan), sino
// hacer que estas funciones sean síncronas, apoyándose en
// `_isAuthenticatedSync()` / `_esModoInvitadoSync()` (ya existían y ya
// se usaban exactamente para esto). Así el resultado es inmediato y
// los `!invitadoPuedeJugar()` ya existentes evalúan el valor real.
// (En preguntas/resources/script.js, que sí hacía `await
// invitadoPuedeResponder()`, seguir usando `await` sobre un valor no-
// Promise es válido en JS y no requiere ningún cambio en ese archivo.)
function invitadoPuedeResponder() {
  return _isAuthenticatedSync() || (_esModoInvitadoSync() && !invitadoPreguntasUsadas());
}

function invitadoPuedeJugar() {
  // La primera partida se permite en cada juego; el uso se registra al
  // finalizar y se comprueba por la ruta del juego actual.
  return _isAuthenticatedSync() || (_esModoInvitadoSync() && !invitadoJuegoUsado());
}

function invitadoPuedeComprar() {
  // CORRECCIÓN: la fórmula original era "_isAuthenticatedSync() ||
  // !_esModoInvitadoSync()", es decir "autenticado O NO está en modo
  // invitado". Como iniciarModoInvitado() ahora se ejecuta al cargar
  // cualquier página (ver config.js), CUALQUIER invitado tiene
  // guestMode=true casi de inmediato, así que esa fórmula devolvía
  // `false` para todo invitado desde el primer segundo: la compra
  // quedaba bloqueada siempre, nunca permitida ni una vez. Además no
  // existía ningún contador de "ya compró" (a diferencia de preguntas y
  // juegos, que sí tienen GUEST_QUESTIONS_KEY/GUEST_GAME_KEY), así que
  // no había forma de implementar "una compra gratis" con la fórmula
  // anterior aunque se arreglara el problema de auth/await. Se usa
  // GUEST_SHOP_KEY con la misma forma que invitadoPuedeJugar/Responder.
  return _isAuthenticatedSync() || (_esModoInvitadoSync() && !invitadoTiendaUsada());
}

function iniciarModoInvitado() {
  if (_isAuthenticatedSync() || _esModoInvitadoSync()) return;
  localStorage.setItem(GUEST_MODE_KEY, 'true');
  localStorage.setItem(GUEST_QUESTIONS_KEY, 'false');
  localStorage.setItem(GUEST_GAME_KEY, '{}');
  localStorage.setItem(GUEST_SHOP_KEY, 'false');
  localStorage.setItem('monedas', 200);
  if (typeof actualizarUI === 'function') actualizarUI();
}

function finalizarModoInvitado() {
  localStorage.removeItem(GUEST_MODE_KEY);
  localStorage.removeItem(GUEST_QUESTIONS_KEY);
  localStorage.removeItem(GUEST_GAME_KEY);
  localStorage.removeItem(GUEST_SHOP_KEY);
}

function marcarPreguntasCompletadas() {
  if (_esModoInvitadoSync()) {
    localStorage.setItem(GUEST_QUESTIONS_KEY, 'true');
  }
}

function marcarJuegoCompletado() {
  if (_esModoInvitadoSync()) {
    let juegosUsados = {};
    try {
      juegosUsados = JSON.parse(localStorage.getItem(GUEST_GAME_KEY) || '{}');
    } catch {
      juegosUsados = {};
    }
    juegosUsados[identificadorJuegoActual()] = true;
    localStorage.setItem(GUEST_GAME_KEY, JSON.stringify(juegosUsados));
  }
}

function marcarCompraTiendaCompletada() {
  if (_esModoInvitadoSync()) {
    localStorage.setItem(GUEST_SHOP_KEY, 'true');
  }
}

async function requerirAutenticacion() {
  sessionStorage.setItem("showAuth", "true");
  window.location.href = new URL('principalpage.html', CATBLING_GUEST_ROOT).href;
}

// CAUSA RAÍZ (redirección prematura a la página principal incluso sin
// haber usado el juego): iniciarModoInvitado() SOLO se llamaba desde el
// DOMContentLoaded de resources/config.js. Pero en la mayoría de páginas
// de juego (carreras, cartas retro, dados, ruleta, tragamonedas,
// memoria) la etiqueta <script> de config.js aparece DESPUÉS de la del
// script propio del juego (p. ej. carreras.html carga
// ./resources/script.js antes que ../../resources/config.js). Como los
// listeners de "DOMContentLoaded" se ejecutan en el mismo orden en que
// se registran, el "invitadoPuedeJugar()" del juego se evaluaba ANTES de
// que iniciarModoInvitado() llegara a ejecutarse -- y en la primera
// página que visita un invitado nuevo (localStorage vacío), eso hacía
// que _esModoInvitadoSync() devolviera false (aún no existía
// "guestMode"), así que invitadoPuedeJugar() daba false y se redirigía
// de inmediato, sin que el invitado hubiera usado nada. (Incluso en las
// páginas donde config.js sí carga antes, su DOMContentLoaded es "async"
// y hace un "await" antes de llegar a iniciarModoInvitado(); ese await
// cede el control al siguiente listener registrado -el del juego- antes
// de reanudarse, así que la misma carrera podía darse igual.)
// La corrección mínima es llamar aquí, de forma síncrona y a nivel de
// script (no dentro de un DOMContentLoaded), a la MISMA función ya
// existente: guest.js se carga siempre el primero de los recursos
// compartidos en todas las páginas (antes que config.js y que el script
// propio de cualquier juego), así que esta llamada corre durante el
// parseo del documento, antes de que exista ningún DOMContentLoaded que
// pueda leer un estado de invitado todavía sin inicializar. Su propio
// guard interno ("if (_isAuthenticatedSync() || _esModoInvitadoSync())
// return;") sigue evitando reiniciar a un invitado que ya tenía sus
// límites parcialmente consumidos.
iniciarModoInvitado();
