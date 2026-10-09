<?php
// Exporte les annotations de test (page_title = REDTEAM) du site courant, comme les boutons d'export de l'admin.
// Usage : wp eval-file tests/injection/exporter-cas.php md --url=<site> > export.md
//         wp eval-file tests/injection/exporter-cas.php json --url=<site> > export.json
$rows = array_values(array_filter(coquille_revue_get_rows('pending'), fn($r) => $r['page_title'] === 'REDTEAM'));
if (($args[0] ?? 'md') === 'json') {
    echo wp_json_encode(coquille_revue_json_payload($rows, 'pending'), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} else {
    echo coquille_revue_format_markdown($rows, 'pending');
}
