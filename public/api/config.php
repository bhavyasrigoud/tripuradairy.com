<?php
/**
 * Tripura Dairy — API configuration.
 *
 * Edit the four DB_* values below with the MySQL database you created in
 * Hostinger hPanel (Databases → MySQL Databases). Nothing else needs changing.
 */

define('DB_HOST', 'localhost');
define('DB_NAME', 'CHANGE_ME_database');
define('DB_USER', 'CHANGE_ME_user');
define('DB_PASS', 'CHANGE_ME_password');

/**
 * Shared secret sent by the app as the X-Api-Key header.
 * Change it here AND in the app (src/lib/staff/sync.ts -> API_KEY).
 */
define('API_KEY', 'CHANGE_ME_long_random_string');

function db(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );
    }
    return $pdo;
}

function json_out($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data);
    exit;
}

function require_api_key(): void {
    $key = $_SERVER['HTTP_X_API_KEY'] ?? '';
    if (!hash_equals(API_KEY, (string) $key)) {
        json_out(['error' => 'unauthorized'], 401);
    }
}
