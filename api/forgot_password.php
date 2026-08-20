<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/EmailService.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    errorResponse('Método no permitido', 405);
}

$data = json_decode(file_get_contents('php://input'), true);
$email = trim($data['email'] ?? '');

if (!$email) {
    errorResponse('Correo electrónico requerido');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    errorResponse('Correo electrónico inválido');
}

// Buscar el email
$user = null;
$db = getDB();
if ($db !== null) {
    try {
        $stmt = $db->prepare("SELECT firebase_uid, nombre FROM jugadores WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
    } catch (Exception $e) {
        error_log("forgot_password.php MySQL fallback: " . $e->getMessage());
    }
}
if (!$user) {
    // Fallback: buscar en tokens.json
    $tokensFile = __DIR__ . '/tokens.json';
    if (file_exists($tokensFile)) {
        $tokens = json_decode(file_get_contents($tokensFile), true);
        foreach ($tokens as $tok) {
            if ($tok['email'] === $email) {
                $user = ['firebase_uid' => $tok['uid'], 'nombre' => $tok['username']];
                break;
            }
        }
    }
}

if (!$user) {
    // No revelar si el correo existe o no por seguridad
    jsonResponse(['success' => true, 'message' => 'Si el correo está registrado, recibirás un enlace de recuperación.']);
    exit;
}

// Generar token de recuperación (válido 30 minutos)
$resetToken = bin2hex(random_bytes(32));
$expiresAt = time() + 1800; // 30 minutos

// Guardar en archivo JSON de resets
$resetFile = __DIR__ . '/reset_tokens.json';
$resets = file_exists($resetFile) ? json_decode(file_get_contents($resetFile), true) : [];
$resets[$resetToken] = [
    'email'     => $email,
    'uid'       => $user['firebase_uid'],
    'expires'   => $expiresAt,
    'used'      => false,
];
file_put_contents($resetFile, json_encode($resets));

// Enviar correo
$resetLink = 'http://localhost/catbling/principalpage.html?reset_token=' . $resetToken;
$subject = 'Recuperación de contraseña - Catbling';
$body = '
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#f4f4f4;padding:30px;">
    <div style="max-width:520px;margin:auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.15);">
        <div style="background:#1a1a2e;padding:20px;text-align:center;">
            <h2 style="color:#ffd700;margin:0;">🐱 LET\'S GO CATBLING</h2>
        </div>
        <div style="padding:30px;color:#333;">
            <p>Hola, <strong>' . htmlspecialchars($user['nombre']) . '</strong>:</p>
            <p>Hemos recibido una solicitud para restablecer la contraseña de tu cuenta.</p>
            <p>Haz clic en el siguiente enlace para crear una nueva contraseña:</p>
            <p style="text-align:center;margin:25px 0;">
                <a href="' . $resetLink . '"
                   style="display:inline-block;background:#1a1a2e;color:#ffd700;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:15px;border:2px solid #ffd700;">
                    Restablecer contraseña
                </a>
            </p>
            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="background:#f4f4f4;padding:10px;border-radius:4px;font-size:13px;word-break:break-all;color:#555;">' . $resetLink . '</p>
            <p style="font-size:13px;color:#888;">Por motivos de seguridad, este enlace expirará en 30 minutos y solo puede utilizarse una vez.</p>
            <p style="font-size:13px;color:#888;">Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña actual seguirá siendo válida y no se realizará ninguna modificación en tu cuenta.</p>
            <br>
            <p>Saludos,<br><strong>Equipo de Let\'s go catbling</strong></p>
        </div>
    </div>
</body>
</html>';

$emailConfig = @include __DIR__ . '/email_config.php';
$sent = false;

if ($emailConfig && !empty($emailConfig['username'])) {
    $mailer = new EmailService($emailConfig);
    $sent = $mailer->send($email, $subject, $body);
} else {
    // Fallback: log en archivo para pruebas
    $logDir = __DIR__ . '/../logs';
    if (!is_dir($logDir)) mkdir($logDir, 0777, true);
    file_put_contents(
        $logDir . '/email_log.txt',
        date('Y-m-d H:i:s') . " - A: $email - Token: $resetToken - Link: $resetLink\n",
        FILE_APPEND
    );
}

jsonResponse([
    'success' => true,
    'message' => 'Si el correo está registrado, recibirás un enlace de recuperación.',
    '_debug_token' => $sent ? null : $resetToken, // solo visible si falló el envío
]);
