<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Método no permitido', 405);
}

$data = json_decode(file_get_contents('php://input'), true);

$token = $data['token'] ?? '';
if (!$token) {
    $usuario = obtenerUsuarioPorToken();
    if (!$usuario) errorResponse('Token inválido', 401);
} else {
    $tokensFile = __DIR__ . '/tokens.json';
    if (!file_exists($tokensFile)) errorResponse('Token inválido', 401);
    $tokens = json_decode(file_get_contents($tokensFile), true);
    if (!isset($tokens[$token])) errorResponse('Token inválido', 401);
    $usuario = $tokens[$token];
}

$uid = $usuario['uid'] ?? $usuario['id'] ?? '';
if (!$uid) {
    errorResponse('Usuario no identificado');
}

$idioma        = $data['idioma'] ?? 'es';
$volMusica     = isset($data['volumenMusica']) ? (int)$data['volumenMusica'] : 5;
$volEfectos    = isset($data['volumenEfectos']) ? (int)$data['volumenEfectos'] : 5;
$animaciones   = isset($data['animaciones']) ? (bool)$data['animaciones'] : true;

$volMusicaDB   = min(100, max(0, $volMusica * 10));
$volEfectosDB  = min(100, max(0, $volEfectos * 10));

$db = getDB();
if ($db !== null) {
    try {
        $stmt = $db->prepare(
            "UPDATE jugadores
             SET idioma = ?,
                 vol_musica = ?,
                 vol_efectos = ?,
                 animaciones = ?
             WHERE firebase_uid = ?"
        );
        $stmt->execute([$idioma, $volMusicaDB, $volEfectosDB, $animaciones ? 1 : 0, $uid]);
    } catch (Exception $e) {
        error_log("update_config.php: " . $e->getMessage());
    }
}

jsonResponse([
    'success' => true,
]);
