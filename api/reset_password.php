<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Método no permitido', 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$token = trim($data['token'] ?? '');
$password = $data['password'] ?? '';

if (!$token || !$password) {
    errorResponse('Token y contraseña requeridos');
}

if (strlen($password) < 6) {
    errorResponse('La contraseña debe tener al menos 6 caracteres');
}

// Leer resets guardados
$resetFile = __DIR__ . '/reset_tokens.json';
if (!file_exists($resetFile)) {
    errorResponse('Token inválido o expirado');
}

$resets = json_decode(file_get_contents($resetFile), true);

if (!isset($resets[$token])) {
    errorResponse('Token inválido o expirado');
}

$reset = $resets[$token];

// Verificar expiración
if ($reset['expires'] < time()) {
    unset($resets[$token]);
    file_put_contents($resetFile, json_encode($resets));
    errorResponse('El token ha expirado. Solicita un nuevo restablecimiento.');
}

// Verificar si ya fue usado
if (!empty($reset['used'])) {
    errorResponse('Este token ya fue utilizado');
}

// Hashear nueva contraseña
$hash = password_hash($password, PASSWORD_BCRYPT);

// Actualizar en tokens.json
$tokensFile = __DIR__ . '/tokens.json';
if (file_exists($tokensFile)) {
    $tokens = json_decode(file_get_contents($tokensFile), true);
    foreach ($tokens as $tok => &$userData) {
        if ($userData['email'] === $reset['email']) {
            $userData['password'] = $hash;
            break;
        }
    }
    unset($userData);
    file_put_contents($tokensFile, json_encode($tokens));
}

// Marcar token como usado y guardar
$resets[$token]['used'] = true;
file_put_contents($resetFile, json_encode($resets));

jsonResponse([
    'success' => true,
    'message' => 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.',
]);
