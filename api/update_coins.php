<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Método no permitido', 405);
}

$data = json_decode(file_get_contents('php://input'), true);

// El token puede venir en el body (apiSetCoins) o en el header
$token = $data['token'] ?? '';
if (!$token) {
    $usuario = obtenerUsuarioPorToken();
    if (!$usuario) errorResponse('Token inválido', 401);
} else {
    // Buscar en tokens.json
    $tokensFile = __DIR__ . '/tokens.json';
    if (!file_exists($tokensFile)) errorResponse('Token inválido', 401);
    $tokens = json_decode(file_get_contents($tokensFile), true);
    if (!isset($tokens[$token])) errorResponse('Token inválido', 401);
    $usuario = $tokens[$token];
}

$cantidad = (int)($data['monedas'] ?? 0);
$uid = $usuario['uid'] ?? $usuario['id'] ?? '';

if (!$uid) {
    errorResponse('Usuario no identificado');
}

$db = getDB();
if ($db !== null) {
    try {
        $stmt = $db->prepare("UPDATE jugadores SET monedas = ? WHERE firebase_uid = ?");
        $stmt->execute([$cantidad, $uid]);
        $stmt = $db->prepare("SELECT monedas FROM jugadores WHERE firebase_uid = ?");
        $stmt->execute([$uid]);
        $nuevas = (int)$stmt->fetchColumn();
        jsonResponse(['success' => true, 'monedas' => $nuevas]);
    } catch (Exception $e) {
        error_log("update_coins.php: " . $e->getMessage());
    }
}

jsonResponse(['success' => true, 'monedas' => $cantidad]);
