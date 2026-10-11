<?php
// Deletes the test annotations (page_title = REDTEAM) of the current site.
// Usage: wp eval-file tests/injection/delete-cases.php --url=<site>
global $wpdb;
echo $wpdb->delete(coquille_revue_table(), ['page_title' => 'REDTEAM', 'blog_id' => get_current_blog_id()]) . " test annotation(s) deleted\n";
