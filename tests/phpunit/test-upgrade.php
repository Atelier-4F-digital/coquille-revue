<?php
// Database upgrade from version 2: site of each row, address without query or anchor, browser deleted,
// area data reduced to numbers and a valid tag name.
class Test_Coquille_Revue_Upgrade extends Coquille_Revue_Test_Case {

    public function tear_down() {
        update_site_option('coquille_revue_db_version', COQUILLE_REVUE_DB_VERSION);
        parent::tear_down();
    }

    public function test_upgrade_from_version_2_cleans_legacy_rows() {
        $id = $this->insert_annotation([
            'blog_id'    => 0,
            'url'        => home_url('/page/?token=secret#x'),
            'user_agent' => 'Mozilla/5.0',
            'zone_data'  => wp_json_encode(['x' => 5, 'y' => -3, 'w' => 10, 'h' => 10, 'viewport_w' => 1, 'viewport_h' => 1, 'element_tag' => 'div onclick', 'html' => '<p>x</p>']),
        ]);
        update_site_option('coquille_revue_db_version', '2');
        coquille_revue_maybe_upgrade();

        $row = $this->get_annotation($id);
        $this->assertSame(COQUILLE_REVUE_DB_VERSION, get_site_option('coquille_revue_db_version'));
        $this->assertSame((string) get_current_blog_id(), (string) $row['blog_id']);
        $this->assertSame(home_url('/page/'), $row['url']);
        $this->assertNull($row['user_agent']);
        $zone = json_decode($row['zone_data'], true);
        $this->assertSame(0, $zone['y']);
        $this->assertSame('', $zone['element_tag']);
        $this->assertArrayNotHasKey('html', $zone);
    }

    // Version 4: dates of the rows written before 2.6.0 (MySQL clock) move to UTC with the offset of the MySQL clock,
    // once only, even when the upgrade runs again; "Anonyme" stored for a visitor without a name becomes empty.
    public function test_upgrade_to_version_4_converts_legacy_dates_once() {
        global $wpdb;
        $legacy  = $this->insert_annotation(['dates_utc' => 0, 'created_at' => '2026-05-28 20:44:13', 'applied_at' => '2026-05-29 08:00:00', 'status' => 'applied', 'author_name' => 'Anonyme', 'reviewer_name' => null]);
        $pending = $this->insert_annotation(['dates_utc' => 0, 'created_at' => '2026-05-28 21:03:56', 'author_id' => 7, 'author_name' => 'Anonyme']);
        $recent  = $this->insert_annotation(['created_at' => '2026-10-11 18:00:00']);

        $zone = $wpdb->get_var('SELECT @@session.time_zone');
        $wpdb->query("SET time_zone = '+05:30'");
        foreach (['3', '3'] as $run) { // the second run stands for an upgrade that was interrupted, then started again
            update_site_option('coquille_revue_db_version', $run);
            coquille_revue_maybe_upgrade();
        }
        $wpdb->query($wpdb->prepare('SET time_zone = %s', $zone));

        $this->assertSame('4', get_site_option('coquille_revue_db_version'));
        $row = $this->get_annotation($legacy);
        $this->assertSame(['2026-05-28 15:14:13', '2026-05-29 02:30:00', '1'], [$row['created_at'], $row['applied_at'], $row['dates_utc']]);
        $this->assertSame('', $row['author_name'], 'visitor without a name');
        $row = $this->get_annotation($pending);
        $this->assertSame(['2026-05-28 15:33:56', null], [$row['created_at'], $row['applied_at']]);
        $this->assertSame('Anonyme', $row['author_name'], 'the name of an account is kept');
        $this->assertSame('2026-10-11 18:00:00', $this->get_annotation($recent)['created_at'], 'rows written by 2.6.0 are already in UTC');

        // The marker stays out of the API and of the exports.
        $this->assertArrayNotHasKey('dates_utc', coquille_revue_get_rows('applied')[0]);
    }

    public function test_new_annotations_are_marked_as_utc() {
        $this->set_public_mode();
        $this->assertSame(201, $this->post_annotation()->get_status());
        $this->assertSame('1', $this->last_annotation()['dates_utc']);
    }
}
