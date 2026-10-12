<?php
// Deleting the plugin from the admin: erases the annotations table (shared by the network),
// the settings and the scheduled tasks of each site. Deactivating it keeps everything.
// The anti-spam counters (transients) expire by themselves within a day, and WordPress erases expired transients.
defined('WP_UNINSTALL_PLUGIN') || exit;

global $wpdb;

$coquille_revue_site_ids = is_multisite() ? get_sites(['fields' => 'ids', 'number' => 0]) : [get_current_blog_id()];
foreach ($coquille_revue_site_ids as $coquille_revue_site_id) {
    if (is_multisite()) switch_to_blog((int) $coquille_revue_site_id);
    delete_option('coquille_revue_digest_last_id');
    delete_option('coquille_revue_thank_contributors');
    delete_option('coquille_revue_show_credit');
    wp_clear_scheduled_hook('coquille_revue_purge_personal_data');
    wp_clear_scheduled_hook('coquille_revue_send_digest');
    if (is_multisite()) restore_current_blog();
}

delete_site_option('coquille_revue_db_version');
delete_site_option('coquille_revue_require_login');

// phpcs:ignore WordPress.DB.DirectDatabaseQuery -- drops the plugin's own table on uninstall; WordPress has no API for it.
$wpdb->query($wpdb->prepare('DROP TABLE IF EXISTS %i', $wpdb->base_prefix . 'coquille_revue_annotations'));
