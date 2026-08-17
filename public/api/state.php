<?php
/**
 * Shared operations state (areas, customers, staff, orders, audit).
 *
 * GET  /api/state.php  -> { version, data }
 * POST /api/state.php  -> body { version, data }
 *        200 { version, data }                  saved
 *        409 { conflict: true, version, data }  someone else saved first
 *
 * Optimistic concurrency via the `version` column means two phones can never
 * silently overwrite each other: the loser re-reads and re-applies.
 */
require __DIR__ . '/config.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Api-Key');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_api_key();

try {
    $pdo = db();

    $read = function () use ($pdo) {
        $row = $pdo->query('SELECT version, data FROM ops_state WHERE id = 1')->fetch();
        if (!$row) {
            $pdo->exec("INSERT INTO ops_state (id, version, data) VALUES (1, 0, '{}')");
            return ['version' => 0, 'data' => new stdClass()];
        }
        return [
            'version' => (int) $row['version'],
            'data' => json_decode($row['data'], true) ?: new stdClass(),
        ];
    };

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        json_out($read());
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_out(['error' => 'method_not_allowed'], 405);
    }

    $body = json_decode(file_get_contents('php://input'), true);
    if (!is_array($body) || !isset($body['data']) || !is_array($body['data'])) {
        json_out(['error' => 'bad_request'], 400);
    }
    $expected = isset($body['version']) ? (int) $body['version'] : -1;
    $payload = json_encode($body['data'], JSON_UNESCAPED_UNICODE);

    $read(); // make sure row 1 exists

    $stmt = $pdo->prepare(
        'UPDATE ops_state SET version = version + 1, data = :data WHERE id = 1 AND version = :v'
    );
    $stmt->execute([':data' => $payload, ':v' => $expected]);

    if ($stmt->rowCount() === 0) {
        $current = $read();
        $current['conflict'] = true;
        json_out($current, 409);
    }

    json_out(['version' => $expected + 1, 'data' => $body['data']]);
} catch (Throwable $e) {
    json_out(['error' => 'server_error'], 500);
}
