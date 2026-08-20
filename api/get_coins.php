<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

$usuario = obtenerUsuarioPorToken();
if (!$usuario) {
    errorResponse('Token inválido', 401);
}

jsonResponse([
    'success' => true,
    'monedas' => (int)($usuario['monedas'] ?? 0),
]);
