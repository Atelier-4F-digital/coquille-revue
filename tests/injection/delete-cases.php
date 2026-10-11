<?php
// Deletes the test annotations (page_title = REDTEAM) and the page "REDTEAM" of the current site.
// Usage: wp eval-file tests/injection/delete-cases.php --url=<site>
global $wpdb;
echo $wpdb->delete(coquille_revue_table(), ['page_title' => 'REDTEAM', 'blog_id' => get_current_blog_id()]) . " test annotation(s) deleted\n";
$page = get_page_by_path('coquille-revue-redteam');
if ($page && $page->post_title === 'REDTEAM') {
    wp_delete_post($page->ID, true);
    echo "Page {$page->ID} deleted\n";
}
