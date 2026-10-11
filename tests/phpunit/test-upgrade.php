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
}
