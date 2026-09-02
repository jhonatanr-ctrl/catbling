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

        $pdo = getDB();

        if ($action === 'accesorios') {
            $stmt = $pdo->prepare(
                'SELECT ac.id, ac.nombre, ac.categoria, ac.imagen_url, ia.equipado
                 FROM inventario_accesorios ia
                 INNER JOIN accesorios_catalogo ac ON ia.accesorio_id = ac.id
                 WHERE ia.jugador_uid = :uid
                 ORDER BY ac.categoria, ac.nombre'
            );
            $stmt->execute([':uid' => $uid]);
            $rows = $stmt->fetchAll();

            $result = array_map(function ($r) {
                return [
                    'id'        => (int) $r['id'],
                    'nombre'    => $r['nombre'],
                    'categoria' => $r['categoria'],
                    'imagenUrl' => $r['imagen_url'],
                    'equipado'  => (bool) $r['equipado'],
                ];
            }, $rows);

            echo json_encode($result);
            exit;
        }

        if ($action === 'items') {
            $stmt = $pdo->prepare(
                'SELECT ti.id, ti.nombre, ti.tipo, ti.descripcion, ii.cantidad
                 FROM inventario_items ii
                 INNER JOIN tienda_items ti ON ii.item_id = ti.id
                 WHERE ii.jugador_uid = :uid
                 ORDER BY ti.tipo, ti.nombre'
            );
            $stmt->execute([':uid' => $uid]);
            $rows = $stmt->fetchAll();

            $result = array_map(function ($r) {
                return [
                    'id'          => (int) $r['id'],
                    'nombre'      => $r['nombre'],
                    'tipo'        => $r['tipo'],
                    'descripcion' => $r['descripcion'],
                    'cantidad'    => (int) $r['cantidad'],
                ];
            }, $rows);

            echo json_encode($result);
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
        $uid    = $input['uid'] ?? '';

        if (empty($uid)) {
            http_response_code(400);
            echo json_encode(['error' => 'uid requerido']);
            exit;
        }

        $pdo = getDB();

        switch ($action) {
            case 'comprar_accesorio':
                $accesorioId = $input['accesorioId'] ?? null;

                if (!$accesorioId) {
                    http_response_code(400);
                    echo json_encode(['error' => 'accesorioId requerido']);
                    exit;
                }

                $stmt = $pdo->prepare(
                    'INSERT IGNORE INTO inventario_accesorios (jugador_uid, accesorio_id)
                     VALUES (:uid, :accesorio_id)'
                );
                $stmt->execute([
                    ':uid'          => $uid,
                    ':accesorio_id' => (int) $accesorioId,
                ]);

                echo json_encode(['ok' => true]);
                exit;

            case 'equipar_accesorio':
                $accesorioId = $input['accesorioId'] ?? null;
                $categoria   = $input['categoria'] ?? '';

                if (!$accesorioId || empty($categoria)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'accesorioId y categoria requeridos']);
                    exit;
                }

                $pdo->prepare(
                    'UPDATE inventario_accesorios ia
                     INNER JOIN accesorios_catalogo ac ON ia.accesorio_id = ac.id
                     SET ia.equipado = 0
                     WHERE ia.jugador_uid = :uid AND ac.categoria = :categoria'
                )->execute([
                    ':uid'      => $uid,
                    ':categoria' => $categoria,
                ]);

                $pdo->prepare(
                    'UPDATE inventario_accesorios
                     SET equipado = 1
                     WHERE jugador_uid = :uid AND accesorio_id = :accesorio_id'
                )->execute([
                    ':uid'          => $uid,
                    ':accesorio_id' => (int) $accesorioId,
                ]);

                echo json_encode(['ok' => true]);
                exit;

            case 'comprar_item':
                $itemId = $input['itemId'] ?? null;

                if (!$itemId) {
                    http_response_code(400);
                    echo json_encode(['error' => 'itemId requerido']);
                    exit;
                }

                $stmt = $pdo->prepare(
                    'INSERT INTO inventario_items (jugador_uid, item_id, cantidad)
                     VALUES (:uid, :item_id, 1)
                     ON DUPLICATE KEY UPDATE cantidad = cantidad + 1'
                );
                $stmt->execute([
                    ':uid'     => $uid,
                    ':item_id' => (int) $itemId,
                ]);

                echo json_encode(['ok' => true]);
                exit;

            case 'usar_item':
                $itemId = $input['itemId'] ?? null;

                if (!$itemId) {
                    http_response_code(400);
                    echo json_encode(['error' => 'itemId requerido']);
                    exit;
                }

                $pdo->prepare(
                    'UPDATE inventario_items
                     SET cantidad = GREATEST(cantidad - 1, 0)
                     WHERE jugador_uid = :uid AND item_id = :item_id'
                )->execute([
                    ':uid'     => $uid,
                    ':item_id' => (int) $itemId,
                ]);

                echo json_encode(['ok' => true]);
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
