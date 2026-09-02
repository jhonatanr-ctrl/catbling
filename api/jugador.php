<?php
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';

try {
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $action = $_GET['accion'] ?? '';
        $uid    = $_GET['uid'] ?? '';

        if (empty($uid)) {
            http_response_code(400);
            echo json_encode(['error' => 'uid requerido']);
            exit;
        }

        if ($action === 'perfil') {
            $pdo  = getDB();
            $stmt = $pdo->prepare(
                'SELECT nombre, monedas, idioma, vol_musica, vol_efectos, animaciones
                 FROM jugadores
                 WHERE firebase_uid = :uid'
            );
            $stmt->execute([':uid' => $uid]);
            $row = $stmt->fetch();

            if (!$row) {
                http_response_code(404);
                echo json_encode(['error' => 'No encontrado']);
                exit;
            }

            echo json_encode([
                'nombre'          => $row['nombre'],
                'monedas'         => (int) $row['monedas'],
                'idioma'          => $row['idioma'],
                'volumenMusica'   => (int) $row['vol_musica'],
                'volumenEfectos'  => (int) $row['vol_efectos'],
                'animaciones'     => (bool) $row['animaciones'],
            ]);
            exit;
        }

        http_response_code(400);
        echo json_encode(['error' => 'Acción no válida']);
        exit;
    }

    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            http_response_code(400);
            echo json_encode(['error' => 'Cuerpo JSON inválido']);
            exit;
        }

        $action = $input['accion'] ?? '';

        switch ($action) {
            case 'registrar':
                $uid    = $input['uid'] ?? '';
                $nombre = $input['nombre'] ?? '';
                $email  = $input['email'] ?? '';

                if (empty($uid) || empty($nombre) || empty($email)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Faltan campos requeridos']);
                    exit;
                }

                $pdo  = getDB();
                $stmt = $pdo->prepare(
                    'INSERT IGNORE INTO jugadores (firebase_uid, nombre, email)
                     VALUES (:uid, :nombre, :email)'
                );
                $stmt->execute([
                    ':uid'    => $uid,
                    ':nombre' => $nombre,
                    ':email'  => $email,
                ]);

                echo json_encode(['ok' => true]);
                exit;

            case 'actualizar_config':
                $uid = $input['uid'] ?? '';

                if (empty($uid)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'uid requerido']);
                    exit;
                }

                $pdo  = getDB();
                $stmt = $pdo->prepare(
                    'UPDATE jugadores
                     SET idioma = :idioma,
                         vol_musica = :vol_musica,
                         vol_efectos = :vol_efectos,
                         animaciones = :animaciones
                     WHERE firebase_uid = :uid'
                );
                $stmt->execute([
                    ':idioma'       => $input['idioma'] ?? 'es',
                    ':vol_musica'   => (int) ($input['volumenMusica'] ?? 80),
                    ':vol_efectos'  => (int) ($input['volumenEfectos'] ?? 80),
                    ':animaciones'  => $input['animaciones'] ? 1 : 0,
                    ':uid'          => $uid,
                ]);

                echo json_encode(['ok' => true]);
                exit;

            case 'actualizar_monedas':
                $uid     = $input['uid'] ?? '';
                $monedas = $input['monedas'] ?? null;

                if (empty($uid) || $monedas === null) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Faltan campos requeridos']);
                    exit;
                }

                $pdo  = getDB();
                $stmt = $pdo->prepare(
                    'UPDATE jugadores SET monedas = :monedas WHERE firebase_uid = :uid'
                );
                $stmt->execute([
                    ':monedas' => (int) $monedas,
                    ':uid'     => $uid,
                ]);

                $stmt = $pdo->prepare('SELECT monedas FROM jugadores WHERE firebase_uid = :uid');
                $stmt->execute([':uid' => $uid]);
                $row = $stmt->fetch();

                echo json_encode([
                    'ok'      => true,
                    'monedas' => (int) ($row ? $row['monedas'] : $monedas),
                ]);
                exit;

            default:
                http_response_code(400);
                echo json_encode(['error' => 'Acción no válida']);
                exit;
        }
    }

    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno del servidor']);
}
