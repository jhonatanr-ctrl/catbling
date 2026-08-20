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

        if ($action === 'rondas') {
            $stmt = $pdo->prepare(
                'SELECT dificultad, area, correctas, preguntas_total, monedas_ganadas, jugado_en
                 FROM rondas_preguntas
                 WHERE jugador_uid = :uid
                 ORDER BY jugado_en DESC
                 LIMIT 20'
            );
            $stmt->execute([':uid' => $uid]);
            $rows = $stmt->fetchAll();

            $result = array_map(function ($r) {
                return [
                    'dificultad'     => $r['dificultad'],
                    'area'           => $r['area'],
                    'correctas'      => (int) $r['correctas'],
                    'preguntasTotal' => (int) $r['preguntas_total'],
                    'monedasGanadas' => (int) $r['monedas_ganadas'],
                    'jugadoEn'       => $r['jugado_en'],
                ];
            }, $rows);

            echo json_encode($result);
            exit;
        }

        if ($action === 'casino') {
            $stmt = $pdo->prepare(
                'SELECT juego, apuesta, resultado_monedas, gano, jugado_en
                 FROM sesiones_casino
                 WHERE jugador_uid = :uid
                 ORDER BY jugado_en DESC
                 LIMIT 20'
            );
            $stmt->execute([':uid' => $uid]);
            $rows = $stmt->fetchAll();

            $result = array_map(function ($r) {
                return [
                    'juego'           => $r['juego'],
                    'apuesta'         => (int) $r['apuesta'],
                    'resultadoMonedas' => (int) $r['resultado_monedas'],
                    'gano'            => (bool) $r['gano'],
                    'jugadoEn'        => $r['jugado_en'],
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
            case 'guardar_ronda':
                $dificultad      = $input['dificultad'] ?? '';
                $area            = $input['area'] ?? '';
                $preguntasTotal  = $input['preguntasTotal'] ?? 0;
                $correctas       = $input['correctas'] ?? 0;
                $monedasGanadas  = $input['monedasGanadas'] ?? 0;

                if (empty($dificultad) || empty($area)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Faltan campos requeridos']);
                    exit;
                }

                $stmt = $pdo->prepare(
                    'INSERT INTO rondas_preguntas (jugador_uid, dificultad, area, preguntas_total, correctas, monedas_ganadas)
                     VALUES (:uid, :dificultad, :area, :preguntas_total, :correctas, :monedas_ganadas)'
                );
                $stmt->execute([
                    ':uid'              => $uid,
                    ':dificultad'       => $dificultad,
                    ':area'             => $area,
                    ':preguntas_total'  => (int) $preguntasTotal,
                    ':correctas'        => (int) $correctas,
                    ':monedas_ganadas'  => (int) $monedasGanadas,
                ]);

                echo json_encode(['ok' => true]);
                exit;

            case 'guardar_casino':
                $juego            = $input['juego'] ?? '';
                $apuesta          = $input['apuesta'] ?? 0;
                $resultadoMonedas = $input['resultadoMonedas'] ?? 0;
                $gano             = $input['gano'] ?? false;

                if (empty($juego)) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Faltan campos requeridos']);
                    exit;
                }

                $stmt = $pdo->prepare(
                    'INSERT INTO sesiones_casino (jugador_uid, juego, apuesta, resultado_monedas, gano)
                     VALUES (:uid, :juego, :apuesta, :resultado_monedas, :gano)'
                );
                $stmt->execute([
                    ':uid'               => $uid,
                    ':juego'             => $juego,
                    ':apuesta'           => (int) $apuesta,
                    ':resultado_monedas' => (int) $resultadoMonedas,
                    ':gano'              => $gano ? 1 : 0,
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
