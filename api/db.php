<?php

function getDB(): ?PDO {
    static $pdo = null;
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=localhost;port=3306;dbname=game_db;charset=utf8mb4";
            $pdo = new PDO($dsn, 'root', '', [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
        } catch (PDOException $e) {
            error_log("getDB no disponible: " . $e->getMessage());
            return null;
        }
    }
    return $pdo;
}

function initDatabase(): bool {
    try {
        $dsn = "mysql:host=localhost;port=3306;charset=utf8mb4";
        $pdo = new PDO($dsn, 'root', '', [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
        $pdo->exec("CREATE DATABASE IF NOT EXISTS game_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE game_db");
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS jugadores (
                firebase_uid   VARCHAR(128)  NOT NULL,
                nombre         VARCHAR(60)   NOT NULL,
                email          VARCHAR(254)  NOT NULL,
                monedas        INT           NOT NULL DEFAULT 0,
                idioma         ENUM('es','en') NOT NULL DEFAULT 'es',
                vol_musica     TINYINT       NOT NULL DEFAULT 80,
                vol_efectos    TINYINT       NOT NULL DEFAULT 80,
                animaciones    TINYINT(1)    NOT NULL DEFAULT 1,
                creado_en      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
                ultimo_acceso  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (firebase_uid),
                UNIQUE  KEY uq_jugadores_email (email)
            ) ENGINE=InnoDB
        ");
        return true;
    } catch (PDOException $e) {
        error_log("initDatabase falló: " . $e->getMessage());
        return false;
    }
}

function jsonResponse(array $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function errorResponse(string $mensaje, int $status = 400): void {
    jsonResponse(['success' => false, 'error' => $mensaje], $status);
}

function generarToken(): string {
    return bin2hex(random_bytes(32));
}

function obtenerUsuarioPorToken(): ?array {
    // Obtener token del header Authorization: Bearer <token>
    $headers = function_exists('getallheaders') ? getallheaders() : [];
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';

    if (!preg_match('/^Bearer\s+(.+)$/i', $auth, $m)) {
        return null;
    }
    $token = $m[1];

    // Buscar en tokens.json
    $tokensFile = __DIR__ . '/tokens.json';
    if (!file_exists($tokensFile)) return null;

    $tokens = json_decode(file_get_contents($tokensFile), true);
    if (!isset($tokens[$token])) return null;

    $data = $tokens[$token];

    // Obtener datos actualizados de MySQL
    try {
        $db = getDB();
        $stmt = $db->prepare("SELECT * FROM jugadores WHERE firebase_uid = ?");
        $stmt->execute([$data['uid']]);
        $row = $stmt->fetch();
        if ($row) {
            return array_merge($data, [
                'id'      => $row['firebase_uid'],
                'monedas' => (int)$row['monedas'],
                'nombre'  => $row['nombre'],
                'email'   => $row['email'],
            ]);
        }
    } catch (Exception $e) {
        error_log("obtenerUsuarioPorToken: " . $e->getMessage());
    }

    return $data;
}