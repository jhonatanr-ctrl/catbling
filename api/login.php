<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Método no permitido', 405);
}

$data     = json_decode(file_get_contents('php://input'), true);
$email    = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

if (!$email || !$password) {
    errorResponse('Correo y contraseña requeridos');
}

// Buscar token guardado con ese email
$tokensFile = __DIR__ . '/tokens.json';
if (!file_exists($tokensFile)) {
    errorResponse('Correo o contraseña incorrectos');
}

$tokens  = json_decode(file_get_contents($tokensFile), true);
$usuario = null;
$tokenGuardado = null;

foreach ($tokens as $tok => $data) {
    if ($data['email'] === $email) {
        $usuario       = $data;
        $tokenGuardado = $tok;
        break;
    }
}

if (!$usuario || !password_verify($password, $usuario['password'])) {
    errorResponse('Correo o contraseña incorrectos');
}

// Obtener monedas actuales de MySQL (fallback a tokens.json si no está disponible)
$monedas = $usuario['monedas'] ?? 200;
$db = getDB();
if ($db !== null) {
    try {
        $stmt = $db->prepare("SELECT monedas FROM jugadores WHERE firebase_uid = ?");
        $stmt->execute([$usuario['uid']]);
        $fila = $stmt->fetch();
        $monedas = $fila ? (int)$fila['monedas'] : ($usuario['monedas'] ?? 200);
    } catch (Exception $e) {
        error_log("login.php - fallback a tokens.json: " . $e->getMessage());
    }
}

jsonResponse([
    'success' => true,
    'token'   => $tokenGuardado,
    'user'    => [
        'id'       => $usuario['uid'],
        'username' => $usuario['username'],
        'email'    => $usuario['email'],
        'monedas'  => $monedas
    ]
]);