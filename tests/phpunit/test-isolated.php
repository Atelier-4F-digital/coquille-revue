<?php
/**
 * Tests that change the whole process, run in a pass of their own (phpunit --group isolated): the trusted proxy
 * constant stays defined once set, and uninstall.php really drops the table, which commits the open transaction.
 * WP_UnitTestCase turns DROP TABLE into DROP TEMPORARY TABLE: without removing that filter, an uninstall test
 * would pass while the table stays in place.
 *
 * @group isolated
 */
class Test_Coquille_Revue_Isolated extends Coquille_Revue_Test_Case {

    public function test_1_forwarded_header_is_ignored_without_the_constant() {
        $_SERVER['HTTP_X_FORWARDED_FOR'] = '203.0.113.5';
        $this->assertSame('192.0.2.10', coquille_revue_get_client_ip());
        $_SERVER['REMOTE_ADDR'] = 'not an address';
        $this->assertSame('0.0.0.0', coquille_revue_get_client_ip());
        unset($_SERVER['HTTP_X_FORWARDED_FOR']);
    }

    public function test_2_trusted_proxy_header_gives_its_last_address() {
        define('COQUILLE_REVUE_TRUSTED_PROXY_HEADER', 'HTTP_X_FORWARDED_FOR');
        $_SERVER['HTTP_X_FORWARDED_FOR'] = '203.0.113.5, 198.51.100.9';
        $this->assertSame('198.51.100.9', coquille_revue_get_client_ip(), 'the address added by the proxy, not the one sent by the visitor');
        $_SERVER['HTTP_X_FORWARDED_FOR'] = 'garbage';
        $this->assertSame('192.0.2.10', coquille_revue_get_client_ip(), 'invalid header: address of the connection');
        unset($_SERVER['HTTP_X_FORWARDED_FOR']);
    }

    public function test_3_uninstall_removes_the_table_settings_and_tasks_of_every_site() {
        global $wpdb;
        $this->insert_annotation();
        update_option('coquille_revue_show_credit', 1);
        update_option('coquille_revue_thank_contributors', 0);
        update_option('coquille_revue_digest_last_id', 5);
        update_site_option('coquille_revue_require_login', 0);
        coquille_revue_schedule_events();
        wp_schedule_single_event(time() + 100, 'coquille_revue_send_digest');
        $other = null;
        if (is_multisite()) {
            $other = self::factory()->blog->create();
            switch_to_blog($other);
            update_option('coquille_revue_show_credit', 1);
            wp_schedule_event(time() + HOUR_IN_SECONDS, 'daily', 'coquille_revue_purge_personal_data');
            restore_current_blog();
        }
        $current = get_current_blog_id();

        remove_filter('query', [$this, '_drop_temporary_tables']);
        remove_filter('query', [$this, '_create_temporary_tables']);
        if (!defined('WP_UNINSTALL_PLUGIN')) {
            define('WP_UNINSTALL_PLUGIN', 'coquille-revue/coquille-revue.php');
        }
        include dirname(__DIR__, 2) . '/uninstall.php';
        $table_left = $wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $wpdb->esc_like(coquille_revue_table())));
        // Put the table back for the next runs.
        coquille_revue_create_table();
        update_site_option('coquille_revue_db_version', COQUILLE_REVUE_DB_VERSION);

        $this->assertNull($table_left, 'table dropped');
        $this->assertSame($current, get_current_blog_id(), 'back on the starting site');
        foreach (['coquille_revue_show_credit', 'coquille_revue_thank_contributors', 'coquille_revue_digest_last_id'] as $option) {
            $this->assertFalse(get_option($option), $option);
        }
        $this->assertFalse(get_site_option('coquille_revue_require_login'));
        $this->assertFalse(wp_next_scheduled('coquille_revue_purge_personal_data'));
        $this->assertFalse(wp_next_scheduled('coquille_revue_send_digest'));
        if ($other) {
            switch_to_blog($other);
            $this->assertFalse(get_option('coquille_revue_show_credit'), 'option of another site');
            $this->assertFalse(wp_next_scheduled('coquille_revue_purge_personal_data'), 'task of another site');
            restore_current_blog();
        }
    }
}
