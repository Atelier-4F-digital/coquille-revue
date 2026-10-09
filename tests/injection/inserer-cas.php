<?php
// Insère les annotations de test sur le site courant (mêmes nettoyages que l'API REST), marquées page_title = REDTEAM.
// Usage : wp eval-file tests/injection/inserer-cas.php tests/injection/cas-de-test.json --url=<site>
// Nettoyage : wp eval-file tests/injection/supprimer-cas.php --url=<site>
global $wpdb;
$items = json_decode(file_get_contents($args[0]), true);
foreach ($items as $p) {
    $mode = ($p['annotation_mode'] ?? 'text') === 'zone' ? 'zone' : 'text';
    $wpdb->insert(coquille_revue_table(), [
        'blog_id'         => get_current_blog_id(),
        'url'             => home_url('/'),
        'page_title'      => 'REDTEAM',
        'xpath'           => '/html/body[1]/main[1]/h1[1]',
        'css_selector'    => 'main > h1',
        'original_text'   => sanitize_textarea_field($p['original_text']),
        'suggestion'      => sanitize_textarea_field($p['suggestion']),
        'type'            => $mode === 'zone' ? 'suggestion' : 'correction',
        'annotation_mode' => $mode,
        'zone_data'       => $mode === 'zone' ? wp_json_encode(['x' => 100, 'y' => 500, 'w' => 640, 'h' => 300, 'viewport_w' => 1440, 'viewport_h' => 900, 'element_tag' => 'div']) : null,
        'author_id'       => 0,
        'author_name'     => sanitize_text_field($p['author_name']),
        'reviewer_ip'     => '203.0.113.9',
        'status'          => 'pending',
    ]);
    echo $wpdb->insert_id . ' : ' . mb_substr(sanitize_text_field($p['original_text']), 0, 50) . "\n";
}
