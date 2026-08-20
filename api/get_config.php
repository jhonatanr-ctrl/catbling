<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

$usuario = obtenerUsuarioPorToken();
if (!$usuario) {
    errorResponse('Token inválido', 401);
}

$db = getDB();
if ($db !== null) {
    try {
        $stmt = $db->prepare("SELECT idioma, vol_musica, vol_efectos, animaciones FROM jugadores WHERE firebase_uid = ?");
        $stmt->execute([$usuario['uid']]);
        $row = $stmt->fetch();
        if ($row) {
            jsonResponse([
                'success'        => true,
                'idioma'         => $row['idioma'],
                'volumenMusica'  => (int)round((int)$row['vol_musica'] / 10),
                'volumenEfectos' => (int)round((int)$row['vol_efectos'] / 10),
                'animaciones'    => (bool)$row['animaciones'],
            ]);
        }
    } catch (Exception $e) {
        error_log("get_config.php fallback: " . $e->getMessage());
    }
}

jsonResponse([
    'success'        => true,
    'idioma'         => $usuario['idioma'] ?? 'es',
    'volumenMusica'  => (int)round((int)($usuario['vol_musica'] ?? 80) / 10),
    'volumenEfectos' => (int)round((int)($usuario['vol_efectos'] ?? 80) / 10),
    'animaciones'    => $usuario['animaciones'] ?? true,
]);
