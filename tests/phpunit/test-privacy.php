<?php
// Personal data: WordPress export and erasure tools, daily purge, exports for Claude Code without email or IP.
class Test_Coquille_Revue_Privacy extends Coquille_Revue_Test_Case {

    public function test_exporter_and_eraser_are_registered() {
        $this->assertSame('coquille_revue_privacy_export', apply_filters('wp_privacy_personal_data_exporters', [])['coquille-revue']['callback']);
        $this->assertSame('coquille_revue_privacy_erase', apply_filters('wp_privacy_personal_data_erasers', [])['coquille-revue']['callback']);
    }

    public function test_export_returns_the_annotations_of_this_email_only() {
        $id = $this->insert_annotation(['reviewer_email' => 'marie@example.org', 'suggestion' => 'Bienvenue à tous']);
        $this->insert_annotation(['reviewer_email' => 'paul@example.org']);

        $export = coquille_revue_privacy_export('marie@example.org');
        $this->assertTrue($export['done']);
        $this->assertCount(1, $export['data']);
        $this->assertSame('coquille-revue-' . $id, $export['data'][0]['item_id']);
        $values = array_column($export['data'][0]['data'], 'value');
        $this->assertContains('Bienvenue à tous', $values);
        $this->assertContains('marie@example.org', $values);
        $this->assertContains('192.0.2.10', $values);

        $this->assertSame([], coquille_revue_privacy_export('nobody@example.org')['data']);
    }

    public function test_erasure_keeps_the_text_and_unlinks_the_person() {
        $user = self::factory()->user->create();
        $id   = $this->insert_annotation(['reviewer_email' => 'marie@example.org', 'author_id' => $user, 'author_name' => 'Marie']);
        $kept = $this->insert_annotation(['reviewer_email' => 'paul@example.org']);

        $result = coquille_revue_privacy_erase('marie@example.org');
        $this->assertSame(1, $result['items_removed']);
        $this->assertTrue($result['items_retained']);
        $this->assertTrue($result['done']);

        $row = $this->get_annotation($id);
        foreach (['reviewer_email', 'reviewer_name', 'reviewer_ip', 'user_agent'] as $field) {
            $this->assertNull($row[$field], $field);
        }
        $this->assertSame('0', $row['author_id']);
        $this->assertSame('', $row['author_name']);
        $this->assertSame('Bienvenue sur notre site', $row['suggestion']);
        $this->assertSame('paul@example.org', $this->get_annotation($kept)['reviewer_email']);
    }

    public function test_daily_purge() {
        global $wpdb;
        // created_at follows the MySQL clock, like the purge.
        $old     = $wpdb->get_var($wpdb->prepare('SELECT DATE_SUB(NOW(), INTERVAL %d DAY)', COQUILLE_REVUE_IP_RETENTION_DAYS + 1));
        $ancient = $wpdb->get_var($wpdb->prepare('SELECT DATE_SUB(NOW(), INTERVAL %d DAY)', COQUILLE_REVUE_EMAIL_RETENTION_DAYS + 1));
        $recent  = $this->insert_annotation(['reviewer_email' => 'a@example.org']);
        $ip_old  = $this->insert_annotation(['reviewer_email' => 'b@example.org', 'created_at' => $old]);
        $done    = $this->insert_annotation(['reviewer_email' => 'c@example.org', 'status' => 'applied']);
        $expired = $this->insert_annotation(['reviewer_email' => 'd@example.org', 'created_at' => $ancient]);

        do_action('coquille_revue_purge_personal_data');

        $row = $this->get_annotation($recent);
        $this->assertSame(['a@example.org', 'Marie', '192.0.2.10'], [$row['reviewer_email'], $row['reviewer_name'], $row['reviewer_ip']]);
        $row = $this->get_annotation($ip_old);
        $this->assertSame(['b@example.org', null], [$row['reviewer_email'], $row['reviewer_ip']]);
        foreach ([$done, $expired] as $id) {
            $row = $this->get_annotation($id);
            $this->assertSame([null, null, ''], [$row['reviewer_email'], $row['reviewer_name'], $row['author_name']]);
        }
    }

    public function test_purge_keeps_the_name_of_logged_in_authors() {
        $user = self::factory()->user->create(['display_name' => 'Jeanne']);
        $id   = $this->insert_annotation(['author_id' => $user, 'author_name' => 'Jeanne', 'reviewer_name' => null, 'reviewer_email' => 'jeanne@example.org', 'status' => 'applied']);
        do_action('coquille_revue_purge_personal_data');
        $row = $this->get_annotation($id);
        $this->assertNull($row['reviewer_email']);
        $this->assertSame('Jeanne', $row['author_name']);
    }

    public function test_exports_for_claude_code_carry_neither_email_nor_ip() {
        $id      = $this->insert_annotation(['reviewer_email' => 'marie@example.org', 'user_agent' => 'Mozilla']);
        wp_set_current_user(self::factory()->user->create(['role' => 'administrator']));
        $rows    = coquille_revue_get_rows('pending');
        $payload = coquille_revue_json_payload($rows, 'pending');
        $json    = wp_json_encode($payload);

        $this->assertSame((string) $id, $payload['annotations'][0]['id']);
        foreach (['reviewer_email', 'reviewer_ip', 'user_agent', 'will_notify'] as $key) {
            $this->assertArrayNotHasKey($key, $payload['annotations'][0], $key);
        }
        $this->assertStringNotContainsString('marie@example.org', $json);
        $this->assertStringNotContainsString('192.0.2.10', $json);
        $this->assertSame('anonymous_unverified', $payload['annotations'][0]['source']);
        $this->assertSame([], $payload['annotations'][0]['alerts']);
        $this->assertSame(COQUILLE_REVUE_VERSION, $payload['_meta']['plugin_version']);

        $markdown = coquille_revue_format_markdown($rows, 'pending');
        $this->assertStringNotContainsString('marie@example.org', $markdown);
        $this->assertStringNotContainsString('192.0.2.10', $markdown);
    }

    public function test_admin_rows_show_email_to_administrators_only() {
        $this->insert_annotation(['reviewer_email' => 'marie@example.org']);

        wp_set_current_user(self::factory()->user->create(['role' => 'editor']));
        $row = coquille_revue_get_rows('pending', ['personal' => true])[0];
        $this->assertNull($row['reviewer_email']);
        $this->assertTrue($row['will_notify']);

        wp_set_current_user(self::factory()->user->create(['role' => 'administrator']));
        $this->assertSame('marie@example.org', coquille_revue_get_rows('pending', ['personal' => true])[0]['reviewer_email']);
    }
}
