<?php
// Supprime les annotations de test (page_title = REDTEAM) du site courant.
// Usage : wp eval-file tests/injection/supprimer-cas.php --url=<site>
global $wpdb;
echo $wpdb->delete(coquille_revue_table(), ['page_title' => 'REDTEAM', 'blog_id' => get_current_blog_id()]) . " annotation(s) de test supprimée(s)\n";
