<?php
// Multisite (WP_MULTISITE=1): one table for the network, each site only sees and changes its own annotations.
class Test_Coquille_Revue_Multisite extends Coquille_Revue_Test_Case {

    private $blog_id;

    public function set_up() {
        parent::set_up();
        if (!is_multisite()) {
            $this->markTestSkipped('Multisite only: run with WP_MULTISITE=1.');
        }
        $this->blog_id = self::factory()->blog->create();
        $this->set_public_mode();
    }

    // Annotation sent by a visitor from the home page of the sub-site.
    private function post_on_sub_site($extra = []) {
        switch_to_blog($this->blog_id);
        $response = $this->post_annotation($extra);
        $row      = $this->last_annotation();
        restore_current_blog();
        return [$response, $row];
    }

    public function test_annotations_are_stored_with_their_site() {
        [$response, $row] = $this->post_on_sub_site(['reviewerEmail' => 'marie@example.org']);
        $this->assertSame(201, $response->get_status());
        $this->assertSame((string) $this->blog_id, $row['blog_id']);
        $this->assertSame(get_home_url($this->blog_id, '/'), $row['url']);
    }

    public function test_a_site_cannot_receive_an_annotation_for_another_site() {
        $response = $this->post_annotation(['url' => get_home_url($this->blog_id, '/')]);
        $this->assertSame(400, $response->get_status());
        $this->assertSame('invalid_url', $response->get_data()['code']);
    }

    public function test_a_site_does_not_see_nor_change_the_annotations_of_another_site() {
        [, $row] = $this->post_on_sub_site(['reviewerEmail' => 'marie@example.org']);
        $id      = (int) $row['id'];

        wp_set_current_user(self::factory()->user->create(['role' => 'administrator']));
        $this->assertSame(0, coquille_revue_count_by_status()['pending']);
        $this->assertSame([], $this->rest('GET', '/annotations')->get_data());
        $this->assertSame('not_found', coquille_revue_set_status($id, 'applied')->get_error_code());
        $this->assertSame([], coquille_revue_privacy_export('marie@example.org')['data']);
        $this->assertSame(0, coquille_revue_privacy_erase('marie@example.org')['items_removed']);

        $row = $this->get_annotation($id);
        $this->assertSame('pending', $row['status']);
        $this->assertSame('marie@example.org', $row['reviewer_email']);
        $this->assertCount(0, $this->sent_mails());

        switch_to_blog($this->blog_id);
        $this->assertSame(1, coquille_revue_count_by_status()['pending']);
        $this->assertSame(['notified' => true, 'thanks' => 'sent'], coquille_revue_set_status($id, 'applied'));
        restore_current_blog();
        $this->assertCount(1, $this->sent_mails());
    }

    public function test_network_users_who_are_not_members_do_not_leave_their_email() {
        $user = self::factory()->user->create(['role' => 'editor', 'user_email' => 'editor@example.org']);
        wp_set_current_user($user);
        [, $row] = $this->post_on_sub_site();
        $this->assertSame((string) $user, $row['author_id']);
        $this->assertNull($row['reviewer_email']);
        switch_to_blog($this->blog_id);
        $this->assertSame('registered_unverified', coquille_revue_json_row($row)['source'], 'no role on the sub-site');
        $this->assertSame(1, get_transient('coquille_revue_rl_global')['n'], 'limited like a visitor, in the limit of the sub-site');
        restore_current_blog();

        add_user_to_blog($this->blog_id, $user, 'author');
        [, $row] = $this->post_on_sub_site();
        $this->assertSame('editor@example.org', $row['reviewer_email']);
        switch_to_blog($this->blog_id);
        $this->assertSame('logged_in_user', coquille_revue_json_row($row)['source']);
        restore_current_blog();
    }

    public function test_deleting_a_site_deletes_its_annotations() {
        $main = $this->insert_annotation();
        [, $row] = $this->post_on_sub_site();
        wp_delete_site($this->blog_id);

        $this->assertNull($this->get_annotation((int) $row['id']));
        $this->assertNotNull($this->get_annotation($main));
    }

    // 2.5.0 wrote applied_at in the time zone of the site of the annotation. The upgrade to version 4 runs once for the
    // network, from any site: each row moves with the time zone of its own site, a row not yet assigned to a site too.
    public function test_upgrade_converts_applied_at_with_the_time_zone_of_each_site() {
        global $wpdb;
        update_option('timezone_string', 'Europe/Paris');
        switch_to_blog($this->blog_id);
        update_option('timezone_string', 'America/New_York');
        restore_current_blog();
        $legacy     = ['dates_utc' => 0, 'created_at' => '2026-09-01 12:00:00', 'status' => 'applied'];
        $main       = $this->insert_annotation($legacy + ['applied_at' => '2026-09-01 14:00:00']);
        $sub        = $this->insert_annotation($legacy + ['applied_at' => '2026-09-01 08:00:00', 'blog_id' => $this->blog_id, 'url' => get_home_url($this->blog_id, '/')]);
        $unassigned = $this->insert_annotation($legacy + ['applied_at' => '2026-09-01 08:00:00', 'blog_id' => 0, 'url' => get_home_url($this->blog_id, '/page/')]);

        $zone = $wpdb->get_var('SELECT @@session.time_zone');
        $wpdb->query("SET time_zone = '+00:00'");
        update_site_option('coquille_revue_db_version', '3');
        coquille_revue_maybe_upgrade();
        $wpdb->query($wpdb->prepare('SET time_zone = %s', $zone));

        $this->assertSame('2026-09-01 12:00:00', $this->get_annotation($main)['applied_at'], 'Paris, summer time');
        $this->assertSame('2026-09-01 12:00:00', $this->get_annotation($sub)['applied_at'], 'New York, summer time');
        $row = $this->get_annotation($unassigned);
        $this->assertSame([(string) $this->blog_id, '2026-09-01 12:00:00', '2026-09-01 12:00:00'], [$row['blog_id'], $row['applied_at'], $row['created_at']]);
    }

    public function test_daily_purge_removes_rows_of_sites_that_no_longer_exist() {
        $orphan = $this->insert_annotation(['blog_id' => 999999]);
        $kept   = $this->insert_annotation();
        do_action('coquille_revue_purge_personal_data');

        $this->assertNull($this->get_annotation($orphan));
        $this->assertNotNull($this->get_annotation($kept));
    }
}
