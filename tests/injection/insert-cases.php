<?php
// Publishes the page "REDTEAM" (slug coquille-revue-redteam), which holds every original text of the cases (twice
// for the "Locations listed" case), then inserts the test annotations on that page, on the current site, with the
// same cleaning as the REST API and page_title = REDTEAM.
// Each line of an original text is a paragraph block of its own, written as typed: apostrophes and quotes stay as
// they are (only < > & would be escaped), so that an honest case is found verbatim in post_content.
// Usage: wp eval-file tests/injection/insert-cases.php tests/injection/cases.json --url=<site>
// Clean-up: wp eval-file tests/injection/delete-cases.php --url=<site>
global $wpdb;
$items = json_decode(file_get_contents($args[0]), true);

$paragraphs = '';
foreach ($items as $p) {
    $times = strpos($p['expected'], 'Locations listed') === 0 ? 2 : 1;
    $lines = array_filter(array_map('trim', explode("\n", sanitize_textarea_field($p['original_text']))), 'strlen');
    $block = '';
    foreach ($lines as $line) {
        $block .= "<!-- wp:paragraph -->\n<p>" . htmlspecialchars($line, ENT_NOQUOTES, 'UTF-8') . "</p>\n<!-- /wp:paragraph -->\n\n";
    }
    $paragraphs .= str_repeat($block, $times);
}
$page = get_page_by_path('coquille-revue-redteam');
$id   = wp_insert_post([
    'ID'           => $page ? $page->ID : 0,
    'post_type'    => 'page',
    'post_status'  => 'publish',
    'post_name'    => 'coquille-revue-redteam',
    'post_title'   => 'REDTEAM',
    'post_content' => $paragraphs,
], true);
if (is_wp_error($id)) {
    echo 'Page not created: ' . $id->get_error_message() . "\n";
    return;
}
$url = get_permalink($id);
echo "Page {$id}: {$url}\n";

foreach ($items as $p) {
    $mode = ($p['annotation_mode'] ?? 'text') === 'zone' ? 'zone' : 'text';
    $wpdb->insert(coquille_revue_table(), [
        'blog_id'         => get_current_blog_id(),
        'url'             => coquille_revue_clean_url($url),
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
        'created_at'      => current_time('mysql', true),
        'dates_utc'       => 1,
    ]);
    echo $wpdb->insert_id . ' (case ' . $p['id'] . '): ' . mb_substr(sanitize_text_field($p['original_text']), 0, 50) . "\n";
}
