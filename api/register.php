<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Método no permitido', 405);
}

$data     = json_decode(file_get_contents('php://input'), true);
$username = trim($data['username'] ?? '');
$email    = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

if (!$username || !$email || !$password) {
    errorResponse('Todos los campos son obligatorios');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    errorResponse('Correo inválido');
}

if (strlen($password) < 6) {
    errorResponse('Contraseña muy corta (mínimo 6 caracteres)');
}

// Generar un uid interno (ya que no usamos Firebase aquí)
$uid  = 'local_' . bin2hex(random_bytes(8));
$hash = password_hash($password, PASSWORD_BCRYPT);

// Intentar usar MySQL; si no está disponible, usar solo tokens.json
$db = getDB();
if ($db !== null) {
    initDatabase();
    // Verificar si el correo ya existe
    $stmt = $db->prepare("SELECT firebase_uid FROM jugadores WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        errorResponse('Ese correo ya está registrado');
    }
    // Insertar en jugadores
    $stmt = $db->prepare("
        INSERT INTO jugadores (firebase_uid, nombre, email, monedas)
        VALUES (?, ?, ?, 200)
    ");
    $stmt->execute([$uid, $username, $email]);
} else {
    // Verificar duplicado en tokens.json
    $tokensFile = __DIR__ . '/tokens.json';
    if (file_exists($tokensFile)) {
        $tokens = json_decode(file_get_contents($tokensFile), true);
        foreach ($tokens as $t) {
            if ($t['email'] === $email) {
                errorResponse('Ese correo ya está registrado');
            }
        }
    }
}

$token = generarToken();

// Guardar token en sesión PHP
session_start();
$_SESSION['token']    = $token;
$_SESSION['uid']      = $uid;
$_SESSION['username'] = $username;
$_SESSION['email']    = $email;

// Guardar en tokens.json
$tokensFile = __DIR__ . '/tokens.json';
$tokens     = file_exists($tokensFile) ? json_decode(file_get_contents($tokensFile), true) : [];
$tokens[$token] = [
    'uid'      => $uid,
    'email'    => $email,
    'username' => $username,
    'password' => $hash,
    'monedas'  => 200
];
file_put_contents($tokensFile, json_encode($tokens));

jsonResponse([
    'success' => true,
    'token'   => $token,
    'user'    => [
        'id'       => $uid,
        'username' => $username,
        'email'    => $email,
        'monedas'  => 200
    ]
]);