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

    // Upgrade from version 3 with the MySQL clock set to $mysql_zone, run twice (the second run stands for an upgrade
    // that was interrupted, then started again).
    private function upgrade_from_version_3($mysql_zone) {
        global $wpdb;
        $zone = $wpdb->get_var('SELECT @@session.time_zone');
        $wpdb->query($wpdb->prepare('SET time_zone = %s', $mysql_zone));
        foreach (['3', '3'] as $run) {
            update_site_option('coquille_revue_db_version', $run);
            coquille_revue_maybe_upgrade();
        }
        $wpdb->query($wpdb->prepare('SET time_zone = %s', $zone));
    }

    // Version 4: created_at of the rows written before 2.6.0 (MySQL clock) moves to UTC with the offset of the MySQL
    // clock, applied_at (site time zone) with the time zone of the site, once only, even when the upgrade runs again;
    // "Anonyme" stored for a visitor without a name becomes empty.
    public function test_upgrade_to_version_4_converts_legacy_dates_once() {
        update_option('timezone_string', '');
        update_option('gmt_offset', 0);
        $legacy  = $this->insert_annotation(['dates_utc' => 0, 'created_at' => '2026-05-28 20:44:13', 'applied_at' => '2026-05-29 08:00:00', 'status' => 'applied', 'author_name' => 'Anonyme', 'reviewer_name' => null]);
        $pending = $this->insert_annotation(['dates_utc' => 0, 'created_at' => '2026-05-28 21:03:56', 'author_id' => 7, 'author_name' => 'Anonyme']);
        $recent  = $this->insert_annotation(['created_at' => '2026-10-11 18:00:00']);

        $this->upgrade_from_version_3('+05:30');

        $this->assertSame('4', get_site_option('coquille_revue_db_version'));
        $row = $this->get_annotation($legacy);
        $this->assertSame(['2026-05-28 15:14:13', '2026-05-29 08:00:00', '1'], [$row['created_at'], $row['applied_at'], $row['dates_utc']], 'site in UTC: applied_at unchanged');
        $this->assertSame('', $row['author_name'], 'visitor without a name');
        $row = $this->get_annotation($pending);
        $this->assertSame(['2026-05-28 15:33:56', null], [$row['created_at'], $row['applied_at']]);
        $this->assertSame('Anonyme', $row['author_name'], 'the name of an account is kept');
        $this->assertSame('2026-10-11 18:00:00', $this->get_annotation($recent)['created_at'], 'rows written by 2.6.0 are already in UTC');

        // The marker stays out of the API and of the exports.
        $this->assertArrayNotHasKey('dates_utc', coquille_revue_get_rows('applied')[0]);
    }

    // 2.5.0 wrote applied_at with current_time('mysql'), in the site time zone: with MySQL in UTC and a site in Paris
    // (the usual case on a host), it moves by the offset of the site on that date, summer or winter time.
    public function test_upgrade_to_version_4_converts_applied_at_with_the_site_time_zone() {
        update_option('timezone_string', 'Europe/Paris');
        $summer = $this->insert_annotation(['dates_utc' => 0, 'created_at' => '2026-09-01 12:00:00', 'applied_at' => '2026-09-01 14:00:00', 'status' => 'applied']);
        $winter = $this->insert_annotation(['dates_utc' => 0, 'created_at' => '2026-01-15 12:30:00', 'applied_at' => '2026-01-15 14:00:00', 'status' => 'applied']);

        $this->upgrade_from_version_3('+00:00');

        $this->assertSame(['2026-09-01 12:00:00', '2026-09-01 12:00:00', '1'], array_values(array_intersect_key($this->get_annotation($summer), array_flip(['created_at', 'applied_at', 'dates_utc']))));
        $this->assertSame(['2026-01-15 12:30:00', '2026-01-15 13:00:00'], array_values(array_intersect_key($this->get_annotation($winter), array_flip(['created_at', 'applied_at']))));
        // The exports show the time of the site again, as 2.5.0 had stored it.
        $this->assertSame('2026-09-01 14:00:00', coquille_revue_json_row($this->get_annotation($summer))['applied_at']);
    }

    public function test_new_annotations_are_marked_as_utc() {
        $this->set_public_mode();
        $this->assertSame(201, $this->post_annotation()->get_status());
        $this->assertSame('1', $this->last_annotation()['dates_utc']);
    }
}
